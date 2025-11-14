
const { db } = require('./db.ts');
const { 
  users, 
  subscriptionManagement, 
  adminActionLogs, 
  userNotes,
  subscriptionHistory,
  whatsappClicks,
  priceAlerts,
  notificationHistory,
  userSessions
} = require('../shared/schema.ts');
const { eq } = require('drizzle-orm');

async function deleteUserSafely(userId) {
  try {
    console.log(`🗑️ Iniciando exclusão segura do usuário ${userId}...`);
    
    // Usar transação para garantir consistência
    await db.transaction(async (tx) => {
      // Verificar se o usuário existe
      const userCheck = await tx.select().from(users).where(eq(users.id, userId)).limit(1);
      if (!userCheck.length) {
        throw new Error(`Usuário ${userId} não encontrado`);
      }

      console.log(`✅ Usuário ${userId} encontrado. Nome: ${userCheck[0].name}`);

      // 1. Deletar notification_history
      const deletedNotifications = await tx.delete(notificationHistory).where(eq(notificationHistory.userId, userId));
      console.log(`🗑️ Deletado notification_history: ${deletedNotifications.changes || 0} registros`);

      // 2. Deletar price_alerts  
      const deletedAlerts = await tx.delete(priceAlerts).where(eq(priceAlerts.userId, userId));
      console.log(`🗑️ Deletado price_alerts: ${deletedAlerts.changes || 0} registros`);

      // 3. Deletar whatsapp_clicks
      const deletedWhatsapp = await tx.delete(whatsappClicks).where(eq(whatsappClicks.userId, userId));
      console.log(`🗑️ Deletado whatsapp_clicks: ${deletedWhatsapp.changes || 0} registros`);

      // 4. Deletar user_sessions
      const deletedSessions = await tx.delete(userSessions).where(eq(userSessions.userId, userId));
      console.log(`🗑️ Deletado user_sessions: ${deletedSessions.changes || 0} registros`);

      // 5. Deletar subscription_history
      const deletedSubHistory = await tx.delete(subscriptionHistory).where(eq(subscriptionHistory.userId, userId));
      console.log(`🗑️ Deletado subscription_history: ${deletedSubHistory.changes || 0} registros`);

      // 6. Deletar user_notes
      const deletedNotes = await tx.delete(userNotes).where(eq(userNotes.userId, userId));
      console.log(`🗑️ Deletado user_notes: ${deletedNotes.changes || 0} registros`);

      // 7. Deletar subscription_management
      const deletedSubManagement = await tx.delete(subscriptionManagement).where(eq(subscriptionManagement.userId, userId));
      console.log(`🗑️ Deletado subscription_management: ${deletedSubManagement.changes || 0} registros`);

      // 8. Deletar admin_action_logs onde o usuário é o target
      const deletedAdminLogs = await tx.delete(adminActionLogs).where(eq(adminActionLogs.targetUserId, userId));
      console.log(`🗑️ Deletado admin_action_logs (target): ${deletedAdminLogs.changes || 0} registros`);

      // 9. Finalmente, deletar o usuário
      const deletedUser = await tx.delete(users).where(eq(users.id, userId));
      console.log(`🗑️ Deletado users: ${deletedUser.changes || 0} registros`);

      console.log(`✅ Usuário ${userId} deletado com sucesso!`);
    });

  } catch (error) {
    console.error('❌ Erro ao deletar usuário:', error);
    throw error;
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  const userId = process.argv[2];
  if (!userId) {
    console.error('❌ Por favor, forneça o ID do usuário: node delete-user-safe.js <USER_ID>');
    process.exit(1);
  }
  
  deleteUserSafely(parseInt(userId))
    .then(() => {
      console.log('✅ Exclusão concluída com sucesso!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Erro na exclusão:', error);
      process.exit(1);
    });
}

module.exports = { deleteUserSafely };
