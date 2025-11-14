
import { db } from './db.js';
import { suppliers } from '../shared/schema.js';
import { parseGoogleSheetWithDate } from './services/google-sheets-parser.js';
import { eq } from 'drizzle-orm';

async function fixSupplierIds() {
  console.log('🔧 Starting supplier ID fix...\n');

  try {
    // 1. Get current suppliers from database
    console.log('📊 Getting current suppliers from database...');
    const currentSuppliers = await db.select().from(suppliers);
    console.log(`Found ${currentSuppliers.length} suppliers in database\n`);

    // 2. Get suppliers from Google Sheets
    console.log('📋 Getting suppliers from Google Sheets...');
    const SHEET_ID = process.env.GOOGLE_SHEET_ID;
    if (!SHEET_ID) {
      throw new Error('Google Sheet ID not configured');
    }

    const sheetsData = await parseGoogleSheetWithDate(SHEET_ID, 'all');
    const sheetsSuppliers = sheetsData.suppliers || [];
    console.log(`Found ${sheetsSuppliers.length} suppliers in Google Sheets\n`);

    // 3. Generate correct hash function (same as frontend)
    const generateSupplierId = (name: string): number => {
      let hash = 0;
      for (let i = 0; i < name.length; i++) {
        const char = name.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32bit integer
      }
      return Math.abs(hash);
    };

    // 4. Create mapping of old ID to new ID
    console.log('🔄 Creating ID mapping...');
    const idMappings = [];
    
    for (const dbSupplier of currentSuppliers) {
      const correctId = generateSupplierId(dbSupplier.name);
      if (dbSupplier.id !== correctId) {
        idMappings.push({
          oldId: dbSupplier.id,
          newId: correctId,
          name: dbSupplier.name
        });
        console.log(`  - "${dbSupplier.name}": ${dbSupplier.id} → ${correctId}`);
      }
    }

    console.log(`\nFound ${idMappings.length} suppliers that need ID correction\n`);

    if (idMappings.length === 0) {
      console.log('✅ All supplier IDs are already correct!');
      return;
    }

    // 5. Update supplier IDs
    console.log('🔧 Updating supplier IDs...');
    
    for (const mapping of idMappings) {
      try {
        // First, check if the new ID already exists
        const existingSupplier = await db.select()
          .from(suppliers)
          .where(eq(suppliers.id, mapping.newId))
          .limit(1);

        if (existingSupplier.length > 0) {
          console.log(`  ⚠️ Conflict: ID ${mapping.newId} already exists, skipping "${mapping.name}"`);
          continue;
        }

        // Update the supplier ID
        await db.update(suppliers)
          .set({ id: mapping.newId })
          .where(eq(suppliers.id, mapping.oldId));

        console.log(`  ✅ Updated "${mapping.name}": ${mapping.oldId} → ${mapping.newId}`);
        
      } catch (error) {
        console.error(`  ❌ Error updating "${mapping.name}":`, error.message);
      }
    }

    // 6. Add any missing suppliers from Google Sheets
    console.log('\n📝 Checking for missing suppliers...');
    const dbSupplierNames = new Set(currentSuppliers.map(s => s.name));
    const missingSuppliers = [];

    for (const supplierName of sheetsSuppliers) {
      if (!dbSupplierNames.has(supplierName)) {
        missingSuppliers.push({
          id: generateSupplierId(supplierName),
          name: supplierName,
          active: true,
          averageRating: 0,
          ratingCount: 0
        });
      }
    }

    if (missingSuppliers.length > 0) {
      console.log(`Adding ${missingSuppliers.length} missing suppliers...`);
      await db.insert(suppliers).values(missingSuppliers);
      missingSuppliers.forEach(supplier => {
        console.log(`  ✅ Added "${supplier.name}" with ID ${supplier.id}`);
      });
    }

    // 7. Verification
    console.log('\n🔍 Verifying fixes...');
    const updatedSuppliers = await db.select().from(suppliers);
    
    let verificationErrors = 0;
    for (const supplier of updatedSuppliers) {
      const expectedId = generateSupplierId(supplier.name);
      if (supplier.id !== expectedId) {
        console.log(`  ❌ Verification failed for "${supplier.name}": ${supplier.id} ≠ ${expectedId}`);
        verificationErrors++;
      }
    }

    if (verificationErrors === 0) {
      console.log('✅ All supplier IDs are now consistent!');
    } else {
      console.log(`❌ ${verificationErrors} suppliers still have incorrect IDs`);
    }

  } catch (error) {
    console.error('❌ Error during supplier ID fix:', error);
  }
}

// Run the fix
fixSupplierIds()
  .then(() => {
    console.log('\n🎉 Supplier ID fix completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Supplier ID fix failed:', error);
    process.exit(1);
  });
