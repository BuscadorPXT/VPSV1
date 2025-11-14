import { Request, Response } from 'express';
import { eq, desc, asc, and, or, like, sql, count, isNull, isNotNull } from 'drizzle-orm';
import { db } from '../db';
import { users, subscriptionManagement, adminActionLogs } from '../../shared/schema';
import { AdminRequest } from '../types/express.types';
import { z } from 'zod';

// Validation schemas
const subscriptionUpdateSchema = z.object({
  paymentDate: z.string().optional().transform((val) => {
    if (!val) return undefined;
    const date = new Date(val);
    return isNaN(date.getTime()) ? undefined : date.toISOString();
  }),
  renewalDate: z.string().optional().transform((val) => {
    if (!val) return undefined;
    const date = new Date(val);
    return isNaN(date.getTime()) ? undefined : date.toISOString();
  }),
  notes: z.string().max(1000).optional(),
  nickname: z.string().max(100).optional(),
  paymentMethod: z.string().max(50).optional(),
  paymentAmount: z.number().min(0).optional(),
  paymentStatus: z.enum(['ativo', 'pendente', 'suspenso', 'cancelado']).optional(),
});

const subscriptionFiltersSchema = z.object({
  status: z.string().optional(),
  plan: z.string().optional(),
  search: z.string().optional(),
  paymentMethod: z.string().optional(),
  daysWithoutPayment: z.string().optional().transform((val) => {
    if (!val || val === 'all') return undefined;
    const num = Number(val);
    return isNaN(num) ? undefined : num;
  }),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  sortBy: z.enum(['name', 'email', 'paymentDate', 'renewalDate', 'daysWithoutPayment']).default('name'),
  sortOrder: z.enum(['asc', 'desc']).default('asc'),
});

// Calculate days without payment (original function - for backward compatibility)
function calculateDaysWithoutPayment(paymentDate: Date | null): number {
  if (!paymentDate) return 0;

  const now = new Date();
  const diffTime = now.getTime() - paymentDate.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return Math.max(0, diffDays);
}

// Calculate days remaining until renewal (new correct function)
function calculateDaysUntilRenewal(renewalDate: Date | null, referenceDate: Date | null): number {
  if (!renewalDate) return 0;

  // Use reference date (lastLoginAt) or current date as fallback
  const refDate = referenceDate || new Date();

  // Calculate the difference: renewalDate - referenceDate
  const diffTime = renewalDate.getTime() - refDate.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  // Return the difference (can be negative if renewal date has passed)
  return diffDays;
}

// Get all subscriptions with pagination and filters
export const getAllSubscriptions = async (req: AdminRequest, res: Response) => {
  try {
    // Handle query parameters manually to avoid Zod NaN issues
    const query = req.query;
    const filters = {
      status: typeof query.status === 'string' ? query.status : undefined,
      plan: typeof query.plan === 'string' ? query.plan : undefined,
      search: typeof query.search === 'string' ? query.search : undefined,
      paymentMethod: typeof query.paymentMethod === 'string' ? query.paymentMethod : undefined,
      daysWithoutPayment: query.daysWithoutPayment === 'all' || !query.daysWithoutPayment ? undefined : Number(query.daysWithoutPayment),
      page: query.page ? Math.max(1, Number(query.page)) : 1,
      limit: query.limit ? Math.min(100, Math.max(1, Number(query.limit))) : 20,
      sortBy: ['name', 'email', 'paymentDate', 'renewalDate', 'daysWithoutPayment'].includes(query.sortBy as string) ? query.sortBy as string : 'name',
      sortOrder: ['asc', 'desc'].includes(query.sortOrder as string) ? query.sortOrder as 'asc' | 'desc' : 'asc'
    };
    const offset = (filters.page - 1) * filters.limit;

    // Build where conditions
    const whereConditions = [];

    if (filters.status && filters.status !== 'all') {
      whereConditions.push(eq(users.status, filters.status));
    }

    if (filters.plan && filters.plan !== 'all') {
      whereConditions.push(eq(users.subscriptionPlan, filters.plan));
    }

    if (filters.search) {
      whereConditions.push(
        or(
          like(users.name, `%${filters.search}%`),
          like(users.email, `%${filters.search}%`),
          like(users.phone, `%${filters.search}%`),
          like(users.subscriptionNickname, `%${filters.search}%`),
          like(subscriptionManagement.nickname, `%${filters.search}%`)
        )
      );
    }

    if (filters.paymentMethod && filters.paymentMethod !== 'all') {
      whereConditions.push(eq(subscriptionManagement.paymentMethod, filters.paymentMethod));
    }

    // Handle daysWithoutPayment filter - use daysUntilRenewal as proxy
    if (filters.daysWithoutPayment && typeof filters.daysWithoutPayment === 'number' && !isNaN(filters.daysWithoutPayment)) {
      // Filter by days until renewal (using available field)
      whereConditions.push(sql`${subscriptionManagement.daysUntilRenewal} >= ${filters.daysWithoutPayment}`);
    }

    // Build sort order
    let orderBy;
    const sortDirection = filters.sortOrder === 'desc' ? desc : asc;

    switch (filters.sortBy) {
      case 'email':
        orderBy = sortDirection(users.email);
        break;
      case 'paymentDate':
        orderBy = sortDirection(subscriptionManagement.paymentDate);
        break;
      case 'renewalDate':
        orderBy = sortDirection(subscriptionManagement.renewalDate);
        break;
      case 'daysWithoutPayment':
        orderBy = sortDirection(subscriptionManagement.daysUntilRenewal);
        break;
      default:
        orderBy = sortDirection(users.name);
    }

    // Get subscriptions with user data
    const subscriptionsQuery = db
      .select({
        // User data
        userId: users.id,
        name: users.name,
        email: users.email,
        phone: users.phone,
        subscriptionPlan: users.subscriptionPlan,
        isSubscriptionActive: users.isSubscriptionActive,
        status: users.status,
        subscriptionNickname: users.subscriptionNickname,
        manualRenewalOverride: users.manualRenewalOverride,
        subscriptionNotes: users.subscriptionNotes,
        createdAt: users.createdAt,
        lastLoginAt: users.lastLoginAt,
        // Subscription management data
        smId: subscriptionManagement.id,
        paymentDate: subscriptionManagement.paymentDate,
        renewalDate: subscriptionManagement.renewalDate,
        daysUntilRenewal: subscriptionManagement.daysUntilRenewal,
        notes: subscriptionManagement.notes,
        nickname: subscriptionManagement.nickname,
        paymentMethod: subscriptionManagement.paymentMethod,
        paymentAmount: subscriptionManagement.paymentAmount,
        paymentStatus: subscriptionManagement.paymentStatus,
        smCreatedAt: subscriptionManagement.createdAt,
        smUpdatedAt: subscriptionManagement.updatedAt,
      })
      .from(users)
      .leftJoin(subscriptionManagement, eq(users.id, subscriptionManagement.userId))
      .where(whereConditions.length > 0 ? and(...whereConditions) : undefined)
      .orderBy(orderBy)
      .limit(filters.limit)
      .offset(offset);

    const subscriptions = await subscriptionsQuery;

    // Get total count for pagination
    const totalCountQuery = db
      .select({ count: count() })
      .from(users)
      .leftJoin(subscriptionManagement, eq(users.id, subscriptionManagement.userId))
      .where(whereConditions.length > 0 ? and(...whereConditions) : undefined);

    const [{ count: totalCount }] = await totalCountQuery;

    // Calculate days remaining until renewal (correct logic)
    // Also prioritize admin-controlled nickname over user's nickname
    const processedSubscriptions = subscriptions.map(sub => {
      // Calculate days remaining: renewalDate - current date (not lastLoginAt)
      const daysUntilRenewal = calculateDaysUntilRenewal(sub.renewalDate, null);
      const daysWithoutPayment = calculateDaysWithoutPayment(sub.paymentDate);

      return {
        ...sub,
        // Use the correct calculation for days until renewal
        daysUntilRenewal,
        daysWithoutPayment,
        // Prioritize admin-controlled nickname from subscription_management table
        subscriptionNickname: sub.nickname || sub.subscriptionNickname,
      };
    });

    res.json({
      success: true,
      data: {
        subscriptions: processedSubscriptions,
        pagination: {
          page: filters.page,
          limit: filters.limit,
          total: totalCount,
          pages: Math.ceil(totalCount / filters.limit),
        },
      },
    });
  } catch (error) {
    console.error('❌ Error fetching subscriptions:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
      details: error instanceof Error ? error.message : 'Erro desconhecido',
    });
  }
};

// Get specific subscription details
export const getSubscriptionDetails = async (req: AdminRequest, res: Response) => {
  try {
    const userId = parseInt(req.params.userId);

    if (isNaN(userId)) {
      return res.status(400).json({
        success: false,
        error: 'ID do usuário inválido',
      });
    }

    const userWithSubscription = await db
      .select({
        // User data
        userId: users.id,
        name: users.name,
        email: users.email,
        subscriptionPlan: users.subscriptionPlan,
        isSubscriptionActive: users.isSubscriptionActive,
        status: users.status,
        subscriptionNickname: users.subscriptionNickname,
        manualRenewalOverride: users.manualRenewalOverride,
        subscriptionNotes: users.subscriptionNotes,
        createdAt: users.createdAt,
        lastLoginAt: users.lastLoginAt,
        testerStartedAt: users.testerStartedAt,
        testerExpiresAt: users.testerExpiresAt,
        trialStartedAt: users.trialStartedAt,
        trialExpiresAt: users.trialExpiresAt,
        subscriptionExpiresAt: users.subscriptionExpiresAt,
        // Subscription management data
        smId: subscriptionManagement.id,
        paymentDate: subscriptionManagement.paymentDate,
        renewalDate: subscriptionManagement.renewalDate,
        daysUntilRenewal: subscriptionManagement.daysUntilRenewal,
        notes: subscriptionManagement.notes,
        nickname: subscriptionManagement.nickname,
        paymentMethod: subscriptionManagement.paymentMethod,
        paymentAmount: subscriptionManagement.paymentAmount,
        paymentStatus: subscriptionManagement.paymentStatus,
        adminId: subscriptionManagement.adminId,
        smCreatedAt: subscriptionManagement.createdAt,
        smUpdatedAt: subscriptionManagement.updatedAt,
      })
      .from(users)
      .leftJoin(subscriptionManagement, eq(users.id, subscriptionManagement.userId))
      .where(eq(users.id, userId))
      .limit(1);

    const user = userWithSubscription[0];

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'Usuário não encontrado',
      });
    }

    // Calculate days without payment if not stored
    const calculatedDays = calculateDaysWithoutPayment(user.paymentDate);

    res.json({
      success: true,
      data: {
        ...user,
        daysWithoutPayment: calculatedDays,
        daysUntilRenewal: user.daysUntilRenewal,
      },
    });
  } catch (error) {
    console.error('❌ Error fetching subscription details:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
      details: error instanceof Error ? error.message : 'Erro desconhecido',
    });
  }
};

// Update subscription data
export const updateSubscriptionData = async (req: AdminRequest, res: Response) => {
  try {
    const userId = parseInt(req.params.userId);
    const adminId = req.user?.id;

    if (isNaN(userId)) {
      return res.status(400).json({
        success: false,
        error: 'ID do usuário inválido',
      });
    }

    // Handle form data manually to avoid validation issues
    const body = req.body;
    const updateData = {
      paymentDate: body.paymentDate && body.paymentDate !== '' ? body.paymentDate : undefined,
      renewalDate: body.renewalDate && body.renewalDate !== '' ? body.renewalDate : undefined,
      notes: body.notes || undefined,
      nickname: body.nickname || undefined,
      paymentMethod: body.paymentMethod || undefined,
      paymentAmount: body.paymentAmount ? parseFloat(body.paymentAmount) : undefined,
      paymentStatus: body.paymentStatus || 'ativo',
    };

    // Check if user exists
    const existingUser = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (existingUser.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Usuário não encontrado',
      });
    }

    // Calculate days without payment if payment date is provided
    let daysWithoutPayment = 0;
    if (updateData.paymentDate) {
      daysWithoutPayment = calculateDaysWithoutPayment(new Date(updateData.paymentDate));
    }

    // Calculate days until renewal (positive for future dates, negative if expired)
    let daysUntilRenewal = 0;
    if (updateData.renewalDate) {
      const renewalDate = new Date(updateData.renewalDate);
      const currentDate = new Date();
      // Reset time to compare only dates
      renewalDate.setHours(0, 0, 0, 0);
      currentDate.setHours(0, 0, 0, 0);
      const diffTime = renewalDate.getTime() - currentDate.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      daysUntilRenewal = diffDays;
    }

    // Handle subscription management record for update
    const subscriptionData = {
      paymentDate: updateData.paymentDate ? new Date(updateData.paymentDate) : null,
      renewalDate: updateData.renewalDate ? new Date(updateData.renewalDate) : null,
      notes: updateData.notes || null,
      nickname: updateData.nickname || null,
      paymentMethod: updateData.paymentMethod || null,
      paymentAmount: updateData.paymentAmount?.toString() || null,
      paymentStatus: updateData.paymentStatus || 'ativo',
      daysUntilRenewal,
      adminId,
      updatedAt: new Date(),
    };

    // Check if subscription management record exists
    const existingSubscription = await db
      .select()
      .from(subscriptionManagement)
      .where(eq(subscriptionManagement.userId, userId))
      .limit(1);

    if (existingSubscription.length > 0) {
      // Update existing record
      await db
        .update(subscriptionManagement)
        .set(subscriptionData)
        .where(eq(subscriptionManagement.userId, userId));
    } else {
      // Insert new record
      await db
        .insert(subscriptionManagement)
        .values({
          userId,
          ...subscriptionData,
          createdAt: new Date(),
        });
    }

    // Log admin action
    if (adminId) {
      await db.insert(adminActionLogs).values({
        adminId,
        targetUserId: userId,
        action: 'update_subscription',
        reason: 'Admin updated subscription data',
        createdAt: new Date(),
      });
    }

    res.json({
      success: true,
      message: 'Dados da assinatura atualizados com sucesso',
    });
  } catch (error) {
    console.error('❌ Error updating subscription:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
      details: error instanceof Error ? error.message : 'Erro desconhecido',
    });
  }
};

// Mark subscription as pending payment
export const markPendingPayment = async (req: AdminRequest, res: Response) => {
  try {
    const userId = parseInt(req.params.userId);
    const adminId = req.user?.id;

    if (isNaN(userId)) {
      return res.status(400).json({
        success: false,
        error: 'ID do usuário inválido',
      });
    }

    // Update user status to pending payment
    await db
      .update(users)
      .set({
        status: 'pending_payment',
        isSubscriptionActive: false,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));

    // Handle subscription management record for marking pending payment
    const existingSubscription = await db
      .select()
      .from(subscriptionManagement)
      .where(eq(subscriptionManagement.userId, userId))
      .limit(1);

    if (existingSubscription.length > 0) {
      // Update existing record
      await db
        .update(subscriptionManagement)
        .set({
          paymentStatus: 'pendente',
          adminId,
          updatedAt: new Date(),
        })
        .where(eq(subscriptionManagement.userId, userId));
    } else {
      // Insert new record
      await db
        .insert(subscriptionManagement)
        .values({
          userId,
          paymentStatus: 'pendente',
          adminId,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
    }

    // Log admin action
    if (adminId) {
      await db.insert(adminActionLogs).values({
        adminId,
        targetUserId: userId,
        action: 'mark_pending_payment',
        reason: 'Marcado como pendente de pagamento',
        createdAt: new Date(),
      });
    }

    res.json({
      success: true,
      message: 'Usuário marcado como pendente de pagamento',
    });
  } catch (error) {
    console.error('❌ Error marking pending payment:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
      details: error instanceof Error ? error.message : 'Erro desconhecido',
    });
  }
};

// Activate subscription
export const activateSubscription = async (req: AdminRequest, res: Response) => {
  try {
    const userId = parseInt(req.params.userId);
    const adminId = req.user?.id;

    if (isNaN(userId)) {
      return res.status(400).json({
        success: false,
        error: 'ID do usuário inválido',
      });
    }

    // Update user status to active
    await db
      .update(users)
      .set({
        status: 'approved',
        isSubscriptionActive: true,
        isApproved: true,
        approvedAt: new Date(),
        approvedBy: adminId,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));

    // Handle subscription management record for activation
    const existingSubscription = await db
      .select()
      .from(subscriptionManagement)
      .where(eq(subscriptionManagement.userId, userId))
      .limit(1);

    if (existingSubscription.length > 0) {
      // Update existing record
      await db
        .update(subscriptionManagement)
        .set({
          paymentStatus: 'ativo',
          adminId,
          updatedAt: new Date(),
        })
        .where(eq(subscriptionManagement.userId, userId));
    } else {
      // Insert new record
      await db
        .insert(subscriptionManagement)
        .values({
          userId,
          paymentStatus: 'ativo',
          adminId,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
    }

    // Log admin action
    if (adminId) {
      await db.insert(adminActionLogs).values({
        adminId,
        targetUserId: userId,
        action: 'activate_subscription',
        reason: 'Assinatura ativada manualmente',
        createdAt: new Date(),
      });
    }

    res.json({
      success: true,
      message: 'Assinatura ativada com sucesso',
    });
  } catch (error) {
    console.error('❌ Error activating subscription:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
      details: error instanceof Error ? error.message : 'Erro desconhecido',
    });
  }
};

// Suspend subscription
export const suspendSubscription = async (req: AdminRequest, res: Response) => {
  try {
    const userId = parseInt(req.params.userId);
    const adminId = req.user?.id;
    const { reason } = req.body;

    if (isNaN(userId)) {
      return res.status(400).json({
        success: false,
        error: 'ID do usuário inválido',
      });
    }

    // Update user status to suspended
    await db
      .update(users)
      .set({
        status: 'suspended',
        isSubscriptionActive: false,
        suspensionReason: reason || 'Suspensão manual pelo administrador',
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));

    // Handle subscription management record for suspension
    const existingSubscription = await db
      .select()
      .from(subscriptionManagement)
      .where(eq(subscriptionManagement.userId, userId))
      .limit(1);

    if (existingSubscription.length > 0) {
      // Update existing record
      await db
        .update(subscriptionManagement)
        .set({
          paymentStatus: 'suspenso',
          notes: reason || 'Suspensão manual pelo administrador',
          adminId,
          updatedAt: new Date(),
        })
        .where(eq(subscriptionManagement.userId, userId));
    } else {
      // Insert new record
      await db
        .insert(subscriptionManagement)
        .values({
          userId,
          paymentStatus: 'suspenso',
          notes: reason || 'Suspensão manual pelo administrador',
          adminId,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
    }

    // Log admin action
    if (adminId) {
      await db.insert(adminActionLogs).values({
        adminId,
        targetUserId: userId,
        action: 'suspend_subscription',
        reason: reason || 'Suspensão manual',
        createdAt: new Date(),
      });
    }

    res.json({
      success: true,
      message: 'Assinatura suspensa com sucesso',
    });
  } catch (error) {
    console.error('❌ Error suspending subscription:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
      details: error instanceof Error ? error.message : 'Erro desconhecido',
    });
  }
};

// Extend trial period
export const extendTrial = async (req: AdminRequest, res: Response) => {
  try {
    const userId = parseInt(req.params.userId);
    const adminId = req.user?.id;
    const { days = 7 } = req.body; // Default 7 days extension

    if (isNaN(userId)) {
      return res.status(400).json({
        success: false,
        error: 'ID do usuário inválido',
      });
    }

    const extensionDays = parseInt(days) || 7;
    const newExpiryDate = new Date();
    newExpiryDate.setDate(newExpiryDate.getDate() + extensionDays);

    // Update user trial data
    await db
      .update(users)
      .set({
        testerExpiresAt: newExpiryDate,
        trialExpiresAt: newExpiryDate,
        isTesterExpired: false,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));

    // Handle subscription management record for trial extension
    const existingSubscription = await db
      .select()
      .from(subscriptionManagement)
      .where(eq(subscriptionManagement.userId, userId))
      .limit(1);

    if (existingSubscription.length > 0) {
      // Update existing record
      await db
        .update(subscriptionManagement)
        .set({
          renewalDate: newExpiryDate,
          notes: `Período de teste estendido por ${extensionDays} dias`,
          adminId,
          updatedAt: new Date(),
        })
        .where(eq(subscriptionManagement.userId, userId));
    } else {
      // Insert new record
      await db
        .insert(subscriptionManagement)
        .values({
          userId,
          renewalDate: newExpiryDate,
          notes: `Período de teste estendido por ${extensionDays} dias`,
          adminId,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
    }

    // Log admin action
    if (adminId) {
      await db.insert(adminActionLogs).values({
        adminId,
        targetUserId: userId,
        action: 'extend_trial',
        reason: `Período de teste estendido por ${extensionDays} dias`,
        createdAt: new Date(),
      });
    }

    res.json({
      success: true,
      message: `Período de teste estendido por ${extensionDays} dias`,
      data: { newExpiryDate },
    });
  } catch (error) {
    console.error('❌ Error extending trial:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
      details: error instanceof Error ? error.message : 'Erro desconhecido',
    });
  }
};

// Get subscription analytics
export const getSubscriptionAnalytics = async (req: AdminRequest, res: Response) => {
  try {
    // Get basic subscription stats
    const totalUsersQuery = db.select({ count: count() }).from(users);
    const activeSubscriptionsQuery = db
      .select({ count: count() })
      .from(users)
      .where(eq(users.isSubscriptionActive, true));

    const pendingPaymentsQuery = db
      .select({ count: count() })
      .from(users)
      .where(eq(users.status, 'pending_payment'));

    const suspendedUsersQuery = db
      .select({ count: count() })
      .from(users)
      .where(eq(users.status, 'suspended'));

    // Execute all queries in parallel
    const [
      [{ count: totalUsers }],
      [{ count: activeSubscriptions }],
      [{ count: pendingPayments }],
      [{ count: suspendedUsers }],
    ] = await Promise.all([
      totalUsersQuery,
      activeSubscriptionsQuery,
      pendingPaymentsQuery,
      suspendedUsersQuery,
    ]);

    // Get subscription plan distribution
    const planDistribution = await db
      .select({
        plan: users.subscriptionPlan,
        count: count(),
      })
      .from(users)
      .groupBy(users.subscriptionPlan);

    // Get recent renewals (next 30 days)
    const nextMonth = new Date();
    nextMonth.setDate(nextMonth.getDate() + 30);

    const upcomingRenewals = await db
      .select({ count: count() })
      .from(subscriptionManagement)
      .where(
        and(
          isNotNull(subscriptionManagement.renewalDate),
          sql`${subscriptionManagement.renewalDate} <= ${nextMonth.toISOString()}`
        )
      );

    // Calculate estimated monthly revenue
    const revenueData = await db
      .select({
        totalRevenue: sql<number>`SUM(CASE WHEN ${subscriptionManagement.paymentAmount} IS NOT NULL THEN ${subscriptionManagement.paymentAmount} ELSE 0 END)`,
        avgPayment: sql<number>`AVG(CASE WHEN ${subscriptionManagement.paymentAmount} IS NOT NULL THEN ${subscriptionManagement.paymentAmount} ELSE 0 END)`,
      })
      .from(subscriptionManagement)
      .where(
        and(
          eq(subscriptionManagement.paymentStatus, 'ativo'),
          isNotNull(subscriptionManagement.paymentAmount)
        )
      );

    const [revenue] = revenueData;

    res.json({
      success: true,
      data: {
        overview: {
          totalUsers,
          activeSubscriptions,
          pendingPayments,
          suspendedUsers,
          churnRate: totalUsers > 0 ? ((suspendedUsers / totalUsers) * 100).toFixed(2) : '0',
          activeRate: totalUsers > 0 ? ((activeSubscriptions / totalUsers) * 100).toFixed(2) : '0',
        },
        planDistribution: planDistribution.map(p => ({
          plan: p.plan,
          count: p.count,
          percentage: totalUsers > 0 ? ((p.count / totalUsers) * 100).toFixed(2) : '0',
        })),
        upcoming: {
          renewalsNext30Days: upcomingRenewals[0]?.count || 0,
        },
        revenue: {
          estimatedMonthly: revenue?.totalRevenue || 0,
          averagePayment: revenue?.avgPayment || 0,
        },
      },
    });
  } catch (error) {
    console.error('❌ Error fetching subscription analytics:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
      details: error instanceof Error ? error.message : 'Erro desconhecido',
    });
  }
};