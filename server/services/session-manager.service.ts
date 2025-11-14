import { db } from '../db';
import { userSessions, users } from '../../shared/schema';
import { eq, and, sql } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { logger } from '../utils/logger';
import { EventEmitter } from 'events';

export interface SessionResult {
  success: boolean;
  sessionToken?: string;
  expiresAt?: Date;
  message?: string;
  error?: string;
}

export interface SessionInfo {
  sessionToken: string;
  expiresAt: Date;
  userId: number;
  isActive: boolean;
  ipAddress?: string;
  userAgent?: string;
  lastActivity?: Date;
}

export class SessionManagerService {
  private readonly SESSION_DURATION = 24 * 60 * 60 * 1000; // 24 horas
  private readonly CLEANUP_BATCH_SIZE = 100;
  private readonly eventEmitter = new EventEmitter();

  /**
   * 🔐 Cria uma nova sessão com lock atômico para prevenir race conditions
   * REGRA RIGOROSA: Máximo UMA sessão ativa por usuário - SEM EXCEÇÕES
   */
  async createSession(
    userId: number, 
    role: string, 
    ipAddress?: string, 
    userAgent?: string
  ): Promise<SessionResult> {
    try {
      console.log(`[SessionManager] Creating session for user ID ${userId} with role: ${role}`);

      // ✅ LOCK ATÔMICO: Advisory lock do PostgreSQL
      const lockId = this.generateLockId(userId);

      return await db.transaction(async (tx) => {
        try {
          // 1. Adquirir lock exclusivo para este usuário
          await tx.execute(sql`SELECT pg_advisory_xact_lock(${lockId})`);
          console.log(`[SessionManager] Lock acquired for user ${userId}`);

          // 2. ✅ REGRA RIGOROSA: UPSERT com single session enforcement
          // Buscar sessão existente para notificar via WebSocket se houver substituição
          const existingSession = await tx.select().from(userSessions).where(eq(userSessions.userId, userId)).limit(1);

          // 3. Criar/atualizar sessão usando UPSERT com ON CONFLICT
          const sessionToken = this.generateSessionToken();
          const expiresAt = new Date(Date.now() + this.SESSION_DURATION);

          await tx.insert(userSessions).values({
            userId,
            sessionToken,
            expiresAt,
            isActive: true,
            ipAddress: ipAddress || '',
            userAgent: userAgent || '',
            lastActivity: new Date(),
            createdAt: new Date()
          }).onConflictDoUpdate({
            target: userSessions.userId,
            set: {
              sessionToken: sql`EXCLUDED.session_token`,
              expiresAt: sql`EXCLUDED.expires_at`,
              ipAddress: sql`EXCLUDED.ip_address`,
              userAgent: sql`EXCLUDED.user_agent`,
              lastActivity: sql`EXCLUDED.last_activity`,
              isActive: sql`EXCLUDED.is_active`
            }
          });

          // Emitir evento para notificar via WebSocket se havia sessão anterior
          if (existingSession.length > 0) {
            console.log(`[SessionManager] Session replaced for user ${userId} (${role}) - previous session invalidated`);
            this.eventEmitter.emit('session:invalidated', { 
              userId, 
              reason: 'session_replacement',
              sessionCount: 1,
              timestamp: new Date().toISOString()
            });
          }

          console.log(`[SessionManager] SINGLE session created for user ${userId} (${role}): ${sessionToken.substring(0, 10)}...`);

          return {
            success: true,
            sessionToken,
            expiresAt,
            message: `Single session enforced for ${role}`
          };

        } catch (error) {
          console.error(`[SessionManager] Error in transaction for user ${userId}:`, error);
          throw error;
        }
      });

    } catch (error: any) {
      console.error(`[SessionManager] Failed to create session for user ${userId}:`, error);
      logger.error('Session creation failed:', error);

      return {
        success: false,
        error: error.message || 'Failed to create session',
        message: 'Internal server error during session creation'
      };
    }
  }

  /**
   * 🔍 Valida uma sessão existente
   */
  async validateSession(sessionToken: string): Promise<SessionInfo | null> {
    try {
      const session = await db.query.userSessions.findFirst({
        where: and(
          eq(userSessions.sessionToken, sessionToken),
          eq(userSessions.isActive, true),
          sql`${userSessions.expiresAt} > NOW()`
        )
      });

      if (!session) {
        return null;
      }

      // Atualizar última atividade
      await this.updateSessionActivity(sessionToken);

      return {
        sessionToken: session.sessionToken,
        expiresAt: session.expiresAt || new Date(),
        userId: session.userId,
        isActive: session.isActive,
        ipAddress: session.ipAddress,
        userAgent: session.userAgent || undefined,
        lastActivity: session.lastActivity
      };

    } catch (error) {
      console.error('[SessionManager] Session validation error:', error);
      return null;
    }
  }

  /**
   * 🗑️ Invalida todas as sessões de um usuário
   */
  async invalidateUserSessions(userId: number): Promise<boolean> {
    try {
      const lockId = this.generateLockId(userId);

      return await db.transaction(async (tx) => {
        // Lock para evitar conflitos
        await tx.execute(sql`SELECT pg_advisory_xact_lock(${lockId})`);

        // Invalidar todas as sessões
        const result = await tx.update(userSessions)
          .set({ 
            isActive: false,
            lastActivity: new Date()
          })
          .where(eq(userSessions.userId, userId))
          .returning();

        console.log(`[SessionManager] Invalidated ${result.length} sessions for user ${userId}`);
        return true;
      });

    } catch (error) {
      console.error(`[SessionManager] Failed to invalidate sessions for user ${userId}:`, error);
      return false;
    }
  }

  /**
   * 🔄 Atualiza a última atividade de uma sessão
   */
  async updateSessionActivity(sessionToken: string): Promise<boolean> {
    try {
      await db.update(userSessions)
        .set({ lastActivity: new Date() })
        .where(eq(userSessions.sessionToken, sessionToken));

      return true;
    } catch (error) {
      console.error('[SessionManager] Failed to update session activity:', error);
      return false;
    }
  }

  /**
   * 🧹 Limpa sessões expiradas (para ser chamado periodicamente)
   */
  async cleanupExpiredSessions(): Promise<number> {
    try {
      const result = await db.delete(userSessions)
        .where(sql`${userSessions.expiresAt} <= NOW() OR ${userSessions.isActive} = false`)
        .returning();

      const cleanedCount = result.length;
      if (cleanedCount > 0) {
        console.log(`[SessionManager] Cleaned up ${cleanedCount} expired sessions`);
      }

      return cleanedCount;
    } catch (error) {
      console.error('[SessionManager] Failed to cleanup expired sessions:', error);
      return 0;
    }
  }

  /**
   * 📊 Obter estatísticas de sessões ativas
   */
  async getSessionStats(): Promise<{
    totalActive: number;
    adminSessions: number;
    userSessions: number;
  }> {
    try {
      const stats = await db
        .select({
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
    } catch (error) {
      console.error('[SessionManager] Failed to get session stats:', error);
      return { totalActive: 0, adminSessions: 0, userSessions: 0 };
    }
  }

  /**
   * 📡 Acesso ao Event Emitter para WebSocket notifications
   */
  getEventEmitter(): EventEmitter {
    return this.eventEmitter;
  }

  /**
   * 🚨 Invalidar sessão específica com notificação WebSocket
   */
  async invalidateSessionWithNotification(sessionToken: string, reason: string = 'manual'): Promise<boolean> {
    try {
      // Buscar sessão antes de invalidar para obter userId
      const session = await db.query.userSessions.findFirst({
        where: eq(userSessions.sessionToken, sessionToken)
      });

      if (!session) {
        console.log(`[SessionManager] Session not found for invalidation: ${sessionToken.substring(0, 10)}...`);
        return false;
      }

      // Invalidar sessão
      await db.update(userSessions)
        .set({ 
          isActive: false,
          lastActivity: new Date()
        })
        .where(eq(userSessions.sessionToken, sessionToken));

      console.log(`[SessionManager] Session invalidated: ${sessionToken.substring(0, 10)}... (reason: ${reason})`);

      // Emitir evento WebSocket
      this.eventEmitter.emit('session:invalidated', { 
        userId: session.userId, 
        reason,
        sessionToken: session.sessionToken.substring(0, 10) + '...',
        timestamp: new Date().toISOString()
      });

      return true;
    } catch (error) {
      console.error('[SessionManager] Failed to invalidate session with notification:', error);
      return false;
    }
  }

  /**
   * 🔧 Funções utilitárias privadas
   */
  private generateSessionToken(): string {
    return nanoid(32);
  }

  private generateLockId(userId: number): number {
    // Gerar ID único para lock baseado no userId
    // Usar hash simples para evitar conflitos
    return Math.abs(userId * 31 + 1000000);
  }

  /**
   * 🚨 Função de emergência para forçar limpeza de sessões duplicadas
   */
  async forceCleanupDuplicateSessions(): Promise<{ cleaned: number; errors: number }> {
    try {
      console.log('[SessionManager] Starting emergency cleanup of duplicate sessions...');

      let cleaned = 0;
      let errors = 0;

      // Buscar usuários com múltiplas sessões ativas
      const duplicateUsers = await db
        .select({
          userId: userSessions.userId,
          count: sql<number>`COUNT(*)`
        })
        .from(userSessions)
        .where(
          and(
            eq(userSessions.isActive, true),
            sql`${userSessions.expiresAt} > NOW()`
          )
        )
        .groupBy(userSessions.userId)
        .having(sql`COUNT(*) > 1`);

      for (const duplicate of duplicateUsers) {
        try {
          // Para cada usuário com sessões duplicadas, manter apenas a mais recente
          const sessions = await db
            .select()
            .from(userSessions)
            .where(
              and(
                eq(userSessions.userId, duplicate.userId),
                eq(userSessions.isActive, true),
                sql`${userSessions.expiresAt} > NOW()`
              )
            )
            .orderBy(sql`${userSessions.lastActivity} DESC`);

          if (sessions.length > 1) {
            // Manter apenas a primeira (mais recente)
            const sessionsToDelete = sessions.slice(1);

            for (const session of sessionsToDelete) {
              await db.update(userSessions)
                .set({ isActive: false })
                .where(eq(userSessions.sessionToken, session.sessionToken));

              cleaned++;
            }
          }
        } catch (error) {
          console.error(`[SessionManager] Error cleaning duplicates for user ${duplicate.userId}:`, error);
          errors++;
        }
      }

      console.log(`[SessionManager] Emergency cleanup completed: ${cleaned} duplicates cleaned, ${errors} errors`);
      return { cleaned, errors };

    } catch (error) {
      console.error('[SessionManager] Emergency cleanup failed:', error);
      return { cleaned: 0, errors: 1 };
    }
  }
}

// Exportar instância singleton
export const sessionManager = new SessionManagerService();