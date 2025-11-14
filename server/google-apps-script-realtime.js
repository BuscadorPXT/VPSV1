/**
 * Google Apps Script otimizado para notificações em tempo real
 * Este script deve ser colado no Google Apps Script da planilha
 * 
 * INSTRUÇÕES DE CONFIGURAÇÃO:
 * 1. Abra sua planilha no Google Sheets
 * 2. Vá em Extensions > Apps Script
 * 3. Cole este código substituindo o código existente
 * 4. Configure a variável WEBHOOK_URL com a URL do seu sistema
 * 5. Configure os gatilhos para onChange
 */

// ===== CONFIGURAÇÕES =====
const WEBHOOK_URL = 'https://your-domain.replit.app/api/webhook/sheets-update';
const ENABLE_CONSOLE_LOGS = true;
const RETRY_ATTEMPTS = 3;
const RETRY_DELAY = 1000; // 1 segundo

// Configurações de horário comercial (América/São Paulo)
const BUSINESS_HOURS = {
  start: 8,   // 8h
  end: 16,    // 16h
  timezone: 'America/Sao_Paulo'
};

/**
 * Função principal - detecta mudanças na planilha em tempo real
 */
function onEdit(e) {
  try {
    const currentTime = new Date();
    const isBusinessHours = checkBusinessHours(currentTime);
    
    // Durante horário comercial, processar TODAS as mudanças
    // Fora do horário, processar apenas mudanças importantes
    if (!isBusinessHours && !isImportantChange(e)) {
      log('🕒 Fora do horário comercial - ignorando mudança não crítica');
      return;
    }

    log('🔄 Mudança detectada na planilha - processando...');
    
    const sheet = e.source.getActiveSheet();
    const range = e.range;
    const row = range.getRow();
    const col = range.getColumn();
    
    // Verificar se é uma mudança relevante (colunas de dados importantes)
    if (!isRelevantColumn(col)) {
      log(`ℹ️ Coluna ${col} não é relevante - ignorando`);
      return;
    }

    // Obter dados da linha modificada
    const rowData = getRowData(sheet, row);
    if (!rowData) {
      log('⚠️ Não foi possível obter dados da linha');
      return;
    }

    // Preparar payload otimizado
    const payload = {
      // Dados do produto
      fornecedor: rowData.supplier,
      categoria: rowData.category,
      modelo: rowData.model,
      gb: rowData.storage,
      regiao: rowData.region,
      cor: rowData.color,
      preco: rowData.price,
      venda: rowData.sellPrice,
      
      // Metadados
      atualizadoEm: currentTime.toISOString(),
      linha: row,
      aba: sheet.getName(),
      coluna: col,
      valorAnterior: e.oldValue,
      valorNovo: e.value,
      
      // Contexto
      horarioComercial: isBusinessHours,
      tipoMudanca: determinChangeType(col, e.oldValue, e.value),
      
      // Identificador único para evitar duplicatas
      changeId: generateChangeId(sheet.getName(), row, col, currentTime)
    };

    log('📤 Enviando dados para webhook:', JSON.stringify(payload, null, 2));

    // Enviar para webhook com retry
    const success = sendToWebhookWithRetry(payload);
    
    if (success) {
      log('✅ Webhook enviado com sucesso');
      
      // Durante horário comercial, também ordenar a planilha se for mudança de preço
      if (isBusinessHours && isPriceChange(col)) {
        sortSheetByPrice(sheet);
      }
    } else {
      log('❌ Falha ao enviar webhook após todas as tentativas');
    }

  } catch (error) {
    log('❌ Erro no onEdit:', error.toString());
  }
}

/**
 * Verifica se estamos em horário comercial
 */
function checkBusinessHours(date) {
  try {
    const timeZone = BUSINESS_HOURS.timezone;
    const hour = parseInt(Utilities.formatDate(date, timeZone, 'HH'));
    return hour >= BUSINESS_HOURS.start && hour < BUSINESS_HOURS.end;
  } catch (error) {
    log('❌ Erro verificando horário comercial:', error.toString());
    return false;
  }
}

/**
 * Verifica se a mudança é importante fora do horário comercial
 */
function isImportantChange(e) {
  const col = e.range.getColumn();
  
  // Colunas importantes: preço (7), fornecedor (1), modelo (3)
  const importantColumns = [1, 3, 7];
  
  if (!importantColumns.includes(col)) {
    return false;
  }
  
  // Se é mudança de preço, verificar se a diferença é significativa
  if (col === 7) { // Coluna de preço
    const oldPrice = parsePrice(e.oldValue);
    const newPrice = parsePrice(e.value);
    
    if (oldPrice && newPrice) {
      const difference = Math.abs(oldPrice - newPrice);
      return difference >= 1; // Diferença de pelo menos R$ 1,00
    }
  }
  
  return true;
}

/**
 * Verifica se a coluna é relevante para monitoramento
 */
function isRelevantColumn(col) {
  // Colunas: 1=Fornecedor, 2=Categoria, 3=Modelo, 4=GB, 5=Região, 6=Cor, 7=Preço, 8=Venda
  return col >= 1 && col <= 8;
}

/**
 * Verifica se é mudança de preço
 */
function isPriceChange(col) {
  return col === 7; // Coluna de preço
}

/**
 * Obtém dados completos da linha
 */
function getRowData(sheet, row) {
  try {
    const range = sheet.getRange(row, 1, 1, 8); // Colunas A-H
    const values = range.getValues()[0];
    
    return {
      supplier: values[0] || '',
      category: values[1] || '',
      model: values[2] || '',
      storage: values[3] || '',
      region: values[4] || '',
      color: values[5] || '',
      price: parsePrice(values[6]),
      sellPrice: parsePrice(values[7])
    };
  } catch (error) {
    log('❌ Erro obtendo dados da linha:', error.toString());
    return null;
  }
}

/**
 * Converte string de preço para número
 */
function parsePrice(priceStr) {
  if (!priceStr) return 0;
  
  const cleanPrice = priceStr.toString()
    .replace(/[^\d.,]/g, '')  // Remove tudo exceto números, vírgulas e pontos
    .replace(',', '.');       // Converte vírgula para ponto
  
  return parseFloat(cleanPrice) || 0;
}

/**
 * Determina o tipo de mudança
 */
function determinChangeType(col, oldValue, newValue) {
  switch (col) {
    case 1: return 'SUPPLIER_CHANGE';
    case 3: return 'MODEL_CHANGE';
    case 7: 
      const oldPrice = parsePrice(oldValue);
      const newPrice = parsePrice(newValue);
      if (oldPrice && newPrice) {
        if (newPrice < oldPrice) return 'PRICE_DROP';
        if (newPrice > oldPrice) return 'PRICE_INCREASE';
      }
      return 'PRICE_CHANGE';
    default: return 'DATA_UPDATE';
  }
}

/**
 * Gera ID único para a mudança
 */
function generateChangeId(sheetName, row, col, timestamp) {
  return `${sheetName}_${row}_${col}_${timestamp.getTime()}`;
}

/**
 * Envia dados para webhook com retry
 */
function sendToWebhookWithRetry(payload) {
  let attempt = 0;
  
  while (attempt < RETRY_ATTEMPTS) {
    try {
      const response = UrlFetchApp.fetch(WEBHOOK_URL, {
        method: 'POST',
        contentType: 'application/json',
        payload: JSON.stringify(payload),
        muteHttpExceptions: true,
        timeout: 10000 // 10 segundos
      });

      if (response.getResponseCode() === 200) {
        log(`✅ Webhook enviado com sucesso (tentativa ${attempt + 1})`);
        return true;
      } else {
        log(`⚠️ Webhook retornou código ${response.getResponseCode()} (tentativa ${attempt + 1})`);
        log(`Resposta: ${response.getContentText()}`);
      }

    } catch (error) {
      log(`❌ Erro enviando webhook (tentativa ${attempt + 1}):`, error.toString());
    }

    attempt++;
    if (attempt < RETRY_ATTEMPTS) {
      log(`🔄 Aguardando ${RETRY_DELAY}ms antes da próxima tentativa...`);
      Utilities.sleep(RETRY_DELAY);
    }
  }
  
  return false;
}

/**
 * Ordena a planilha por preço durante horário comercial
 */
function sortSheetByPrice(sheet) {
  try {
    const lastRow = sheet.getLastRow();
    if (lastRow <= 1) return; // Sem dados para ordenar
    
    const range = sheet.getRange(2, 1, lastRow - 1, 8); // Skip header row
    range.sort({ column: 7, ascending: true }); // Ordenar por preço (coluna 7)
    
    log('📊 Planilha ordenada por preço');
  } catch (error) {
    log('❌ Erro ordenando planilha:', error.toString());
  }
}

/**
 * Função de log personalizada
 */
function log(message, data = null) {
  if (!ENABLE_CONSOLE_LOGS) return;
  
  const timestamp = new Date().toISOString();
  if (data) {
    console.log(`[${timestamp}] ${message}`, data);
  } else {
    console.log(`[${timestamp}] ${message}`);
  }
}

/**
 * Função para testar o webhook manualmente
 */
function testWebhook() {
  const testPayload = {
    fornecedor: 'Teste Fornecedor',
    modelo: 'iPhone 15 Pro',
    gb: '256GB',
    cor: 'Titanio Natural',
    preco: 8999,
    venda: 9299,
    atualizadoEm: new Date().toISOString(),
    linha: 999,
    aba: 'TESTE',
    tipoMudanca: 'PRICE_DROP',
    horarioComercial: checkBusinessHours(new Date()),
    changeId: 'TEST_' + new Date().getTime()
  };
  
  log('🧪 Testando webhook...');
  const success = sendToWebhookWithRetry(testPayload);
  
  if (success) {
    log('✅ Teste de webhook bem-sucedido!');
  } else {
    log('❌ Teste de webhook falhou!');
  }
}

/**
 * Função para configurar gatilhos automáticos
 * Execute uma vez para configurar os gatilhos
 */
function setupTriggers() {
  // Remove gatilhos existentes
  const triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(trigger => {
    if (trigger.getHandlerFunction() === 'onEdit') {
      ScriptApp.deleteTrigger(trigger);
    }
  });
  
  // Criar novo gatilho onChange
  ScriptApp.newTrigger('onEdit')
    .onEdit()
    .create();
  
  log('✅ Gatilhos configurados com sucesso!');
}