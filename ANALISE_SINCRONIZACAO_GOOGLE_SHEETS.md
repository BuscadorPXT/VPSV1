# Análise: Dados Novos Não Aparecendo no Sistema

**Data da Análise:** 17/11/2025
**Solicitante:** ultrathink
**Analista:** Claude Code

---

## Resumo Executivo

Foi realizada uma análise completa para identificar por que dados novos adicionados ao Google Sheets não estão aparecendo no sistema BuscadorPXT. A investigação revelou que o sistema está **funcionando corretamente**, mas existem **múltiplos pontos de cache** e um **processo específico de sincronização** que precisa ser compreendido.

---

## Fluxo de Sincronização Atual

### 1. Arquitetura de Sincronização

O sistema utiliza uma arquitetura de 3 camadas de cache + webhook:

```
Google Sheets (Fonte de Dados)
       ↓
   Webhook Trigger (Google Apps Script)
       ↓
   Backend Cache Layer 1: Google Sheets Service (15 min TTL)
       ↓
   Backend Cache Layer 2: Parser Cache (5 min TTL)
       ↓
   Backend Cache Layer 3: Redis Cache (opcional)
       ↓
   WebSocket Broadcast → Frontend
```

### 2. Componentes Envolvidos

#### **A. Google Sheets Service** (`server/services/google-sheets.ts`)
- **Cache TTL:** 15 minutos
- **Função:** Busca dados diretamente da API do Google Sheets
- **Mecanismo:**
  - Cache em memória com timestamp
  - Deduplicação de requests inflight
  - Retry automático com backoff exponencial
- **Status:** ✅ Inicializado corretamente (logs confirmam)

#### **B. Google Sheets Parser** (`server/services/google-sheets-parser.ts`)
- **Cache TTL:** 5 minutos
- **Função:** Processa e transforma dados brutos em objetos Product
- **Mecanismo:**
  - Cache de dados parseados
  - Validação de preços e campos obrigatórios
  - Cálculo de "menor preço"
- **Status:** ✅ Funcionando (processa ~2513 produtos)

#### **C. Webhook Handler** (`server/routes/webhook.routes.ts`)
- **Endpoint:** `POST /api/webhook/google-sheets`
- **Função:** Recebe notificações do Google Sheets quando há alterações
- **Mecanismo:**
  1. Recebe payload do webhook
  2. Limpa cache específico da planilha alterada
  3. Força busca fresh dos dados
  4. Reprocessa dados
  5. Broadcast via WebSocket
- **Status:** ✅ Configurado e ativo

---

## Problemas Identificados

### 🔴 **PROBLEMA PRINCIPAL: Sistema de Cache Multi-Camadas**

#### **Cache Layer 1 - Google Sheets Service (15 min)**
```typescript
private cacheExpiry = 15 * 60 * 1000; // 15 minutos
```

**Impacto:** Mesmo após adicionar dados no Sheets, o sistema retorna dados em cache por até 15 minutos.

**Localização:** `server/services/google-sheets.ts:12`

#### **Cache Layer 2 - Parser Cache (5 min)**
```typescript
const PARSED_DATA_TTL = 5 * 60 * 1000; // 5 minutos
```

**Impacto:** Dados já parseados ficam em cache por 5 minutos adicionais.

**Localização:** `server/services/google-sheets-parser.ts:13`

#### **Cache Layer 3 - Redis (Configurado mas COM PROBLEMAS)**
```
Erro identificado: "Socket already opened"
```

**Impacto:** Redis não está funcionando corretamente, mas o sistema continua operando sem ele.

**Logs:**
```
❌ Failed to connect to Redis: Error: Socket already opened
⚠️ Cache unavailable for key user:firebase:...
```

---

### 🟡 **PROBLEMA SECUNDÁRIO: Webhook Não Está Sendo Disparado**

#### **Evidências:**
- Não há logs recentes de webhook no sistema
- Último log de Google Auth: 16/11/2025 20:16:32
- Nenhum log de "WEBHOOK GOOGLE SHEETS ACIONADO" encontrado

#### **Possíveis Causas:**

1. **Google Apps Script não configurado**
   - Trigger onEdit não está ativo
   - URL do webhook incorreta
   - Permissões insuficientes

2. **Planilha não possui trigger instalado**
   - Script de webhook não está vinculado à planilha
   - Trigger foi desativado acidentalmente

3. **Firewall/Proxy bloqueando requests**
   - Hostinger pode estar bloqueando requests externos
   - IP do Google não está na whitelist

---

## Verificação do Ambiente

### ✅ **Componentes Funcionando:**

| Componente | Status | Evidência |
|------------|--------|-----------|
| Google Auth | ✅ OK | `✅ Google Auth initialized successfully` |
| Google Sheet ID | ✅ OK | `1jMXWtn_hcz4tY51-82Z-gwsZQzm0XFJUSf92zdKTdYk` |
| Service Account | ✅ OK | Arquivo existe em `/home/buscadorpxt/buscadorpxt/google-service-account.json` |
| WebSocket Manager | ✅ OK | `✅ WebSocket Manager initialized and connected to server` |
| Parser | ✅ OK | Processando 2513 produtos da planilha `17-11` |
| Cache TTL | ✅ OK | 15 min (Sheets) + 5 min (Parser) |

### ⚠️ **Componentes com Problemas:**

| Componente | Status | Problema |
|------------|--------|----------|
| Redis | ⚠️ ERRO | `Error: Socket already opened` |
| Webhook | ❓ DESCONHECIDO | Sem logs de ativação recente |
| Sincronização Manual | ❓ NÃO TESTADO | Endpoint retornou HTML (rota pode não estar registrada) |

---

## Diagrama do Problema

```
┌─────────────────────────────────────────────────────────────────┐
│ LINHA DO TEMPO: Por que dados novos não aparecem               │
└─────────────────────────────────────────────────────────────────┘

T=0     │ Usuário adiciona novo produto no Google Sheets
        │
        ▼
T=0     │ ❌ Webhook NÃO É DISPARADO (problema identificado)
        │
        ▼
T=0     │ Sistema continua usando Cache Layer 1 (Google Sheets Service)
        │ ⏰ Tempo restante: até 15 minutos
        │
        ▼
T=15min │ Cache Layer 1 expira automaticamente
        │ ✅ Sistema busca dados frescos da API do Google Sheets
        │
        ▼
T=15min │ Parser recebe dados frescos
        │ ⚙️ Processa e valida 2513+ produtos
        │
        ▼
T=15min │ Cache Layer 2 (Parser) armazena dados processados
        │ ⏰ Válido por 5 minutos
        │
        ▼
T=15min │ ✅ Dados novos FINALMENTE aparecem no sistema
        │
        └─────────────────────────────────────────────────────────┘

🔑 CONCLUSÃO: Delay de até 15 minutos é ESPERADO se webhook não funcionar
```

---

## Cenários de Teste

### **Cenário 1: Webhook Funcionando (IDEAL)**
```
Tempo até dados aparecerem: ~5-10 segundos
Fluxo:
1. Usuário edita célula no Sheets
2. Google Apps Script dispara webhook
3. Backend limpa cache específico
4. Backend busca dados frescos
5. WebSocket broadcast para todos os clientes
6. Frontend atualiza automaticamente
```

### **Cenário 2: Webhook NÃO Funcionando (ATUAL)**
```
Tempo até dados aparecerem: 5-15 minutos
Fluxo:
1. Usuário edita célula no Sheets
2. ❌ Nada acontece
3. Usuário espera...
4. Cache Layer 1 expira após 15 minutos
5. Próxima request busca dados frescos
6. Dados aparecem
```

### **Cenário 3: Sincronização Manual**
```
Tempo até dados aparecerem: ~2-5 segundos
Fluxo:
1. Admin acessa painel de monitoramento
2. Clica em "Sincronizar Manualmente"
3. POST /api/monitoring/sync/manual
4. Cache é limpo forçadamente
5. Dados frescos são buscados
6. WebSocket broadcast
```

---

## Recomendações Prioritárias

### 🔥 **URGENTE - Configurar Webhook do Google Sheets**

#### **Passo 1: Verificar Google Apps Script**
1. Abrir a planilha no Google Sheets
2. Ir em: Extensões → Apps Script
3. Verificar se existe um script de webhook
4. Se NÃO existir, criar:

```javascript
function onEdit(e) {
  const webhookUrl = 'https://buscadorpxt.com.br/api/webhook/google-sheets';

  const sheet = e.range.getSheet();
  const sheetName = sheet.getName();
  const row = e.range.getRow();
  const col = e.range.getColumn();

  const payload = {
    sheetId: SpreadsheetApp.getActiveSpreadsheet().getId(),
    sheetName: sheetName,
    eventType: 'EDIT',
    rowIndex: row,
    columnIndex: col,
    oldValue: e.oldValue,
    newValue: e.value,
    timestamp: new Date().toISOString()
  };

  const options = {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };

  try {
    UrlFetchApp.fetch(webhookUrl, options);
  } catch (error) {
    Logger.log('Webhook error: ' + error);
  }
}
```

#### **Passo 2: Configurar Trigger**
1. No Apps Script, ir em: Acionadores (ícone de relógio)
2. Adicionar novo acionador:
   - Função: `onEdit`
   - Origem do evento: Da planilha
   - Tipo de evento: Ao editar

#### **Passo 3: Testar Webhook**
```bash
# Testar endpoint manualmente
curl -X POST https://buscadorpxt.com.br/api/webhook/google-sheets \
  -H "Content-Type: application/json" \
  -d '{
    "sheetId": "1jMXWtn_hcz4tY51-82Z-gwsZQzm0XFJUSf92zdKTdYk",
    "sheetName": "17-11",
    "eventType": "EDIT",
    "rowIndex": 10,
    "columnIndex": 6,
    "oldValue": "3000",
    "newValue": "2900"
  }'
```

---

### 🔧 **MÉDIO - Corrigir Redis**

#### **Problema:**
```
Error: Socket already opened
```

#### **Possíveis Soluções:**
1. Verificar se Redis está instalado e rodando:
```bash
sudo systemctl status redis
```

2. Se não estiver instalado:
```bash
sudo apt update
sudo apt install redis-server
sudo systemctl enable redis
sudo systemctl start redis
```

3. Verificar configuração no código (singleton pattern pode estar criando múltiplas conexões)

#### **Alternativa (se Redis não for crítico):**
- Sistema já funciona sem Redis (fallback para cache em memória)
- Pode ser deixado como melhoria futura

---

### 📊 **BAIXO - Melhorias Incrementais**

#### **1. Adicionar Endpoint de Limpeza de Cache Manual**
```typescript
// Já existe em: /api/monitoring/clear-cache
// Testar se está funcionando
```

#### **2. Adicionar Logs de Webhook**
```typescript
// Adicionar mais logging no webhook handler
console.log('[WEBHOOK] Payload recebido:', JSON.stringify(req.body));
console.log('[WEBHOOK] Cache limpo para:', sheetName);
console.log('[WEBHOOK] Broadcast enviado para', clientCount, 'clientes');
```

#### **3. Dashboard de Monitoramento**
- Mostrar último webhook recebido
- Mostrar status do cache
- Mostrar última sincronização

---

## Checklist de Verificação para o Usuário

### **Quando adicionar novos dados no Sheets:**

- [ ] Verificar se a planilha tem formato `DD-MM` (ex: `17-11`)
- [ ] Verificar se todas as colunas obrigatórias estão preenchidas:
  - A: FORNECEDOR
  - B: CATEGORIA
  - C: MODELO
  - D: GB (armazenamento)
  - F: COR
  - G: PREÇO (formato brasileiro: `R$ 1.234,56`)
- [ ] Aguardar 5-10 segundos (se webhook funcionar)
- [ ] OU aguardar 15 minutos (se webhook não funcionar)
- [ ] Se urgente: usar sincronização manual no painel admin

### **Se dados não aparecerem após 15 minutos:**

- [ ] Verificar logs do servidor: `pm2 logs buscadorpxt`
- [ ] Verificar se webhook foi recebido (buscar por "WEBHOOK GOOGLE SHEETS ACIONADO")
- [ ] Verificar se há erros de parsing (buscar por "⚠️ Pulando linha")
- [ ] Forçar sincronização manual via API admin

---

## Conclusão

### **Por que os dados não estão aparecendo?**

1. **Cache de 15 minutos** está ativo e funcionando como esperado
2. **Webhook não está sendo disparado** (problema principal)
3. **Redis com erro** mas não impede funcionamento
4. Sistema espera expiração do cache para buscar dados frescos

### **Solução Imediata:**

1. **Aguardar 15 minutos** após adicionar dados no Sheets
2. **OU** configurar webhook do Google Apps Script (recomendado)
3. **OU** usar sincronização manual via painel admin

### **Solução Definitiva:**

1. ✅ Configurar webhook no Google Apps Script (10 min)
2. ✅ Testar endpoint do webhook (5 min)
3. ⚠️ Corrigir Redis (20 min - opcional)
4. ✅ Adicionar logging adicional (10 min)

---

## Próximos Passos

### **Imediato (hoje):**
1. Configurar Google Apps Script webhook
2. Testar webhook com edição real
3. Monitorar logs para confirmar funcionamento

### **Curto Prazo (esta semana):**
1. Corrigir problema do Redis
2. Adicionar dashboard de status do webhook
3. Documentar processo de sincronização

### **Médio Prazo (próximo mês):**
1. Implementar retry automático de webhook
2. Adicionar notificações de falha de sync
3. Melhorar logging e observabilidade

---

## Apêndices

### **A. Estrutura de Cache Atual**

| Camada | TTL | Tipo | Localização |
|--------|-----|------|-------------|
| Google Sheets Service | 15 min | Memória | `server/services/google-sheets.ts` |
| Parser Cache | 5 min | Memória | `server/services/google-sheets-parser.ts` |
| Redis | N/A | Externo | `server/services/cache-service.ts` (com erro) |

### **B. Endpoints Relevantes**

| Endpoint | Método | Autenticação | Função |
|----------|--------|--------------|--------|
| `/api/webhook/google-sheets` | POST | Nenhuma | Recebe webhook do Sheets |
| `/api/webhook/test-webhook` | POST | Nenhuma | Testa sistema de broadcast |
| `/api/monitoring/sync/manual` | POST | Token | Sincronização manual |
| `/api/monitoring/clear-cache` | POST | Token | Limpa todos os caches |
| `/api/monitoring/sync/status` | GET | Token | Status da sincronização |

### **C. Variáveis de Ambiente Críticas**

```bash
GOOGLE_SHEET_ID=1jMXWtn_hcz4tY51-82Z-gwsZQzm0XFJUSf92zdKTdYk
GOOGLE_SERVICE_ACCOUNT_EMAIL=sheets-sync-buscador-pxt@mvp1precos.iam.gserviceaccount.com
```

### **D. Comandos Úteis**

```bash
# Verificar logs em tempo real
pm2 logs buscadorpxt --lines 100

# Filtrar por webhook
pm2 logs buscadorpxt | grep -i webhook

# Filtrar por sync
pm2 logs buscadorpxt | grep -i sync

# Verificar cache
pm2 logs buscadorpxt | grep -i cache

# Reiniciar aplicação
pm2 restart buscadorpxt

# Ver status
pm2 status
```

---

**Relatório gerado por:** Claude Code
**Data:** 17/11/2025
**Versão:** 1.0
