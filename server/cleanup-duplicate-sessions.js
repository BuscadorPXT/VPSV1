
const { db } = require('./db');
const { userSessions } = require('../shared/schema');
const { eq, and, sql } = require('drizzle-orm');

async function cleanupDuplicateSessions() {
  console.log('🧹 Starting cleanup of duplicate sessions before unified rule implementation...');
  
  try {
    // Buscar usuários com múltiplas sessões ativas
    const duplicateUsers = await db
      .select({
        userId: userSessions.userId,
        count: sql`COUNT(*)`
      })
      .from(userSessions)
      .where(
        and(
          eq(userSessions.isActive, true),
          sql`${userSessions.expiresAt} > NOW()`
        )
      )
      .groupBy(userSessions.userId)
      .having(sql`COUNT(*) > 1`);

    console.log(`Found ${duplicateUsers.length} users with multiple active sessions`);

    let totalCleaned = 0;
    let errors = 0;

    for (const duplicate of duplicateUsers) {
      try {
        console.log(`Processing user ${duplicate.userId} with ${duplicate.count} active sessions...`);

        // Buscar todas as sessões ativas deste usuário
        const sessions = await db
          .select()
          .from(userSessions)
          .where(
            and(
              eq(userSessions.userId, duplicate.userId),
              eq(userSessions.isActive, true),
              sql`${userSessions.expiresAt} > NOW()`
            )
          )
          .orderBy(sql`${userSessions.lastActivity} DESC`);

        if (sessions.length > 1) {
          // Manter apenas a mais recente (primeira da lista)
          const sessionsToDeactivate = sessions.slice(1);
          
          console.log(`  - Keeping most recent session: ${sessions[0].sessionToken.substring(0, 10)}...`);
          console.log(`  - Deactivating ${sessionsToDeactivate.length} older sessions`);

          for (const session of sessionsToDeactivate) {
            await db.update(userSessions)
              .set({ 
                isActive: false,
                lastActivity: new Date()
              })
              .where(eq(userSessions.sessionToken, session.sessionToken));
            
            console.log(`  ❌ Deactivated: ${session.sessionToken.substring(0, 10)}...`);
            totalCleaned++;
          }
        }
      } catch (error) {
        console.error(`Error processing user ${duplicate.userId}:`, error);
        errors++;
      }
    }

    console.log(`\n✅ Cleanup completed:`);
    console.log(`  - Users processed: ${duplicateUsers.length}`);
    console.log(`  - Sessions cleaned: ${totalCleaned}`);
    console.log(`  - Errors: ${errors}`);

    // Verificar se ainda existem duplicatas
    const remainingDuplicates = await db
      .select({
        userId: userSessions.userId,
        count: sql`COUNT(*)`
      })
      .from(userSessions)
      .where(
        and(
          eq(userSessions.isActive, true),
          sql`${userSessions.expiresAt} > NOW()`
        )
      )
      .groupBy(userSessions.userId)
      .having(sql`COUNT(*) > 1`);

    if (remainingDuplicates.length === 0) {
      console.log('🎉 All duplicate sessions have been cleaned up!');
    } else {
      console.log(`⚠️  ${remainingDuplicates.length} users still have duplicate sessions`);
    }

  } catch (error) {
    console.error('❌ Error during cleanup:', error);
  }
}

if (require.main === module) {
  cleanupDuplicateSessions().then(() => {
    console.log('✅ Cleanup script completed');
    process.exit(0);
  }).catch(error => {
    console.error('❌ Cleanup script failed:', error);
    process.exit(1);
  });
}

module.exports = { cleanupDuplicateSessions };
