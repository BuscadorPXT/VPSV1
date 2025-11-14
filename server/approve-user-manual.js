
import { db } from './db.ts';
import { users, userSessions, adminActionLogs } from '../shared/schema.ts';
import { eq } from 'drizzle-orm';

async function approveUserManually() {
  try {
    console.log('🔍 Procurando usuário ramon.asp@hotmail.com...');
    
    // Buscar o usuário
    const userResult = await db
      .select()
      .from(users)
      .where(eq(users.email, 'ramon.asp@hotmail.com'))
      .limit(1);

    if (userResult.length === 0) {
      console.log('❌ Usuário ramon.asp@hotmail.com não encontrado no sistema');
      return;
    }

    const user = userResult[0];
    console.log('👤 Usuário encontrado:', {
      id: user.id,
      email: user.email,
      name: user.name,
      isApproved: user.isApproved,
      status: user.status,
      subscriptionPlan: user.subscriptionPlan,
      role: user.role
    });

    if (user.isApproved) {
      console.log('✅ Usuário já está aprovado!');
      return;
    }

    // Aprovar o usuário e promover para PRO
    console.log('🔄 Aprovando usuário e promovendo para PRO...');
    
    const [approvedUser] = await db
      .update(users)
      .set({
        isApproved: true,
        status: 'approved',
        subscriptionPlan: 'pro',
        role: 'pro',
        isSubscriptionActive: true,
        approvedAt: new Date(),
        approvedBy: 1, // Admin manual
        updatedAt: new Date()
      })
      .where(eq(users.id, user.id))
      .returning();

    // Invalidar sessões existentes para forçar nova autenticação
    await db.update(userSessions)
      .set({ isActive: false })
      .where(eq(userSessions.userId, user.id));

    // Log da aprovação
    await db.insert(adminActionLogs).values({
      adminId: 1,
      action: 'user_approval',
      targetUserId: user.id,
      details: `Manual approval via script for user ${user.email} - promoted to PRO plan`,
      ipAddress: '127.0.0.1',
      userAgent: 'Manual Script'
    });

    console.log('✅ Usuário aprovado com sucesso!');
    console.log('📋 Dados atualizados:', {
      id: approvedUser.id,
      email: approvedUser.email,
      isApproved: approvedUser.isApproved,
      status: approvedUser.status,
      subscriptionPlan: approvedUser.subscriptionPlan,
      role: approvedUser.role,
      isSubscriptionActive: approvedUser.isSubscriptionActive,
      approvedAt: approvedUser.approvedAt
    });

    console.log('🎉 O usuário agora pode acessar o sistema com privilégios PRO!');

  } catch (error) {
    console.error('❌ Erro ao aprovar usuário:', error);
  }
}

// Executar a aprovação
approveUserManually().then(() => {
  console.log('Script finalizado');
  process.exit(0);
}).catch(error => {
  console.error('Erro fatal:', error);
  process.exit(1);
});
