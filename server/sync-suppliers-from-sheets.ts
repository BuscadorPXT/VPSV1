
import { db } from './db.js';
import { suppliers } from '../shared/schema.js';
import { eq } from 'drizzle-orm';
import { parseGoogleSheetWithDate } from './services/google-sheets-parser.js';

async function syncSuppliersFromSheets() {
  console.log('🔄 Starting supplier synchronization from Google Sheets...');

  try {
    const SHEET_ID = process.env.GOOGLE_SHEET_ID;
    if (!SHEET_ID) {
      throw new Error('Google Sheet ID not configured');
    }

    // Get data from Google Sheets
    const sheetsData = await parseGoogleSheetWithDate(SHEET_ID, 'all');

    if (!sheetsData || !sheetsData.suppliers) {
      console.log('❌ No suppliers found in Google Sheets');
      return;
    }

    console.log(`📊 Found ${sheetsData.suppliers.length} suppliers in Google Sheets`);

    // Generate supplier IDs using the same hash function
    const generateSupplierId = (name: string): number => {
      let hash = 0;
      for (let i = 0; i < name.length; i++) {
        const char = name.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
      }
      return Math.abs(hash);
    };

    // Get existing suppliers
    const existingSuppliers = await db.select({
      id: suppliers.id,
      name: suppliers.name
    }).from(suppliers);

    const existingNames = new Set(existingSuppliers.map(s => s.name));
    const existingIds = new Set(existingSuppliers.map(s => s.id));

    // Find suppliers to insert
    const suppliersToInsert = [];

    for (const supplierName of sheetsData.suppliers) {
      const supplierId = generateSupplierId(supplierName);

      if (!existingNames.has(supplierName) && !existingIds.has(supplierId)) {
        suppliersToInsert.push({
          id: supplierId,
          name: supplierName,
          active: true,
          averageRating: 0,
          ratingCount: 0
        });
      }
    }

    // Insert new suppliers
    if (suppliersToInsert.length > 0) {
      console.log(`➕ Inserting ${suppliersToInsert.length} new suppliers...`);

      await db.insert(suppliers)
        .values(suppliersToInsert)
        .onConflictDoNothing();

      console.log(`✅ Successfully inserted ${suppliersToInsert.length} suppliers`);

      // Log the new suppliers
      suppliersToInsert.forEach(supplier => {
        console.log(`   - ${supplier.name} (ID: ${supplier.id})`);
      });
    } else {
      console.log('✅ All suppliers are already synchronized');
    }

    // Verify final count
    const finalCount = await db.select().from(suppliers);
    console.log(`📊 Total suppliers in database: ${finalCount.length}`);

  } catch (error) {
    console.error('❌ Error syncing suppliers:', error);
    throw error;
  }
}

// Run the sync
syncSuppliersFromSheets()
  .then(() => {
    console.log('🎉 Supplier synchronization completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Supplier synchronization failed:', error);
    process.exit(1);
  });
