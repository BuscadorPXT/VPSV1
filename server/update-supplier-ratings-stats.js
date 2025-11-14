
import { db } from './db.ts';
import { suppliers, supplierRatings } from '../shared/schema.ts';
import { sql, eq } from 'drizzle-orm';

console.log('🔄 Updating supplier rating statistics...');

try {
  // 1. Get all suppliers with approved ratings
  const suppliersWithRatings = await db.execute(sql`
    SELECT 
      s.id,
      s.name,
      COUNT(sr.id) as rating_count,
      ROUND(AVG(sr.rating)::numeric, 2) as average_rating
    FROM suppliers s
    LEFT JOIN supplier_ratings sr ON s.id = sr.supplier_id AND sr.is_approved = true
    GROUP BY s.id, s.name
    ORDER BY s.id
  `);

  console.log(`📊 Found ${suppliersWithRatings.length} suppliers to update`);

  // 2. Update each supplier's statistics
  for (const supplier of suppliersWithRatings) {
    const avgRating = supplier.average_rating || 0.00;
    const ratingCount = supplier.rating_count || 0;

    await db.update(suppliers)
      .set({
        averageRating: avgRating.toString(),
        ratingCount: ratingCount
      })
      .where(eq(suppliers.id, supplier.id));

    console.log(`✅ Updated ${supplier.name}: ${avgRating} stars (${ratingCount} ratings)`);
  }

  // 3. Verify the updates
  console.log('\n📋 Final verification:');
  const updatedSuppliers = await db.select({
    id: suppliers.id,
    name: suppliers.name,
    averageRating: suppliers.averageRating,
    ratingCount: suppliers.ratingCount
  })
  .from(suppliers)
  .where(sql`rating_count > 0`)
  .orderBy(suppliers.id);

  for (const supplier of updatedSuppliers) {
    console.log(`📈 ${supplier.name}: ${supplier.averageRating} stars (${supplier.ratingCount} ratings)`);
  }

  console.log('🎉 Supplier rating statistics updated successfully!');
} catch (error) {
  console.error('❌ Error updating supplier statistics:', error);
}
