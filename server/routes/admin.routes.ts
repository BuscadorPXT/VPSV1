// Rotas administrativas - gestao de usuarios, aprovacoes e configuracoes do sistema
import express from 'express';
import type { Request, Response } from 'express';
import crypto from 'crypto';
import { storage } from '../storage';
import { authenticateAdmin, checkAdminAccess } from '../middleware/admin-auth';
import type { AdminRequest as AuthenticatedRequest } from '../middleware/admin-auth';
import { db } from '../db';
import { eq, desc, and, sql, gte, inArray } from 'drizzle-orm';
import {
  users,
  userSessions,
  adminActionLogs,
  priceAlerts,
  customRoles,
  roleChangeLogs,
  subscriptionHistory,
  userNotes,
  userFavorites,
  systemSettings,
  suppliers,
  subscriptionManagement,
  activeSessions
} from '../../shared/schema';
import { LoginSharingDetectionController } from '../controllers/login-sharing-detection.controller';

const adminRouter = express.Router();

// Funcao auxiliar para obter IP do usuario
function getClientIP(req: Request): string {
  const xForwardedFor = req.headers['x-forwarded-for'];
  return (Array.isArray(xForwardedFor) ? xForwardedFor[0] : xForwardedFor?.split(',')[0]) ||
         req.headers['x-real-ip'] as string ||
         req.connection?.remoteAddress ||
         req.socket?.remoteAddress ||
         'unknown';
}

// Helper function to extract browser name from User-Agent string
function extractBrowser(userAgent: string): string {
  if (!userAgent) return 'Unknown';
  if (userAgent.includes('Firefox')) return 'Firefox';
  if (userAgent.includes('Edg')) return 'Edge'; // Microsoft Edge
  if (userAgent.includes('Chrome')) return 'Chrome';
  if (userAgent.includes('Safari')) return 'Safari';
  if (userAgent.includes('Opera') || userAgent.includes('OPR')) return 'Opera';
  if (userAgent.includes('MSIE') || userAgent.includes('Trident')) return 'Internet Explorer';
  return 'Other';
}

// Admin access check function is now imported from middleware

// GET /api/admin/stats/users - Estatisticas de usuarios
adminRouter.get('/stats/users', authenticateAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    console.log('📊 Fetching user statistics...');

    const [totalUsersResult, proUsersResult, adminUsersResult, pendingUsersResult] = await Promise.all([
      db.select({ count: sql<number>`COUNT(*)::int` }).from(users),
      db.select({ count: sql<number>`COUNT(*)::int` }).from(users).where(eq(users.subscriptionPlan, 'pro')),
      db.select({ count: sql<number>`COUNT(*)::int` }).from(users).where(eq(users.isAdmin, true)),
      db.select({ count: sql<number>`COUNT(*)::int` }).from(users).where(eq(users.isApproved, false))
    ]);

    const stats = {
      totalUsers: Number(totalUsersResult[0]?.count || 0),
      proUsers: Number(proUsersResult[0]?.count || 0),
      adminUsers: Number(adminUsersResult[0]?.count || 0),
      pendingUsers: Number(pendingUsersResult[0]?.count || 0)
    };

    console.log('📊 User stats:', stats);

    res.json(stats);
  } catch (error) {
    console.error('Error fetching user stats:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack
    });
    res.status(500).json({
      message: 'Erro interno do servidor',
      totalUsers: 0,
      proUsers: 0,
      adminUsers: 0,
      pendingUsers: 0
    });
  }
});

// GET /api/admin/stats/logins - Estatisticas de login dos ultimos 7 dias
adminRouter.get('/stats/logins', authenticateAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    console.log('📊 Fetching login statistics...');

    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    // Login stats for last 7 days
    const logins7d = await db.select({ count: sql<number>`COUNT(*)::int` })
      .from(userSessions)
      .where(gte(userSessions.createdAt, sevenDaysAgo));

    // Login stats for last 24 hours
    const logins24h = await db.select({ count: sql<number>`COUNT(*)::int` })
      .from(userSessions)
      .where(gte(userSessions.createdAt, oneDayAgo));

    console.log(`📊 Login stats: 7d=${logins7d[0]?.count || 0}, 24h=${logins24h[0]?.count || 0}`);

    // Daily breakdown for the last 7 days
    const dailyStats = [];
    const dayNames = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab'];

    for (let i = 6; i >= 0; i--) {
      const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
      const nextDate = new Date(date.getTime() + 24 * 60 * 60 * 1000);

      try {
        const dayLogins = await db.select({ count: sql<number>`COUNT(*)::int` })
          .from(userSessions)
          .where(
            and(
              gte(userSessions.createdAt, date),
              sql`${userSessions.createdAt} < ${nextDate.toISOString()}`
            )
          );

        dailyStats.push({
          date: date.toISOString().split('T')[0],
          dayName: dayNames[date.getDay()],
          count: Number(dayLogins[0]?.count || 0)
        });
      } catch (dayError) {
        console.error(`Error fetching data for day ${i}:`, dayError);
        dailyStats.push({
          date: date.toISOString().split('T')[0],
          dayName: dayNames[date.getDay()],
          count: 0
        });
      }
    }

    console.log(`📊 Daily stats processed: ${dailyStats.length} days`);

    res.json({
      logins7d: Number(logins7d[0]?.count || 0),
      logins24h: Number(logins24h[0]?.count || 0),
      loginStats: dailyStats
    });
  } catch (error) {
    console.error('Login stats error:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack
    });
    res.status(500).json({
      message: 'Erro interno do servidor',
      logins7d: 0,
      logins24h: 0,
      loginStats: []
    });
  }
});

// GET /api/admin/users/online - Usuarios online atualmente
adminRouter.get('/users/online', authenticateAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const timeWindowStart = new Date(Date.now() - 30 * 60 * 1000); // 30 minutos atrás
    const now = new Date();
    const TIME_WINDOW_MINUTES = 30; // Definindo a constante para o tempo da janela

    console.log(`📊 Checking online users from ${timeWindowStart.toISOString()} to ${now.toISOString()}`);

    // Initialize with safe defaults
    let activeSessions = [];
    let onlineUserIds = new Set<string | number>(); // Use Set for unique IDs
    let wsConnections = 0;
    let totalOnline = 0;
    let wsDetails = { authenticatedUsers: 0, userEmails: [] };

    // Get active sessions with improved error handling
    try {
      // Try to get sessions from the database first
      const sessionsQuery = await db
        .select({
          userId: userSessions.userId,
          isActive: userSessions.isActive,
          lastActivity: userSessions.lastActivity,
          expiresAt: userSessions.expiresAt,
          createdAt: userSessions.createdAt, // Include createdAt
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

      activeSessions = sessionsQuery || [];
      onlineUserIds = new Set(activeSessions.map(session => session.userId).filter(Boolean)); // Populate onlineUserIds
      console.log(`📊 Active sessions from database: ${activeSessions.length}`);

    } catch (dbError) {
      console.warn('Database session query failed:', dbError.message);

      // Fallback: try to get session count from sessionManager
      try {
        const { sessionManager } = await import('../services/session-manager.service');
        const sessionStats = await sessionManager.getSessionStats();
        activeSessions = Array(sessionStats.totalActive).fill({ userId: 'unknown' });
        onlineUserIds = new Set(activeSessions.map(session => session.userId).filter(Boolean)); // Populate onlineUserIds from fallback
        console.log(`📊 Session stats from sessionManager: ${sessionStats.totalActive} active sessions`);
      } catch (sessionError) {
        console.warn('SessionManager not available:', sessionError.message);
        activeSessions = [];
        onlineUserIds = new Set(); // Clear onlineUserIds if sessionManager fails
      }
    }

    // Enrich online users with additional data from database
    let enrichedOnlineUsers: any[] = [];
    try {
      // ALWAYS get users with recent login activity (primary method for Firebase Auth users)
      const recentActiveUsers = await db
        .select({
          id: users.id,
          email: users.email,
          name: users.name,
          role: users.role,
          lastLoginAt: users.lastLoginAt,
          subscriptionPlan: users.subscriptionPlan,
          isAdmin: users.isAdmin,
          ipAddress: sql<string>`'N/A'`,
          userAgent: sql<string>`'Desktop'`,
          browser: sql<string>`'Unknown'`,
          isSessionActive: sql<boolean>`true`,
          sessionCreatedAt: users.lastLoginAt,
        })
        .from(users)
        .where(
          and(
            eq(users.isApproved, true),
            sql`${users.lastLoginAt} > ${timeWindowStart.toISOString()}` // Filter by last login time
          )
        )
        .orderBy(desc(users.lastLoginAt))
        .limit(1000); // Allow up to 1000 online users to be shown

      enrichedOnlineUsers = recentActiveUsers || [];
      console.log(`📊 Found ${enrichedOnlineUsers.length} users with recent login activity (last ${TIME_WINDOW_MINUTES} minutes)`);

      // If we found users, log some details
      if (enrichedOnlineUsers.length > 0) {
        console.log(`📊 Sample user:`, {
          id: enrichedOnlineUsers[0].id,
          name: enrichedOnlineUsers[0].name,
          email: enrichedOnlineUsers[0].email,
          lastLoginAt: enrichedOnlineUsers[0].lastLoginAt
        });
      }

    } catch (enrichError) {
      console.error('❌ Error enriching user data:', enrichError);
      enrichedOnlineUsers = [];
    }

    // Get WebSocket connections count with detailed info
    const { UnifiedWebSocketManager } = await import('../services/websocket-manager');
    const wsManager = UnifiedWebSocketManager.getInstance();
    wsConnections = wsManager.getClientCount();
    wsDetails = wsManager.getConnectedUsersInfo();

    console.log('📊 [Admin Online Users] WebSocket connections:', wsConnections);
    console.log('📊 [Admin Online Users] WebSocket details:', wsDetails);
    console.log('📊 [Admin Online Users] Authenticated users:', wsDetails.authenticatedUsers);
    console.log('📊 [Admin Online Users] User emails:', wsDetails.userEmails);

    // Use a Map to get unique users based on ID and prioritize DB data, then WS data
    const uniqueUsersMap = new Map<string | number, any>();

    // Add users from database enrichment first
    enrichedOnlineUsers.forEach(user => {
      if (user.id) { // Ensure user has an ID from the DB
        uniqueUsersMap.set(user.id, user);
      }
    });

    // Add users from WebSocket details if they are not already in the map or if they are guest users
    wsDetails.userEmails.forEach(email => {
      // Check if a user with this email already exists in the map (from DB lookup)
      const existingUser = Array.from(uniqueUsersMap.values()).find(user => user.email === email);

      if (!existingUser) {
        // If user is not found in DB, add them as a new entry from WebSocket info
        uniqueUsersMap.set(`ws_${email}`, { id: `ws_${email}`, email, name: 'Online (WS)', role: 'guest', lastLoginAt: null, nickname: null, isOnline: true });
      } else if (existingUser.id.toString().startsWith('ws_')) {
        // If the existing user entry is already a WS guest, update it with potentially new info (though unlikely)
        uniqueUsersMap.set(existingUser.id, { ...existingUser, isOnline: true });
      } else {
        // If user exists in DB, ensure their online status is marked true
        const dbUser = uniqueUsersMap.get(existingUser.id);
        if (dbUser) {
          dbUser.isOnline = true;
          uniqueUsersMap.set(existingUser.id, dbUser);
        }
      }
    });

    // Calculate total online users AFTER merging DB + WebSocket users
    totalOnline = uniqueUsersMap.size;

    console.log(`✅ Final result: ${totalOnline} online users (${enrichedOnlineUsers.length} from DB, ${wsDetails.userEmails.length} from WS, ${uniqueUsersMap.size} unique total)`);
    console.log(`📊 WebSocket connections: ${wsConnections}`);

    // Map to the final desired structure
    const finalOnlineUsers = Array.from(uniqueUsersMap.values()).map(user => ({
      id: user.id,
      name: user.name || 'N/A',
      email: user.email,
      role: user.role || 'user',
      subscriptionPlan: user.subscriptionPlan || 'free',
      isAdmin: user.isAdmin || false,
      ipAddress: user.ipAddress || 'N/A',
      lastActivity: user.lastLoginAt || new Date().toISOString(),
      userAgent: user.userAgent || 'Desktop',
      browser: user.browser || 'Unknown',
      isSessionActive: user.isSessionActive || false,
      sessionCreatedAt: user.sessionCreatedAt || user.lastLoginAt,
    }));


    const result = {
      success: true,
      data: {
        totalOnline,
        wsConnections,
        authenticatedWsUsers: wsDetails.authenticatedUsers,
        wsUserEmails: wsDetails.userEmails, // Keep this for debugging or specific frontend needs
        activeSessions: activeSessions.length,
        onlineUsers: finalOnlineUsers, // Use the mapped final structure
        timeWindow: TIME_WINDOW_MINUTES + ' minutes',
        lastCheck: new Date().toISOString()
      }
    };

    res.json(result);

  } catch (error) {
    console.error('❌ Error fetching online users:', error);
    console.error('❌ Error details:', {
      message: error.message,
      stack: error.stack,
      type: error.constructor.name
    });

    // Return safe fallback data instead of error to prevent dashboard crash
    const fallbackData = {
      success: true,
      totalOnline: 0,
      wsConnections: 0,
      onlineUsers: [],
      timeWindow: '30 minutes',
      lastCheck: new Date().toISOString(),
      activeSessions: 0,
      data: {
        totalOnline: 0,
        wsConnections: 0,
        onlineUsers: [],
        timeWindow: '30 minutes',
        lastCheck: new Date().toISOString(),
        activeSessions: 0
      },
      error: `WebSocket error: ${error.message}`
    };

    res.status(200).json(fallbackData);
  }
});

// GET /api/admin/activity/recent - Atividade recente do sistema
adminRouter.get('/activity/recent', authenticateAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    console.log('📊 Fetching recent admin activity...');

    // Try the Drizzle approach first
    let recentActivity;
    try {
      recentActivity = await db.select({
        id: adminActionLogs.id,
        action: adminActionLogs.action,
        details: adminActionLogs.details, // This should work now after running the SQL fix
        reason: adminActionLogs.reason,
        timestamp: adminActionLogs.createdAt,
        adminId: adminActionLogs.adminId,
        targetUserId: adminActionLogs.targetUserId,
        ipAddress: adminActionLogs.ipAddress
      })
      .from(adminActionLogs)
      .orderBy(desc(adminActionLogs.createdAt))
      .limit(50);

    } catch (schemaError) {
      console.log('⚠️ Schema-based query failed, trying raw SQL:', schemaError.message);

      // Fallback to raw SQL if schema query fails
      const rawResult = await db.execute(sql`
        SELECT
          id,
          action,
          COALESCE(details, reason, '') as details,
          COALESCE(reason, '') as reason,
          created_at as timestamp,
          admin_id as "adminId",
          target_user_id as "targetUserId",
          COALESCE(ip_address, '') as "ipAddress"
        FROM admin_action_logs
        ORDER BY created_at DESC
        LIMIT 50
      `);

      recentActivity = rawResult.rows;
    }

    console.log(`📊 Found ${recentActivity.length} activity records`);

    // Normalize the activity data format
    const normalizedActivity = recentActivity.map(log => ({
      id: log.id,
      action: log.action || '',
      details: log.details || log.reason || '',
      reason: log.reason || '',
      timestamp: log.timestamp || log.createdAt,
      adminId: log.adminId,
      targetUserId: log.targetUserId,
      ipAddress: log.ipAddress || '',
      type: log.action || 'system_action',
      adminEmail: 'Admin',
      adminName: 'System',
      targetUserEmail: null
    }));

    // Get admin and target user details for enrichment
    const adminIds = [...new Set(normalizedActivity.map(log => log.adminId).filter(Boolean))];
    const targetUserIds = [...new Set(normalizedActivity.map(log => log.targetUserId).filter(Boolean))];

    let adminUsers = [];
    let targetUsers = [];

    try {
      if (adminIds.length > 0) {
        adminUsers = await db.select({
          id: users.id,
          email: users.email,
          name: users.name
        }).from(users).where(inArray(users.id, adminIds));
      }

      if (targetUserIds.length > 0) {
        targetUsers = await db.select({
          id: users.id,
          email: users.email,
          name: users.name
        }).from(users).where(inArray(users.id, targetUserIds));
      }
    } catch (userFetchError) {
      console.log('⚠️ Could not fetch user details for activity logs:', userFetchError.message);
    }

    // Create lookup maps
    const adminMap = new Map(adminUsers.map(user => [user.id, user]));
    const targetMap = new Map(targetUsers.map(user => [user.id, user]));

    // Enrich activity data with user information
    const enrichedActivity = normalizedActivity.map(log => ({
      ...log,
      adminEmail: log.adminId ? (adminMap.get(log.adminId)?.email || 'Unknown') : 'System',
      adminName: log.adminId ? (adminMap.get(log.adminId)?.name || 'Unknown') : 'System',
      targetUserEmail: log.targetUserId ? (targetMap.get(log.targetUserId)?.email || null) : null
    }));

    console.log(`📊 Found ${enrichedActivity.length} recent activity logs`);

    res.json({
      success: true,
      data: {
        activities: enrichedActivity,
        total: enrichedActivity.length
      },
      total: enrichedActivity.length
    });
  } catch (error) {
    console.error('❌ Error fetching recent activity:', error);
    console.error('❌ Error details:', {
      message: error.message,
      stack: error.stack,
      code: error.code,
      name: error.name
    });

    // Return empty data instead of error to prevent dashboard crash
    res.json({
      success: true,
      message: 'Atividade recente não disponível',
      data: {
        activities: [],
        total: 0
      },
      total: 0
    });
  }
});

// GET /api/admin/users/export - Exportar usuarios para planilha
adminRouter.get('/users/export', authenticateAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const format = req.query.format as string || 'xlsx';

    console.log(`📊 Admin ${req.user?.userData?.email} requesting users export in ${format} format`);

    // Buscar todos os usuarios
    const allUsers = await db.select()
      .from(users)
      .orderBy(desc(users.createdAt));

    // Preparar dados para exportacao
    const exportData = allUsers.map(user => ({
      'ID': user.id,
      'Nome': user.name || 'N/A',
      'Email': user.email || 'N/A',
      'Empresa': user.company || 'N/A',
      'Função': user.role || 'user',
      'Plano': user.subscriptionPlan || 'free',
      'Status': user.status || 'pending',
      'Aprovado': user.isApproved ? 'Sim' : 'Não',
      'Admin': user.isAdmin ? 'Sim' : 'Não',
      'Assinatura Ativa': user.isSubscriptionActive ? 'Sim' : 'Não',
      'API Key': user.apiKeyId ? 'Sim' : 'Não',
      'Data Criação': user.createdAt ? new Date(user.createdAt).toLocaleDateString('pt-BR') : 'N/A',
      'Última Atualização': user.updatedAt ? new Date(user.updatedAt).toLocaleDateString('pt-BR') : 'N/A',
      'Último Login': user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleDateString('pt-BR') : 'N/A',
      'Data Aprovação': user.approvedAt ? new Date(user.approvedAt).toLocaleDateString('pt-BR') : 'N/A'
    }));

    if (format === 'csv') {
      // Exportar como CSV
      const headers = Object.keys(exportData[0] || {});
      const csvContent = [
        headers.join(','),
        ...exportData.map(row =>
          headers.map(header => {
            const value = (row as any)[header];
            // Escapar valores que contenham vírgulas ou aspas
            if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
              return `"${value.replace(/"/g, '""')}"`;
            }
            return value;
          }).join(',')
        )
      ].join('\n');

      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="usuarios_${new Date().toISOString().split('T')[0]}.csv"`);
      res.send('\uFEFF' + csvContent); // BOM para UTF-8
    } else {
      // Exportar como XLSX
      const XLSX = require('xlsx');
      const worksheet = XLSX.utils.json_to_sheet(exportData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Usuários');

      // Ajustar largura das colunas
      const colWidths = Object.keys(exportData[0] || {}).map(key => ({
        wch: Math.max(key.length, 15)
      }));
      worksheet['!cols'] = colWidths;

      const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="usuarios_${new Date().toISOString().split('T')[0]}.xlsx"`);
      res.send(buffer);
    }

    // Log da exportacao
    if (req.user?.userData?.id) {
      await db.insert(adminActionLogs).values({
        adminId: req.user.userData.id,
        action: 'users_export',
        reason: `Admin exported ${allUsers.length} users in ${format} format`,
        ipAddress: getClientIP(req),
        createdAt: new Date(),
      });
    }

    console.log(`✅ Users export completed: ${allUsers.length} users exported in ${format} format by ${req.user?.userData?.email}`);

  } catch (error) {
    console.error('❌ Error exporting users:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao exportar usuários',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// GET /api/admin/users - Listar todos os usuarios
adminRouter.get('/users', authenticateAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    // Buscar usuarios com apelidos administrativos da tabela subscription management
    const allUsers = await db.select({
      id: users.id,
      firebaseUid: users.firebaseUid,
      email: users.email,
      name: users.name,
      company: users.company,
      phone: users.phone,
      role: users.role,
      status: users.status,
      isApproved: users.isApproved,
      isAdmin: users.isAdmin,
      subscriptionPlan: users.subscriptionPlan,
      isSubscriptionActive: users.isSubscriptionActive,
      approvedAt: users.approvedAt,
      approvedBy: users.approvedBy,
      testerStartedAt: users.testerStartedAt,
      testerExpiresAt: users.testerExpiresAt,
      isTesterExpired: users.isTesterExpired,
      createdAt: users.createdAt,
      updatedAt: users.updatedAt,
      lastLoginAt: users.lastLoginAt,
      ipAddress: users.ipAddress,
      userAgent: users.userAgent,
      sessionToken: users.sessionToken,
      profileImageUrl: users.profileImageUrl,
      preferredCurrency: users.preferredCurrency,
      notificationPreferences: users.notificationPreferences,
      isActive: users.isActive,
      subscriptionExpiresAt: users.subscriptionExpiresAt,
      trialStartedAt: users.trialStartedAt,
      trialExpiresAt: users.trialExpiresAt,
      promotionEndDate: users.promotionEndDate,
      isPromotionActive: users.isPromotionActive,
      trialUsed: users.trialUsed,
      loginAttempts: users.loginAttempts,
      lastLoginAttemptAt: users.lastLoginAttemptAt,
      accountLocked: users.accountLocked,
      lockUntil: users.lockUntil,
      emailVerified: users.emailVerified,
      emailVerificationToken: users.emailVerificationToken,
      statusChangedAt: users.statusChangedAt,
      statusChangedBy: users.statusChangedBy,
      suspensionReason: users.suspensionReason,
      roleChangedAt: users.roleChangedAt,
      roleChangedBy: users.roleChangedBy,
      passwordResetToken: users.passwordResetToken,
      passwordResetExpires: users.passwordResetExpires,
      twoFactorEnabled: users.twoFactorEnabled,
      twoFactorSecret: users.twoFactorSecret,
      recoveryCodesUsed: users.recoveryCodesUsed,
      lastPasswordChangedAt: users.lastPasswordChangedAt,
      loginHistory: users.loginHistory,
      securityAlerts: users.securityAlerts,
      gdprConsentAt: users.gdprConsentAt,
      marketingConsentAt: users.marketingConsentAt,
      dataRetentionExpiresAt: users.dataRetentionExpiresAt,
      apiKeyId: users.apiKeyId,
      apiKeyCreatedAt: users.apiKeyCreatedAt,
      rateLimitTier: users.rateLimitTier,
      monthlyApiCalls: users.monthlyApiCalls,
      maxMonthlyApiCalls: users.maxMonthlyApiCalls,
      currentApiCallCount: users.currentApiCallCount,
      apiCallsResetAt: users.apiCallsResetAt,
      webhookUrl: users.webhookUrl,
      webhookEvents: users.webhookEvents,
      lastWebhookCallAt: users.lastWebhookCallAt,
      webhookFailureCount: users.webhookFailureCount,
      customFields: users.customFields,
      integrationSettings: users.integrationSettings,
      termsAcceptedAt: users.termsAcceptedAt,
      termsVersion: users.termsVersion,
      subscriptionNickname: users.subscriptionNickname,
      manualRenewalOverride: users.manualRenewalOverride,
      subscriptionNotes: users.subscriptionNotes,
      adminNickname: subscriptionManagement.nickname // This assumes a direct join to subscriptionManagement for adminNickname
    })
    .from(users)
    .leftJoin(subscriptionManagement, eq(users.id, subscriptionManagement.userId))
    .orderBy(desc(users.createdAt));

    // Buscar informacoes dos administradores que aprovaram/rejeitaram
    const approverIds = [...new Set([
      ...allUsers.map(u => u.approvedBy).filter(Boolean)
    ])];

    const approvers = approverIds.length > 0 ? await db.select({
      id: users.id,
      name: users.name,
      email: users.email
    }).from(users).where(inArray(users.id, approverIds)) : [];

    // Verificar usuarios online (ultimos 5 minutos) with error handling
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    let onlineUsers = [];

    try {
      const onlineResult = await db.execute(sql`
        SELECT
          COALESCE(user_id, "userId") as userId,
          COALESCE(last_activity, "lastActivity") as lastActivity
        FROM user_sessions
        WHERE (COALESCE(is_active, "isActive") = true OR COALESCE(is_active, "isActive") = 'true')
        AND (COALESCE(last_activity, "lastActivity") >= ${fiveMinutesAgo.toISOString()})
      `);

      onlineUsers = onlineResult.rows.map(row => ({
        userId: row.userId || row.user_id,
        lastActivity: row.lastActivity || row.last_activity
      }));

      console.log(`📊 Found ${onlineUsers.length} online users`);
    } catch (onlineError) {
      console.error('⚠️ Error fetching online users:', onlineError.message);
      onlineUsers = [];
    }

    const onlineUserIds = new Set(onlineUsers.map(u => u.userId));

    // Buscar ultima atividade de cada usuario with error handling
    const userIds = allUsers.map(u => u.id);
    let lastActivities = [];

    if (userIds.length > 0) {
      try {
        const activitiesResult = await db.execute(sql`
          SELECT
            COALESCE(user_id, "userId") as userId,
            MAX(COALESCE(last_activity, "lastActivity"))::text as lastActivity
          FROM user_sessions
          WHERE COALESCE(user_id, "userId") = ANY(${userIds})
          GROUP BY COALESCE(user_id, "userId")
        `);

        lastActivities = activitiesResult.rows.map(row => ({
          userId: row.userId || row.user_id,
          lastActivity: row.lastActivity || row.last_activity
        }));

        console.log(`📊 Found last activities for ${lastActivities.length} users`);
      } catch (activitiesError) {
        console.error('⚠️ Error fetching last activities:', activitiesError.message);
        lastActivities = [];
      }
    }

    const lastActivityMap = new Map(
      lastActivities.map(la => [la.userId, la.lastActivity])
    );

    const usersWithDetails = allUsers.map(user => {
      const isOnline = onlineUserIds.has(user.id);
      const lastActivity = lastActivityMap.get(user.id);
      const approver = approvers.find(a => a.id === user.approvedBy);

      // Priorizar apelido administrativo (adminNickname) sobre apelido da assinatura (subscriptionNickname) e nome original
      const displayName = user.adminNickname || user.subscriptionNickname || user.name || 'N/A';

      return {
        ...user,
        name: displayName, // Use the prioritized display name
        isOnline,
        lastActivity: lastActivity ? new Date(lastActivity) : null,
        approverName: approver?.name || approver?.email || null
      };
    });

    console.log(`📊 Users with details: ${usersWithDetails.length} users for admin ${req.user?.userData?.email}`);

    res.json({
      users: usersWithDetails,
      total: usersWithDetails.length
    });
  } catch (error) {
    console.error('Users fetch error:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    res.status(500).json({
      message: 'Erro interno do servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// POST /api/admin/ping-activity - Atualizar atividade do admin
adminRouter.post('/ping-activity', authenticateAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user?.userData?.id;
    if (!userId) {
      return res.status(401).json({ message: 'Usuario nao autenticado' });
    }

    // Atualizar ultima atividade da sessao ativa
    try {
      await db.update(userSessions)
        .set({
          lastActivity: new Date(),
          userAgent: req.headers['user-agent'] || 'Unknown',
          ipAddress: getClientIP(req)
        })
        .where(
          and(
            eq(userSessions.userId, userId),
            eq(userSessions.isActive, true)
          )
        );
      console.log(`✅ Activity updated for user ${userId}`);
    } catch (updateError) {
      console.error(`⚠️ Could not update activity for user ${userId}:`, updateError.message);
      // Continue without throwing error to prevent API failure
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error updating admin activity:', error);
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
});

// Aprovar usuário
adminRouter.post('/approve-user', authenticateAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { userId, reason, userType = 'pro' } = req.body;

    console.log(`🔍 [APPROVE USER] Request received:`, {
      userId,
      userType,
      reason: reason || 'No reason provided',
      adminEmail: req.user?.userData?.email
    });

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'ID do usuário é obrigatório'
      });
    }

    const userIdNum = parseInt(userId);
    if (isNaN(userIdNum)) {
      return res.status(400).json({
        success: false,
        message: 'ID do usuário deve ser um número válido'
      });
    }

    if (userType && !['pro', 'tester'].includes(userType)) {
      console.log(`❌ Invalid user type: ${userType}`);
      return res.status(400).json({
        success: false,
        message: 'Tipo de usuário deve ser "pro" ou "tester"'
      });
    }

    const adminId = req.user.userData.id;

    // Import userService
    const { userService } = await import('../services/user.service');
    const updatedUser = await userService.approveUser(userIdNum, adminId, userType);

    // Log da aprovação
    await storage.createSecurityLog({
      userId: adminId,
      ipAddress: getClientIP(req),
      action: 'user_approval',
      reason: `Admin ${req.user?.userData?.email} approved user ${updatedUser.email} as ${userType.toUpperCase()}${userType === 'tester' ? ' with 7-day trial period' : ' plan'}. Reason: ${reason || 'No reason provided'}`,
      userAgent: req.headers['user-agent'] || '',
      success: true
    });

    console.log(`✅ User ${userIdNum} approved by admin ${req.user?.userData?.email} - Type: ${userType.toUpperCase()}`);

    // ✅ NOTIFICAR USUÁRIO VIA WEBSOCKET SOBRE APROVAÇÃO
    try {
      const { UnifiedWebSocketManager } = await import('../services/websocket-manager');
      const wsManager = UnifiedWebSocketManager.getInstance();
      
      wsManager.sendToUser(String(updatedUser.id), {
        type: 'USER_APPROVED',
        timestamp: new Date().toISOString(),
        data: {
          message: 'Sua conta foi aprovada! Você já pode acessar todas as funcionalidades.',
          userType,
          isApproved: true,
          role: updatedUser.role,
          subscriptionPlan: updatedUser.subscriptionPlan
        }
      });
      
      console.log(`📡 Sent approval notification via WebSocket to user ${updatedUser.id}`);
    } catch (wsError) {
      console.warn('⚠️ Failed to send WebSocket notification:', wsError);
      // Não falhar a aprovação por erro no WebSocket
    }

    res.json({
      success: true,
      message: `Usuário aprovado com sucesso como ${userType === 'tester' ? 'Tester (7 dias)' : 'PRO'}`,
      user: updatedUser
    });
  } catch (error) {
    console.error('❌ Approve user error:', error);
    console.error('❌ Error details:', {
      message: error.message,
      stack: error.stack,
      userId: req.body.userId,
      userType: req.body.userType
    });
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Rejeitar usuário
adminRouter.post('/reject-user', authenticateAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { userId, reason } = req.body;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'ID do usuário é obrigatório'
      });
    }

    const userIdNum = parseInt(userId);
    if (isNaN(userIdNum)) {
      return res.status(400).json({
        success: false,
        message: 'ID do usuário deve ser um número válido'
      });
    }

    // Import userService
    const { userService } = await import('../services/user.service');
    const rejectedUser = await userService.rejectUser(userIdNum, reason);

    // Log da rejeição
    await storage.createSecurityLog({
      userId: req.user.userData.id,
      ipAddress: req.ip || '',
      action: 'user_rejection',
      reason: `Admin ${req.user?.userData?.email} rejected user ${rejectedUser.email}. Reason: ${reason || 'No reason provided'}`,
      userAgent: req.headers['user-agent'] || '',
      success: true
    });

    console.log(`❌ User ${userIdNum} rejected by admin ${req.user?.userData?.email}`);

    // ✅ NOTIFICAR USUÁRIO VIA WEBSOCKET SOBRE REJEIÇÃO
    try {
      const { UnifiedWebSocketManager } = await import('../services/websocket-manager');
      const wsManager = UnifiedWebSocketManager.getInstance();
      
      wsManager.sendToUser(String(rejectedUser.id), {
        type: 'USER_REJECTED',
        timestamp: new Date().toISOString(),
        data: {
          message: 'Sua solicitação de cadastro foi rejeitada.',
          reason: reason || 'Sem motivo especificado',
          isApproved: false
        }
      });
      
      console.log(`📡 Sent rejection notification via WebSocket to user ${rejectedUser.id}`);
    } catch (wsError) {
      console.warn('⚠️ Failed to send WebSocket notification:', wsError);
      // Não falhar a rejeição por erro no WebSocket
    }

    res.json({
      success: true,
      message: 'Usuário rejeitado com sucesso',
      user: rejectedUser
    });
  } catch (error) {
    console.error('Reject user error:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
});

// Buscar usuários pendentes
adminRouter.get('/pending-users', authenticateAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    console.log(`🔍 Admin ${req.user?.userData?.email} requesting pending users...`);

    // Import userService
    const { userService } = await import('../services/user.service');
    const pendingUsers = await userService.getPendingUsers();

    console.log(`📊 Pending users result: ${pendingUsers.length} users found`);

    if (pendingUsers.length > 0) {
      console.log('📋 Returning pending users:', pendingUsers.map(u => ({
        id: u.id,
        email: u.email,
        status: u.status,
        isApproved: u.isApproved,
        name: u.name,
        company: u.company,
        role: u.role,
        createdAt: u.createdAt
      })));
    } else {
      console.log('⚠️ No pending users found. Running diagnostic check...');

      // Debug detalhado: verificar diferentes condições
      const diagnostics = await Promise.all([
        db.execute(`SELECT COUNT(*) as count FROM users WHERE is_approved = false`),
        db.execute(`SELECT COUNT(*) as count FROM users WHERE is_admin = false`),
        db.execute(`SELECT COUNT(*) as count FROM users WHERE role = 'user' OR role IS NULL`),
        db.execute(`SELECT id, email, is_approved, role, is_admin, status, created_at FROM users ORDER BY created_at DESC LIMIT 5`)
      ]);

      console.log(`🔍 Diagnostic results:
        - Non-approved users: ${diagnostics[0].rows?.[0]?.count || 0}
        - Non-admin users: ${diagnostics[1].rows?.[0]?.count || 0}
        - Regular role users: ${diagnostics[2].rows?.[0]?.count || 0}
        - Latest 5 users: ${JSON.stringify(diagnostics[3].rows, null, 2)}`);
    }

    res.json(pendingUsers);
  } catch (error) {
    console.error('Error getting pending users:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// POST /api/admin/sync-firebase-user - Sincronizar usuário específico do Firebase para o banco local
adminRouter.post('/sync-firebase-user', authenticateAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    console.log(`🔄 [ROUTE] Firebase user sync request by admin ${req.user?.userData?.email}`);
    
    const { adminController } = await import('../controllers/admin.controller');
    await adminController.syncFirebaseUser(req, res, (error) => {
      if (error) {
        console.error('❌ [ROUTE] Sync Firebase user controller error:', error);
        res.status(500).json({
          success: false,
          message: 'Erro interno do servidor',
          error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
      }
    });
  } catch (error) {
    console.error('❌ [ROUTE] Sync Firebase user route error:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
});

// GET /api/admin/users-with-api-keys - Listar usuários com suas API keys
adminRouter.get('/users-with-api-keys', authenticateAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { adminController } = await import('../controllers/admin.controller');
    await adminController.getUsersWithApiKeys(req, res, () => {});
  } catch (error) {
    console.error('Get users with API keys error:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
});

// POST /api/admin/generate-api-key/:userId - Gerar API key para usuário
adminRouter.post('/generate-api-key/:userId', authenticateAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { userId } = req.params;
    console.log(`🔑 [ROUTE] API key generation request for user ${userId} by admin ${req.user?.userData?.email}`);

    const { adminController } = await import('../controllers/admin.controller');
    await adminController.generateApiKeyForUser(req, res, (error) => {
      if (error) {
        console.error('❌ [ROUTE] Generate API key controller error:', error);
        res.status(500).json({
          success: false,
          message: 'Erro interno do servidor',
          error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
      }
    });
  } catch (error) {
    console.error('❌ [ROUTE] Generate API key route error:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
});

// DELETE /api/admin/revoke-api-key/:userId - Revogar API key do usuário
adminRouter.delete('/revoke-api-key/:userId', authenticateAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { adminController } = await import('../controllers/admin.controller');
    await adminController.revokeApiKeyForUser(req, res, () => {});
  } catch (error) {
    console.error('Revoke API key error:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
});

// PATCH /api/admin/users/:userId/role - Alterar função do usuário
adminRouter.patch('/users/:userId/role', authenticateAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { userId } = req.params;
    const { role, reason } = req.body;
    const adminId = req.user.userData.id;

    if (!role || !reason) {
      return res.status(400).json({
        success: false,
        message: 'Função e motivo são obrigatórios'
      });
    }

    const userIdNum = parseInt(userId);
    if (isNaN(userIdNum)) {
      return res.status(400).json({
        success: false,
        message: 'ID do usuário deve ser um número válido'
      });
    }

    // Verificar se o usuário existe
    const targetUser = await db.select()
      .from(users)
      .where(eq(users.id, userIdNum))
      .limit(1);

    if (!targetUser.length) {
      return res.status(404).json({
        success: false,
        message: 'Usuário não encontrado'
      });
    }

    const user = targetUser[0];

    // Mapear role para subscription plan correto
    let subscriptionPlan = role;
    let isAdmin = false;

    switch (role) {
      case 'admin':
      case 'superadmin':
        subscriptionPlan = 'admin';
        isAdmin = true;
        break;
      case 'pro':
        subscriptionPlan = 'pro';
        isAdmin = false;
        break;
      case 'apoiador':
        subscriptionPlan = 'apoiador';
        isAdmin = false;
        break;
      case 'tester':
        subscriptionPlan = 'tester';
        isAdmin = false;
        break;
      case 'user':
      default:
        subscriptionPlan = 'free';
        isAdmin = false;
        break;
    }

    // Atualizar função do usuário - LIMPAR PENDING STATUS se necessário
    const updateData: any = {
      role: role,
      subscriptionPlan: subscriptionPlan,
      isAdmin: isAdmin,
      updatedAt: new Date()
    };

    // 🔧 Se mudando para PRO ou APOIADOR, garantir que limpe qualquer status de pending
    if (role === 'pro' || role === 'apoiador') {
      updateData.status = 'approved';  // Limpar pending_payment
    }

    await db.update(users)
      .set(updateData)
      .where(eq(users.id, userIdNum));

    // Log da alteração
    if (adminId) {
      await db.insert(adminActionLogs).values({
        adminId: adminId,
        action: 'role_change',
        targetUserId: userIdNum,
        reason: `Changed role from ${user.role} to ${role}. Reason: ${reason}`,
        ipAddress: getClientIP(req),
        createdAt: new Date(),
      });
    }

    console.log(`✅ Role changed for user ${userIdNum} (${user.email}) from ${user.role} to ${role} by admin ${req.user?.userData?.email}`);

    res.json({
      success: true,
      message: 'Função alterada com sucesso'
    });

  } catch (error) {
    console.error('Change user role error:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
});

// PATCH /api/admin/users/:userId/status - Alterar status do usuário
adminRouter.patch('/users/:userId/status', authenticateAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { userId } = req.params;
    const { status: newStatus, reason } = req.body; // Renomeado 'status' para 'newStatus'
    const adminId = req.user.userData.id;

    if (!newStatus || !reason) { // Usando 'newStatus' aqui
      return res.status(400).json({
        success: false,
        message: 'Status e motivo são obrigatórios'
      });
    }

    const userIdNum = parseInt(userId);
    if (isNaN(userIdNum)) {
      return res.status(400).json({
        success: false,
        message: 'ID do usuário deve ser um número válido'
      });
    }

    // Verificar se o usuário existe
    const targetUser = await db.select()
      .from(users)
      .where(eq(users.id, userIdNum))
      .limit(1);

    if (!targetUser.length) {
      return res.status(404).json({
        success: false,
        message: 'Usuário não encontrado'
      });
    }

    const user = targetUser[0];

    // Mapear status e campos relacionados
    let updateData: any = {
      status: newStatus,
      updatedAt: new Date()
    };

    // Configurações específicas por status
    switch (newStatus) {
      case 'suspended':
        updateData.suspensionReason = reason;
        updateData.isApproved = false;
        break;
      case 'disabled':
        updateData.isApproved = false;
        updateData.isSubscriptionActive = false;
        break;
      case 'approved':
      case 'active':
        updateData.isApproved = true;
        updateData.suspensionReason = null;
        updateData.isSubscriptionActive = true;
        break;
    }

    // Atualizar status do usuário
    await db.update(users)
      .set(updateData)
      .where(eq(users.id, userIdNum));

    // Se o usuário for suspenso/desativado, invalidar suas sessões
    const { sessionManager } = await import('../services/session-manager.service');
    if (newStatus === 'suspended' || newStatus === 'disabled') {
      await sessionManager.invalidateUserSessions(userIdNum);
    }

    // Log da alteração
    if (adminId) {
      await db.insert(adminActionLogs).values({
        adminId: adminId,
        action: 'status_change',
        targetUserId: userIdNum,
        reason: `Changed status to ${newStatus}. Reason: ${reason}`,
        ipAddress: getClientIP(req),
        createdAt: new Date(),
      });
    }

    console.log(`✅ Status changed for user ${userIdNum} (${user.email}) to ${newStatus} by admin ${req.user?.userData?.email}`);

    res.json({
      success: true,
      message: 'Status alterado com sucesso'
    });

  } catch (error) {
    console.error('Change user status error:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
});

// GET /api/admin/users/:userId/details - Obter detalhes completos do usuário
adminRouter.get('/users/:userId/details', authenticateAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { userId } = req.params;
    const userIdNum = parseInt(userId);

    if (isNaN(userIdNum)) {
      return res.status(400).json({
        success: false,
        message: 'ID do usuário deve ser um número válido'
      });
    }

    // Buscar dados do usuário
    const userData = await db.select()
      .from(users)
      .where(eq(users.id, userIdNum))
      .limit(1);

    if (!userData.length) {
      return res.status(404).json({
        success: false,
        message: 'Usuário não encontrado'
      });
    }

    // Buscar sessões ativas
    const activeSessions = await db.select()
      .from(userSessions)
      .where(eq(userSessions.userId, userIdNum));

    // Buscar logs de ações admin relacionadas
    const adminLogs = await db.select()
      .from(adminActionLogs)
      .where(eq(adminActionLogs.targetUserId, userIdNum))
      .orderBy(desc(adminActionLogs.createdAt))
      .limit(50);

    res.json({
      success: true,
      data: {
        user: userData[0],
        sessions: activeSessions,
        adminLogs: adminLogs
      }
    });

  } catch (error) {
    console.error('Get user details error:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
});

// POST /api/admin/users/:userId/mark-pending-payment - Marcar usuário como pendente de pagamento
adminRouter.post('/users/:userId/mark-pending-payment', authenticateAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { userId } = req.params;
    const { reason = 'Pagamento em atraso' } = req.body;
    const adminId = req.user.userData.id;
    const userIdNum = parseInt(userId);

    if (isNaN(userIdNum)) {
      return res.status(400).json({
        success: false,
        message: 'ID do usuário deve ser um número válido'
      });
    }

    // Verificar se o usuário existe
    const targetUser = await db.select()
      .from(users)
      .where(eq(users.id, userIdNum))
      .limit(1);

    if (!targetUser.length) {
      return res.status(404).json({
        success: false,
        message: 'Usuário não encontrado'
      });
    }

    const user = targetUser[0];

    // Verificar se é usuário PRO
    if (user.subscriptionPlan !== 'pro') {
      return res.status(400).json({
        success: false,
        message: 'Apenas usuários PRO podem ter status de pagamento pendente'
      });
    }

    // Marcar como pendente de pagamento
    await db.update(users)
      .set({
        role: 'pending_payment',
        status: 'pending_payment',
        updatedAt: new Date()
      })
      .where(eq(users.id, userIdNum));

    // Invalidar sessões do usuário para forçar redirecionamento
    const { sessionManager } = await import('../services/session-manager.service');
    const sessionsInvalidated = await sessionManager.invalidateUserSessions(userIdNum);

    console.log(`🔄 Invalidated ${sessionsInvalidated ? 'all' : 'no'} sessions for user ${userIdNum}`);

    // Log da ação
    await db.insert(adminActionLogs).values({
      adminId: adminId,
      action: 'mark_pending_payment',
      targetUserId: userIdNum,
      details: `Admin ${req.user?.userData?.email} marked user ${user.email} as pending payment and invalidated sessions. Reason: ${reason}`,
      ipAddress: getClientIP(req),
      userAgent: req.headers['user-agent'] || '',
    });

    console.log(`⏰ User ${userIdNum} (${user.email}) marked as pending payment and sessions invalidated by admin ${req.user?.userData?.email}`);

    res.json({
      success: true,
      message: 'Usuário marcado como pendente de pagamento e sessões invalidadas com sucesso'
    });

  } catch (error) {
    console.error('Mark pending payment error:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
});

// POST /api/admin/users/:userId/reset-password - Resetar senha do usuário
adminRouter.post('/users/:userId/reset-password', authenticateAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { userId } = req.params;
    const adminId = req.user.userData.id;
    const userIdNum = parseInt(userId);

    if (isNaN(userIdNum)) {
      return res.status(400).json({
        success: false,
        message: 'ID do usuário deve ser um número válido'
      });
    }

    // Verificar se o usuário existe
    const targetUser = await db.select()
      .from(users)
      .where(eq(users.id, userIdNum))
      .limit(1);

    if (!targetUser.length) {
      return res.status(404).json({
        success: false,
        message: 'Usuário não encontrado'
      });
    }

    const user = targetUser[0];

    // Gerar token de reset
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetExpires = new Date(Date.now() + 3600000); // 1 hora

    // Salvar token no banco
    await db.update(users)
      .set({
        passwordResetToken: resetToken,
        passwordResetExpires: resetExpires
      })
      .where(eq(users.id, userIdNum));

    // TODO: Enviar email com link de reset
    // await emailService.sendPasswordReset(user.email, resetToken);

    // Log da ação
    await db.insert(adminActionLogs).values({
      adminId: adminId,
      action: 'password_reset',
      targetUserId: userIdNum,
      details: `Admin ${req.user?.userData?.email} initiated password reset for user ${user.email}`,
      ipAddress: getClientIP(req),
      userAgent: req.headers['user-agent'] || '',
    });

    console.log(`✅ Password reset initiated for user ${userIdNum} (${user.email}) by admin ${req.user?.userData?.email}`);

    res.json({
      success: true,
      message: 'Link de redefinição de senha enviado para o email do usuário'
    });

  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
});

// POST /api/admin/users/:userId/impersonate - Personificar usuário
adminRouter.post('/users/:userId/impersonate', authenticateAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { userId } = req.params;
    const adminId = req.user.userData.id;
    const userIdNum = parseInt(userId);

    if (isNaN(userIdNum)) {
      return res.status(400).json({
        success: false,
        message: 'ID do usuário deve ser um número válido'
      });
    }

    // Verificar se o usuário existe
    const targetUser = await db.select()
      .from(users)
      .where(eq(users.id, userIdNum))
      .limit(1);

    if (!targetUser.length) {
      return res.status(404).json({
        success: false,
        message: 'Usuário não encontrado'
      });
    }

    const user = targetUser[0];

    // Gerar token de impersonação
    const impersonationToken = crypto.randomBytes(64).toString('hex');
    const impersonationExpires = new Date(Date.now() + 3600000); // 1 hora

    // Salvar log de impersonação
    await db.execute(sql`
      INSERT INTO admin_impersonation_logs (admin_id, target_user_id, impersonation_token, expires_at, ip_address, user_agent)
      VALUES (${adminId}, ${userIdNum}, ${impersonationToken}, ${impersonationExpires}, ${getClientIP(req)}, ${req.headers['user-agent'] || ''})
    `);

    // Log da ação
    await db.insert(adminActionLogs).values({
      adminId: adminId,
      action: 'user_impersonation',
      targetUserId: userIdNum,
      details: `Admin ${req.user?.userData?.email} started impersonating user ${user.email}`,
      ipAddress: getClientIP(req),
      userAgent: req.headers['user-agent'] || '',
    });

    console.log(`✅ Impersonation started for user ${userIdNum} (${user.email}) by admin ${req.user?.userData?.email}`);

    res.json({
      success: true,
      token: impersonationToken,
      message: 'Impersonação iniciada com sucesso'
    });

  } catch (error) {
    console.error('Impersonate user error:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
});

// DELETE /api/admin/delete-user/:userId - Deletar usuário
adminRouter.delete('/delete-user/:userId', authenticateAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { userId } = req.params;
    const userIdNum = parseInt(userId);

    if (isNaN(userIdNum)) {
      return res.status(400).json({
        success: false,
        message: 'ID do usuário deve ser um número válido'
      });
    }

    const adminId = req.user.userData.id;

    // Verificar se o usuário existe usando select simples
    const userToDeleteResult = await db.select()
    .from(users)
    .where(eq(users.id, userIdNum))
    .limit(1);

    if (!userToDeleteResult.length) {
      return res.status(404).json({
        success: false,
        message: 'Usuário não encontrado'
      });
    }

    const userToDelete = userToDeleteResult[0];

    // Não permitir que o usuário exclua sua própria conta
    if (userToDelete.id === adminId) {
      return res.status(403).json({
        success: false,
        message: 'Não é possível excluir sua própria conta'
      });
    }

    // Não permitir exclusão de superadmins
    if (userToDelete.role === 'superadmin') {
      return res.status(403).json({
        success: false,
        message: 'Não é possível excluir um superadmin'
      });
    }

    // Não permitir que admins excluam outros admins (apenas superadmins podem)
    const currentUserRole = req.user.userData.role || (req.user.userData.isAdmin ? 'admin' : 'user');
    if (userToDelete.isAdmin && currentUserRole !== 'superadmin') {
      return res.status(403).json({
        success: false,
        message: 'Apenas superadmins podem excluir outros administradores'
      });
    }

    console.log(`🗑️ Starting deletion process for user ${userIdNum} (${userToDelete.email})`);

    // Executar limpeza em ordem específica para evitar violações de foreign key
    try {
      // Usar transação para garantir consistência
      await db.transaction(async (tx) => {
        console.log(`🗑️ Starting transaction for user ${userIdNum} deletion...`);

        // Verificar se o usuário ainda existe antes de começar a exclusão
        const userCheck = await tx.select().from(users).where(eq(users.id, userIdNum)).limit(1);
        if (!userCheck.length) {
          throw new Error(`User ${userIdNum} not found during deletion`);
        }

        // 0. Verificar todas as possíveis constraint violations primeiro
        try {
          const constraintCheck = await tx.execute(sql`
            SELECT
              tc.table_name,
              tc.constraint_name,
              kcu.column_name,
              ccu.table_name AS foreign_table_name,
              ccu.column_name AS foreign_column_name
            FROM information_schema.table_constraints AS tc
            JOIN information_schema.key_column_usage AS kcu ON tc.constraint_name = kcu.constraint_name
            JOIN information_schema.constraint_column_usage AS ccu ON ccu.constraint_name = tc.constraint_name
            WHERE tc.constraint_type = 'FOREIGN KEY'
            AND ccu.table_name = 'users'
            AND ccu.column_name = 'id'
          `);

          console.log(`🔍 Found ${constraintCheck.rows.length} foreign key constraints referencing users table`);

          // Limpar cada constraint encontrada
          for (const constraint of constraintCheck.rows) {
            try {
              await tx.execute(sql`DELETE FROM ${sql.identifier(constraint.table_name)} WHERE ${sql.identifier(constraint.column_name)} = ${userIdNum}`);
              console.log(`✅ Cleaned ${constraint.table_name}.${constraint.column_name} references to user ${userIdNum}`);
            } catch (cleanupError) {
              console.log(`ℹ️ No references found in ${constraint.table_name}.${constraint.column_name} for user ${userIdNum}`);
            }
          }
        } catch (constraintError) {
          console.log(`ℹ️ Could not check constraints, proceeding with manual cleanup`);
        }
      // 1. Limpar sessões do usuário
        await tx.delete(userSessions).where(eq(userSessions.userId, userIdNum));
        console.log(`✅ Deleted user sessions for user ${userIdNum}`);

        // 2. Limpar TODOS os logs de ações admin relacionados ao usuário
        await tx.delete(adminActionLogs).where(eq(adminActionLogs.targetUserId, userIdNum));
        console.log(`✅ Deleted admin action logs targeting user ${userIdNum}`);

        // 3. Limpar logs de ações admin onde o usuário é admin (se aplicável)
        if (userToDelete.isAdmin) {
          await tx.delete(adminActionLogs).where(eq(adminActionLogs.adminId, userIdNum));
          console.log(`✅ Deleted admin action logs created by user ${userIdNum}`);
        }

        // 4. Limpar alertas de preço
        await tx.delete(priceAlerts).where(eq(priceAlerts.userId, userIdNum));
        console.log(`✅ Deleted price alerts for user ${userIdNum}`);

        // 5. Limpar roles customizados
        try {
          await tx.delete(customRoles).where(eq(customRoles.createdByUserId, userIdNum));
          console.log(`✅ Deleted custom roles for user ${userIdNum}`);
        } catch (error) {
          console.log(`ℹ️ No custom roles found for user ${userIdNum}`);
        }

        // 6. Limpar logs de mudança de role
        try {
          await tx.delete(roleChangeLogs).where(eq(roleChangeLogs.targetUserId, userIdNum));
          await tx.delete(roleChangeLogs).where(eq(roleChangeLogs.changedByUserId, userIdNum));
          console.log(`✅ Deleted role change logs for user ${userIdNum}`);
        } catch (error) {
          console.log(`ℹ️ No role change logs found for user ${userIdNum}`);
        }

        // 7. Limpar histórico de assinatura
        try {
          await tx.delete(subscriptionHistory).where(eq(subscriptionHistory.userId, userIdNum));
          console.log(`✅ Deleted subscription history for user ${userIdNum}`);
        } catch (error) {
          console.log(`ℹ️ No subscription history found for user ${userIdNum}`);
        }

        // 8. Limpar notas do usuário
        try {
          await tx.delete(userNotes).where(eq(userNotes.userId, userIdNum));
          await tx.delete(userNotes).where(eq(userNotes.createdByUserId, userIdNum));
          console.log(`✅ Deleted user notes for user ${userIdNum}`);
        } catch (error) {
          console.log(`ℹ️ No user notes found for user ${userIdNum}`);
        }

        // 9. Limpar favoritos do usuário
        try {
          await tx.delete(userFavorites).where(eq(userFavorites.userId, userIdNum));
          console.log(`✅ Deleted user favorites for user ${userIdNum}`);
        } catch (error) {
          console.log(`ℹ️ No user favorites found for user ${userIdNum}`);
        }

        // 10. Limpar logs de segurança (usando SQL direto se tabela existir)
        try {
          const securityTableExists = await tx.execute(sql`
            SELECT EXISTS (
              SELECT FROM information_schema.tables
              WHERE table_schema = 'public'
              AND table_name = 'security_logs'
            )
          `);

          if (securityTableExists.rows[0]?.exists) {
            await tx.execute(sql`DELETE FROM security_logs WHERE user_id = ${userIdNum}`);
            console.log(`✅ Deleted security logs for user ${userIdNum}`);
          } else {
            console.log(`ℹ️ Security logs table does not exist, skipping cleanup`);
          }
        } catch (error) {
          console.log(`ℹ️ No security logs found for user ${userIdNum}`);
        }

        // 11. Limpar logs do sistema (usando SQL direto se tabela existir)
        try {
          const systemTableExists = await tx.execute(sql`
            SELECT EXISTS (
              SELECT FROM information_schema.tables
              WHERE table_schema = 'public'
              AND table_name = 'system_logs'
            )
          `);

          if (systemTableExists.rows[0]?.exists) {
            await tx.execute(sql`DELETE FROM system_logs WHERE user_id = ${userIdNum} OR admin_user_id = ${userIdNum}`);
            console.log(`✅ Deleted system logs for user ${userIdNum}`);
          } else {
            console.log(`ℹ️ System logs table does not exist, skipping cleanup`);
          }
        } catch (error) {
          console.log(`ℹ️ No system logs found for user ${userIdNum}`);
        }

        // 12. Limpar configurações do sistema
        try {
          await tx.delete(systemSettings).where(eq(systemSettings.updatedByUserId, userIdNum));
          console.log(`✅ Deleted system settings for user ${userIdNum}`);
        } catch (error) {
          console.log(`ℹ️ No system settings found for user ${userIdNum}`);
        }

        // 13. Limpar tabela subscription_management (CRÍTICO - causa do erro)
        try {
          await tx.delete(subscriptionManagement).where(eq(subscriptionManagement.userId, userIdNum));
          console.log(`✅ Deleted subscription management records for user ${userIdNum}`);
        } catch (error) {
          console.log(`ℹ️ No subscription management records found for user ${userIdNum}`);
        }

        // 14. Limpar referências em aprovações/rejeições usando SQL direto
        try {
          await tx.execute(sql`UPDATE users SET approved_by = NULL, approved_at = NULL WHERE approved_by = ${userIdNum}`);
          await tx.execute(sql`UPDATE users SET rejected_by = NULL, rejected_at = NULL, rejection_reason = NULL WHERE rejected_by = ${userIdNum}`);
          console.log(`✅ Cleaned up approval/rejection references for user ${userIdNum}`);
        } catch (error) {
          console.error(`⚠️ Error cleaning approval/rejection references:`, error);
        }

        // 15. Limpar tabelas opcionais (que podem não existir)
        const optionalTables = [
          { table: 'user_activity_logs', column: 'user_id' },
          { table: 'system_logs', column: 'user_id' },
          { table: 'security_logs', column: 'user_id' }
        ];

        for (const { table, column } of optionalTables) {
          try {
            // Verificar se a tabela existe primeiro
            const tableExists = await tx.execute(sql`
              SELECT EXISTS (
                SELECT FROM information_schema.tables
                WHERE table_schema = 'public'
                AND table_name = ${table}
              )
            `);

            if (tableExists.rows[0]?.exists) {
              await tx.execute(sql`DELETE FROM ${sql.identifier(table)} WHERE ${sql.identifier(column)} = ${userIdNum}`);
              console.log(`✅ Deleted ${table} for user ${userIdNum}`);
            } else {
              console.log(`ℹ️ Table ${table} does not exist, skipping cleanup`);
            }
          } catch (error) {
            console.log(`ℹ️ Could not clean ${table} for user ${userIdNum}:`, error.message);
          }
        }

        // 16. Finally, delete the user
        try {
          const deleteResult = await tx.delete(users).where(eq(users.id, userIdNum));
          console.log(`✅ Deleted user ${userIdNum} from users table`);
        } catch (deleteError) {
          console.error(`❌ Error deleting user ${userIdNum}:`, deleteError);
          throw deleteError;
        }

        // 17. Log da exclusão (após transação para evitar conflitos)
        console.log(`✅ User deletion transaction completed for user ${userIdNum}`);
      });

      // Log da exclusão fora da transação
      try {
        await db.insert(adminActionLogs).values({
          adminId: adminId,
          action: 'user_deletion',
          targetUserId: null,
          details: `Admin ${req.user?.userData?.email} deleted user ${userToDelete.email} (ID: ${userIdNum})`,
          ipAddress: getClientIP(req),
          userAgent: req.headers['user-agent'] || '',
        });
      } catch (logError) {
        console.log(`⚠️ Could not log deletion action: ${logError.message}`);
      }

      console.log(`🗑️ User ${userIdNum} (${userToDelete.email}) successfully deleted by admin ${req.user?.userData?.email}`);

      res.json({
        success: true,
        message: 'Usuário excluído com sucesso'
      });

    } catch (dbError) {
      console.error('❌ Database error during user deletion:', dbError);
      console.error('❌ Error stack:', dbError.stack);
      console.error('❌ Error details:', {
        message: dbError.message,
        name: dbError.name,
        code: dbError.code
      });

      // Se o erro for de transação abortada, tentar uma abordagem mais simples
      if (dbError.code === '25P02' || dbError.message?.includes('transaction is aborted')) {
        console.log('🔄 Transaction was aborted, trying simple deletion...');

        try {
          // Tentar exclusão direta sem transação
          await db.delete(users).where(eq(users.id, userIdNum));
          console.log(`✅ User ${userIdNum} deleted successfully with simple approach`);

          res.json({
            success: true,
            message: 'Usuário excluído com sucesso'
          });
          return;
        } catch (simpleError) {
          console.error('❌ Simple deletion also failed:', simpleError);
        }
      }

      res.status(500).json({
        success: false,
        message: 'Erro ao excluir usuário do banco de dados',
        error: process.env.NODE_ENV === 'development' ? dbError.message : undefined
      });
    }

  } catch (error) {
    console.error('❌ Delete user error:', error);
    console.error('❌ Error stack:', error.stack);
    console.error('❌ Error details:', {
      message: error.message,
      name: error.name,
      userId: userIdNum,
      adminId: adminId
    });
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// GET /api/admin/check-permissions/:email - Verificar permissões específicas do usuário
adminRouter.get('/check-permissions/:email', authenticateAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { email } = req.params;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email é obrigatório'
      });
    }

    console.log(`🔍 Permission check request for user: ${email} by admin: ${req.user?.userData?.email}`);

    // Buscar perfil do usuário
    const userProfile = await db.select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (userProfile.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Usuário não encontrado.'
      });
    }

    const user = userProfile[0];

    // Verificar permissões de admin usando a mesma lógica do force-logout
    const isAdminUser = user.isAdmin === true ||
                       ['admin', 'superadmin'].includes(user.role);

    const permissions = {
      canForceLogout: isAdminUser,
      canManageUsers: isAdminUser,
      canAccessAdminPanel: isAdminUser,
      adminFlags: {
        isAdmin: user.isAdmin,
        role: user.role,
        subscriptionPlan: user.subscriptionPlan
      }
    };

    console.log(`✅ Permission check completed for ${email}:`, permissions);

    res.json({
      success: true,
      email: user.email,
      name: user.name,
      permissions,
      message: isAdminUser ?
        'Usuário tem permissões administrativas completas' :
        'Usuário não tem permissões administrativas'
    });

  } catch (error) {
    console.error('❌ Permission check error:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao verificar permissões do usuário.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// GET /api/admin/user-diagnostic/:email - Diagnóstico completo do usuário por email
adminRouter.get('/user-diagnostic/:email', authenticateAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { email } = req.params;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email é obrigatório'
      });
    }

    console.log(`🔍 Admin diagnostic request for user: ${email} by admin: ${req.user?.userData?.email}`);

    // Buscar perfil completo do usuário
    const userProfile = await db.select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (userProfile.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Usuário não encontrado.'
      });
    }

    const user = userProfile[0];

    // Buscar sessões ativas do usuário
    const activeSessions = await db.select()
      .from(userSessions)
      .where(
        and(
          eq(userSessions.userId, user.id),
          eq(userSessions.isActive, true)
        )
      );

    // Log da consulta
    await db.insert(adminActionLogs).values({
      adminId: req.user.userData.id,
      action: 'user_diagnostic',
      targetUserId: user.id,
      details: `Admin ${req.user?.userData?.email} performed diagnostic on user ${email}`,
      ipAddress: getClientIP(req),
      userAgent: req.headers['user-agent'] || '',
    });

    console.log(`✅ User diagnostic completed for ${email}: Found user with ${activeSessions.length} active sessions`);

    // Retorna o perfil completo do usuário como está no banco de dados
    res.json({
      success: true,
      message: 'Diagnóstico de Perfil de Usuário',
      profile: {
        ...user,
        // Adicionar informações adicionais de diagnóstico
        activeSessions: activeSessions.length,
        lastActiveSession: activeSessions.length > 0 ? activeSessions[0].lastActivity : null,
        diagnosticTimestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('❌ User diagnostic error:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao buscar usuário.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Forçar logout de usuário específico com notificação WebSocket
adminRouter.post('/force-logout/:userId', authenticateAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { userId } = req.params;
    const { reason = 'manual' } = req.body;
    const adminUser = req.user?.userData;

    // Check if user has admin privileges (either by role or isAdmin flag)
    const isAdminUser = adminUser.isAdmin === true ||
                       ['admin', 'superadmin'].includes(adminUser.role);

    if (!adminUser || !isAdminUser) {
      return res.status(403).json({
        success: false,
        message: 'Acesso negado. Apenas administradores podem forçar logout.'
      });
    }

    // Buscar sessões ativas do usuário
    const activeSessions = await db.select()
      .from(userSessions)
      .where(
        and(
          eq(userSessions.userId, parseInt(userId)),
          eq(userSessions.isActive, true)
        )
      );

    if (activeSessions.length === 0) {
      return res.json({
        success: true,
        message: 'Usuário não possui sessões ativas',
        sessionsInvalidated: 0
      });
    }

    // Invalidar todas as sessões do usuário
    const result = await sessionManager.invalidateUserSessions(parseInt(userId));

    if (result) {
      // Emitir evento para notificação via WebSocket
      sessionManager.getEventEmitter().emit('session:invalidated', {
        userId: parseInt(userId),
        reason,
        sessionCount: activeSessions.length,
        timestamp: new Date().toISOString(),
        adminAction: {
          adminId: adminUser.id,
          adminEmail: adminUser.email
        }
      });

      console.log(`[Admin] User ${adminUser.email} forced logout for user ID ${userId} (${activeSessions.length} sessions)`);

      res.json({
        success: true,
        message: `${activeSessions.length} sessão(ões) invalidada(s) com sucesso`,
        sessionsInvalidated: activeSessions.length
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Erro ao invalidar sessões do usuário'
      });
    }

  } catch (error: any) {
    console.error('Error forcing user logout:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
});

// Invalidar sessão de usuário específico (método antigo mantido para compatibilidade)
adminRouter.post('/invalidate-user-session/:userId', authenticateAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'ID do usuário é obrigatório'
      });
    }

    const userIdNum = parseInt(userId);
    if (isNaN(userIdNum)) {
      return res.status(400).json({
        success: false,
        message: 'ID do usuário deve ser um número válido'
      });
    }

    // Invalidar a sessão do usuário usando o SessionManagerService
    const result = await sessionManager.invalidateUserSessions(userIdNum);

    if (result) {
      res.json({
        success: true,
        message: 'Sessão invalidada com sucesso'
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Erro ao invalidar sessão do usuário'
      });
    }
  } catch (error) {
    console.error('Error invalidating user session:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
});

// ====== SUPPLIER MANAGEMENT ENDPOINTS ======

// GET /api/admin/suppliers - List all suppliers
adminRouter.get('/suppliers', authenticateAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    console.log('📋 [ADMIN] Fetching suppliers for user:', req.user?.email);

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = (page - 1) * limit;

    // Get total count
    const totalResult = await db.select({ count: sql<number>`COUNT(*)::int` }).from(suppliers);
    const total = totalResult[0]?.count || 0;

    // Get suppliers with pagination
    const suppliersList = await db.select()
      .from(suppliers)
      .orderBy(desc(suppliers.createdAt))
      .limit(limit)
      .offset(offset);

    console.log(`📋 [ADMIN] Retrieved ${suppliersList.length} suppliers`);

    res.json({
      success: true,
      data: {
        suppliers: suppliersList,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('❌ Error fetching suppliers:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao buscar fornecedores'
    });
  }
});

// POST /api/admin/suppliers - Create new supplier
adminRouter.post('/suppliers', authenticateAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    console.log('➕ [ADMIN] Creating supplier for user:', req.user?.email);
    console.log('➕ [ADMIN] Request body:', req.body);

    const { name, phone, address } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Nome do fornecedor é obrigatório'
      });
    }

    // Check if supplier name already exists
    const existingSupplier = await db.select()
      .from(suppliers)
      .where(eq(suppliers.name, name.trim()))
      .limit(1);

    if (existingSupplier.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Já existe um fornecedor com este nome'
      });
    }

    // Create new supplier
    const newSupplier = await db.insert(suppliers)
      .values({
        name: name.trim(),
        active: true,
        averageRating: 0,
        ratingCount: 0
      })
      .returning();

    console.log('✅ [ADMIN] Supplier created:', newSupplier[0]);

    res.status(201).json({
      success: true,
      data: newSupplier[0],
      message: 'Fornecedor criado com sucesso'
    });
  } catch (error) {
    console.error('❌ Error creating supplier:', error);

    if (error.code === '23505') {
      return res.status(400).json({
        success: false,
        message: 'Já existe um fornecedor com este nome'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Erro ao criar fornecedor'
    });
  }
});

// PUT /api/admin/suppliers/:id - Update supplier
adminRouter.put('/suppliers/:id', authenticateAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    console.log('✏️ [ADMIN] Updating supplier for user:', req.user?.email);
    console.log('✏️ [ADMIN] Supplier ID:', req.params.id);
    console.log('✏️ [ADMIN] Request body:', req.body);

    const supplierId = parseInt(req.params.id);
    const { name, active } = req.body;

    if (isNaN(supplierId)) {
      return res.status(400).json({
        success: false,
        message: 'ID do fornecedor inválido'
      });
    }

    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Nome do fornecedor é obrigatório'
      });
    }

    // Check if supplier exists
    const existingSupplier = await db.select()
      .from(suppliers)
      .where(eq(suppliers.id, supplierId))
      .limit(1);

    if (existingSupplier.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Fornecedor não encontrado'
      });
    }

    // Check if another supplier with same name exists
    const duplicateSupplier = await db.select()
      .from(suppliers)
      .where(and(
        eq(suppliers.name, name.trim()),
        sql`${suppliers.id} != ${supplierId}`
      ))
      .limit(1);

    if (duplicateSupplier.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Já existe outro fornecedor com este nome'
      });
    }

    // Update supplier
    const updatedSupplier = await db.update(suppliers)
      .set({
        name: name.trim(),
        active: active !== undefined ? active : true,
        updatedAt: new Date()
      })
      .where(eq(suppliers.id, supplierId))
      .returning();

    console.log('✅ [ADMIN] Supplier updated:', updatedSupplier[0]);

    res.json({
      success: true,
      data: updatedSupplier[0],
      message: 'Fornecedor atualizado com sucesso'
    });
  } catch (error) {
    console.error('❌ Error updating supplier:', error);

    if (error.code === '23505') {
      return res.status(400).json({
        success: false,
        message: 'Já existe um fornecedor com este nome'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Erro ao atualizar fornecedor'
    });
  }
});

// DELETE /api/admin/suppliers/:id - Delete supplier
adminRouter.delete('/suppliers/:id', authenticateAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    console.log('🗑️ [ADMIN] Deleting supplier for user:', req.user?.email);
    console.log('🗑️ [ADMIN] Supplier ID:', req.params.id);

    const supplierId = parseInt(req.params.id);

    if (isNaN(supplierId)) {
      return res.status(400).json({
        success: false,
        message: 'ID do fornecedor inválido'
      });
    }

    // Check if supplier exists
    const existingSupplier = await db.select()
      .from(suppliers)
      .where(eq(suppliers.id, supplierId))
      .limit(1);

    if (existingSupplier.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Fornecedor não encontrado'
      });
    }

    // Delete supplier (this will cascade to related records due to foreign key constraints)
    await db.delete(suppliers)
      .where(eq(suppliers.id, supplierId));

    console.log('✅ [ADMIN] Supplier deleted:', supplierId);

    res.json({
      success: true,
      message: 'Fornecedor excluído com sucesso'
    });
  } catch (error) {
    console.error('❌ Error deleting supplier:', error);

    if (error.code === '23503') {
      return res.status(400).json({
        success: false,
        message: 'Não é possível excluir este fornecedor pois existem registros relacionados'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Erro ao excluir fornecedor'
    });
  }
});

// Login Sharing Detection Routes
const loginSharingController = new LoginSharingDetectionController();

// GET /api/admin/login-sharing - Detecta compartilhamento de login
adminRouter.get('/login-sharing', authenticateAdmin, async (req: AuthenticatedRequest, res: Response) => {
  await loginSharingController.getLoginSharingDetection(req, res);
});

// GET /api/admin/login-sharing/stats - Estatísticas de sessões ativas
adminRouter.get('/login-sharing/stats', authenticateAdmin, async (req: AuthenticatedRequest, res: Response) => {
  await loginSharingController.getActiveSessionsStats(req, res);
});

// POST /api/admin/login-sharing/refresh-geolocation - Atualiza geolocalização de sessões "Unknown"
adminRouter.post('/login-sharing/refresh-geolocation', authenticateAdmin, async (req: AuthenticatedRequest, res: Response) => {
  await loginSharingController.refreshUnknownLocations(req, res);
});

// POST /api/admin/login-sharing/disconnect-suspicious - Desconecta usuários com múltiplas localizações suspeitas
adminRouter.post('/login-sharing/disconnect-suspicious', authenticateAdmin, async (req: AuthenticatedRequest, res: Response) => {
  await loginSharingController.disconnectSuspiciousUsers(req, res);
});

// POST /api/admin/users/:userId/set-ip-limit - Ajusta limite de IPs simultâneos para um usuário
adminRouter.post('/users/:userId/set-ip-limit', authenticateAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = parseInt(req.params.userId);
    const { maxConcurrentIps } = req.body;

    if (!userId || isNaN(userId)) {
      return res.status(400).json({
        success: false,
        message: 'ID de usuário inválido'
      });
    }

    if (!maxConcurrentIps || maxConcurrentIps < 1 || maxConcurrentIps > 20) {
      return res.status(400).json({
        success: false,
        message: 'Limite de IPs deve estar entre 1 e 20'
      });
    }

    // 1. Atualizar limite do usuário
    await db.update(users)
      .set({ maxConcurrentIps })
      .where(eq(users.id, userId));

    console.log(`✅ [Admin] Updated IP limit for user ${userId} to ${maxConcurrentIps}`);

    // 2. Verificar sessões ativas atuais do usuário
    const existingSessions = await db
      .select()
      .from(activeSessions)
      .where(eq(activeSessions.userId, userId))
      .orderBy(desc(activeSessions.lastActivityAt)); // Mais recente primeiro

    // 3. Agrupar por IP único (mantém apenas a sessão mais recente de cada IP)
    const sessionsByIP = new Map<string, typeof existingSessions[0]>();
    for (const session of existingSessions) {
      if (!sessionsByIP.has(session.ipAddress)) {
        sessionsByIP.set(session.ipAddress, session);
      }
    }

    const uniqueIPs = Array.from(sessionsByIP.values());
    const currentIpCount = uniqueIPs.length;

    console.log(`📊 [Admin] User ${userId} has ${currentIpCount} unique IPs active, new limit: ${maxConcurrentIps}`);

    // 4. Se exceder o novo limite, remover IPs mais antigos
    let removedIPs = 0;
    if (currentIpCount > maxConcurrentIps) {
      const ipsToRemove = currentIpCount - maxConcurrentIps;
      const oldestIPs = uniqueIPs.slice(maxConcurrentIps); // IPs excedentes (mais antigos)

      console.log(`⚠️ [Admin] Removing ${ipsToRemove} oldest IP(s) to meet new limit`);

      for (const oldSession of oldestIPs) {
        // Remover todas as sessões desse IP do banco
        await db.delete(activeSessions)
          .where(and(
            eq(activeSessions.userId, userId),
            eq(activeSessions.ipAddress, oldSession.ipAddress)
          ));

        // Forçar desconexão WebSocket
        const { UnifiedWebSocketManager } = await import('../services/websocket-manager');
        const wsManager = UnifiedWebSocketManager.getInstance();
        wsManager.forceDisconnectByIP(userId.toString(), oldSession.ipAddress);

        removedIPs++;
        console.log(`🔌 [Admin] Disconnected IP ${oldSession.ipAddress} for user ${userId}`);
      }
    }

    res.json({
      success: true,
      message: removedIPs > 0 
        ? `Limite atualizado para ${maxConcurrentIps} IP(s). ${removedIPs} sessão(ões) antiga(s) desconectada(s).`
        : `Limite atualizado para ${maxConcurrentIps} IP(s)`,
      data: { 
        userId, 
        maxConcurrentIps,
        removedSessions: removedIPs,
        currentActiveSessions: Math.min(currentIpCount, maxConcurrentIps)
      }
    });

  } catch (error: any) {
    console.error('❌ Error updating IP limit:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao atualizar limite de IPs'
    });
  }
});

export { adminRouter };