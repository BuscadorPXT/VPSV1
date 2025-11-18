import { WebSocket, WebSocketServer } from 'ws';
import { IncomingMessage } from 'http';
import { GeolocationService } from './geolocation.service';
import { db } from '../db';
import { activeSessions, users, userSessions } from '@shared/schema';
import { eq, and, desc } from 'drizzle-orm';

interface WebSocketClient extends WebSocket {
  userId?: string;
  sessionId?: string;
  isAlive?: boolean;
  email?: string;
  firebaseUid?: string;
  ipAddress?: string;
  userAgent?: string;
  dbSessionId?: number;
}

interface WebSocketMessage {
  type: string;
  timestamp: string;
  data?: any;
  userId?: string;
}

export class UnifiedWebSocketManager {
  private static instance: UnifiedWebSocketManager;
  private wss: WebSocketServer | null = null;
  private clients: Set<WebSocketClient> = new Set();
  private heartbeatInterval: NodeJS.Timeout | null = null;

  private constructor() {
    this.setupHeartbeat();
  }

  public static getInstance(): UnifiedWebSocketManager {
    if (!UnifiedWebSocketManager.instance) {
      UnifiedWebSocketManager.instance = new UnifiedWebSocketManager();
    }
    return UnifiedWebSocketManager.instance;
  }

  public initialize(server: any): void {
    if (this.wss) {
      console.log('🔌 WebSocket server already initialized');
      return;
    }

    // Initialize WebSocket server
    this.wss = new WebSocketServer({ 
      server: server,
      host: '0.0.0.0',
      path: '/ws'
    });

    this.wss.on('connection', (ws: WebSocketClient, request: IncomingMessage) => {
      console.log('🔌 New WebSocket connection established');

      // Captura IP e user agent da conexão
      ws.ipAddress = this.getClientIP(request);
      ws.userAgent = request.headers['user-agent'] || 'Unknown';

      ws.isAlive = true;
      this.clients.add(ws);

      console.log(`📍 Client IP: ${ws.ipAddress}, User Agent: ${ws.userAgent}`);

      // Handle pong responses for heartbeat
      ws.on('pong', () => {
        ws.isAlive = true;
      });

      ws.on('message', async (data: Buffer) => {
        try {
          const message = JSON.parse(data.toString());
          await this.handleMessage(ws, message);
        } catch (error) {
          console.error('❌ WebSocket message parsing error:', error);
        }
      });

      ws.on('close', async () => {
        console.log('🔌 WebSocket connection closed');
        this.clients.delete(ws);
        
        // Remove sessão ativa do banco
        if (ws.dbSessionId) {
          try {
            await db.delete(activeSessions).where(eq(activeSessions.id, ws.dbSessionId));
            console.log(`🗑️ Session ${ws.dbSessionId} removed from database`);
          } catch (error) {
            console.error('❌ Error removing session from database:', error);
          }
        }
      });

      ws.on('error', (error) => {
        console.error('❌ WebSocket error:', error);
        this.clients.delete(ws);
      });

      // Send welcome message
      this.sendToClient(ws, {
        type: 'CONNECTION_ESTABLISHED',
        timestamp: new Date().toISOString(),
        data: { status: 'connected' }
      });
    });

    console.log('✅ WebSocket server initialized');
  }

  private async handleAuthentication(ws: WebSocketClient, message: any): Promise<void> {
    try {
      const { firebaseToken, firebaseUid, email, userId } = message;

      console.log(`🔐 [WebSocket Auth] Authenticating user: ${email} (${firebaseUid})`);

      if (!firebaseToken || !firebaseUid) {
        console.warn('⚠️ [WebSocket Auth] Missing Firebase token or UID:', {
          hasToken: !!firebaseToken,
          hasUid: !!firebaseUid,
          email,
          userId
        });

        // For testing purposes, allow connection but mark as unauthenticated
        if (process.env.NODE_ENV === 'development') {
          console.log('🧪 [WebSocket Auth] Development mode - allowing unauthenticated connection for testing');
          ws.userId = userId || 'test-user';
          ws.email = email || 'test@example.com';
          ws.firebaseUid = firebaseUid || 'test-uid';

          this.sendToClient(ws, {
            type: 'AUTH_WARNING',
            timestamp: new Date().toISOString(),
            data: { 
              warning: 'Connected without full authentication (development mode)',
              userId: ws.userId
            }
          });
          return;
        }

        this.sendToClient(ws, {
          type: 'AUTH_ERROR',
          timestamp: new Date().toISOString(),
          data: { 
            error: 'Missing authentication credentials'
          }
        });
        return;
      }

      // Validate Firebase token
      try {
        const { verifyIdToken } = await import('./firebase-admin');
        const decodedToken = await verifyIdToken(firebaseToken);

        if (decodedToken.uid !== firebaseUid) {
          console.error('❌ [WebSocket Auth] Token UID mismatch');
          this.sendToClient(ws, {
            type: 'AUTH_ERROR',
            timestamp: new Date().toISOString(),
            data: { 
              error: 'Authentication token mismatch'
            }
          });
          return;
        }

        console.log(`✅ [WebSocket Auth] Firebase token validated for: ${email}`);

        // Buscar user ID numérico do banco de dados usando firebaseUid
        let numericUserId = userId;
        if (!numericUserId || typeof numericUserId === 'string') {
          const userRecord = await db.query.users.findFirst({
            where: eq(users.firebaseUid, firebaseUid),
            columns: { id: true }
          });
          numericUserId = userRecord?.id;
        }

        if (!numericUserId) {
          console.error(`❌ [WebSocket Auth] Could not find user ID for Firebase UID: ${firebaseUid}`);
          this.sendToClient(ws, {
            type: 'AUTH_ERROR',
            timestamp: new Date().toISOString(),
            data: { 
              error: 'User not found in database'
            }
          });
          return;
        }

        // Set client properties
        ws.userId = numericUserId;
        ws.sessionId = firebaseToken;
        ws.email = email;
        ws.firebaseUid = firebaseUid;

        console.log(`🔐 WebSocket client authenticated: ${numericUserId} (${email})`);

        // Registrar sessão ativa no banco com geolocalização
        await this.registerActiveSession(ws, numericUserId);

        // Send success confirmation
        this.sendToClient(ws, {
          type: 'SESSION_REGISTERED',
          timestamp: new Date().toISOString(),
          data: { 
            status: 'authenticated',
            userId: ws.userId,
            message: 'WebSocket session registered successfully'
          }
        });

      } catch (tokenError) {
        console.error('❌ [WebSocket Auth] Firebase token validation failed:', tokenError);
        this.sendToClient(ws, {
          type: 'AUTH_ERROR',
          timestamp: new Date().toISOString(),
          data: { 
            error: 'Invalid authentication token'
          }
        });
      }

    } catch (error) {
      console.error('❌ [WebSocket Auth] Authentication error:', error);
      this.sendToClient(ws, {
        type: 'AUTH_ERROR',
        timestamp: new Date().toISOString(),
        data: { 
          error: 'Authentication failed'
        }
      });
    }
  }

  private async handleMessage(ws: WebSocketClient, message: any): Promise<void> {
    switch (message.type) {
      case 'PING':
        this.sendToClient(ws, {
          type: 'PONG',
          timestamp: new Date().toISOString()
        });
        break;

      case 'AUTHENTICATE':
      case 'REGISTER_SESSION':
        await this.handleAuthentication(ws, message);
        break;

      case 'HEARTBEAT':
        ws.isAlive = true;
        // Atualiza lastActivityAt da sessão
        await this.updateSessionActivity(ws);
        this.sendToClient(ws, {
          type: 'HEARTBEAT_ACK',
          timestamp: new Date().toISOString()
        });
        break;

      default:
        console.log('📨 Unknown WebSocket message type:', message.type);
    }
  }

  public broadcastToAll(message: WebSocketMessage): void {
    if (!this.wss || this.clients.size === 0) {
      console.log('⚠️ No WebSocket clients to broadcast to');
      return;
    }

    console.log(`📡 Broadcasting to ${this.clients.size} WebSocket clients:`, message.type);

    const messageString = JSON.stringify(message);
    let successCount = 0;
    let errorCount = 0;

    this.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        try {
          client.send(messageString);
          successCount++;
        } catch (error) {
          console.error('❌ Failed to send message to client:', error);
          errorCount++;
          this.clients.delete(client);
        }
      } else {
        this.clients.delete(client);
      }
    });

    console.log(`📡 Broadcast complete: ${successCount} sent, ${errorCount} failed`);
  }

  public sendToUser(userId: string, message: WebSocketMessage): void {
    const userClients = Array.from(this.clients).filter(client => client.userId === userId);

    if (userClients.length === 0) {
      console.log(`⚠️ No WebSocket clients found for user: ${userId}`);
      return;
    }

    const messageString = JSON.stringify(message);
    userClients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        try {
          client.send(messageString);
        } catch (error) {
          console.error('❌ Failed to send message to user client:', error);
          this.clients.delete(client);
        }
      }
    });
  }

  private sendToClient(client: WebSocketClient, message: WebSocketMessage): void {
    if (client.readyState === WebSocket.OPEN) {
      try {
        client.send(JSON.stringify(message));
      } catch (error) {
        console.error('❌ Failed to send message to client:', error);
        this.clients.delete(client);
      }
    }
  }

  private setupHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      this.clients.forEach((client) => {
        if (client.isAlive === false) {
          console.log('💔 Removing dead WebSocket client');
          this.clients.delete(client);
          return client.terminate();
        }

        client.isAlive = false;
        client.ping();
      });
    }, 30000); // 30 seconds
  }

  public getClientCount(): number {
    return this.clients.size;
  }

  public getConnectedUsersInfo(): { totalConnections: number; authenticatedUsers: number; userEmails: string[] } {
    const authenticatedClients = Array.from(this.clients).filter(client => client.userId && client.email);
    const userEmails = authenticatedClients.map(client => client.email).filter(Boolean) as string[];

    return {
      totalConnections: this.clients.size,
      authenticatedUsers: authenticatedClients.length,
      userEmails: Array.from(new Set(userEmails)) // Remove duplicates
    };
  }

  public broadcastSheetUpdate(data: { dataReferencia: string; supplierName?: string; productType?: string }): void {
    console.log('📊 Broadcasting sheet update notification:', data);
    console.log(`📊 Current WebSocket clients: ${this.clients.size}`);
    console.log(`📊 Authenticated clients:`, Array.from(this.clients).filter(c => c.userId).length);
    console.log(`📊 Clients details:`, Array.from(this.clients).map(c => ({
      userId: c.userId,
      email: c.email,
      readyState: c.readyState,
      isAlive: c.isAlive
    })));
    
    this.broadcastToAll({
      type: 'SHEET_UPDATE',
      timestamp: new Date().toISOString(),
      data: {
        dataReferencia: data.dataReferencia,
        supplierName: data.supplierName || 'Fornecedor',
        productType: data.productType || 'produtos',
        message: `${data.supplierName || 'Fornecedor'} enviou a lista`
      }
    });
  }

  public broadcastToUser(userId: string, message: WebSocketMessage): void {
    this.sendToUser(userId, message);
  }

  public forceDisconnectByIP(userId: string, ipAddress: string): void {
    const clientsToDisconnect = Array.from(this.clients).filter(
      client => client.userId === userId && client.ipAddress === ipAddress
    );

    if (clientsToDisconnect.length === 0) {
      console.log(`ℹ️ No active WebSocket connections found for user ${userId} with IP ${ipAddress}`);
      return;
    }

    console.log(`🔌 Forcing disconnect of ${clientsToDisconnect.length} connection(s) for user ${userId} from IP ${ipAddress}`);

    clientsToDisconnect.forEach(client => {
      try {
        // Enviar mensagem de desconexão antes de fechar
        this.sendToClient(client, {
          type: 'SESSION_LIMIT_EXCEEDED',
          timestamp: new Date().toISOString(),
          data: {
            reason: 'ip_limit_exceeded',
            message: 'Sua sessão foi encerrada porque o limite de IPs simultâneos foi atingido.'
          }
        });

        // Fechar conexão
        client.close(1000, 'IP limit exceeded');
        this.clients.delete(client);
      } catch (error) {
        console.error(`❌ Error disconnecting client from IP ${ipAddress}:`, error);
      }
    });
  }

  private async registerActiveSession(ws: WebSocketClient, userId: number): Promise<void> {
    try {
      if (!ws.ipAddress || !userId) {
        console.warn('⚠️ Cannot register session: missing IP or userId');
        return;
      }

      // 1. Buscar configuração do usuário
      const user = await db.query.users.findFirst({
        where: eq(users.id, userId),
        columns: { maxConcurrentIps: true, email: true }
      });

      const maxIps = user?.maxConcurrentIps || 5;
      console.log(`🔒 [IP Limit] User ${userId} limit: ${maxIps} concurrent IPs`);

      // 2. Obter geolocalização do IP
      const geoService = GeolocationService.getInstance();
      const location = await geoService.getLocationFromIP(ws.ipAddress);

      // 3. Verificar sessões ativas existentes (IPs únicos)
      const existingSessions = await db
        .select()
        .from(activeSessions)
        .where(eq(activeSessions.userId, userId))
        .orderBy(desc(activeSessions.lastActivityAt));

      const uniqueIPs = new Set(existingSessions.map(s => s.ipAddress));
      const currentIpCount = uniqueIPs.size;

      console.log(`📊 [IP Limit] User ${userId} currently has ${currentIpCount} unique IPs active`);

      // 4. Se novo IP e atingiu limite → remover IP mais antigo
      if (!uniqueIPs.has(ws.ipAddress) && currentIpCount >= maxIps) {
        console.warn(`⚠️ [IP Limit] User ${userId} exceeded limit (${currentIpCount}/${maxIps}). Removing oldest IP...`);
        
        // Encontrar sessão mais antiga (último IP da lista ordenada)
        const oldestSession = existingSessions[existingSessions.length - 1];
        
        if (oldestSession) {
          // Deletar todas as sessões desse IP antigo
          await db.delete(activeSessions)
            .where(and(
              eq(activeSessions.userId, userId),
              eq(activeSessions.ipAddress, oldestSession.ipAddress)
            ));

          // Forçar desconexão WebSocket do IP antigo
          this.forceDisconnectByIP(userId.toString(), oldestSession.ipAddress);

          console.log(`🗑️ [IP Limit] Removed oldest IP: ${oldestSession.ipAddress} from ${oldestSession.city}, ${oldestSession.country}`);
        }
      }

      // 5. Gerar session ID único baseado em userId + IP
      const uniqueSessionId = `${userId}-${ws.ipAddress.replace(/[.:]/g, '_')}`;

      // 6. Registrar nova sessão (UPSERT)
      const [session] = await db.insert(activeSessions).values({
        userId: userId,
        sessionId: uniqueSessionId,
        ipAddress: ws.ipAddress,
        city: location.city,
        country: location.country,
        countryCode: location.countryCode,
        latitude: location.latitude,
        longitude: location.longitude,
        userAgent: ws.userAgent || null,
        deviceInfo: this.extractDeviceInfo(ws.userAgent || ''),
      })
      .onConflictDoUpdate({
        target: activeSessions.sessionId,
        set: {
          lastActivityAt: new Date(),
          userAgent: ws.userAgent || null,
          deviceInfo: this.extractDeviceInfo(ws.userAgent || ''),
        }
      })
      .returning();

      ws.dbSessionId = session.id;

      console.log(`✅ Active session registered: ID ${session.id} for user ${userId} from ${location.city}, ${location.country}`);

      // 7. Emitir evento de nova sessão detectada (notificar outras abas do usuário)
      if (!uniqueIPs.has(ws.ipAddress)) {
        this.broadcastToUser(userId.toString(), {
          type: 'NEW_SESSION_DETECTED',
          timestamp: new Date().toISOString(),
          data: {
            ipAddress: ws.ipAddress,
            city: location.city,
            country: location.country,
            deviceInfo: this.extractDeviceInfo(ws.userAgent || ''),
            message: `Novo acesso detectado de ${location.city}, ${location.country}`
          }
        });
        console.log(`📢 [Session Alert] Notified user ${userId} about new IP: ${ws.ipAddress}`);
      }

    } catch (error) {
      console.error('❌ Error registering active session:', error);
    }
  }

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

  private getClientIP(request: IncomingMessage): string {
    const xForwardedFor = request.headers['x-forwarded-for'];
    const ip = (Array.isArray(xForwardedFor) ? xForwardedFor[0] : xForwardedFor?.split(',')[0]) ||
      request.headers['x-real-ip'] as string ||
      request.socket?.remoteAddress ||
      'unknown';
    
    // Remove prefixo IPv6 se presente
    return ip.replace(/^::ffff:/, '');
  }

  private extractDeviceInfo(userAgent: string): string {
    // Extrai informações básicas do device do user agent
    if (userAgent.includes('iPhone')) return 'iPhone';
    if (userAgent.includes('iPad')) return 'iPad';
    if (userAgent.includes('Android')) return 'Android';
    if (userAgent.includes('Windows')) return 'Windows';
    if (userAgent.includes('Mac')) return 'Mac';
    if (userAgent.includes('Linux')) return 'Linux';
    return 'Unknown';
  }

  public shutdown(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }

    this.clients.forEach(client => {
      client.close();
    });

    if (this.wss) {
      this.wss.close();
    }
  }
}