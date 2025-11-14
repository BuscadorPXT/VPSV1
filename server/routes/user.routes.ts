import { Router } from 'express';
import type { Request, Response } from 'express';
import { storage } from '../storage';
import { authenticateToken, type AuthenticatedRequest } from '../middleware/auth';
import { verifyIdToken } from '../services/firebase-admin';

const router = Router();

// Middleware para garantir JSON em todas as rotas de usuário
router.use((req, res, next) => {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache');
  
  // Override de métodos de resposta para garantir JSON
  const originalSend = res.send;
  const originalJson = res.json;
  
  res.json = function(data) {
    console.log('📤 Sending JSON response:', typeof data);
    return originalJson.call(this, data);
  };
  
  res.send = function(data) {
    if (typeof data === 'object') {
      console.log('📤 Converting object to JSON response');
      return originalJson.call(this, data);
    }
    return originalSend.call(this, data);
  };
  
  next();
});

// GET /api/user/profile - Buscar perfil do usuário autenticado
router.get('/profile', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    console.log('📋 Profile request received');
    console.log('📋 Request path:', req.path);
    console.log('📋 Request method:', req.method);

    // The middleware already did the heavy lifting. The user is in req.user.
    const userProfile = req.user;

    if (!userProfile) {
      console.log('❌ User profile not found in request');
      return res.status(404).json({ 
        success: false,
        message: 'Perfil de usuário não encontrado.',
        code: 'USER_NOT_FOUND'
      });
    }

    console.log(`🔍 User ${userProfile.email} profile data:`, {
      isAdmin: userProfile.isAdmin,
      role: userProfile.role,
      subscriptionPlan: userProfile.subscriptionPlan,
      isApproved: userProfile.isApproved,
      status: userProfile.status
    });

    // Return complete profile - middleware already ensured user is approved
    const profileData = {
      id: userProfile.id,
      firebaseUid: userProfile.firebaseUid || userProfile.firebase_uid,
      email: userProfile.email,
      name: userProfile.name,
      company: userProfile.company,
      isAdmin: userProfile.isAdmin || false,
      role: userProfile.role || 'user',
      subscriptionPlan: userProfile.subscriptionPlan || 'free',
      isApproved: userProfile.isApproved,
      status: userProfile.status,
      createdAt: userProfile.createdAt,
      lastActiveAt: userProfile.lastActiveAt,
      rejectedAt: userProfile.rejectedAt,
      rejectionReason: userProfile.rejectionReason,
      needsApproval: !userProfile.isApproved
    };

    console.log(`✅ Returning profile for ${userProfile.email}:`, {
      isApproved: profileData.isApproved,
      needsApproval: profileData.needsApproval,
      status: profileData.status
    });

    const responseData = {
      profile: profileData
    };

    console.log('📋 Final response data:', JSON.stringify(responseData, null, 2));

    res.json(responseData);

  } catch (error) {
    console.error('Profile fetch error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Erro interno do servidor',
      code: 'INTERNAL_ERROR'
    });
  }
});

// PUT /api/user/profile - Atualizar perfil do usuário autenticado
router.put('/profile', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    console.log('📝 Profile update request received');
    console.log('📝 User data:', {
      firebaseUid: req.user?.firebaseUid,
      email: req.user?.email,
      id: req.user?.id
    });
    console.log('📝 Request body:', req.body);

    const { name, email, company, currentPassword, newPassword } = req.body;

    if (!name || !email) {
      return res.status(400).json({
        success: false,
        message: 'Nome e email são obrigatórios',
        code: 'MISSING_REQUIRED_FIELDS'
      });
    }

    // Se está tentando alterar senha, validar senha atual
    if (newPassword && !currentPassword) {
      console.log('❌ Password update attempted without current password');
      return res.status(400).json({
        success: false,
        message: 'Senha atual é obrigatória para alterar a senha',
        code: 'CURRENT_PASSWORD_REQUIRED'
      });
    }

    console.log('📝 Profile update data prepared:', { name, email, company });

    // Preparar dados para atualização
    const updateData: any = {
      name,
      email,
      company: company || null,
      updatedAt: new Date()
    };

    // Se está alterando senha, incluir no Firebase
    if (newPassword && currentPassword) {
      try {
        // Import Firebase Admin
        const { verifyIdToken } = await import('../services/firebase-admin');
        const admin = await import('firebase-admin');
        
        // Verificar senha atual no Firebase
        // Para isso, precisaríamos fazer uma autenticação no cliente
        // Por enquanto, vamos apenas atualizar a senha no Firebase
        await admin.auth().updateUser(req.user!.firebaseUid, {
          password: newPassword
        });

        console.log('🔐 Password updated in Firebase');
      } catch (firebaseError) {
        console.error('❌ Firebase password update error:', firebaseError);
        return res.status(400).json({
          success: false,
          message: 'Erro ao atualizar senha',
          code: 'PASSWORD_UPDATE_FAILED'
        });
      }
    }

    // Import do serviço de usuário com timeout
    console.log('📥 Importing user service...');
    const importPromise = import('../services/user.service');
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Import timeout')), 5000)
    );
    
    const { userService } = await Promise.race([importPromise, timeoutPromise]) as any;
    console.log('✅ User service imported successfully');

    // Verificar se o usuário existe antes de tentar atualizar
    if (!req.user?.firebaseUid) {
      return res.status(400).json({
        success: false,
        message: 'Usuário não identificado',
        code: 'USER_NOT_IDENTIFIED'
      });
    }

    // Atualizar perfil no banco de dados
    const updatedUser = await userService.updateProfile(req.user.firebaseUid, {
      name,
      email,
      company
    });

    console.log('✅ Profile updated successfully:', updatedUser.email);

    // Garantir que a resposta seja JSON válido
    const responseData = {
      success: true,
      message: 'Perfil atualizado com sucesso',
      profile: {
        id: updatedUser.id,
        firebaseUid: updatedUser.firebaseUid,
        email: updatedUser.email,
        name: updatedUser.name,
        company: (updatedUser as any).company,
        isAdmin: (updatedUser as any).isAdmin || false,
        role: updatedUser.role,
        subscriptionPlan: updatedUser.subscriptionPlan,
        isApproved: updatedUser.isApproved,
        status: updatedUser.status,
        createdAt: updatedUser.createdAt,
        updatedAt: updatedUser.updatedAt,
        needsApproval: !updatedUser.isApproved
      }
    };

    console.log('📝 Sending response:', JSON.stringify(responseData, null, 2));
    
    res.setHeader('Content-Type', 'application/json');
    return res.json(responseData);

  } catch (error: any) {
    console.error('❌ Profile update error:', error);
    
    // Log detalhado do erro
    console.error('❌ Error details:', {
      message: error?.message,
      stack: error?.stack,
      userEmail: req.user?.email,
      firebaseUid: req.user?.firebaseUid
    });

    // Resposta de erro mais específica
    const errorMessage = error?.message?.includes('duplicate key') 
      ? 'Email já está sendo usado por outro usuário'
      : 'Erro interno do servidor';

    res.status(500).json({
      success: false,
      message: errorMessage,
      code: 'INTERNAL_ERROR'
    });
  }
});

// GET /api/user/tester-status - Verificar status do usuário Tester
router.get('/tester-status', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;

    // Import do serviço de tester
    const { testerService } = await import('../services/tester.service');

    const isTester = await testerService.isUserTester(userId);
    const hasWhatsAppAccess = await testerService.isTesterActive(userId);
    const daysRemaining = await testerService.getTesterDaysRemaining(userId);

    console.log(`📊 Tester status for user ${userId}:`, {
      isTester,
      hasWhatsAppAccess,
      daysRemaining,
      userRole: req.user!.role,
      userPlan: req.user!.subscriptionPlan,
      userEmail: req.user!.email
    });

    // 🚨 LÓGICA CRÍTICA: Se é Tester, forçar isTester = true e hasWhatsAppAccess = false
    if (isTester) {
      console.log(`🚫 FORCING TESTER BLOCK for user ${userId} (${req.user!.email})`);
    }

    // ✅ LÓGICA FINAL: Se não é tester OU tem acesso premium, não é considerado tester bloqueado
    const finalIsTester = isTester && !['pro', 'business', 'admin'].includes(req.user!.subscriptionPlan?.toLowerCase() || '') && !['admin', 'superadmin'].includes(req.user!.role?.toLowerCase() || '');

    console.log('🔍 Final tester status calculation:', {
      originalIsTester: isTester,
      finalIsTester,
      subscriptionPlan: req.user!.subscriptionPlan,
      role: req.user!.role,
      hasWhatsAppAccess
    });

    res.json({
      success: true,
      data: {
        isTester: finalIsTester,
        isActive: hasWhatsAppAccess,
        daysRemaining: Math.max(0, daysRemaining)
      }
    });
  } catch (error) {
    console.error('Error getting tester status:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao verificar status do usuário Tester'
    });
  }
});

export default router;