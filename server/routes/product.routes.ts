import { Router } from 'express';
import { productsController } from '../controllers/products.controller';
import { authenticateToken } from '../middleware/auth';
import { productService } from '../services/product.service';
import { googleSheetsService } from '../services/google-sheets';
import { nanoid } from 'nanoid';
import { storage } from '../storage';
import { parseGoogleSheetWithDate } from '../services/google-sheets-parser';
import { asyncHandler } from '../middleware/async-handler';
import { AuthenticatedRequest, ProductsQuery } from '../types';
import { Response, NextFunction } from 'express';

const router = Router();

// All routes require authentication
router.use(authenticateToken);

// Endpoint para listar datas disponíveis
router.get('/available-dates', async (req, res) => {
  try {
    const SHEET_ID = process.env.GOOGLE_SHEET_ID;
    if (!SHEET_ID) {
      return res.status(500).json({ error: 'Google Sheet ID not configured' });
    }


// Diagnostic endpoint for troubleshooting
router.get('/debug', async (req, res) => {
  try {
    console.log('🔍 Debug endpoint called');

    const SHEET_ID = process.env.GOOGLE_SHEET_ID;
    if (!SHEET_ID) {
      return res.json({
        error: 'Google Sheet ID not configured',
        env: {
          hasSheetId: false,
          nodeEnv: process.env.NODE_ENV
        }
      });
    }

    // Test Google Sheets connection
    const { parseGoogleSheetWithDate } = await import('../services/google-sheets-parser');
    const sheetsData = await parseGoogleSheetWithDate(SHEET_ID);

    res.json({
      success: true,
      debug: {
        sheetsConnection: 'OK',
        availableSheets: sheetsData.availableSheets || [],
        productsCount: sheetsData.products?.length || 0,
        suppliersCount: sheetsData.suppliers?.length || 0,
        sampleProduct: sheetsData.products?.[0] || null,
        env: {
          hasSheetId: !!SHEET_ID,
          nodeEnv: process.env.NODE_ENV
        }
      }
    });
  } catch (error) {
    console.error('❌ Debug endpoint error:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      debug: {
        sheetsConnection: 'FAILED',
        errorType: error.constructor.name,
        env: {
          hasSheetId: !!process.env.GOOGLE_SHEET_ID,
          nodeEnv: process.env.NODE_ENV
        }
      }
    });
  }
});


    const availableSheets = await googleSheetsService.getAvailableSheets(SHEET_ID);

    // Filtrar apenas sheets que seguem o padrão DD-MM
    const datePattern = /^\d{2}-\d{2}$/;
    const availableDates = availableSheets
      .filter(sheet => datePattern.test(sheet))
      .sort((a, b) => {
        // Ordenar por data (mais recente primeiro)
        const [dayA, monthA] = a.split('-').map(Number);
        const [dayB, monthB] = b.split('-').map(Number);

        if (monthA !== monthB) return monthB - monthA;
        return dayB - dayA;
      });

    res.json({ availableDates });
  } catch (error) {
    console.error('Error fetching available dates:', error);
    res.status(500).json({ error: 'Failed to fetch available dates' });
  }
});

// GET /api/products-with-suppliers - Products with complete supplier information
router.get('/with-suppliers', async (req, res) => {
  try {
    const requestId = nanoid(8);
    console.log(`🎯 [${requestId}] GET /products/with-suppliers - Request started`);

    const { 
      limit = '50', 
      offset = '0',
      date
    } = req.query;

    const limitNum = Math.min(parseInt(limit as string) || 50, 100);
    const offsetNum = parseInt(offset as string) || 0;

    // Get latest date if not specified
    const targetDate = date as string || (await storage.getDates()).sort().pop();
    if (!targetDate) {
      return res.status(404).json({
        success: false,
        message: 'Nenhum dado disponível'
      });
    }

    // Get products data
    const allProducts = await parseGoogleSheetWithDate(targetDate);
    let products = Array.isArray(allProducts) ? allProducts : [];

    // Load supplier ratings from database
    const { db } = await import('../db');
    const { suppliers } = await import('../../shared/schema');

    // Get all suppliers with their ratings
    const suppliersWithRatings = await db.select().from(suppliers);
    const supplierRatingsMap = new Map();
    suppliersWithRatings.forEach(supplier => {
      supplierRatingsMap.set(supplier.id, {
        averageRating: supplier.averageRating,
        ratingCount: supplier.ratingCount
      });
    });

    // Function to generate consistent supplier IDs using hash
    const generateSupplierId = (name: string): number => {
      let hash = 0;
      for (let i = 0; i < name.length; i++) {
        const char = name.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
      }
      return Math.abs(hash);
    };

    // Transform products to ensure supplier information is properly structured
    const transformedProducts = products.map((product, index) => {
      // Create a consistent supplier object
      let supplier = {};
      let supplierName = '';

      if (typeof product.supplier === 'object' && product.supplier !== null) {
        supplierName = product.supplier?.name || 'Fornecedor Não Informado';
      } else if (typeof product.supplier === 'string') {
        supplierName = product.supplier;
      } else {
        supplierName = product.supplierName || 'Fornecedor Não Informado';
      }

      // Generate consistent ID and get rating info
      const supplierId = generateSupplierId(supplierName);
      const ratingInfo = supplierRatingsMap.get(supplierId) || { averageRating: 0, ratingCount: 0 };

      supplier = {
        id: supplierId,
        name: supplierName,
        averageRating: ratingInfo.averageRating,
        ratingCount: ratingInfo.ratingCount
      };

      return {
        id: product.id || index + 1,
        model: product.model || '',
        storage: product.storage || '',
        color: product.color || '',
        category: product.category || '',
        price: parseFloat(product.price?.toString() || '0'),
        supplier: supplier,
        region: product.region || '',
        isLowestPrice: product.isLowestPrice || false,
        date: targetDate
      };
    });

    // Apply pagination
    const paginatedProducts = transformedProducts.slice(offsetNum, offsetNum + limitNum);

    console.log(`✅ [${requestId}] Successfully fetched ${paginatedProducts.length} products with suppliers including ratings`);

    return res.json({
      success: true,
      data: paginatedProducts,
      pagination: {
        limit: limitNum,
        offset: offsetNum,
        total: transformedProducts.length,
        hasMore: offsetNum + limitNum < transformedProducts.length
      },
      date: targetDate
    });

  } catch (error) {
    console.error('Products with suppliers error:', error);
    return res.status(500).json({
      success: false,
      message: 'Erro interno do servidor'
    });
  }
});

// GET /api/products - Enhanced products endpoint
router.get('/', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    console.log('📊 Products request received', {
      query: req.query,
      user: req.user?.uid,
      timestamp: new Date().toISOString(),
      cacheBypass: req.query._t ? 'yes' : 'no'
    });

    // Extract filters from query parameters
    const filters = {
      search: req.query.search as string,
      model: req.query.model as string,
      storage: req.query.storage as string,
      color: req.query.color as string,
      category: req.query.category as string,
      supplier: req.query.supplier as string || req.query.supplierFilter as string,
      brandCategory: req.query.brandCategory as string,
      minPrice: req.query.minPrice ? parseFloat(req.query.minPrice as string) : undefined,
      maxPrice: req.query.maxPrice ? parseFloat(req.query.maxPrice as string) : undefined,
    };

    const pagination = {
      page: parseInt(req.query.page as string) || 1,
      limit: parseInt(req.query.limit as string) || 50,
      sortBy: req.query.sortBy as string || 'price',
      sortOrder: (req.query.sortOrder as 'asc' | 'desc') || 'asc'
    };

    // Handle date parameter consistently
    let selectedDate = (req.query.date as string) || (req.query.dateFilter as string) || 'all';

    // Parse dateFilter if it's JSON stringified
    if (req.query.dateFilter && typeof req.query.dateFilter === 'string') {
      try {
        const parsed = JSON.parse(req.query.dateFilter);
        selectedDate = typeof parsed === 'string' ? parsed : parsed?.selectedDate || selectedDate;
      } catch (e) {
        // If parsing fails, use the raw value
        selectedDate = req.query.dateFilter as string;
      }
    }

    console.log('📦 Processing request:', { filters, pagination, selectedDate });

    const result = await productService.getProducts(filters, pagination, selectedDate);

    console.log('📦 Products API Response:', {
      productsCount: result.products?.length || 0,
      totalCount: result.totalCount || 0,
      selectedDate: selectedDate,
      hasSupplierData: !!result.products?.[0]?.supplier
    });

    // Consistent response structure
    res.json({
      products: result.products || [],
      total: result.totalCount || 0,
      page: result.page || pagination.page,
      limit: result.limit || pagination.limit,
      totalPages: Math.ceil((result.totalCount || 0) / pagination.limit),
      actualDate: result.actualDate || selectedDate,
      requestedDate: selectedDate,
      supplierContacts: result.supplierContacts || {},
      success: true
    });
  } catch (error) {
    console.error('❌ Products API Error:', error);
    res.status(500).json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to retrieve products',
      products: [],
      total: 0,
      page: 1,
      limit: 50
    });
  }
});

router.get('/stats', productsController.getStats);
router.get('/dates', productsController.getDates);
router.get('/search', productsController.searchProducts);
router.get('/suppliers', productsController.getSuppliers);
router.get('/colors', productsController.getColors);
router.get('/storage', productsController.getStorageOptions);
router.get('/export', productsController.exportProducts);
router.get('/:id', productsController.getProductById);

// Get storage options for a model  
router.get('/storage-options', async (req, res) => {
  try {
    const { model, date } = req.query;

    console.log('📊 Getting storage options for:', { model, date });

    const storageOptions = await productService.getStorageOptions(
      model as string,
      date as string
    );

    console.log('📊 Storage options result:', { 
      model, 
      optionsCount: storageOptions.length, 
      options: storageOptions 
    });

    res.json({
      storageOptions,
      model: model || null,
      date: date || null,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Storage options error:', error);
    res.status(500).json({ 
      error: 'Failed to get storage options',
      message: error.message 
    });
  }
});

// Get capacity options for a model
router.get('/capacity-options', async (req, res) => {
  try {
    const { model, date } = req.query;

    console.log('📊 Getting capacity options for:', { model, date });

    const capacityOptions = await productService.getCapacityOptions(
      model as string,
      date as string
    );

    console.log('📊 Capacity options result:', { 
      model, 
      optionsCount: capacityOptions.length, 
      options: capacityOptions 
    });

    res.json({
      capacityOptions,
      model: model || null,
      date: date || null,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Capacity options error:', error);
    res.status(500).json({ 
      error: 'Failed to get capacity options',
      message: error.message 
    });
  }
});

export { router as productRoutes };