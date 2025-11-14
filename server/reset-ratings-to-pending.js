
import { db } from './db.ts';
import { supplierRatings } from '../shared/schema.ts';
import { sql } from 'drizzle-orm';

async function resetRatingsToPending() {
  console.log('🔄 Resetando avaliações existentes para status pendente...');
  
  try {
    // Reset all existing ratings to pending
    const result = await db.execute(sql`
      UPDATE supplier_ratings 
      SET 
        is_approved = false,
        approved_by = NULL,
        approved_at = NULL,
        updated_at = NOW()
      WHERE is_approved = true
    `);
    
    console.log(`✅ ${result.rowCount || 0} avaliações resetadas para pendente`);
    
    // Show current status
    const allRatings = await db.select().from(supplierRatings);
    console.log(`📊 Total de avaliações: ${allRatings.length}`);
    
    const pendingCount = allRatings.filter(r => !r.isApproved).length;
    const approvedCount = allRatings.filter(r => r.isApproved).length;
    
    console.log(`⏳ Pendentes: ${pendingCount}`);
    console.log(`✅ Aprovadas: ${approvedCount}`);
    
  } catch (error) {
    console.error('❌ Erro ao resetar avaliações:', error);
    throw error;
  }
  
  console.log('🎉 Reset concluído!');
}

resetRatingsToPending();
