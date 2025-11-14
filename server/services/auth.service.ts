import { db } from '../db';
import { users, userSessions } from '../../shared/schema';
import { eq, and } from 'drizzle-orm';
import { logger } from '../utils/logger';
import { admin } from './firebase-admin';
import { findUserByFirebaseUid } from './user.service';

export interface LoginResult {
  success: boolean;
  message?: string;
  data?: {
    user: any;
    sessionToken: string;
  };
}

export interface RegisterResult {
  success: boolean;
  message?: string;
  data?: {
    user: any;
    requiresApproval: boolean;
  };
}

class AuthService {
  async login(email: string, password: string, req: any): Promise<LoginResult> {
    try {
      // Validate input parameters
      if (!email || !password || !req) {
        return {
          success: false,
          message: 'Parâmetros de login inválidos'
        };
      }

      // Validate with Firebase
      let firebaseUser;
      try {
        firebaseUser = await admin.auth().getUserByEmail(email);
      } catch (firebaseError) {
        console.error('Firebase auth error:', firebaseError);
        return {
          success: false,
          message: 'Credenciais inválidas'
        };
      }

      if (!firebaseUser) {
        return {
          success: false,
          message: 'Credenciais inválidas'
        };
      }

      // Get user from database
      // let dbUser;
      // try {
      //   const result = await db
      //     .select()
      //     .from(users)
      //     .where(eq(users.firebaseUid, firebaseUser.uid))
      //     .limit(1);

      //   dbUser = result[0];
      // } catch (dbError) {
      //   console.error('Database error during user lookup in auth service:', dbError);
      //   logger.error('Database error during user lookup:', dbError);
      //   return {
      //     success: false,
      //     message: 'Erro interno do servidor ao buscar usuário'
      //   };
      // }

      let dbUser;
      try {
        dbUser = await findUserByFirebaseUid(firebaseUser.uid);
      } catch (dbError) {
        console.error('❌ Database error during user lookup:', dbError);
        
        // Check if it's a connection error
        if (dbError.message?.includes('connect') || 
            dbError.message?.includes('timeout') ||
            dbError.message?.includes('ECONNREFUSED') ||
            dbError.code === 'ECONNREFUSED') {
          return {
            success: false,
            message: 'Serviço temporariamente indisponível. Tente novamente em alguns instantes.'
          };
        }
        
        return {
          success: false,
          message: 'Erro interno do servidor ao buscar usuário'
        };
      }

      if (!dbUser) {
        return {
          success: false,
          message: 'Usuário não encontrado no sistema'
        };
      }

      // Check if user is approved
      if (!dbUser.isApproved && dbUser.role !== 'admin' && dbUser.role !== 'superadmin') {
        return {
          success: false,
          message: 'Conta pendente de aprovação'
        };
      }

      // Capture IP and User-Agent from request
      const ipAddress = req.ip || req.connection.remoteAddress || '';
      const userAgent = req.headers['user-agent'] || '';

      // ✅ CORREÇÃO CRÍTICA: Usar SessionManagerService centralizado
      const { sessionManager } = await import('./session-manager.service');

      console.log(`[Auth Service] Creating session for user: ${dbUser.email} (${dbUser.role})`);

      let sessionResult;
      try {
        sessionResult = await sessionManager.createSession(
          dbUser.id,
          dbUser.role,
          ipAddress,
          userAgent
        );

        if (!sessionResult.success) {
          console.error(`[Auth Service] Session creation failed for ${dbUser.email}:`, sessionResult.error);
          return {
            success: false,
            message: sessionResult.message || 'Erro ao criar sessão'
          };
        }
      } catch (sessionError) {
        console.error(`[Auth Service] Session manager error for ${dbUser.email}:`, sessionError);
        
        // Check if it's a database connectivity issue
        if (sessionError.message?.includes('connect') || 
            sessionError.message?.includes('timeout') ||
            sessionError.code === 'ECONNREFUSED') {
          return {
            success: false,
            message: 'Serviço temporariamente indisponível. Tente novamente em alguns instantes.'
          };
        }
        
        // For other session errors, fall back to Firebase-only auth
        console.log(`[Auth Service] Falling back to Firebase-only auth for ${dbUser.email}`);
        return {
          success: true,
          data: {
            user: {
              id: dbUser.id,
              email: dbUser.email,
              name: dbUser.name,
              role: dbUser.role,
              subscriptionPlan: dbUser.subscriptionPlan,
              isApproved: dbUser.isApproved
            },
            sessionToken: null // Let client handle Firebase-only auth
          }
        };
      }

      const { sessionToken } = sessionResult;

      return {
        success: true,
        data: {
          user: {
            id: dbUser.id,
            email: dbUser.email,
            name: dbUser.name,
            role: dbUser.role,
            subscriptionPlan: dbUser.subscriptionPlan,
            isApproved: dbUser.isApproved
          },
          sessionToken
        }
      };
    } catch (error) {
      logger.error('Auth service login error:', error);
      return {
        success: false,
        message: 'Erro interno do servidor'
      };
    }
  }

  async register(email: string, password: string, name: string): Promise<RegisterResult> {
    try {
      // Create Firebase user
      const firebaseUser = await admin.auth().createUser({
        email,
        password,
        displayName: name
      });

      // Create database user
      const [dbUser] = await db.insert(users).values({
        firebaseUid: firebaseUser.uid,
        email,
        name,
        role: 'user',
        subscriptionPlan: 'free',
        isApproved: false,
        status: 'pending_approval'
      }).returning();

      logger.info(`New user registered: ${email}`);

      return {
        success: true,
        data: {
          user: {
            id: dbUser.id,
            email: dbUser.email,
            name: dbUser.name,
            role: dbUser.role,
            isApproved: dbUser.isApproved
          },
          requiresApproval: true
        }
      };
    } catch (error) {
      logger.error('Auth service registration error:', error);
      return {
        success: false,
        message: 'Erro ao criar conta'
      };
    }
  }

  async logout(uid: string): Promise<void> {
    try {
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.firebaseUid, uid))
        .limit(1);

      if (user) {
        await db
          .update(userSessions)
          .set({ isActive: false })
          .where(eq(userSessions.userId, user.id));
      }
    } catch (error) {
      logger.error('Auth service logout error:', error);
      throw error;
    }
  }

  async validateSession(sessionToken: string): Promise<any | null> {
    try {
      const [session] = await db
        .select({
          user: users,
          session: userSessions
        })
        .from(userSessions)
        .innerJoin(users, eq(userSessions.userId, users.id))
        .where(
          and(
            eq(userSessions.sessionToken, sessionToken),
            eq(userSessions.isActive, true)
          )
        )
        .limit(1);

      if (!session || session.session.expiresAt < new Date()) {
        return null;
      }

      return {
        uid: session.user.firebaseUid,
        email: session.user.email,
        role: session.user.role,
        subscriptionPlan: session.user.subscriptionPlan,
        isApproved: session.user.isApproved
      };
    } catch (error) {
      logger.error('Session validation error:', error);
      return null;
    }
  }
}

export const authService = new AuthService();