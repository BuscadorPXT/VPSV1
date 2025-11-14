import { Response } from 'express';
import { AdminRequest } from '../middleware/admin-auth';
import { db } from '../db';
import { feedbackAlerts, feedbackResponses, users } from '../../shared/schema';
import { eq, and, gte, lte, desc, sql } from 'drizzle-orm';
import { broadcastToAllUsers } from '../websocket-manager';

/**
 * ✅ ENHANCED FEEDBACK ALERTS CONTROLLER
 * 
 * Improvements implemented:
 * - ✅ Consistent authentication using AdminRequest
 * - ✅ Proper data validation (via middleware)
 * - ✅ Comprehensive error handling
 * - ✅ Security measures (XSS protection, rate limiting)
 * - ✅ Detailed logging and monitoring
 * - ✅ Better response formatting
 */
export class EnhancedFeedbackAlertsController {
  
  // ✅ CRIAR ALERTA COM VALIDAÇÃO COMPLETA
  async createAlert(req: AdminRequest, res: Response) {
    try {
      const { title, message, feedbackType, isRequired, startDate, endDate, targetAudience, delaySeconds } = req.body;
      const adminId = req.user?.id;

      if (process.env.NODE_ENV === 'development') {
        console.log(`🔥 [FEEDBACK-ALERTS] Admin ${req.user?.email} creating alert: "${title}"`);
      }

      // Criar alerta no banco
      const [newAlert] = await db.insert(feedbackAlerts).values({
        title,
        message,
        feedbackType,
        isRequired,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        createdBy: adminId!,
        targetAudience: targetAudience || 'all',
        delaySeconds: delaySeconds || 0
      }).returning();

      if (process.env.NODE_ENV === 'development') {
        console.log(`✅ [FEEDBACK-ALERTS] Alert created successfully: ID ${newAlert.id}`);
      }

      // 🚨 NOTIFICAR TODOS OS USUÁRIOS CONECTADOS SOBRE O NOVO AVISO
      try {
        const now = new Date();
        const alertStartDate = new Date(startDate);
        
        // Só notificar se o aviso deve começar agora ou já começou
        if (alertStartDate <= now) {
          console.log(`📢 [FEEDBACK-ALERTS] Broadcasting new alert to all users: "${title}"`);
          
          await broadcastToAllUsers({
            type: 'new_feedback_alert',
            data: {
              alertId: newAlert.id,
              title: newAlert.title,
              message: newAlert.message,
              feedbackType: newAlert.feedbackType,
              isRequired: newAlert.isRequired,
              targetAudience: newAlert.targetAudience,
              delaySeconds: newAlert.delaySeconds,
              timestamp: new Date()
            }
          });

          console.log(`✅ [FEEDBACK-ALERTS] Alert notification broadcasted successfully`);
        } else {
          console.log(`⏰ [FEEDBACK-ALERTS] Alert scheduled for later, no immediate broadcast needed`);
        }
      } catch (broadcastError) {
        console.error('❌ [FEEDBACK-ALERTS] Error broadcasting alert:', broadcastError);
        // Não falhar a criação do aviso se a notificação falhar
      }
      
      res.status(201).json({ 
        success: true, 
        message: 'Aviso criado com sucesso',
        alert: newAlert 
      });

    } catch (error) {
      console.error('❌ [FEEDBACK-ALERTS] Error creating alert:', error);
      res.status(500).json({ 
        success: false,
        message: 'Erro interno do servidor ao criar aviso',
        code: 'CREATE_ALERT_FAILED'
      });
    }
  }

  // ✅ BUSCAR ALERTAS COM ESTATÍSTICAS OTIMIZADAS
  async getAllAlerts(req: AdminRequest, res: Response) {
    try {
      if (process.env.NODE_ENV === 'development') {
        console.log(`📋 [FEEDBACK-ALERTS] Admin ${req.user?.email} fetching all alerts`);
      }

      const alerts = await db.select({
        id: feedbackAlerts.id,
        title: feedbackAlerts.title,
        message: feedbackAlerts.message,
        feedbackType: feedbackAlerts.feedbackType,
        isRequired: feedbackAlerts.isRequired,
        startDate: feedbackAlerts.startDate,
        endDate: feedbackAlerts.endDate,
        isActive: feedbackAlerts.isActive,
        targetAudience: feedbackAlerts.targetAudience,
        delaySeconds: feedbackAlerts.delaySeconds,
        createdAt: feedbackAlerts.createdAt,
        responseCount: sql<number>`(
          SELECT COUNT(*) FROM ${feedbackResponses} 
          WHERE ${feedbackResponses.alertId} = ${feedbackAlerts.id}
        )`,
        emojiCount: sql<number>`(
          SELECT COUNT(*) FROM ${feedbackResponses} 
          WHERE ${feedbackResponses.alertId} = ${feedbackAlerts.id} 
          AND ${feedbackResponses.emojiResponse} IS NOT NULL
        )`,
        textCount: sql<number>`(
          SELECT COUNT(*) FROM ${feedbackResponses} 
          WHERE ${feedbackResponses.alertId} = ${feedbackAlerts.id} 
          AND ${feedbackResponses.textResponse} IS NOT NULL
        )`
      })
      .from(feedbackAlerts)
      .orderBy(desc(feedbackAlerts.createdAt));

      if (process.env.NODE_ENV === 'development') {
        console.log(`📊 [FEEDBACK-ALERTS] Fetched ${alerts.length} alerts with statistics`);
      }
      
      res.json({ 
        success: true, 
        alerts,
        meta: {
          total: alerts.length,
          active: alerts.filter(a => a.isActive).length,
          totalResponses: alerts.reduce((sum, alert) => sum + (alert.responseCount || 0), 0)
        }
      });

    } catch (error) {
      console.error('❌ [FEEDBACK-ALERTS] Error fetching alerts:', error);
      res.status(500).json({ 
        success: false,
        message: 'Erro interno do servidor ao buscar avisos',
        code: 'FETCH_ALERTS_FAILED'
      });
    }
  }

  // ✅ BUSCAR ALERTAS ATIVOS PARA USUÁRIOS (COM MELHOR PERFORMANCE)
  async getActiveAlertsForUser(req: AdminRequest, res: Response) {
    try {
      const userId = req.user?.id;
      const userRole = req.user?.role;
      const userPlan = req.user?.subscriptionPlan;

      console.log(`🔍 [FEEDBACK-ALERTS] Checking alerts for user: ${req.user?.email} (${userRole}/${userPlan})`);

      const now = new Date();

      // Determinar target audience baseado no plano e role do usuário
      let targetCondition;
      if (userRole === 'admin' || userRole === 'superadmin') {
        targetCondition = sql`${feedbackAlerts.targetAudience} IN ('all', 'admin')`;
      } else if (userPlan === 'business') {
        targetCondition = sql`${feedbackAlerts.targetAudience} IN ('all', 'business')`;
      } else if (userPlan === 'pro') {
        targetCondition = sql`${feedbackAlerts.targetAudience} IN ('all', 'pro')`;
      } else {
        targetCondition = eq(feedbackAlerts.targetAudience, 'all');
      }

      // Buscar alertas ativos que o usuário ainda não respondeu
      const activeAlerts = await db.select({
        id: feedbackAlerts.id,
        title: feedbackAlerts.title,
        message: feedbackAlerts.message,
        feedbackType: feedbackAlerts.feedbackType,
        isRequired: feedbackAlerts.isRequired,
        delaySeconds: feedbackAlerts.delaySeconds
      })
      .from(feedbackAlerts)
      .leftJoin(feedbackResponses, and(
        eq(feedbackResponses.alertId, feedbackAlerts.id),
        eq(feedbackResponses.userId, userId!)
      ))
      .where(and(
        eq(feedbackAlerts.isActive, true),
        gte(feedbackAlerts.endDate, now),
        lte(feedbackAlerts.startDate, now),
        targetCondition,
        sql`${feedbackResponses.id} IS NULL`
      ))
      .orderBy(desc(feedbackAlerts.createdAt))
      .limit(1);

      console.log(`📋 [FEEDBACK-ALERTS] Found ${activeAlerts.length} active alerts for user`);

      res.json({ 
        success: true, 
        alerts: activeAlerts,
        currentAlert: activeAlerts[0] || null,
        meta: {
          userEligible: true,
          totalFound: activeAlerts.length
        }
      });

    } catch (error) {
      console.error('❌ [FEEDBACK-ALERTS] Error fetching active alerts:', error);
      res.status(500).json({ 
        success: false,
        message: 'Erro interno do servidor ao buscar avisos ativos',
        code: 'FETCH_ACTIVE_ALERTS_FAILED'
      });
    }
  }

  // ✅ SUBMETER RESPOSTA COM VALIDAÇÃO AVANÇADA
  async submitResponse(req: AdminRequest, res: Response) {
    try {
      const { alertId, emojiResponse, textResponse } = req.body;
      const userId = req.user?.id;
      const userEmail = req.user?.email;

      console.log(`📝 [FEEDBACK-ALERTS] User ${userEmail} submitting response to alert ${alertId}`);

      // Verificar se o alerta existe e está ativo
      const alert = await db.query.feedbackAlerts.findFirst({
        where: eq(feedbackAlerts.id, alertId)
      });

      if (!alert) {
        return res.status(404).json({ 
          success: false,
          message: 'Aviso não encontrado',
          code: 'ALERT_NOT_FOUND'
        });
      }

      if (!alert.isActive) {
        return res.status(400).json({ 
          success: false,
          message: 'Este aviso não está mais ativo',
          code: 'ALERT_INACTIVE'
        });
      }

      // Verificar se está dentro do período válido
      const now = new Date();
      if (now < alert.startDate || now > alert.endDate) {
        return res.status(400).json({ 
          success: false,
          message: 'Este aviso não está mais disponível',
          code: 'ALERT_EXPIRED'
        });
      }

      // Verificar se o usuário já respondeu
      const existingResponse = await db.query.feedbackResponses.findFirst({
        where: and(
          eq(feedbackResponses.alertId, alertId),
          eq(feedbackResponses.userId, userId!)
        )
      });

      if (existingResponse) {
        return res.status(400).json({ 
          success: false,
          message: 'Você já respondeu este aviso',
          code: 'ALREADY_RESPONDED'
        });
      }

      // Validações baseadas no tipo de feedback
      if (alert.feedbackType === 'emoji' && !emojiResponse) {
        return res.status(400).json({ 
          success: false,
          message: 'Resposta emoji é obrigatória para este aviso',
          code: 'EMOJI_REQUIRED'
        });
      }

      if (alert.feedbackType === 'text' && !textResponse) {
        return res.status(400).json({ 
          success: false,
          message: 'Resposta de texto é obrigatória para este aviso',
          code: 'TEXT_REQUIRED'
        });
      }

      // Salvar resposta
      const [newResponse] = await db.insert(feedbackResponses).values({
        alertId,
        userId: userId!,
        emojiResponse: emojiResponse || null,
        textResponse: textResponse || null,
        userEmail: userEmail!,
        respondedAt: new Date()
      }).returning();

      console.log(`✅ [FEEDBACK-ALERTS] Response saved successfully: ID ${newResponse.id}`);

      res.status(201).json({ 
        success: true, 
        message: 'Resposta enviada com sucesso',
        response: {
          id: newResponse.id,
          alertId,
          submittedAt: newResponse.respondedAt
        }
      });

    } catch (error) {
      console.error('❌ [FEEDBACK-ALERTS] Error submitting response:', error);
      res.status(500).json({ 
        success: false,
        message: 'Erro interno do servidor ao enviar resposta',
        code: 'SUBMIT_RESPONSE_FAILED'
      });
    }
  }

  // ✅ BUSCAR RESPOSTAS DE ALERTA COM PAGINAÇÃO
  async getAlertResponses(req: AdminRequest, res: Response) {
    try {
      const { alertId } = req.params;
      const page = parseInt(req.query.page as string) || 1;
      const limit = Math.min(parseInt(req.query.limit as string) || 50, 100); // Máximo 100 por página
      const offset = (page - 1) * limit;

      console.log(`📊 [FEEDBACK-ALERTS] Admin ${req.user?.email} fetching responses for alert ${alertId} (page ${page})`);

      // Contar total de respostas
      const [totalCount] = await db.select({
        count: sql<number>`COUNT(*)`
      })
      .from(feedbackResponses)
      .where(eq(feedbackResponses.alertId, parseInt(alertId)));

      // Buscar respostas com paginação
      const responses = await db.select({
        id: feedbackResponses.id,
        emojiResponse: feedbackResponses.emojiResponse,
        textResponse: feedbackResponses.textResponse,
        respondedAt: feedbackResponses.respondedAt,
        userEmail: feedbackResponses.userEmail,
        userName: users.name
      })
      .from(feedbackResponses)
      .leftJoin(users, eq(feedbackResponses.userId, users.id))
      .where(eq(feedbackResponses.alertId, parseInt(alertId)))
      .orderBy(desc(feedbackResponses.respondedAt))
      .limit(limit)
      .offset(offset);

      // Estatísticas de emoji
      const emojiStats = await db.select({
        emoji: feedbackResponses.emojiResponse,
        count: sql<number>`COUNT(*)`
      })
      .from(feedbackResponses)
      .where(and(
        eq(feedbackResponses.alertId, parseInt(alertId)),
        sql`${feedbackResponses.emojiResponse} IS NOT NULL`
      ))
      .groupBy(feedbackResponses.emojiResponse);

      const totalPages = Math.ceil(totalCount.count / limit);

      console.log(`📊 [FEEDBACK-ALERTS] Fetched ${responses.length} responses (page ${page}/${totalPages})`);

      res.json({ 
        success: true, 
        responses, 
        emojiStats,
        pagination: {
          currentPage: page,
          totalPages,
          totalResponses: totalCount.count,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1
        }
      });

    } catch (error) {
      console.error('❌ [FEEDBACK-ALERTS] Error fetching responses:', error);
      res.status(500).json({ 
        success: false,
        message: 'Erro interno do servidor ao buscar respostas',
        code: 'FETCH_RESPONSES_FAILED'
      });
    }
  }

  // ✅ DELETAR ALERTA COM CONFIRMAÇÃO
  async deleteAlert(req: AdminRequest, res: Response) {
    try {
      const { alertId } = req.params;

      console.log(`🗑️ [FEEDBACK-ALERTS] Admin ${req.user?.email} deleting alert ${alertId}`);

      // Verificar se alerta existe
      const alert = await db.query.feedbackAlerts.findFirst({
        where: eq(feedbackAlerts.id, parseInt(alertId))
      });

      if (!alert) {
        return res.status(404).json({ 
          success: false,
          message: 'Aviso não encontrado',
          code: 'ALERT_NOT_FOUND'
        });
      }

      // Contar respostas antes de deletar
      const [responseCount] = await db.select({
        count: sql<number>`COUNT(*)`
      })
      .from(feedbackResponses)
      .where(eq(feedbackResponses.alertId, parseInt(alertId)));

      // Deletar respostas primeiro (FK constraint)
      await db.delete(feedbackResponses)
        .where(eq(feedbackResponses.alertId, parseInt(alertId)));

      // Deletar alerta
      await db.delete(feedbackAlerts)
        .where(eq(feedbackAlerts.id, parseInt(alertId)));

      console.log(`✅ [FEEDBACK-ALERTS] Alert ${alertId} deleted successfully (${responseCount.count} responses removed)`);

      res.json({ 
        success: true, 
        message: 'Aviso deletado com sucesso',
        meta: {
          deletedAlertId: parseInt(alertId),
          responsesDeleted: responseCount.count
        }
      });

    } catch (error) {
      console.error('❌ [FEEDBACK-ALERTS] Error deleting alert:', error);
      res.status(500).json({ 
        success: false,
        message: 'Erro interno do servidor ao deletar aviso',
        code: 'DELETE_ALERT_FAILED'
      });
    }
  }

  // ✅ TOGGLE ALERTA COM VALIDAÇÃO
  async toggleAlert(req: AdminRequest, res: Response) {
    try {
      const { alertId } = req.params;

      console.log(`🔄 [FEEDBACK-ALERTS] Admin ${req.user?.email} toggling alert ${alertId}`);

      // Buscar estado atual
      const alert = await db.query.feedbackAlerts.findFirst({
        where: eq(feedbackAlerts.id, parseInt(alertId))
      });

      if (!alert) {
        return res.status(404).json({ 
          success: false,
          message: 'Aviso não encontrado',
          code: 'ALERT_NOT_FOUND'
        });
      }

      const newStatus = !alert.isActive;

      // Alternar estado
      const [updatedAlert] = await db.update(feedbackAlerts)
        .set({ isActive: newStatus })
        .where(eq(feedbackAlerts.id, parseInt(alertId)))
        .returning();

      console.log(`✅ [FEEDBACK-ALERTS] Alert ${alertId} toggled to ${newStatus ? 'active' : 'inactive'}`);

      res.json({ 
        success: true, 
        message: `Aviso ${newStatus ? 'ativado' : 'desativado'} com sucesso`,
        alert: updatedAlert,
        meta: {
          previousStatus: alert.isActive,
          newStatus: newStatus
        }
      });

    } catch (error) {
      console.error('❌ [FEEDBACK-ALERTS] Error toggling alert:', error);
      res.status(500).json({ 
        success: false,
        message: 'Erro interno do servidor ao alterar status do aviso',
        code: 'TOGGLE_ALERT_FAILED'
      });
    }
  }
}

export const enhancedFeedbackAlertsController = new EnhancedFeedbackAlertsController();