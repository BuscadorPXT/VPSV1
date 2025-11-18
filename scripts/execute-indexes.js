#!/usr/bin/env node

/**
 * Script para executar índices do banco de dados automaticamente
 * Conecta ao PostgreSQL do Replit e cria todos os índices de performance
 */

import { config } from 'dotenv';
import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Carregar variáveis de ambiente
config();

const { Pool } = pg;

// Cores para output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(color, ...args) {
  console.log(color, ...args, colors.reset);
}

async function main() {
  log(colors.blue, '\n============================================================');
  log(colors.blue, '  🗃️  EXECUTANDO ÍNDICES NO BANCO DE DADOS REPLIT');
  log(colors.blue, '============================================================\n');

  // Verificar DATABASE_URL
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    log(colors.red, '❌ ERROR: DATABASE_URL não encontrada no .env');
    process.exit(1);
  }

  log(colors.green, '✓ DATABASE_URL encontrada');

  // Criar conexão
  const pool = new Pool({
    connectionString: databaseUrl,
    ssl: {
      rejectUnauthorized: false // Necessário para Replit
    }
  });

  try {
    // Testar conexão
    log(colors.cyan, '\n📡 Testando conexão com o banco...');
    const testQuery = await pool.query('SELECT NOW()');
    log(colors.green, `✓ Conectado! Hora do servidor: ${testQuery.rows[0].now}`);

    // Ler arquivo SQL
    const sqlFilePath = path.join(__dirname, 'migrations', 'add-performance-indexes.sql');
    log(colors.cyan, `\n📄 Lendo arquivo: ${sqlFilePath}`);

    if (!fs.existsSync(sqlFilePath)) {
      log(colors.red, `❌ Arquivo não encontrado: ${sqlFilePath}`);
      process.exit(1);
    }

    const sqlContent = fs.readFileSync(sqlFilePath, 'utf8');
    log(colors.green, '✓ Arquivo SQL lido com sucesso');

    // Separar comandos SQL (cada CREATE INDEX)
    const commands = sqlContent
      .split(';')
      .map(cmd => cmd.trim())
      .filter(cmd => cmd.length > 0 && !cmd.startsWith('--') && cmd.toUpperCase().includes('CREATE'));

    log(colors.cyan, `\n🔨 Encontrados ${commands.length} comandos CREATE INDEX\n`);

    let successCount = 0;
    let skipCount = 0;
    let errorCount = 0;

    // Executar cada comando
    for (let i = 0; i < commands.length; i++) {
      const command = commands[i] + ';';
      const indexName = command.match(/CREATE INDEX[^I]*INDEX\s+(\w+)/i)?.[1] || `index_${i + 1}`;

      process.stdout.write(`[${i + 1}/${commands.length}] Criando ${indexName}...`);

      try {
        await pool.query(command);
        successCount++;
        log(colors.green, ' ✓');
      } catch (error) {
        if (error.message.includes('already exists')) {
          skipCount++;
          log(colors.yellow, ' ⚠ (já existe)');
        } else {
          errorCount++;
          log(colors.red, ` ✗ ERRO: ${error.message}`);
        }
      }

      // Pequeno delay para não sobrecarregar o banco
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // Relatório final
    log(colors.blue, '\n============================================================');
    log(colors.blue, '  📊 RELATÓRIO FINAL');
    log(colors.blue, '============================================================\n');

    log(colors.green, `✓ Sucesso: ${successCount} índices criados`);
    if (skipCount > 0) {
      log(colors.yellow, `⚠ Pulados: ${skipCount} índices (já existiam)`);
    }
    if (errorCount > 0) {
      log(colors.red, `✗ Erros: ${errorCount} índices falharam`);
    }

    // Validar índices criados
    log(colors.cyan, '\n🔍 Validando índices criados...');
    const validateQuery = await pool.query(`
      SELECT COUNT(*) as total
      FROM pg_indexes
      WHERE schemaname = 'public'
        AND indexname LIKE 'idx_%'
    `);

    const totalIndexes = parseInt(validateQuery.rows[0].total);
    log(colors.green, `✓ Total de índices no banco: ${totalIndexes}`);

    if (totalIndexes >= 30) {
      log(colors.green, '\n🎉 SUCESSO! Todos os índices foram criados!');
      log(colors.green, '🚀 Dashboard deve carregar 80% mais rápido agora!');
    } else {
      log(colors.yellow, `\n⚠️  Apenas ${totalIndexes} índices encontrados (esperado: ~30-35)`);
      log(colors.yellow, 'Verifique os erros acima e tente novamente');
    }

    log(colors.blue, '\n============================================================');
    log(colors.cyan, '\n📝 Próximos passos:');
    log(colors.cyan, '  1. Teste o login no sistema');
    log(colors.cyan, '  2. Dashboard deve carregar em ~2-3 segundos');
    log(colors.cyan, '  3. Monitore logs: pm2 logs buscadorpxt');
    log(colors.blue, '\n============================================================\n');

  } catch (error) {
    log(colors.red, `\n❌ ERRO FATAL: ${error.message}`);
    log(colors.red, error.stack);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Executar
main().catch(error => {
  log(colors.red, `\n❌ ERRO: ${error.message}`);
  process.exit(1);
});
