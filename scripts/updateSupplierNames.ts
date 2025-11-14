
import { db } from '../server/db';
import { supplierRatings, suppliers } from '../shared/schema';
import { eq, isNull } from 'drizzle-orm';

async function updateExistingRatings() {
  console.log('🔄 Atualizando avaliações existentes com nomes de fornecedores...');
  try {
    const ratingsWithoutName = await db.select()
      .from(supplierRatings)
      .where(isNull(supplierRatings.supplierName));

    console.log(`📊 Encontradas ${ratingsWithoutName.length} avaliações sem nome do fornecedor`);

    for (const rating of ratingsWithoutName) {
      try {
        const supplier = await db.select({ name: suppliers.name })
          .from(suppliers)
          .where(eq(suppliers.id, rating.supplierId))
          .limit(1);

        if (supplier[0]) {
          await db.update(supplierRatings)
            .set({ supplierName: supplier[0].name })
            .where(eq(supplierRatings.id, rating.id));

          console.log(`✅ Avaliação ${rating.id} atualizada com fornecedor: ${supplier[0].name}`);
        } else {
          console.log(`⚠️ Fornecedor não encontrado para avaliação ${rating.id} (supplier_id: ${rating.supplierId})`);
        }
      } catch (error) {
        console.error(`❌ Erro ao atualizar avaliação ${rating.id}:`, error);
      }
    }

    const finalCount = await db.select()
      .from(supplierRatings)
      .where(isNull(supplierRatings.supplierName));

    console.log(`📊 Avaliações restantes sem nome do fornecedor: ${finalCount.length}`);
    console.log('✅ Atualização concluída!');
  } catch (error) {
    console.error('❌ Erro na atualização:', error);
  } finally {
    process.exit(0);
  }
}

updateExistingRatings().catch(console.error);
