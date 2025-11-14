
import { Request, Response, NextFunction } from 'express';
import { verifyIdToken } from '../services/firebase-admin';
import { findUserByFirebaseUid } from '../services/user.service';

export interface AdminRequest extends Request {
  user?: {
    uid: string;
    email: string;
    id: number;
    isAdmin: boolean;
    role: string;
    subscriptionPlan: string;
    userData?: any;
  };
  session?: {
    sessionToken: string;
    expiresAt: Date;
    isActive: boolean;
    userId: number;
  };
  clientIp?: string;
}

/**
 * 🔐 MIDDLEWARE ESPECÍFICO PARA ROTAS ADMINISTRATIVAS
 * 
 * Valida autenticação E privilégios de admin em uma única etapa
 */
export const authenticateAdmin = async (req: AdminRequest, res: Response, next: NextFunction) => {
  try {
    console.log('🔍 [Admin Auth] Starting admin authentication check...');

    // 1. Extrair Firebase token
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      console.log('❌ [Admin Auth] No Bearer token found');
      return res.status(401).json({ 
        message: 'Token de autenticação necessário',
        code: 'FIREBASE_TOKEN_REQUIRED'
      });
    }

    const firebaseToken = authHeader.split(' ')[1];
    let decodedToken;

    try {
      decodedToken = await verifyIdToken(firebaseToken);
      console.log(`🔐 [Admin Auth] Firebase token verified for: ${decodedToken.email}`);
    } catch (error) {
      console.error('❌ [Admin Auth] Firebase token verification failed:', error);
      return res.status(401).json({ 
        message: 'Token inválido',
        code: 'FIREBASE_TOKEN_INVALID'
      });
    }

    // 2. Buscar dados completos do usuário
    const userData = await findUserByFirebaseUid(decodedToken.uid);
    
    if (!userData) {
      console.log(`❌ [Admin Auth] User not found in database: ${decodedToken.email}`);
      return res.status(401).json({ 
        message: 'Usuário não encontrado',
        code: 'USER_NOT_FOUND'
      });
    }

    console.log(`🔍 [Admin Auth] User found: ${userData.email}, isAdmin: ${userData.isAdmin}, role: ${userData.role}`);

    // 3. Verificar privilégios de admin (VERIFICAÇÃO RIGOROSA)
    const isAdminUser = userData.isAdmin === true || 
                       userData.role === 'admin' || 
                       userData.role === 'superadmin';

    if (!isAdminUser) {
      console.log(`🚫 [Admin Auth] Access denied - User ${userData.email} is not admin (isAdmin: ${userData.isAdmin}, role: ${userData.role})`);
      return res.status(403).json({ 
        message: 'Acesso negado - Privilégios de administrador necessários',
        code: 'ADMIN_PRIVILEGES_REQUIRED'
      });
    }

    console.log(`✅ [Admin Auth] Admin access granted for: ${userData.email}`);

    // 4. Anexar dados completos do usuário à requisição
    req.user = {
      uid: decodedToken.uid,
      email: userData.email,
      id: userData.id,
      isAdmin: userData.isAdmin || false,
      role: userData.role || 'user',
      subscriptionPlan: userData.subscriptionPlan || 'free',
      userData: userData
    };

    req.clientIp = (req.headers['x-forwarded-for'] as string)?.split(',')[0] || 
                   req.connection.remoteAddress || 
                   req.socket.remoteAddress || 
                   'unknown';

    next();

  } catch (error) {
    console.error('❌ [Admin Auth] Authentication error:', error);
    return res.status(401).json({ 
      message: 'Erro de autenticação',
      code: 'AUTH_FAILED'
    });
  }
};

/**
 * Helper function to check admin access (for use in route handlers)
 */
export const checkAdminAccess = (user: any): boolean => {
  if (!user) {
    console.log('🔍 Admin access check for user undefined');
    return false;
  }

  const isAdmin = user.isAdmin === true || 
                  user.role === 'admin' || 
                  user.role === 'superadmin';

  console.log(`🔍 Admin access check for user ${user.email || 'unknown'}: {
  email: '${user.email || 'undefined'}',
  isAdmin: ${user.isAdmin},
  role: '${user.role || 'undefined'}',
  subscriptionPlan: '${user.subscriptionPlan || 'undefined'}',
  result: ${isAdmin}
}`);

  return isAdmin;
};
