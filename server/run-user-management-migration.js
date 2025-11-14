
import { config } from 'dotenv';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { readFileSync } from 'fs';
import { join } from 'path';

config();

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error('❌ DATABASE_URL não encontrada nas variáveis de ambiente');
  process.exit(1);
}

const client = postgres(connectionString, { max: 1 });
const db = drizzle(client);

async function runMigration() {
  try {
    console.log('🚀 Executando migração de gerenciamento de usuários...');

    // Ler o arquivo de migração
    const migrationPath = join(process.cwd(), 'server/migrations/add-user-management-fields.sql');
    const migrationSql = readFileSync(migrationPath, 'utf8');

    // Executar a migração
    await db.execute(migrationSql);

    console.log('✅ Migração executada com sucesso!');
    console.log('📋 Novas funcionalidades adicionadas:');
    console.log('   - Campos de gerenciamento de status');
    console.log('   - Campos de gerenciamento de função');
    console.log('   - Tabela de logs de impersonação');
    console.log('   - Tabela de logs de atividade');
    console.log('   - Campos para reset de senha');

  } catch (error) {
    console.error('❌ Erro ao executar migração:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

runMigration();
