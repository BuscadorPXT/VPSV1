# 📋 CÓDIGO PARA COPIAR E COLAR

**ATENÇÃO:** Cole este código exatamente onde indicado!

---

## 🎯 ONDE COLAR ESTE CÓDIGO

**Arquivo:** Seu arquivo que contém `processarEAtualizarBase(nomeDaAba)`

**Localização:** Dentro da função, DEPOIS de salvar na aba do dia, ANTES de limpar a aba de entrada

---

## 📝 CÓDIGO COMPLETO PARA COPIAR

```javascript
// ============================================================================
// ✨ ADICIONE ESTAS LINHAS NA SUA FUNÇÃO processarEAtualizarBase() ✨
// ============================================================================
// Cole DEPOIS desta linha:
//     abaDiaria.getRange(2, 1, newBase.length, 8).setValues(newBase);
// e ANTES desta linha:
//     abaEntrada.getRange(2, 1, entradaLastRow - 1, 7).clearContent();
// ============================================================================

    // ✨✨✨ INÍCIO DO CÓDIGO NOVO ✨✨✨

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
```

---

## 🔍 EXEMPLO VISUAL - ANTES E DEPOIS

### ANTES (Seu código atual):

```javascript
function processarEAtualizarBase(nomeDaAba) {
  try {
    // ... código de validação ...

    // Salvar dados na aba do dia
    if (newBase.length > 0) {
      abaDiaria.getRange(2, 1, newBase.length, 8).setValues(newBase);
      Logger.log(`✅ Base de dados atualizada com ${newBase.length} registros.`);
    }

    // ❌ AQUI NÃO TEM NOTIFICAÇÃO DO WEBHOOK

    // Limpar aba de entrada
    abaEntrada.getRange(2, 1, entradaLastRow - 1, 7).clearContent();
    Logger.log(`✅ Aba ${nomeDaAba} limpa.`);

  } catch (e) {
    // ... tratamento de erro ...
  }
}
```

### DEPOIS (Com notificação):

```javascript
function processarEAtualizarBase(nomeDaAba) {
  try {
    // ... código de validação ...

    // Salvar dados na aba do dia
    if (newBase.length > 0) {
      abaDiaria.getRange(2, 1, newBase.length, 8).setValues(newBase);
      Logger.log(`✅ Base de dados atualizada com ${newBase.length} registros.`);
    }

    // ✅✅✅ CÓDIGO NOVO - NOTIFICAÇÃO DO WEBHOOK ✅✅✅
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
        Logger.log(`✅ BuscadorPXT notificado com sucesso!`);
        atualizarControleTimestamp();
      } else {
        Logger.log(`⚠️ Falha ao notificar, mas dados foram salvos.`);
      }
    } catch (webhookError) {
      Logger.log(`⚠️ Erro ao chamar webhook: ${webhookError.message}`);
    }
    // ✅✅✅ FIM DO CÓDIGO NOVO ✅✅✅

    // Limpar aba de entrada
    abaEntrada.getRange(2, 1, entradaLastRow - 1, 7).clearContent();
    Logger.log(`✅ Aba ${nomeDaAba} limpa.`);

  } catch (e) {
    // ... tratamento de erro ...
  }
}
```

---

## ✅ CHECKLIST DE IMPLEMENTAÇÃO

Marque conforme for fazendo:

- [ ] 1. Abri Google Apps Script da planilha
- [ ] 2. Localizei o arquivo com `processarEAtualizarBase()`
- [ ] 3. Encontrei a linha que salva dados: `abaDiaria.getRange(...).setValues(newBase)`
- [ ] 4. Copiei o código novo (do quadro acima)
- [ ] 5. Colei DEPOIS de salvar e ANTES de limpar
- [ ] 6. Salvei o arquivo (💾 ou Ctrl+S)
- [ ] 7. Testei a função
- [ ] 8. Vi nos logs: "✅ BuscadorPXT notificado com sucesso!"
- [ ] 9. Verifiquei no dashboard que dados apareceram

---

## 🧪 CÓDIGO DE TESTE (OPCIONAL)

Se quiser testar o webhook isoladamente ANTES de modificar seu código:

```javascript
/**
 * Função de teste - Execute para testar webhook isoladamente
 */
function testarWebhookIsolado() {
  Logger.log('🧪 Testando webhook...');

  const hoje = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "dd-MM");

  const payloadTeste = {
    sheetName: hoje,
    eventType: 'test',
    productsCount: 999,
    timestamp: new Date().toISOString(),
    source: 'manual_test'
  };

  Logger.log('📦 Payload: ' + JSON.stringify(payloadTeste));

  const sucesso = enviarWebhookComRetry(payloadTeste);

  if (sucesso) {
    Logger.log('✅ Teste de webhook PASSOU!');
    Logger.log('✅ Pode adicionar o código na função principal!');
  } else {
    Logger.log('❌ Teste de webhook FALHOU!');
    Logger.log('❌ Verifique se função enviarWebhookComRetry existe');
  }
}
```

**Como usar:**
1. Cole esta função no seu Apps Script
2. Execute: Selecione `testarWebhookIsolado` → Executar
3. Veja logs: View → Logs (Ctrl+Enter)
4. Se passar ✅ = Pode adicionar na função principal
5. Se falhar ❌ = Verifique se `enviarWebhookComRetry` existe

---

## 🆘 SE DER ERRO

### Erro: "enviarWebhookComRetry is not defined"

**Significa:** A função de webhook não está no seu código

**Solução:** Adicione esta função em qualquer lugar do seu arquivo principal:

```javascript
// ============================================================================
// FUNÇÃO: Enviar webhook com retry automático
// ============================================================================
function enviarWebhookComRetry(payload) {
  const CONFIG = {
    WEBHOOK_URL: 'https://buscadorpxt.com.br/api/webhook/sheets-update',
    MAX_RETRIES: 3,
    RETRY_DELAY_MS: 1000,
    TIMEOUT_MS: 10000
  };

  let lastError = null;

  for (let tentativa = 1; tentativa <= CONFIG.MAX_RETRIES; tentativa++) {
    try {
      Logger.log(`🔄 Tentativa ${tentativa}/${CONFIG.MAX_RETRIES} - Enviando webhook...`);

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

      Logger.log(`📡 Webhook resposta: ${responseCode} - ${responseText}`);

      if (responseCode >= 200 && responseCode < 300) {
        Logger.log(`✅ Webhook enviado com sucesso na tentativa ${tentativa}`);
        return true;
      }

      if (responseCode >= 500 || responseCode === 429) {
        lastError = `Código ${responseCode}: ${responseText}`;
        Logger.log(`⚠️ Erro temporário (${responseCode}), tentando novamente...`);

        if (tentativa < CONFIG.MAX_RETRIES) {
          const delay = CONFIG.RETRY_DELAY_MS * tentativa;
          Logger.log(`⏳ Aguardando ${delay}ms antes da próxima tentativa...`);
          Utilities.sleep(delay);
          continue;
        }
      }

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
```

---

## 📞 SUPORTE RÁPIDO

### Logs para verificar se funcionou:

✅ **Sucesso:**
```
📡 Notificando BuscadorPXT sobre atualização da aba "17-11"...
🔄 Tentativa 1/3 - Enviando webhook...
📡 Webhook resposta: 200 - {"success":true,...}
✅ Webhook enviado com sucesso na tentativa 1
✅ BuscadorPXT notificado com sucesso sobre 50 produtos!
```

❌ **Erro:**
```
📡 Notificando BuscadorPXT sobre atualização da aba "17-11"...
❌ Erro: enviarWebhookComRetry is not defined
```
→ **Solução:** Adicione a função `enviarWebhookComRetry` (código acima)

---

**Dúvidas?** Releia o `GUIA_COMPLETO_APPS_SCRIPT.md`

**Pronto!** Agora você tem tudo para implementar! 🚀
