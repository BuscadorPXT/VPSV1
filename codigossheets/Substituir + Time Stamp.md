/**
 * Função principal MODIFICADA para processar uma aba de entrada específica.
 * Usa LockService para garantir que apenas uma instância rode por vez na etapa crítica.
 */
function processarEAtualizarBase(nomeDaAba) {
  const lock = LockService.getScriptLock();
  // Tenta obter o "lock" por 30 segundos. Se não conseguir, avisa o usuário.
  if (!lock.tryLock(30000)) {
    SpreadsheetApp.getUi().alert("Outro usuário está atualizando a base de dados no momento. Por favor, tente novamente em um minuto.");
    return;
  }

  try {
    processarValidacoesNaEntrada(nomeDaAba);
    // ---- 1. PREPARAÇÃO ----
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    // AQUI ESTÁ A MUDANÇA: Usamos o nome da aba que foi passado como parâmetro
    const abaEntrada = ss.getSheetByName(nomeDaAba); 
    
    if (!abaEntrada) {
      Logger.log(`❌ Aba ${nomeDaAba} não encontrada.`);
      SpreadsheetApp.getUi().alert(`Sua aba de entrada (${nomeDaAba}) não foi encontrada. Verifique o nome da aba.`);
      return;
    }

    const entradaLastRow = abaEntrada.getLastRow();
    if (entradaLastRow < 2) {
      Logger.log(`ℹ️ Nenhum dado na aba ${nomeDaAba} para processar.`);
      ss.toast("Nenhum dado encontrado na sua aba de entrada.");
      return;
    }

    // Primeiro, executa as validações na aba de entrada específica
    // (Esta função precisa ser ajustada também, veja o Passo 2)

    const hoje = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "dd-MM");
    let abaDiaria = ss.getSheetByName(hoje);

    if (!abaDiaria) {
      abaDiaria = ss.insertSheet(hoje);
      abaDiaria.appendRow(["FORNECEDOR", "CAT", "MODELO", "GB", "REGIÃO", "COR", "PREÇO", "TIMESTAMP"]);
      Logger.log("✅ Aba criada: " + hoje);
    }
    
    // ---- O RESTANTE DA LÓGICA PERMANECE IGUAL ----
    const timestamp = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "HH:mm:ss");
    // Lendo os dados da aba de entrada correta
    const dadosEntradaRaw = abaEntrada.getRange(2, 1, entradaLastRow - 1, 7).getValues();
    
    const dadosEntradaComTimestamp = dadosEntradaRaw.map(row => {
      return [row[0], row[1], row[2], row[3], row[4], row[5], row[6], timestamp];
    });

    const baseLastRow = abaDiaria.getLastRow();
    const dadosBase = baseLastRow > 1 ? abaDiaria.getRange(2, 1, baseLastRow - 1, 8).getValues() : [];

    const baseMap = new Map();
    dadosBase.forEach(row => {
      const key = gerarChavePadronizada(row);
      baseMap.set(key, row);
    });
    dadosEntradaComTimestamp.forEach(row => {
      const key = gerarChavePadronizada(row);
      baseMap.set(key, row);
    });

    const newBase = Array.from(baseMap.values());

    if (newBase.length > 0) {
      abaDiaria.getRange(2, 1, newBase.length, 8).setValues(newBase);
      Logger.log(`✅ Base de dados atualizada com ${newBase.length} registros.`);

      const oldNumRows = baseLastRow - 1;
      if (oldNumRows > newBase.length) {
        abaDiaria.getRange(2 + newBase.length, 1, oldNumRows - newBase.length, 8).clearContent();
        Logger.log(`🧹 Limpas ${oldNumRows - newBase.length} linhas excedentes.`);
      }
    } else {
      if (baseLastRow > 1) {
        abaDiaria.getRange(2, 1, baseLastRow - 1, 8).clearContent();
      }
      Logger.log("⚠️ A base consolidada resultou em 0 itens. A aba foi limpa.");
    }

    // Limpeza final da aba de entrada correta
    abaEntrada.getRange(2, 1, entradaLastRow - 1, 7).clearContent();
    Logger.log(`✅ Aba ${nomeDaAba} limpa.`);
    ss.toast("Seus dados foram processados com sucesso!");

  } catch (e) {
    Logger.log(`❌ ERRO CATASTRÓFICO: ${e.name} - ${e.message}. Stack: ${e.stack}`);
    SpreadsheetApp.getUi().alert("Ocorreu um erro crítico durante a atualização da base. Verifique os logs. Seus dados não foram perdidos.");
  } finally {
    // ---- IMPORTANTE: LIBERA O "LOCK" ----
    // Isso garante que, mesmo que ocorra um erro, o script será "destravado"
    // para que outros usuários possam executá-lo.
    lock.releaseLock();
  }
}
// MAPA DE USUÁRIOS E SUAS ABAS
const MAPA_DE_USUARIOS = {
  // Coloque aqui o email completo do usuário e o nome da aba correspondente
  "vini.codmw@gmail.com": "ENTRADA_VINICIUS",
  "pedatlanta@gmail.com": "ENTRADA_JONATHAN"
  // Adicione mais usuários conforme necessário
};

/**
 * Função que será chamada pelo menu.
 * Identifica o usuário e chama o processamento para a sua aba.
 */
function processarMinhaEntrada() {
  const userEmail = Session.getActiveUser().getEmail();
  const nomeAba = MAPA_DE_USUARIOS[userEmail];

  if (nomeAba) {
    processarEAtualizarBase(nomeAba);
  } else {
    SpreadsheetApp.getUi().alert("Você não tem uma aba de entrada configurada. Por favor, contate o administrador da planilha.");
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

/**
 * Função especial 'onOpen' que cria o menu personalizado na planilha
 * sempre que ela é aberta.
 */
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('⚙️ BUSCADOR')
    .addItem('Processar Meus Dados', 'processarMinhaEntrada')
    .addToUi();
}
/**
 * VERSÃO DE DEPURAÇÃO
 * Função a ser acionada pelo gatilho 'onChange'.
 * Inclui logs para diagnosticar por que a execução pode estar terminando silenciosamente.
 * @param {Object} e O objeto de evento passado pelo gatilho.
 */
function disparadorOnChange(e) {
  // --- INÍCIO DA DEPURAÇÃO ---
  // e.source nos dá a planilha exata que acionou o evento, é mais seguro que getActiveSpreadsheet()
  const planilha = e.source; 
  const abaAlterada = planilha.getActiveSheet();
  const nomeDaAba = abaAlterada.getName();
  
  // Log para vermos o que o gatilho está detectando
  Logger.log(`--- INÍCIO DA EXECUÇÃO DO GATILHO ---`);
  Logger.log(`Tipo de Mudança Detectada: ${e.changeType}`);
  Logger.log(`Nome da Aba Alterada: "${nomeDaAba}"`);
  // --- FIM DA DEPURAÇÃO ---

  if (e.changeType === 'OTHER' || e.changeType === 'EDIT') {
    if (nomeDaAba.startsWith("ENTRADA_")) {
      Logger.log(`CONDIÇÕES ATENDIDAS. Iniciando a função principal processarEAtualizarBase()...`);
      processarEAtualizarBase(nomeDaAba);
    } else {
      Logger.log(`AVISO: A aba "${nomeDaAba}" não começa com "ENTRADA_", então o processo foi ignorado.`);
    }
  } else {
    Logger.log(`AVISO: O tipo de mudança "${e.changeType}" não é 'OTHER', então o processo foi ignorado.`);
  }
  Logger.log(`--- FIM DA EXECUÇÃO DO GATILHO ---`);
}
