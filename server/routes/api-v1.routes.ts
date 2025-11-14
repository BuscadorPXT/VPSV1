
import { Router } from 'express';
import { authenticateApiKey } from '../middleware/api-key-auth';
import { parseGoogleSheetWithDate } from '../services/google-sheets-parser';
import { storage } from '../storage';
import { rateLimit } from '../middleware/input-validation';

const router = Router();

// Apply API key authentication to all routes
router.use(authenticateApiKey);

// Rate limiting for API users
const apiRateLimit = rateLimit('api-v1', 1000, 15); // 1000 requests per 15 minutes

// GET /api/v1/products - Enhanced products endpoint with full access
router.get('/products', apiRateLimit, async (req, res) => {
  try {
    const { 
      model, 
      capacity, 
      color, 
      region, 
      supplier,
      category,
      limit = '100', 
      offset = '0',
      date
    } = req.query;
    
    const limitNum = Math.min(parseInt(limit as string) || 100, 500);
    const offsetNum = parseInt(offset as string) || 0;

    console.log(`📊 API v1 - Products request from ${req.user.email}`);

    // Get latest date if not specified
    const targetDate = date as string || (await storage.getDates()).sort().pop();
    if (!targetDate) {
      return res.status(404).json({
        success: false,
        message: 'No data available',
        timestamp: new Date().toISOString()
      });
    }

    // Get products data
    const allProducts = await parseGoogleSheetWithDate(targetDate);
    let filteredProducts = Array.isArray(allProducts) ? allProducts : [];

    // Apply filters
    if (model) filteredProducts = filteredProducts.filter(p => 
      p.model?.toLowerCase().includes((model as string).toLowerCase())
    );
    if (capacity) filteredProducts = filteredProducts.filter(p => 
      p.storage?.toLowerCase().includes((capacity as string).toLowerCase())
    );
    if (color) filteredProducts = filteredProducts.filter(p => 
      p.color?.toLowerCase().includes((color as string).toLowerCase())
    );
    if (region) filteredProducts = filteredProducts.filter(p => 
      p.region?.toLowerCase().includes((region as string).toLowerCase())
    );
    if (supplier) filteredProducts = filteredProducts.filter(p => 
      p.supplier?.name?.toLowerCase().includes((supplier as string).toLowerCase())
    );
    if (category) filteredProducts = filteredProducts.filter(p => 
      p.category?.toLowerCase().includes((category as string).toLowerCase())
    );

    // Sort by price
    filteredProducts.sort((a, b) => {
      const priceA = parseFloat(a.price?.toString() || '0');
      const priceB = parseFloat(b.price?.toString() || '0');
      return priceA - priceB;
    });

    // Apply pagination
    const paginatedProducts = filteredProducts.slice(offsetNum, offsetNum + limitNum);

    return res.json({
      success: true,
      data: {
        products: paginatedProducts.map(p => ({
          model: p.model,
          storage: p.storage,
          color: p.color,
          category: p.category,
          price: parseFloat(p.price?.toString() || '0'),
          supplier: p.supplier?.name,
          region: p.region,
          isLowestPrice: p.isLowestPrice,
          date: targetDate
        })),
        pagination: {
          limit: limitNum,
          offset: offsetNum,
          total: filteredProducts.length,
          hasMore: offsetNum + limitNum < filteredProducts.length
        },
        filters: { model, capacity, color, region, supplier, category },
        date: targetDate
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('API v1 products error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      timestamp: new Date().toISOString()
    });
  }
});

// GET /api/v1/suppliers - Get all suppliers
router.get('/suppliers', apiRateLimit, async (req, res) => {
  try {
    const dates = await storage.getDates();
    const latestDate = dates.sort().pop();
    
    if (!latestDate) {
      return res.status(404).json({
        success: false,
        message: 'No data available'
      });
    }

    const allProducts = await parseGoogleSheetWithDate(latestDate);
    const suppliers = Array.isArray(allProducts) ? 
      [...new Set(allProducts.map(p => p.supplier?.name).filter(Boolean))] : [];

    return res.json({
      success: true,
      data: {
        suppliers: suppliers.sort(),
        count: suppliers.length,
        date: latestDate
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('API v1 suppliers error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// GET /api/v1/categories - Get all categories
router.get('/categories', apiRateLimit, async (req, res) => {
  try {
    const dates = await storage.getDates();
    const latestDate = dates.sort().pop();
    
    if (!latestDate) {
      return res.status(404).json({
        success: false,
        message: 'No data available'
      });
    }

    const allProducts = await parseGoogleSheetWithDate(latestDate);
    const categories = Array.isArray(allProducts) ? 
      [...new Set(allProducts.map(p => p.category).filter(Boolean))] : [];

    return res.json({
      success: true,
      data: {
        categories: categories.sort(),
        count: categories.length,
        date: latestDate
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('API v1 categories error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

// GET /api/v1/dates - Get available dates
router.get('/dates', apiRateLimit, async (req, res) => {
  try {
    const dates = await storage.getDates();
    
    return res.json({
      success: true,
      data: {
        dates: dates.sort().reverse(),
        count: dates.length,
        latest: dates.sort().pop()
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('API v1 dates error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

export { router as apiV1Routes };
