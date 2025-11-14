import { Router } from 'express';
import { authenticateToken } from '../middleware/auth';
import { parseGoogleSheetWithDate } from '../services/google-sheets-parser';

const router = Router();

// Get products directly from Google Sheets
router.get('/products', authenticateToken, async (req, res) => {
  try {
    console.log('📊 Direct Google Sheets products request');

    const SHEET_ID = process.env.GOOGLE_SHEET_ID;
    if (!SHEET_ID) {
      return res.status(500).json({
        success: false,
        message: 'ID da fonte de dados não configurado'
      });
    }

    const selectedDate = req.query.date as string || 'all';
    console.log(`📅 Requested date: ${selectedDate}`);

    // Fetch data directly from Google Sheets
    const sheetsData = await parseGoogleSheetWithDate(SHEET_ID, selectedDate);

    if (!sheetsData || !sheetsData.products) {
      return res.status(404).json({
        success: false,
        message: 'No data found in Google Sheets'
      });
    }

    console.log(`✅ Successfully fetched ${sheetsData.products.length} products from Google Sheets`);

    res.json({
      success: true,
      products: sheetsData.products,
      suppliers: sheetsData.suppliers,
      dates: sheetsData.dates,
      supplierContacts: sheetsData.supplierContacts,
      totalCount: sheetsData.products.length,
      source: 'google-sheets'
    });

  } catch (error: any) {
    console.error('❌ Error fetching from Google Sheets:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch data from Google Sheets'
    });
  }
});

// Get available sheet dates
router.get('/dates', authenticateToken, async (req, res) => {
  try {
    const { googleSheetsService } = await import('../services/google-sheets');
    const SHEET_ID = process.env.GOOGLE_SHEET_ID;

    if (!SHEET_ID) {
      return res.status(500).json({
        success: false,
        message: 'ID da fonte de dados não configurado'
      });
    }

    const availableSheets = await googleSheetsService.getAvailableSheets(SHEET_ID);

    // Filter to get only date sheets (DD-MM format)
    const dateSheets = availableSheets
      .filter(sheet => /^\d{2}-\d{2}$/.test(sheet))
      .sort((a, b) => {
        const [dayA, monthA] = a.split('-').map(Number);
        const [dayB, monthB] = b.split('-').map(Number);

        if (monthA !== monthB) return monthB - monthA;
        return dayB - dayA;
      });

    res.json({
      success: true,
      dates: dateSheets
    });

  } catch (error: any) {
    console.error('❌ Error fetching sheet dates:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch available dates'
    });
  }
});

export default router;