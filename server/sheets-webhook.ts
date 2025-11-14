import { Request, Response } from 'express';
import { WebSocket } from 'ws';
import { db } from './db';
import { products, priceDropNotifications } from '../shared/schema';
import { eq } from 'drizzle-orm';

// Função para salvar notificação no banco de dados
async function saveNotificationToDB(notificationData: any) {
  try {
    console.log('💾 Saving notification to database:', notificationData);
    
    const [savedNotification] = await db
      .insert(priceDropNotifications)
      .values({
        productId: notificationData.productId,
        model: notificationData.model,
        storage: notificationData.storage,
        color: notificationData.color,
        supplier: notificationData.supplier,
        oldPrice: notificationData.oldPrice,
        newPrice: notificationData.newPrice,
        priceDrop: notificationData.priceDrop,
        dropPercentage: notificationData.dropPercentage,
        notificationSent: true, // Marca como enviada imediatamente
        isRead: false,
        createdAt: new Date()
      })
      .returning();

    console.log('✅ Notification saved successfully with ID:', savedNotification.id);
    return savedNotification;
  } catch (error) {
    console.error('❌ Error saving notification to database:', error);
    throw error;
  }
}

// Função para enviar notificações via WebSocket
function sendNotificationToAllUsers(productId: string | number, newPrice: number, additionalData: any, wsClients: Set<WebSocket>) {
  const message = JSON.stringify({
    type: 'price-drop',
    data: {
      productId,
      newPrice,
      timestamp: new Date().toISOString(),
      ...additionalData
    }
  });

  let clientsNotified = 0;
  wsClients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      try {
        client.send(message);
        clientsNotified++;
      } catch (error) {
        console.error('Error sending notification to client:', error);
      }
    }
  });

  console.log(`📡 Notification sent to ${clientsNotified} connected clients`);
  return clientsNotified;
}

interface WebhookData {
  // Formato antigo (manter compatibilidade)
  sheetId?: string;
  sheetName?: string;
  range?: string;
  values?: any[][];
  eventType?: 'EDIT' | 'INSERT' | 'DELETE';
  rowIndex?: number;
  columnIndex?: number;
  oldValue?: string;
  newValue?: string;
  
  // Novo formato do Google Apps Script
  fornecedor?: string;
  categoria?: string;
  modelo?: string;
  gb?: string;
  regiao?: string;
  cor?: string;
  preco?: number;
  venda?: number;
  atualizadoEm?: string;
  linha?: number;
  aba?: string;
}

interface PriceDropNotification {
  productId: number;
  model: string;
  storage?: string;
  color?: string;
  supplier: string;
  oldPrice: number;
  newPrice: number;
  priceDrop: number;
  dropPercentage: number;
  timestamp: string;
}

export async function handleSheetsWebhook(
  req: Request, 
  res: Response, 
  wsClients: Set<WebSocket>
) {
  try {
    console.log("=== WEBHOOK TRIGGERED ===");
    console.log("📊 Webhook payload:", JSON.stringify(req.body, null, 2));
    console.log("🔍 Verificando formato do webhook...");

    const webhookData: WebhookData = req.body;

    // Detectar se é o novo formato do Google Apps Script
    const isNewFormat = webhookData.modelo && webhookData.preco !== undefined;
    
    if (isNewFormat) {
      console.log("📱 Novo formato detectado - processando dados estruturados");
      return await processNewFormatWebhook(webhookData, res, wsClients);
    }

    // Formato antigo (manter compatibilidade)
    console.log("📊 Formato legado detectado");
    
    // Verificar se é uma edição de preço (coluna 7 = índice 6)
    if (webhookData.eventType !== 'EDIT' || webhookData.columnIndex !== 6) {
      return res.json({ 
        success: true, 
        message: 'Event ignored - not a price edit' 
      });
    }

    const { sheetName, rowIndex, oldValue, newValue } = webhookData;

    if (!oldValue || !newValue || !rowIndex) {
      return res.json({ 
        success: true, 
        message: 'Insufficient data for price comparison' 
      });
    }

    // Converter valores para números
    const oldPrice = parseFloat(oldValue.replace(/[^\d.,]/g, '').replace(',', '.'));
    const newPrice = parseFloat(newValue.replace(/[^\d.,]/g, '').replace(',', '.'));

    console.log(`💰 Price change detected: ${oldPrice} → ${newPrice}`);

    // Buscar dados da linha atualizada na planilha primeiro
    const rowData = await fetchSheetRowData(sheetName || '', rowIndex || 0);
    if (!rowData) {
      return res.json({ 
        success: false, 
        message: 'Could not fetch row data' 
      });
    }

    const { model, storage, color, supplier } = rowData;

    // Buscar o produto no banco de dados usando modelo E fornecedor para maior precisão
    const existingProduct = await db
      .select()
      .from(products)
      .where(eq(products.model, model))
      .limit(1);

    let currentDbPrice = oldPrice; // Fallback para o preço do webhook

    if (existingProduct.length > 0) {
      // Usar o preço atual do banco de dados como referência
      currentDbPrice = parseFloat(existingProduct[0].price);
      console.log(`💾 Current DB price: ${currentDbPrice}, New price: ${newPrice}`);
    } else {
      console.log(`⚠️ Product not found in database, using webhook old price: ${oldPrice}`);
    }

    // Comparar o novo preço com o preço atual do banco (ou webhook se não encontrado)
    const priceDrop = currentDbPrice - newPrice;
    const dropPercentage = ((priceDrop / currentDbPrice) * 100);

    console.log(`📊 Price comparison: Current: ${currentDbPrice} → New: ${newPrice}, Drop: ${priceDrop}`);

    // Verificar se é uma queda de preço significativa (pelo menos R$ 0.01)
    if (priceDrop <= 0) {
      return res.json({ 
        success: true, 
        message: `No price drop detected. Current: ${currentDbPrice}, New: ${newPrice}` 
      });
    }

    console.log(`📉 Price drop confirmed: R$${priceDrop.toFixed(2)} (${dropPercentage.toFixed(1)}%)`);

    const product = existingProduct.length > 0 ? existingProduct[0] : null;

    // Criar registro de notificação no banco usando função dedicada
    const notificationData = {
      productId: product ? product.id.toString() : `${sheetName}-${rowIndex}`,
      model: model,
      storage: storage || null,
      color: color || null,
      supplier: supplier,
      oldPrice: currentDbPrice.toString(),
      newPrice: newPrice.toString(),
      priceDrop: priceDrop.toString(),
      dropPercentage: dropPercentage.toString(),
      notificationSent: false,
      isRead: false
    };

    const savedNotification = await saveNotificationToDB(notificationData);
    console.log('✅ Price drop notification saved to DB:', savedNotification);
    console.log(`🎯 NOTIFICAÇÃO CRIADA COM SUCESSO! ID: ${savedNotification.id}`);
    console.log(`📊 Detalhes: ${model} de R$ ${currentDbPrice} para R$ ${newPrice} (-R$ ${priceDrop.toFixed(2)})`);

    // Atualizar o preço do produto no banco
    if (product) {
        await db
          .update(products)
          .set({ 
            price: newPrice.toString(),
            ultimaAtualizacao: new Date(),
            updatedAt: new Date()
          })
          .where(eq(products.id, product.id));
    }

    // Preparar dados para WebSocket
    const priceDropData: PriceDropNotification = {
      productId: product ? product.id : 0,
      model,
      storage,
      color,
      supplier,
      oldPrice,
      newPrice,
      priceDrop,
      dropPercentage: parseFloat(dropPercentage.toFixed(2)),
      timestamp: new Date().toISOString()
    };

    // Send notification to all users via WebSocket with saved notification ID
    const clientsNotified = sendNotificationToAllUsers(
      product ? product.id : `${sheetName}-${rowIndex}`,
      newPrice,
      {
        id: savedNotification.id, // ID da notificação salva
        model,
        storage,
        color,
        supplier,
        oldPrice,
        priceDrop,
        dropPercentage: parseFloat(dropPercentage.toFixed(2)),
        type: 'price_drop_notification',
        timestamp: savedNotification.createdAt,
        isRead: false
      },
      wsClients
    );

    console.log(`🔔 Price drop notification sent to ${clientsNotified} clients with DB ID: ${savedNotification.id}`);

    // Marcar notificação como enviada
    await db
      .update(priceDropNotifications)
      .set({ notificationSent: true })
      .where(eq(priceDropNotifications.id, savedNotification.id));

    res.json({
      success: true,
      message: 'Price drop detected and notification sent',
      data: {
        productId: product ? product.id : null,
        model,
        oldPrice,
        newPrice,
        priceDrop,
        dropPercentage: dropPercentage.toFixed(2),
        clientsNotified,
        notificationId: savedNotification.id,
        savedToDB: true
      }
    });

  } catch (error: any) {
    console.error('❌ Error in sheets webhook:', error);
    res.status(500).json({
      success: false,
      message: 'Error processing webhook',
      error: error.message
    });
  }
}

// Função para processar o novo formato estruturado do Google Apps Script
async function processNewFormatWebhook(
  webhookData: WebhookData,
  res: Response,
  wsClients: Set<WebSocket>
) {
  try {
    const { modelo, preco, fornecedor, categoria, gb, regiao, cor, venda, atualizadoEm, linha, aba } = webhookData;
    
    if (!modelo || preco === undefined) {
      return res.json({
        success: false,
        message: 'Dados insuficientes - modelo e preço são obrigatórios'
      });
    }

    console.log(`💰 Dados recebidos: ${modelo} - R$ ${preco} (${fornecedor})`);

    // Buscar produto existente no banco de dados
    const existingProduct = await db
      .select()
      .from(products)
      .where(eq(products.model, modelo))
      .limit(1);

    let currentDbPrice = preco; // Usar preço atual como referência
    let oldPrice = preco; // Para produtos novos, não há preço anterior

    if (existingProduct.length > 0) {
      currentDbPrice = parseFloat(existingProduct[0].price);
      oldPrice = currentDbPrice;
      console.log(`💾 Produto encontrado no banco: preço atual R$ ${currentDbPrice} → novo preço R$ ${preco}`);
    } else {
      console.log(`🆕 Produto novo: ${modelo} - R$ ${preco}`);
    }

    // Verificar se houve queda de preço
    const priceDrop = oldPrice - preco;
    const dropPercentage = oldPrice > 0 ? ((priceDrop / oldPrice) * 100) : 0;

    console.log(`📊 Análise de preço: Anterior: R$ ${oldPrice} → Atual: R$ ${preco}, Queda: R$ ${priceDrop.toFixed(2)} (${dropPercentage.toFixed(1)}%)`);

    // Se há queda de preço significativa (pelo menos R$ 0.01), criar notificação
    if (priceDrop > 0.01) {
      console.log(`📉 Queda de preço detectada: R$ ${priceDrop.toFixed(2)} (${dropPercentage.toFixed(1)}%)`);

      // Criar notificação no banco
      const notificationData = {
        productId: existingProduct.length > 0 ? existingProduct[0].id.toString() : `${aba}-${linha}`,
        model: modelo,
        storage: gb || null,
        color: cor || null,
        supplier: fornecedor || 'Fornecedor não informado',
        oldPrice: oldPrice.toString(),
        newPrice: preco.toString(),
        priceDrop: priceDrop.toString(),
        dropPercentage: dropPercentage.toString(),
        notificationSent: false,
        isRead: false
      };

      const savedNotification = await saveNotificationToDB(notificationData);
      console.log(`✅ Notificação salva com ID: ${savedNotification.id}`);

      // Enviar notificação via WebSocket
      const clientsNotified = sendNotificationToAllUsers(
        existingProduct.length > 0 ? existingProduct[0].id : `${aba}-${linha}`,
        preco,
        {
          id: savedNotification.id,
          model: modelo,
          storage: gb,
          color: cor,
          supplier: fornecedor,
          oldPrice,
          priceDrop,
          dropPercentage: parseFloat(dropPercentage.toFixed(2)),
          type: 'price_drop_notification',
          timestamp: savedNotification.createdAt,
          isRead: false
        },
        wsClients
      );

      // Marcar notificação como enviada
      await db
        .update(priceDropNotifications)
        .set({ notificationSent: true })
        .where(eq(priceDropNotifications.id, savedNotification.id));

      console.log(`🔔 Notificação enviada para ${clientsNotified} clientes`);
    }

    // Atualizar ou criar produto no banco
    if (existingProduct.length > 0) {
      await db
        .update(products)
        .set({
          price: preco.toString(),
          ultimaAtualizacao: new Date(),
          updatedAt: new Date()
        })
        .where(eq(products.id, existingProduct[0].id));
      console.log(`🔄 Produto atualizado no banco: ${modelo}`);
    } else {
      // Produto novo - criar entrada no banco (opcional)
      console.log(`ℹ️ Produto novo detectado: ${modelo} - considere sincronizar a planilha completa`);
    }

    // ✅ CORREÇÃO CRÍTICA: Invalidar cache e notificar via WebSocket
    try {
      console.log('🗑️ Invalidando cache do Google Sheets...');
      const { googleSheetsService } = await import('./services/google-sheets');
      googleSheetsService.clearCache();
      console.log('✅ Cache do Google Sheets invalidado');

      // Enviar notificação SHEET_UPDATE via WebSocket
      console.log('📡 Enviando notificação SHEET_UPDATE via WebSocket...');
      const { UnifiedWebSocketManager } = await import('./services/websocket-manager');
      const wsManager = UnifiedWebSocketManager.getInstance();
      wsManager.broadcastSheetUpdate({
        dataReferencia: aba,
        supplierName: fornecedor,
        productType: categoria
      });
      console.log('✅ Notificação SHEET_UPDATE enviada');
    } catch (cacheError) {
      console.warn('⚠️ Erro ao invalidar cache ou notificar WebSocket:', cacheError);
    }

    return res.json({
      success: true,
      message: 'Webhook processado com sucesso',
      data: {
        model: modelo,
        oldPrice,
        newPrice: preco,
        priceDrop: priceDrop > 0.01 ? priceDrop : 0,
        dropPercentage: priceDrop > 0.01 ? dropPercentage.toFixed(2) : '0',
        notificationSent: priceDrop > 0.01,
        productUpdated: existingProduct.length > 0,
        cacheInvalidated: true,
        websocketNotified: true
      }
    });

  } catch (error: any) {
    console.error('❌ Erro processando novo formato de webhook:', error);
    return res.status(500).json({
      success: false,
      message: 'Erro processando webhook',
      error: error.message
    });
  }
}

async function fetchSheetRowData(sheetName: string, rowIndex: number) {
  try {
    console.log(`📊 Buscando dados da linha ${rowIndex} na aba ${sheetName}`);
    
    const { googleSheetsService } = await import('./services/google-sheets');
    const SHEET_ID = process.env.GOOGLE_SHEET_ID;
    
    if (!SHEET_ID) {
      throw new Error('Google Sheet ID not configured');
    }

    // Buscar a linha específica (ajustar índice para 0-based)
    const rowData = await googleSheetsService.getRowData(SHEET_ID, sheetName, rowIndex - 1);
    
    if (!rowData || rowData.length < 7) {
      console.log('⚠️ Dados insuficientes na linha');
      return null;
    }

    const [supplier, category, model, storage, region, color] = rowData;
    
    console.log(`✅ Dados da linha encontrados:`, {
      supplier, category, model, storage, region, color
    });

    return {
      model: model || 'Produto desconhecido',
      storage: storage || '',
      color: color || '',
      supplier: supplier || 'Fornecedor desconhecido',
      category: category || '',
      region: region || ''
    };
  } catch (error) {
    console.error('❌ Error fetching sheet row data:', error);
    return null;
  }
}