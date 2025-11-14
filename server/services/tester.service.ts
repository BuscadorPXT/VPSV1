import { db } from '../db';
import { users } from '../../shared/schema';
import { eq, and, lt } from 'drizzle-orm';
import { logger } from '../utils/logger';

export class TesterService {
  /**
   * Aprova um usuário como Tester com período de 7 dias
   */
  async approveUserAsTester(userId: number, adminId?: number) {
    try {
      console.log(`🔄 Approving user ${userId} as Tester with 7-day trial period...`);

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

      // Calcular data de expiração (7 dias a partir de agora)
      const testerStartDate = new Date();
      const testerExpiryDate = new Date();
      testerExpiryDate.setDate(testerStartDate.getDate() + 7);

      // Aprovar como Tester
      const [updatedUser] = await db
        .update(users)
        .set({
          isApproved: true,
          status: 'approved',
          subscriptionPlan: 'tester',
          role: 'tester',
          isSubscriptionActive: true,
          testerStartedAt: testerStartDate,
          testerExpiresAt: testerExpiryDate,
          isTesterExpired: false,
          approvedAt: new Date(),
          approvedBy: adminId || null,
          updatedAt: new Date()
        })
        .where(eq(users.id, userId))
        .returning();

      logger.info(`User ${userId} (${existingUser.email}) approved as Tester. Expires at: ${testerExpiryDate}`);
      console.log(`✅ User approved as Tester: ${updatedUser.email} - Expires: ${testerExpiryDate.toISOString()}`);

      return updatedUser;
    } catch (error) {
      logger.error('Error approving user as Tester:', error);
      throw error;
    }
  }

  /**
   * Verifica se um usuário tem acesso aos links do WhatsApp
   * RETORNA FALSE apenas para usuários Tester (links bloqueados)
   * RETORNA TRUE para todos os outros usuários (Pro, Admin, SuperAdmin)
   */
  async isTesterActive(userId: number): Promise<boolean> {
    try {
      const [user] = await db
        .select({
          role: users.role,
          subscriptionPlan: users.subscriptionPlan,
          testerExpiresAt: users.testerExpiresAt,
          isTesterExpired: users.isTesterExpired
        })
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

      if (!user) {
        return true; // Se não encontrar usuário, libera acesso
      }

      // 🚨 LÓGICA CORRIGIDA: Se é Tester, SEMPRE bloquear primeiro
      const isTesterUser = user.role === 'tester' || user.subscriptionPlan === 'tester';

      if (isTesterUser) {
        console.log(`🚫 TESTER USER DETECTED ${userId} - WhatsApp links BLOCKED (Role: ${user.role}, Plan: ${user.subscriptionPlan})`);
        
        // Verificar se expirou
        if (user.isTesterExpired) {
          console.log(`🚫 Tester ${userId} is expired - links BLOCKED`);
          return false;
        }

        // Verificar se ainda está dentro do prazo
        if (user.testerExpiresAt && new Date() > new Date(user.testerExpiresAt)) {
          console.log(`🚫 Tester ${userId} period expired - marking as expired`);
          await this.markTesterAsExpired(userId);
          return false;
        }

        // TESTER SEMPRE TEM ACESSO BLOQUEADO
        console.log(`🚫 Tester ${userId} - WhatsApp links BLOCKED`);
        return false;
      }

      // ✅ USUÁRIOS NÃO-TESTER: Verificar se têm acesso premium
      if (['pro', 'business', 'admin'].includes(user.subscriptionPlan?.toLowerCase() || '')) {
        console.log(`✅ Premium user ${userId} - WhatsApp links ALLOWED (Plan: ${user.subscriptionPlan})`);
        return true;
      }

      if (['admin', 'superadmin'].includes(user.role?.toLowerCase() || '')) {
        console.log(`✅ Admin user ${userId} - WhatsApp links ALLOWED (Role: ${user.role})`);
        return true;
      }

      // ✅ USUÁRIOS REGULARES (não-tester) - Acesso liberado
      console.log(`✅ Regular user ${userId} - WhatsApp links ALLOWED (Role: ${user.role}, Plan: ${user.subscriptionPlan})`);
      return true;

    } catch (error) {
      logger.error('Error checking tester status:', error);
      return true; // Em caso de erro, libera acesso para não bloquear usuários válidos
    }
  }

  /**
   * Verifica se um usuário É do tipo Tester
   * RETORNA TRUE apenas para usuários Tester
   * RETORNA FALSE para todos os outros tipos
   */
  async isUserTester(userId: number): Promise<boolean> {
    try {
      const [user] = await db
        .select({
          role: users.role,
          subscriptionPlan: users.subscriptionPlan
        })
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

      if (!user) {
        return false;
      }

      // Verifica se é Tester
      return user.role === 'tester' || user.subscriptionPlan === 'tester';
    } catch (error) {
      logger.error('Error checking if user is tester:', error);
      return false;
    }
  }

  /**
   * Calcula quantos dias restam para o usuário Tester
   */
  async getTesterDaysRemaining(userId: number): Promise<number> {
    try {
      const [user] = await db
        .select({
          role: users.role,
          subscriptionPlan: users.subscriptionPlan,
          testerExpiresAt: users.testerExpiresAt,
          isTesterExpired: users.isTesterExpired
        })
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

      if (!user || (user.role !== 'tester' && user.subscriptionPlan !== 'tester')) {
        return -1; // Não é tester
      }

      if (user.isTesterExpired || !user.testerExpiresAt) {
        return 0; // Já expirou
      }

      const now = new Date();
      const expiryDate = new Date(user.testerExpiresAt);
      const diffTime = expiryDate.getTime() - now.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      return Math.max(0, diffDays);
    } catch (error) {
      logger.error('Error calculating tester days remaining:', error);
      return 0;
    }
  }

  /**
   * Marca um usuário Tester como expirado
   */
  async markTesterAsExpired(userId: number) {
    try {
      await db
        .update(users)
        .set({
          isTesterExpired: true,
          isSubscriptionActive: false,
          updatedAt: new Date()
        })
        .where(eq(users.id, userId));

      logger.info(`Tester user ${userId} marked as expired`);
    } catch (error) {
      logger.error('Error marking tester as expired:', error);
    }
  }

  /**
   * Busca todos os usuários Tester que expiraram
   */
  async findExpiredTesters() {
    try {
      const expiredTesters = await db
        .select()
        .from(users)
        .where(
          and(
            eq(users.role, 'tester'),
            lt(users.testerExpiresAt, new Date()),
            eq(users.isTesterExpired, false)
          )
        );

      return expiredTesters;
    } catch (error) {
      logger.error('Error finding expired testers:', error);
      return [];
    }
  }

  /**
   * Processa todos os usuários Tester expirados
   */
  async processExpiredTesters() {
    try {
      const expiredTesters = await this.findExpiredTesters();
      
      for (const tester of expiredTesters) {
        await this.markTesterAsExpired(tester.id);
        console.log(`⏰ Tester ${tester.email} (ID: ${tester.id}) marked as expired`);
      }

      logger.info(`Processed ${expiredTesters.length} expired testers`);
      return expiredTesters.length;
    } catch (error) {
      logger.error('Error processing expired testers:', error);
      return 0;
    }
  }

  /**
   * Busca usuários Tester que estão próximos ao vencimento
   */
  async findExpiringTesters(daysBeforeExpiry: number = 2) {
    try {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + daysBeforeExpiry);
      
      const expiringTesters = await db
        .select()
        .from(users)
        .where(
          and(
            eq(users.role, 'tester'),
            lt(users.testerExpiresAt, futureDate),
            eq(users.isTesterExpired, false)
          )
        );

      return expiringTesters;
    } catch (error) {
      logger.error('Error finding expiring testers:', error);
      return [];
    }
  }
}

export const testerService = new TesterService();