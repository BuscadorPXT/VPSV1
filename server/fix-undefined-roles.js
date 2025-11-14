
const { db } = require('./db');
const { users } = require('../shared/schema');
const { eq, isNull, or } = require('drizzle-orm');

async function fixUndefinedRoles() {
  console.log('🔧 Fixing users with undefined roles...');
  
  try {
    // Find users with undefined or null roles
    const usersWithBadRoles = await db
      .select()
      .from(users)
      .where(or(
        isNull(users.role),
        eq(users.role, '')
      ));

    console.log(`Found ${usersWithBadRoles.length} users with undefined/null roles`);

    for (const user of usersWithBadRoles) {
      const fixedRole = user.isAdmin ? 'admin' : 'user';
      
      await db
        .update(users)
        .set({ 
          role: fixedRole,
          updatedAt: new Date()
        })
        .where(eq(users.id, user.id));
      
      console.log(`✅ Fixed role for user ${user.email}: ${user.role} -> ${fixedRole}`);
    }

    console.log('🎉 All undefined roles have been fixed!');
  } catch (error) {
    console.error('❌ Error fixing undefined roles:', error);
  }
}

if (require.main === module) {
  fixUndefinedRoles().then(() => {
    console.log('✅ Script completed');
    process.exit(0);
  });
}

module.exports = { fixUndefinedRoles };
