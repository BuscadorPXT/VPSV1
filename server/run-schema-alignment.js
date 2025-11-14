
const { db } = require('./db.js');
const fs = require('fs');
const path = require('path');

async function alignSchema() {
  console.log('🔧 Iniciando alinhamento do schema...');

  try {
    // Executar script SQL
    const sqlScript = fs.readFileSync(path.join(__dirname, 'fix-schema-alignment.sql'), 'utf8');
    
    await db.execute(sqlScript);
    
    console.log('✅ Schema alinhado com sucesso!');
    
    // Verificar se agora funciona
    console.log('\n🧪 Testando consulta de usuário...');
    const testUser = await db.execute(`
      SELECT id, email, status, is_approved 
      FROM users 
      LIMIT 1
    `);
    
    if (testUser.rows.length > 0) {
      console.log('✅ Consulta de teste bem-sucedida:', testUser.rows[0]);
    }
    
  } catch (error) {
    console.error('❌ Erro durante alinhamento:', error);
    throw error;
  }
}

alignSchema()
  .then(() => {
    console.log('🎉 Alinhamento concluído!');
    process.exit(0);
  })
  .catch(error => {
    console.error('💥 Falha no alinhamento:', error);
    process.exit(1);
  });
