import { Request, Response, NextFunction } from 'express';
import { verifyIdToken } from '../services/firebase-admin';
import { storage } from '../storage';
import { findUserByFirebaseUid } from '../services/user.service';
import { db } from '../db';
import { users } from '../../shared/schema';
import { eq } from 'drizzle-orm';

export interface AuthenticatedRequest extends Request {
  user?: {
    uid: string;
    email: string;
    id: number;
    userData?: any;
  };
  session?: {
    sessionToken: string;
    expiresAt: Date;
    isActive: boolean;
    userId: number;
  };
  userId?: number; // Add userId for backward compatibility
  clientIp?: string;
}

// Helper function to get client IP
function getClientIp(req: Request): string {
  return (req.headers['x-forwarded-for'] as string)?.split(',')[0] || 
         req.connection.remoteAddress || 
         req.socket.remoteAddress || 
         'unknown';
}

/**
 * 🔐 MIDDLEWARE DE AUTENTICAÇÃO FLEXÍVEL
 * 
 * Validar Firebase token primeiro, depois verificar/criar sessão conforme necessário
 */
export const authenticateToken = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    // 1. Extrair token Firebase do header
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      console.log(`⚠️ Missing Firebase token for ${req.method} ${req.path} from IP: ${getClientIp(req)}`);
      return res.status(401).json({ 
        message: 'Firebase token required',
        code: 'FIREBASE_TOKEN_REQUIRED',
        debug: {
          hasAuthHeader: !!authHeader,
          authHeaderValue: authHeader ? 'Bearer ***' : 'none',
          path: req.path,
          method: req.method
        }
      });
    }

    const firebaseToken = authHeader.split(' ')[1];
    let decodedToken;

    try {
      decodedToken = await verifyIdToken(firebaseToken);
    } catch (error) {
      console.error('Firebase token verification failed:', error);
      return res.status(401).json({ 
        message: 'Invalid Firebase token',
        code: 'FIREBASE_TOKEN_INVALID'
      });
    }

    // 2. Buscar usuário no banco (não criar automaticamente)
    let userData = await findUserByFirebaseUid(decodedToken.uid);

    if (!userData) {
      console.log(`❌ User not found in database: ${decodedToken.email}`);
      return res.status(403).json({ 
        message: 'Usuário não encontrado no sistema. Entre em contato com o administrador.',
        code: 'USER_NOT_REGISTERED',
        email: decodedToken.email
      });
    }

    // 3. Verificar session token (OPCIONAL para algumas rotas)
    const sessionToken = req.cookies?.sessionToken;

    if (sessionToken) {
      const { sessionManager } = await import('../services/session-manager.service');
      const session = await sessionManager.validateSession(sessionToken);

      if (session && session.userId === userData.id) {
        req.session = session;
        console.log(`✅ Valid session found for user: ${userData.email}`);
      } else {
        console.log(`⚠️ Invalid session for user: ${userData.email}, will create new one if needed`);
      }
    } else {
      console.log(`ℹ️ No session token found for user: ${userData.email}`);
    }

    // 4. Se usuário não foi encontrado, erro (já foi tratado anteriormente)
    if (!userData) {
      console.error(`❌ User not found after creation attempt: ${decodedToken.uid}`);
      return res.status(500).json({ 
        message: 'Failed to retrieve user profile',
        code: 'USER_RETRIEVAL_FAILED'
      });
    }

    // 5. Verificar se usuário está aprovado
    const userAgent = req.headers['user-agent'] || '';
    const isMobile = userAgent.toLowerCase().includes('mobile');
    
    console.log(`🔍 [Auth] Approval check for ${userData.email}:`, {
      isApproved: userData.isApproved,
      status: userData.status,
      role: userData.role,
      isAdmin: userData.isAdmin,
      isMobile: isMobile,
      userAgent: isMobile ? 'Mobile Device' : 'Desktop'
    });

    if (!userData.isApproved) {
      console.log(`❌ User not approved: ${userData.email} (Status: ${userData.status}, Mobile: ${isMobile})`);
      return res.status(403).json({ 
        message: 'Sua conta ainda não foi aprovada pelo administrador. Aguarde a aprovação.',
        code: 'PENDING_APPROVAL',
        email: userData.email,
        status: userData.status || 'pending_approval',
        isMobile: isMobile
      });
    }

    // 6. Validar sessão se existir
    if (req.session && req.session.userId !== userData.id) {
      return res.status(401).json({ 
        message: 'Session/user mismatch',
        code: 'SESSION_USER_MISMATCH'
      });
    }

    // 7. Usuário válido e aprovado
    console.log(`🎉 Firebase user authenticated: ${userData.email} (${userData.role}) with ${userData.subscriptionPlan} plan`);

    // 8. ✅ VERIFICAÇÃO DE PAGAMENTO PENDENTE
    if (userData.subscriptionPlan === 'pro_pending' || userData.role === 'pending_payment' || userData.status === 'pending_payment') {
      console.log(`⏳ User with pending payment detected: ${userData.email} (Role: ${userData.role}, Plan: ${userData.subscriptionPlan}, Status: ${userData.status})`);

      // Permitir acesso apenas à página de pagamento pendente e logout
      const allowedPaths = ['/pending-payment', '/api/auth/logout'];
      const requestPath = req.path || req.url;

      if (!allowedPaths.some(path => requestPath.includes(path))) {
        console.log(`🚫 Blocking access to ${requestPath} for user with pending payment: ${userData.email}`);

        // Se for uma requisição de perfil, retornar dados básicos mas com flag de pagamento pendente
        if (requestPath.includes('/profile')) {
          console.log(`📋 Returning limited profile for pending payment user: ${userData.email}`);
          req.user = {
            ...userData,
            uid: decodedToken.uid,
            // Marcar explicitamente como pagamento pendente
            needsPayment: true,
            isPendingPayment: true
          };
          req.userId = userData.id; // Add userId for backward compatibility
          req.session = req.session; // Use the session already set earlier
          req.clientIp = getClientIp(req);

          // Atualizar lastLoginAt
          await db.update(users)
            .set({ lastLoginAt: new Date() })
            .where(eq(users.id, userData.id));

          console.log(`✅ Limited auth success for pending payment: ${userData.email} (${userData.role})`);
          return next();
        }

        return res.status(402).json({
          success: false,
          message: 'Pagamento pendente - acesso restrito',
          code: 'PAYMENT_PENDING',
          redirectTo: '/pending-payment',
          userEmail: userData.email
        });
      }
    }

    // 9. ✅ SUCESSO: Definir dados do usuário e sessão - anexar objeto completo
    req.user = {
      ...userData,  // Spread all user properties directly
      uid: decodedToken.uid  // Add Firebase UID
    };

    req.userId = userData.id; // Add userId for backward compatibility
    req.session = req.session; // Use the session already set earlier in the function
    req.clientIp = getClientIp(req);

    // Atualizar lastLoginAt do usuário
    await db.update(users)
      .set({ lastLoginAt: new Date() })
      .where(eq(users.id, userData.id));

    console.log(`✅ Auth success: ${userData.email} (${userData.role}) - User ID: ${userData.id}`);
    next();

  } catch (error) {
    console.error('❌ Authentication error:', error);
    console.error('❌ Auth error details:', {
      name: error?.name,
      message: error?.message,
      stack: error?.stack
    });

    // Ensure JSON response
    res.setHeader('Content-Type', 'application/json');

    return res.status(401).json({
      success: false,
      message: 'Token de autenticação inválido',
      code: 'AUTH_ERROR',
      timestamp: new Date().toISOString()
    });
  }
};