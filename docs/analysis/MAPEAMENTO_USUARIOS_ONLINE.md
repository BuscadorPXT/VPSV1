# 🔍 Mapeamento Completo: Sistema de Monitoramento de Usuários Online

**Data:** 18 de Novembro de 2025
**Objetivo:** Identificar o problema que impede a exibição de usuários online no painel admin

---

## 📋 Sumário

1. [Visão Geral da Arquitetura](#1-visão-geral-da-arquitetura)
2. [Banco de Dados](#2-banco-de-dados)
3. [Backend - Gerenciamento de Sessões](#3-backend---gerenciamento-de-sessões)
4. [Backend - WebSocket Manager](#4-backend---websocket-manager)
5. [Backend - Endpoints API](#5-backend---endpoints-api)
6. [Frontend - Componentes](#6-frontend---componentes)
7. [Middleware de Autenticação](#7-middleware-de-autenticação)
8. [Fluxo de Dados Completo](#8-fluxo-de-dados-completo)
9. [Análise do Problema](#9-análise-do-problema)
10. [Possíveis Causas](#10-possíveis-causas)

---

## 1. Visão Geral da Arquitetura

O sistema de monitoramento de usuários online é composto por **três camadas principais**:

```
┌─────────────────────────────────────────────────────────────┐
│                        FRONTEND                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  DashboardOverviewSection.tsx                        │  │
│  │  OnlineUsersMonitor.tsx                              │  │
│  │  ├─ useQuery: /api/admin/users/online (30s refresh) │  │
│  │  └─ useUnifiedWebSocket                              │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                            ▲
                            │ HTTP + WebSocket
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                        BACKEND                               │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  API Endpoints (admin.routes.ts)                     │  │
│  │  ├─ GET /api/admin/users/online                      │  │
│  │  └─ Middleware: authenticateAdmin                    │  │
│  │                                                        │  │
│  │  WebSocket Manager (websocket-manager.ts)            │  │
│  │  ├─ UnifiedWebSocketManager (singleton)              │  │
│  │  ├─ registerActiveSession()                          │  │
│  │  └─ getConnectedUsersInfo()                          │  │
│  │                                                        │  │
│  │  Session Manager (session-manager.service.ts)        │  │
│  │  ├─ createSession()                                  │  │
│  │  ├─ validateSession()                                │  │
│  │  └─ getSessionStats()                                │  │
│  │                                                        │  │
│  │  Auth Middleware (auth.ts)                           │  │
│  │  ├─ authenticateToken()                              │  │
│  │  └─ updateSessionActivity() [rate-limited: 2 min]   │  │
│  │                                                        │  │
│  │  Session Cleanup Service                             │  │
│  │  └─ cleanupInactiveSessions() [runs every 1h]       │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                            ▲
                            │ PostgreSQL
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                      DATABASE                                │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  user_sessions                                        │  │
│  │  ├─ userId (FK → users.id)                           │  │
│  │  ├─ sessionToken (unique)                            │  │
│  │  ├─ lastActivity (timestamp)                         │  │
│  │  ├─ expiresAt (timestamp)                            │  │
│  │  ├─ isActive (boolean)                               │  │
│  │  └─ ipAddress, userAgent                             │  │
│  │                                                        │  │
│  │  active_sessions                                      │  │
│  │  ├─ userId (FK → users.id)                           │  │
│  │  ├─ sessionId (unique)                               │  │
│  │  ├─ lastActivityAt (timestamp)                       │  │
│  │  ├─ connectedAt (timestamp)                          │  │
│  │  └─ ipAddress, city, country (geolocation)           │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. Banco de Dados

### 2.1. Tabela `user_sessions`
**Localização:** `shared/schema.ts` (linhas 187-199)

```typescript
export const userSessions = pgTable("user_sessions", {
  id: serial("id").primaryKey(),
  userId: integer("userId").references(() => users.id).notNull().unique(),
  sessionToken: text("session_token").notNull().unique(),
  ipAddress: text("ip_address").notNull(),
  lastActivity: timestamp("lastActivity").defaultNow().notNull(),
  userAgent: text("user_agent"),
  isActive: boolean("is_active").default(true).notNull(),
  loginAttempts: integer("login_attempts").default(0).notNull(),
  expiresAt: timestamp("expires_at"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});
```

**Características:**
- ✅ Constraint UNIQUE em `userId` (1 sessão por usuário)
- ✅ `lastActivity` é atualizado a cada request (rate-limited a cada 2 minutos)
- ✅ `isActive` marca sessões ativas
- ✅ `expiresAt` define expiração (24 horas)

### 2.2. Tabela `active_sessions`
**Localização:** `shared/schema.ts` (linhas 85-99)

```typescript
export const activeSessions = pgTable('active_sessions', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id).notNull(),
  sessionId: text('session_id').notNull().unique(),
  ipAddress: text('ip_address').notNull(),
  city: text('city'),
  country: text('country'),
  countryCode: text('country_code'),
  latitude: decimal('latitude', { precision: 10, scale: 7 }),
  longitude: decimal('longitude', { precision: 10, scale: 7 }),
  userAgent: text('user_agent'),
  deviceInfo: text('device_info'),
  connectedAt: timestamp('connected_at').defaultNow().notNull(),
  lastActivityAt: timestamp('last_activity_at').defaultNow().notNull(),
});
```

**Características:**
- ✅ Geolocalização (city, country, lat/long)
- ✅ Gerenciada pelo WebSocket Manager
- ✅ Criada quando usuário conecta via WebSocket
- ⚠️ **NÃO tem constraint UNIQUE em userId** (permite múltiplas sessões)

---

## 3. Backend - Gerenciamento de Sessões

### 3.1. SessionManagerService
**Localização:** `server/services/session-manager.service.ts`

#### Métodos principais:

##### `createSession(userId, role, ipAddress, userAgent)`
**Linhas 35-118**

```typescript
async createSession(userId, role, ipAddress, userAgent) {
  // 1. Adquire lock atômico PostgreSQL
  await tx.execute(sql`SELECT pg_advisory_xact_lock(${lockId})`);

  // 2. Busca sessão existente
  const existingSession = await tx.select().from(userSessions)...

  // 3. UPSERT (ON CONFLICT DO UPDATE)
  await tx.insert(userSessions).values({...})
    .onConflictDoUpdate({
      target: userSessions.userId,
      set: { sessionToken, expiresAt, ipAddress, ... }
    });

  // 4. Emite evento se sessão foi substituída
  if (existingSession.length > 0) {
    this.eventEmitter.emit('session:invalidated', {...});
  }
}
```

**Comportamento:**
- ✅ **FORÇA 1 ÚNICA SESSÃO por usuário** (UPSERT no `userId`)
- ✅ Lock atômico previne race conditions
- ✅ Emite evento WebSocket quando sessão é substituída

##### `validateSession(sessionToken)`
**Linhas 123-154**

```typescript
async validateSession(sessionToken) {
  const session = await db.query.userSessions.findFirst({
    where: and(
      eq(userSessions.sessionToken, sessionToken),
      eq(userSessions.isActive, true),
      sql`${userSessions.expiresAt} > NOW()`
    )
  });

  // Atualiza lastActivity
  await this.updateSessionActivity(sessionToken);
  return session;
}
```

**Comportamento:**
- ✅ Valida sessão ativa e não expirada
- ✅ Atualiza `lastActivity` automaticamente

##### `getSessionStats()`
**Linhas 226-256**

```typescript
async getSessionStats() {
  const stats = await db.select({
    total: sql<number>`COUNT(*)`,
    admins: sql<number>`COUNT(CASE WHEN ${users.role} IN ('admin', 'superadmin') THEN 1 END)`,
    users: sql<number>`COUNT(CASE WHEN ${users.role} NOT IN ('admin', 'superadmin') THEN 1 END)`
  })
  .from(userSessions)
  .innerJoin(users, eq(userSessions.userId, users.id))
  .where(
    and(
      eq(userSessions.isActive, true),
      sql`${userSessions.expiresAt} > NOW()`
    )
  );

  return {
    totalActive: stats[0]?.total || 0,
    adminSessions: stats[0]?.admins || 0,
    userSessions: stats[0]?.users || 0
  };
}
```

---

## 4. Backend - WebSocket Manager

### 4.1. UnifiedWebSocketManager
**Localização:** `server/services/websocket-manager.ts`

#### Classe Singleton
**Linhas 26-41**

```typescript
export class UnifiedWebSocketManager {
  private static instance: UnifiedWebSocketManager;
  private wss: WebSocketServer | null = null;
  private clients: Set<WebSocketClient> = new Set();
  private heartbeatInterval: NodeJS.Timeout | null = null;

  public static getInstance(): UnifiedWebSocketManager {
    if (!UnifiedWebSocketManager.instance) {
      UnifiedWebSocketManager.instance = new UnifiedWebSocketManager();
    }
    return UnifiedWebSocketManager.instance;
  }
}
```

#### `registerActiveSession(ws, userId)`
**Linhas 422-525**

```typescript
private async registerActiveSession(ws, userId) {
  // 1. Obter geolocalização do IP
  const location = await geoService.getLocationFromIP(ws.ipAddress);

  // 2. Verificar sessões ativas existentes (IPs únicos)
  const existingSessions = await db.select()
    .from(activeSessions)
    .where(eq(activeSessions.userId, userId));

  const uniqueIPs = new Set(existingSessions.map(s => s.ipAddress));

  // 3. Se novo IP e atingiu limite → remover IP mais antigo
  if (!uniqueIPs.has(ws.ipAddress) && currentIpCount >= maxIps) {
    // Remove sessão mais antiga
    await db.delete(activeSessions)...
    this.forceDisconnectByIP(userId.toString(), oldestSession.ipAddress);
  }

  // 4. Gerar session ID único: userId + IP
  const uniqueSessionId = `${userId}-${ws.ipAddress.replace(/[.:]/g, '_')}`;

  // 5. UPSERT sessão
  const [session] = await db.insert(activeSessions).values({
    userId, sessionId: uniqueSessionId, ipAddress, city, country, ...
  })
  .onConflictDoUpdate({
    target: activeSessions.sessionId,
    set: { lastActivityAt: new Date(), ... }
  })
  .returning();

  ws.dbSessionId = session.id;
}
```

**Comportamento:**
- ✅ Registra sessão WebSocket no banco (`active_sessions`)
- ✅ Geolocaliza IP do usuário
- ✅ Limita IPs simultâneos (padrão: 5)
- ✅ Remove IP mais antigo se limite for excedido

#### `getConnectedUsersInfo()`
**Linhas 351-360**

```typescript
public getConnectedUsersInfo() {
  const authenticatedClients = Array.from(this.clients)
    .filter(client => client.userId && client.email);

  const userEmails = authenticatedClients
    .map(client => client.email)
    .filter(Boolean);

  return {
    totalConnections: this.clients.size,
    authenticatedUsers: authenticatedClients.length,
    userEmails: Array.from(new Set(userEmails))
  };
}
```

**Comportamento:**
- ✅ Conta conexões WebSocket ativas
- ✅ Filtra usuários autenticados
- ✅ Retorna lista de emails únicos

### 4.2. SessionCleanupService
**Localização:** `server/services/session-cleanup.service.ts`

```typescript
private readonly CLEANUP_INTERVAL_MS = 60 * 60 * 1000; // 1 hora
private readonly SESSION_TIMEOUT_HOURS = 24;

private async cleanupInactiveSessions() {
  const timeoutDate = new Date(Date.now() - this.SESSION_TIMEOUT_HOURS * 60 * 60 * 1000);

  const result = await db.delete(activeSessions)
    .where(lt(activeSessions.lastActivityAt, timeoutDate))
    .returning({ id: activeSessions.id });
}
```

**Comportamento:**
- ✅ Roda a cada 1 hora
- ✅ Remove sessões inativas há mais de 24 horas
- ✅ Limpa apenas `active_sessions` (não `user_sessions`)

---

## 5. Backend - Endpoints API

### 5.1. GET `/api/admin/users/online`
**Localização:** `server/routes/admin.routes.ts` (linhas 167-370)

#### Fluxo do Endpoint:

```typescript
adminRouter.get('/users/online', authenticateAdmin, async (req, res) => {
  // 1️⃣ Define janela de tempo (30 minutos)
  const timeWindowStart = new Date(Date.now() - 30 * 60 * 1000);

  // 2️⃣ Busca sessões ativas do banco (user_sessions)
  const sessionsQuery = await db.select({
    userId: userSessions.userId,
    isActive: userSessions.isActive,
    lastActivity: userSessions.lastActivity,
    expiresAt: userSessions.expiresAt,
    createdAt: userSessions.createdAt,
    ipAddress: userSessions.ipAddress,
    userAgent: userSessions.userAgent,
  })
  .from(userSessions)
  .where(
    and(
      eq(userSessions.isActive, true),
      sql`${userSessions.expiresAt} > NOW()`
    )
  );

  // 3️⃣ Enriquece dados com informações de usuários
  const recentActiveUsers = await db.select({
    id: users.id,
    email: users.email,
    name: users.name,
    role: users.role,
    lastLoginAt: users.lastLoginAt,
    subscriptionPlan: users.subscriptionPlan,
    isAdmin: users.isAdmin,
    ipAddress: userSessions.ipAddress,
    userAgent: userSessions.userAgent,
    browser: sql<string>`CASE
      WHEN ${userSessions.userAgent} LIKE '%Chrome%' THEN 'Chrome'
      WHEN ${userSessions.userAgent} LIKE '%Firefox%' THEN 'Firefox'
      WHEN ${userSessions.userAgent} LIKE '%Safari%' THEN 'Safari'
      WHEN ${userSessions.userAgent} LIKE '%Edge%' THEN 'Edge'
      ELSE 'Unknown'
    END`,
    isSessionActive: userSessions.isActive,
    sessionCreatedAt: userSessions.createdAt,
    lastActivity: userSessions.lastActivity,
  })
  .from(users)
  .innerJoin(userSessions, eq(users.id, userSessions.userId))
  .where(
    and(
      eq(users.isApproved, true),
      eq(userSessions.isActive, true),
      sql`${userSessions.expiresAt} > NOW()`,
      // ⚠️ CRÍTICO: Filtro por janela de tempo
      sql`${userSessions.lastActivity} > ${timeWindowStart.toISOString()}`
    )
  )
  .orderBy(desc(userSessions.lastActivity))
  .limit(1000);

  // 4️⃣ Busca conexões WebSocket
  const wsManager = UnifiedWebSocketManager.getInstance();
  wsConnections = wsManager.getClientCount();
  wsDetails = wsManager.getConnectedUsersInfo();

  // 5️⃣ Mescla dados: DB + WebSocket
  const uniqueUsersMap = new Map();

  // Adiciona usuários do DB
  enrichedOnlineUsers.forEach(user => {
    if (user.id) uniqueUsersMap.set(user.id, user);
  });

  // Adiciona usuários do WebSocket (se não estão no DB)
  wsDetails.userEmails.forEach(email => {
    const existingUser = Array.from(uniqueUsersMap.values())
      .find(user => user.email === email);

    if (!existingUser) {
      uniqueUsersMap.set(`ws_${email}`, {
        id: `ws_${email}`,
        email,
        name: 'Online (WS)',
        role: 'guest',
        isOnline: true
      });
    }
  });

  totalOnline = uniqueUsersMap.size;

  // 6️⃣ Retorna resultado
  res.json({
    success: true,
    data: {
      totalOnline,
      wsConnections,
      authenticatedWsUsers: wsDetails.authenticatedUsers,
      wsUserEmails: wsDetails.userEmails,
      activeSessions: activeSessions.length,
      onlineUsers: Array.from(uniqueUsersMap.values()),
      timeWindow: '30 minutes',
      lastCheck: new Date().toISOString()
    }
  });
});
```

#### 🔍 **PONTO CRÍTICO IDENTIFICADO:**
**Linha 259:**
```typescript
sql`${userSessions.lastActivity} > ${timeWindowStart.toISOString()}`
```

**Problema:** Este filtro depende de `userSessions.lastActivity` estar atualizado. Se `lastActivity` não for atualizado recentemente, **usuários online não aparecerão**.

---

## 6. Frontend - Componentes

### 6.1. DashboardOverviewSection.tsx
**Localização:** `client/src/pages/admin/sections/DashboardOverviewSection.tsx`

#### Query de Usuários Online
**Linhas 31-47**

```typescript
const { data: onlineData, isLoading: onlineLoading, error: onlineError, refetch: refetchOnlineUsers } = useQuery({
  queryKey: ['/api/admin/users/online'],
  queryFn: async () => {
    return await apiRequest('/api/admin/users/online');
  },
  refetchInterval: 30000, // ✅ Refetch a cada 30 segundos
  staleTime: 15000,
  retry: 3,
  retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
  placeholderData: (previousData) => previousData,
  onError: (error) => {
    console.error('❌ Error fetching online users:', error);
  },
  onSuccess: (data) => {
    console.log('✅ Online users data received:', data);
  }
});
```

#### Exibição do Contador
**Linhas 201-222**

```typescript
<Card className="border-0 shadow-lg bg-gradient-to-br from-green-50 to-green-100">
  <CardContent className="p-6">
    <div className="flex items-center justify-between">
      <div className="space-y-2">
        <p className="text-sm font-medium text-green-600">Usuários Online</p>
        <p className="text-3xl font-bold text-green-900">
          {onlineLoading ? (
            <span className="animate-pulse">...</span>
          ) : (
            (onlineData as any)?.data?.totalOnline || 0
          )}
        </p>
        <Badge className="bg-green-200 text-green-800 text-xs">
          Tempo real
        </Badge>
      </div>
      <div className="p-3 bg-green-500 rounded-xl">
        <Activity className="h-8 w-8 text-white" />
      </div>
    </div>
  </CardContent>
</Card>
```

### 6.2. OnlineUsersMonitor.tsx
**Localização:** `client/src/components/OnlineUsersMonitor.tsx`

#### Query de Usuários
**Linhas 37-65**

```typescript
const { data: onlineData, isLoading, error, refetch } = useQuery<OnlineUsersData>({
  queryKey: ['/api/admin/users/online'],
  queryFn: async () => {
    console.log('🔍 Fetching online users data...');
    try {
      const response = await apiRequest('/api/admin/users/online');
      console.log('📊 Online users response:', response);
      return response;
    } catch (error) {
      console.error('❌ Error fetching online users:', error);
      return {
        success: false,
        data: {
          totalOnline: 0,
          wsConnections: 0,
          onlineUsers: [],
          timeWindow: '5 minutes',
          lastCheck: new Date().toISOString()
        },
        error: error.message
      };
    }
  },
  refetchInterval: 30000, // ✅ Refetch a cada 30 segundos
  staleTime: 15000,
  retry: 2,
  retryDelay: 2000,
});
```

#### Exibição de Métricas
**Linhas 152-187**

```typescript
<div className="grid grid-cols-2 md:grid-cols-5 gap-4">
  <div className="bg-green-50 p-4 rounded-lg">
    <div className="text-2xl font-bold text-green-600">
      {isLoading ? '...' : (onlineData?.data?.totalOnline || 0)}
    </div>
    <div className="text-sm text-green-600">Usuários Online</div>
  </div>

  <div className="bg-blue-50 p-4 rounded-lg">
    <div className="text-2xl font-bold text-blue-600">
      {isLoading ? '...' : (onlineData?.data?.onlineUsers?.length || 0)}
    </div>
    <div className="text-sm text-blue-600">Sessões DB</div>
  </div>

  <div className="bg-cyan-50 p-4 rounded-lg">
    <div className="text-2xl font-bold text-cyan-600">
      {isLoading ? '...' : (onlineData?.data?.wsConnections || 0)}
    </div>
    <div className="text-sm text-cyan-600">WebSocket</div>
  </div>

  <div className="bg-orange-50 p-4 rounded-lg">
    <div className="text-2xl font-bold text-orange-600">
      {onlineData?.data?.timeWindow || '5min'}
    </div>
    <div className="text-sm text-orange-600">Janela</div>
  </div>

  <div className="bg-purple-50 p-4 rounded-lg">
    <div className="text-2xl font-bold text-purple-600">
      {onlineData?.data?.lastCheck ? new Date(onlineData.data.lastCheck).toLocaleTimeString('pt-BR') : '--:--'}
    </div>
    <div className="text-sm text-purple-600">Última Check</div>
  </div>
</div>
```

---

## 7. Middleware de Autenticação

### 7.1. authenticateToken
**Localização:** `server/middleware/auth.ts` (linhas 89-319)

#### Rate Limiting de `lastActivity`
**Linhas 9-29**

```typescript
// ⚡ OTIMIZAÇÃO: Rate limiting para updates de lastActivity
// Atualiza a cada 2 minutos para manter dados de "usuários online" precisos
// sem sobrecarregar o banco
const SESSION_ACTIVITY_UPDATE_INTERVAL = 2 * 60 * 1000; // 2 minutos
const lastActivityUpdateMap = new Map<string, number>();

// Limpeza periódica do Map (a cada 10 minutos)
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

#### Atualização de `lastActivity` com Rate Limiting
**Linhas 278-296**

```typescript
// ✅ FIX: Atualizar lastActivity da sessão com rate limiting
// Atualiza apenas a cada 2 minutos (não em todo request)
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

#### 🔍 **PONTO CRÍTICO IDENTIFICADO:**

**Problema:** `lastActivity` é atualizado apenas a cada **2 minutos** (rate-limited).

**Impacto:**
- Se um usuário fizer login e ficar parado, `lastActivity` só será atualizado após **2 minutos**
- Se a janela de tempo do endpoint for **5 minutos**, usuários recém-logados podem não aparecer por até 2 minutos
- Se o usuário não fizer nenhuma requisição após o login, `lastActivity` ficará desatualizado

---

## 8. Fluxo de Dados Completo

### 8.1. Fluxo de Login e Criação de Sessão

```
1. Usuário faz login no Frontend
   ├─ Firebase Authentication
   └─ Token Firebase enviado ao Backend

2. Backend recebe token (authenticateToken middleware)
   ├─ Verifica token Firebase
   ├─ Busca usuário no DB
   └─ Valida sessão existente (se houver)

3. SessionManager.createSession() é chamado
   ├─ Adquire lock atômico
   ├─ UPSERT em user_sessions (1 sessão por userId)
   ├─ Define expiresAt = now + 24h
   ├─ Define lastActivity = now
   └─ Retorna sessionToken

4. Usuário conecta ao WebSocket
   ├─ Envia mensagem AUTHENTICATE com Firebase token
   ├─ WebSocketManager valida token
   ├─ registerActiveSession() é chamado
   │   ├─ Geolocaliza IP
   │   ├─ UPSERT em active_sessions
   │   └─ Define lastActivityAt = now
   └─ ws.dbSessionId = session.id
```

### 8.2. Fluxo de Atualização de Atividade

```
1. Usuário faz requisição ao Backend
   ├─ authenticateToken middleware intercepta
   ├─ Valida sessionToken
   └─ Rate limiting de lastActivity (2 minutos)
       ├─ Se passou 2 min → atualiza user_sessions.lastActivity
       └─ Se não → skip (performance)

2. WebSocket Heartbeat (a cada 30s)
   ├─ Cliente envia mensagem HEARTBEAT
   ├─ Servidor atualiza active_sessions.lastActivityAt
   └─ Responde com HEARTBEAT_ACK
```

### 8.3. Fluxo de Query no Admin Dashboard

```
1. Frontend: useQuery chama /api/admin/users/online
   ├─ Refetch interval: 30 segundos
   └─ Stale time: 15 segundos

2. Backend: GET /api/admin/users/online
   ├─ Define timeWindow = now - 30 minutos
   ├─ Query user_sessions:
   │   └─ WHERE isActive = true
   │       AND expiresAt > NOW()
   │       AND lastActivity > timeWindowStart ⚠️
   ├─ Query WebSocket connections
   ├─ Mescla dados (DB + WS)
   └─ Retorna totalOnline

3. Frontend: Atualiza componente
   ├─ DashboardOverviewSection: exibe contador
   └─ OnlineUsersMonitor: exibe lista + métricas
```

---

## 9. Análise do Problema

### 9.1. Sintomas Observados
- ✅ WebSocket Manager funcionando (conexões ativas)
- ✅ Sessões criadas no banco (`user_sessions`)
- ❌ Contador de usuários online mostrando **0** no admin
- ❌ Query `/api/admin/users/online` retornando lista vazia

### 9.2. Hipóteses Descartadas
1. ❌ **WebSocket não funciona** → Descartado (WS Manager reporta conexões)
2. ❌ **Sessões não são criadas** → Descartado (user_sessions tem registros)
3. ❌ **Frontend não faz query** → Descartado (logs mostram requests)

### 9.3. Causa Raiz Identificada

#### 🚨 **PROBLEMA PRINCIPAL: Rate Limiting + Janela de Tempo**

**Arquivo:** `server/middleware/auth.ts` (linhas 278-296)
**Arquivo:** `server/routes/admin.routes.ts` (linha 259)

**Cenário problemático:**

```
T=0s:    Usuário faz login
         └─ user_sessions.lastActivity = 2024-11-18 10:00:00

T=30s:   Frontend faz query /api/admin/users/online
         ├─ timeWindowStart = 2024-11-18 09:30:00 (30 min atrás)
         ├─ Query: WHERE lastActivity > 09:30:00
         └─ ✅ Usuário encontrado (lastActivity = 10:00:00)

T=120s:  Usuário não faz mais requests (rate limit = 2 min)
         └─ lastActivity permanece em 10:00:00

T=5min:  Frontend faz nova query /api/admin/users/online
         ├─ timeWindowStart = 2024-11-18 10:05:00
         ├─ Query: WHERE lastActivity > 10:05:00
         └─ ❌ Usuário NÃO encontrado (lastActivity = 10:00:00 < 10:05:00)
```

**Conclusão:**
- `lastActivity` é atualizado apenas a cada **2 minutos** (rate-limited)
- Janela de tempo é de **30 minutos**
- Se usuário ficar inativo por mais de 2 minutos, ele **desaparece** da lista

---

## 10. Possíveis Causas

### 10.1. ⚠️ Causa #1: Rate Limiting Excessivo
**Descrição:** `lastActivity` é atualizado apenas a cada 2 minutos, causando falsos negativos na query.

**Evidência:**
```typescript
// auth.ts, linha 11
const SESSION_ACTIVITY_UPDATE_INTERVAL = 2 * 60 * 1000; // 2 minutos
```

**Impacto:**
- Usuários inativos por >2 min desaparecem da lista
- Janela de tempo de 30 min não é confiável

### 10.2. ⚠️ Causa #2: Conflito entre Duas Tabelas
**Descrição:** Sistema usa **duas tabelas** para sessões:
- `user_sessions` (gerenciada por SessionManager)
- `active_sessions` (gerenciada por WebSocket Manager)

**Problema:**
- Query do admin usa **user_sessions**
- WebSocket atualiza **active_sessions**
- **Não há sincronização** entre as duas

**Evidência:**
```typescript
// admin.routes.ts, linha 186
const sessionsQuery = await db.select({...})
  .from(userSessions) // ❌ Não considera active_sessions

// websocket-manager.ts, linha 480
await db.insert(activeSessions).values({...}) // ❌ Tabela diferente
```

### 10.3. ⚠️ Causa #3: WebSocket Heartbeat Não Sincroniza
**Descrição:** WebSocket heartbeat atualiza `active_sessions.lastActivityAt`, mas não atualiza `user_sessions.lastActivity`.

**Evidência:**
```typescript
// websocket-manager.ts, linha 257
case 'HEARTBEAT':
  await this.updateSessionActivity(ws); // Atualiza active_sessions
  break;

// Mas em auth.ts, linha 291:
storage.updateSessionActivity(sessionTokenKey) // Atualiza user_sessions
```

**Resultado:** Duas fontes de verdade desconexas.

### 10.4. ⚠️ Causa #4: Janela de Tempo Inconsistente
**Descrição:** Endpoint usa janela de 30 minutos, mas rate limiting é de 2 minutos.

**Problema matemático:**
```
Janela de tempo: 30 minutos
Rate limiting: 2 minutos
Heartbeat WS: 30 segundos (mas atualiza tabela diferente)

Usuário pode desaparecer a cada 2-30 minutos se não fizer requests HTTP
```

---

## 🎯 Conclusão

### Problema Identificado:
O sistema de monitoramento de usuários online **não está funcionando** porque:

1. **Rate limiting excessivo** em `lastActivity` (2 minutos)
2. **Duas tabelas desconexas** (`user_sessions` vs `active_sessions`)
3. **WebSocket heartbeat não sincroniza** com `user_sessions`
4. **Query do admin ignora** conexões WebSocket ativas

### Próximos Passos Recomendados:
1. **Unificar fonte de verdade:** Usar apenas `active_sessions` OU sincronizar as duas tabelas
2. **Reduzir rate limiting:** De 2 minutos para 30 segundos (ou remover)
3. **Sincronizar heartbeat:** WebSocket heartbeat deve atualizar `user_sessions.lastActivity`
4. **Ajustar query do admin:** Considerar `active_sessions` na contagem de usuários online

---

**⚠️ IMPORTANTE:** Este é um diagnóstico. **NÃO faça alterações no código ainda**. Aguarde aprovação antes de implementar correções.
