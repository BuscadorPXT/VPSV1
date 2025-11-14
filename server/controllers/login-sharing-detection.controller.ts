import { Request, Response } from 'express';
import { db } from '../db';
import { activeSessions, users } from '@shared/schema';
import { eq, sql } from 'drizzle-orm';
import { GeolocationService } from '../services/geolocation.service';

interface SessionWithUser {
  sessionId: number;
  userId: number;
  userName: string;
  userEmail: string;
  userPhone: string | null;
  userPlan: string | null;
  maxConcurrentIps: number;
  ipAddress: string;
  city: string | null;
  country: string | null;
  latitude: string | null;
  longitude: string | null;
  deviceInfo: string | null;
  userAgent: string | null;
  connectedAt: Date;
  lastActivityAt: Date;
}

interface UserWithSharing {
  userId: number;
  userName: string;
  userEmail: string;
  userPhone: string | null;
  userPlan: string | null;
  maxConcurrentIps: number;
  totalSessions: number;
  differentIPs: number;
  differentLocations: number;
  sessions: Array<{
    sessionId: number;
    ipAddress: string;
    city: string | null;
    country: string | null;
    latitude: string | null;
    longitude: string | null;
    deviceInfo: string | null;
    connectedAt: Date;
    lastActivityAt: Date;
    distanceFromFirst?: number; // km
  }>;
  maxDistance: number; // distância máxima entre localizações em km
  isSuspicious: boolean; // true se tem múltiplos IPs/localizações muito distantes
}

export class LoginSharingDetectionController {
  public async getLoginSharingDetection(req: Request, res: Response): Promise<void> {
    try {
      // Busca todas as sessões ativas com informações do usuário
      const sessions = await db
        .select({
          sessionId: activeSessions.id,
          userId: users.id,
          userName: users.name,
          userEmail: users.email,
          userPhone: users.phone,
          userPlan: users.subscriptionPlan,
          maxConcurrentIps: users.maxConcurrentIps,
          ipAddress: activeSessions.ipAddress,
          city: activeSessions.city,
          country: activeSessions.country,
          latitude: activeSessions.latitude,
          longitude: activeSessions.longitude,
          deviceInfo: activeSessions.deviceInfo,
          userAgent: activeSessions.userAgent,
          connectedAt: activeSessions.connectedAt,
          lastActivityAt: activeSessions.lastActivityAt,
        })
        .from(activeSessions)
        .innerJoin(users, eq(activeSessions.userId, users.id))
        .orderBy(users.name, activeSessions.connectedAt);

      // Agrupa sessões por usuário e IP (apenas a sessão mais recente de cada IP)
      const userSessionsMap = new Map<number, Map<string, SessionWithUser>>();
      
      sessions.forEach((session) => {
        if (!userSessionsMap.has(session.userId)) {
          userSessionsMap.set(session.userId, new Map());
        }
        
        const userSessions = userSessionsMap.get(session.userId)!;
        const existingSession = userSessions.get(session.ipAddress);
        
        // Mantém apenas a sessão mais recente de cada IP
        if (!existingSession || session.lastActivityAt > existingSession.lastActivityAt) {
          userSessions.set(session.ipAddress, session);
        }
      });

      // Processa cada usuário para detectar compartilhamento
      const usersWithSharing: UserWithSharing[] = [];
      const geoService = GeolocationService.getInstance();

      for (const [userId, ipSessionsMap] of Array.from(userSessionsMap.entries())) {
        // Converte o Map de IPs em array de sessões
        const userSessions = Array.from(ipSessionsMap.values());
        
        if (userSessions.length === 0) continue;

        const firstSession = userSessions[0];
        
        // Conta IPs únicos e localizações únicas
        const uniqueIPs = new Set(userSessions.map((s: SessionWithUser) => s.ipAddress)).size;
        const uniqueLocations = new Set(
          userSessions
            .filter((s: SessionWithUser) => s.city && s.country)
            .map((s: SessionWithUser) => `${s.city}-${s.country}`)
        ).size;

        // Calcula distâncias entre localizações
        const sessionsWithDistance = userSessions.map((session: SessionWithUser, index: number) => {
          let distanceFromFirst = 0;
          
          if (index > 0 && 
              firstSession.latitude && firstSession.longitude &&
              session.latitude && session.longitude) {
            distanceFromFirst = geoService.calculateDistance(
              parseFloat(firstSession.latitude),
              parseFloat(firstSession.longitude),
              parseFloat(session.latitude),
              parseFloat(session.longitude)
            );
          }

          return {
            sessionId: session.sessionId,
            ipAddress: session.ipAddress,
            city: session.city,
            country: session.country,
            latitude: session.latitude,
            longitude: session.longitude,
            deviceInfo: session.deviceInfo,
            connectedAt: session.connectedAt,
            lastActivityAt: session.lastActivityAt,
            distanceFromFirst,
          };
        });

        // Calcula distância máxima entre qualquer par de sessões
        let maxDistance = 0;
        for (let i = 0; i < userSessions.length; i++) {
          for (let j = i + 1; j < userSessions.length; j++) {
            const s1 = userSessions[i];
            const s2 = userSessions[j];
            
            if (s1.latitude && s1.longitude && s2.latitude && s2.longitude) {
              const distance = geoService.calculateDistance(
                parseFloat(s1.latitude),
                parseFloat(s1.longitude),
                parseFloat(s2.latitude),
                parseFloat(s2.longitude)
              );
              if (distance > maxDistance) {
                maxDistance = distance;
              }
            }
          }
        }

        // Define se é suspeito baseado em critérios
        const isSuspicious = 
          uniqueIPs > 1 || // Múltiplos IPs
          (uniqueLocations > 1 && maxDistance > 100); // Localizações distantes (>100km)

        usersWithSharing.push({
          userId: firstSession.userId,
          userName: firstSession.userName,
          userEmail: firstSession.userEmail,
          userPhone: firstSession.userPhone,
          userPlan: firstSession.userPlan,
          maxConcurrentIps: firstSession.maxConcurrentIps,
          totalSessions: userSessions.length,
          differentIPs: uniqueIPs,
          differentLocations: uniqueLocations,
          sessions: sessionsWithDistance,
          maxDistance,
          isSuspicious,
        });
      }

      // Ordena por suspeitos primeiro, depois por número de sessões
      usersWithSharing.sort((a, b) => {
        if (a.isSuspicious !== b.isSuspicious) {
          return a.isSuspicious ? -1 : 1;
        }
        return b.totalSessions - a.totalSessions;
      });

      res.json({
        success: true,
        data: {
          totalUsers: usersWithSharing.length,
          usersWithMultipleSessions: usersWithSharing.filter(u => u.totalSessions > 1).length,
          suspiciousUsers: usersWithSharing.filter(u => u.isSuspicious).length,
          users: usersWithSharing,
        },
      });
    } catch (error) {
      console.error('❌ Error getting login sharing detection:', error);
      res.status(500).json({
        success: false,
        message: 'Erro ao detectar compartilhamento de login',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  public async getActiveSessionsStats(req: Request, res: Response): Promise<void> {
    try {
      const stats = await db
        .select({
          totalSessions: sql<number>`count(*)::int`,
          uniqueUsers: sql<number>`count(distinct ${activeSessions.userId})::int`,
          uniqueIPs: sql<number>`count(distinct ${activeSessions.ipAddress})::int`,
          uniqueCountries: sql<number>`count(distinct ${activeSessions.country})::int`,
        })
        .from(activeSessions);

      res.json({
        success: true,
        data: stats[0] || {
          totalSessions: 0,
          uniqueUsers: 0,
          uniqueIPs: 0,
          uniqueCountries: 0,
        },
      });
    } catch (error) {
      console.error('❌ Error getting active sessions stats:', error);
      res.status(500).json({
        success: false,
        message: 'Erro ao obter estatísticas de sessões ativas',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  public async refreshUnknownLocations(req: Request, res: Response): Promise<void> {
    try {
      console.log('🔄 [Geolocation] Starting refresh of Unknown locations...');
      
      // Busca todas as sessões com localização Unknown
      const unknownSessions = await db
        .select({
          id: activeSessions.id,
          ipAddress: activeSessions.ipAddress,
        })
        .from(activeSessions)
        .where(eq(activeSessions.city, 'Unknown'));

      console.log(`📊 [Geolocation] Found ${unknownSessions.length} sessions with Unknown location`);

      if (unknownSessions.length === 0) {
        return res.json({
          success: true,
          message: 'Nenhuma sessão com localização desconhecida encontrada',
          updated: 0,
        });
      }

      const geoService = GeolocationService.getInstance();
      let successCount = 0;
      let errorCount = 0;

      // Atualiza cada sessão com a geolocalização correta
      for (const session of unknownSessions) {
        try {
          const location = await geoService.getLocationFromIP(session.ipAddress);
          
          // Só atualiza se conseguiu obter localização válida
          if (location.city && location.city !== 'Unknown') {
            await db
              .update(activeSessions)
              .set({
                city: location.city,
                country: location.country,
                countryCode: location.countryCode,
                latitude: location.latitude,
                longitude: location.longitude,
              })
              .where(eq(activeSessions.id, session.id));
            
            successCount++;
            console.log(`✅ [Geolocation] Updated session ${session.id}: ${location.city}, ${location.country}`);
          } else {
            errorCount++;
            console.log(`⚠️ [Geolocation] Failed to get location for session ${session.id} (IP: ${session.ipAddress})`);
          }
          
          // Pequeno delay para não sobrecarregar a API
          await new Promise(resolve => setTimeout(resolve, 250)); // 250ms entre requisições
        } catch (error) {
          errorCount++;
          console.error(`❌ [Geolocation] Error updating session ${session.id}:`, error);
        }
      }

      console.log(`✅ [Geolocation] Refresh completed: ${successCount} updated, ${errorCount} failed`);

      res.json({
        success: true,
        message: `Atualização concluída: ${successCount} sessões atualizadas, ${errorCount} falharam`,
        updated: successCount,
        failed: errorCount,
        total: unknownSessions.length,
      });
    } catch (error) {
      console.error('❌ Error refreshing unknown locations:', error);
      res.status(500).json({
        success: false,
        message: 'Erro ao atualizar localizações desconhecidas',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  public async disconnectSuspiciousUsers(req: Request, res: Response): Promise<void> {
    try {
      console.log('🚫 [Disconnect] Starting disconnection of suspicious users...');
      
      // Busca usuários com múltiplas sessões suspeitas (múltiplos IPs ou localizações distantes)
      const sessions = await db
        .select({
          sessionId: activeSessions.id,
          userId: users.id,
          userName: users.name,
          userEmail: users.email,
          ipAddress: activeSessions.ipAddress,
          city: activeSessions.city,
          country: activeSessions.country,
          latitude: activeSessions.latitude,
          longitude: activeSessions.longitude,
        })
        .from(activeSessions)
        .innerJoin(users, eq(activeSessions.userId, users.id))
        .orderBy(users.id);

      // Agrupa sessões por usuário
      const userSessionsMap = new Map<number, any[]>();
      sessions.forEach((session) => {
        if (!userSessionsMap.has(session.userId)) {
          userSessionsMap.set(session.userId, []);
        }
        userSessionsMap.get(session.userId)!.push(session);
      });

      const geoService = GeolocationService.getInstance();
      const suspiciousUserIds = new Set<number>();
      const sessionIdsToDelete: number[] = [];

      // Identifica usuários suspeitos
      for (const [userId, userSessions] of Array.from(userSessionsMap.entries())) {
        const uniqueIPs = new Set(userSessions.map(s => s.ipAddress)).size;
        
        // Calcula distância máxima entre localizações
        let maxDistance = 0;
        for (let i = 0; i < userSessions.length; i++) {
          for (let j = i + 1; j < userSessions.length; j++) {
            const s1 = userSessions[i];
            const s2 = userSessions[j];
            
            if (s1.latitude && s1.longitude && s2.latitude && s2.longitude) {
              const distance = geoService.calculateDistance(
                parseFloat(s1.latitude),
                parseFloat(s1.longitude),
                parseFloat(s2.latitude),
                parseFloat(s2.longitude)
              );
              if (distance > maxDistance) {
                maxDistance = distance;
              }
            }
          }
        }

        // Marca como suspeito se tem múltiplos IPs E distância > 100km
        if (uniqueIPs > 1 && maxDistance > 100) {
          suspiciousUserIds.add(userId);
          // Adiciona todas as sessões do usuário suspeito para deletar
          userSessions.forEach(s => sessionIdsToDelete.push(s.sessionId));
          console.log(`🚫 [Disconnect] User ${userSessions[0].userEmail} marked as suspicious: ${uniqueIPs} IPs, ${Math.round(maxDistance)}km distance`);
        }
      }

      if (sessionIdsToDelete.length === 0) {
        return res.json({
          success: true,
          message: 'Nenhum usuário suspeito encontrado',
          disconnected: 0,
        });
      }

      // Desconecta todos os usuários suspeitos removendo suas sessões
      const deleteResult = await db
        .delete(activeSessions)
        .where(sql`${activeSessions.id} IN (${sql.join(sessionIdsToDelete.map(id => sql`${id}`), sql`, `)})`);

      console.log(`✅ [Disconnect] Disconnected ${suspiciousUserIds.size} suspicious users (${sessionIdsToDelete.length} sessions removed)`);

      res.json({
        success: true,
        message: `${suspiciousUserIds.size} usuários suspeitos desconectados`,
        disconnected: suspiciousUserIds.size,
        sessionsRemoved: sessionIdsToDelete.length,
      });
    } catch (error) {
      console.error('❌ Error disconnecting suspicious users:', error);
      res.status(500).json({
        success: false,
        message: 'Erro ao desconectar usuários suspeitos',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
}
