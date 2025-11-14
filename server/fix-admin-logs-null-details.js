
const { db } = require('./db.ts');
const { adminActionLogs } = require('../shared/schema');
const { sql } = require('drizzle-orm');

async function fixAdminLogsNullDetails() {
  console.log('🔧 Starting admin logs null details fix...');
  
  try {
    // Update null details to empty string
    const result = await db.execute(sql`
      UPDATE admin_action_logs 
      SET details = COALESCE(details, ''), 
          reason = COALESCE(reason, '')
      WHERE details IS NULL OR reason IS NULL
    `);
    
    console.log(`✅ Fixed ${result.rowCount || 0} admin log records with null details/reason`);
    
    // Check remaining records
    const remaining = await db.execute(sql`
      SELECT COUNT(*) as count 
      FROM admin_action_logs 
      WHERE details IS NULL OR reason IS NULL
    `);
    
    console.log(`📊 Remaining null records: ${remaining.rows[0]?.count || 0}`);
    
    // Show recent logs sample
    const sampleLogs = await db.select({
      id: adminActionLogs.id,
      action: adminActionLogs.action,
      details: adminActionLogs.details,
      reason: adminActionLogs.reason,
      createdAt: adminActionLogs.createdAt
    })
    .from(adminActionLogs)
    .orderBy(sql`${adminActionLogs.createdAt} DESC`)
    .limit(5);
    
    console.log('📋 Sample of recent logs:');
    sampleLogs.forEach((log, index) => {
      console.log(`  ${index + 1}. ID: ${log.id}, Action: ${log.action || 'null'}, Details: ${log.details || 'empty'}, Reason: ${log.reason || 'empty'}`);
    });
    
    console.log('✅ Admin logs fix completed successfully');
    
  } catch (error) {
    console.error('❌ Error fixing admin logs:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack
    });
  }
}

// Run the fix
fixAdminLogsNullDetails().then(() => {
  console.log('🎯 Fix script completed');
  process.exit(0);
}).catch(error => {
  console.error('💥 Fix script failed:', error);
  process.exit(1);
});
