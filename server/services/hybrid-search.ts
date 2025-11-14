import { SearchEngine, SearchFilters, ProductSearchResult } from './search-engine';
import { parseGoogleSheetWithDate } from './google-sheets-parser';
import CacheService from './cache-service';

export interface HybridSearchOptions {
  useDatabase?: boolean;
  useGoogleSheets?: boolean;
  preferredSource?: 'database' | 'sheets' | 'hybrid';
  fallbackEnabled?: boolean;
}

export class HybridSearchService {
  private searchEngine: SearchEngine;

  constructor() {
    this.searchEngine = SearchEngine.getInstance();
  }

  /**
   * Perform hybrid search across database and Google Sheets
   */
  async search(
    filters: SearchFilters, 
    options: HybridSearchOptions = {}
  ): Promise<ProductSearchResult> {
    const {
      useDatabase = true,
      useGoogleSheets = true,
      preferredSource = 'hybrid',
      fallbackEnabled = true
    } = options;

    const startTime = Date.now();

    try {
      // Determine search strategy based on preferences and data availability
      switch (preferredSource) {
        case 'database':
          return await this.searchDatabase(filters, useGoogleSheets && fallbackEnabled);

        case 'sheets':
          return await this.searchGoogleSheets(filters, useDatabase && fallbackEnabled);

        case 'hybrid':
        default:
          return await this.searchHybrid(filters);
      }
    } catch (error) {
      console.error('❌ Hybrid search error:', error);
      throw error;
    }
  }

  /**
   * Search primarily in database with optional fallback to Google Sheets
   */
  private async searchDatabase(filters: SearchFilters, allowFallback: boolean = true): Promise<ProductSearchResult> {
    try {
      // Generate cache key for database search
      const cacheKey = CacheService.generateSearchKey({ ...filters, source: 'database' });
      
      // Try to get from cache first
      const cachedResult = await CacheService.get<ProductSearchResult>(cacheKey);
      if (cachedResult) {
        console.log(`✅ Cache HIT for database search: ${cacheKey}`);
        return cachedResult;
      }

      console.log(`⚠️ Cache MISS for database search: ${cacheKey}`);
      console.log('🔍 Searching in PostgreSQL database...');
      const result = await this.searchEngine.searchProducts(filters);

      // If database has results or fallback is disabled, return database results
      if (result.total > 0 || !allowFallback) {
        console.log(`✅ Database search completed: ${result.total} products found`);
        
        // Cache the result for 5 minutes (300 seconds)
        await CacheService.set(cacheKey, result, 300);
        
        return result;
      }

      // Fallback to Google Sheets if database is empty
      console.log('⚠️ Database search returned no results, falling back to Google Sheets...');
      return await this.searchGoogleSheets(filters, false);

    } catch (error) {
      console.error('❌ Database search failed:', error);

      if (allowFallback) {
        console.log('🔄 Falling back to Google Sheets due to database error...');
        return await this.searchGoogleSheets(filters, false);
      }

      throw error;
    }
  }

  /**
   * Search in Google Sheets with optional fallback to database
   */
  private async searchGoogleSheets(filters: SearchFilters, allowFallback: boolean = true): Promise<ProductSearchResult> {
    try {
      // Generate cache key for Google Sheets search
      const cacheKey = CacheService.generateSearchKey({ ...filters, source: 'sheets' });
      
      // Try to get from cache first
      const cachedResult = await CacheService.get<ProductSearchResult>(cacheKey);
      if (cachedResult) {
        console.log(`✅ Cache HIT for Google Sheets search: ${cacheKey}`);
        return cachedResult;
      }

      console.log(`⚠️ Cache MISS for Google Sheets search: ${cacheKey}`);
      console.log('📊 Searching in Google Sheets...');

      const SHEET_ID = process.env.GOOGLE_SHEET_ID;
      if (!SHEET_ID) {
        throw new Error('Google Sheet ID not configured');
      }

      // Determine date for sheet lookup
      const searchDate = filters.date || this.getCurrentDateTag();

      // Parse Google Sheets data
      const sheetsData = await parseGoogleSheetWithDate(SHEET_ID, searchDate);

      // Apply filters to sheets data
      const filteredResult = this.applyFiltersToSheetsData(sheetsData.products, filters);

      console.log(`✅ Google Sheets search completed: ${filteredResult.total} products found`);
      
      // Cache the result for 5 minutes (300 seconds)
      await CacheService.set(cacheKey, filteredResult, 300);
      
      return filteredResult;

    } catch (error) {
      console.error('❌ Google Sheets search failed:', error);

      if (allowFallback) {
        console.log('🔄 Falling back to database due to Google Sheets error...');
        return await this.searchDatabase(filters, false);
      }

      throw error;
    }
  }

  /**
   * Hybrid search that combines both sources intelligently
   */
  private async searchHybrid(filters: SearchFilters): Promise<ProductSearchResult> {
    const startTime = Date.now();

    try {
      // Generate cache key for hybrid search
      const cacheKey = CacheService.generateSearchKey({ ...filters, source: 'hybrid' });
      
      // Try to get from cache first
      const cachedResult = await CacheService.get<ProductSearchResult>(cacheKey);
      if (cachedResult) {
        console.log(`✅ Cache HIT for hybrid search: ${cacheKey}`);
        return cachedResult;
      }

      console.log(`⚠️ Cache MISS for hybrid search: ${cacheKey}`);
      console.log('🔀 Performing hybrid search...');

      // Try both sources in parallel for better performance
      const [databaseResult, sheetsResult] = await Promise.allSettled([
        this.searchDatabase(filters, false),
        this.searchGoogleSheets(filters, false)
      ]);

      // Determine which result to use based on recency and availability
      let finalResult: ProductSearchResult;

      if (databaseResult.status === 'fulfilled' && sheetsResult.status === 'fulfilled') {
        // Both sources available - choose the more recent or comprehensive one
        const dbResult = databaseResult.value;
        const sheetsRes = sheetsResult.value;

        // Prefer Google Sheets for real-time data, database for performance
        if (sheetsRes.total > 0) {
          finalResult = sheetsRes;
          console.log(`📊 Using Google Sheets data: ${sheetsRes.total} products`);
        } else {
          finalResult = dbResult;
          console.log(`🗄️ Using database data: ${dbResult.total} products`);
        }
      } else if (databaseResult.status === 'fulfilled') {
        finalResult = databaseResult.value;
        console.log(`🗄️ Using database data (sheets failed): ${finalResult.total} products`);
      } else if (sheetsResult.status === 'fulfilled') {
        finalResult = sheetsResult.value;
        console.log(`📊 Using Google Sheets data (database failed): ${finalResult.total} products`);
      } else {
        throw new Error('Both database and Google Sheets searches failed');
      }

      // Add execution time
      finalResult.executionTime = Date.now() - startTime;

      // Cache the result for 5 minutes (300 seconds)
      await CacheService.set(cacheKey, finalResult, 300);

      console.log(`✅ Hybrid search completed in ${finalResult.executionTime}ms`);
      return finalResult;

    } catch (error) {
      console.error('❌ Hybrid search failed:', error);
      throw error;
    }
  }

  /**
   * Apply filters to Google Sheets data
   */
  private applyFiltersToSheetsData(products: any[], filters: SearchFilters): ProductSearchResult {
    const startTime = Date.now();
    let filteredProducts = [...products];

    // Apply text search
    if (filters.search && filters.search.trim().length >= 2) {
      const searchLower = filters.search.toLowerCase().trim();
      filteredProducts = filteredProducts.filter(product => {
        return product.model?.toLowerCase().includes(searchLower) ||
               product.brand?.toLowerCase().includes(searchLower) ||
               product.color?.toLowerCase().includes(searchLower) ||
               product.capacity?.toLowerCase().includes(searchLower) ||
               product.category?.toLowerCase().includes(searchLower);
      });
    }

    // Apply category filter
    if (filters.category && filters.category !== 'all') {
      filteredProducts = filteredProducts.filter(product => 
        product.category === filters.category
      );
    }

    // Apply color filter
    if (filters.color && filters.color !== 'all') {
      filteredProducts = filteredProducts.filter(product => 
        product.color?.toLowerCase().includes(filters.color!.toLowerCase())
      );
    }

    // Apply capacity filter
    if (filters.capacity && filters.capacity !== 'all') {
      filteredProducts = filteredProducts.filter(product => 
        product.capacity === filters.capacity
      );
    }

    // Apply region filter
    if (filters.region && filters.region !== 'all') {
      filteredProducts = filteredProducts.filter(product => 
        product.region === filters.region
      );
    }

    // Apply brand category filter
    if (filters.brandCategory && filters.brandCategory !== 'all') {
      filteredProducts = filteredProducts.filter(product => {
        const modelLower = (product.model || '').toLowerCase();
        const brandLower = (product.brand || '').toLowerCase();
        const category = product.category || '';

        if (filters.brandCategory === 'iphone') {
          // iPhone: only show IPH category
          return category === 'IPH' && (
            modelLower.includes('iphone') || 
            modelLower.includes('iph') || 
            brandLower.includes('apple')
          );
        } else if (filters.brandCategory === 'xiaomi') {
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
    }

    // Apply supplier filter
    if (filters.supplierIds && filters.supplierIds.length > 0) {
      filteredProducts = filteredProducts.filter(product => 
        filters.supplierIds.includes(product.supplier?.id?.toString() || product.supplierId?.toString() || '')
      );
    } else if (filters.supplierId && filters.supplierId !== 'all') {
      filteredProducts = filteredProducts.filter(product => 
        product.supplier?.id?.toString() === filters.supplierId || 
        product.supplierId?.toString() === filters.supplierId
      );
    }

    // Apply price range filters
    if (filters.minPrice !== undefined) {
      filteredProducts = filteredProducts.filter(product => 
        parseFloat(product.price) >= filters.minPrice!
      );
    }

    if (filters.maxPrice !== undefined) {
      filteredProducts = filteredProducts.filter(product => 
        parseFloat(product.price) <= filters.maxPrice!
      );
    }

    // Apply availability filter
    if (filters.available !== undefined) {
      filteredProducts = filteredProducts.filter(product => 
        product.available === filters.available
      );
    }

    // Apply lowest price filter
    if (filters.isLowestPrice !== undefined) {
      filteredProducts = filteredProducts.filter(product => 
        product.isLowestPrice === filters.isLowestPrice
      );
    }

    // Smart sorting for iPhone and number search results
    const getSearchRelevanceScore = (product: any, searchTerm: string) => {
      if (!searchTerm) return 0;

      const normalizedSearch = searchTerm.toLowerCase().trim();
      const normalizedModel = (product.model || '').toLowerCase().trim();
      const productCategory = (product.category || '').toUpperCase();
      const isIPhone = productCategory === 'IPH' || 
                      normalizedModel.includes('iphone') ||
                      normalizedModel.includes('iph');

      // Check if it's a simple number search (14, 15, etc.)
      const simpleNumberMatch = normalizedSearch.match(/^(\d{2})$/);
      
      if (simpleNumberMatch) {
        const searchNumber = simpleNumberMatch[1];
        
        if (isIPhone) {
          // iPhone products get high priority for number searches
          const hasExactIPhoneNumber = normalizedModel.includes(`iphone ${searchNumber}`) || 
                                     normalizedModel.includes(`iphone${searchNumber}`) ||
                                     normalizedModel.includes(`iph ${searchNumber}`) ||
                                     normalizedModel.includes(`iph${searchNumber}`);
          
          if (hasExactIPhoneNumber) {
            return 3000; // Highest priority for iPhone with exact number match
          }
          
          return 1500; // Medium-high priority for other iPhone products
        } else {
          // Non-iPhone products get lower priority
          if (normalizedModel.includes(searchNumber)) {
            return 200; // Low priority for non-iPhone products containing the number
          }
          return 0;
        }
      }

      // Check if it's an iPhone search
      if (normalizedSearch.includes('iphone')) {
        // Extract the iPhone number from search term (e.g., "iphone 16" -> "16")
        const searchMatch = normalizedSearch.match(/iphone\s*(\d+)/i);
        if (searchMatch) {
          const searchNumber = searchMatch[1];

          // Check if product model contains the iPhone number
          if (normalizedModel.includes(`iphone ${searchNumber}`) || normalizedModel.includes(`iphone${searchNumber}`)) {

            // Check if it's an E variant (ends with "16E" or contains "16E ")
            const hasEVariant = normalizedModel.includes(`${searchNumber}e `) || 
                               normalizedModel.includes(`${searchNumber}e\t`) ||
                               normalizedModel.match(new RegExp(`iphone\\s*${searchNumber}e(?:\\s|$)`, 'i'));

            if (hasEVariant) {
              return 200; // Lower priority for E variants (iPhone 16E, iPhone 16E 128GB, etc.)
            } else {
              // Regular iPhone variants (iPhone 16, iPhone 16 Pro, iPhone 16 Plus, etc.)
              return 1000; // Higher priority for non-E variants
            }
          }
        }
      }

      // Default relevance based on string matching
      if (normalizedModel.includes(normalizedSearch)) {
        return 10;
      }

      return 0;
    };

    // Apply search relevance sorting first if there's a search term
    if (filters.search && filters.search.trim().length >= 2) {
      filteredProducts.sort((a, b) => {
        const scoreA = getSearchRelevanceScore(a, filters.search!);
        const scoreB = getSearchRelevanceScore(b, filters.search!);

        // Sort by relevance score first (higher scores first)
        if (scoreA !== scoreB) {
          return scoreB - scoreA;
        }

        // If same relevance, sort by price (lower first)
        const priceA = parseFloat(a.price) || 0;
        const priceB = parseFloat(b.price) || 0;
        return priceA - priceB;
      });
    } else {
      // Apply standard sorting if no search term
      const sortField = filters.sortField || 'price';
      const sortDirection = filters.sortDirection || 'asc';

      filteredProducts.sort((a, b) => {
        let aValue: any, bValue: any;

        switch (sortField) {
          case 'price':
            aValue = parseFloat(a.price) || 0;
            bValue = parseFloat(b.price) || 0;
            break;
          case 'model':
            aValue = a.model || '';
            bValue = b.model || '';
            break;
          case 'brand':
            aValue = a.brand || '';
            bValue = b.brand || '';
            break;
          case 'date':
            aValue = a.date || '';
            bValue = b.date || '';
            break;
          default:
            aValue = a[sortField] || '';
            bValue = b[sortField] || '';
        }

        if (sortDirection === 'desc') {
          return aValue < bValue ? 1 : aValue > bValue ? -1 : 0;
        } else {
          return aValue > bValue ? 1 : aValue < bValue ? -1 : 0;
        }
      });
    }

    // Apply pagination
    const page = filters.page || 1;
    const limit = Math.min(filters.limit || 50, 1000);
    const offset = (page - 1) * limit;
    const paginatedProducts = filteredProducts.slice(offset, offset + limit);

    // Calculate aggregations
    const aggregations = this.calculateSheetsAggregations(filteredProducts);

    // Calculate pagination info
    const total = filteredProducts.length;
    const totalPages = Math.ceil(total / limit);
    const executionTime = Date.now() - startTime;

    return {
      data: paginatedProducts,
      total,
      page,
      limit,
      totalPages,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1,
      filters,
      executionTime,
      aggregations
    };
  }

  /**
   * Calculate aggregations for Google Sheets data
   */
  private calculateSheetsAggregations(products: any[]) {
    // Price range
    const prices = products.map(p => parseFloat(p.price)).filter(p => !isNaN(p));
    const priceRange = {
      min: prices.length > 0 ? Math.min(...prices) : 0,
      max: prices.length > 0 ? Math.max(...prices) : 0
    };

    // Categories
    const categoryMap = new Map<string, number>();
    products.forEach(p => {
      if (p.category) {
        categoryMap.set(p.category, (categoryMap.get(p.category) || 0) + 1);
      }
    });
    const categories = Array.from(categoryMap.entries())
      .map(([category, count]) => ({ category, count }))
      .sort((a, b) => b.count - a.count);

    // Colors
    const colorMap = new Map<string, number>();
    products.forEach(p => {
      if (p.color) {
        colorMap.set(p.color, (colorMap.get(p.color) || 0) + 1);
      }
    });
    const colors = Array.from(colorMap.entries())
      .map(([color, count]) => ({ color, count }))
      .sort((a, b) => b.count - a.count);

    // Storage
    const storageMap = new Map<string, number>();
    products.forEach(p => {
      if (p.storage || p.capacity) {
        const storage = p.storage || p.capacity;
        storageMap.set(storage, (storageMap.get(storage) || 0) + 1);
      }
    });
    const storage = Array.from(storageMap.entries())
      .map(([storage, count]) => ({ storage, count }))
      .sort((a, b) => b.count - a.count);

    // Suppliers
    const supplierMap = new Map<string, number>();
    products.forEach(p => {
      if (p.supplierName || p.brand) {
        const supplier = p.supplierName || p.brand;
        supplierMap.set(supplier, (supplierMap.get(supplier) || 0) + 1);
      }
    });
    const suppliers = Array.from(supplierMap.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);

    // Brands
    const brandMap = new Map<string, number>();
    products.forEach(p => {
      if (p.brand) {
        brandMap.set(p.brand, (brandMap.get(p.brand) || 0) + 1);
      }
    });
    const brands = Array.from(brandMap.entries())
      .map(([brand, count]) => ({ brand, count }))
      .sort((a, b) => b.count - a.count);

    // Regions
    const regionMap = new Map<string, number>();
    products.forEach(p => {
      if (p.region) {
        regionMap.set(p.region, (regionMap.get(p.region) || 0) + 1);
      }
    });
    const regions = Array.from(regionMap.entries())
      .map(([region, count]) => ({ region, count }))
      .sort((a, b) => b.count - a.count);

    return {
      priceRange,
      categories: categories.slice(0, 20),
      colors: colors.slice(0, 30),
      storage: storage.slice(0, 20),
      suppliers: suppliers.slice(0, 50),
      brands: brands.slice(0, 30),
      regions: regions.slice(0, 20)
    };
  }

  /**
   * Get current date tag in DD-MM format
   */
  private getCurrentDateTag(): string {
    const now = new Date();
    return [
      String(now.getDate()).padStart(2, '0'),
      String(now.getMonth() + 1).padStart(2, '0')
    ].join('-');
  }

  /**
   * Get search suggestions from both sources
   */
  async getSearchSuggestions(query: string, limit: number = 10): Promise<any[]> {
    if (!query || query.length < 2) {
      return [];
    }

    try {
      // Get suggestions from database
      const dbSuggestions = await this.searchEngine.getSearchSuggestions(query, limit);

      // For now, return database suggestions
      // In the future, we could also get suggestions from Google Sheets
      return dbSuggestions;

    } catch (error) {
      console.error('❌ Suggestions error:', error);
      return [];
    }
  }

  /**
   * Intelligent search with natural language processing
   */
  async intelligentSearch(query: string, options: HybridSearchOptions = {}): Promise<ProductSearchResult> {
    // Parse natural language query
    const enhancedFilters = this.parseSearchQuery(query);

    return this.search(enhancedFilters, options);
  }

  /**
   * Parse natural language query into structured filters
   */
  private parseSearchQuery(query: string): SearchFilters {
    const filters: SearchFilters = {};
    const lowerQuery = query.toLowerCase();

    // Extract iPhone models
    const iphoneMatch = lowerQuery.match(/iphone\s*(\d+)/);
    if (iphoneMatch) {
      filters.search = `iPhone ${iphoneMatch[1]}`;
    }

    // Extract storage capacity
    const storageMatch = lowerQuery.match(/(\d+)\s*(gb|tb)/i);
    if (storageMatch) {
      filters.capacity = `${storageMatch[1]}${storageMatch[2].toUpperCase()}`;
    }

    // Extract colors
    const colorKeywords = ['preto', 'branco', 'azul', 'vermelho', 'verde', 'roxo', 'rosa', 'dourado', 'prata'];
    const foundColor = colorKeywords.find(color => lowerQuery.includes(color));
    if (foundColor) {
      filters.color = foundColor;
    }

    // Extract price ranges
    const priceMatch = lowerQuery.match(/(?:até|max|máximo)\s*r?\$?\s*(\d+)/);
    if (priceMatch) {
      filters.maxPrice = parseInt(priceMatch[1]);
    }

    // If no specific patterns found, use as general search
    if (Object.keys(filters).length === 0) {
      filters.search = query;
    }

    return filters;
  }
}

export default new HybridSearchService();