
const { db } = require('./db.ts');

async function fixUpdatedAtColumn() {
  try {
    console.log('Verificando e corrigindo coluna updated_at...');
    
    // Tentar adicionar a coluna updated_at se não existir
    await db.execute(`
      DO $$ 
      BEGIN
          -- Try to add the column, ignore error if it already exists
          BEGIN
              ALTER TABLE users ADD COLUMN updated_at TIMESTAMP DEFAULT NOW();
              RAISE NOTICE 'Column updated_at added successfully';
          EXCEPTION 
              WHEN duplicate_column THEN 
                  RAISE NOTICE 'Column updated_at already exists';
          END;
          
          -- Update existing records that have NULL updated_at
          UPDATE users 
          SET updated_at = created_at 
          WHERE updated_at IS NULL;
          
      END $$;
    `);
    
    console.log('✅ Coluna updated_at corrigida com sucesso!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Erro ao corrigir coluna:', error);
    process.exit(1);
  }
}

fixUpdatedAtColumn();
