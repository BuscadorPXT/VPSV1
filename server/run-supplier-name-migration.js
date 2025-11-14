
import { readFileSync } from 'fs';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error('❌ DATABASE_URL not found');
  process.exit(1);
}

const client = postgres(connectionString, { 
  ssl: 'require',
  transform: postgres.camel
});
const db = drizzle(client);

async function runMigration() {
  try {
    console.log('🔄 Executando migração para adicionar supplier_name...');
    
    const migrationSQL = readFileSync('migrations/add-supplier-name-to-ratings.sql', 'utf8');
    await db.execute(migrationSQL);
    
    console.log('✅ Migração executada com sucesso!');
    
    // Verificar se a coluna foi criada
    const result = await db.execute(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'supplier_ratings' 
      AND column_name = 'supplier_name'
    `);
    
    if (result.length > 0) {
      console.log('✅ Coluna supplier_name criada com sucesso!');
      console.log('📋 Detalhes da coluna:', result[0]);
    } else {
      console.log('⚠️ Coluna supplier_name não encontrada');
    }
    
    // Verificar quantos registros foram atualizados
    const countResult = await db.execute(`
      SELECT COUNT(*) as count 
      FROM supplier_ratings 
      WHERE supplier_name IS NOT NULL
    `);
    
    console.log(`📊 Registros com supplier_name preenchido: ${countResult[0]?.count || 0}`);
    
    // Verificar alguns exemplos dos dados
    const sampleResult = await db.execute(`
      SELECT id, supplier_id, supplier_name, rating 
      FROM supplier_ratings 
      WHERE supplier_name IS NOT NULL 
      LIMIT 5
    `);
    
    console.log('🔍 Exemplos de registros atualizados:');
    sampleResult.forEach((record, index) => {
      console.log(`   ${index + 1}. ID: ${record.id}, Supplier ID: ${record.supplierId || record.supplier_id}, Nome: ${record.supplierName || record.supplier_name}, Rating: ${record.rating}`);
    });
    
  } catch (error) {
    console.error('❌ Erro na migração:', error);
  } finally {
    await client.end();
    process.exit(0);
  }
}

runMigration();
