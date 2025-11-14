// Rotas de autenticação de usuários - login, registro e verificação de sessão
import { Router, Request, Response } from 'express';
import type { Request, Response } from 'express';
import { storage } from '../storage';
import { authenticateToken, type AuthenticatedRequest } from '../middleware/auth';
import { verifyIdToken } from '../services/firebase-admin';
import { admin } from '../services/firebase-admin';
import { db } from '../db';
import { users, userSessions } from '../../shared/schema';
import { eq, and, sql } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { findUserByFirebaseUid, canUserLogin } from '../services/user.service';

const router = Router();

// Debug: Log that auth routes are being initialized
console.log('🔧 [Auth Routes] Initializing authentication routes...');

// ✅ NOVO: Rate limiting para init-session
const initSessionRateLimit = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW = 10 * 1000; // 10 segundos
const RATE_LIMIT_MAX_REQUESTS = 3; // máximo 3 requisições

function getClientIp(req: any): string {
  return (req.headers['x-forwarded-for'] as string)?.split(',')[0] || 
         req.connection?.remoteAddress || 
         req.socket?.remoteAddress || 
         req.ip ||
         'unknown';
}

function checkRateLimit(identifier: string): { allowed: boolean; resetIn?: number } {
  const now = Date.now();
  const rateLimitData = initSessionRateLimit.get(identifier);

  if (!rateLimitData || now > rateLimitData.resetTime) {
    // Reset ou primeira vez
    initSessionRateLimit.set(identifier, {
      count: 1,
      resetTime: now + RATE_LIMIT_WINDOW
    });
    return { allowed: true };
  }

  if (rateLimitData.count >= RATE_LIMIT_MAX_REQUESTS) {
    const resetIn = Math.ceil((rateLimitData.resetTime - now) / 1000);
    console.warn(`[Rate Limit] Identifier ${identifier} exceeded init-session limit (${rateLimitData.count}/${RATE_LIMIT_MAX_REQUESTS})`);
    return { allowed: false, resetIn };
  }

  // Incrementar contador
  rateLimitData.count++;
  initSessionRateLimit.set(identifier, rateLimitData);
  return { allowed: true };
}

// Middleware para garantir JSON em todas as rotas de auth
router.use((req, res, next) => {
  res.setHeader('Content-Type', 'application/json');
  next();
});

// Session initialization is now handled automatically during login/verification
// No separate initialize-session endpoint needed

// Login endpoint
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { firebaseToken, email } = req.body;

    console.log('🔐 [Login] Starting login process for:', email);

    if (!firebaseToken) {
      return res.status(400).json({
        success: false,
        message: 'Firebase token é obrigatório',
        code: 'MISSING_FIREBASE_TOKEN'
      });
    }

    // Verify Firebase token
    let decodedToken;
    try {
      decodedToken = await admin.auth().verifyIdToken(firebaseToken);
      console.log('✅ [Login] Firebase token verified for:', decodedToken.email);
    } catch (error) {
      console.error('❌ [Login] Firebase token verification failed:', error);
      return res.status(401).json({
        success: false,
        message: 'Token de autenticação inválido',
        code: 'INVALID_FIREBASE_TOKEN'
      });
    }

    // ✅ USAR SERVIÇO CENTRALIZADO E SEGURO
    const dbUser = await findUserByFirebaseUid(decodedToken.uid);

    if (!dbUser) {
      return res.status(404).json({
        success: false,
        message: 'Usuário não encontrado no sistema'
      });
    }

    // ✅ USAR FUNÇÃO CENTRALIZADA DE VERIFICAÇÃO
    const loginCheck = canUserLogin(dbUser);
    if (!loginCheck.canLogin) {
      const errorMessages = {
        'PENDING_APPROVAL': 'Conta pendente de aprovação',
        'ACCOUNT_INACTIVE': 'Conta inativa ou bloqueada'
      };

      return res.status(403).json({
        success: false,
        message: errorMessages[loginCheck.reason!] || 'Acesso negado',
        code: loginCheck.reason
      });
    }

    // Capture IP and User-Agent from request
    const ipAddress = req.ip || req.connection.remoteAddress || '';
    const userAgent = req.headers['user-agent'] || '';

    // ✅ CORREÇÃO CRÍTICA: Usar SessionManagerService para login
    let sessionToken = null;
    
    try {
      const { sessionManager } = await import('../services/session-manager.service');

      console.log(`[Login] Creating session for user: ${dbUser.email} (${dbUser.role})`);

      const sessionResult = await sessionManager.createSession(
        dbUser.id,
        dbUser.role,
        ipAddress,
        userAgent
      );

      if (sessionResult.success) {
        sessionToken = sessionResult.sessionToken;
        console.log(`✅ [Login] Session created successfully for ${dbUser.email}`);
      } else {
        console.warn(`⚠️ [Login] Session creation failed for ${dbUser.email}, continuing with Firebase-only auth`);
      }
    } catch (sessionError) {
      console.warn(`⚠️ [Login] Session manager error, continuing with Firebase-only auth:`, sessionError);
    }

    // ✅ ATUALIZAR ÚLTIMA ATIVIDADE DE LOGIN
    try {
      await db.update(users)
        .set({ 
          lastLoginAt: new Date(),
          ipAddress: ipAddress,
          userAgent: userAgent
        })
        .where(eq(users.id, dbUser.id));
      
      console.log(`[Login] Updated lastLoginAt for user: ${dbUser.email}`);
    } catch (updateError) {
      console.error(`[Login] Failed to update lastLoginAt for ${dbUser.email}:`, updateError);
      // Não falhar o login por causa do update - apenas logar o erro
    }

    // ✅ SEGURANÇA: Definir session token como cookie HTTPOnly se disponível
    // ✅ SAFARI FIX: Usar sameSite 'lax' para melhor compatibilidade com Safari
    if (sessionToken) {
      const userAgent = req.headers['user-agent'] || '';
      const isSafari = userAgent.includes('Safari') && !userAgent.includes('Chrome');
      
      // Log para debug do Safari
      if (isSafari) {
        console.log(`🔍 [Safari] Setting session cookie for user: ${dbUser.email}`);
      }
      
      res.cookie('sessionToken', sessionToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax', // Mudança para 'lax' para compatibilidade com Safari
        maxAge: 24 * 60 * 60 * 1000, // 24 horas
        path: '/',
        domain: process.env.NODE_ENV === 'production' ? undefined : undefined // Não definir domínio para desenvolvimento
      });
      
      if (isSafari) {
        console.log(`✅ [Safari] Session cookie set successfully for: ${dbUser.email}`);
      }
    }

    res.json({
      success: true,
      data: {
        user: {
          id: dbUser.id,
          email: dbUser.email,
          name: dbUser.name,
          role: dbUser.role,
          subscriptionPlan: dbUser.subscriptionPlan,
          isApproved: dbUser.isApproved
        }
      }
    });

  } catch (error) {
    console.error('Login route error:', error);
    
    let errorMessage = 'Erro interno do servidor';
    let statusCode = 500;
    
    // Provide more specific error messages based on error type
    if (error.message) {
      if (error.message.includes('Firebase')) {
        errorMessage = 'Erro de autenticação. Tente fazer login novamente';
        statusCode = 401;
      } else if (error.message.includes('database') || error.message.includes('connection')) {
        errorMessage = 'Erro temporário do banco de dados. Tente novamente em alguns minutos';
      } else if (error.message.includes('timeout')) {
        errorMessage = 'Tempo limite de conexão excedido. Tente novamente';
        statusCode = 408;
      }
    }
    
    res.status(statusCode).json({
      success: false,
      message: errorMessage,
      errorType: error.name || 'ServerError',
      timestamp: new Date().toISOString()
    });
  }
});

// Registro de usuário
router.post('/register', async (req: Request, res: Response) => {
  try {
    const { firebaseToken, name, company } = req.body;

    if (!firebaseToken) {
      return res.status(400).json({ 
        message: 'Firebase token é obrigatório',
        code: 'FIREBASE_TOKEN_REQUIRED'
      });
    }

    // Verificar token do Firebase
    const decodedToken = await verifyIdToken(firebaseToken);

    // ✅ USAR FUNÇÃO CENTRALIZADA - Verificar se usuário já existe
    const existingUser = await findUserByFirebaseUid(decodedToken.uid);
    if (existingUser) {
      return res.status(409).json({ 
        message: 'Usuário já existe',
        code: 'USER_ALREADY_EXISTS'
      });
    }

    const clientIp = getClientIp(req);
    const userAgent = req.headers['user-agent'] || '';

    // Extrair dados adicionais do request body
    const { whatsapp } = req.body;

    // Criar novo usuário - SEMPRE pendente de aprovação
    const newUser = {
      firebaseUid: decodedToken.uid,
      email: decodedToken.email || '',
      name: name || decodedToken.name || '',
      company: company || null,
      whatsapp: whatsapp || null,
      phone: whatsapp || null,
      isApproved: false, // ✅ CRÍTICO: Sempre false para novos usuários
      status: 'pending_approval' as const,
      subscriptionPlan: 'free' as const,
      role: 'user' as const,
      isAdmin: false,
      isSubscriptionActive: false,
      createdAt: new Date(),
      lastActiveAt: new Date()
    };

    console.log(`📝 Criando novo usuário:`, {
      email: newUser.email,
      name: newUser.name,
      company: newUser.company,
      isApproved: newUser.isApproved,
      status: newUser.status,
      role: newUser.role,
      isAdmin: newUser.isAdmin
    });

    const createdUser = await storage.createUser(newUser);

    // Log da criação do usuário
    await storage.createSecurityLog({
      userId: createdUser.id,
      ipAddress: clientIp,
      action: 'user_registration',
      reason: 'New user registered - pending approval',
      userAgent,
      success: true
    });

    console.log(`✅ Novo usuário registrado com sucesso: ${createdUser.email} (ID: ${createdUser.id})`);
    console.log(`📋 Status de aprovação: isApproved=${createdUser.isApproved}, status=${createdUser.status}, role=${createdUser.role}`);
    console.log(`🔍 Detalhes completos do usuário criado:`, {
      id: createdUser.id,
      email: createdUser.email,
      name: createdUser.name,
      company: createdUser.company,
      isApproved: createdUser.isApproved,
      status: createdUser.status,
      role: createdUser.role,
      isAdmin: createdUser.isAdmin,
      subscriptionPlan: createdUser.subscriptionPlan
    });

    res.status(201).json({
      message: 'Usuário registrado com sucesso. Aguardando aprovação do administrador.',
      user: {
        id: createdUser.id,
        email: createdUser.email,
        name: createdUser.name,
        company: createdUser.company,
        isApproved: createdUser.isApproved,
        status: createdUser.status
      },
      code: 'USER_REGISTERED_PENDING_APPROVAL'
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ 
      message: 'Erro interno do servidor',
      code: 'INTERNAL_ERROR'
    });
  }
});

// Rota de logout
router.post('/logout', async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    const sessionToken = req.headers['x-session-token'] as string;
    const firebaseToken = authHeader && authHeader.split(' ')[1];

    const clientIp = getClientIp(req);
    const userAgent = req.headers['user-agent'] || '';

    console.log(`🚪 Logout request from IP: ${clientIp}`);

    // ✅ CORREÇÃO: Aceitar logout mesmo sem token (cleanup)
    if (!firebaseToken && !sessionToken) {
      console.log('⚠️ Logout without tokens - cleaning up any residual sessions');
      return res.json({
        message: 'Logout realizado com sucesso',
        success: true
      });
    }

    let userData = null;

    // Tentar verificar token do Firebase se disponível
    if (firebaseToken) {
      try {
        const decodedToken = await verifyIdToken(firebaseToken);
        userData = await storage.getUserByFirebaseUid(decodedToken.uid);
      } catch (error) {
        console.warn('Token verification failed during logout:', error);
        // Continuar mesmo se token for inválido
      }
    }

    // ✅ CORREÇÃO: Invalidar sessão específica se sessionToken fornecido
    if (sessionToken) {
      try {
        await db.update(userSessions)
          .set({ 
            isActive: false,
            lastActivity: new Date()
          })
          .where(eq(userSessions.sessionToken, sessionToken));

        console.log(`✅ Session token invalidated: ${sessionToken.substring(0, 10)}...`);
      } catch (sessionError) {
        console.error('Error invalidating specific session:', sessionError);
      }
    }

    // Invalidar todas as sessões do usuário se userData disponível
    if (userData) {
      try {
        // ✅ CORREÇÃO: Invalidar TODAS as sessões do usuário
        await storage.invalidateAllUserSessions(userData.id);
        console.log(`✅ All sessions invalidated for user: ${userData.email}`);

        // Log de logout bem-sucedido
        await storage.createSecurityLog({
          userId: userData.id,
          ipAddress: clientIp,
          action: 'logout_success',
          reason: `User ${userData.email} logged out successfully - all sessions invalidated`,
          userAgent,
          success: true
        });

        // ✅ CORREÇÃO: Emitir evento WebSocket para outras sessões
        try {
          const { broadcastToUserChannel } = await import('../websocket-manager');
          await broadcastToUserChannel(userData.id, {
            type: 'session_terminated',
            message: 'Logout realizado. Todas as sessões foram encerradas.',
            timestamp: new Date().toISOString(),
            reason: 'user_logout'
          });
          console.log(`📡 Logout notification sent via WebSocket to user ${userData.id}`);
        } catch (wsError) {
          console.error('Failed to send logout notification via WebSocket:', wsError);
        }

        console.log(`✅ Complete logout success: ${userData.email}`);
      } catch (error) {
        console.error('Error during session invalidation:', error);
      }
    }

    // ✅ SEGURANÇA: Limpar cookie de sessão
    res.clearCookie('sessionToken', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/'
    });

    res.json({
      message: 'Logout realizado com sucesso',
      success: true
    });

  } catch (error) {
    console.error('Logout error:', error);
    // ✅ SEMPRE retornar sucesso para evitar problemas no frontend
    res.json({ 
      message: 'Logout realizado com sucesso',
      success: true
    });
  }
});

// Rota alternativa de registro
router.post('/users/register', async (req: Request, res: Response) => {
  // Redireciona para a rota principal de registro
  return router.handle({ ...req, url: '/register', method: 'POST' } as any, res);
});

// Endpoint específico para recuperação de sessão de admin
router.post('/admin-session-recovery', async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({ 
        success: false, 
        message: 'Token de autorização necessário' 
      });
    }

    // ✅ USAR FUNÇÃO CENTRALIZADA - Verify Firebase token
    const decodedToken = await verifyIdToken(token);
    const userData = await findUserByFirebaseUid(decodedToken.uid);

    if (!userData) {
      return res.status(404).json({ 
        success: false, 
        message: 'Usuário não encontrado' 
      });
    }

    // Only allow for admin users
    if (userData.role !== 'admin' && userData.role !== 'superadmin') {
      return res.status(403).json({ 
        success: false, 
        message: 'Acesso negado - apenas administradores' 
      });
    }

    const ipAddress = req.ip || req.connection.remoteAddress || '';
    const userAgent = req.headers['user-agent'] || '';

    console.log(`[Admin Recovery] Starting session recovery for ${userData.email}`);

    // ✅ USAR SESSIONMANAGER CENTRALIZADO
    const { sessionManager } = await import('../services/session-manager.service');

    const sessionResult = await sessionManager.createSession(
      userData.id,
      userData.role,
      ipAddress,
      userAgent
    );

    if (!sessionResult.success) {
      console.error(`[Admin Recovery] Failed to create session for ${userData.email}:`, sessionResult.error);
      throw new Error(sessionResult.message || 'Failed to create session');
    }

    const { sessionToken } = sessionResult;
    console.log(`[Admin Recovery] Created fresh session for ${userData.email}`);

    res.json({
      success: true,
      data: {
        sessionToken,
        user: {
          id: userData.id,
          email: userData.email,
          name: userData.name,
          role: userData.role,
          isAdmin: userData.isAdmin,
          isApproved: userData.isApproved
        }
      }
    });

  } catch (error) {
    console.error('Admin session recovery error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erro interno do servidor' 
    });
  }
});

// Endpoint para salvar aceitação de termos
router.post('/terms-acceptance', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { userId, acceptanceDate, version } = req.body;

    // Validar dados
    if (!userId || !acceptanceDate || !version) {
      return res.status(400).json({
        success: false,
        message: 'Dados incompletos para salvar aceitação de termos'
      });
    }

    // Dependencies already imported at top of file

    // Verificar se o usuário existe
    const user = await db.select()
      .from(users)
      .where(and(
          eq(users.id, userId),
          eq(users.firebaseUid, userId)
      ))
      .limit(1);

    if (user.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Usuário não encontrado'
      });
    }

    // Atualizar informações de aceitação de termos
    await db.update(users)
      .set({
        termsAcceptedAt: new Date(acceptanceDate),
        termsVersion: version,
        updatedAt: new Date()
      })
      .where(eq(users.firebaseUid, userId));

    console.log(`✅ Termos aceitos pelo usuário ${userId} - Versão: ${version}`);

    res.json({
      success: true,
      message: 'Aceitação de termos salva com sucesso',
      data: {
        userId,
        acceptanceDate,
        version
      }
    });

  } catch (error) {
    console.error('❌ Erro ao salvar aceitação de termos:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
});

// Verify session with improved resilience and auto-recovery
router.post('/verify-session', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    const sessionToken = req.cookies?.sessionToken || req.headers['x-session-token'] as string;

    console.log(`🔍 [Session Verify] Request from IP: ${req.ip}`);

    if (!authHeader) {
      return res.status(401).json({
        success: false,
        message: 'Missing authentication credentials',
        code: 'MISSING_AUTH_HEADER'
      });
    }

    const token = authHeader.split(' ')[1];
    
    let decodedToken;
    try {
      decodedToken = await verifyIdToken(token);
    } catch (error) {
      console.error('❌ [Session Verify] Firebase token invalid:', error);
      return res.status(401).json({
        success: false,
        message: 'Invalid Firebase token',
        code: 'INVALID_FIREBASE_TOKEN'
      });
    }

    // Buscar usuário (sem auto-criação)
    let userData = await findUserByFirebaseUid(decodedToken.uid);
    
    if (!userData) {
      console.log(`❌ [Session Verify] User not found: ${decodedToken.email}`);
      return res.status(404).json({
        success: false,
        message: 'Usuário não encontrado no sistema',
        code: 'USER_NOT_FOUND'
      });
    }

    // Verificar se usuário está aprovado
    if (!userData.isApproved) {
      console.log(`❌ [Session Verify] User not approved: ${userData.email}`);
      return res.status(403).json({
        success: false,
        message: 'Conta pendente de aprovação pelo administrador',
        code: 'PENDING_APPROVAL'
      });
    }

    // ✅ REGRA UNIFICADA: Todas as verificações de sessão seguem a mesma lógica
    if (!sessionToken) {
      console.log(`❌ [Session Verify] Missing session token for user ${userData.email} (${userData.role})`);
      return res.status(401).json({
        success: false,
        message: 'Missing session token',
        code: 'MISSING_SESSION_TOKEN',
        requiresInitSession: true
      });
    }

    // Verificar sessão no banco
    let session;
    try {
      session = await storage.getActiveSession(userData.id, sessionToken);
    } catch (sessionError) {
      console.error(`[Session Verify] Database error checking session for ${userData.email}:`, sessionError);

      return res.status(500).json({
        success: false,
        message: 'Database error during session verification',
        code: 'DATABASE_ERROR'
      });
    }

    if (!session) {
      console.log(`❌ [Session Verify] Invalid session for user: ${userData.email} (${userData.role})`);

      return res.status(401).json({
        success: false,
        message: 'Invalid or expired session',
        code: 'INVALID_SESSION',
        requiresInitSession: true
      });
    }

    // Atualizar última atividade
    try {
      await storage.updateSessionActivity(sessionToken);
    } catch (error) {
      console.error('Failed to update session activity:', error);
      // Não falhar a requisição por isso
    }

    console.log(`✅ [Session Verify] Success for user: ${userData.email} (${userData.role})`);

    res.json({
      success: true,
      user: {
        id: userData.id,
        email: userData.email,
        name: userData.name,
        role: userData.role,
        subscriptionPlan: userData.subscriptionPlan,
        isApproved: userData.isApproved,
        status: userData.status
      }
    });
  } catch (error) {
    console.error('Session verification error:', error);
    res.status(401).json({
      success: false,
      message: 'Session verification failed',
      code: 'VERIFICATION_ERROR'
    });
  }
});

// Debug: Confirm routes are registered
console.log('✅ [Auth Routes] Registered routes:', {
  'POST /login': '✓',
  'POST /register': '✓',  
  'POST /logout': '✓',
  'POST /verify-session': '✓',
  'POST /admin-session-recovery': '✓',
  'POST /terms-acceptance': '✓'
});

export default router;