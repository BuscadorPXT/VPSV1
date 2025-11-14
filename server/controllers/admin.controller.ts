import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types/express.types';
import { userService } from '../services/user.service';
import { logger } from '../utils/logger';
import { db } from '../db';
import { eq, desc } from 'drizzle-orm';
import { users } from '../../shared/schema';
import * as crypto from 'crypto';

export class AdminController {
  async getAllUsers(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      // Check admin permissions
      const userData = req.user?.userData;
      if (!userData || (userData.role !== 'admin' && userData.role !== 'superadmin' && !userData.isAdmin)) {
        return res.status(403).json({ 
          error: 'Acesso negado' 
        });
      }

      console.log(`🔍 Admin ${userData.email} requesting all users`);

      const users = await userService.getAllUsers();
      
      console.log(`✅ Found ${users?.users?.length || 0} users for admin dashboard`);
      
      res.json(users);
    } catch (error) {
      console.error('❌ Get all users error:', error);
      logger.error('Get all users error:', error);
      res.status(500).json({
        error: 'Erro interno do servidor',
        message: 'Não foi possível carregar os usuários'
      });
    }
  }

  async getPendingUsers(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      // Check admin permissions
      const userData = req.user?.userData;
      if (!userData || (userData.role !== 'admin' && userData.role !== 'superadmin' && !userData.isAdmin)) {
        return res.status(403).json({ 
          error: 'Acesso negado' 
        });
      }

      console.log(`🔍 Admin ${userData.email} requesting pending users`);

      const pendingUsers = await userService.getPendingUsers();
      
      console.log(`✅ Found ${pendingUsers?.length || 0} pending users`);
      
      res.json(pendingUsers);
    } catch (error) {
      console.error('❌ Get pending users error:', error);
      logger.error('Get pending users error:', error);
      res.status(500).json({
        error: 'Erro interno do servidor',
        message: 'Não foi possível carregar usuários pendentes'
      });
    }
  }

  async approveUser(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      // Check admin permissions
      if (req.user.role !== 'admin' && req.user.role !== 'superadmin') {
        return res.status(403).json({ 
          error: 'Acesso negado' 
        });
      }

      const { userId } = req.params;
      const userIdNum = parseInt(userId);

      if (isNaN(userIdNum)) {
        return res.status(400).json({ 
          error: 'ID do usuário inválido' 
        });
      }

      const approvedUser = await userService.approveUser(userIdNum);
      
      logger.info(`User ${userIdNum} approved by admin ${req.user.uid}`);
      res.json(approvedUser);
    } catch (error) {
      logger.error('Approve user error:', error);
      next(error);
    }
  }

  async getDashboardStats(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      // Check admin permissions
      if (req.user.role !== 'admin' && req.user.role !== 'superadmin') {
        return res.status(403).json({ 
          error: 'Acesso negado' 
        });
      }

      // TODO: Implement dashboard statistics
      const stats = {
        totalUsers: 0,
        pendingUsers: 0,
        totalProducts: 0,
        lastSync: null
      };

      res.json(stats);
    } catch (error) {
      logger.error('Get dashboard stats error:', error);
      next(error);
    }
  }

  async getUsersWithApiKeys(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      // Check admin permissions
      const userData = req.user?.userData;
      if (!userData || (userData.role !== 'admin' && userData.role !== 'superadmin' && !userData.isAdmin)) {
        return res.status(403).json({ 
          error: 'Acesso negado' 
        });
      }

      console.log(`🔍 Admin ${userData.email} requesting users with API keys`);

      // Use a simpler approach - get all users first, then map the fields we need
      const allUsers = await db.select().from(users).orderBy(desc(users.createdAt));

      // Map to the fields we need for the API keys management
      const usersWithApiKeyInfo = allUsers.map(user => ({
        id: user.id,
        email: user.email,
        name: user.name,
        company: user.company || null,
        role: user.role,
        subscriptionPlan: user.subscriptionPlan,
        isApproved: user.isApproved,
        isAdmin: user.isAdmin,
        apiKey: user.apiKey || null,
        apiKeyCreatedAt: user.apiKeyCreatedAt || null,
        createdAt: user.createdAt,
        status: user.status
      }));

      console.log(`✅ Found ${usersWithApiKeyInfo.length} users for API keys management`);

      res.json(usersWithApiKeyInfo);
    } catch (error) {
      console.error('Get users with API keys error:', error);
      logger.error('Get users with API keys error:', error);
      res.status(500).json({
        error: 'Erro interno do servidor'
      });
    }
  }

  async generateApiKeyForUser(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      // Check admin permissions
      const userData = req.user?.userData;
      if (!userData || (userData.role !== 'admin' && userData.role !== 'superadmin' && !userData.isAdmin)) {
        return res.status(403).json({ 
          error: 'Acesso negado' 
        });
      }

      const { userId } = req.params;
      const userIdNum = parseInt(userId);

      console.log(`🔑 Generating API key for user ${userIdNum} by admin ${userData.email}`);

      if (isNaN(userIdNum)) {
        return res.status(400).json({ 
          error: 'ID do usuário inválido' 
        });
      }

      // Check if user exists and is approved
      const targetUsers = await db.select().from(users).where(eq(users.id, userIdNum)).limit(1);

      if (!targetUsers.length) {
        console.log(`❌ User ${userIdNum} not found`);
        return res.status(404).json({
          error: 'Usuário não encontrado'
        });
      }

      const user = targetUsers[0];
      console.log(`👤 Found user: ${user.email}, approved: ${user.isApproved}, hasApiKey: ${!!user.apiKey}`);

      if (!user.isApproved) {
        return res.status(400).json({
          error: 'Usuário precisa estar aprovado para receber API key'
        });
      }

      // Check if user already has an API key
      if (user.apiKey) {
        return res.status(400).json({
          error: 'Usuário já possui uma API key ativa'
        });
      }

      // Generate API key
      const apiKey = `pxt_${crypto.randomBytes(32).toString('hex')}`;
      console.log(`🔑 Generated API key for user ${userIdNum}: ${apiKey.substring(0, 12)}...`);

      // Update user with API key - using a more explicit approach
      try {
        const updateResult = await db
          .update(users)
          .set({
            apiKey: apiKey,
            apiKeyCreatedAt: new Date()
          })
          .where(eq(users.id, userIdNum))
          .returning({
            id: users.id,
            email: users.email,
            name: users.name,
            apiKey: users.apiKey,
            apiKeyCreatedAt: users.apiKeyCreatedAt
          });

        if (!updateResult.length) {
          console.log(`❌ Failed to update user ${userIdNum} with API key`);
          return res.status(500).json({
            error: 'Falha ao gerar API key'
          });
        }

        const updatedUser = updateResult[0];
        console.log(`✅ API key successfully generated for user ${userIdNum} (${user.email})`);
        
        logger.info(`Admin ${userData.id} generated API key for user ${userIdNum} (${user.email})`);

        res.json({
          success: true,
          message: 'API key gerada com sucesso',
          apiKey: updatedUser.apiKey,
          user: {
            id: updatedUser.id,
            email: updatedUser.email,
            name: updatedUser.name,
            apiKeyCreatedAt: updatedUser.apiKeyCreatedAt
          }
        });

      } catch (dbError) {
        console.error('❌ Database error during API key generation:', dbError);
        logger.error('Database error during API key generation:', dbError);
        
        return res.status(500).json({
          error: 'Erro no banco de dados ao gerar API key',
          details: process.env.NODE_ENV === 'development' ? dbError.message : undefined
        });
      }

    } catch (error) {
      console.error('❌ Generate API key error:', error);
      logger.error('Generate API key for user error:', error);
      
      return res.status(500).json({
        error: 'Erro interno do servidor ao gerar API key',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  async revokeApiKeyForUser(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      // Check admin permissions
      const userData = req.user?.userData;
      if (!userData || (userData.role !== 'admin' && userData.role !== 'superadmin' && !userData.isAdmin)) {
        return res.status(403).json({ 
          error: 'Acesso negado' 
        });
      }

      const { userId } = req.params;
      const userIdNum = parseInt(userId);

      if (isNaN(userIdNum)) {
        return res.status(400).json({ 
          error: 'ID do usuário inválido' 
        });
      }

      // Check if user exists
      const targetUser = await db.select()
        .from(users)
        .where(eq(users.id, userIdNum))
        .limit(1);

      if (!targetUser.length) {
        return res.status(404).json({
          error: 'Usuário não encontrado'
        });
      }

      const user = targetUser[0];

      // Revoke API key
      const [updatedUser] = await db.update(users)
        .set({ 
          apiKey: null,
          apiKeyCreatedAt: null
        })
        .where(eq(users.id, userIdNum))
        .returning();

      logger.info(`Admin ${userData.id} revoked API key for user ${userIdNum} (${user.email})`);

      res.json({
        success: true,
        message: 'API key revogada com sucesso'
      });
    } catch (error) {
      logger.error('Revoke API key for user error:', error);
      next(error);
    }
  }

  async updateUserSubscription(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      // Check admin permissions
      const userData = req.user?.userData;
      if (!userData || (userData.role !== 'admin' && userData.role !== 'superadmin' && !userData.isAdmin)) {
        return res.status(403).json({ 
          error: 'Acesso negado' 
        });
      }

      const { userId } = req.params;
      const { subscriptionPlan, expiresAt } = req.body;
      const userIdNum = parseInt(userId);

      if (isNaN(userIdNum)) {
        return res.status(400).json({ 
          error: 'ID do usuário inválido' 
        });
      }

      // Check if user exists
      const targetUser = await db.select()
        .from(users)
        .where(eq(users.id, userIdNum))
        .limit(1);

      if (!targetUser.length) {
        return res.status(404).json({
          error: 'Usuário não encontrado'
        });
      }

      const user = targetUser[0];

      // Prepare update data
      const updateData: any = {
        subscriptionPlan,
        updatedAt: new Date()
      };

      if (expiresAt) {
        updateData.subscriptionExpiresAt = new Date(expiresAt);
      }

      // Update user subscription
      const [updatedUser] = await db.update(users)
        .set(updateData)
        .where(eq(users.id, userIdNum))
        .returning();

      logger.info(`Admin ${userData.id} updated subscription for user ${userIdNum} (${user.email}) to ${subscriptionPlan}`);

      res.json({
        success: true,
        message: 'Assinatura atualizada com sucesso',
        user: updatedUser
      });
    } catch (error) {
      console.error('Error updating user subscription:', error);
      logger.error('Update user subscription error:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  async syncFirebaseUser(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      // Check admin permissions
      const userData = req.user?.userData;
      if (!userData || (userData.role !== 'admin' && userData.role !== 'superadmin' && !userData.isAdmin)) {
        return res.status(403).json({ 
          error: 'Acesso negado' 
        });
      }

      const { email } = req.body;

      if (!email) {
        return res.status(400).json({ 
          error: 'Email é obrigatório' 
        });
      }

      console.log(`🔄 Admin ${userData.email} attempting to sync Firebase user: ${email}`);

      // Import Firebase admin here to avoid circular dependencies
      const { admin } = await import('../services/firebase-admin');

      try {
        // Try to get user from Firebase
        const firebaseUser = await admin.auth().getUserByEmail(email);
        
        console.log(`✅ Found Firebase user: ${firebaseUser.email} (UID: ${firebaseUser.uid.substring(0, 10)}...)`);

        // Check if user already exists in local database
        const existingUser = await db.select()
          .from(users)
          .where(eq(users.email, email))
          .limit(1);

        if (existingUser.length > 0) {
          return res.status(409).json({
            success: false,
            message: 'Usuário já existe no banco de dados local',
            user: existingUser[0]
          });
        }

        // Create user in local database
        const newUser = {
          firebaseUid: firebaseUser.uid,
          email: firebaseUser.email || email,
          name: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'Usuário',
          company: null,
          whatsapp: null,
          phone: null,
          isApproved: false, // Always false for newly synced users
          status: 'pending_approval' as const,
          subscriptionPlan: 'free' as const,
          role: 'user' as const,
          isAdmin: false,
          isSubscriptionActive: false,
          createdAt: new Date(),
          lastActiveAt: new Date()
        };

        console.log(`📝 Creating user in local database:`, {
          email: newUser.email,
          name: newUser.name,
          isApproved: newUser.isApproved,
          status: newUser.status
        });

        const [createdUser] = await db.insert(users)
          .values(newUser)
          .returning();

        logger.info(`Admin ${userData.id} synced Firebase user ${email} to local database (ID: ${createdUser.id})`);

        res.json({
          success: true,
          message: 'Usuário sincronizado com sucesso do Firebase',
          user: createdUser
        });

      } catch (firebaseError: any) {
        console.error('❌ Firebase error:', firebaseError);
        
        if (firebaseError.code === 'auth/user-not-found') {
          return res.status(404).json({
            success: false,
            message: 'Usuário não encontrado no Firebase'
          });
        }

        throw firebaseError;
      }

    } catch (error) {
      console.error('❌ Sync Firebase user error:', error);
      logger.error('Sync Firebase user error:', error);
      res.status(500).json({
        success: false,
        error: 'Erro interno do servidor ao sincronizar usuário',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
}

export const adminController = new AdminController();