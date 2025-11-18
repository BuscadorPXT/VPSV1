# 🎯 GUIA COMPLETO - APPS SCRIPT BUSCADOR PXT

**Data:** 17/11/2025
**Objetivo:** Configurar sistema de sincronização automática Google Sheets → BuscadorPXT

---

## 📋 ÍNDICE

1. [O Problema Atual](#o-problema-atual)
2. [Como Funciona AGORA](#como-funciona-agora)
3. [O Que Precisa MUDAR](#o-que-precisa-mudar)
4. [Passo a Passo COMPLETO](#passo-a-passo-completo)
5. [Códigos Atualizados](#códigos-atualizados)
6. [Como Testar](#como-testar)
7. [Troubleshooting](#troubleshooting)

---

## 🔴 O PROBLEMA ATUAL

### Situação:
1. ✅ Você cola dados em `ENTRADA_JONATHAN` ou `ENTRADA_CAROL`
2. ✅ Scripts validam os dados
3. ✅ Dados validados vão para aba `17-11` (aba do dia)
4. ❌ **MAS o BuscadorPXT NÃO é notificado!**
5. ❌ Sistema continua mostrando dados antigos por até 15 minutos

### Por que acontece?

Quando um **script copia dados** para a aba do dia, o trigger `onEdit` **NÃO dispara** automaticamente (limitação do Google Apps Script). O webhook só funciona com edições **manuais** do usuário.

---

## ⚙️ COMO FUNCIONA AGORA

### Arquitetura Atual:

```
┌─────────────────────────────────────────────────────────────────┐
│ FLUXO ATUAL (SEM NOTIFICAÇÃO AUTOMÁTICA)                       │
└─────────────────────────────────────────────────────────────────┘

1. Você cola dados em ENTRADA_JONATHAN/ENTRADA_CAROL
          ↓
2. Função processarEAtualizarBase() executa:
   - Valida fornecedores, modelos, cores
   - Copia dados para aba "17-11"
          ↓
3. ❌ Webhook NÃO é chamado (script não dispara onEdit)
          ↓
4. BuscadorPXT continua com cache antigo
          ↓
5. Espera 15 minutos até cache expirar
          ↓
6. Dados finalmente aparecem no sistema
```

### Seus Códigos Atuais:

| Arquivo | O que faz | Quando roda |
|---------|-----------|-------------|
| **codigo.md** | Trigger `onEdit` - Envia webhook quando VOCÊ edita manualmente | Edição manual em qualquer aba |
| **Substituir + Time Stamp.md** | Processa ENTRADA_* → aba do dia | Menu "Processar Meus Dados" OU trigger onChange |
| **Validar cor, modelo, fornecedor.md** | Valida e corrige dados antes de copiar | Chamado por "Substituir + Time Stamp" |

---

## 🎯 O QUE PRECISA MUDAR

### Solução Simples:

**Adicionar 3 linhas de código** na função `processarEAtualizarBase()` para chamar o webhook MANUALMENTE após copiar os dados.

### Mudanças Necessárias:

1. ✅ **NO ARQUIVO**: `Substituir + Time Stamp.md`
   - Adicionar chamada de webhook após copiar dados
   - Notificar BuscadorPXT que dados foram atualizados

2. ✅ **NO ARQUIVO**: `codigo.md`
   - Transformar função de webhook em reutilizável
   - Permitir que outros scripts a chamem

3. ❌ **NENHUM arquivo novo precisa ser criado!**

---

## 🚀 PASSO A PASSO COMPLETO

### PASSO 1: Abrir Google Apps Script

1. Abra sua planilha do Google Sheets
2. Vá em: **Extensões → Apps Script**
3. Você verá todos os seus arquivos de código

### PASSO 2: Verificar Arquivos Existentes

Você deve ter pelo menos estes arquivos:

```
Apps Script
├── Código.gs (ou similar) - webhook e onEdit
├── Substituir.gs (ou similar) - processarEAtualizarBase
└── Validar.gs (ou similar) - validações
```

Se tiver nomes diferentes, anote os nomes!

### PASSO 3: Modificar Arquivo de Webhook (codigo.md)

**LOCALIZE** a função `enviarWebhookComRetry` no seu código principal e **NÃO MUDE NADA** nela!

Ela já está perfeita! Apenas certifique-se de que está no código:

```javascript
// ✅ ESTA FUNÇÃO JÁ EXISTE - NÃO PRECISA MUDAR
function enviarWebhookComRetry(payload) {
  // ... código existente ...
}
```

### PASSO 4: Modificar Arquivo "Substituir + Time Stamp"

**LOCALIZE** a função `processarEAtualizarBase(nomeDaAba)`

**ADICIONE** estas 3 linhas **ANTES** de limpar a aba de entrada (linha ~85):

```javascript
function processarEAtualizarBase(nomeDaAba) {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(30000)) {
    SpreadsheetApp.getUi().alert("Outro usuário está atualizando...");
    return;
  }

  try {
    // ... TODO O CÓDIGO EXISTENTE ATÉ A LINHA 85 ...

    // ✨✨✨ ADICIONE ESTAS LINHAS AQUI (DEPOIS DE SALVAR NA ABA DO DIA) ✨✨✨

    // Notificar o BuscadorPXT via webhook
    Logger.log(`📡 Notificando BuscadorPXT sobre atualização da aba "${hoje}"...`);
    const payloadNotificacao = {
      sheetName: hoje,
      eventType: 'batch_update',
      productsCount: newBase.length,
      timestamp: new Date().toISOString(),
      source: 'validation_script',
      userAba: nomeDaAba
    };

    const webhookSucesso = enviarWebhookComRetry(payloadNotificacao);
    if (webhookSucesso) {
      Logger.log(`✅ BuscadorPXT notificado com sucesso!`);
    } else {
      Logger.log(`⚠️ Falha ao notificar BuscadorPXT, mas dados foram salvos.`);
    }

    // ✨✨✨ FIM DAS LINHAS NOVAS ✨✨✨

    // Limpeza final da aba de entrada correta
    abaEntrada.getRange(2, 1, entradaLastRow - 1, 7).clearContent();
    Logger.log(`✅ Aba ${nomeDaAba} limpa.`);
    ss.toast("Seus dados foram processados com sucesso!");

  } catch (e) {
    // ... resto do código ...
  }
}
```

### PASSO 5: Salvar e Testar

1. **Salvar**: Clique em 💾 ou Ctrl+S
2. **Testar**: Execute a função pelo menu da planilha
3. **Ver logs**: Apps Script → Ver → Logs (Ctrl+Enter)

---

## 💻 CÓDIGOS ATUALIZADOS COMPLETOS

### 📄 ARQUIVO 1: Código Principal (codigo.md)

**STATUS**: ✅ Já está perfeito, não precisa mudar!

Este arquivo contém:
- `onEdit()` - Detecta edições manuais
- `enviarWebhookComRetry()` - Envia webhook (já reutilizável!)
- `processarPreco()` - Formata preços
- `atualizarControleTimestamp()` - Atualiza controle

### 📄 ARQUIVO 2: Substituir + Time Stamp (MODIFICADO)

```javascript
/**
 * ✨ VERSÃO ATUALIZADA COM WEBHOOK AUTOMÁTICO ✨
 * Função principal MODIFICADA para processar uma aba de entrada específica
 * e notificar o BuscadorPXT automaticamente.
 */
function processarEAtualizarBase(nomeDaAba) {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(30000)) {
    SpreadsheetApp.getUi().alert("Outro usuário está atualizando a base de dados no momento. Por favor, tente novamente em um minuto.");
    return;
  }

  try {
    processarValidacoesNaEntrada(nomeDaAba);
    const ss = SpreadsheetApp.getActiveSpreadsheet();
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

    const hoje = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "dd-MM");
    let abaDiaria = ss.getSheetByName(hoje);

    if (!abaDiaria) {
      abaDiaria = ss.insertSheet(hoje);
      abaDiaria.appendRow(["FORNECEDOR", "CAT", "MODELO", "GB", "REGIÃO", "COR", "PREÇO", "TIMESTAMP"]);
      Logger.log("✅ Aba criada: " + hoje);
    }

    const timestamp = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "HH:mm:ss");
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

    // ✨✨✨ CÓDIGO NOVO - NOTIFICAÇÃO DO WEBHOOK ✨✨✨
    Logger.log(`📡 Notificando BuscadorPXT sobre atualização da aba "${hoje}"...`);

    const payloadNotificacao = {
      sheetName: hoje,
      eventType: 'batch_update',
      productsCount: newBase.length,
      timestamp: new Date().toISOString(),
      source: 'validation_script',
      userAba: nomeDaAba
    };

    try {
      const webhookSucesso = enviarWebhookComRetry(payloadNotificacao);
      if (webhookSucesso) {
        Logger.log(`✅ BuscadorPXT notificado com sucesso sobre ${newBase.length} produtos!`);
        atualizarControleTimestamp(); // Atualiza timestamp de controle
      } else {
        Logger.log(`⚠️ Falha ao notificar BuscadorPXT, mas dados foram salvos na aba.`);
        Logger.log(`ℹ️ Os dados aparecerão no sistema em até 15 minutos (expiração do cache).`);
      }
    } catch (webhookError) {
      Logger.log(`⚠️ Erro ao chamar webhook: ${webhookError.message}`);
      Logger.log(`ℹ️ Dados foram salvos, mas notificação falhou.`);
    }
    // ✨✨✨ FIM DO CÓDIGO NOVO ✨✨✨

    // Limpeza final da aba de entrada
    abaEntrada.getRange(2, 1, entradaLastRow - 1, 7).clearContent();
    Logger.log(`✅ Aba ${nomeDaAba} limpa.`);
    ss.toast("Seus dados foram processados e o BuscadorPXT foi notificado!");

  } catch (e) {
    Logger.log(`❌ ERRO CATASTRÓFICO: ${e.name} - ${e.message}. Stack: ${e.stack}`);
    SpreadsheetApp.getUi().alert("Ocorreu um erro crítico durante a atualização. Verifique os logs.");
  } finally {
    lock.releaseLock();
  }
}

// ============================================================================
// RESTANTE DO CÓDIGO PERMANECE IGUAL
// ============================================================================

const MAPA_DE_USUARIOS = {
  "vini.codmw@gmail.com": "ENTRADA_VINICIUS",
  "pedatlanta@gmail.com": "ENTRADA_JONATHAN"
  // Adicione: "carol@email.com": "ENTRADA_CAROL"
};

function processarMinhaEntrada() {
  const userEmail = Session.getActiveUser().getEmail();
  const nomeAba = MAPA_DE_USUARIOS[userEmail];

  if (nomeAba) {
    processarEAtualizarBase(nomeAba);
  } else {
    SpreadsheetApp.getUi().alert("Você não tem uma aba de entrada configurada. Por favor, contate o administrador.");
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

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('⚙️ BUSCADOR')
    .addItem('Processar Meus Dados', 'processarMinhaEntrada')
    .addToUi();
}

function disparadorOnChange(e) {
  const planilha = e.source;
  const abaAlterada = planilha.getActiveSheet();
  const nomeDaAba = abaAlterada.getName();

  Logger.log(`--- INÍCIO DA EXECUÇÃO DO GATILHO ---`);
  Logger.log(`Tipo de Mudança Detectada: ${e.changeType}`);
  Logger.log(`Nome da Aba Alterada: "${nomeDaAba}"`);

  if (e.changeType === 'OTHER' || e.changeType === 'EDIT') {
    if (nomeDaAba.startsWith("ENTRADA_")) {
      Logger.log(`CONDIÇÕES ATENDIDAS. Iniciando processarEAtualizarBase()...`);
      processarEAtualizarBase(nomeDaAba);
    } else {
      Logger.log(`AVISO: A aba "${nomeDaAba}" não começa com "ENTRADA_", processo ignorado.`);
    }
  } else {
    Logger.log(`AVISO: O tipo de mudança "${e.changeType}" não é 'OTHER', processo ignorado.`);
  }
  Logger.log(`--- FIM DA EXECUÇÃO DO GATILHO ---`);
}
```

### 📄 ARQUIVO 3: Validar (validacoes.md)

**STATUS**: ✅ Já está perfeito, não precisa mudar!

Este arquivo contém:
- `processarValidacoesNaEntrada()` - Função principal
- `validarECorrigirFornecedores()` - Valida nomes
- `validarModeloEGB()` - Valida modelos
- `validarECorrigirCores()` - Valida cores
- `gravarLog()` - Grava correções

---

## ✅ COMO TESTAR

### Teste 1: Verificar se funções existem

1. Apps Script → Selecione função: `enviarWebhookComRetry`
2. Se aparecer na lista = ✅ Está OK
3. Se NÃO aparecer = ❌ Copie do `codigo.md` completo

### Teste 2: Processar dados manualmente

1. Cole alguns dados em `ENTRADA_JONATHAN`
2. Menu planilha: `⚙️ BUSCADOR → Processar Meus Dados`
3. Aguarde 5-10 segundos
4. Verifique logs: Apps Script → Ver → Logs (Ctrl+Enter)

**Logs esperados:**
```
📡 Notificando BuscadorPXT sobre atualização da aba "17-11"...
🔄 Tentativa 1/3 - Enviando webhook...
📡 Webhook resposta: 200 - {"success":true,...}
✅ Webhook enviado com sucesso na tentativa 1
✅ BuscadorPXT notificado com sucesso sobre 50 produtos!
📅 Timestamp atualizado na aba controle
✅ Aba ENTRADA_JONATHAN limpa.
```

### Teste 3: Verificar no BuscadorPXT

1. Abra o dashboard: https://buscadorpxt.com.br
2. Aguarde 5-10 segundos
3. Dados devem aparecer automaticamente! ✅

---

## 🔧 TROUBLESHOOTING

### Problema 1: "enviarWebhookComRetry is not defined"

**Solução:**
1. Abra o arquivo principal (codigo.md)
2. Verifique se a função `enviarWebhookComRetry` está lá
3. Se não estiver, copie do código fornecido acima

### Problema 2: Webhook retorna erro 500

**Logs mostram:**
```
📡 Webhook resposta: 500 - Internal Server Error
```

**Solução:**
1. Verifique se o servidor está online
2. Teste manualmente: `pm2 status` no servidor
3. Verifique logs do servidor: `pm2 logs buscadorpxt`

### Problema 3: Dados não aparecem no BuscadorPXT

**Checklist:**
- [ ] Webhook retornou 200? (veja logs)
- [ ] Dados estão na aba `17-11`? (aba do dia correto)
- [ ] Nome da aba está no formato DD-MM?
- [ ] Aguardou 10 segundos?
- [ ] Cache do navegador limpo? (Ctrl+F5)

### Problema 4: "Outro usuário está atualizando"

**Causa:** Lock ativo há mais de 30 segundos

**Solução:**
1. Aguarde 1 minuto
2. Tente novamente
3. Se persistir, abra Apps Script → Execuções
4. Cancele execuções travadas

---

## 📊 DIAGRAMA FINAL DO FLUXO

```
┌─────────────────────────────────────────────────────────────────┐
│ FLUXO NOVO (COM NOTIFICAÇÃO AUTOMÁTICA) ✅                     │
└─────────────────────────────────────────────────────────────────┘

1. Você cola dados em ENTRADA_JONATHAN/ENTRADA_CAROL
          ↓
2. Clica em "⚙️ BUSCADOR → Processar Meus Dados"
          ↓
3. Script processa:
   ✅ Valida fornecedores (Validar.gs)
   ✅ Valida modelos e GB (Validar.gs)
   ✅ Valida cores (Validar.gs)
   ✅ Copia para aba "17-11" (Substituir.gs)
          ↓
4. ✨ Script CHAMA webhook manualmente (NOVO!)
   → enviarWebhookComRetry({ sheetName: "17-11", ... })
          ↓
5. Backend BuscadorPXT recebe notificação:
   ✅ Limpa cache
   ✅ Busca dados frescos
   ✅ Broadcast via WebSocket
          ↓
6. Dashboard atualiza em 5-10 segundos! 🎉
```

---

## 🎯 RESUMO DO QUE FAZER

### APENAS 1 ARQUIVO PRECISA SER MODIFICADO:

**Arquivo:** `Substituir + Time Stamp.md` (ou nome que você deu)

**Mudança:** Adicionar ~15 linhas na função `processarEAtualizarBase()`

**Localização:** Depois de salvar dados na aba do dia, ANTES de limpar aba de entrada

**Linhas a adicionar:**
```javascript
// Notificar BuscadorPXT
Logger.log(`📡 Notificando BuscadorPXT...`);
const payload = { sheetName: hoje, eventType: 'batch_update', ... };
const sucesso = enviarWebhookComRetry(payload);
if (sucesso) {
  Logger.log(`✅ Notificado!`);
  atualizarControleTimestamp();
}
```

### NENHUM ARQUIVO NOVO NECESSÁRIO!

Todos os códigos que você precisa já existem. Só precisa **conectá-los**.

---

## 📞 SUPORTE

Se tiver dúvidas:

1. **Ver logs:** Apps Script → Ver → Logs (Ctrl+Enter)
2. **Ver execuções:** Apps Script → Execuções
3. **Testar webhook:** Use a função `testarWebhook()` do codigo.md
4. **Ver logs servidor:** `pm2 logs buscadorpxt --lines 100`

---

**Última atualização:** 17/11/2025
**Versão do guia:** 1.0
**Status:** ✅ Pronto para implementar
