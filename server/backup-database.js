
import { Pool } from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function createDatabaseBackup() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    console.log('🔄 Iniciando backup do banco de dados...');
    
    // Criar diretório de backup se não existir
    const backupDir = path.join(__dirname, '..', 'backups');
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    // Nome do arquivo com timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFile = path.join(backupDir, `database-backup-${timestamp}.sql`);

    // Criar backup SQL
    let sqlDump = '';
    
    // Backup das tabelas principais
    const tables = [
      'users', 'suppliers', 'products', 'price_alerts', 
      'notification_history', 'user_sessions', 'system_settings',
      'system_announcements', 'whatsapp_clicks', 'supplier_ratings'
    ];

    for (const table of tables) {
      try {
        // Estrutura da tabela
        const structureResult = await pool.query(`
          SELECT 
            'CREATE TABLE IF NOT EXISTS ' || table_name || ' (' ||
            string_agg(
              column_name || ' ' || data_type ||
              CASE 
                WHEN character_maximum_length IS NOT NULL 
                THEN '(' || character_maximum_length || ')'
                ELSE ''
              END ||
              CASE 
                WHEN is_nullable = 'NO' THEN ' NOT NULL'
                ELSE ''
              END,
              ', '
            ) || ');' as create_statement
          FROM information_schema.columns 
          WHERE table_name = $1
          GROUP BY table_name;
        `, [table]);

        if (structureResult.rows.length > 0) {
          sqlDump += `-- Estrutura da tabela ${table}\n`;
          sqlDump += structureResult.rows[0].create_statement + '\n\n';
        }

        // Dados da tabela
        const dataResult = await pool.query(`SELECT * FROM ${table} LIMIT 1000`);
        
        if (dataResult.rows.length > 0) {
          sqlDump += `-- Dados da tabela ${table}\n`;
          
          for (const row of dataResult.rows) {
            const columns = Object.keys(row).join(', ');
            const values = Object.values(row).map(val => {
              if (val === null) return 'NULL';
              if (typeof val === 'string') return `'${val.replace(/'/g, "''")}'`;
              if (val instanceof Date) return `'${val.toISOString()}'`;
              return val;
            }).join(', ');
            
            sqlDump += `INSERT INTO ${table} (${columns}) VALUES (${values});\n`;
          }
          sqlDump += '\n';
        }

        console.log(`✅ Backup da tabela ${table} concluído`);
      } catch (error) {
        console.warn(`⚠️ Erro no backup da tabela ${table}:`, error.message);
      }
    }

    // Escrever arquivo
    fs.writeFileSync(backupFile, sqlDump);
    
    console.log(`✅ Backup concluído! Arquivo salvo em: ${backupFile}`);
    console.log(`📊 Tamanho do arquivo: ${(fs.statSync(backupFile).size / 1024 / 1024).toFixed(2)} MB`);
    
    return backupFile;

  } catch (error) {
    console.error('❌ Erro durante o backup:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

// Executar se chamado diretamente
if (import.meta.url === `file://${process.argv[1]}`) {
  createDatabaseBackup()
    .then((backupFile) => {
      console.log('🎉 Backup finalizado com sucesso!');
      console.log(`📁 Arquivo: ${backupFile}`);
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Falha no backup:', error);
      process.exit(1);
    });
}

export { createDatabaseBackup };
