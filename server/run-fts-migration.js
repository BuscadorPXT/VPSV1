
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

async function runFTSMigration() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    console.log('🔄 Iniciando migração Full-Text Search...');

    // Ler arquivo de migração
    const migrationPath = path.join(__dirname, 'migrations', 'add-full-text-search.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    // Executar migração
    await pool.query(migrationSQL);

    console.log('✅ Migração Full-Text Search executada com sucesso!');
    
    // Verificar se a migração funcionou
    const result = await pool.query(`
      SELECT COUNT(*) as total_products,
             COUNT(search_vector) as products_with_fts
      FROM products;
    `);

    console.log('📊 Verificação da migração:');
    console.log(`   Total de produtos: ${result.rows[0].total_products}`);
    console.log(`   Produtos com FTS: ${result.rows[0].products_with_fts}`);

    // Testar uma busca FTS
    const testResult = await pool.query(`
      SELECT model, ts_rank(search_vector, to_tsquery('portuguese', 'iphone:*')) as rank
      FROM products 
      WHERE search_vector @@ to_tsquery('portuguese', 'iphone:*')
      ORDER BY rank DESC
      LIMIT 5;
    `);

    console.log('🧪 Teste de busca FTS (iphone):');
    testResult.rows.forEach((row, index) => {
      console.log(`   ${index + 1}. ${row.model} (rank: ${row.rank})`);
    });

  } catch (error) {
    console.error('❌ Erro na migração FTS:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  runFTSMigration()
    .then(() => {
      console.log('🎉 Migração concluída!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Falha na migração:', error);
      process.exit(1);
    });
}

module.exports = { runFTSMigration };
