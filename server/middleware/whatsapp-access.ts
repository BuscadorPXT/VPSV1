import { Request, Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types/express.types';
import { canTesterAccessWhatsApp } from '../../shared/subscription';

export const validateWhatsAppAccess = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user?.userData) {
      return res.status(401).json({
        success: false,
        message: 'Usuário não autenticado',
        code: 'USER_NOT_AUTHENTICATED'
      });
    }

    const user = req.user.userData;

    console.log('🔍 WhatsApp access validation:', {
      userId: user.id,
      email: user.email,
      role: user.role,
      subscriptionPlan: user.subscriptionPlan,
      isApproved: user.isApproved
    });

    // 🎯 REGRA INEQUÍVOCA: Bloquear APENAS usuários TESTER
    const isTester = user.role === 'tester' || user.subscriptionPlan === 'tester';

    if (isTester) {
      console.log(`❌ WhatsApp access BLOCKED for TESTER user ${user.email} (role: ${user.role}, plan: ${user.subscriptionPlan})`);
      return res.status(403).json({
        success: false,
        message: 'Acesso ao WhatsApp não disponível para usuários TESTER',
        code: 'TESTER_WHATSAPP_BLOCKED',
        userRole: user.role,
        subscriptionPlan: user.subscriptionPlan,
        reason: 'TESTER_RESTRICTION'
      });
    }

    console.log(`✅ WhatsApp access granted for user ${user.email} (role: ${user.role}, plan: ${user.subscriptionPlan})`);
    next();
  } catch (error) {
    console.error('WhatsApp access validation error:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      code: 'INTERNAL_SERVER_ERROR'
    });
  }
};