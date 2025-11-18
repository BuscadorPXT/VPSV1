# 📋 Plano de Execução: Opção 1 - Unificação em `user_sessions`

**Data de Criação:** 18 de Novembro de 2025
**Objetivo:** Corrigir o problema de usuários online não aparecendo no painel admin
**Estratégia:** Unificar monitoramento em `user_sessions`, reduzir rate limiting e sincronizar WebSocket heartbeat

---

## 📊 Sumário Executivo

### Problema Atual
O contador de usuários online no painel admin mostra **0 usuários** porque:
1. `lastActivity` é atualizado apenas a cada **2 minutos** (rate-limited)
2. Query do endpoint usa janela de **30 minutos** baseada em `lastActivity`
3. **WebSocket heartbeat não sincroniza** com `user_sessions.lastActivity`
4. Usuários inativos desaparecem da lista após 2-30 minutos

### Solução Proposta (Opção 1)
- ✅ Reduzir rate limiting de `lastActivity` de 2min → 30s
- ✅ Sincronizar WebSocket heartbeat com `user_sessions.lastActivity`
- ✅ Manter `user_sessions` como fonte única de verdade
- ✅ Preservar `active_sessions` para geolocalização (opcional)

### Impacto Esperado
- ✅ **Usuários online aparecem em tempo real** (30s de delay máximo)
- ✅ **Dados confiáveis** no painel admin
- ⚠️ **Aumento de ~4% em writes ao banco** (de 2min para 30s)
- ✅ **Zero downtime** durante deploy

---

## 🎯 Objetivos

### Objetivos Primários
1. ✅ Corrigir contador de usuários online no admin
2. ✅ Garantir dados em tempo real (máximo 30s de delay)
3. ✅ Manter performance aceitável (< 5% overhead)

### Objetivos Secundários
1. ✅ Simplificar arquitetura (fonte única de verdade)
2. ✅ Melhorar logs e debug
3. ✅ Preparar para escalabilidade futura

---

## 📦 Arquivos a Serem Modificados

### 1. Backend - Middleware de Autenticação
**Arquivo:** `server/middleware/auth.ts`

#### Mudanças:
- ✅ Reduzir `SESSION_ACTIVITY_UPDATE_INTERVAL` de 2min → 30s
- ✅ Melhorar logs de debug

---

### 2. Backend - WebSocket Manager
**Arquivo:** `server/services/websocket-manager.ts`

#### Mudanças:
- ✅ Sincronizar heartbeat com `user_sessions.lastActivity`
- ✅ Adicionar fallback para erros de sincronização

---

### 3. Backend - Session Manager (Opcional)
**Arquivo:** `server/services/session-manager.service.ts`

#### Mudanças:
- ✅ Adicionar método `updateSessionActivityByUserId()`
- ✅ Melhorar logs

---

### 4. Backend - Storage (Opcional)
**Arquivo:** `server/storage.ts`

#### Mudanças:
- ✅ Adicionar método `updateSessionActivityByUserId()` se necessário

---

### 5. Backend - Session Cleanup
**Arquivo:** `server/services/session-cleanup.service.ts`

#### Mudanças:
- ✅ Garantir que cleanup não interfira com sessões ativas

---

## 🔧 Implementação Detalhada

---

## PASSO 1: Reduzir Rate Limiting em `auth.ts`

### 📄 Arquivo: `server/middleware/auth.ts`

#### Localização: Linhas 9-29

#### ❌ CÓDIGO ATUAL:
```typescript
// ⚡ OTIMIZAÇÃO: Rate limiting para updates de lastActivity
// Atualiza a cada 2 minutos para manter dados de "usuários online" precisos
// sem sobrecarregar o banco (reduz writes em ~95% vs atualizar em cada request)
const SESSION_ACTIVITY_UPDATE_INTERVAL = 2 * 60 * 1000; // 2 minutos
const lastActivityUpdateMap = new Map<string, number>(); // sessionToken -> timestamp do último update

// Limpeza periódica do Map para evitar memory leak (a cada 10 minutos)
setInterval(() => {
  const now = Date.now();
  const MAX_AGE = 24 * 60 * 60 * 1000; // 24 horas

  for (const [sessionToken, timestamp] of lastActivityUpdateMap.entries()) {
    if (now - timestamp > MAX_AGE) {
      lastActivityUpdateMap.delete(sessionToken);
    }
  }

  if (lastActivityUpdateMap.size > 0) {
    console.log(`🧹 [Auth Middleware] Map cleanup: ${lastActivityUpdateMap.size} active session trackers`);
  }
}, 10 * 60 * 1000);
```

#### ✅ CÓDIGO NOVO:
```typescript
// ⚡ OTIMIZAÇÃO: Rate limiting para updates de lastActivity
// Atualiza a cada 30 segundos para manter dados de "usuários online" precisos e em tempo real
// Reduz writes ao banco em ~75% vs atualizar em cada request
// MOTIVO DA MUDANÇA: Fix para problema de usuários online não aparecendo no admin
// (janela de 30min + rate de 2min causava falsos negativos)
const SESSION_ACTIVITY_UPDATE_INTERVAL = 30 * 1000; // 30 segundos (era 2 minutos)
const lastActivityUpdateMap = new Map<string, number>(); // sessionToken -> timestamp do último update

// Limpeza periódica do Map para evitar memory leak (a cada 5 minutos)
setInterval(() => {
  const now = Date.now();
  const MAX_AGE = 24 * 60 * 60 * 1000; // 24 horas

  for (const [sessionToken, timestamp] of lastActivityUpdateMap.entries()) {
    if (now - timestamp > MAX_AGE) {
      lastActivityUpdateMap.delete(sessionToken);
    }
  }

  if (lastActivityUpdateMap.size > 0) {
    console.log(`🧹 [Auth Middleware] Map cleanup: ${lastActivityUpdateMap.size} active session trackers`);
  }
}, 5 * 60 * 1000); // 5 minutos (era 10 minutos)
```

#### Localização: Linhas 278-296

#### ❌ CÓDIGO ATUAL:
```typescript
// ✅ FIX: Atualizar lastActivity da sessão com rate limiting
// Isso mantém os dados de "usuários online" no painel admin precisos
// Atualiza apenas a cada 2 minutos (não em todo request) para otimizar performance
if (req.session?.sessionToken) {
  const now = Date.now();
  const sessionTokenKey = req.session.sessionToken;
  const lastUpdate = lastActivityUpdateMap.get(sessionTokenKey) || 0;

  // Só atualiza se passou mais de 2 minutos desde o último update
  if (now - lastUpdate > SESSION_ACTIVITY_UPDATE_INTERVAL) {
    lastActivityUpdateMap.set(sessionTokenKey, now);

    // Update assíncrono para não bloquear a request
    storage.updateSessionActivity(sessionTokenKey).catch(error => {
      console.error('⚠️ Failed to update session activity:', error);
      // Não falhar a requisição se update falhar
    });
  }
}
```

#### ✅ CÓDIGO NOVO:
```typescript
// ✅ FIX: Atualizar lastActivity da sessão com rate limiting otimizado
// Mantém dados de "usuários online" no painel admin PRECISOS e em TEMPO REAL
// Atualiza a cada 30 segundos (não em todo request) - balanceia performance vs precisão
if (req.session?.sessionToken) {
  const now = Date.now();
  const sessionTokenKey = req.session.sessionToken;
  const lastUpdate = lastActivityUpdateMap.get(sessionTokenKey) || 0;

  // Só atualiza se passou mais de 30 segundos desde o último update
  if (now - lastUpdate > SESSION_ACTIVITY_UPDATE_INTERVAL) {
    lastActivityUpdateMap.set(sessionTokenKey, now);

    // Update assíncrono para não bloquear a request
    storage.updateSessionActivity(sessionTokenKey).catch(error => {
      console.error('⚠️ Failed to update session activity:', error);
      // Não falhar a requisição se update falhar
    });

    // Log de debug (remover após validar funcionamento)
    if (process.env.NODE_ENV === 'development') {
      console.log(`🔄 [Auth] Updated lastActivity for user ${req.userId} (${req.user?.email})`);
    }
  }
}
```

---

## PASSO 2: Sincronizar WebSocket Heartbeat com `user_sessions`

### 📄 Arquivo: `server/services/websocket-manager.ts`

#### Localização: Linhas 527-539 (método `updateSessionActivity`)

#### ❌ CÓDIGO ATUAL:
```typescript
private async updateSessionActivity(ws: WebSocketClient): Promise<void> {
  try {
    if (!ws.dbSessionId) {
      return;
    }

    await db.update(activeSessions)
      .set({ lastActivityAt: new Date() })
      .where(eq(activeSessions.id, ws.dbSessionId));
  } catch (error) {
    console.error('❌ Error updating session activity:', error);
  }
}
```

#### ✅ CÓDIGO NOVO:
```typescript
private async updateSessionActivity(ws: WebSocketClient): Promise<void> {
  try {
    // 1. Atualizar active_sessions (geolocalização)
    if (ws.dbSessionId) {
      await db.update(activeSessions)
        .set({ lastActivityAt: new Date() })
        .where(eq(activeSessions.id, ws.dbSessionId));
    }

    // 2. ✅ NOVO: Sincronizar com user_sessions.lastActivity
    // Isso garante que usuários apareçam no painel admin em tempo real
    if (ws.userId && typeof ws.userId === 'number') {
      try {
        await db.update(userSessions)
          .set({ lastActivity: new Date() })
          .where(eq(userSessions.userId, ws.userId));

        console.log(`✅ [WS Heartbeat] Updated lastActivity for user ${ws.userId} (${ws.email})`);
      } catch (syncError) {
        console.error(`⚠️ [WS Heartbeat] Failed to sync user_sessions for user ${ws.userId}:`, syncError);
        // Não falhar o heartbeat se sincronização falhar
      }
    } else {
      console.warn(`⚠️ [WS Heartbeat] Cannot sync user_sessions: userId is ${ws.userId} (type: ${typeof ws.userId})`);
    }
  } catch (error) {
    console.error('❌ [WS Heartbeat] Error updating session activity:', error);
  }
}
```

#### Observação Importante:
O método `updateSessionActivity` é chamado quando o cliente envia mensagem `HEARTBEAT` (linhas 255-263). O heartbeat do cliente já deve estar configurado para rodar a cada 30 segundos.

---

## PASSO 3: Adicionar Logs de Debug no Endpoint Admin

### 📄 Arquivo: `server/routes/admin.routes.ts`

#### Localização: Após linha 266 (dentro do bloco de enrichment)

#### ✅ ADICIONAR LOGS:
```typescript
console.log(`📊 Found ${enrichedOnlineUsers.length} users with recent activity (last ${TIME_WINDOW_MINUTES} minutes) - using userSessions.lastActivity`);

// Se encontrou usuários, logar amostra
if (enrichedOnlineUsers.length > 0) {
  console.log(`📊 Sample user:`, {
    id: enrichedOnlineUsers[0].id,
    name: enrichedOnlineUsers[0].name,
    email: enrichedOnlineUsers[0].email,
    lastActivity: enrichedOnlineUsers[0].lastActivity,
    sessionCreatedAt: enrichedOnlineUsers[0].sessionCreatedAt
  });

  // 🔍 DEBUG: Verificar se lastActivity está recente
  const now = new Date();
  const lastActivityDate = new Date(enrichedOnlineUsers[0].lastActivity);
  const minutesAgo = Math.floor((now.getTime() - lastActivityDate.getTime()) / (1000 * 60));
  console.log(`🔍 [DEBUG] Last activity was ${minutesAgo} minutes ago (threshold: ${TIME_WINDOW_MINUTES} min)`);
} else {
  console.warn(`⚠️ [DEBUG] No users found with lastActivity > ${timeWindowStart.toISOString()}`);

  // 🔍 DEBUG: Verificar se existem sessões ativas no banco
  const totalActiveSessions = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(userSessions)
    .where(
      and(
        eq(userSessions.isActive, true),
        sql`${userSessions.expiresAt} > NOW()`
      )
    );

  console.log(`🔍 [DEBUG] Total active sessions in DB: ${totalActiveSessions[0]?.count || 0}`);

  // Mostrar amostra de sessões ativas (se houver)
  if (totalActiveSessions[0]?.count > 0) {
    const sampleSessions = await db
      .select({
        userId: userSessions.userId,
        lastActivity: userSessions.lastActivity,
        minutesAgo: sql<number>`EXTRACT(EPOCH FROM (NOW() - ${userSessions.lastActivity})) / 60`
      })
      .from(userSessions)
      .where(
        and(
          eq(userSessions.isActive, true),
          sql`${userSessions.expiresAt} > NOW()`
        )
      )
      .limit(3);

    console.log(`🔍 [DEBUG] Sample active sessions:`, sampleSessions);
  }
}
```

---

## PASSO 4: (Opcional) Adicionar Método Helper em SessionManager

### 📄 Arquivo: `server/services/session-manager.service.ts`

#### Localização: Após linha 200 (após método `updateSessionActivity`)

#### ✅ ADICIONAR MÉTODO:
```typescript
/**
 * 🔄 Atualiza lastActivity de uma sessão por userId
 * Útil para sincronização com WebSocket heartbeat
 */
async updateSessionActivityByUserId(userId: number): Promise<boolean> {
  try {
    const result = await db.update(userSessions)
      .set({ lastActivity: new Date() })
      .where(eq(userSessions.userId, userId))
      .returning();

    if (result.length > 0) {
      console.log(`✅ [SessionManager] Updated lastActivity for userId ${userId}`);
      return true;
    } else {
      console.warn(`⚠️ [SessionManager] No session found for userId ${userId}`);
      return false;
    }
  } catch (error) {
    console.error(`❌ [SessionManager] Failed to update session activity for userId ${userId}:`, error);
    return false;
  }
}
```

---

## PASSO 5: Validar Import Statements

### 📄 Arquivo: `server/services/websocket-manager.ts`

#### Localização: Linhas 1-6 (imports)

#### ✅ GARANTIR QUE EXISTE:
```typescript
import { WebSocket, WebSocketServer } from 'ws';
import { IncomingMessage } from 'http';
import { GeolocationService } from './geolocation.service';
import { db } from '../db';
import { activeSessions, users, userSessions } from '@shared/schema'; // ✅ userSessions deve estar aqui
import { eq, and, desc } from 'drizzle-orm';
```

Se `userSessions` **não estiver** no import, adicionar:
```typescript
import { activeSessions, users, userSessions } from '@shared/schema';
```

---

## 📊 Análise de Impacto

### Performance

#### Impacto no Banco de Dados

**Antes (Rate Limit: 2 minutos):**
- Usuário ativo por 1 hora = 30 requests HTTP
- Updates de `lastActivity` = **15 writes** (1 a cada 2 min)
- Total writes/hora/usuário: **15**

**Depois (Rate Limit: 30 segundos):**
- Usuário ativo por 1 hora = 30 requests HTTP
- Updates de `lastActivity` = **60 writes** (1 a cada 30s, se fizer requests)
- **MAIS** WebSocket heartbeat: 120 heartbeats/hora (a cada 30s)
- Total writes/hora/usuário: **60-120** (depende de atividade HTTP)

**Aumento:** ~4x writes por usuário ativo

#### Mitigação:
1. ✅ Write é indexado (PRIMARY KEY em `userId`)
2. ✅ Update é simples (apenas timestamp)
3. ✅ PostgreSQL lida bem com writes frequentes em PKs
4. ✅ Esperado: < 5ms por write
5. ✅ Para 100 usuários ativos: ~200 writes/min (aceitável)

---

### Latência de Requests

#### Impacto:
- ✅ **Zero impacto**: Update é assíncrono (não bloqueia request)
- ✅ Mantido em linha 291 (auth.ts): `storage.updateSessionActivity(...).catch(...)`

---

### Memória

#### Impacto:
- ✅ **Reduzido**: Cleanup de Map de 10min → 5min
- ✅ Map menor (30s vs 2min = menos entradas em memória)

---

### Logs

#### Impacto:
- ⚠️ **Aumento de logs** em desenvolvimento
- ✅ **Logs condicionais** com `process.env.NODE_ENV === 'development'`
- ✅ Remover após validação em produção

---

## 🧪 Plano de Testes

### TESTE 1: Validar Rate Limiting Reduzido

#### Objetivo:
Confirmar que `lastActivity` é atualizado a cada 30 segundos.

#### Passos:
1. Fazer login como usuário teste
2. Fazer 1 request HTTP a cada 15 segundos por 2 minutos
3. Consultar banco de dados:
   ```sql
   SELECT
     id,
     "userId",
     "lastActivity",
     EXTRACT(EPOCH FROM (NOW() - "lastActivity")) as seconds_ago
   FROM user_sessions
   WHERE "userId" = <TESTE_USER_ID>
   ORDER BY "lastActivity" DESC
   LIMIT 1;
   ```
4. Validar que `seconds_ago` ≤ 30

#### Resultado Esperado:
✅ `lastActivity` nunca deve ter mais de 30 segundos de idade.

---

### TESTE 2: Validar WebSocket Heartbeat Sincroniza

#### Objetivo:
Confirmar que heartbeat WebSocket atualiza `user_sessions.lastActivity`.

#### Passos:
1. Fazer login e conectar WebSocket
2. **Não fazer nenhuma request HTTP** por 2 minutos
3. Observar logs do servidor para mensagens `HEARTBEAT`
4. Consultar banco de dados:
   ```sql
   SELECT
     id,
     "userId",
     "lastActivity",
     EXTRACT(EPOCH FROM (NOW() - "lastActivity")) as seconds_ago
   FROM user_sessions
   WHERE "userId" = <TESTE_USER_ID>;
   ```
5. Validar que `seconds_ago` ≤ 35 (30s heartbeat + 5s latência)

#### Resultado Esperado:
✅ `lastActivity` deve ser atualizado mesmo sem requests HTTP.

---

### TESTE 3: Validar Contador no Admin Dashboard

#### Objetivo:
Confirmar que contador de usuários online funciona corretamente.

#### Passos:
1. Fazer login com 3 usuários diferentes em abas separadas
2. Abrir painel admin
3. Verificar contador de "Usuários Online"
4. Esperar 1 minuto
5. Verificar novamente

#### Resultado Esperado:
✅ Contador deve mostrar **3 usuários online**.
✅ Contador deve permanecer em **3** após 1 minuto (não deve zerar).

---

### TESTE 4: Validar Lista de Usuários Online

#### Objetivo:
Confirmar que lista detalhada de usuários online está correta.

#### Passos:
1. Navegar para painel admin → seção "Usuários Online"
2. Verificar lista de usuários
3. Validar que mostra:
   - Nome do usuário
   - Email
   - IP Address
   - Última atividade (< 30s)

#### Resultado Esperado:
✅ Lista deve mostrar todos os 3 usuários.
✅ Última atividade deve ser recente (< 30s).

---

### TESTE 5: Validar Usuário Inativo Desaparece

#### Objetivo:
Confirmar que usuários inativos desaparecem da lista após 30 minutos.

#### Passos:
1. Fazer login com usuário teste
2. **Fechar todas as abas** (desconectar WebSocket)
3. Esperar 31 minutos
4. Verificar contador no admin

#### Resultado Esperado:
✅ Usuário deve **desaparecer** da lista após 30 minutos de inatividade.

---

### TESTE 6: Validar Performance do Banco

#### Objetivo:
Confirmar que aumento de writes não causa problemas de performance.

#### Passos:
1. Simular 10 usuários ativos simultâneos por 5 minutos
2. Monitorar métricas do PostgreSQL:
   ```sql
   SELECT
     schemaname,
     tablename,
     n_tup_upd as updates,
     n_live_tup as live_rows,
     last_autovacuum
   FROM pg_stat_user_tables
   WHERE tablename = 'user_sessions';
   ```
3. Verificar latência de queries:
   ```sql
   SELECT
     query,
     mean_exec_time,
     calls
   FROM pg_stat_statements
   WHERE query LIKE '%user_sessions%'
   ORDER BY mean_exec_time DESC
   LIMIT 10;
   ```

#### Resultado Esperado:
✅ Mean exec time para updates ≤ 5ms.
✅ Nenhum lock contention.

---

## 🚀 Ordem de Execução

### FASE 1: Preparação (5 minutos)

1. ✅ **Backup do banco de dados**
   ```bash
   pg_dump -U postgres -d buscadorpxt -t user_sessions > backup_user_sessions.sql
   ```

2. ✅ **Criar branch Git**
   ```bash
   git checkout -b fix/usuarios-online-opcao1
   ```

3. ✅ **Documentar estado atual**
   ```bash
   # Salvar logs do servidor
   pm2 logs buscadorpxt --lines 100 > logs_before_fix.txt

   # Query estado atual
   psql -U postgres -d buscadorpxt -c "SELECT COUNT(*) FROM user_sessions WHERE is_active = true;" > session_count_before.txt
   ```

---

### FASE 2: Implementação (15 minutos)

#### PASSO 1: Modificar `auth.ts`
```bash
nano server/middleware/auth.ts
```

- Alterar linha 11: `SESSION_ACTIVITY_UPDATE_INTERVAL = 30 * 1000`
- Alterar linha 29: `}, 5 * 60 * 1000);`
- Adicionar logs de debug (linhas 292-296)

#### PASSO 2: Modificar `websocket-manager.ts`
```bash
nano server/services/websocket-manager.ts
```

- Adicionar import de `userSessions` (linha 5)
- Substituir método `updateSessionActivity` (linhas 527-554)

#### PASSO 3: Adicionar logs em `admin.routes.ts`
```bash
nano server/routes/admin.routes.ts
```

- Adicionar bloco de debug após linha 266

#### PASSO 4: (Opcional) Adicionar método em `session-manager.service.ts`
```bash
nano server/services/session-manager.service.ts
```

- Adicionar método `updateSessionActivityByUserId` após linha 200

---

### FASE 3: Build e Deploy (5 minutos)

#### PASSO 1: Build da aplicação
```bash
./build-production.sh
```

#### PASSO 2: Verificar build
```bash
ls -lh build/
```

#### PASSO 3: Deploy com PM2 (Zero Downtime)
```bash
pm2 reload buscadorpxt --update-env
```

#### PASSO 4: Verificar startup
```bash
pm2 logs buscadorpxt --lines 50 | grep -E "WebSocket|SessionManager|server listening"
```

---

### FASE 4: Validação (15 minutos)

#### PASSO 1: Smoke Test
```bash
curl http://localhost:5000/api/health
```

Resultado esperado:
```json
{
  "status": "ok",
  "timestamp": "2025-11-18T..."
}
```

#### PASSO 2: Executar Testes 1-6
- Seguir checklist de testes acima

#### PASSO 3: Monitorar Logs
```bash
pm2 logs buscadorpxt --lines 100 | grep -E "Updated lastActivity|WS Heartbeat|online users"
```

#### PASSO 4: Verificar Painel Admin
- Abrir `https://seu-dominio.com/admin`
- Verificar contador de usuários online

---

### FASE 5: Monitoramento (30 minutos)

#### PASSO 1: Observar métricas do banco
```bash
watch -n 30 'psql -U postgres -d buscadorpxt -c "SELECT COUNT(*) as active_sessions, MAX(last_activity) as most_recent FROM user_sessions WHERE is_active = true AND expires_at > NOW();"'
```

#### PASSO 2: Observar logs em tempo real
```bash
pm2 logs buscadorpxt --lines 0
```

#### PASSO 3: Verificar performance
```bash
# Monitorar CPU e memória
pm2 monit

# Verificar queries lentas no PostgreSQL
psql -U postgres -d buscadorpxt -c "SELECT query, mean_exec_time, calls FROM pg_stat_statements WHERE query LIKE '%user_sessions%' ORDER BY mean_exec_time DESC LIMIT 5;"
```

---

## 🔄 Estratégia de Rollback

### Cenário 1: Problema Detectado Durante Deploy

#### Sintomas:
- Erro no build
- Erro no startup do servidor
- Logs mostram exceptions

#### Ação:
```bash
# 1. Parar deploy
pm2 stop buscadorpxt

# 2. Reverter para versão anterior
git checkout main
npm run build

# 3. Restart
pm2 restart buscadorpxt

# 4. Verificar
curl http://localhost:5000/api/health
```

---

### Cenário 2: Performance Degradada

#### Sintomas:
- Latência de requests > 500ms
- CPU > 80%
- Memória > 90%
- Queries lentas no PostgreSQL

#### Ação:
```bash
# 1. Aumentar rate limiting temporariamente
# Editar auth.ts:
SESSION_ACTIVITY_UPDATE_INTERVAL = 60 * 1000; // 1 minuto

# 2. Rebuild e redeploy
npm run build
pm2 reload buscadorpxt

# 3. Monitorar
pm2 monit
```

---

### Cenário 3: Dados Incorretos no Admin

#### Sintomas:
- Contador ainda mostra 0
- Lista de usuários vazia
- Erros no console do frontend

#### Ação:
```bash
# 1. Verificar logs
pm2 logs buscadorpxt --lines 200 | grep -E "ERROR|online users"

# 2. Verificar banco de dados
psql -U postgres -d buscadorpxt -c "SELECT COUNT(*), MAX(last_activity) FROM user_sessions WHERE is_active = true;"

# 3. Se necessário, reverter código
git revert HEAD
npm run build
pm2 reload buscadorpxt
```

---

### Cenário 4: Rollback Completo

#### Quando usar:
- Múltiplos problemas detectados
- Impossível corrigir rapidamente
- Produção comprometida

#### Ação:
```bash
# 1. Reverter código
git reset --hard origin/main

# 2. Restaurar backup do banco (se necessário)
psql -U postgres -d buscadorpxt < backup_user_sessions.sql

# 3. Rebuild
npm run build

# 4. Restart
pm2 restart buscadorpxt

# 5. Verificar saúde do sistema
curl http://localhost:5000/api/health
pm2 logs buscadorpxt --lines 50
```

---

## 📈 Métricas de Sucesso

### Métricas Primárias

#### 1. Contador de Usuários Online
- ✅ **Meta:** Mostrar número correto em tempo real
- ✅ **Verificação:** Comparar com número de sessões ativas no DB
- ✅ **Query:**
  ```sql
  SELECT COUNT(*) as expected_count
  FROM user_sessions
  WHERE is_active = true
    AND expires_at > NOW()
    AND last_activity > NOW() - INTERVAL '30 minutes';
  ```

#### 2. Delay de Atualização
- ✅ **Meta:** ≤ 30 segundos
- ✅ **Verificação:**
  ```sql
  SELECT
    user_id,
    EXTRACT(EPOCH FROM (NOW() - last_activity)) as seconds_since_update
  FROM user_sessions
  WHERE is_active = true
  ORDER BY last_activity DESC
  LIMIT 10;
  ```
- ✅ **Resultado esperado:** `seconds_since_update` ≤ 30

#### 3. Taxa de Erro
- ✅ **Meta:** < 0.1% de requests com erro
- ✅ **Verificação:**
  ```bash
  pm2 logs buscadorpxt --lines 1000 | grep -c "ERROR"
  ```

---

### Métricas Secundárias

#### 4. Performance do Banco
- ✅ **Meta:** Mean exec time ≤ 5ms para updates
- ✅ **Verificação:**
  ```sql
  SELECT
    query,
    mean_exec_time,
    calls
  FROM pg_stat_statements
  WHERE query LIKE '%UPDATE user_sessions SET%'
  LIMIT 1;
  ```

#### 5. CPU e Memória
- ✅ **Meta:** CPU < 70%, RAM < 80%
- ✅ **Verificação:**
  ```bash
  pm2 monit
  ```

#### 6. WebSocket Connections
- ✅ **Meta:** Número de conexões WS = número de usuários no admin
- ✅ **Verificação:** Comparar logs `WebSocket connections: X` com contador admin

---

## 🐛 Troubleshooting

### Problema 1: Contador Ainda Mostra 0

#### Diagnóstico:
```bash
# 1. Verificar se há sessões ativas no banco
psql -U postgres -d buscadorpxt -c "SELECT COUNT(*), MAX(last_activity) FROM user_sessions WHERE is_active = true AND expires_at > NOW();"

# 2. Verificar logs do endpoint
pm2 logs buscadorpxt | grep "online users"

# 3. Verificar se frontend está chamando endpoint
# No navegador: DevTools → Network → Filtrar por "/api/admin/users/online"
```

#### Possíveis Causas:
1. ❌ `lastActivity` não está sendo atualizado → Verificar logs de `[Auth] Updated lastActivity`
2. ❌ Query do endpoint tem filtro muito restritivo → Verificar janela de tempo (30 min)
3. ❌ Frontend não está fazendo query → Verificar console do navegador
4. ❌ Sessões expiradas → Verificar `expiresAt` no banco

#### Solução:
```bash
# Forçar atualização de lastActivity para usuário específico
psql -U postgres -d buscadorpxt -c "UPDATE user_sessions SET last_activity = NOW() WHERE user_id = <TESTE_USER_ID>;"

# Verificar se contador atualiza no admin (aguardar 30s para refetch)
```

---

### Problema 2: Logs Mostram Erro de Sincronização WS

#### Sintoma:
```
⚠️ [WS Heartbeat] Failed to sync user_sessions for user 123: Error: ...
```

#### Diagnóstico:
```bash
# Verificar se userId está correto
pm2 logs buscadorpxt | grep "WS Heartbeat" | grep "userId"

# Verificar se usuário existe no banco
psql -U postgres -d buscadorpxt -c "SELECT id, email FROM users WHERE id = 123;"
```

#### Possíveis Causas:
1. ❌ `ws.userId` é string em vez de number → Verificar tipo no código
2. ❌ Sessão não existe no banco → Usuário não fez login corretamente
3. ❌ Lock do banco → Verificar `pg_locks`

#### Solução:
```typescript
// Em websocket-manager.ts, garantir que userId é number:
if (ws.userId && typeof ws.userId === 'number') {
  // ... código de sincronização
}
```

---

### Problema 3: Performance Degradada

#### Sintoma:
- Latência de requests > 500ms
- CPU > 80%

#### Diagnóstico:
```bash
# 1. Verificar queries lentas
psql -U postgres -d buscadorpxt -c "SELECT query, mean_exec_time, calls FROM pg_stat_statements WHERE mean_exec_time > 10 ORDER BY mean_exec_time DESC LIMIT 10;"

# 2. Verificar locks
psql -U postgres -d buscadorpxt -c "SELECT * FROM pg_locks WHERE NOT granted;"

# 3. Verificar load do servidor
top -bn1 | grep "Cpu(s)"
```

#### Solução:
```bash
# 1. Aumentar rate limiting temporariamente
# Editar server/middleware/auth.ts:
SESSION_ACTIVITY_UPDATE_INTERVAL = 60 * 1000; // 1 minuto

# 2. Rebuild e redeploy
npm run build
pm2 reload buscadorpxt

# 3. Adicionar índice se necessário
psql -U postgres -d buscadorpxt -c "CREATE INDEX IF NOT EXISTS idx_user_sessions_last_activity ON user_sessions(last_activity) WHERE is_active = true;"
```

---

## 📝 Checklist Final

### Antes do Deploy

- [ ] ✅ Backup do banco de dados realizado
- [ ] ✅ Branch Git criado (`fix/usuarios-online-opcao1`)
- [ ] ✅ Código revisado e testado localmente
- [ ] ✅ Logs de estado atual salvos
- [ ] ✅ Plano de rollback revisado
- [ ] ✅ Janela de manutenção comunicada (se necessário)

### Durante o Deploy

- [ ] ✅ Build executado com sucesso
- [ ] ✅ PM2 reload executado
- [ ] ✅ Servidor reiniciou sem erros
- [ ] ✅ Health check passou
- [ ] ✅ WebSocket Manager inicializou
- [ ] ✅ SessionManager inicializou

### Após o Deploy

- [ ] ✅ Teste 1: Rate limiting validado
- [ ] ✅ Teste 2: WebSocket heartbeat validado
- [ ] ✅ Teste 3: Contador no admin correto
- [ ] ✅ Teste 4: Lista de usuários online correta
- [ ] ✅ Teste 5: Usuário inativo desaparece
- [ ] ✅ Teste 6: Performance do banco aceitável
- [ ] ✅ Logs monitorados por 30 minutos
- [ ] ✅ Métricas de sucesso atingidas
- [ ] ✅ Sem erros críticos nos logs
- [ ] ✅ Usuários finais validaram funcionamento

### Limpeza

- [ ] ✅ Remover logs de debug se tudo estiver OK
- [ ] ✅ Commit do código final
- [ ] ✅ Merge para main (após validação completa)
- [ ] ✅ Documentação atualizada
- [ ] ✅ Backup antigo pode ser removido (após 7 dias)

---

## 📚 Referências

### Arquivos Relacionados
- `MAPEAMENTO_USUARIOS_ONLINE.md` - Análise completa do problema
- `server/middleware/auth.ts:9-319` - Middleware de autenticação
- `server/services/websocket-manager.ts:527-562` - WebSocket Manager
- `server/routes/admin.routes.ts:167-370` - Endpoint de usuários online
- `shared/schema.ts:187-199` - Schema de user_sessions

### Comandos Úteis

#### PostgreSQL
```bash
# Conectar ao banco
psql -U postgres -d buscadorpxt

# Ver sessões ativas
SELECT * FROM user_sessions WHERE is_active = true;

# Ver última atividade
SELECT user_id, last_activity, EXTRACT(EPOCH FROM (NOW() - last_activity)) as seconds_ago
FROM user_sessions
WHERE is_active = true
ORDER BY last_activity DESC;

# Ver estatísticas da tabela
SELECT * FROM pg_stat_user_tables WHERE tablename = 'user_sessions';
```

#### PM2
```bash
# Ver logs em tempo real
pm2 logs buscadorpxt --lines 0

# Ver métricas
pm2 monit

# Restart
pm2 restart buscadorpxt

# Reload (zero downtime)
pm2 reload buscadorpxt
```

#### Git
```bash
# Criar branch
git checkout -b fix/usuarios-online-opcao1

# Commit
git add .
git commit -m "Fix: Corrigir usuários online no admin (Opção 1)"

# Reverter se necessário
git reset --hard HEAD~1
```

---

## ✅ Conclusão

Este plano fornece:
- ✅ **Implementação passo a passo** com código específico
- ✅ **Testes detalhados** para validação
- ✅ **Estratégia de rollback** para cada cenário
- ✅ **Troubleshooting** para problemas comuns
- ✅ **Métricas claras** de sucesso

**Próximo Passo:** Aguardar aprovação para executar o plano.

---

**⚠️ IMPORTANTE:** Este é um plano de execução. **NÃO execute nenhuma ação ainda**. Aguarde aprovação antes de iniciar a implementação.
