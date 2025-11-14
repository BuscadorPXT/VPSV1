// ============================================================================
// SCRIPT COMPLETO DO GOOGLE SHEETS - BUSCADOR PXT
// ============================================================================
// Versão COMPLETA com suporte a:
// - Edição de células (onEdit)  
// - Inserção de novas linhas (onChange)
// - Retry automático
// - Logs detalhados
// ============================================================================

// CONFIGURAÇÕES
const CONFIG = {
  WEBHOOK_URL: 'https://7081f9c2-0746-4fa0-bc2f-2274a33b30ad-00-27oyim1rk306b.riker.replit.dev/api/webhook/sheets-update',
  MAX_RETRIES: 3,
  RETRY_DELAY_MS: 1000,
  TIMEOUT_MS: 10000,
  ABAS_MONITORADAS: ['30-10', '29-10', '28-10', '27-10', 'ENTRADA_JONATHAN', 'ENTRADA_CAROL']
};

// ============================================================================
// TRIGGER 1: onEdit - Detecta EDIÇÕES em células existentes
// ============================================================================
function onEdit(e) {
  const startTime = new Date().getTime();
  
  if (!e) {
    Logger.log("❌ Evento 'e' está undefined");
    return;
  }

  try {
    const sheet = e.range.getSheet();
    const row = e.range.getRow();
    const column = e.range.getColumn();
    const sheetName = sheet.getSheetName();
    
    Logger.log(`📝 EDIÇÃO detectada: Aba="${sheetName}", Linha=${row}, Coluna=${column}`);
    
    // Ignorar se não for aba monitorada
    if (!CONFIG.ABAS_MONITORADAS.includes(sheetName)) {
      Logger.log(`ℹ️ Aba "${sheetName}" não monitorada - ignorando`);
      return;
    }
    
    // Ignorar cabeçalho
    if (row === 1) {
      Logger.log('ℹ️ Edição no cabeçalho - ignorando');
      return;
    }
    
    // Processar e enviar webhook
    processarLinhaEEnviarWebhook(sheet, row, sheetName, 'EDIT');
    
    const duration = new Date().getTime() - startTime;
    Logger.log(`✅ Processamento de EDIÇÃO concluído em ${duration}ms`);
    
  } catch (error) {
    Logger.log(`❌ Erro no onEdit: ${error.message}`);
    Logger.log(`Stack: ${error.stack}`);
  }
}

// ============================================================================
// TRIGGER 2: onChange - Detecta INSERÇÕES e outras mudanças estruturais
// ============================================================================
function onChange(e) {
  const startTime = new Date().getTime();
  
  if (!e) {
    Logger.log("❌ Evento onChange está undefined");
    return;
  }

  try {
    Logger.log(`🔄 MUDANÇA detectada: ${JSON.stringify(e.changeType)}`);
    
    // Só processar inserção de linhas
    if (e.changeType !== 'INSERT_ROW') {
      Logger.log(`ℹ️ Tipo de mudança "${e.changeType}" ignorado`);
      return;
    }
    
    const activeSheet = SpreadsheetApp.getActiveSheet();
    const sheetName = activeSheet.getSheetName();
    
    // Verificar se é aba monitorada
    if (!CONFIG.ABAS_MONITORADAS.includes(sheetName)) {
      Logger.log(`ℹ️ Aba "${sheetName}" não monitorada - ignorando`);
      return;
    }
    
    Logger.log(`➕ INSERÇÃO de linha detectada na aba: ${sheetName}`);
    
    // Aguardar um momento para dados serem preenchidos
    Utilities.sleep(500);
    
    // Processar última linha com dados
    const lastRow = activeSheet.getLastRow();
    
    if (lastRow > 1) { // Ignorar se só tem cabeçalho
      processarLinhaEEnviarWebhook(activeSheet, lastRow, sheetName, 'INSERT');
    }
    
    const duration = new Date().getTime() - startTime;
    Logger.log(`✅ Processamento de INSERÇÃO concluído em ${duration}ms`);
    
  } catch (error) {
    Logger.log(`❌ Erro no onChange: ${error.message}`);
    Logger.log(`Stack: ${error.stack}`);
  }
}

// ============================================================================
// FUNÇÃO: Processar linha e enviar webhook
// ============================================================================
function processarLinhaEEnviarWebhook(sheet, row, sheetName, tipoMudanca) {
  try {
    // Buscar dados da linha completa
    const values = sheet.getRange(row, 1, 1, 8).getValues()[0];
    
    // Validar se tem dados mínimos
    if (!values[2]) { // Sem modelo
      Logger.log(`⚠️ Linha ${row} sem modelo - ignorando`);
      return;
    }
    
    // Processar preços
    const preco = processarPreco(values[6]);
    const venda = processarPreco(values[7]);
    
    // Montar payload
    const payload = {
      aba: sheetName,
      linha: row,
      coluna: 1,
      fornecedor: values[0] || 'FORNECEDOR',
      categoria: values[1] || 'CAT',
      modelo: values[2] || '',
      gb: values[3] || '',
      regiao: values[4] || '',
      cor: values[5] || '',
      preco: preco,
      venda: venda,
      atualizadoEm: new Date().toISOString(),
      timestamp: Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'HH:mm:ss'),
      tipoMudanca: tipoMudanca
    };
    
    Logger.log(`📦 Payload: ${JSON.stringify(payload)}`);
    
    // Enviar webhook
    const success = enviarWebhookComRetry(payload);
    
    // Atualizar controle
    if (success) {
      atualizarControleTimestamp();
    }
    
  } catch (error) {
    Logger.log(`❌ Erro ao processar linha ${row}: ${error.message}`);
  }
}

// ============================================================================
// FUNÇÃO: Processar preço
// ============================================================================
function processarPreco(valor) {
  if (!valor) return 0;
  
  try {
    const valorString = String(valor).replace(/[^\d,]/g, '').replace(',', '.');
    const numeroFormatado = parseFloat(valorString);
    return isNaN(numeroFormatado) ? 0 : numeroFormatado;
  } catch (error) {
    Logger.log(`⚠️ Erro ao processar preço "${valor}": ${error.message}`);
    return 0;
  }
}

// ============================================================================
// FUNÇÃO: Enviar webhook com retry
// ============================================================================
function enviarWebhookComRetry(payload) {
  let lastError = null;
  
  for (let tentativa = 1; tentativa <= CONFIG.MAX_RETRIES; tentativa++) {
    try {
      Logger.log(`🔄 Tentativa ${tentativa}/${CONFIG.MAX_RETRIES}`);
      
      const options = {
        method: 'post',
        contentType: 'application/json',
        payload: JSON.stringify(payload),
        muteHttpExceptions: true,
        timeout: CONFIG.TIMEOUT_MS / 1000
      };
      
      const response = UrlFetchApp.fetch(CONFIG.WEBHOOK_URL, options);
      const responseCode = response.getResponseCode();
      const responseText = response.getContentText();
      
      Logger.log(`📡 Resposta: ${responseCode}`);
      
      if (responseCode >= 200 && responseCode < 300) {
        Logger.log(`✅ Webhook enviado com sucesso!`);
        return true;
      }
      
      if (responseCode >= 500 || responseCode === 429) {
        lastError = `Código ${responseCode}`;
        Logger.log(`⚠️ Erro temporário, tentando novamente...`);
        
        if (tentativa < CONFIG.MAX_RETRIES) {
          Utilities.sleep(CONFIG.RETRY_DELAY_MS * tentativa);
          continue;
        }
      } else {
        Logger.log(`❌ Erro não recuperável: ${responseCode} - ${responseText}`);
        return false;
      }
      
    } catch (error) {
      lastError = error.message;
      Logger.log(`❌ Erro na tentativa ${tentativa}: ${error.message}`);
      
      if (tentativa < CONFIG.MAX_RETRIES) {
        Utilities.sleep(CONFIG.RETRY_DELAY_MS * tentativa);
      }
    }
  }
  
  Logger.log(`❌ Falha após ${CONFIG.MAX_RETRIES} tentativas. Último erro: ${lastError}`);
  return false;
}

// ============================================================================
// FUNÇÃO: Atualizar timestamp no controle
// ============================================================================
function atualizarControleTimestamp() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const controleSheet = ss.getSheetByName('controle') || ss.getSheetByName('Controle');
    
    if (!controleSheet) {
      Logger.log('⚠️ Aba "controle" não encontrada');
      return;
    }
    
    const timestamp = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'HH:mm:ss');
    controleSheet.getRange('B1').setValue(timestamp);
    Logger.log(`✅ Timestamp atualizado: ${timestamp}`);
    
  } catch (error) {
    Logger.log(`❌ Erro ao atualizar controle: ${error.message}`);
  }
}

// ============================================================================
// FUNÇÃO DE TESTE MANUAL
// ============================================================================
function testarWebhook() {
  const payload = {
    aba: 'TESTE',
    linha: 2,
    coluna: 1,
    fornecedor: 'FORNECEDOR TESTE',
    categoria: 'IPH',
    modelo: 'IPHONE 16 PRO MAX',
    gb: '256GB',
    regiao: 'USA',
    cor: 'BLACK',
    preco: 7500,
    venda: 0,
    atualizadoEm: new Date().toISOString(),
    timestamp: Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'HH:mm:ss'),
    tipoMudanca: 'MANUAL_TEST'
  };
  
  Logger.log('🧪 Executando teste manual do webhook...');
  const success = enviarWebhookComRetry(payload);
  Logger.log(success ? '✅ Teste concluído com sucesso!' : '❌ Teste falhou');
}
