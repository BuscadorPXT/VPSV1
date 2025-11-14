
import { Router } from 'express';
import { authenticateToken } from '../middleware/auth';
import { parseGoogleSheetWithDate } from '../services/google-sheets-parser';
import { googleSheetsService } from '../services/google-sheets';

const router = Router();

// Debug endpoint for PHOENIX GABI supplier
router.get('/phoenix-gabi', authenticateToken, async (req, res) => {
  try {
    const SHEET_ID = process.env.GOOGLE_SHEET_ID;
    if (!SHEET_ID) {
      return res.status(500).json({ error: 'Google Sheet ID not configured' });
    }

    // Get today's date
    const now = new Date();
    const todayDate = [
      String(now.getDate()).padStart(2, '0'),
      String(now.getMonth() + 1).padStart(2, '0')
    ].join('-');

    console.log(`🔍 [PHOENIX GABI DEBUG] Checking for date: ${todayDate}`);

    // Get available sheets
    const availableSheets = await googleSheetsService.getAvailableSheets(SHEET_ID);
    console.log(`🔍 [PHOENIX GABI DEBUG] Available sheets:`, availableSheets);

    // Try to get data for today
    let sheetsData;
    try {
      sheetsData = await parseGoogleSheetWithDate(SHEET_ID, todayDate);
    } catch (error) {
      console.log(`🔍 [PHOENIX GABI DEBUG] Failed to get data for ${todayDate}, trying latest...`);
      // Try the latest available date
      const datePattern = /^\d{2}-\d{2}$/;
      const availableDates = availableSheets
        .filter(sheet => datePattern.test(sheet))
        .sort((a, b) => {
          const [dayA, monthA] = a.split('-').map(Number);
          const [dayB, monthB] = b.split('-').map(Number);
          if (monthA !== monthB) return monthB - monthA;
          return dayB - dayA;
        });

      if (availableDates.length > 0) {
        const latestDate = availableDates[0];
        console.log(`🔍 [PHOENIX GABI DEBUG] Trying latest date: ${latestDate}`);
        sheetsData = await parseGoogleSheetWithDate(SHEET_ID, latestDate);
      }
    }

    if (!sheetsData || !sheetsData.products) {
      return res.json({
        error: 'No data found',
        todayDate,
        availableSheets,
        phoenixProducts: []
      });
    }

    // Filter for PHOENIX GABI products
    const phoenixProducts = sheetsData.products.filter(product => {
      const supplierName = product.supplierName || 
                          (typeof product.supplier === 'string' ? product.supplier : product.supplier?.name) || '';
      return supplierName.toLowerCase().includes('phoenix') && 
             (supplierName.toLowerCase().includes('gabi') || supplierName.includes('1693'));
    });

    // Get all suppliers that contain "phoenix"
    const allPhoenixSuppliers = [...new Set(sheetsData.products
      .map(product => {
        const supplierName = product.supplierName || 
                            (typeof product.supplier === 'string' ? product.supplier : product.supplier?.name) || '';
        return supplierName;
      })
      .filter(name => name.toLowerCase().includes('phoenix'))
    )];

    console.log(`🔍 [PHOENIX GABI DEBUG] Found ${phoenixProducts.length} PHOENIX GABI products`);
    console.log(`🔍 [PHOENIX GABI DEBUG] All Phoenix suppliers:`, allPhoenixSuppliers);

    res.json({
      success: true,
      todayDate,
      dataSource: sheetsData.actualDate || todayDate,
      availableSheets,
      totalProducts: sheetsData.products.length,
      phoenixProducts: phoenixProducts.slice(0, 10), // Limit to first 10 for readability
      phoenixProductsCount: phoenixProducts.length,
      allPhoenixSuppliers,
      sampleSuppliers: [...new Set(sheetsData.products
        .map(product => {
          const supplierName = product.supplierName || 
                              (typeof product.supplier === 'string' ? product.supplier : product.supplier?.name) || '';
          return supplierName;
        })
      )].slice(0, 20)
    });

  } catch (error) {
    console.error('🔍 [PHOENIX GABI DEBUG] Error:', error);
    res.status(500).json({
      error: error.message,
      stack: error.stack
    });
  }
});

export { router as debugSupplierRoutes };
