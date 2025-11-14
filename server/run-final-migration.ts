
import { db } from './db';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// CORREÇÃO: Obter o diretório atual de forma compatível com ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runMigration() {
  try {
    console.log('🔧 Executando migração final do schema (versão corrigida)...');
    
    // O caminho para o arquivo SQL agora funcionará corretamente
    const sqlFilePath = path.join(__dirname, 'sync-database-schema.sql'); 
    
    if (!fs.existsSync(sqlFilePath)) {
      console.error(`❌ Erro: Arquivo de migração não encontrado em ${sqlFilePath}`);
      console.log("Por favor, certifique-se de que o arquivo 'sync-database-schema.sql' com os comandos ALTER TABLE exista na pasta de migrações.");
      process.exit(1);
    }

    const migrationSQL = fs.readFileSync(sqlFilePath, 'utf8');
    await db.execute(migrationSQL);
    
    console.log('✅ Migração executada com sucesso!');
    console.log('🎉 O painel de administração agora deve funcionar corretamente.');
    
    // Verificar se as colunas foram criadas
    const result = await db.execute(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'users' 
      AND column_name IN ('status_changed_at', 'role_changed_at', 'password_reset_token')
      ORDER BY column_name
    `);
    
    console.log('📋 Colunas verificadas:', result.rows);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Erro durante a migração:', error);
    process.exit(1);
  }
}

runMigration();
