import { db } from '../db';
import { products, suppliers } from '../../shared/schema';
import { eq, like, and, or, desc, asc, sql, inArray, ilike } from 'drizzle-orm';
import { FilterParams, PaginationParams } from '../types/express.types';
import { logger } from '../utils/logger';
import * as XLSX from 'xlsx';

// Helper function to apply exact iPhone model filtering
function applyExactModelFilter(products: any[], modelFilter: string): any[] {
  const modelLower = modelFilter.toLowerCase().trim();
  console.log('🔍 Applying exact model filter:', modelLower);

  // Check if it's a simple number search (like "11", "12", "13", "14", "15", "16") 
  const simpleNumberMatch = modelLower.match(/^(\d{1,2})$/);

  if (simpleNumberMatch) {
    const number = simpleNumberMatch[1];
    console.log('🎯 Simple iPhone number detected, applying STRICT exact model matching:', number);

    // For simple number searches, we need to be extremely restrictive
    // Only match the exact base iPhone model, not Pro/Max/Plus/Mini/E/SE variants
    return products.filter(product => {
      const productModel = (product.model || '').toLowerCase().trim();
      const category = (product.category || '').toUpperCase();

      // Must be iPhone category
      if (category !== 'IPH' && !productModel.includes('iphone')) {
        return false;
      }

      // STRICT: Only match exact base iPhone model (e.g., "iPhone 16")
      // Exclude ALL variants: Pro, Max, Plus, Mini, E, SE, and any other letter/word combinations
      const exactBasePattern = new RegExp(`^iphone\\s*${number}(?!\\s*[a-z]|\\s*(pro|max|plus|mini|e|se))(?:\\s|$)`, 'i');
      const matched = exactBasePattern.test(productModel);

      if (matched) {
        console.log('✅ STRICT exact base iPhone matched:', productModel);
      } else {
        console.log('❌ Filtered out variant:', productModel);
      }
      return matched;
    });
  } else {
    // Check if it's an iPhone search with full model name
    const iphoneMatch = modelLower.match(/^iphone\s*(\d+)([a-z]*)?(\s+pro)?(\s+max|\s+plus|\s+mini|\s+se)?$/i);

    if (iphoneMatch) {
      const number = iphoneMatch[1];
      const variant = iphoneMatch[2] || '';
      const pro = iphoneMatch[3] || '';
      const size = iphoneMatch[4] || '';

      console.log('🎯 iPhone ENHANCED search - showing ALL variants for specific model:', { number, variant, pro, size, originalSearch: modelLower });

      return products.filter(product => {
        const productModel = (product.model || '').toLowerCase().trim();
        const category = (product.category || '').toUpperCase();

        // Must be iPhone category
        if (category !== 'IPH' && !productModel.includes('iphone')) {
          return false;
        }

        // For "iPhone 16 Pro Max" searches, be MUCH more inclusive
        if (pro && size && size.includes('max')) {
          // Match ANY iPhone with the number that contains BOTH "pro" AND "max"
          const inclusivePattern = new RegExp(`iphone\\s*${number}.*pro.*max`, 'i');
          const matched = inclusivePattern.test(productModel);
          
          if (matched) {
            console.log('✅ INCLUSIVE iPhone Pro Max matched:', productModel);
          } else {
            console.log('❌ iPhone Pro Max NOT matched:', productModel);
          }
          return matched;
        }

        if (!variant && !pro && !size) {
          // Base iPhone model - STRICT: should match ONLY "iPhone 16" and exclude ALL variants
          const strictBasePattern = new RegExp(`^iphone\\s*${number}(?!\\s*[a-z]|\\s*(pro|max|plus|mini|e|se))(?:\\s|$)`, 'i');
          const matched = strictBasePattern.test(productModel);
          if (matched) {
            console.log('✅ STRICT base iPhone matched:', productModel);
          } else {
            console.log('❌ STRICT filtering excluded variant:', productModel);
          }
          return matched;
        } else if (variant && !pro && !size) {
          // Handle specific variants like iPhone 16e - exact matching
          const variantPattern = new RegExp(`^iphone\\s*${number}${variant}(?!\\s*(pro|max|plus|mini|se))(?:\\s|$)`, 'i');
          const matched = variantPattern.test(productModel);
          if (matched) {
            console.log('✅ iPhone variant matched:', productModel);
          }
          return matched;
        } else if (pro && !size) {
          // For "iPhone 16 Pro" (without Max) - be more inclusive but exclude Max
          const inclusiveProPattern = new RegExp(`iphone\\s*${number}.*pro(?!.*max)`, 'i');
          const matched = inclusiveProPattern.test(productModel);
          if (matched) {
            console.log('✅ INCLUSIVE iPhone Pro matched:', productModel);
          }
          return matched;
        } else {
          // Other variant iPhone models - be more inclusive
          let inclusivePattern = `iphone\\s*${number}`;
          if (variant) inclusivePattern += `.*${variant}`;
          if (pro) inclusivePattern += '.*pro';
          if (size) {
            const sizeNormalized = size.trim().toLowerCase();
            if (sizeNormalized.includes('plus')) {
              inclusivePattern += '.*plus';
            } else if (sizeNormalized.includes('max')) {
              inclusivePattern += '.*max';
            } else if (sizeNormalized.includes('mini')) {
              inclusivePattern += '.*mini';
            } else if (sizeNormalized.includes('se')) {
              inclusivePattern += '.*se';
            }
          }
          
          const inclusiveRegex = new RegExp(inclusivePattern, 'i');
          const matched = inclusiveRegex.test(productModel);
          if (matched) {
            console.log('✅ INCLUSIVE iPhone variant matched:', productModel);
          }
          return matched;
        }
      });
    } else {
      // For non-iPhone searches, use regular partial matching
      return products.filter(product => {
        const productModel = (product.model || '').toLowerCase();
        return productModel.includes(modelLower);
      });
    }
  }
}

export interface ProductResult {
  products: any[];
  totalCount: number;
  page: number;
  limit: number;
  totalPages: number;
}

interface ProductFilters {
  model?: string;
  storage?: string;
  color?: string;
  category?: string;
  supplier?: string;
  minPrice?: number;
  maxPrice?: number;
  lowestPrices?: boolean;
}

class ProductService {
  async getProducts(filters: FilterParams, pagination: PaginationParams, selectedDate?: string): Promise<{
    products: any[];
    totalCount: number;
    totalPages: number;
    page: number;
    limit: number;
    actualDate?: string;
    requestedDate?: string;
    supplierContacts?: Record<string, string>;
  }> {
    console.log('🔍 ProductService.getProducts called with:', { filters, pagination, selectedDate });
    try {
      

      // Import Google Sheets services
      const { parseGoogleSheetWithDate } = await import('./google-sheets-parser');

      const SHEET_ID = process.env.GOOGLE_SHEET_ID;
      if (!SHEET_ID) {
        throw new Error('Google Sheet ID not configured');
      }

      // Fix: Handle date parameter properly with cleaning
      let dateToUse: string;
      let actualDate: string;

      if (selectedDate && typeof selectedDate === 'string' && selectedDate !== 'all') {
        // Clean any extra quotes or whitespace
        dateToUse = selectedDate.replace(/^["']|["']$/g, '').trim();
        actualDate = dateToUse;
        console.log(`📅 Using cleaned selected date: "${dateToUse}" (original: "${selectedDate}")`);
      } else {
        // Use current date as fallback
        const now = new Date();
        dateToUse = [
          String(now.getDate()).padStart(2, '0'),
          String(now.getMonth() + 1).padStart(2, '0')
        ].join('-');
        actualDate = dateToUse;
        console.log(`📅 Using current date as fallback: "${dateToUse}"`);
      }

      console.log(`📊 Fetching products from Google Sheets for date: ${dateToUse} (selected: ${selectedDate})`);

      // Fetch data from Google Sheets
      let sheetsData;
      try {
        sheetsData = await parseGoogleSheetWithDate(SHEET_ID, dateToUse);
        actualDate = dateToUse; // Set actualDate to the requested date if fetch is successful
      } catch (error) {
        console.warn(`⚠️ Failed to fetch data for ${dateToUse}:`, error);

        // Get available dates for better error message
        try {
          const { googleSheetsService } = await import('./google-sheets');
          const availableSheets = await googleSheetsService.getAvailableSheets(SHEET_ID);
          const availableDates = availableSheets.filter(sheet => /^\d{2}-\d{2}$/.test(sheet));

          throw new Error(`Data not available for date ${dateToUse}. Available dates: ${availableDates.join(', ')}`);
        } catch (innerError) {
          throw new Error(`Data not available for date ${dateToUse}. Please select a different date.`);
        }
      }

      if (!sheetsData || !sheetsData.products || sheetsData.products.length === 0) {
        console.warn('⚠️ No products found in Google Sheets');
        return {
          products: [],
          totalCount: 0,
          page: pagination.page || 1,
          limit: pagination.limit || 50,
          totalPages: 0,
          actualDate,
          requestedDate: selectedDate
        };
      }

      console.log(`📊 Found ${sheetsData.products.length} products in Google Sheets`);

      // Apply filters to Google Sheets data
      let filteredProducts = sheetsData.products;

      if (filters.model) {
        filteredProducts = applyExactModelFilter(filteredProducts, filters.model);
      }

      if (filters.storage) {
        filteredProducts = filteredProducts.filter(product =>
          product.storage?.toLowerCase().includes(filters.storage!.toLowerCase())
        );
      }

      if (filters.color) {
        filteredProducts = filteredProducts.filter(product =>
          product.color?.toLowerCase().includes(filters.color!.toLowerCase())
        );
      }

      if (filters.category) {
        filteredProducts = filteredProducts.filter(product =>
          product.category?.toLowerCase().includes(filters.category!.toLowerCase())
        );
      }

      // Apply supplier filter (exact match for supplier modal)
      if (filters.supplier) {
        const supplierFilter = filters.supplier.toLowerCase().trim();
        
        // Debug: Log all unique suppliers in data
        const allSuppliers = [...new Set(filteredProducts.map(product => {
          return product.supplierName || 
                 (typeof product.supplier === 'string' ? product.supplier : product.supplier?.name) || 
                 'N/A';
        }))];
        console.log(`🔍 All suppliers in data for date ${dateToUse}:`, allSuppliers.slice(0, 20));
        
        // Check for PHOENIX GABI specifically
        const phoenixProducts = filteredProducts.filter(product => {
          const supplierName = product.supplierName || 
                              (typeof product.supplier === 'string' ? product.supplier : product.supplier?.name) || '';
          return supplierName.toLowerCase().includes('phoenix') && supplierName.toLowerCase().includes('gabi');
        });
        console.log(`🔍 PHOENIX GABI products found: ${phoenixProducts.length}`);
        if (phoenixProducts.length > 0) {
          console.log(`🔍 Sample PHOENIX GABI products:`, phoenixProducts.slice(0, 3).map(p => ({
            model: p.model,
            supplier: p.supplierName || p.supplier?.name || p.supplier,
            date: p.date || 'no date'
          })));
        }
        
        filteredProducts = filteredProducts.filter(product => {
          const supplierName = product.supplierName?.toLowerCase().trim() || '';
          const supplierObj = typeof product.supplier === 'string' 
            ? product.supplier.toLowerCase().trim() 
            : product.supplier?.name?.toLowerCase().trim() || '';

          // Exact match for supplier name
          return supplierName === supplierFilter || supplierObj === supplierFilter;
        });

        console.log(`🔍 Supplier filter applied for "${filters.supplier}": ${filteredProducts.length} products found`);
      }

      if (filters.minPrice) {
        filteredProducts = filteredProducts.filter(product => {
          const price = parseFloat(product.price?.replace(/[^\d.-]/g, '') || '0');
          return price >= filters.minPrice!;
        });
      }

      if (filters.maxPrice) {
        filteredProducts = filteredProducts.filter(product => {
          const price = parseFloat(product.price?.replace(/[^\d.-]/g, '') || '0');
          return price <= filters.maxPrice!;
        });
      }

      // Apply sorting
      const { sortBy = 'price', sortOrder = 'asc' } = pagination;

      filteredProducts.sort((a, b) => {
        let aValue, bValue;

        if (sortBy === 'price') {
          aValue = parseFloat(a.price?.replace(/[^\d.-]/g, '') || '0');
          bValue = parseFloat(b.price?.replace(/[^\d.-]/g, '') || '0');
        } else {
          aValue = a[sortBy as keyof typeof a] || '';
          bValue = b[sortBy as keyof typeof b] || '';

          if (typeof aValue === 'string' && typeof bValue === 'string') {
            aValue = aValue.toLowerCase();
            bValue = bValue.toLowerCase();
          }
        }

        if (sortOrder === 'desc') {
          return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
        } else {
          return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
        }
      });

      // Apply pagination to Google Sheets data - implementar limite real para performance
      const page = pagination.page || 1;
      const limit = pagination.limit || 100; // Limite padrão de 100 produtos para performance
      const offset = (page - 1) * limit;
      const paginatedProducts = filteredProducts.slice(offset, offset + limit);
      const totalPages = Math.ceil(filteredProducts.length / limit);

      console.log(`📦 Returning ${paginatedProducts.length} products (page ${page}/${totalPages}) for date: ${actualDate}`);

      return {
        products: paginatedProducts,
        totalCount: filteredProducts.length,
        page,
        limit,
        totalPages,
        actualDate,
        requestedDate: selectedDate,
        supplierContacts: sheetsData.supplierContacts || {}
      };
    } catch (error) {
      logger.error('Get products error:', error);
      console.error('❌ ProductService.getProducts error:', error);
      throw error;
    }
  }

  async searchProducts(query: string, selectedDate?: string): Promise<any[]> {
    try {
      console.log('🔍 ProductService.searchProducts called with query:', query, 'date:', selectedDate);

      // Import Google Sheets services
      const { parseGoogleSheetWithDate } = await import('./google-sheets-parser');

      const SHEET_ID = process.env.GOOGLE_SHEET_ID;
      if (!SHEET_ID) {
        throw new Error('Google Sheet ID not configured');
      }

      // Use selected date or current date as fallback
      const now = new Date();
      const currentDate = [
        String(now.getDate()).padStart(2, '0'),
        String(now.getMonth() + 1).padStart(2, '0')
      ].join('-');

      const dateToUse = selectedDate && selectedDate !== 'all' ? selectedDate : currentDate;

      // Fetch data from Google Sheets
      let sheetsData;
      try {
        sheetsData = await parseGoogleSheetWithDate(SHEET_ID, dateToUse);
      } catch (error) {
        console.warn(`⚠️ Failed to fetch data for ${dateToUse}, using fallback:`, error);
        sheetsData = await parseGoogleSheetWithDate(SHEET_ID, 'all');
      }

      if (!sheetsData || !sheetsData.products) {
        return [];
      }

      const searchTerms = query.toLowerCase().split(' ').filter(term => term.length > 1);

      const results = sheetsData.products.filter(product => {
        return searchTerms.some(term =>
          product.model?.toLowerCase().includes(term) ||
          product.brand?.toLowerCase().includes(term) ||
          product.category?.toLowerCase().includes(term) ||
          product.color?.toLowerCase().includes(term) ||
          product.storage?.toLowerCase().includes(term) ||
          product.supplier?.toLowerCase().includes(term)
        );
      });

      // Sort by price (ascending)
      results.sort((a, b) => {
        const priceA = parseFloat(a.price?.replace(/[^\d.-]/g, '') || '0');
        const priceB = parseFloat(b.price?.replace(/[^\d.-]/g, '') || '0');
        return priceA - priceB;
      });

      return results; // Return all results without limit
    } catch (error) {
      logger.error('Search products error:', error);
      throw error;
    }
  }

  async getProductById(id: number): Promise<any | null> {
    try {
      const [product] = await db
        .select()
        .from(products)
        .where(eq(products.id, id))
        .limit(1);

      return product || null;
    } catch (error) {
      logger.error('Get product by ID error:', error);
      throw error;
    }
  }

  async getSuppliers(selectedDate?: string): Promise<any[]> {
    try {
      console.log('🔍 ProductService.getSuppliers - fetching from Google Sheets for date:', selectedDate);

      // Import Google Sheets services
      const { parseGoogleSheetWithDate } = await import('./google-sheets-parser');

      const SHEET_ID = process.env.GOOGLE_SHEET_ID;
      if (!SHEET_ID) {
        throw new Error('Google Sheet ID not configured');
      }

      // Use selected date or current date as fallback
      const now = new Date();
      const currentDate = [
        String(now.getDate()).padStart(2, '0'),
        String(now.getMonth() + 1).padStart(2, '0')
      ].join('-');

      const dateToUse = selectedDate && selectedDate !== 'all' ? selectedDate : 'all';

      // Fetch data from Google Sheets
      let sheetsData;
      try {
        sheetsData = await parseGoogleSheetWithDate(SHEET_ID, dateToUse);
      } catch (error) {
        console.warn(`⚠️ Failed to fetch suppliers for ${dateToUse}:`, error);
        throw error;
      }

      if (!sheetsData || !sheetsData.suppliers) {
        console.warn('⚠️ No suppliers found in Google Sheets');
        return [];
      }

      // Create a stable hash function for supplier IDs
      const generateSupplierId = (name: string): number => {
        let hash = 0;
        for (let i = 0; i < name.length; i++) {
          const char = name.charCodeAt(i);
          hash = ((hash << 5) - hash) + char;
          hash = hash & hash; // Convert to 32bit integer
        }
        return Math.abs(hash);
      };

      // Convert suppliers array to expected format with consistent IDs
      const suppliersList = sheetsData.suppliers.map((supplier: string) => ({
        id: generateSupplierId(supplier),
        name: supplier,
        active: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }));

      console.log(`📊 Found ${suppliersList.length} suppliers in Google Sheets`);
      return suppliersList;
    } catch (error) {
      logger.error('Get suppliers error:', error);

      // Fallback to database if Google Sheets fails
      try {
        const suppliersList = await db
          .select()
          .from(suppliers)
          .where(eq(suppliers.active, true))
          .orderBy(asc(suppliers.name));

        return suppliersList;
      } catch (dbError) {
        logger.error('Fallback suppliers query error:', dbError);
        return [];
      }
    }
  }

  async getColors(model?: string, date?: string, additionalFilters?: { storage?: string; capacity?: string }): Promise<string[]> {
    try {
      console.log('🎨 ProductService.getColors called with:', { model, date, additionalFilters });

      // Import Google Sheets services
      const { parseGoogleSheetWithDate } = await import('./google-sheets-parser');

      const SHEET_ID = process.env.GOOGLE_SHEET_ID;
      if (!SHEET_ID) {
        throw new Error('Google Sheet ID not configured');
      }

      // Use selected date or 'all' as fallback
      const dateToUse = date && date !== 'all' ? date : 'all';

      // Fetch data from Google Sheets
      let sheetsData;
      try {
        sheetsData = await parseGoogleSheetWithDate(SHEET_ID, dateToUse);
      } catch (error) {
        console.warn(`⚠️ Failed to fetch colors for ${dateToUse}:`, error);
        return [];
      }

      if (!sheetsData || !sheetsData.products) {
        return [];
      }

      let products = sheetsData.products;

      // Apply precise model filtering if provided
      if (model) {
        products = applyExactModelFilter(products, model);
      }

      // Apply additional filters if provided (storage, capacity)
      if (additionalFilters) {
        if (additionalFilters.storage) {
          products = products.filter(product => {
            const productStorage = (product.storage || '').toLowerCase();
            return productStorage.includes(additionalFilters.storage!.toLowerCase());
          });
        }

        if (additionalFilters.capacity) {
          products = products.filter(product => {
            const productCapacity = (product.capacity || '').toLowerCase();
            return productCapacity.includes(additionalFilters.capacity!.toLowerCase());
          });
        }
      }

      // Extract unique colors with strict validation
      const colors = [...new Set(
        products
          .map(product => product.color)
          .filter(color => 
            color && 
            color.trim() && 
            color.trim() !== 'undefined' && 
            color.trim() !== 'null' &&
            color.trim() !== ''
          )
      )].sort();

      console.log(`🎨 Found ${colors.length} unique colors for model "${model}" with filters:`, { colors, additionalFilters });

      if (colors.length === 0 && model) {
        console.warn(`⚠️ No colors found for exact model "${model}" - this means the exact filtering is working correctly`);
        console.log(`🎨 Available models in data:`, [...new Set(products.map(p => p.model))].slice(0, 10));
      }

      return colors;
    } catch (error) {
      console.error('❌ Error in ProductService.getColors:', error);
      throw error;
    }
  }

  async getStorageOptions(model?: string, selectedDate?: string): Promise<string[]> {
    try {
      console.log('🔍 ProductService.getStorageOptions called with model:', model, 'date:', selectedDate);

      // Import Google Sheets services
      const { parseGoogleSheetWithDate } = await import('./google-sheets-parser');

      const SHEET_ID = process.env.GOOGLE_SHEET_ID;
      if (!SHEET_ID) {
        throw new Error('Google Sheet ID not configured');
      }

      // Use selected date or 'all' as fallback
      const dateToUse = selectedDate && selectedDate !== 'all' ? selectedDate : 'all';

      // Fetch data from Google Sheets
      let sheetsData;
      try {
        sheetsData = await parseGoogleSheetWithDate(SHEET_ID, dateToUse);
      } catch (error) {
        console.warn(`⚠️ Failed to fetch storage options for ${dateToUse}:`, error);
        return [];
      }

      if (!sheetsData || !sheetsData.products) {
        return [];
      }

      let products = sheetsData.products;

      // Apply precise model filtering if provided using the same exact matching logic
      if (model) {
        console.log('🎯 Applying EXACT model filter for storage options:', model);
        products = applyExactModelFilter(products, model);
        console.log(`🎯 After exact model filtering: ${products.length} products found for storage options`);
      }

      // Extract unique storage options with strict validation
      const storageOptions = [...new Set(
        products
          .map(product => product.storage)
          .filter(storage => 
            storage && 
            storage.trim() && 
            storage.trim() !== 'undefined' && 
            storage.trim() !== 'null' &&
            storage.trim() !== ''
          )
      )].sort();

      console.log(`💾 Found ${storageOptions.length} EXACT storage options for model "${model}":`, storageOptions);

      if (storageOptions.length === 0 && model) {
        console.warn(`⚠️ No storage options found for exact model "${model}" - this means the exact filtering is working correctly`);
        console.log(`💾 Available models in data:`, [...new Set(products.map(p => p.model))].slice(0, 10));
      }

      return storageOptions;
    } catch (error) {
      logger.error('Get storage options error:', error);
      return [];
    }
  }

  async getCapacityOptions(model?: string, selectedDate?: string): Promise<string[]> {
    try {
      console.log('🔍 ProductService.getCapacityOptions called with model:', model, 'date:', selectedDate);

      // Import Google Sheets services
      const { parseGoogleSheetWithDate } = await import('./google-sheets-parser');

      const SHEET_ID = process.env.GOOGLE_SHEET_ID;
      if (!SHEET_ID) {
        throw new Error('Google Sheet ID not configured');
      }

      // Use selected date or 'all' as fallback
      const dateToUse = selectedDate && selectedDate !== 'all' ? selectedDate : 'all';

      // Fetch data from Google Sheets
      let sheetsData;
      try {
        sheetsData = await parseGoogleSheetWithDate(SHEET_ID, dateToUse);
      } catch (error) {
        console.warn(`⚠️ Failed to fetch capacity options for ${dateToUse}:`, error);
        return [];
      }

      if (!sheetsData || !sheetsData.products) {
        console.log('⚠️ No products data found for capacity options');
        return [];
      }

      let products = sheetsData.products;
      console.log(`📊 Total products before filtering: ${products.length}`);

      // Apply model filtering with VERY INCLUSIVE logic for capacity options
      if (model) {
        console.log('🎯 Applying SUPER INCLUSIVE model filter for capacity options:', model);
        const beforeCount = products.length;
        
        const modelLower = model.toLowerCase().trim();
        
        // For iPhone 16 Pro Max specifically, be EXTREMELY inclusive
        if (modelLower.includes('iphone') && modelLower.includes('16') && modelLower.includes('pro') && modelLower.includes('max')) {
          console.log('🎯 SPECIAL CASE: iPhone 16 Pro Max - using MAXIMUM inclusiveness');
          
          const beforeFilter = products.length;
          console.log('📊 Before iPhone 16 Pro Max filter:', beforeFilter, 'products');
          
          // First, log all iPhone 16 Pro Max products to see what we have
          const allIPhone16ProMax = products.filter(product => {
            const productModel = (product.model || '').toLowerCase().trim();
            return productModel.includes('iphone') && productModel.includes('16') && productModel.includes('pro') && productModel.includes('max');
          });
          
          console.log('📊 All iPhone 16 Pro Max found in data:', allIPhone16ProMax.length);
          console.log('📊 Sample iPhone 16 Pro Max products:', allIPhone16ProMax.slice(0, 10).map(p => ({
            model: p.model,
            storage: p.storage,
            capacity: p.capacity,
            color: p.color,
            supplier: p.supplierName || p.supplier?.name || p.supplier
          })));
          
          products = products.filter(product => {
            const productModel = (product.model || '').toLowerCase().trim();
            
            // Match ANY product that has iPhone AND 16 AND Pro AND Max (more flexible)
            const hasIPhone = productModel.includes('iphone') || productModel.includes('iph');
            const has16 = productModel.includes('16');
            const hasPro = productModel.includes('pro');
            const hasMax = productModel.includes('max');
            
            const matched = hasIPhone && has16 && hasPro && hasMax;
            
            if (matched) {
              console.log('✅ SUPER INCLUSIVE iPhone 16 Pro Max matched:', productModel, {
                storage: product.storage,
                capacity: product.capacity,
                color: product.color
              });
            }
            
            return matched;
          });
          
          console.log('📊 After iPhone 16 Pro Max filter:', products.length, 'products (filtered from', beforeFilter, ')');
        } else {
          // For other models, use enhanced but less aggressive filtering
          products = products.filter(product => {
            const productModel = (product.model || '').toLowerCase().trim();
            
            // For iPhone searches, use broader matching for capacity discovery
            if (modelLower.includes('iphone') || modelLower.match(/^\d+$/)) {
              // Check if product model contains the iPhone number
              const searchNumber = modelLower.match(/(\d+)/)?.[1];
              if (searchNumber) {
                return productModel.includes('iphone') && productModel.includes(searchNumber);
              }
            }
            
            // For non-iPhone searches, use partial matching
            return productModel.includes(modelLower);
          });
        }
        
        console.log(`🎯 After SUPER INCLUSIVE model filtering: ${products.length} products (filtered from ${beforeCount})`);

        // Log sample of filtered products for debugging
        if (products.length > 0) {
          console.log('🎯 Sample filtered products for capacity discovery:', products.slice(0, 10).map(p => ({ 
            model: p.model, 
            capacity: p.capacity,
            storage: p.storage 
          })));
        }
      }

      // Extract unique capacity options with enhanced extraction
      const capacityOptions = [...new Set(
        products
          .map(product => {
            // Handle both capacity and storage fields for backward compatibility
            // Try multiple field names that might contain capacity/storage info
            const cap = product.capacity || product.storage || product.memory || product.size;
            return cap;
          })
          .filter(capacity => 
            capacity && 
            capacity.toString().trim() && 
            capacity.toString().trim() !== 'undefined' && 
            capacity.toString().trim() !== 'null' &&
            capacity.toString().trim() !== '' &&
            capacity.toString().trim() !== 'N/A'
          )
      )].sort((a, b) => {
        // Sort numerically if possible, otherwise alphabetically
        const numA = parseInt(a.toString().replace(/[^\d]/g, ''));
        const numB = parseInt(b.toString().replace(/[^\d]/g, ''));

        if (!isNaN(numA) && !isNaN(numB)) {
          return numA - numB;
        }

        return a.toString().localeCompare(b.toString());
      });

      console.log(`💾 Found ${capacityOptions.length} SUPER INCLUSIVE capacity options for model "${model}":`, capacityOptions);

      if (capacityOptions.length === 0 && model) {
        console.warn(`⚠️ No capacity options found for model "${model}"`);
        console.log(`💾 ENHANCED Debug info:`, {
          totalProductsAfterFiltering: products.length,
          sampleProducts: products.slice(0, 10).map(p => ({
            model: p.model,
            capacity: p.capacity,
            storage: p.storage,
            memory: p.memory,
            size: p.size
          })),
          allCapacityValues: products.slice(0, 20).map(p => p.capacity),
          allStorageValues: products.slice(0, 20).map(p => p.storage),
          uniqueModels: [...new Set(products.map(p => p.model))].slice(0, 10)
        });
      }

      return capacityOptions;
    } catch (error) {
      logger.error('Get capacity options error:', error);
      return [];
    }
  }

  async exportProducts(filters: ProductFilters, format: string): Promise<Buffer | string> {
    try {
      // Get products using the same logic as getProducts but without pagination
      const allProductsResult = await this.getProducts(filters, { 
        page: 1, 
        limit: 999999, 
        sortBy: 'price', 
        sortOrder: 'asc' 
      });

      const results = allProductsResult.products;

      if (format === 'xlsx') {
        const worksheet = XLSX.utils.json_to_sheet(results);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Products');
        return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
      } else {
        // CSV format
        if (results.length === 0) {
          return 'No data available';
        }

        const headers = Object.keys(results[0]).join(',');
        const rows = results.map(row => Object.values(row).join(','));
        return [headers, ...rows].join('\n');
      }
    } catch (error) {
      logger.error('Export products error:', error);
      throw error;
    }
  }
}

export const productService = new ProductService();