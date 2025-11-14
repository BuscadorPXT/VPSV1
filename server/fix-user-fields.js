
const { db } = require('./db');
const fs = require('fs');
const path = require('path');

async function fixUserFields() {
  try {
    console.log('🔧 Executando correção de campos da tabela users...');
    
    // Ler o arquivo SQL
    const sqlPath = path.join(__dirname, 'add-missing-user-fields.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    // Executar o SQL
    await db.execute(sql);
    
    console.log('✅ Campos da tabela users corrigidos com sucesso!');
    
    // Verificar usuários pendentes
    const pendingUsers = await db.execute(`
      SELECT id, email, name, company, whatsapp, phone, status, "isApproved", role
      FROM users 
      WHERE "isApproved" = false AND ("isAdmin" = false OR "isAdmin" IS NULL)
      ORDER BY "createdAt" DESC
    `);
    
    console.log(`📊 Usuários pendentes encontrados: ${pendingUsers.length}`);
    
    if (pendingUsers.length > 0) {
      console.log('\n📋 Lista de usuários pendentes:');
      pendingUsers.forEach((user, index) => {
        console.log(`${index + 1}. ${user.email}`);
        console.log(`   Nome: ${user.name || 'N/A'}`);
        console.log(`   Empresa: ${user.company || 'N/A'}`);
        console.log(`   WhatsApp: ${user.whatsapp || 'N/A'}`);
        console.log(`   Status: ${user.status || 'N/A'}`);
        console.log(`   Role: ${user.role || 'N/A'}`);
        console.log(`   ---`);
      });
    }
    
  } catch (error) {
    console.error('❌ Erro ao corrigir campos:', error);
  } finally {
    process.exit(0);
  }
}

fixUserFields();
