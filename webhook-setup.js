/**
 * Google Apps Script para configurar webhook do Google Sheets
 * Coloque este código no editor de scripts da sua planilha
 */

// Configurações do webhook
const WEBHOOK_URL = 'https://SEU_REPLIT_URL.replit.app/api/webhook/sheets-update';
const SPREADSHEET_ID = '1jMXWtn_hcz4tY51-82Z-gwsZQzm0XFJUSf92zdKTdYk'; // ID da sua planilha

/**
 * Google Apps Script para detectar mudanças de preço e enviar webhooks
 * 
 * Este script deve ser adicionado ao seu Google Sheets como Apps Script
 * e configurado para executar no evento onEdit
 */
function onEdit(e) {
  try {
    const range = e.range;
    const sheet = range.getSheet();
    const sheetName = sheet.getName();

    // Verificar se a edição foi em uma aba de data (formato DD-MM)
    const datePattern = /^\d{2}-\d{2}$/;
    if (!datePattern.test(sheetName)) {
      console.log(`Aba ${sheetName} não é uma aba de data, ignorando webhook`);
      return;
    }

    const oldValue = e.oldValue || '';
    const newValue = e.value || '';
    const rowNumber = range.getRow();
    const columnNumber = range.getColumn();

    // Check if this is a price column edit (column 7 = G = PREÇO)
    const isPriceColumn = columnNumber === 7;

    if (!isPriceColumn) {
      console.log(`Coluna ${columnNumber} não é de preço, ignorando`);
      return;
    }

    // Only process if both old and new values exist
    if (!oldValue || !newValue) {
      console.log('Valor antigo ou novo ausente, ignorando');
      return;
    }

    console.log(`🔄 Mudança de preço detectada na aba ${sheetName}, linha ${rowNumber}`);
    console.log(`💰 Preço: ${oldValue} → ${newValue}`);

    // Get product data from the same row
    const rowData = sheet.getRange(rowNumber, 1, 1, 8).getValues()[0];
    const [supplier, category, model, storage, region, color, price, venda] = rowData;

    // Check if this is an iPhone product
    const modelStr = (model || '').toString().toLowerCase();
    const categoryStr = (category || '').toString().toLowerCase();

    const isIPhoneProduct = modelStr.includes('iphone') || 
                           categoryStr.includes('iph') || 
                           categoryStr.includes('ip');

    // Log product details
    console.log(`📦 Produto: ${model} (${category})`);
    console.log(`🏪 Fornecedor: ${supplier}`);
    console.log(`📱 É iPhone: ${isIPhoneProduct ? 'Sim' : 'Não'}`);

    // Parse prices to check if it's actually a price drop
    const parsePrice = (priceStr) => {
      if (!priceStr) return 0;
      const cleanPrice = priceStr.toString()
        .replace(/[R$\s]/g, '')
        .replace(/\./g, '')
        .replace(',', '.');
      const parsed = parseFloat(cleanPrice);
      return isNaN(parsed) ? 0 : parsed;
    };

    const oldPriceNum = parsePrice(oldValue);
    const newPriceNum = parsePrice(newValue);
    const priceDrop = oldPriceNum - newPriceNum;

    console.log(`💰 Preço antigo: ${oldPriceNum}, Novo: ${newPriceNum}, Diferença: ${priceDrop}`);

    // Only send webhook for actual price drops
    if (priceDrop <= 0) {
      console.log('⚠️ Preço não baixou, ignorando webhook');
      return;
    }

    // Prepare webhook payload with comprehensive data
    const webhookPayload = {
      eventType: 'PRICE_CHANGE',
      sheetName: sheetName,
      rowIndex: rowNumber,
      columnIndex: columnNumber,
      oldValue: oldValue,
      newValue: newValue,
      productData: {
        supplier: supplier || '',
        category: category || '',
        model: model || '',
        storage: storage || '',
        region: region || '',
        color: color || ''
      },
      priceAnalysis: {
        oldPrice: oldPriceNum,
        newPrice: newPriceNum,
        priceDrop: priceDrop,
        dropPercentage: ((priceDrop / oldPriceNum) * 100).toFixed(1)
      },
      isIPhoneProduct: isIPhoneProduct,
      timestamp: new Date().toISOString(),
      dataReferencia: sheetName
    };

    console.log('📤 Enviando webhook com payload:', JSON.stringify(webhookPayload, null, 2));

    // Send webhook to both endpoints for redundancy
    const webhookUrls = [
      'https://workspace--replit-agent--jonathan01.replit.app/api/webhook/sheets-update',
      'https://workspace--replit-agent--jonathan01.replit.app/api/webhook/google-sheets'
    ];

    webhookUrls.forEach((url, index) => {
      try {
        const response = UrlFetchApp.fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'Google-Apps-Script-Webhook'
          },
          payload: JSON.stringify(webhookPayload),
          muteHttpExceptions: true
        });

        console.log(`✅ Webhook ${index + 1} enviado: ${response.getResponseCode()}`);
        console.log(`📋 Resposta: ${response.getContentText()}`);

      } catch (error) {
        console.error(`❌ Erro no webhook ${index + 1}:`, error.toString());
      }
    });

  } catch (error) {
    console.error('❌ Erro geral no script:', error.toString());
  }
}

/**
 * Função para testar o webhook manualmente
 */
function testWebhook() {
  const testPayload = {
    eventType: 'EDIT',
    source: {
      spreadsheetId: SPREADSHEET_ID,
      sheetName: '07-06'
    },
    range: 'B2',
    changedCells: [{
      row: 2,
      column: 2,
      oldValue: 'Valor Antigo',
      newValue: 'Valor Novo'
    }],
    user: {
      email: Session.getActiveUser().getEmail()
    },
    timestamp: new Date().toISOString()
  };

  try {
    const response = UrlFetchApp.fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      payload: JSON.stringify(testPayload),
      muteHttpExceptions: true
    });

    console.log('Test webhook response:', response.getContentText());
    console.log('Status code:', response.getResponseCode());

  } catch (error) {
    console.error('Erro no teste de webhook:', error);
  }
}

/**
 * Função para validar conectividade com o endpoint
 */
function validateWebhookEndpoint() {
  try {
    const validateUrl = WEBHOOK_URL.replace('/sheets-update', '/validate');

    const response = UrlFetchApp.fetch(validateUrl, {
      method: 'GET',
      muteHttpExceptions: true
    });

    const responseText = response.getContentText();
    const statusCode = response.getResponseCode();

    console.log(`Validation response: ${statusCode} - ${responseText}`);

    if (statusCode === 200) {
      console.log('✅ Webhook endpoint está funcionando');
    } else {
      console.log('❌ Webhook endpoint não está respondendo corretamente');
    }

  } catch (error) {
    console.error('Erro na validação:', error);
  }
}

/**
 * Função para configurar o trigger automaticamente
 * Execute esta função uma vez para configurar o webhook
 */
function setupWebhookTrigger() {
  try {
    // Remover triggers existentes para evitar duplicatas
    const triggers = ScriptApp.getProjectTriggers();
    triggers.forEach(trigger => {
      if (trigger.getHandlerFunction() === 'onEdit') {
        ScriptApp.deleteTrigger(trigger);
      }
    });

    // Criar novo trigger
    ScriptApp.newTrigger('onEdit')
      .onEdit()
      .create();

    console.log('✅ Trigger de webhook configurado com sucesso');
    console.log('O webhook será executado automaticamente quando houver edições na planilha');

  } catch (error) {
    console.error('Erro ao configurar trigger:', error);
  }
}

/**
 * Instruções de instalação:
 * 
 * 1. Abra sua planilha no Google Sheets
 * 2. Vá em Extensões > Apps Script
 * 3. Cole este código no editor
 * 4. Substitua SEU_REPLIT_URL pela URL real do seu projeto Replit
 * 5. Execute a função setupWebhookTrigger() uma vez
 * 6. Autorize as permissões necessárias
 * 7. Teste com testWebhook() ou validateWebhookEndpoint()
 * 
 * O webhook será executado automaticamente sempre que houver edições na planilha!
 */