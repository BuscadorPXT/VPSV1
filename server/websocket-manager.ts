import { WebSocket } from 'ws';
import { sessionManager } from './services/session-manager.service';
import { logger } from './utils/logger';

interface UserWebSocketConnection {
  ws: WebSocket;
  userId: string;
  sessionToken?: string;
  connectedAt: Date;
  lastPing: Date;
}

// Map para armazenar conexões ativas por usuário
const userConnections = new Map<string, UserWebSocketConnection[]>();

// Configurações de limite
const MAX_CONNECTIONS_PER_USER = 1;
const MAX_TOTAL_CONNECTIONS = 100;
const INACTIVE_TIMEOUT = 2 * 60 * 1000; // 2 minutos

/**
 * Registra uma nova conexão WebSocket para um usuário
 */
export function registerUserConnection(userId: string, ws: WebSocket, sessionToken?: string) {
  // Verificar limite total de conexões
  const totalConnections = Array.from(userConnections.values()).reduce((total, connections) => total + connections.length, 0);
  if (totalConnections >= MAX_TOTAL_CONNECTIONS) {
    console.log(`[WebSocket Manager] Max total connections reached (${MAX_TOTAL_CONNECTIONS}), rejecting new connection for user ${userId}`);
    ws.close(1013, 'Server overloaded');
    return;
  }

  // Verificar limite por usuário
  const existingConnections = userConnections.get(userId) || [];
  if (existingConnections.length >= MAX_CONNECTIONS_PER_USER) {
    console.log(`[WebSocket Manager] Max connections per user reached (${MAX_CONNECTIONS_PER_USER}), closing oldest connection for user ${userId}`);
    // Fechar a conexão mais antiga
    const oldestConnection = existingConnections[0];
    oldestConnection.ws.close(1000, 'New connection established');
    existingConnections.shift();
  }

  const connection: UserWebSocketConnection = {
    ws,
    userId,
    sessionToken,
    connectedAt: new Date(),
    lastPing: new Date()
  };

  if (!userConnections.has(userId)) {
    userConnections.set(userId, []);
  }

  userConnections.get(userId)!.push(connection);
  console.log(`[WebSocket Manager] User ${userId} connected. Total connections: ${userConnections.get(userId)!.length}`);

  // Configurar cleanup quando a conexão for fechada
  ws.on('close', () => {
    removeUserConnection(userId, ws);
  });

  ws.on('error', () => {
    removeUserConnection(userId, ws);
  });

  // Enviar confirmação de registro
  try {
    ws.send(JSON.stringify({
      type: 'session_registered',
      message: 'WebSocket session monitoring ativo',
      timestamp: new Date().toISOString()
    }));
  } catch (error) {
    console.error('[WebSocket Manager] Error sending registration confirmation:', error);
  }
}

/**
 * Remove uma conexão WebSocket de um usuário
 */
function removeUserConnection(userId: string, ws: WebSocket) {
  const connections = userConnections.get(userId);
  if (!connections) return;

  const index = connections.findIndex(conn => conn.ws === ws);
  if (index > -1) {
    connections.splice(index, 1);
    console.log(`[WebSocket Manager] User ${userId} disconnected. Remaining connections: ${connections.length}`);

    if (connections.length === 0) {
      userConnections.delete(userId);
      console.log(`[WebSocket Manager] No more connections for user ${userId}`);
    }
  }
}

/**
 * Envia uma mensagem para todas as conexões de um usuário específico
 */
export const broadcastToUserChannel = (userId: string, message: any) => {
  const userSockets = userConnections.get(userId) || [];

  if (userSockets.length === 0) {
    console.log(`[WebSocket Manager] No active connections for user ${userId}`);
    return false;
  }

  const messageStr = JSON.stringify(message);
  let successCount = 0;

  userSockets.forEach(connection => {
    const ws = connection.ws;
    if (ws.readyState === WebSocket.OPEN) {
      try {
        ws.send(messageStr);
        successCount++;

        // Para avisos emergenciais, log adicional
        if (message.type === 'emergency_alert') {
          console.log(`🚨 [WebSocket Manager] Emergency alert sent to user ${userId}:`, message.data.title);
        }
      } catch (error) {
        console.error(`[WebSocket Manager] Error sending message to user ${userId}:`, error);
        // Remove conexão inválida
        removeUserConnection(userId, ws);
      }
    } else {
      // Remove conexão fechada
      removeUserConnection(userId, ws);
    }
  });

  console.log(`[WebSocket Manager] Sent to ${successCount}/${userSockets.length} connections for user ${userId}`);
  return successCount > 0;
};

/**
 * Envia uma mensagem para TODOS os usuários conectados
 */
export async function broadcastToAllUsers(message: any) {
  const totalConnections = Array.from(userConnections.values()).reduce((total, connections) => total + connections.length, 0);
  console.log(`[WebSocket Manager] Broadcasting to all users - Total clients connected: ${totalConnections}`);

  if (totalConnections === 0) {
    console.log(`[WebSocket Manager] No clients connected - broadcast skipped`);
    return 0;
  }

  let totalSent = 0;
  const promises: Promise<void>[] = [];

  for (const [userId, connections] of userConnections.entries()) {
    const promise = broadcastToUserChannel(userId, message).then(() => {
      totalSent += connections.length;
    }).catch(error => {
      console.error(`[WebSocket Manager] Error broadcasting to user ${userId}:`, error);
    });
    promises.push(promise);
  }

  await Promise.allSettled(promises);
  console.log(`[WebSocket Manager] Broadcast completed: ${totalSent} connections notified`);
  return totalSent;
}

// Métodos auxiliares para o WebSocket Manager
const wsManager = {
  getUserSockets: (userId: string): WebSocket[] => {
    return userConnections.get(userId)?.map(conn => conn.ws) || [];
  },

  getAllConnections: (): Array<{ ws: WebSocket; userId: string }> => {
    const allConnections: Array<{ ws: WebSocket; userId: string }> = [];

    userConnections.forEach((sockets, userId) => {
      sockets.forEach(connection => {
        allConnections.push({ ws: connection.ws, userId });
      });
    });

    return allConnections;
  }
};

// Função específica para broadcast de avisos emergenciais
export const broadcastEmergencyAlert = (alertData: any): number => {
  console.log('🚨 [WebSocket Manager] Broadcasting emergency alert to all users:', alertData.title);

  // Debug: verificar conexões ativas
  console.log(`📊 [WebSocket Manager] Total users in userConnections: ${userConnections.size}`);

  if (userConnections.size === 0) {
    console.log('⚠️ [WebSocket Manager] No users connected');
    return 0;
  }

  let totalSent = 0;
  let totalConnections = 0;

  try {
    // Iterar sobre todas as conexões de usuário
    userConnections.forEach((connections, userId) => {
      console.log(`👤 [WebSocket Manager] User ${userId} has ${connections.length} connections`);

      connections.forEach((connection) => {
        totalConnections++;

        if (connection.ws.readyState === WebSocket.OPEN) {
          try {
            const message = {
              type: 'emergency_alert',
              data: alertData,
              timestamp: new Date().toISOString()
            };

            connection.ws.send(JSON.stringify(message));
            totalSent++;
            console.log(`✅ [WebSocket Manager] Emergency alert sent to user ${userId}`);
          } catch (error) {
            console.error(`❌ [WebSocket Manager] Error sending to user ${userId}:`, error);
            // Remove conexão com erro
            removeUserConnection(userId, connection.ws);
          }
        } else {
          console.log(`⚠️ [WebSocket Manager] Skipping closed connection for user ${userId} (readyState: ${connection.ws.readyState})`);
          // Remove conexão fechada
          removeUserConnection(userId, connection.ws);
        }
      });
    });

    console.log(`🚨 [WebSocket Manager] Emergency alert broadcasted to ${totalSent} of ${totalConnections} total connections`);
    return totalSent;

  } catch (error) {
    console.error('❌ [WebSocket Manager] Error in broadcastEmergencyAlert:', error);
    return 0;
  }
};


/**
 * Lista usuários conectados (para debug)
 */
export function getConnectedUsers(): string[] {
  return Array.from(userConnections.keys());
}

/**
 * Obtém estatísticas das conexões
 */
export function getConnectionStats() {
  const totalConnections = Array.from(userConnections.values()).reduce((total, connections) => total + connections.length, 0);
  return {
    totalUsers: userConnections.size,
    totalConnections,
    userConnections: Array.from(userConnections.entries()).map(([userId, connections]) => ({
      userId,
      connectionCount: connections.length,
      lastActivity: Math.max(...connections.map(c => c.lastPing.getTime()))
    }))
  };
}

/**
 * Cleanup de conexões inativas (executar periodicamente)
 */
export function cleanupInactiveConnections() {
  const now = new Date();
  const maxInactiveTime = INACTIVE_TIMEOUT;

  for (const [userId, connections] of userConnections.entries()) {
    const activeConnections = connections.filter(conn => {
      const isInactive = now.getTime() - conn.lastPing.getTime() > maxInactiveTime;
      if (isInactive) {
        console.log(`[WebSocket Manager] Removing inactive connection for user ${userId}`);
        try {
          conn.ws.close();
        } catch (error) {
          // Ignorar erros ao fechar conexões inativas
        }
        return false;
      }
      return true;
    });

    if (activeConnections.length !== connections.length) {
      if (activeConnections.length === 0) {
        userConnections.delete(userId);
      } else {
        userConnections.set(userId, activeConnections);
      }
    }
  }
}

// Executar cleanup a cada 30 segundos (mais agressivo)
setInterval(cleanupInactiveConnections, 30 * 1000);

/**
 * 🚨 Configurar listener para eventos de invalidação de sessão
 */
function setupSessionInvalidationListener() {
  const eventEmitter = sessionManager.getEventEmitter();

  eventEmitter.on('session:invalidated', async (data) => {
    const { userId, reason, sessionCount, timestamp } = data;

    console.log(`[WebSocket Manager] Session invalidation event received for user ${userId}, reason: ${reason}`);

    // Determinar mensagem baseada na razão
    let message = 'Sua sessão foi encerrada.';
    let title = 'Sessão Encerrada';

    switch (reason) {
      case 'new_login':
        message = 'Sua sessão foi encerrada porque você fez login em outro dispositivo.';
        title = 'Login em Outro Dispositivo';
        break;
      case 'manual':
        message = 'Sua sessão foi encerrada por um administrador.';
        title = 'Sessão Encerrada pelo Administrador';
        break;
      case 'security':
        message = 'Sua sessão foi encerrada por motivos de segurança.';
        title = 'Sessão Encerrada - Segurança';
        break;
      case 'expired':
        message = 'Sua sessão expirou.';
        title = 'Sessão Expirada';
        break;
    }

    // Enviar notificação via WebSocket
    await broadcastToUserChannel(userId.toString(), {
      type: 'session_terminated',
      data: {
        reason,
        message,
        title,
        timestamp,
        forceLogout: true
      }
    });
  });

  console.log('✅ [WebSocket Manager] Session invalidation listener configured');
}

// Inicializar listener
setupSessionInvalidationListener();