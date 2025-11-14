
// server/update-supplier-stats.js

import { db } from './db.ts';
import { sql } from 'drizzle-orm';
import { suppliers } from '../shared/schema.ts'; // Importar o schema para usar db.query

// Envolvemos a lógica em uma função async para evitar 'top-level await'
async function main() {
  console.log('🔧 Iniciando a atualização das estatísticas dos fornecedores...');

  try {
    // 1. Cria ou substitui a função no PostgreSQL para recalcular as estatísticas
    console.log('🔄  Atualizando a função de agregação no banco de dados...');
    await db.execute(sql`
      CREATE OR REPLACE FUNCTION update_supplier_rating_aggregates(supplier_id_param INTEGER)
      RETURNS VOID AS $$
      BEGIN
        UPDATE suppliers
        SET
          average_rating = COALESCE((
            SELECT ROUND(AVG(rating)::numeric, 2)
            FROM supplier_ratings
            WHERE supplier_id = supplier_id_param AND is_approved = true
          ), 0.00),
          rating_count = COALESCE((
            SELECT COUNT(*)
            FROM supplier_ratings
            WHERE supplier_id = supplier_id_param AND is_approved = true
          ), 0)
        WHERE id = supplier_id_param;
      END;
      $$ LANGUAGE plpgsql;
    `);
    console.log('✅ Função de agregação atualizada com sucesso.');

    // 2. Executa a função para TODOS os fornecedores existentes para garantir que os dados estejam corretos
    console.log('📊  Recalculando as estatísticas para todos os fornecedores...');
    await db.execute(sql`SELECT update_supplier_rating_aggregates(id) FROM suppliers;`);
    console.log('✅ Estatísticas de todos os fornecedores foram recalculadas.');

    // 3. (Opcional) Verifica e exibe os resultados usando db.query (<<< CORREÇÃO AQUI)
    console.log('📈 Verificando fornecedores com avaliações:');
    const updatedSuppliers = await db.query.suppliers.findMany({
      where: (suppliers, { gt }) => gt(suppliers.ratingCount, 0),
      orderBy: (suppliers, { asc }) => [asc(suppliers.id)],
    });

    if (updatedSuppliers.length > 0) {
      updatedSuppliers.forEach(supplier => {
        // db.query retorna os nomes das colunas como definidos no schema (camelCase ou snake_case)
        // Vamos checar ambos para garantir
        const avgRating = supplier.averageRating ?? supplier.average_rating;
        const ratingCount = supplier.ratingCount ?? supplier.rating_count;
        console.log(`  -> ${supplier.name}: ${avgRating} estrelas (${ratingCount} avaliações)`);
      });
    } else {
      console.log('  -> Nenhum fornecedor com avaliações encontradas.');
    }

    console.log('\n🎉 Processo de atualização concluído com sucesso!');
    process.exit(0); // Encerra o script com sucesso

  } catch (error) {
    console.error('❌ Erro fatal durante a atualização das estatísticas:', error);
    process.exit(1); // Encerra o script com erro
  }
}

// Chama a função principal para iniciar o script
main();
