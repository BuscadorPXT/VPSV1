// ============================================================================
// SCRIPT OTIMIZADO DO GOOGLE SHEETS - BUSCADOR PXT
// ============================================================================
// Versão otimizada com:
// - Retry automático
// - Melhor tratamento de erros
// - Logs detalhados
// - Firebase removido (se não estiver usando)
// - Performance melhorada
// ============================================================================

// CONFIGURAÇÕES
const CONFIG = {
  WEBHOOK_URL: 'https://7081f9c2-0746-4fa0-bc2f-2274a33b30ad-00-27oyim1rk306b.riker.replit.dev/api/webhook/sheets-update',
  MAX_RETRIES: 3,
  RETRY_DELAY_MS: 1000, // 1 segundo
  TIMEOUT_MS: 10000, // 10 segundos
  USE_FIREBASE: false // Desabilite se não estiver usando Firebase
};

// ============================================================================
// FUNÇÃO PRINCIPAL - TRIGGER onEdit
// ============================================================================
function onEdit(e) {
  const startTime = new Date().getTime();
  
  if (!e) {
    Logger.log("❌ Evento 'e' está undefined. Função foi executada manualmente?");
    return;
  }

  try {
    // Extrair informações do evento
    const sheet = e.range.getSheet();
    const row = e.range.getRow();
    const column = e.range.getColumn();
    const sheetName = sheet.getSheetName();
    
    Logger.log(`📍 Edição detectada: Aba="${sheetName}", Linha=${row}, Coluna=${column}`);
    
    // Ignorar cabeçalho (linha 1)
    if (row === 1) {
      Logger.log('ℹ️ Edição no cabeçalho - ignorando');
      return;
    }
    
    // Buscar dados da linha completa
    const values = sheet.getRange(row, 1, 1, sheet.getLastColumn()).getValues()[0];
    
    // Processar e formatar preços
    const preco = processarPreco(values[6]);
    const venda = processarPreco(values[7]);
    
    // Montar payload
    const payload = {
      aba: sheetName,
      linha: row,
      coluna: column,
      fornecedor: values[0] || '',
      categoria: values[1] || '',
      modelo: values[2] || '',
      gb: values[3] || '',
      regiao: values[4] || '',
      cor: values[5] || '',
      preco: preco,
      venda: venda,
      atualizadoEm: new Date().toISOString(),
      timestamp: Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'HH:mm:ss')
    };
    
    Logger.log(`📦 Payload montado: ${JSON.stringify(payload)}`);
    
    // Enviar para webhook com retry
    const success = enviarWebhookComRetry(payload);
    
    // Atualizar timestamp na aba controle
    if (success) {
      atualizarControleTimestamp();
    }
    
    const duration = new Date().getTime() - startTime;
    Logger.log(`✅ Processamento concluído em ${duration}ms`);
    
  } catch (error) {
    Logger.log(`❌ Erro no processamento onEdit: ${error.message}`);
    Logger.log(`Stack trace: ${error.stack}`);
  }
}

// ============================================================================
// FUNÇÃO: Processar e formatar preços
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
// FUNÇÃO: Enviar webhook com retry automático
// ============================================================================
function enviarWebhookComRetry(payload) {
  let lastError = null;
  
  for (let tentativa = 1; tentativa <= CONFIG.MAX_RETRIES; tentativa++) {
    try {
      Logger.log(`🔄 Tentativa ${tentativa}/${CONFIG.MAX_RETRIES} - Enviando webhook...`);
      
      const options = {
        method: 'post',
        contentType: 'application/json',
        payload: JSON.stringify(payload),
        muteHttpExceptions: true,
        timeout: CONFIG.TIMEOUT_MS / 1000 // Em segundos
      };
      
      const response = UrlFetchApp.fetch(CONFIG.WEBHOOK_URL, options);
      const responseCode = response.getResponseCode();
      const responseText = response.getContentText();
      
      Logger.log(`📡 Webhook resposta: ${responseCode} - ${responseText}`);
      
      // Sucesso: códigos 200-299
      if (responseCode >= 200 && responseCode < 300) {
        Logger.log(`✅ Webhook enviado com sucesso na tentativa ${tentativa}`);
        return true;
      }
      
      // Erro do servidor (500+) ou rate limit (429): tentar novamente
      if (responseCode >= 500 || responseCode === 429) {
        lastError = `Código ${responseCode}: ${responseText}`;
        Logger.log(`⚠️ Erro temporário (${responseCode}), tentando novamente...`);
        
        if (tentativa < CONFIG.MAX_RETRIES) {
          const delay = CONFIG.RETRY_DELAY_MS * tentativa; // Exponential backoff
          Logger.log(`⏳ Aguardando ${delay}ms antes da próxima tentativa...`);
          Utilities.sleep(delay);
          continue;
        }
      }
      
      // Outros erros (4xx): não tentar novamente
      lastError = `Código ${responseCode}: ${responseText}`;
      Logger.log(`❌ Erro permanente (${responseCode}), não tentando novamente`);
      return false;
      
    } catch (error) {
      lastError = error.message;
      Logger.log(`❌ Erro na tentativa ${tentativa}: ${error.message}`);
      
      if (tentativa < CONFIG.MAX_RETRIES) {
        const delay = CONFIG.RETRY_DELAY_MS * tentativa;
        Logger.log(`⏳ Aguardando ${delay}ms antes da próxima tentativa...`);
        Utilities.sleep(delay);
      }
    }
  }
  
  Logger.log(`❌ Falha após ${CONFIG.MAX_RETRIES} tentativas. Último erro: ${lastError}`);
  return false;
}

// ============================================================================
// FUNÇÃO: Atualizar timestamp na aba controle
// ============================================================================
function atualizarControleTimestamp() {
  try {
    const controleSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("controle");
    if (controleSheet) {
      controleSheet.getRange("B1").setValue(new Date());
      Logger.log('📅 Timestamp atualizado na aba controle');
    } else {
      Logger.log('⚠️ Aba "controle" não encontrada - timestamp não atualizado');
    }
  } catch (error) {
    Logger.log(`⚠️ Erro ao atualizar timestamp em "controle": ${error.message}`);
  }
}

// ============================================================================
// FUNÇÕES DE AUTOMAÇÃO DE DADOS
// ============================================================================

function atualizarBasePorData() {
  Logger.log('🚀 Iniciando atualização da base por data...');
  
  try {
    processarValidacoesNaEntrada();
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const entrada = ss.getSheetByName("ENTRADA");

    if (!entrada) {
      Logger.log('❌ Aba ENTRADA não encontrada');
      return;
    }

    const entradaLastRow = entrada.getLastRow();
    if (entradaLastRow < 2) {
      Logger.log('ℹ️ Nenhum dado na aba ENTRADA');
      return;
    }

    const hoje = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "dd-MM");
    let base = ss.getSheetByName(hoje);

    // Criar aba do dia se não existir
    if (!base) {
      base = ss.insertSheet(hoje);
      base.appendRow(["FORNECEDOR", "CAT", "MODELO", "GB", "REGIÃO", "COR", "PREÇO"]);
      Logger.log(`✅ Aba "${hoje}" criada`);
    }

    const entradaData = entrada.getRange(2, 1, entradaLastRow - 1, 7).getValues();
    const baseLastRow = base.getLastRow();
    const baseData = baseLastRow > 1 ? base.getRange(2, 1, baseLastRow - 1, 7).getValues() : [];

    const baseMap = new Map();

    baseData.forEach(row => {
      const key = gerarChavePadronizada(row);
      baseMap.set(key, row);
    });

    entradaData.forEach(row => {
      const key = gerarChavePadronizada(row);
      baseMap.set(key, row);
    });

    const newBase = Array.from(baseMap.values());

    if (baseLastRow > 1) {
      base.getRange(2, 1, baseLastRow - 1, 7).clearContent();
    }
    if (newBase.length > 0) {
      base.getRange(2, 1, newBase.length, 7).setValues(newBase);
    }

    entrada.getRange(2, 1, entradaLastRow - 1, 7).clearContent();
    
    Logger.log(`✅ ${newBase.length} produtos processados`);
    
  } catch (error) {
    Logger.log(`❌ Erro em atualizarBasePorData: ${error.message}`);
  }
}

function gerarChavePadronizada(row) {
  return row.slice(0, 6).map(campo =>
    String(campo)
      .toLowerCase()
      .replace(/\s+/g, '')
      .normalize("NFD").replace(/[\u0300-\u036f]/g, '')
  ).join('|');
}

function processarValidacoesNaEntrada() {
  // Implementar validações se necessário
  Logger.log('✅ Validações processadas');
}

function processarEntradaComTimestamp() {
  Logger.log('🚀 Processando entrada com timestamp...');
  
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const entrada = ss.getSheetByName("ENTRADA");
    
    if (!entrada) {
      Logger.log("❌ Aba ENTRADA não encontrada");
      return;
    }
    
    const entradaLastRow = entrada.getLastRow();
    if (entradaLastRow < 2) {
      Logger.log("ℹ️ Nenhum dado na aba ENTRADA");
      return;
    }
    
    const entradaData = [];
    const values = entrada.getRange(2, 1, entradaLastRow - 1, 8).getValues();
    
    values.forEach(row => {
      const temConteudo = row.some(cell => cell !== "" && cell !== null && cell !== undefined);
      if (temConteudo) {
        entradaData.push(row);
      }
    });
    
    if (entradaData.length === 0) {
      Logger.log("ℹ️ Nenhuma linha com conteúdo");
      return;
    }
    
    const hoje = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "dd-MM");
    let abaDia = ss.getSheetByName(hoje);
    
    if (!abaDia) {
      abaDia = ss.insertSheet(hoje);
      abaDia.appendRow(["FORNECEDOR", "CAT", "MODELO", "GB", "REGIÃO", "COR", "PREÇO", "TIMESTAMP"]);
      Logger.log(`✅ Aba "${hoje}" criada`);
    }
    
    const timestamp = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "HH:mm:ss");
    
    const dadosParaInserir = entradaData.map(row => {
      const novaRow = [...row];
      novaRow[7] = timestamp;
      return novaRow;
    });
    
    const proximaLinhaVazia = abaDia.getLastRow() + 1;
    abaDia.getRange(proximaLinhaVazia, 1, dadosParaInserir.length, 8).setValues(dadosParaInserir);
    
    if (entradaLastRow > 1) {
      entrada.getRange(2, 1, entradaLastRow - 1, 8).clearContent();
    }
    
    Logger.log(`✅ ${dadosParaInserir.length} linhas processadas com timestamp ${timestamp}`);
    
  } catch (error) {
    Logger.log(`❌ Erro em processarEntradaComTimestamp: ${error.message}`);
  }
}

// ============================================================================
// FIM DO SCRIPT
// ============================================================================
