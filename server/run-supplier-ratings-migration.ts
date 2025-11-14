
import { promises as fs } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { db } from './db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function runSupplierRatingsMigration() {
  console.log('🔄 Executando migração do sistema de avaliações de fornecedores...');

  try {
    // Ler o arquivo SQL da migração
    const migrationPath = join(__dirname, 'migrations', 'add-supplier-ratings.sql');
    const migrationSQL = await fs.readFile(migrationPath, 'utf8');

    // Executar a migração
    await db.execute(migrationSQL);

    console.log('✅ Migração do sistema de avaliações executada com sucesso!');
    
    // Verificar se as tabelas foram criadas
    const checkResult = await db.execute(`
      SELECT table_name, column_name, data_type
      FROM information_schema.columns 
      WHERE table_name IN ('supplier_ratings', 'suppliers')
      AND column_name IN ('average_rating', 'rating_count', 'rating', 'comment')
      ORDER BY table_name, column_name;
    `);

    console.log('📊 Verificação das tabelas:');
    checkResult.forEach((row: any) => {
      console.log(`   ${row.table_name}.${row.column_name}: ${row.data_type}`);
    });

    // Verificar se os triggers estão funcionando
    const triggerCheck = await db.execute(`
      SELECT trigger_name, event_manipulation, event_object_table
      FROM information_schema.triggers
      WHERE trigger_name = 'supplier_rating_aggregates_trigger';
    `);

    if (triggerCheck.length > 0) {
      console.log('✅ Trigger de atualização automática criado com sucesso!');
    } else {
      console.log('⚠️ Trigger não encontrado - verificar migração');
    }

  } catch (error) {
    console.error('❌ Erro durante a migração:', error);
    throw error;
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runSupplierRatingsMigration()
    .then(() => {
      console.log('🎉 Migração concluída!');
      process.exit(0);
    })
    .catch(error => {
      console.error('💥 Falha na migração:', error);
      process.exit(1);
    });
}

export { runSupplierRatingsMigration };
