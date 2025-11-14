
import express from 'express';
import { auth } from '../middleware/auth';

const router = express.Router();

// Debug endpoint to show raw product counts from Google Sheets
router.get('/debug-products/:model?', auth, async (req, res) => {
  try {
    const model = req.params.model || req.query.model as string;
    const date = req.query.date as string || 'all';
    
    console.log('🔍 Debug Products endpoint called with:', { model, date });

    // Import Google Sheets services
    const { parseGoogleSheetWithDate } = await import('../services/google-sheets-parser');

    const SHEET_ID = process.env.GOOGLE_SHEET_ID;
    if (!SHEET_ID) {
      return res.status(500).json({ error: 'Google Sheet ID not configured' });
    }

    // Fetch data from Google Sheets
    const sheetsData = await parseGoogleSheetWithDate(SHEET_ID, date);

    if (!sheetsData || !sheetsData.products) {
      return res.json({
        totalProducts: 0,
        filteredProducts: 0,
        model: model || 'all',
        date,
        products: []
      });
    }

    const allProducts = sheetsData.products;
    let filteredProducts = allProducts;

    // Apply model filter if provided
    if (model) {
      const modelLower = model.toLowerCase().trim();
      
      // For iPhone 16 Pro Max, use very inclusive filtering
      if (modelLower.includes('iphone') && modelLower.includes('16') && modelLower.includes('pro') && modelLower.includes('max')) {
        filteredProducts = allProducts.filter(product => {
          const productModel = (product.model || '').toLowerCase().trim();
          return productModel.includes('iphone') && 
                 productModel.includes('16') && 
                 productModel.includes('pro') && 
                 productModel.includes('max');
        });
      } else {
        filteredProducts = allProducts.filter(product => {
          const productModel = (product.model || '').toLowerCase();
          return productModel.includes(modelLower);
        });
      }
    }

    // Get unique capacities and colors
    const uniqueCapacities = [...new Set(filteredProducts.map(p => p.capacity || p.storage).filter(Boolean))];
    const uniqueColors = [...new Set(filteredProducts.map(p => p.color).filter(Boolean))];
    const uniqueSuppliers = [...new Set(filteredProducts.map(p => 
      p.supplierName || (typeof p.supplier === 'string' ? p.supplier : p.supplier?.name)
    ).filter(Boolean))];

    res.json({
      totalProducts: allProducts.length,
      filteredProducts: filteredProducts.length,
      model: model || 'all',
      date,
      uniqueCapacities,
      uniqueColors,
      uniqueSuppliers,
      sampleProducts: filteredProducts.slice(0, 20).map(p => ({
        model: p.model,
        capacity: p.capacity,
        storage: p.storage,
        color: p.color,
        supplier: p.supplierName || (typeof p.supplier === 'string' ? p.supplier : p.supplier?.name),
        price: p.price
      }))
    });

  } catch (error) {
    console.error('❌ Debug products endpoint error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch debug data',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;
