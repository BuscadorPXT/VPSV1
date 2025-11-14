import { Response } from 'express';
import { eq, and, isNotNull } from 'drizzle-orm';
import { db } from '../db';
import { users, subscriptionManagement } from '../../shared/schema';
import { AuthenticatedRequest } from '../middleware/auth';

// Helper function to calculate days without payment
function calculateDaysWithoutPayment(paymentDate: Date): number {
  const currentDate = new Date();
  const diffTime = currentDate.getTime() - paymentDate.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
}

// Helper function to calculate days until renewal
function calculateDaysUntilRenewal(renewalDate: Date): number {
  const currentDate = new Date();
  // Reset time to compare only dates
  renewalDate.setHours(0, 0, 0, 0);
  currentDate.setHours(0, 0, 0, 0);
  const diffTime = renewalDate.getTime() - currentDate.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
}

// Get user's own subscription details
export const getUserSubscriptionDetails = async (req: AuthenticatedRequest, res: Response) => {
  try {
    console.log('📋 [My Subscription] Request received from user:', req.user?.email);
    const userId = req.user?.id;

    if (!userId) {
      console.log('❌ [My Subscription] No user ID found');
      return res.status(401).json({
        success: false,
        error: 'Usuário não autenticado',
      });
    }
    
    console.log('🔍 [My Subscription] Fetching subscription for user ID:', userId);

    // Get user and subscription data in a single query with join
    const result = await db
      .select({
        // User data
        userId: users.id,
        name: users.name,
        email: users.email,
        subscriptionPlan: users.subscriptionPlan,
        isSubscriptionActive: users.isSubscriptionActive,
        status: users.status,
        createdAt: users.createdAt,
        lastLoginAt: users.lastLoginAt,
        // Subscription management data
        subscriptionNickname: subscriptionManagement.nickname,
        paymentDate: subscriptionManagement.paymentDate,
        renewalDate: subscriptionManagement.renewalDate,
        daysUntilRenewal: subscriptionManagement.daysUntilRenewal,
        notes: subscriptionManagement.notes,
        paymentMethod: subscriptionManagement.paymentMethod,
        paymentAmount: subscriptionManagement.paymentAmount,
        paymentStatus: subscriptionManagement.paymentStatus,
        updatedAt: subscriptionManagement.updatedAt,
      })
      .from(users)
      .leftJoin(subscriptionManagement, eq(users.id, subscriptionManagement.userId))
      .where(eq(users.id, userId))
      .limit(1);

    if (result.length === 0) {
      console.log('❌ [My Subscription] User not found in database');
      return res.status(404).json({
        success: false,
        error: 'Usuário não encontrado',
      });
    }

    const subscriptionData = result[0];
    console.log('✅ [My Subscription] Data found:', {
      userId: subscriptionData.userId,
      email: subscriptionData.email,
      plan: subscriptionData.subscriptionPlan,
      hasSubscriptionManagement: !!subscriptionData.paymentDate
    });

    // Calculate additional fields
    let daysWithoutPayment = 0;
    let daysUntilRenewal = 0;

    if (subscriptionData.paymentDate) {
      daysWithoutPayment = calculateDaysWithoutPayment(new Date(subscriptionData.paymentDate));
    }

    if (subscriptionData.renewalDate) {
      daysUntilRenewal = calculateDaysUntilRenewal(new Date(subscriptionData.renewalDate));
    } else if (subscriptionData.daysUntilRenewal !== null) {
      daysUntilRenewal = subscriptionData.daysUntilRenewal;
    }

    // Format response data
    const responseData = {
      userId: subscriptionData.userId,
      name: subscriptionData.name,
      email: subscriptionData.email,
      subscriptionPlan: subscriptionData.subscriptionPlan || 'free',
      isSubscriptionActive: subscriptionData.isSubscriptionActive || false,
      status: subscriptionData.status || 'pending_approval',
      paymentDate: subscriptionData.paymentDate ? subscriptionData.paymentDate.toISOString().split('T')[0] : null,
      renewalDate: subscriptionData.renewalDate ? subscriptionData.renewalDate.toISOString().split('T')[0] : null,
      daysUntilRenewal,
      daysWithoutPayment,
      subscriptionNickname: subscriptionData.subscriptionNickname || null,
      notes: subscriptionData.notes || null,
      paymentMethod: subscriptionData.paymentMethod || null,
      paymentAmount: subscriptionData.paymentAmount ? parseFloat(subscriptionData.paymentAmount) : null,
      paymentStatus: subscriptionData.paymentStatus || 'inactive',
      createdAt: subscriptionData.createdAt ? subscriptionData.createdAt.toISOString().split('T')[0] : null,
      lastLoginAt: subscriptionData.lastLoginAt ? subscriptionData.lastLoginAt.toISOString().split('T')[0] : null,
      updatedAt: subscriptionData.updatedAt ? subscriptionData.updatedAt.toISOString().split('T')[0] : null,
    };

    console.log('📤 [My Subscription] Sending response with success=true');
    
    res.json({
      success: true,
      data: responseData,
    });

  } catch (error) {
    console.error('❌ Error fetching user subscription details:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
      details: error instanceof Error ? error.message : 'Erro desconhecido',
    });
  }
};