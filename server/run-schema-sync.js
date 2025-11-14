
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

async function runSchemaSyncMigration() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    console.log('🔄 Starting database schema synchronization...');

    // Read the migration file
    const migrationPath = path.join(__dirname, 'sync-database-schema.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    // Execute the migration
    const result = await pool.query(migrationSQL);

    console.log('✅ Database schema synchronization completed successfully!');
    
    // Verify the migration worked by checking for the account_status column
    const checkResult = await pool.query(`
      SELECT column_name, data_type, column_default, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'users' 
      AND column_name IN ('account_status', 'status', 'status_changed_at', 'role_changed_at')
      ORDER BY column_name;
    `);

    console.log('📊 Column verification:');
    checkResult.rows.forEach(row => {
      console.log(`   ${row.column_name}: ${row.data_type} (default: ${row.column_default || 'none'})`);
    });

    // Test a simple query to ensure the columns are accessible
    const testResult = await pool.query(`
      SELECT COUNT(*) as total_users,
             COUNT(CASE WHEN account_status = 'active' THEN 1 END) as active_users,
             COUNT(CASE WHEN status = 'approved' THEN 1 END) as approved_users
      FROM users;
    `);

    console.log('🧪 Test query results:');
    console.log(`   Total users: ${testResult.rows[0].total_users}`);
    console.log(`   Active users: ${testResult.rows[0].active_users}`);
    console.log(`   Approved users: ${testResult.rows[0].approved_users}`);

  } catch (error) {
    console.error('❌ Error during schema synchronization:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

// Execute the migration
runSchemaSyncMigration()
  .then(() => {
    console.log('🎉 Schema synchronization completed successfully!');
    process.exit(0);
  })
  .catch(error => {
    console.error('💥 Schema synchronization failed:', error);
    process.exit(1);
  });
