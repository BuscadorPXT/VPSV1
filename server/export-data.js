
import { Pool } from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function exportData() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    console.log('📤 Exportando dados do banco...');
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const exportDir = path.join(__dirname, '..', 'exports');
    
    if (!fs.existsSync(exportDir)) {
      fs.mkdirSync(exportDir, { recursive: true });
    }

    // Exportar cada tabela como JSON
    const tables = ['users', 'suppliers', 'products', 'price_alerts'];
    
    for (const table of tables) {
      try {
        const result = await pool.query(`SELECT * FROM ${table} ORDER BY id LIMIT 1000`);
        
        const filename = path.join(exportDir, `${table}-${timestamp}.json`);
        fs.writeFileSync(filename, JSON.stringify(result.rows, null, 2));
        
        console.log(`✅ Exportado ${table}: ${result.rows.length} registros`);
      } catch (error) {
        console.warn(`⚠️ Erro exportando ${table}:`, error.message);
      }
    }

    // Criar arquivo consolidado
    const allData = {};
    for (const table of tables) {
      try {
        const filename = path.join(exportDir, `${table}-${timestamp}.json`);
        if (fs.existsSync(filename)) {
          allData[table] = JSON.parse(fs.readFileSync(filename, 'utf8'));
        }
      } catch (error) {
        console.warn(`⚠️ Erro lendo ${table}:`, error.message);
      }
    }

    const consolidatedFile = path.join(exportDir, `database-export-${timestamp}.json`);
    fs.writeFileSync(consolidatedFile, JSON.stringify(allData, null, 2));
    
    console.log(`✅ Export consolidado criado: ${consolidatedFile}`);

  } catch (error) {
    console.error('❌ Erro durante export:', error);
  } finally {
    await pool.end();
  }
}

exportData().catch(console.error);
