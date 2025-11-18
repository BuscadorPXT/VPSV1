import postgres from 'postgres';

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL not found in environment');
  process.exit(1);
}

const sql = postgres(DATABASE_URL);

async function checkOnlineUsers() {
  try {
    const result = await sql`
      SELECT COUNT(*) as count
      FROM user_sessions
      WHERE is_active = true
        AND expires_at > NOW()
        AND "lastActivity" > NOW() - INTERVAL '30 minutes'
    `;

    console.log('📊 Online Users Count:', result[0].count);

    // Mostrar alguns usuários online como exemplo
    const users = await sql`
      SELECT u.email, us."lastActivity", us.ip_address
      FROM user_sessions us
      JOIN users u ON u.id = us."userId"
      WHERE us.is_active = true
        AND us.expires_at > NOW()
        AND us."lastActivity" > NOW() - INTERVAL '30 minutes'
      ORDER BY us."lastActivity" DESC
      LIMIT 15
    `;

    console.log(`\n📋 Sample Online Users (showing ${users.length}):`);
    users.forEach((user, i) => {
      const lastActivityDate = new Date(user.lastActivity);
      const minutesAgo = Math.round((new Date() - lastActivityDate) / 60000);
      console.log(`${i + 1}. ${user.email} - ${minutesAgo}min ago`);
    });

    await sql.end();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    await sql.end();
    process.exit(1);
  }
}

checkOnlineUsers();
