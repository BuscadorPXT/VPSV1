import { Router } from 'express';
import type { Request, Response } from 'express';
import { db } from '../db';
import { systemNotifications, userNotificationReads, users } from '../../shared/schema';
import { eq, and, desc, inArray, or, isNull, gte } from 'drizzle-orm';
import { authenticateToken, type AuthenticatedRequest } from '../middleware/auth';
import { hasAdminAccess } from '../../shared/schema';
import { broadcastToUserChannel, getConnectedUsers } from '../websocket-manager';
import { sql } from 'drizzle-orm';

const router = Router();

// GET /api/notifications - Buscar notificações para o usuário
router.get('/', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const userPlan = req.user!.subscriptionPlan || 'free';
    const userRole = req.user!.role || 'user';

    // Buscar notificações ativas que são direcionadas ao usuário
    const notifications = await db
      .select({
        id: systemNotifications.id,
        title: systemNotifications.title,
        message: systemNotifications.message,
        type: systemNotifications.type,
        priority: systemNotifications.priority,
        showAsPopup: systemNotifications.showAsPopup,
        showAsBanner: systemNotifications.showAsBanner,
        createdAt: systemNotifications.createdAt,
        isRead: userNotificationReads.readAt,
      })
      .from(systemNotifications)
      .leftJoin(
        userNotificationReads,
        and(
          eq(userNotificationReads.notificationId, systemNotifications.id),
          eq(userNotificationReads.userId, userId)
        )
      )
      .where(
        and(
          eq(systemNotifications.isActive, true),
          or(
            isNull(systemNotifications.expiresAt),
            gte(systemNotifications.expiresAt, new Date())
          ),
          or(
            // Handle targetAudience as array safely
            sql`${systemNotifications.targetAudience} @> ARRAY['all']::text[]`,
            sql`${systemNotifications.targetAudience} @> ARRAY[${userPlan}]::text[]`,
            sql`${systemNotifications.targetAudience} @> ARRAY[${userRole}]::text[]`
          )
        )
      )
      .orderBy(desc(systemNotifications.createdAt))
      .limit(50);

    const unreadCount = notifications.filter(n => !n.isRead).length;

    res.json({
      notifications: notifications.map(n => ({
        ...n,
        isRead: !!n.isRead
      })),
      unreadCount,
      totalCount: notifications.length
    });

  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ message: 'Erro ao buscar notificações' });
  }
});

// GET /api/notifications/unread - Buscar apenas notificações não lidas
router.get('/unread', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const userPlan = req.user!.subscriptionPlan || 'free';
    const userRole = req.user!.role || 'user';

    const unreadNotifications = await db
      .select({
        id: systemNotifications.id,
        title: systemNotifications.title,
        message: systemNotifications.message,
        type: systemNotifications.type,
        priority: systemNotifications.priority,
        showAsPopup: systemNotifications.showAsPopup,
        showAsBanner: systemNotifications.showAsBanner,
        createdAt: systemNotifications.createdAt,
      })
      .from(systemNotifications)
      .leftJoin(
        userNotificationReads,
        and(
          eq(userNotificationReads.notificationId, systemNotifications.id),
          eq(userNotificationReads.userId, userId)
        )
      )
      .where(
        and(
          eq(systemNotifications.isActive, true),
          isNull(userNotificationReads.id), // Não tem registro de leitura
          or(
            isNull(systemNotifications.expiresAt),
            gte(systemNotifications.expiresAt, new Date())
          ),
          or(
            // Handle targetAudience as array safely  
            sql`${systemNotifications.targetAudience} @> ARRAY['all']::text[]`,
            sql`${systemNotifications.targetAudience} @> ARRAY[${userPlan}]::text[]`,
            sql`${systemNotifications.targetAudience} @> ARRAY[${userRole}]::text[]`
          )
        )
      )
      .orderBy(desc(systemNotifications.createdAt));

    res.json({
      notifications: unreadNotifications,
      count: unreadNotifications.length
    });

  } catch (error) {
    console.error('Error fetching unread notifications:', error);
    res.status(500).json({ message: 'Erro ao buscar notificações não lidas' });
  }
});

// POST /api/notifications/:id/read - Marcar notificação como lida
router.post('/:id/read', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const notificationId = parseInt(req.params.id);
    const userId = req.user!.id;

    // Verificar se a notificação existe
    const notification = await db
      .select()
      .from(systemNotifications)
      .where(eq(systemNotifications.id, notificationId))
      .limit(1);

    if (notification.length === 0) {
      return res.status(404).json({ message: 'Notificação não encontrada' });
    }

    // Marcar como lida (inserir ou ignorar se já existe)
    await db
      .insert(userNotificationReads)
      .values({
        userId,
        notificationId
      })
      .onConflictDoNothing();

    res.json({ message: 'Notificação marcada como lida' });

  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({ message: 'Erro ao marcar notificação como lida' });
  }
});

// POST /api/notifications/mark-all-read - Marcar todas como lidas
router.post('/mark-all-read', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;
    const userPlan = req.user!.subscriptionPlan || 'free';
    const userRole = req.user!.role || 'user';

    // Buscar todas as notificações não lidas do usuário
    const unreadNotifications = await db
      .select({ id: systemNotifications.id })
      .from(systemNotifications)
      .leftJoin(
        userNotificationReads,
        and(
          eq(userNotificationReads.notificationId, systemNotifications.id),
          eq(userNotificationReads.userId, userId)
        )
      )
      .where(
        and(
          eq(systemNotifications.isActive, true),
          isNull(userNotificationReads.id),
          or(
            // Handle targetAudience as array safely
            sql`${systemNotifications.targetAudience} @> ARRAY['all']::text[]`,
            sql`${systemNotifications.targetAudience} @> ARRAY[${userPlan}]::text[]`,
            sql`${systemNotifications.targetAudience} @> ARRAY[${userRole}]::text[]`
          )
        )
      );

    // Marcar todas como lidas
    for (const notification of unreadNotifications) {
      await db
        .insert(userNotificationReads)
        .values({
          userId,
          notificationId: notification.id
        })
        .onConflictDoNothing();
    }

    res.json({ 
      message: 'Todas as notificações marcadas como lidas',
      count: unreadNotifications.length
    });

  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    res.status(500).json({ message: 'Erro ao marcar todas as notificações como lidas' });
  }
});

// POST /api/notifications - Criar nova notificação (Admin only)
router.post('/', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!hasAdminAccess(req.user!)) {
      return res.status(403).json({ message: 'Acesso negado' });
    }

    const {
      title,
      message,
      type = 'info',
      priority = 'normal',
      targetAudience = ['all'],
      showAsPopup = true,
      showAsBanner = false,
      expiresAt
    } = req.body;

    if (!title || !message) {
      return res.status(400).json({ message: 'Título e mensagem são obrigatórios' });
    }

    const [notification] = await db
      .insert(systemNotifications)
      .values({
        title,
        message,
        type,
        priority,
        targetAudience,
        showAsPopup,
        showAsBanner,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        createdByUserId: req.user!.id
      })
      .returning();

    // Enviar notificação via WebSocket para usuários conectados
    const connectedUsers = getConnectedUsers();
    const notificationData = {
      type: 'new_notification',
      data: {
        id: notification.id,
        title: notification.title,
        message: notification.message,
        type: notification.type,
        priority: notification.priority,
        showAsPopup: notification.showAsPopup,
        showAsBanner: notification.showAsBanner,
        createdAt: notification.createdAt
      }
    };

    // Broadcast para todos os usuários conectados
    for (const userId of connectedUsers) {
      await broadcastToUserChannel(userId, notificationData);
    }

    res.status(201).json({
      message: 'Notificação criada com sucesso',
      notification
    });

  } catch (error) {
    console.error('Error creating notification:', error);
    res.status(500).json({ message: 'Erro ao criar notificação' });
  }
});

export default router;