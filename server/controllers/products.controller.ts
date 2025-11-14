import { Response, NextFunction } from 'express';
import { AuthenticatedRequest, FilterParams, PaginationParams } from '../types/express.types';
import { productService } from '../services/product.service';
import { logger } from '../utils/logger';

export class ProductsController {
  async getProducts(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      console.log('📦 Products API called with query:', req.query);
      
      // Special debug for iPhone 16 Pro Max searches
      if (filters.model && filters.model.toLowerCase().includes('iphone 16 pro max')) {
        console.log('🎯 SPECIAL DEBUG: iPhone 16 Pro Max search detected');
        console.log('🎯 Model filter:', filters.model);
        console.log('🎯 All filters:', filters);
        console.log('🎯 Selected date:', selectedDate);
      }

      const filters: FilterParams = {
        model: req.query.model as string,
        storage: req.query.storage as string,
        color: req.query.color as string,
        category: req.query.category as string,
        supplier: req.query.supplier as string || req.query.supplierFilter as string,
        minPrice: req.query.minPrice ? parseFloat(req.query.minPrice as string) : undefined,
        maxPrice: req.query.maxPrice ? parseFloat(req.query.maxPrice as string) : undefined,
      };

      const pagination: PaginationParams = {
        page: req.query.page ? parseInt(req.query.page as string) : 1,
        limit: req.query.limit ? parseInt(req.query.limit as string) : 999999, // No limit by default
        sortBy: req.query.sortBy as string || 'price',
        sortOrder: (req.query.sortOrder as 'asc' | 'desc') || 'asc'
      };

      // Get selected date from query params (check both 'date' and 'dateFilter')
      let selectedDate = (req.query.date as string) || (req.query.dateFilter as string);
      
      // Parse dateFilter if it's JSON stringified
      if (req.query.dateFilter && typeof req.query.dateFilter === 'string') {
        try {
          const parsed = JSON.parse(req.query.dateFilter);
          selectedDate = parsed;
        } catch (e) {
          // If parsing fails, use the raw value
          selectedDate = req.query.dateFilter as string;
        }
      }
      
      console.log('📅 Selected date from frontend:', selectedDate);
      console.log('📅 Available query params:', { date: req.query.date, dateFilter: req.query.dateFilter });
      console.log('📦 Processed filters:', filters);
      console.log('📦 Processed pagination:', pagination);

      const result = await productService.getProducts(filters, pagination, selectedDate);

      // --- DEBUG PHOENIX GABI ---
      if (selectedDate) {
        console.log(`🔍 [PHOENIX GABI DEBUG] Checking for PHOENIX GABI products on date: ${selectedDate}`);
        const phoenixProducts = result.products?.filter(product => {
          const supplierName = product.supplierName || 
                              (typeof product.supplier === 'string' ? product.supplier : product.supplier?.name) || '';
          return supplierName.toLowerCase().includes('phoenix') && supplierName.toLowerCase().includes('gabi');
        }) || [];
        console.log(`🔍 [PHOENIX GABI DEBUG] Found ${phoenixProducts.length} PHOENIX GABI products`);
        if (phoenixProducts.length > 0) {
          console.log(`🔍 [PHOENIX GABI DEBUG] Sample products:`, phoenixProducts.slice(0, 3));
        }
      }

      // --- INÍCIO DA MODIFICAÇÃO ---

      // Log para depuração: Vamos ver quem é o usuário e o que ele deveria receber.
      console.log(`[DEBUG] Verificando permissões para o usuário: ${req.user?.email}, Papel: ${req.user?.role}, Plano: ${req.user?.subscriptionPlan}`);
      console.log(`[DEBUG] Dados de contato dos fornecedores ANTES do filtro:`, result.supplierContacts ? 'Presente' : 'Ausente');

      // LÓGICA DE RESTRIÇÃO PARA TESTER (Vamos implementar isso corretamente agora)
      if (req.user?.subscriptionPlan === 'tester' || req.user?.role === 'tester') {
        console.log(`[SECURITY] Usuário é TESTER. Removendo dados de contato.`);
        // Remove o objeto de contatos geral
        delete result.supplierContacts;
        
        // Remove os dados de contato de cada produto individualmente
        result.products = result.products.map(product => {
          const { supplierContact, supplierPhone, supplierWhatsapp, ...restOfProduct } = product;
          return restOfProduct;
        });
      } else {
        console.log(`[SECURITY] Usuário é PRO ou Admin. Mantendo dados de contato.`);
      }

      console.log(`[DEBUG] Dados de contato dos fornecedores DEPOIS do filtro:`, result.supplierContacts ? 'Presente' : 'Ausente');

      // --- FIM DA MODIFICAÇÃO ---

      // Add logging to debug product loading issues
      logger.info(`📦 Products API Response: ${result.products?.length || 0} products found for date: ${selectedDate}`);

      // Get available dates from Google Sheets service
      let availableDates: string[] = [];

      try {
        const googleSheetsService = await import('../services/google-sheets-parser');
        const SHEET_ID = process.env.GOOGLE_SHEET_ID;
        if (SHEET_ID) {
          const sheetsData = await googleSheetsService.parseGoogleSheetWithDate(SHEET_ID);
          availableDates = sheetsData.availableSheets || [];
        }
        console.log('📅 Available sheets/dates:', availableDates);
      } catch (error) {
        console.error('❌ Error getting available dates:', error);
        availableDates = ['24-06', '23-06', '21-06', '20-06'];
      }

      console.log('📦 Products API Response:', {
        productsCount: result.products?.length || 0,
        totalCount: result.totalCount || 0,
        selectedDate: selectedDate,
        sampleProduct: result.products?.[0] || null,
        supplierInfo: result.products?.[0] ? {
          supplier: result.products[0].supplier,
          supplierName: result.products[0].supplierName,
          supplierType: typeof result.products[0].supplier
        } : null,
        availableDates: availableDates
      });

      res.json({
        ...result,
        selectedDate: selectedDate,
        availableDates: availableDates
      });
    } catch (error) {
      logger.error('Get products error:', error);
      console.error('❌ Products API Error:', error);
      next(error);
    }
  }

  async getDates(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      console.log('📅 Dates API called');

      let availableDates: string[] = [];

      try {
        const { googleSheetsService } = await import('../services/google-sheets');
        const SHEET_ID = process.env.GOOGLE_SHEET_ID;
        if (SHEET_ID) {
          // Get available sheets directly from Google Sheets service
          const availableSheets = await googleSheetsService.getAvailableSheets(SHEET_ID);
          availableDates = availableSheets.filter(sheet => /^\d{2}-\d{2}$/.test(sheet));

          // Sort dates properly (most recent first)
          availableDates.sort((a, b) => {
            const [dayA, monthA] = a.split('-').map(Number);
            const [dayB, monthB] = b.split('-').map(Number);

            // Compare by month first, then by day
            if (monthA !== monthB) return monthB - monthA;
            return dayB - dayA;
          });
        }
        console.log('📅 Available sheets/dates for API:', availableDates);
      } catch (error) {
        console.error('❌ Error getting available dates:', error);
        availableDates = ['25-06', '24-06', '23-06', '21-06', '20-06'];
      }

      res.json({
        dates: availableDates,
        success: true
      });
    } catch (error) {
      logger.error('Get dates error:', error);
      console.error('❌ Dates API Error:', error);
      next(error);
    }
  }

  async getStats(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      console.log('📊 Stats API called - fetching from Google Sheets');

      // Import Google Sheets services
      const { parseGoogleSheetWithDate } = await import('../services/google-sheets-parser');

      const SHEET_ID = process.env.GOOGLE_SHEET_ID;
      if (!SHEET_ID) {
        throw new Error('Google Sheet ID not configured');
      }

      // Get selected date from query params or use current date
      const selectedDate = req.query.date as string;
      const brandCategory = req.query.brandCategory as string;
      console.log(`📊 Fetching stats for selected date: ${selectedDate}, brand: ${brandCategory} (query param: ${req.query.date})`);

      const now = new Date();
      const currentDate = [
        String(now.getDate()).padStart(2, '0'),
        String(now.getMonth() + 1).padStart(2, '0')
      ].join('-');

      const dateToUse = selectedDate && selectedDate !== 'all' ? selectedDate : currentDate;
      console.log(`📊 Fetching stats for selected date: ${dateToUse} (query param: ${selectedDate})`);

      // Fetch data from Google Sheets
      let sheetsData;
      try {
        sheetsData = await parseGoogleSheetWithDate(SHEET_ID, dateToUse);
      } catch (error) {
        console.warn(`⚠️ Failed to fetch data for ${dateToUse}, trying latest available...`);
        sheetsData = await parseGoogleSheetWithDate(SHEET_ID);
      }

      if (!sheetsData || !sheetsData.products) {
        console.warn('⚠️ No data found in Google Sheets');
        return res.json({
          totalProducts: 0,
          availableProducts: 0,
          suppliersCount: 0,
          lastSync: new Date().toISOString(),
          dataSource: 'Google Sheets',
          date: dateToUse,
          requestedDate: selectedDate
        });
      }

      // Calculate statistics
      let allProducts = sheetsData.products;

      // Apply brand category filter if specified
      if (brandCategory && brandCategory !== 'all') {
        allProducts = allProducts.filter(product => {
          const modelLower = (product.model || '').toLowerCase();
          const brandLower = (product.brand || '').toLowerCase();
          const category = product.category || '';

          if (brandCategory === 'iphone') {
            // iPhone: only show IPH category
            return category === 'IPH' && (
              modelLower.includes('iphone') ||
              modelLower.includes('iph') ||
              brandLower.includes('apple')
            );
          } else if (brandCategory === 'xiaomi') {
            // Xiaomi: only show POCO, RDM, REAL, NOTE categories
            const xiaomiCategories = ['POCO', 'RDM', 'REAL', 'NOTE'];
            return xiaomiCategories.includes(category) && (
              modelLower.includes('xiaomi') ||
              modelLower.includes('redmi') ||
              modelLower.includes('poco') ||
              modelLower.includes('real') ||
              modelLower.includes('note') ||
              brandLower.includes('xiaomi')
            );
          }
          return true;
        });

        console.log(`📱 After brand filter (${brandCategory}): ${allProducts.length} products`);
      }

      const validProducts = allProducts.filter(product => {
        const price = parseFloat(product.price?.replace(/[^\d.-]/g, '') || '0');
        return !isNaN(price) && price > 0;
      });

      const totalProducts = validProducts.length;
      const availableProducts = validProducts.filter(p => p.available !== false).length;
      const suppliersCount = sheetsData.suppliers ? sheetsData.suppliers.length : 0;

      const stats = {
        totalProducts,
        availableProducts,
        suppliersCount,
        lastSync: new Date().toISOString(),
        dataSource: 'Google Sheets',
        date: dateToUse,
        requestedDate: selectedDate
      };

      console.log('📊 Stats calculated for date:', dateToUse, stats);

      res.json(stats);
    } catch (error) {
      logger.error('Get stats error:', error);
      console.error('❌ Stats API Error:', error);
      next(error);
    }
  }

  async searchProducts(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { query } = req.query;

      if (!query || typeof query !== 'string' || query.length < 2) {
        res.setHeader('Content-Type', 'application/json');
        return res.status(400).json({ 
          success: false,
          error: 'Query deve ter pelo menos 2 caracteres' 
        });
      }

      const result = await productService.searchProducts(query.trim());
      res.json(result);
    } catch (error) {
      logger.error('Search products error:', error);
      next(error);
    }
  }

  async getProductById(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const productId = parseInt(id);

      if (isNaN(productId)) {
        res.setHeader('Content-Type', 'application/json');
        return res.status(400).json({ 
          success: false,
          error: 'ID do produto inválido' 
        });
      }

      const product = await productService.getProductById(productId);

      if (!product) {
        res.setHeader('Content-Type', 'application/json');
        return res.status(404).json({ 
          success: false,
          error: 'Produto não encontrado' 
        });
      }

      res.json(product);
    } catch (error) {
      logger.error('Get product by ID error:', error);
      next(error);
    }
  }

  async getSuppliers(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const suppliers = await productService.getSuppliers();
      res.json(suppliers);
    } catch (error) {
      logger.error('Get suppliers error:', error);
      next(error);
    }
  }

  async getColors(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const model = req.query.model as string;
      const selectedDate = req.query.date as string;
      const storage = req.query.storage as string;
      const capacity = req.query.capacity as string;
      
      // Build additional filters object
      const additionalFilters: { storage?: string; capacity?: string } = {};
      if (storage && storage !== 'all') {
        additionalFilters.storage = storage;
      }
      if (capacity && capacity !== 'all') {
        additionalFilters.capacity = capacity;
      }
      
      console.log('🎨 Colors controller called with:', { model, selectedDate, additionalFilters });
      
      const colors = await productService.getColors(model, selectedDate, Object.keys(additionalFilters).length > 0 ? additionalFilters : undefined);
      
      console.log('🎨 Colors response:', { model, colorsCount: colors.length, colors: colors.slice(0, 5), filters: additionalFilters });
      
      res.json({ colors });
    } catch (error) {
      logger.error('Get colors error:', error);
      next(error);
    }
  }

  async getStorageOptions(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const model = req.query.model as string;
      const selectedDate = req.query.date as string;
      
      console.log('💾 Storage options controller called with:', { model, selectedDate });
      
      const storageOptions = await productService.getStorageOptions(model, selectedDate);
      
      console.log('💾 Storage options response:', { model, optionsCount: storageOptions.length, options: storageOptions.slice(0, 5) });
      
      res.json({ storageOptions });
    } catch (error) {
      logger.error('Get storage options error:', error);
      next(error);
    }
  }

  async getCapacityOptions(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const model = req.query.model as string;
      const selectedDate = req.query.date as string;
      
      console.log('💾 Capacity options controller called with:', { model, selectedDate });
      
      const capacityOptions = await productService.getCapacityOptions(model, selectedDate);
      
      console.log('💾 Capacity options response:', { model, optionsCount: capacityOptions.length, options: capacityOptions.slice(0, 5) });
      
      res.json({ capacityOptions });
    } catch (error) {
      logger.error('Get capacity options error:', error);
      next(error);
    }
  }

  async exportProducts(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const filters: FilterParams = {
        model: req.query.model as string,
        storage: req.query.storage as string,
        color: req.query.color as string,
        category: req.query.category as string,
        supplier: req.query.supplier as string,
        minPrice: req.query.minPrice ? parseFloat(req.query.minPrice as string) : undefined,
        maxPrice: req.query.maxPrice ? parseFloat(req.query.maxPrice as string) : undefined,
      };

      const format = req.query.format as string || 'csv';
      const result = await productService.exportProducts(filters, format);

      res.setHeader('Content-Type', format === 'xlsx' ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' : 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=products.${format}`);
      res.send(result);
    } catch (error) {
      logger.error('Export products error:', error);
      next(error);
    }
  }
}

export const productsController = new ProductsController();