import { Router } from 'express';
import type { Request, Response } from 'express';
import { db } from '../db';
import { eq, desc, and, sql, inArray } from 'drizzle-orm';
import { 
  emergencyAlerts, 
  emergencyAlertViews, 
  users 
} from '../../shared/schema';
import { authenticateToken, type AuthenticatedRequest } from '../middleware/auth';
import { authenticateAdmin, type AdminRequest } from '../middleware/admin-auth';
import { broadcastToUserChannel, broadcastEmergencyAlert } from '../websocket-manager';

const emergencyAlertsRouter = Router();

// GET /api/emergency-alerts - Listar todos os avisos (Admin)
emergencyAlertsRouter.get('/', authenticateAdmin, async (req: AdminRequest, res: Response) => {
  try {
    const alerts = await db.select({
      id: emergencyAlerts.id,
      title: emergencyAlerts.title,
      message: emergencyAlerts.message,
      urgency: emergencyAlerts.urgency,
      sentBy: emergencyAlerts.sentBy,
      isActive: emergencyAlerts.isActive,
      sentAt: emergencyAlerts.sentAt,
      createdAt: emergencyAlerts.createdAt,
      senderName: users.name,
      senderEmail: users.email
    })
    .from(emergencyAlerts)
    .leftJoin(users, eq(emergencyAlerts.sentBy, users.id))
    .orderBy(desc(emergencyAlerts.createdAt));

    // Contar visualizações para cada alerta
    const alertsWithStats = await Promise.all(alerts.map(async (alert) => {
      const viewCount = await db.select({ count: sql<number>`COUNT(*)` })
        .from(emergencyAlertViews)
        .where(eq(emergencyAlertViews.alertId, alert.id));

      return {
        ...alert,
        viewCount: viewCount[0]?.count || 0
      };
    }));

    res.json({ alerts: alertsWithStats });
  } catch (error) {
    console.error('Error fetching emergency alerts:', error);
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
});

// POST /api/emergency-alerts - Criar novo aviso emergencial
emergencyAlertsRouter.post('/', authenticateAdmin, async (req: AdminRequest, res: Response) => {
  try {
    console.log('🚨 [Emergency Alert] POST request received');
    console.log('🔍 [Emergency Alert] User data:', {
      id: req.user?.id,
      email: req.user?.email,
      isAdmin: req.user?.isAdmin,
      role: req.user?.role
    });

    const { title, message, urgency = 'medium' } = req.body;
    const adminId = req.user?.id;

    console.log('📝 [Emergency Alert] Alert data:', { title, message, urgency, adminId });

    if (!title || !message) {
      return res.status(400).json({ message: 'Titulo e mensagem sao obrigatorios' });
    }

    if (!['low', 'medium', 'high'].includes(urgency)) {
      return res.status(400).json({ message: 'Urgencia deve ser low, medium ou high' });
    }

    // Criar o alerta
    const [newAlert] = await db.insert(emergencyAlerts).values({
      title,
      message,
      urgency,
      sentBy: adminId
    }).returning();

    // Buscar todos os usuários ativos
    const activeUsers = await db.select({
      id: users.id,
      name: users.name,
      email: users.email
    }).from(users).where(eq(users.isApproved, true));

    // Enviar notificação via WebSocket para todos os usuários online
    const alertPayload = {
      id: newAlert.id,
      title: newAlert.title,
      message: newAlert.message,
      urgency: newAlert.urgency,
      sentAt: newAlert.sentAt
    };

    // Broadcast geral para todas as conexões ativas
    const totalBroadcasted = broadcastEmergencyAlert(alertPayload);

    // Também enviar individualmente para garantir entrega
    const broadcastPromises = activeUsers.map(user => 
      broadcastToUserChannel(user.id.toString(), {
        type: 'emergency_alert',
        data: alertPayload
      })
    );

    await Promise.allSettled(broadcastPromises);

    console.log(`📢 Emergency alert sent: "${title}" to ${activeUsers.length} users (${totalBroadcasted} total connections)`);

    res.status(201).json({
      message: 'Aviso emergencial enviado com sucesso',
      alert: newAlert,
      sentToUsers: activeUsers.length
    });

  } catch (error) {
    console.error('Error creating emergency alert:', error);
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
});

// GET /api/emergency-alerts/pending - Buscar avisos pendentes para o usuário
emergencyAlertsRouter.get('/pending', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    console.log('🚨 [Emergency Alert] GET /pending request');
    console.log('🔍 [Emergency Alert] Request headers:', {
      authorization: req.headers.authorization ? 'Present' : 'Missing',
      'x-firebase-token': req.headers['x-firebase-token'] ? 'Present' : 'Missing'
    });
    
    console.log('🔍 [Emergency Alert] User auth data:', {
      user: req.user ? 'Present' : 'Missing',
      userData: req.user?.userData ? 'Present' : 'Missing',
      userId: req.user?.userData?.id,
      email: req.user?.userData?.email,
      role: req.user?.userData?.role,
      isAdmin: req.user?.userData?.isAdmin
    });

    // Tentar diferentes caminhos para obter o userId
    const userId = req.user?.userData?.id || req.user?.id;

    if (!userId) {
      console.log('❌ [Emergency Alert] Usuario nao autenticado');
      console.log('📋 [Emergency Alert] Full req.user object:', JSON.stringify(req.user, null, 2));
      return res.status(401).json({ message: 'Usuario nao autenticado' });
    }

    console.log(`✅ [Emergency Alert] User authenticated: ${userId}`);

    // Buscar alertas ativos que o usuário ainda não visualizou
    const pendingAlerts = await db.select({
      id: emergencyAlerts.id,
      title: emergencyAlerts.title,
      message: emergencyAlerts.message,
      urgency: emergencyAlerts.urgency,
      sentAt: emergencyAlerts.sentAt
    })
    .from(emergencyAlerts)
    .leftJoin(emergencyAlertViews, and(
      eq(emergencyAlertViews.alertId, emergencyAlerts.id),
      eq(emergencyAlertViews.userId, userId)
    ))
    .where(and(
      eq(emergencyAlerts.isActive, true),
      sql`${emergencyAlertViews.id} IS NULL`
    ))
    .orderBy(desc(emergencyAlerts.sentAt));

    res.json({ alerts: pendingAlerts });
  } catch (error) {
    console.error('Error fetching pending alerts:', error);
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
});

// POST /api/emergency-alerts/:id/mark-read - Marcar alerta como lido
emergencyAlertsRouter.post('/:id/mark-read', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const alertId = parseInt(req.params.id);
    const userId = req.user?.userData?.id || req.user?.id;

    if (!userId) {
      return res.status(401).json({ message: 'Usuario nao autenticado' });
    }

    if (isNaN(alertId)) {
      return res.status(400).json({ message: 'ID do alerta invalido' });
    }

    // Verificar se já foi marcado como lido
    const existingView = await db.select()
      .from(emergencyAlertViews)
      .where(and(
        eq(emergencyAlertViews.alertId, alertId),
        eq(emergencyAlertViews.userId, userId)
      ));

    if (existingView.length === 0) {
      // Marcar como lido
      await db.insert(emergencyAlertViews).values({
        alertId,
        userId
      });
    }

    res.json({ message: 'Alerta marcado como lido' });
  } catch (error) {
    console.error('Error marking alert as read:', error);
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
});

// PUT /api/emergency-alerts/:id/toggle - Ativar/desativar alerta
emergencyAlertsRouter.put('/:id/toggle', authenticateAdmin, async (req: AdminRequest, res: Response) => {
  try {
    const alertId = parseInt(req.params.id);

    if (isNaN(alertId)) {
      return res.status(400).json({ message: 'ID do alerta invalido' });
    }

    // Buscar alerta atual
    const [currentAlert] = await db.select()
      .from(emergencyAlerts)
      .where(eq(emergencyAlerts.id, alertId));

    if (!currentAlert) {
      return res.status(404).json({ message: 'Alerta nao encontrado' });
    }

    // Alternar status
    const [updatedAlert] = await db.update(emergencyAlerts)
      .set({ isActive: !currentAlert.isActive })
      .where(eq(emergencyAlerts.id, alertId))
      .returning();

    res.json({
      message: `Alerta ${updatedAlert.isActive ? 'ativado' : 'desativado'} com sucesso`,
      alert: updatedAlert
    });
  } catch (error) {
    console.error('Error toggling alert:', error);
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
});

// POST /api/emergency-alerts/:id/resend - Reenviar alerta
emergencyAlertsRouter.post('/:id/resend', authenticateAdmin, async (req: AdminRequest, res: Response) => {
  try {
    const alertId = parseInt(req.params.id);

    if (isNaN(alertId)) {
      return res.status(400).json({ message: 'ID do alerta invalido' });
    }

    // Buscar alerta
    const [alert] = await db.select()
      .from(emergencyAlerts)
      .where(eq(emergencyAlerts.id, alertId));

    if (!alert) {
      return res.status(404).json({ message: 'Alerta nao encontrado' });
    }

    // Buscar usuários que ainda não visualizaram
    const usersNotViewed = await db.select({
      id: users.id,
      name: users.name,
      email: users.email
    })
    .from(users)
    .leftJoin(emergencyAlertViews, and(
      eq(emergencyAlertViews.alertId, alertId),
      eq(emergencyAlertViews.userId, users.id)
    ))
    .where(and(
      eq(users.isApproved, true),
      sql`${emergencyAlertViews.id} IS NULL`
    ));

    // Reenviar via WebSocket
    const alertPayload = {
      type: 'emergency_alert',
      data: {
        id: alert.id,
        title: alert.title,
        message: alert.message,
        urgency: alert.urgency,
        sentAt: alert.sentAt,
        isResend: true
      }
    };

    const broadcastPromises = usersNotViewed.map(user => 
      broadcastToUserChannel(user.id.toString(), alertPayload)
    );

    await Promise.allSettled(broadcastPromises);

    console.log(`📢 Emergency alert resent: "${alert.title}" to ${usersNotViewed.length} users`);

    res.json({
      message: 'Alerta reenviado com sucesso',
      sentToUsers: usersNotViewed.length
    });

  } catch (error) {
    console.error('Error resending alert:', error);
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
});

// DELETE /api/emergency-alerts/:id - Excluir alerta
emergencyAlertsRouter.delete('/:id', authenticateAdmin, async (req: AdminRequest, res: Response) => {
  try {
    const alertId = parseInt(req.params.id);

    if (isNaN(alertId)) {
      return res.status(400).json({ message: 'ID do alerta invalido' });
    }

    // Verificar se o alerta existe
    const [alert] = await db.select()
      .from(emergencyAlerts)
      .where(eq(emergencyAlerts.id, alertId));

    if (!alert) {
      return res.status(404).json({ message: 'Alerta nao encontrado' });
    }

    // Excluir visualizações relacionadas primeiro
    await db.delete(emergencyAlertViews)
      .where(eq(emergencyAlertViews.alertId, alertId));

    // Excluir o alerta
    await db.delete(emergencyAlerts)
      .where(eq(emergencyAlerts.id, alertId));

    console.log(`🗑️ Emergency alert deleted: "${alert.title}" by admin ${req.user?.email}`);

    res.json({ message: 'Alerta excluido com sucesso' });

  } catch (error) {
    console.error('Error deleting alert:', error);
    res.status(500).json({ message: 'Erro interno do servidor' });
  }
});

export { emergencyAlertsRouter };