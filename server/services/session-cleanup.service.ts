import { db } from '../db';
import { activeSessions } from '@shared/schema';
import { lt, sql } from 'drizzle-orm';

export class SessionCleanupService {
  private static instance: SessionCleanupService;
  private cleanupInterval: NodeJS.Timeout | null = null;
  private readonly CLEANUP_INTERVAL_MS = 60 * 60 * 1000; // 1 hora
  private readonly SESSION_TIMEOUT_HOURS = 24; // 24 horas

  private constructor() {}

  public static getInstance(): SessionCleanupService {
    if (!SessionCleanupService.instance) {
      SessionCleanupService.instance = new SessionCleanupService();
    }
    return SessionCleanupService.instance;
  }

  public start(): void {
    if (this.cleanupInterval) {
      console.log('🧹 Session cleanup service already running');
      return;
    }

    console.log(`🧹 Starting session cleanup service (runs every ${this.CLEANUP_INTERVAL_MS / 1000 / 60} minutes)`);
    
    // Executa imediatamente ao iniciar
    this.cleanupInactiveSessions();

    // Agenda execução periódica
    this.cleanupInterval = setInterval(() => {
      this.cleanupInactiveSessions();
    }, this.CLEANUP_INTERVAL_MS);
  }

  public stop(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
      console.log('🧹 Session cleanup service stopped');
    }
  }

  private async cleanupInactiveSessions(): Promise<void> {
    try {
      const timeoutDate = new Date(Date.now() - this.SESSION_TIMEOUT_HOURS * 60 * 60 * 1000);
      
      console.log(`🧹 [Session Cleanup] Running cleanup for sessions inactive since ${timeoutDate.toISOString()}`);

      // Remove sessões inativas
      const result = await db
        .delete(activeSessions)
        .where(lt(activeSessions.lastActivityAt, timeoutDate))
        .returning({ id: activeSessions.id });

      const removedCount = result.length;

      if (removedCount > 0) {
        console.log(`🧹 [Session Cleanup] Removed ${removedCount} inactive session(s)`);
        
        // Log IDs removidos para debug
        const removedIds = result.map(r => r.id).join(', ');
        console.log(`🧹 [Session Cleanup] Removed session IDs: ${removedIds}`);
      } else {
        console.log('🧹 [Session Cleanup] No inactive sessions to remove');
      }

      // Log estatísticas de sessões ativas
      const activeSessionsCount = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(activeSessions);

      console.log(`🧹 [Session Cleanup] Active sessions remaining: ${activeSessionsCount[0]?.count || 0}`);
    } catch (error) {
      console.error('❌ [Session Cleanup] Error cleaning up inactive sessions:', error);
    }
  }

  // Método público para forçar limpeza (útil para testes e admin)
  public async forceCleanup(): Promise<number> {
    const timeoutDate = new Date(Date.now() - this.SESSION_TIMEOUT_HOURS * 60 * 60 * 1000);
    
    const result = await db
      .delete(activeSessions)
      .where(lt(activeSessions.lastActivityAt, timeoutDate))
      .returning({ id: activeSessions.id });

    return result.length;
  }
}
