import { db } from '../db';
import { users, adminActionLogs } from '../../shared/schema';
import { eq, and, or, desc, not } from 'drizzle-orm';
import { logger } from '../utils/logger';
import cacheService from './cache-service';

export interface UserProfile {
  id: number;
  firebaseUid: string;
  email: string;
  name: string;
  role: string | null;
  subscriptionPlan: string | null;
  isApproved: boolean | null;
  isAdmin: boolean | null;
  status: string | null;
  createdAt: Date | null;
  updatedAt: Date | null;
}

export interface UpdateProfileData {
  name?: string;
  email?: string;
  company?: string;
}

export interface User {
  id: number;
  email: string;
  name: string;
  company?: string | null;
  phone?: string | null;
  role: string | null;
  subscriptionPlan: string | null;
  isApproved: boolean | null;
  status: string | null;
  createdAt: Date | null;
  isAdmin: boolean | null;
  lastActivity?: Date | null; // Added to match the `getAllUsers` implementation
}

export interface PendingUser {
  id: number;
  name: string;
  email: string;
  company: string;
  whatsapp: string;
  status: string;
  subscriptionPlan: string;
  isApproved: boolean;
  createdAt: Date | null;
  role: string;
}

// ✅ FUNÇÃO CENTRALIZADA E SEGURA - Nossa única "fonte da verdade"
// ⚡ OTIMIZAÇÃO: Adicionado Redis cache para reduzir de 177ms para ~20ms
export async function findUserByFirebaseUid(uid: string): Promise<UserProfile | null> {
  if (!uid) return null;

  const cacheKey = `user:firebase:${uid}`;

  try {
    // ⚡ CACHE HIT: Tenta buscar do Redis primeiro
    const cachedUser = await cacheService.get<UserProfile>(cacheKey);
    if (cachedUser) {
      console.log(`⚡ [UserService] Cache HIT for user: ${cachedUser.email}`);
      return cachedUser;
    }

    console.log(`🔍 [UserService] Cache MISS - Looking up user by Firebase UID: ${uid.substring(0, 10)}...`);

    // ✅ CONSULTA SEGURA - usando apenas colunas que sabemos que existem
    const [user] = await db
      .select({
        id: users.id,
        firebaseUid: users.firebaseUid,
        email: users.email,
        name: users.name,
        role: users.role,
        subscriptionPlan: users.subscriptionPlan,
        isApproved: users.isApproved,
        status: users.status,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
        isAdmin: users.isAdmin
      })
      .from(users)
      .where(eq(users.firebaseUid, uid))
      .limit(1);

    if (user) {
      console.log(`✅ [UserService] User found: ${user.email} (Role: ${user.role}, Status: ${user.status})`);
      
      // ⚡ CACHE SET: Armazenar no Redis por 30 minutos (1800s)
      await cacheService.set(cacheKey, user, 1800);
      
      return user;
    } else {
      console.log(`❌ [UserService] No user found for UID: ${uid.substring(0, 10)}...`);
      return null;
    }
  } catch (error) {
    console.error(`❌ [UserService] Error finding user by Firebase UID:`, error);
    logger.error('Find user by Firebase UID error:', error);
    throw error;
  }
}

// ✅ FUNÇÃO AUXILIAR PARA BUSCAR POR EMAIL (para casos específicos)
export async function findUserByEmail(email: string): Promise<UserProfile | null> {
  if (!email) return null;

  try {
    console.log(`🔍 [UserService] Looking up user by email: ${email}`);

    const [user] = await db
      .select({
        id: users.id,
        firebaseUid: users.firebaseUid,
        email: users.email,
        name: users.name,
        role: users.role,
        subscriptionPlan: users.subscriptionPlan,
        isApproved: users.isApproved,
        status: users.status,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
        isAdmin: users.isAdmin
      })
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    return user || null;
  } catch (error) {
    console.error(`❌ [UserService] Error finding user by email:`, error);
    logger.error('Find user by email error:', error);
    throw error;
  }
}

// ✅ FUNÇÃO PARA VERIFICAR SE USUÁRIO PODE FAZER LOGIN
export function canUserLogin(user: UserProfile): { canLogin: boolean; reason?: string } {
  if (!user.isApproved && user.role !== 'admin' && user.role !== 'superadmin') {
    return { canLogin: false, reason: 'PENDING_APPROVAL' };
  }

  if (user.status && user.status !== 'active' && user.status !== 'approved' && user.role !== 'admin' && user.role !== 'superadmin') {
    return { canLogin: false, reason: 'ACCOUNT_INACTIVE' };
  }

  return { canLogin: true };
}

class UserService {
  async getProfile(firebaseUid: string): Promise<UserProfile | null> {
    return findUserByFirebaseUid(firebaseUid);
  }

  async updateProfile(firebaseUid: string, data: UpdateProfileData): Promise<UserProfile> {
    try {
      console.log(`🔄 Updating profile for user: ${firebaseUid}`);
      console.log('🔄 Update data:', data);

      // Verificar conectividade com banco antes de continuar
      try {
        await db.select().from(users).limit(1);
        console.log('✅ Database connection verified');
      } catch (dbError) {
        console.error('❌ Database connection failed:', dbError);
        throw new Error('Falha na conectividade com o banco de dados');
      }

      // Verificar se o usuário existe primeiro
      const existingUser = await findUserByFirebaseUid(firebaseUid);
      if (!existingUser) {
        throw new Error(`Usuário não encontrado: ${firebaseUid}`);
      }

      const [updatedUser] = await db
        .update(users)
        .set({
          name: data.name,
          email: data.email,
          company: data.company,
          updatedAt: new Date()
        })
        .where(eq(users.firebaseUid, firebaseUid))
        .returning({
          id: users.id,
          firebaseUid: users.firebaseUid,
          email: users.email,
          name: users.name,
          role: users.role,
          subscriptionPlan: users.subscriptionPlan,
          isApproved: users.isApproved,
          isAdmin: users.isAdmin,
          status: users.status,
          createdAt: users.createdAt,
          updatedAt: users.updatedAt
        });

      if (!updatedUser) {
        throw new Error('Falha ao atualizar usuário - nenhum registro foi atualizado');
      }

      // ⚡ INVALIDAR CACHE após atualização
      await cacheService.del(`user:firebase:${firebaseUid}`);

      console.log(`✅ Profile updated successfully for: ${updatedUser.email}`);
      return updatedUser;
    } catch (error: any) {
      console.error('❌ Update profile error:', error);
      logger.error('Update profile error:', error);
      throw new Error(`Erro ao atualizar perfil: ${error.message}`);
    }
  }

  async getAllUsers(): Promise<{ success: boolean; users: User[]; total: number }> {
    try {
      console.log('🔍 UserService: Fetching all users...');

      const allUsers = await db.select().from(users).orderBy(desc(users.createdAt));

      console.log(`✅ UserService: Found ${allUsers.length} users`);

      const usersWithStatus = allUsers.map(user => ({
        ...user,
        isOnline: this.isUserOnline(user.lastActivity),
        // Ensure all required fields are present
        role: user.role || 'user',
        subscriptionPlan: user.subscriptionPlan || 'free',
        status: user.status || 'approved',
        isApproved: user.isApproved ?? true,
        isAdmin: user.isAdmin ?? false
      }));

      return {
        success: true,
        users: usersWithStatus,
        total: usersWithStatus.length
      };
    } catch (error) {
      console.error('❌ UserService error fetching all users:', error);
      logger.error('Error fetching all users:', error);
      throw new Error('Não foi possível carregar os usuários');
    }
  }

  async getPendingUsers(): Promise<User[]> {
    try {
      console.log('🔍 UserService: Fetching pending users...');

      const pendingUsers = await db.select()
        .from(users)
        .where(eq(users.isApproved, false))
        .orderBy(desc(users.createdAt));

      console.log(`✅ UserService: Found ${pendingUsers.length} pending users`);

      return pendingUsers.map(user => ({
        ...user,
        // Ensure consistent data structure
        role: user.role || 'user',
        subscriptionPlan: user.subscriptionPlan || 'free',
        status: user.status || 'pending'
      }));
    } catch (error) {
      console.error('❌ UserService error fetching pending users:', error);
      logger.error('Error fetching pending users:', error);
      throw new Error('Não foi possível carregar usuários pendentes');
    }
  }

  async approveUser(userId: number, adminId?: number, userType: 'pro' | 'tester' = 'pro'): Promise<User> {
    try {
      console.log(`🔄 Approving user ${userId} as ${userType.toUpperCase()}...`);

      // Buscar o usuário primeiro
      const [existingUser] = await db
        .select()
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

      if (!existingUser) {
        throw new Error('Usuário não encontrado');
      }

      if (existingUser.isApproved) {
        console.log(`⚠️ User ${userId} is already approved`);
        return existingUser;
      }

      let updateData: any = {
        isApproved: true,
        status: 'approved',
        isSubscriptionActive: true,
        approvedAt: new Date(),
        approvedBy: adminId || null,
        updatedAt: new Date()
      };

      if (userType === 'tester') {
        // Configurar como Tester com período de 7 dias
        const testerStartDate = new Date();
        const testerExpiryDate = new Date();
        testerExpiryDate.setDate(testerStartDate.getDate() + 7);

        updateData = {
          ...updateData,
          subscriptionPlan: 'tester',
          role: 'tester',
          testerStartedAt: testerStartDate,
          testerExpiresAt: testerExpiryDate,
          isTesterExpired: false
        };
      } else {
        // Configurar como PRO (padrão)
        updateData = {
          ...updateData,
          subscriptionPlan: 'pro',
          role: 'pro'
        };
      }

      // Aprovar usuário
      const [updatedUser] = await db
        .update(users)
        .set(updateData)
        .where(eq(users.id, userId))
        .returning({
          id: users.id,
          email: users.email,
          name: users.name,
          company: users.company,
          phone: users.phone,
          role: users.role,
          subscriptionPlan: users.subscriptionPlan,
          isApproved: users.isApproved,
          isAdmin: users.isAdmin,
          status: users.status,
          createdAt: users.createdAt,
          updatedAt: users.updatedAt
        });

      // Log da aprovação para auditoria
      if (adminId) {
        await db.insert(adminActionLogs).values({
          adminId: adminId,
          action: 'user_approval',
          targetUserId: userId,
          details: `Approved user ${existingUser.email} as ${userType.toUpperCase()}${userType === 'tester' ? ' with 7-day trial period' : ''}`,
          ipAddress: '',
          userAgent: '',
        });
      }

      logger.info(`User ${userId} (${existingUser.email}) approved as ${userType.toUpperCase()}${userType === 'tester' ? ` - Expires: ${updateData.testerExpiresAt}` : ''}`);
      console.log(`✅ User approved successfully: ${updatedUser.email} - Plan: ${updatedUser.subscriptionPlan} - Type: ${userType.toUpperCase()}`);

      // ⚡ INVALIDAR CACHE após aprovação
      if (existingUser.firebaseUid) {
        await cacheService.del(`user:firebase:${existingUser.firebaseUid}`);
        console.log(`🗑️ Cache invalidated for user: ${existingUser.email}`);
      }

      return updatedUser;
    } catch (error) {
      logger.error('Error approving user:', error);
      throw error;
    }
  }

  async rejectUser(userId: number, reason?: string): Promise<User> {
    try {
      console.log(`🔄 Rejecting user ${userId}...`);

      // Buscar o usuário primeiro para pegar o Firebase UID
      const [existingUser] = await db
        .select()
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

      const [rejectedUser] = await db
        .update(users)
        .set({
          isApproved: false,
          status: 'rejected',
          rejectionReason: reason || 'Rejected by administrator',
          updatedAt: new Date()
        })
        .where(eq(users.id, userId))
        .returning({
          id: users.id,
          email: users.email,
          name: users.name,
          company: users.company,
          phone: users.phone,
          role: users.role,
          subscriptionPlan: users.subscriptionPlan,
          isApproved: users.isApproved,
          status: users.status,
          createdAt: users.createdAt,
          isAdmin: users.isAdmin
        });

      if (!rejectedUser) {
        throw new Error(`User ${userId} not found`);
      }

      logger.info(`User ${userId} (${rejectedUser.email}) rejected successfully`);

      // ⚡ INVALIDAR CACHE após rejeição
      if (existingUser?.firebaseUid) {
        await cacheService.del(`user:firebase:${existingUser.firebaseUid}`);
        console.log(`🗑️ Cache invalidated for user: ${rejectedUser.email}`);
      }

      return rejectedUser;
    } catch (error) {
      logger.error(`Error rejecting user ${userId}:`, error);
      throw error;
    }
  }

  async markUserPaymentPending(userId: number, adminId?: number): Promise<User> {
    try {
      console.log(`⏳ Marking user ${userId} as payment pending...`);

      // Buscar o usuário primeiro
      const [existingUser] = await db
        .select()
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

      if (!existingUser) {
        throw new Error('Usuário não encontrado');
      }

      // Verificar se é um usuário PRO
      if (existingUser.subscriptionPlan !== 'pro') {
        throw new Error('Apenas usuários PRO podem ser marcados como pagamento pendente');
      }

      // Atualizar para pro_pending - CORRIGIR TODOS OS CAMPOS
      const [updatedUser] = await db
        .update(users)
        .set({
          subscriptionPlan: 'pro_pending',
          status: 'pending_payment',
          role: 'pending_payment',  // 🔧 ADICIONAR: Marcar role também
          updatedAt: new Date()
        })
        .where(eq(users.id, userId))
        .returning({
          id: users.id,
          email: users.email,
          name: users.name,
          company: users.company,
          phone: users.phone,
          role: users.role,
          subscriptionPlan: users.subscriptionPlan,
          isApproved: users.isApproved,
          status: users.status,
          createdAt: users.createdAt,
          isAdmin: users.isAdmin
        });

      // Log da ação para auditoria
      if (adminId) {
        await db.insert(adminActionLogs).values({
          adminId: adminId,
          action: 'mark_payment_pending',
          targetUserId: userId,
          details: `Marked user ${existingUser.email} as payment pending`,
          ipAddress: '',
          userAgent: '',
        });
      }

      logger.info(`User ${userId} (${existingUser.email}) marked as payment pending`);
      console.log(`✅ User marked as payment pending: ${updatedUser.email}`);

      // ⚡ INVALIDAR CACHE após mudança de status
      if (existingUser.firebaseUid) {
        await cacheService.del(`user:firebase:${existingUser.firebaseUid}`);
        console.log(`🗑️ Cache invalidated for user: ${updatedUser.email}`);
      }

      return updatedUser;
    } catch (error) {
      logger.error('Error marking user payment as pending:', error);
      throw error;
    }
  }

  async restoreUserFromPending(userId: number, adminId?: number): Promise<User> {
    try {
      console.log(`✅ Restoring user ${userId} from payment pending...`);

      // Buscar o usuário primeiro
      const [existingUser] = await db
        .select()
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

      if (!existingUser) {
        throw new Error('Usuário não encontrado');
      }

      // Verificar se está pendente (verificar qualquer campo de pending)
      const isPendingPayment = existingUser.subscriptionPlan === 'pro_pending' || 
                              existingUser.status === 'pending_payment' || 
                              existingUser.role === 'pending_payment';

      if (!isPendingPayment) {
        throw new Error('Usuário não está com pagamento pendente');
      }

      // Restaurar para PRO - LIMPAR TODOS OS CAMPOS DE PENDING
      const [updatedUser] = await db
        .update(users)
        .set({
          subscriptionPlan: 'pro',
          status: 'approved',
          role: 'pro',  // 🔧 CORRIGIR: Restaurar role para pro
          updatedAt: new Date()
        })
        .where(eq(users.id, userId))
        .returning({
          id: users.id,
          email: users.email,
          name: users.name,
          company: users.company,
          phone: users.phone,
          role: users.role,
          subscriptionPlan: users.subscriptionPlan,
          isApproved: users.isApproved,
          status: users.status,
          createdAt: users.createdAt,
          isAdmin: users.isAdmin
        });

      // Log da ação para auditoria
      if (adminId) {
        await db.insert(adminActionLogs).values({
          adminId: adminId,
          action: 'restore_from_pending',
          targetUserId: userId,
          details: `Restored user ${existingUser.email} from payment pending to PRO`,
          ipAddress: '',
          userAgent: '',
        });
      }

      logger.info(`User ${userId} (${existingUser.email}) restored from payment pending to PRO`);
      console.log(`✅ User restored to PRO: ${updatedUser.email}`);

      // ⚡ INVALIDAR CACHE após restauração
      if (existingUser.firebaseUid) {
        await cacheService.del(`user:firebase:${existingUser.firebaseUid}`);
        console.log(`🗑️ Cache invalidated for user: ${updatedUser.email}`);
      }

      return updatedUser;
    } catch (error) {
      logger.error('Error restoring user from pending:', error);
      throw error;
    }
  }

  // Helper method to determine user online status
  isUserOnline(lastActivity: Date | null | undefined): boolean {
    if (!lastActivity) {
      return false;
    }
    const now = new Date();
    const diffInMinutes = (now.getTime() - lastActivity.getTime()) / (1000 * 60);
    return diffInMinutes < 5; // Consider user online if active in the last 5 minutes
  }
}

export const userService = new UserService();