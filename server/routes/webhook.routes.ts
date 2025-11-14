// Rotas de webhooks - integração Google Sheets e sincronização de dados
import { Router } from 'express';
import type { Request, Response } from 'express';
import { storage } from '../storage';
import { authenticateToken, type AuthenticatedRequest } from '../middleware/auth';
import { parseGoogleSheetWithDate } from '../services/google-sheets-parser';
import { WebSocket } from 'ws';
import { CostTrackingService } from '../services/cost-tracking.service';

const router = Router();
const costTracker = CostTrackingService.getInstance();

// WebSocket clients storage (será injetado externamente)
let wsClients: Set<WebSocket> = new Set();

// Função para configurar WebSocket clients
export function setWebSocketClients(clients: Set<WebSocket>) {
  wsClients = clients;
}

// Function to broadcast price changes to all connected clients
function broadcastPriceUpdate(data: any) {
  const message = JSON.stringify({
    type: 'PRICE_UPDATE',
    data,
    timestamp: new Date().toISOString()
  });

  wsClients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
}

// Function to send notifications to all connected users
function sendNotificationToAllUsers(productId: string | number, newPrice: number, additionalData?: any) {
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

// Function to detect price changes between old and new product data
function detectNewLowPrices(oldProducts: any[], newProducts: any[]): any[] {
  const newLowPrices: any[] = [];

  // Group products by model+storage+color for more precise comparison
  const oldPricesByGroup = new Map<string, number>();

  // Get the lowest price for each group from old products
  oldProducts.forEach(product => {
    const groupKey = `${product.model}-${product.storage}-${product.color}`.toLowerCase();
    const price = parseFloat(product.price);

    if (!oldPricesByGroup.has(groupKey) || price < oldPricesByGroup.get(groupKey)!) {
      oldPricesByGroup.set(groupKey, price);
    }
  });

  // Group new products by model+storage+color to find current lowest prices
  const newProductGroups = new Map<string, any[]>();
  newProducts.forEach(product => {
    const groupKey = `${product.model}-${product.storage}-${product.color}`.toLowerCase();
    if (!newProductGroups.has(groupKey)) {
      newProductGroups.set(groupKey, []);
    }
    newProductGroups.get(groupKey)!.push(product);
  });

  // Check each group for new low prices
  newProductGroups.forEach((products, groupKey) => {
    // Find the lowest price in this group among new products
    const currentLowestPrice = Math.min(...products.map(p => parseFloat(p.price)));
    const oldLowestPrice = oldPricesByGroup.get(groupKey);

    // If this group has a new lowest price
    if (!oldLowestPrice || currentLowestPrice < oldLowestPrice) {
      // Find the product(s) with the lowest price in this group
      const lowestPriceProducts = products.filter(p => 
        Math.abs(parseFloat(p.price) - currentLowestPrice) < 0.01
      );

      // Add all products that have the new lowest price for this group
      lowestPriceProducts.forEach(product => {
        newLowPrices.push({
          model: product.model,
          storage: product.storage,
          color: product.color,
          price: currentLowestPrice,
          supplier: product.supplier?.name || 'Unknown',
          product: product
        });
      });
    }
  });

  return newLowPrices;
}

// Function to broadcast new low price notifications
function broadcastNewLowPrice(data: any) {
  const message = JSON.stringify({
    type: 'NEW_LOW_PRICE',
    data: {
      ...data,
      message: `Novo menor preço: ${data.model} ${data.storage} ${data.color} por R$${data.price.toFixed(2).replace('.', ',')} na ${data.supplier}`
    },
    timestamp: new Date().toISOString()
  });

  wsClients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
}

// Function to detect price changes between old and new product data
function detectPriceChanges(oldProducts: any[], newProducts: any[]) {
  const changes: any[] = [];

  // Create maps for easy lookup
  const oldProductMap: Record<string, any> = {};
  oldProducts.forEach(product => {
    const key = `${product.model}-${product.storage}-${product.color}-${product.supplier?.name || ''}`;
    oldProductMap[key] = product;
  });

  newProducts.forEach(newProduct => {
    const key = `${newProduct.model}-${newProduct.storage}-${newProduct.color}`;

    // Find matching old product
    for (const oldKey in oldProductMap) {
      if (oldKey.startsWith(key)) {
        const oldProduct = oldProductMap[oldKey];
        const oldPrice = parseFloat(oldProduct.price.replace(/[^\d,]/g, '').replace(',', '.'));
        const newPrice = parseFloat(newProduct.price.replace(/[^\d,]/g, '').replace(',', '.'));

        if (Math.abs(oldPrice - newPrice) > 0.01) { // Price difference > 1 cent
          const priceChange = newPrice - oldPrice;
          const changeType = priceChange > 0 ? 'increase' : 'decrease';

          changes.push({
            model: newProduct.model,
            storage: newProduct.storage,
            color: newProduct.color,
            oldPrice: oldProduct.price,
            newPrice: newProduct.price,
            change: priceChange,
            changeType,
            changePercentage: ((priceChange / oldPrice) * 100).toFixed(2)
          });
        }
        break;
      }
    }
  });

  return changes;
}

// Global sync lock to prevent concurrent syncs
let isSyncInProgress = false;

// Webhook principal do Google Sheets
router.post('/google-sheets', async (req: Request, res: Response) => {
  try {
    const webhookStartTime = Date.now();
    console.log('🎯 WEBHOOK GOOGLE SHEETS ACIONADO!');
    console.log('📊 Headers:', req.headers);
    console.log('🔍 Body:', req.body);

    // Rastrear webhook hit para métricas de custo
    costTracker.recordWebhookHit();

    // Validar payload do Google Sheets
    const { sheetName, aba, fornecedor, linha, coluna } = req.body;
    if (!sheetName && !aba) {
      console.warn('⚠️ Webhook sem sheetName/aba - possível payload inválido');
    }

    // Verificar se sync já está em progresso
    if (isSyncInProgress) {
      console.log('⏳ Sync already in progress, skipping...');
      return res.status(200).json({ 
        message: 'Sync already in progress',
        timestamp: new Date().toISOString()
      });
    }

    isSyncInProgress = true;

    try {
      // Extrair informações do webhook
      const { 
        sheetId, 
        sheetName, 
        range, 
        values, 
        eventType,
        rowIndex,
        columnIndex,
        oldValue,
        newValue
      } = req.body;

      console.log(`🔄 Processing webhook: Sheet "${sheetName}", Event: ${eventType}`);

      // Processamento direcionado baseado na coluna alterada
      if (eventType === 'EDIT') {
        console.log(`🎯 Targeted edit detected: Sheet=${sheetName}, Row=${rowIndex}, Column=${columnIndex}, ${oldValue} -> ${newValue}`);

        // Processar mudança de preço (coluna G = índice 6)
        if (columnIndex === 6) {
          console.log(`💰 Price change detected: Row ${rowIndex}, ${oldValue} -> ${newValue}`);

          // Broadcast imediato da mudança de preço
          broadcastPriceUpdate({
            type: 'PRICE_CHANGE',
            sheetName,
            rowIndex,
            oldPrice: oldValue,
            newPrice: newValue,
            change: parseFloat(newValue || '0') - parseFloat(oldValue || '0'),
            timestamp: new Date().toISOString()
          });

          // Para mudanças de preço, fazer reprocessamento rápido
          console.log(`⚡ Fast-tracking price change processing...`);

          // Trigger real-time sync service for immediate updates during business hours
          try {
            const { RealtimeSyncService } = await import('../services/realtime-sync.service');
            const realtimeSync = RealtimeSyncService.getInstance();
            
            // Forçar sync imediato após webhook para garantir dados atualizados
            await realtimeSync.forcSync();
            console.log('🔄 [Webhook] Real-time sync triggered after price change');
          } catch (error) {
            console.error('❌ [Webhook] Error triggering real-time sync:', error);
          }
        } else {
          // Para outras colunas, usar processamento mais leve
          console.log(`📝 Non-price edit detected - lighter processing for column ${columnIndex}`);
        }
      }

      // Processar mudança direcionada baseada no webhook
      if (sheetName && sheetName.match(/^\d{2}-\d{2}$/)) { // Formato DD-MM
        console.log(`🎯 Processing targeted update for sheet: ${sheetName}, row: ${rowIndex}, column: ${columnIndex}`);

        try {
          // 1. LIMPAR CACHE ESPECÍFICO (não todo o cache)
          console.log(`🧹 Clearing targeted cache for sheet: ${sheetName}...`);

          // Importar serviços necessários
          const { googleSheetsService } = await import('../services/google-sheets');

          // Limpar apenas cache específico da planilha atual
          const specificCacheKey = `${process.env.GOOGLE_SHEET_ID}:${sheetName}!A1:H50000`;
          console.log(`🎯 Clearing specific cache: ${specificCacheKey}`);

          // Usar método específico para limpar apenas esta planilha
          googleSheetsService.clearSpecificCache(specificCacheKey);

          // Limpar cache do Redis apenas para esta planilha específica
          try {
            const { default: cacheService } = await import('../services/cache-service');

            // Limpar apenas caches específicos desta planilha
            const targetedCacheKeys = [
              `products:${sheetName}`,
              `sheet-data:${sheetName}`,
              `sheets:${process.env.GOOGLE_SHEET_ID}:${sheetName}`
            ];

            for (const key of targetedCacheKeys) {
              await cacheService.del(key);
              console.log(`🗑️ Cleared specific cache: ${key}`);
            }

            console.log(`✅ Targeted Redis cache cleared for sheet: ${sheetName}`);
          } catch (cacheError) {
            console.log(`⚠️ Redis cache clearing skipped:`, cacheError instanceof Error ? cacheError.message : 'Unknown error');
          }

          // 2. BUSCAR DADOS ATUALIZADOS (forçando bypass do cache)
          const SHEET_ID = process.env.GOOGLE_SHEET_ID;

          // Buscar dados antigos do cache (se disponível)
          const oldProductsData = await parseGoogleSheetWithDate(sheetName).catch(() => ({ products: [] }));
          const oldProducts = Array.isArray(oldProductsData) ? oldProductsData : (oldProductsData.products || []);

          // Remover delay artificial - processar imediatamente

          // Forçar busca fresh dos dados (bypass total do cache)
          if (!SHEET_ID) {
            throw new Error('GOOGLE_SHEET_ID environment variable not set');
          }

          const range = `${sheetName}!A1:H50000`;
          const freshData = await googleSheetsService.getSheetDataFresh(SHEET_ID, range);

          // Reprocessar os dados frescos
          const newProductsData = await parseGoogleSheetWithDate(sheetName);
          const newProductsArray = Array.isArray(newProductsData) ? newProductsData : (newProductsData.products || []);
          console.log(`📊 Comparison: ${oldProducts.length} old vs ${newProductsArray.length} new products`);

          // 4. BROADCAST DE ATUALIZAÇÃO IMEDIATA
          console.log(`📡 Broadcasting immediate cache refresh to all clients...`);

          // Broadcast para todos os clientes que o cache foi atualizado
          const broadcastData = {
            type: 'CACHE_REFRESHED',
            sheetName,
            timestamp: new Date().toISOString(),
            productCount: newProductsArray.length,
            message: 'Dados atualizados! Recarregando...'
          };

          // ✅ UNIFIED WEBSOCKET BROADCAST - Using both methods for reliability
          const unifiedMessage = {
            type: 'CACHE_REFRESHED',
            data: broadcastData,
            timestamp: new Date().toISOString()
          };

          let totalClientsNotified = 0;

          // Primary method: Use UnifiedWebSocketManager for all connections
          try {
            const { UnifiedWebSocketManager } = await import('../services/websocket-manager');
            const wsManager = UnifiedWebSocketManager.getInstance();

            // Send immediate cache refresh notification
            wsManager.broadcastToAll(unifiedMessage);
            const clientCount = wsManager.getClientCount();
            totalClientsNotified += clientCount;

            console.log(`✅ Cache refresh broadcasted to ${clientCount} WebSocket clients`);

            // Also send a more specific update message
            const updateMessage = {
              type: 'SHEETS_UPDATED',
              data: {
                sheetName,
                timestamp: new Date().toISOString(),
                message: 'Dados da planilha atualizados em tempo real!'
              },
              timestamp: new Date().toISOString()
            };

            wsManager.broadcastToAll(updateMessage);
            console.log(`✅ Specific sheets update broadcasted to ${clientCount} clients`);

          } catch (wsError) {
            console.log('⚠️ UnifiedWebSocketManager broadcast failed:', wsError instanceof Error ? wsError.message : 'Unknown error');
          }

          // Fallback method: Direct broadcast to all connected clients
          if (wsClients.size > 0) {
            const messageStr = JSON.stringify(unifiedMessage);
            let fallbackNotified = 0;

            wsClients.forEach(client => {
              if (client.readyState === 1) { // WebSocket.OPEN
                try {
                  client.send(messageStr);
                  fallbackNotified++;
                } catch (error) {
                  console.error('❌ Error in fallback broadcast:', error);
                }
              }
            });

            console.log(`✅ Fallback broadcast: ${fallbackNotified}/${wsClients.size} clients notified`);
            totalClientsNotified += fallbackNotified;
          }

          console.log(`🎯 Total clients notified: ${totalClientsNotified}`);

          // Log success for monitoring
          if (totalClientsNotified === 0) {
            console.warn('⚠️ No clients were notified of the cache refresh - possible WebSocket connection issues');
          } else {
            console.log(`✅ Successfully broadcast cache refresh to ${totalClientsNotified} connected clients`);
          }

          // 5. Detectar novos menores preços
          if (oldProducts.length > 0 && newProductsArray.length > 0) {
            const newLowPrices = detectNewLowPrices(oldProducts, newProductsArray);

            if (newLowPrices.length > 0) {
              console.log(`🎯 Found ${newLowPrices.length} new low prices!`);

              // Broadcast each new low price
              newLowPrices.forEach(lowPrice => {
                broadcastNewLowPrice(lowPrice);
                sendNotificationToAllUsers(
                  `${lowPrice.model}-${lowPrice.storage}-${lowPrice.color}`,
                  lowPrice.price,
                  {
                    model: lowPrice.model,
                    storage: lowPrice.storage,
                    color: lowPrice.color,
                    supplier: lowPrice.supplier,
                    previousLowestPrice: null // Poderíamos calcular se necessário
                  }
                );
              });
            }

            // Detectar mudanças de preço em geral
            const priceChanges = detectPriceChanges(oldProducts, newProductsArray);
            if (priceChanges.length > 0) {
              console.log(`📈📉 Detected ${priceChanges.length} price changes`);

              // Broadcast general price changes
              broadcastPriceUpdate({
                type: 'GENERAL_PRICE_CHANGES',
                changes: priceChanges,
                sheetName,
                timestamp: new Date().toISOString()
              });
            }
          }

        } catch (sheetError) {
          console.error('❌ Error processing sheet data:', sheetError);
        }
      }

      // ✅ BROADCAST FINAL OBRIGATÓRIO
      try {
        const { broadcastToAllUsers } = await import('../websocket-manager');
        const finalMessage = {
          type: 'CACHE_REFRESHED',
          data: {
            sheetName,
            timestamp: new Date().toISOString(),
            message: 'Dados atualizados! Recarregando...'
          },
          timestamp: new Date().toISOString()
        };
        const finalBroadcast = await broadcastToAllUsers(finalMessage);
        console.log(`🎯 Final broadcast executed: ${finalBroadcast} users notified`);
      } catch (error) {
        console.error('❌ Final broadcast failed:', error);
      }

      // Log do webhook para auditoria
      console.log('✅ Webhook processed successfully - logging would happen here');

      console.log('✅ Webhook processed successfully');

      res.status(200).json({
        message: 'Webhook processed successfully',
        timestamp: new Date().toISOString(),
        sheetName,
        eventType
      });

    } catch (error) {
      console.error('❌ Error processing webhook:', error);

      // Log do erro
      console.error('❌ Webhook error logged:', error instanceof Error ? error.message : 'Unknown error');

      res.status(500).json({
        message: 'Error processing webhook',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      });
    } finally {
      isSyncInProgress = false;
    }

  } catch (error) {
    console.error('❌ Critical webhook error:', error);
    isSyncInProgress = false;
    res.status(500).json({
      message: 'Critical webhook error',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
});

// Webhook alternativo para atualizações de planilha - EXECUTA A MESMA LÓGICA
router.post('/sheets-update', async (req: Request, res: Response) => {
  console.log('🔄 /sheets-update called - executing main webhook logic');

  // Execute the same logic as the main webhook
  try {
    let isSyncInProgress = false;

    if (isSyncInProgress) {
      console.log('⚠️ Sync already in progress, skipping...');
      return res.status(202).json({
        message: 'Sync already in progress',
        timestamp: new Date().toISOString()
      });
    }

    isSyncInProgress = true;

    console.log('🎯 WEBHOOK ENDPOINT ACIONADO! Recebendo dados...');
    console.log('📍 URL chamada:', req.originalUrl);
    console.log('📊 Method:', req.method);
    console.log('🔍 Headers:', req.headers);


// Endpoint de teste para simular atualizações em tempo real
router.post('/test-realtime-update', async (req: Request, res: Response) => {
  console.log('🧪 Testing complete real-time update system...');

  try {
    // Test multiple message types to ensure all listeners work
    const testMessages = [
      {
        type: 'CACHE_REFRESHED',
        data: {
          sheetName: 'test-realtime',
          timestamp: new Date().toISOString(),
          productCount: 100,
          message: 'Cache atualizado - teste completo!'
        },
        timestamp: new Date().toISOString()
      },
      {
        type: 'SHEETS_UPDATED',
        data: {
          sheetName: 'test-realtime',
          timestamp: new Date().toISOString(),
          message: 'Planilha atualizada - teste completo!'
        },
        timestamp: new Date().toISOString()
      },
      {
        type: 'DATA_REFRESH',
        data: {
          timestamp: new Date().toISOString(),
          message: 'Dados atualizados - teste completo!'
        },
        timestamp: new Date().toISOString()
      }
    ];

    // Broadcast using UnifiedWebSocketManager
    const { UnifiedWebSocketManager } = await import('../services/websocket-manager');
    const wsManager = UnifiedWebSocketManager.getInstance();

    let totalClientCount = 0;

    for (const testMessage of testMessages) {
      wsManager.broadcastToAll(testMessage);
      const clientCount = wsManager.getClientCount();
      totalClientCount = clientCount;
      console.log(`✅ ${testMessage.type} broadcasted to ${clientCount} WebSocket clients`);

      // Small delay between messages
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    res.json({
      success: true,
      message: 'Teste completo de tempo real enviado com sucesso',
      clientsNotified: totalClientCount,
      messagesCount: testMessages.length,
      testMessages,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Error in comprehensive real-time test:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});



    // Parse request body
    const { 
      sheetName = '08-08',  // Default to current date format
      eventType = 'edit',
      range = 'A:H'
    } = req.body || {};

    console.log(`📊 Processing webhook for sheet: ${sheetName}`);
    console.log(`🔄 Event type: ${eventType}`);

    // Execute the full webhook processing logic
    if (sheetName && typeof sheetName === 'string') {
      try {
        console.log(`🔄 1. PROCESSANDO MUDANÇAS NA PLANILHA: ${sheetName}`);

        // Same processing logic as main webhook
        const SHEET_ID = process.env.GOOGLE_SHEET_ID;

        // Get old products data
        const oldProductsData = await parseGoogleSheetWithDate(sheetName).catch(() => ({ products: [] }));
        const oldProducts = Array.isArray(oldProductsData) ? oldProductsData : (oldProductsData.products || []);

        // Processar imediatamente sem delay artificial

        // Force fresh data fetch
        if (!SHEET_ID) {
          throw new Error('GOOGLE_SHEET_ID environment variable not set');
        }

        const range = `${sheetName}!A1:H50000`;
        const { googleSheetsService } = await import('../services/google-sheets');
        const freshData = await googleSheetsService.getSheetDataFresh(SHEET_ID, range);

        // Reprocess fresh data
        const newProductsData = await parseGoogleSheetWithDate(sheetName);
        const newProductsArray = Array.isArray(newProductsData) ? newProductsData : (newProductsData.products || []);
        console.log(`📊 Comparison: ${oldProducts.length} old vs ${newProductsArray.length} new products`);

        // Broadcast cache refresh
        const broadcastData = {
          sheetName,
          timestamp: new Date().toISOString(),
          productCount: newProductsArray.length,
          message: 'Dados atualizados! Recarregando...'
        };

        // Unified WebSocket broadcast
        const unifiedMessage = {
          type: 'CACHE_REFRESHED',
          data: broadcastData,
          timestamp: new Date().toISOString()
        };

        let totalClientsNotified = 0;

        // Primary method: Use UnifiedWebSocketManager
        try {
          const { UnifiedWebSocketManager } = await import('../services/websocket-manager');
          const wsManager = UnifiedWebSocketManager.getInstance();
          wsManager.broadcastToAll(unifiedMessage);
          const clientCount = wsManager.getClientCount();
          totalClientsNotified += clientCount;
          console.log(`✅ UnifiedWebSocketManager broadcast: ${clientCount} clients notified`);
        } catch (wsError) {
          console.log(`⚠️ UnifiedWebSocketManager broadcast failed:`, wsError instanceof Error ? wsError.message : 'Unknown error');
        }

        // Fallback method: Direct broadcast
        if (wsClients.size > 0) {
          const messageStr = JSON.stringify(unifiedMessage);
          let fallbackNotified = 0;

          wsClients.forEach(client => {
            if (client.readyState === 1) {
              try {
                client.send(messageStr);
                fallbackNotified++;
              } catch (error) {
                console.error('❌ Error in fallback broadcast:', error);
              }
            }
          });

          console.log(`✅ Fallback broadcast: ${fallbackNotified}/${wsClients.size} clients notified`);
          totalClientsNotified += fallbackNotified;
        }

        console.log(`🎯 Total clients notified: ${totalClientsNotified}`);

        // ✅ BROADCAST FINAL OBRIGATÓRIO
        try {
          const { broadcastToAllUsers } = await import('../websocket-manager');
          const finalBroadcast = await broadcastToAllUsers(unifiedMessage);
          console.log(`🎯 Final broadcast executed: ${finalBroadcast} users notified`);
        } catch (error) {
          console.error('❌ Final broadcast failed:', error);
        }

        // Log success
        if (totalClientsNotified === 0) {
          console.warn('⚠️ No clients were notified of the cache refresh');
        } else {
          console.log(`✅ Successfully broadcast cache refresh to ${totalClientsNotified} connected clients`);
        }

      } catch (sheetError) {
        console.error('❌ Error processing sheet data:', sheetError);
      }
    }

    console.log('✅ /sheets-update webhook processed successfully');

    res.status(200).json({
      message: 'Sheets-update webhook processed successfully',
      timestamp: new Date().toISOString(),
      sheetName,
      eventType
    });

    isSyncInProgress = false;

  } catch (error) {
    console.error('❌ Error in /sheets-update webhook:', error);

    res.status(500).json({
      message: 'Error processing sheets-update webhook',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
});

// Endpoint de teste para webhook COM BROADCAST
router.post('/test-webhook', async (req: Request, res: Response) => {
  console.log('🧪 Test webhook received:', req.body);

  // Test the complete real-time broadcast system
  const testMessage = {
    type: 'CACHE_REFRESHED',
    data: {
      sheetName: 'test-sheet',
      timestamp: new Date().toISOString(),
      productCount: 999,
      message: 'Test broadcast from webhook endpoint'
    },
    timestamp: new Date().toISOString()
  };

  // Test WebSocket Manager broadcast
  try {
    const { broadcastToAllUsers } = await import('../websocket-manager');
    const notifiedCount = await broadcastToAllUsers(testMessage);
    console.log(`✅ Test broadcast sent to ${notifiedCount} clients via WebSocket Manager`);
  } catch (wsError) {
    console.log(`⚠️ WebSocket Manager test broadcast failed:`, wsError instanceof Error ? wsError.message : 'Unknown error');
  }

  res.status(200).json({ 
    message: 'Test webhook working with broadcast', 
    body: req.body,
    broadcastMessage: testMessage,
    timestamp: new Date().toISOString()
  });
});

// Teste manual de webhook para administradores
router.post('/test/manual-sheets', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    console.log('🧪 TESTE DE WEBHOOK MANUAL INICIADO');

    // Simular dados de webhook de alteração de preço
    const mockWebhookData = {
      sheetId: process.env.GOOGLE_SHEET_ID,
      sheetName: '20-06', // Data atual
      range: 'G4',
      values: [['3100']], // Novo preço
      eventType: 'EDIT',
      rowIndex: 4,
      columnIndex: 6, // Coluna G (preço)
      oldValue: '3200', // Preço anterior
      newValue: '3100'  // Novo preço
    };

    // Processar como se fosse um webhook real
    req.body = mockWebhookData;

    console.log('📊 Dados simulados:', mockWebhookData);

    // Handle the webhook manually
    res.status(200).json({
      message: 'Manual webhook test completed',
      data: mockWebhookData,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Erro no teste manual de webhook:', error);
    res.status(500).json({
      message: 'Erro no teste manual',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export { router as webhookRoutes };