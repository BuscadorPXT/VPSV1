
import { db } from './db.ts';
import { sql } from 'drizzle-orm';

async function debugInterestList() {
  try {
    console.log('🔍 Debugging interest list table...');
    
    // Check table structure
    const tableInfo = await db.execute(sql`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'interest_list'
      ORDER BY ordinal_position;
    `);
    
    console.log('📊 Table structure:', tableInfo);
    
    // Check existing data
    const existingData = await db.execute(sql`
      SELECT id, product_model, product_brand, product_storage, product_color, supplier_name
      FROM interest_list 
      ORDER BY created_at DESC 
      LIMIT 10;
    `);
    
    console.log('📋 Existing data:', existingData);
    
    // Check if data is properly formatted
    existingData.forEach((item, index) => {
      console.log(`Item ${index + 1}:`, {
        id: item.id,
        model: item.product_model,
        brand: item.product_brand,
        storage: item.product_storage,
        color: item.product_color,
        supplier: item.supplier_name,
        modelLength: item.product_model?.length || 0,
        brandLength: item.product_brand?.length || 0
      });
    });
    
  } catch (error) {
    console.error('❌ Debug error:', error);
  } finally {
    process.exit(0);
  }
}

debugInterestList();
