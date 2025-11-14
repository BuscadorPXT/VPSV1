import { eq, and, or, like, ilike, sql, desc, asc, gte, lte, inArray } from "drizzle-orm";
import { db } from "../db";
import { products as productsTable, suppliers } from "../../shared/schema";
import CacheService from "./cache-service";

// Define a Product type for better type safety within the class
interface Product {
  id: number;
  model: string | null;
  brand: string | null;
  storage: string | null;
  color: string | null;
  category: string | null;
  capacity: string | null;
  region: string | null;
  date: string | null;
  price: number | null;
  available: boolean | null;
  isLowestPrice: boolean | null;
  ultimaAtualizacao: string | null;
  supplierId: number | null;
  supplierName?: string | null; // Optional, for joined data
  // Add other relevant product fields here
}


export interface SearchFilters {
  // Text search
  search?: string;

  // Product attributes
  model?: string;
  brand?: string;
  storage?: string;
  color?: string;
  category?: string;
  capacity?: string;
  region?: string;
  date?: string;

  // Supplier filters
  supplierId?: number;
  supplierIds?: number[];
  supplierName?: string;

  // Price filters
  minPrice?: number;
  maxPrice?: number;

  // Availability filters
  available?: boolean;
  isLowestPrice?: boolean;

  // Date filters
  dateFrom?: string;
  dateTo?: string;

  // Pagination
  page?: number;
  limit?: number;

  // Sorting
  sortField?: 'price' | 'model' | 'brand' | 'date' | 'updatedAt' | 'relevance';
  sortDirection?: 'asc' | 'desc';
}

export interface SearchResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  filters: SearchFilters;
  executionTime: number;
}

export interface ProductSearchResult extends SearchResult<Product> {
  aggregations: {
    priceRange: { min: number; max: number };
    categories: Array<{ category: string; count: number }>;
    colors: Array<{ color: string; count: number }>;
    storage: Array<{ storage: string; count: number }>;
    suppliers: Array<{ name: string; count: number }>;
    brands: Array<{ brand: string; count: number }>;
    regions: Array<{ region: string; count: number }>;
  };
}

export class SearchEngine {
  private static instance: SearchEngine;

  static getInstance(): SearchEngine {
    if (!SearchEngine.instance) {
      SearchEngine.instance = new SearchEngine();
    }
    return SearchEngine.instance;
  }

  /**
   * Processa termo de busca para Full-Text Search
   */
  private processSearchTermForFTS(searchTerm: string): string {
    // Remove caracteres especiais e divide em palavras
    const words = searchTerm
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 0);

    // Converte cada palavra em um termo de prefixo (word:*)
    // E une com operador AND (&)
    return words.map(word => `${word}:*`).join(' & ');
  }

  /**
   * Verifica se é uma busca especializada para iPhone
   */
  private isSpecializedIPhoneSearch(searchTerm: string): boolean {
    const searchLower = searchTerm.toLowerCase().trim();

    // Busca por número simples (14, 15, etc.)
    const simpleNumberMatch = searchLower.match(/^(\d{2})$/);

    // Busca específica para iPhone
    const iphoneMatch = searchLower.match(/^iphone\s*(\d+)([a-z]*)?(\s+pro)?(\s+max|\s+plus?|\s+mini)?$/i);

    return !!(simpleNumberMatch || iphoneMatch);
  }

  /**
   * Advanced product search with comprehensive filtering and FTS
   */
  async searchProducts(filters: SearchFilters = {}): Promise<ProductSearchResult> {
    const startTime = Date.now();

    // Set defaults
    const page = filters.page || 1;
    const limit = Math.min(filters.limit || 50, 1000); // Max 1000 items
    const offset = (page - 1) * limit;

    try {
      // Verificar se é busca textual para determinar se deve usar FTS
      const hasTextSearch = filters.search && filters.search.trim().length >= 2;
      const useSpecializedSearch = hasTextSearch && this.isSpecializedIPhoneSearch(filters.search);
      const useFTS = hasTextSearch && !useSpecializedSearch;

      // Build base query com ranking de relevância se usar FTS
      let selectFields: any = {
        id: productsTable.id,
        model: productsTable.model,
        brand: productsTable.brand,
        storage: productsTable.storage,
        color: productsTable.color,
        category: productsTable.category,
        capacity: productsTable.capacity,
        region: productsTable.region,
        date: productsTable.date,
        price: productsTable.price,
        available: productsTable.available,
        isLowestPrice: productsTable.isLowestPrice,
        ultimaAtualizacao: productsTable.updatedAt, // Corrected field name
        supplierId: productsTable.supplierId,
        supplierName: suppliers.name,
      };

      // Se usar FTS, adicionar campo de relevância
      if (useFTS) {
        const processedQuery = this.processSearchTermForFTS(filters.search!);
        selectFields.relevance = sql<number>`ts_rank(${productsTable.searchVector}, to_tsquery('portuguese', ${processedQuery}))`;
      }

      let query = db
        .select(selectFields)
        .from(productsTable)
        .leftJoin(suppliers, eq(productsTable.supplierId, suppliers.id));

      // Apply filters
      const conditions = this.buildSearchConditions(filters);
      if (conditions.length > 0) {
        query = query.where(and(...conditions));
      }

      // Apply sorting with FTS relevance prioritization
      if (useFTS) {
        // Para FTS, ordenar por relevância primeiro
        const processedQuery = this.processSearchTermForFTS(filters.search!);
        query = query.orderBy(
          desc(sql`ts_rank(${productsTable.searchVector}, to_tsquery('portuguese', ${processedQuery}))`),
          asc(productsTable.price) // Preço como critério secundário
        );
      } else if (useSpecializedSearch) {
        // Para busca especializada de iPhone, usar ordenação customizada
        query = query.orderBy(asc(productsTable.model), asc(productsTable.price));
      } else {
        // Apply standard sorting for non-search queries
        const sortField = filters.sortField || 'price';
        const sortDirection = filters.sortDirection || 'asc';

        switch (sortField) {
          case 'price':
            query = sortDirection === 'desc' 
              ? query.orderBy(desc(productsTable.price))
              : query.orderBy(asc(productsTable.price));
            break;
          case 'model':
            query = sortDirection === 'desc'
              ? query.orderBy(desc(productsTable.model))
              : query.orderBy(asc(productsTable.model));
            break;
          case 'brand':
            query = sortDirection === 'desc'
              ? query.orderBy(desc(productsTable.brand))
              : query.orderBy(asc(productsTable.brand));
            break;
          case 'date':
            query = sortDirection === 'desc'
              ? query.orderBy(desc(productsTable.date))
              : query.orderBy(asc(productsTable.date));
            break;
          case 'updatedAt':
            query = sortDirection === 'desc'
              ? query.orderBy(desc(productsTable.updatedAt))
              : query.orderBy(asc(productsTable.updatedAt));
            break;
          case 'relevance':
            // Relevance só funciona com FTS
            if (useFTS) {
              const processedQuery = this.processSearchTermForFTS(filters.search!);
              query = sortDirection === 'desc'
                ? query.orderBy(desc(sql`ts_rank(${productsTable.searchVector}, to_tsquery('portuguese', ${processedQuery}))`))
                : query.orderBy(asc(sql`ts_rank(${productsTable.searchVector}, to_tsquery('portuguese', ${processedQuery}))`));
            }
            break;
        }
      }

      // Get total count (without pagination)
      const countQuery = db
        .select({ count: sql<number>`count(*)` })
        .from(productsTable)
        .leftJoin(suppliers, eq(productsTable.supplierId, suppliers.id));

      if (conditions.length > 0) {
        countQuery.where(and(...conditions));
      }

      // Execute queries in parallel
      const [results, countResult, aggregations] = await Promise.all([
        query.limit(limit).offset(offset),
        countQuery,
        this.getSearchAggregations(filters)
      ]);

      // Apply specialized iPhone sorting if needed
      let sortedResults = results;
      if (useSpecializedSearch) {
        sortedResults = this.sortRelevanceResults(results, filters.search!);
      }

      const total = countResult[0]?.count || 0;
      const totalPages = Math.ceil(total / limit);
      const executionTime = Date.now() - startTime;

      console.log(`✅ Search completed in ${executionTime}ms: ${total} products found (FTS: ${useFTS}, Specialized: ${useSpecializedSearch})`);

      return {
        data: sortedResults,
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

    } catch (error) {
      console.error('❌ Search error:', error);
      throw error;
    }
  }

  /**
   * Build search conditions based on filters with FTS integration
   */
  private buildSearchConditions(filters: SearchFilters) {
    const conditions = [];

    // Text search with Full-Text Search and specialized iPhone logic
    if (filters.search && filters.search.trim().length >= 2) {
      const searchTerm = filters.search.trim();
      const searchLower = searchTerm.toLowerCase();

      // Check if it's a specialized iPhone search
      const simpleNumberMatch = searchLower.match(/^(\d{2})$/);
      const iphoneMatch = searchLower.match(/^iphone\s*(\d+)([a-z]*)?(\s+pro)?(\s+max|\s+plus?|\s+mini)?$/i);

      if (simpleNumberMatch) {
        // Busca especializada por número - mantém lógica original
        const number = simpleNumberMatch[1];

        conditions.push(
          or(
            // High priority: EXACT iPhone base models with this number (no variants)
            and(
              or(
                eq(productsTable.category, 'IPH'),
                ilike(productsTable.model, '%iphone%'),
                ilike(productsTable.model, '%iph%')
              ),
              or(
                ilike(productsTable.model, `%iphone ${number}%`),
                ilike(productsTable.model, `%iphone${number}%`),
                ilike(productsTable.model, `%iph ${number}%`),
                ilike(productsTable.model, `%iph${number}%`)
              ),
              // STRICT exclusion: remove ALL variants for number searches
              sql`NOT LOWER(${productsTable.model}) ~ '[a-z](?!phone)|pro|max|plus|mini|\\be\\b|\\bse\\b'`
            ),
            // Lower priority: Other products that contain the number + FTS
            and(
              sql`NOT (LOWER(${productsTable.model}) LIKE '%iphone%' OR LOWER(${productsTable.model}) LIKE '%iph%' OR ${productsTable.category} = 'IPH')`,
              sql`${productsTable.searchVector} @@ to_tsquery('portuguese', ${this.processSearchTermForFTS(searchTerm)})`
            )
          )
        );
      } else if (iphoneMatch) {
        // Busca específica para iPhone - mantém lógica original com fallback FTS
        const number = iphoneMatch[1];
        const variant = iphoneMatch[2] || '';
        const pro = iphoneMatch[3] || '';
        const size = iphoneMatch[4] || '';

        if (!variant && !pro && !size) {
          // Base iPhone model - STRICT: should match ONLY "iPhone 16" and exclude ALL variants
          conditions.push(
            or(
              and(
                or(
                  eq(productsTable.category, 'IPH'),
                  ilike(productsTable.model, '%iphone%')
                ),
                or(
                  ilike(productsTable.model, `%iphone ${number}%`),
                  ilike(productsTable.model, `%iphone${number}%`)
                ),
                // STRICT exclusion: remove ALL variants including 'e', 'se', 'pro', 'max', 'plus', 'mini'
                sql`NOT LOWER(${productsTable.model}) ~ '[a-z](?!phone)|pro|max|plus|mini|\\be\\b|\\bse\\b'`
              ),
              // Fallback para FTS para capturar outros resultados relevantes
              sql`${productsTable.searchVector} @@ to_tsquery('portuguese', ${this.processSearchTermForFTS(searchTerm)})`
            )
          );
        } else {
          // Lógica original para variantes + FTS fallback
          let pattern = `iphone\\s*${number}`;
          if (variant) pattern += variant;
          if (pro) pattern += '\\s*pro';
          if (size) {
            const sizeNormalized = size.trim().toLowerCase();
            if (sizeNormalized.includes('plus')) {
              pattern += '\\s*plus';
            } else if (sizeNormalized.includes('max')) {
              pattern += '\\s*max';
            } else if (sizeNormalized.includes('mini')) {
              pattern += '\\s*mini';
            }
          }

          conditions.push(
            or(
              and(
                or(
                  eq(productsTable.category, 'IPH'),
                  ilike(productsTable.model, '%iphone%'),
                  ilike(productsTable.model, '%iph%')
                ),
                sql`LOWER(${productsTable.model}) ~ '${pattern}'`
              ),
              // Fallback para FTS
              sql`${productsTable.searchVector} @@ to_tsquery('portuguese', ${this.processSearchTermForFTS(searchTerm)})`
            )
          );
        }
      } else {
        // Para outras buscas, usar Full-Text Search como principal
        const processedQuery = this.processSearchTermForFTS(searchTerm);
        conditions.push(
          sql`${productsTable.searchVector} @@ to_tsquery('portuguese', ${processedQuery})`
        );
      }
    }

    // Exact matches - mantém lógica original
    if (filters.model && filters.model !== 'all') {
      conditions.push(eq(productsTable.model, filters.model));
    }

    if (filters.brand && filters.brand !== 'all') {
      conditions.push(eq(productsTable.brand, filters.brand));
    }

    if (filters.storage && filters.storage !== 'all') {
      conditions.push(eq(productsTable.storage, filters.storage));
    }

    if (filters.color && filters.color !== 'all') {
      conditions.push(ilike(productsTable.color, filters.color));
    }

    if (filters.category && filters.category !== 'all') {
      conditions.push(eq(productsTable.category, filters.category));
    }

    if (filters.capacity && filters.capacity !== 'all') {
      conditions.push(eq(productsTable.capacity, filters.capacity));
    }

    if (filters.region && filters.region !== 'all') {
      conditions.push(eq(productsTable.region, filters.region));
    }

    if (filters.date && filters.date !== 'all') {
      conditions.push(eq(productsTable.date, filters.date));
    }

    // Supplier filters
    if (filters.supplierId) {
      conditions.push(eq(productsTable.supplierId, filters.supplierId));
    }

    if (filters.supplierIds && filters.supplierIds.length > 0) {
      conditions.push(inArray(productsTable.supplierId, filters.supplierIds));
    }

    if (filters.supplierName && filters.supplierName !== 'all') {
      conditions.push(ilike(suppliers.name, `%${filters.supplierName}%`));
    }

    // Price range filters
    if (filters.minPrice !== undefined && filters.minPrice > 0) {
      conditions.push(gte(productsTable.price, filters.minPrice.toString()));
    }

    if (filters.maxPrice !== undefined && filters.maxPrice > 0) {
      conditions.push(lte(productsTable.price, filters.maxPrice.toString()));
    }

    // Boolean filters
    if (filters.available !== undefined) {
      conditions.push(eq(productsTable.available, filters.available));
    }

    if (filters.isLowestPrice !== undefined) {
      conditions.push(eq(productsTable.isLowestPrice, filters.isLowestPrice));
    }

    // Date range filters
    if (filters.dateFrom) {
      conditions.push(gte(productsTable.date, filters.dateFrom));
    }

    if (filters.dateTo) {
      conditions.push(lte(productsTable.date, filters.dateTo));
    }

    return conditions;
  }

  /**
   * Get aggregated data for filters (facets) with FTS support
   */
  private async getSearchAggregations(filters: SearchFilters) {
    try {
      // Generate cache key for aggregations
      const cacheKey = CacheService.generateAggregationsKey(filters);

      // Try to get from cache first
      const cachedAggregations = await CacheService.get(cacheKey);
      if (cachedAggregations) {
        console.log(`✅ Cache HIT for aggregations: ${cacheKey}`);
        return cachedAggregations;
      }

      console.log(`⚠️ Cache MISS for aggregations: ${cacheKey}`);

      // Build base conditions INCLUDING the search term to ensure filters are specific to searched products
      const baseConditions = this.buildSearchConditions({
        ...filters,
        // Keep the search term but remove the specific field we're aggregating
        category: undefined,
        color: undefined,
        storage: undefined,
        region: undefined,
        brand: undefined
      });

      let baseWhere;
      if (baseConditions.length > 0) {
          baseWhere = and(...baseConditions);
      }

      // Execute aggregation queries in parallel
      const [
        priceRangeResult,
        categoriesResult,
        colorsResult,
        storageResult,
        suppliersResult,
        brandsResult,
        regionsResult
      ] = await Promise.all([
        // Price range
        db.select({
          min: sql<number>`min(${productsTable.price}::numeric)`,
          max: sql<number>`max(${productsTable.price}::numeric)`
        }).from(productsTable),

        // Categories - with search filter applied
        (() => {
          const query = db.select({
            category: productsTable.category,
            count: sql<number>`count(*)`
          })
          .from(productsTable)
          .leftJoin(suppliers, eq(productsTable.supplierId, suppliers.id))
          .groupBy(productsTable.category)
          .orderBy(desc(sql`count(*)`));

          return baseWhere ? query.where(baseWhere) : query;
        })(),

        // Colors - with search filter applied
        (() => {
          const query = db.select({
            color: productsTable.color,
            count: sql<number>`count(*)`
          })
          .from(productsTable)
          .leftJoin(suppliers, eq(productsTable.supplierId, suppliers.id))
          .groupBy(productsTable.color)
          .orderBy(desc(sql`count(*)`));

          return baseWhere ? query.where(baseWhere) : query;
        })(),

        // Storage - with search filter applied
        (() => {
          const query = db.select({
            storage: productsTable.storage,
            count: sql<number>`count(*)`
          })
          .from(productsTable)
          .leftJoin(suppliers, eq(productsTable.supplierId, suppliers.id))
          .groupBy(productsTable.storage)
          .orderBy(desc(sql`count(*)`));

          return baseWhere ? query.where(baseWhere) : query;
        })(),

        // Suppliers - with search filter applied
        (() => {
          const query = db.select({
            name: suppliers.name,
            count: sql<number>`count(*)`
          })
          .from(productsTable)
          .leftJoin(suppliers, eq(productsTable.supplierId, suppliers.id))
          .groupBy(suppliers.name)
          .orderBy(desc(sql`count(*)`));

          return baseWhere ? query.where(baseWhere) : query;
        })(),

        // Brands - with search filter applied
        (() => {
          const query = db.select({
            brand: productsTable.brand,
            count: sql<number>`count(*)`
          })
          .from(productsTable)
          .leftJoin(suppliers, eq(productsTable.supplierId, suppliers.id))
          .groupBy(productsTable.brand)
          .orderBy(desc(sql`count(*)`));

          return baseWhere ? query.where(baseWhere) : query;
        })(),

        // Regions - with search filter applied
        (() => {
          const query = db.select({
            region: productsTable.region,
            count: sql<number>`count(*)`
          })
          .from(productsTable)
          .leftJoin(suppliers, eq(productsTable.supplierId, suppliers.id))
          .groupBy(productsTable.region)
          .orderBy(desc(sql`count(*)`));

          return baseWhere ? query.where(baseWhere) : query;
        })()
      ]);

      const aggregations = {
        priceRange: {
          min: priceRangeResult[0]?.min || 0,
          max: priceRangeResult[0]?.max || 0
        },
        categories: categoriesResult.filter(item => item.category).slice(0, 20),
        colors: colorsResult.filter(item => item.color).slice(0, 30),
        storage: storageResult.filter(item => item.storage).slice(0, 20),
        suppliers: suppliersResult.filter(item => item.name).slice(0, 50),
        brands: brandsResult.filter(item => item.brand).slice(0, 30),
        regions: regionsResult.filter(item => item.region).slice(0, 20)
      };

      // Cache the result for 5 minutes
      await CacheService.set(cacheKey, aggregations, 300);

      return aggregations;

    } catch (error) {
      console.error('❌ Aggregations error:', error);
      return {
        priceRange: { min: 0, max: 0 },
        categories: [],
        colors: [],
        storage: [],
        suppliers: [],
        brands: [],
        regions: []
      };
    }
  }

  /**
   * Get search suggestions with exact matching support
   */
  async getSearchSuggestions(query: string, limit: number = 10, exactMatch: boolean = false) {
    if (!query || query.length < 2) {
      return [];
    }

    try {
      const queryLower = query.toLowerCase().trim();

      if (exactMatch) {
        // Use exact matching logic for suggestions
        const suggestions = await db
          .select({
            type: sql<string>`'model'`,
            value: productsTable.model,
            count: sql<number>`count(*)`
          })
          .from(productsTable)
          .where(
            or(
              // Exact match
              sql`LOWER(${productsTable.model}) = ${queryLower}`,
              // Exact start match without variants
              and(
                sql`LOWER(${productsTable.model}) LIKE ${queryLower + '%'}`,
                sql`NOT LOWER(${productsTable.model}) ~ '${queryLower}\\s+(pro|max|plus|mini|se|e|c)\\b'`
              )
            )
          )
          .groupBy(productsTable.model)
          .orderBy(
            // Prioritize exact matches, then by count
            sql`CASE WHEN LOWER(${productsTable.model}) = ${queryLower} THEN 1 ELSE 2 END`,
            desc(sql`count(*)`))
          .limit(limit);

        return suggestions.map(s => ({
          type: s.type,
          value: s.value,
          count: s.count
        }));
      } else {
        // Use FTS for non-exact suggestions (legacy behavior)
        const processedQuery = this.processSearchTermForFTS(query);

        const suggestions = await db
          .select({
            type: sql<string>`'model'`,
            value: productsTable.model,
            count: sql<number>`count(*)`,
            relevance: sql<number>`ts_rank(${productsTable.searchVector}, to_tsquery('portuguese', ${processedQuery}))`
          })
          .from(productsTable)
          .where(sql`${productsTable.searchVector} @@ to_tsquery('portuguese', ${processedQuery})`)
          .groupBy(productsTable.model)
          .orderBy(desc(sql`ts_rank(${productsTable.searchVector}, to_tsquery('portuguese', ${processedQuery}))`), desc(sql`count(*)`))
          .limit(limit);

        return suggestions.map(s => ({
          type: s.type,
          value: s.value,
          count: s.count,
          relevance: s.relevance
        }));
      }

    } catch (error) {
      console.error('❌ Suggestions error, falling back to ILIKE:', error);

      // Fallback para ILIKE em caso de erro
      const searchTerm = exactMatch ? `${query.trim()}%` : `%${query.trim()}%`;
      const suggestions = await db
        .select({
          type: sql<string>`'model'`,
          value: productsTable.model,
          count: sql<number>`count(*)`
        })
        .from(productsTable)
        .where(ilike(productsTable.model, searchTerm))
        .groupBy(productsTable.model)
        .orderBy(desc(sql`count(*)`))
        .limit(limit);

      return suggestions.map(s => ({
        type: s.type,
        value: s.value,
        count: s.count
      }));
    }
  }

  /**
   * Transforms product data, ensuring it matches the expected Product interface.
   */
  private transformProducts(products: any[]): Product[] {
    return products.map(p => ({
      id: p.id,
      model: p.model,
      brand: p.brand,
      storage: p.storage,
      color: p.color,
      category: p.category,
      capacity: p.capacity,
      region: p.region,
      date: p.date,
      price: p.price,
      available: p.available,
      isLowestPrice: p.isLowestPrice,
      ultimaAtualizacao: p.updatedAt, // Ensure consistency with the schema/usage
      supplierId: p.supplierId,
      supplierName: p.supplierName,
    }));
  }

  /**
   * Exact match search for precise autocomplete suggestions
   */
  async exactMatch(searchTerm: string, limit: number = 10): Promise<Product[]> {
    try {
      console.log(`🎯 Exact match search for: "${searchTerm}"`);

      const searchWords = searchTerm.toLowerCase().split(/\s+/).filter(word => word.length > 0);

      if (searchWords.length === 0) {
        return [];
      }

      // Build conditions for exact matching - only return products that contain ALL search words
      const conditions = searchWords.map(word => 
        or(
          sql`LOWER(${productsTable.model}) LIKE ${`%${word}%`}`,
          sql`LOWER(${productsTable.name}) LIKE ${`%${word}%`}`
        )
      );

      const results = await db
        .select()
        .from(productsTable)
        .where(and(...conditions))
        .limit(limit * 2); // Get more results to filter precisely

      // Filter results to ensure ALL search words are present (exact match behavior)
      const filteredResults = results.filter(product => {
        const productText = `${product.model || ''} ${product.name || ''}`.toLowerCase();
        return searchWords.every(word => productText.includes(word));
      });

      // Prioritize results that start with the search term
      const sortedResults = filteredResults.sort((a, b) => {
        const aText = `${a.model || ''} ${a.name || ''}`.toLowerCase();
        const bText = `${b.model || ''} ${b.name || ''}`.toLowerCase();

        const aStartsWith = aText.startsWith(searchTerm.toLowerCase());
        const bStartsWith = bText.startsWith(searchTerm.toLowerCase());

        if (aStartsWith && !bStartsWith) return -1;
        if (!aStartsWith && bStartsWith) return 1;

        return 0;
      });

      const finalResults = sortedResults.slice(0, limit);
      console.log(`📍 Exact match found ${finalResults.length} results`);
      return this.transformProducts(finalResults);

    } catch (error) {
      console.error('❌ Exact match search error:', error);
      return [];
    }
  }


  /**
   * Advanced search with AI-like capabilities
   */
  async intelligentSearch(query: string, filters: Partial<SearchFilters> = {}) {
    // Extract search terms and convert to structured filters
    const enhancedFilters = this.parseSearchQuery(query);

    return this.searchProducts({
      ...filters,
      ...enhancedFilters
    });
  }

  /**
   * Sort search results with relevance prioritization for iPhone and number searches
   * Mantém lógica original para compatibilidade com busca especializada
   */
  private sortRelevanceResults(results: any[], searchTerm: string): any[] {
    const getSearchRelevanceScore = (product: any, searchTerm: string) => {
      if (!searchTerm) return 0;

      const normalizedSearch = searchTerm.toLowerCase().trim();
      const normalizedModel = (product.model || '').toLowerCase().trim();
      const category = (product.category || '').toUpperCase();
      const isIPhone = category === 'IPH' || 
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
            return 500; // Low priority for non-iPhone products containing the number
          }
          return 0;
        }
      }

      // Handle explicit iPhone searches with EXACT matching logic
      if (normalizedSearch.includes('iphone')) {
        const searchMatch = normalizedSearch.match(/^iphone\s*(\d+)([a-z]*)?(\s+pro)?(\s+max|\s+plus|\s+mini)?$/i);
        if (searchMatch) {
          const searchNumber = searchMatch[1];
          const variant = searchMatch[2] || '';
          const pro = searchMatch[3] || '';
          const size = searchMatch[4] || '';

          if (!isIPhone) {
            return 0;
          }

          // For base iPhone models (e.g., "iPhone 16")
          if (!variant && !pro && !size) {
            // STRICT: Must match exactly "iPhone 16" but NOT "iPhone 16 Pro", "iPhone 16e", etc.
            const strictBasePattern = new RegExp(`iphone\\s*${searchNumber}(?!\\s*[a-z]|\\s*(pro|max|plus|mini|e|se))(?:\\s|$)`, 'i');

            if (strictBasePattern.test(normalizedModel)) {
              return 2000; // Highest priority for exact base matches
            }
            return 0; // No score for ANY variant models when searching base
          }

          // For variant models (e.g., "iPhone 16e")
          if (variant && !pro && !size) {
            const variantPattern = new RegExp(`iphone\\s*${searchNumber}${variant}(?!\\s*(pro|max|plus|mini))(?:\\s|$)`, 'i');

            if (variantPattern.test(normalizedModel)) {
              return 2000; // Highest priority for exact variant matches
            }
            return 0; // No score for non-matching variants
          }

          // For "iPhone 16 Pro" (without Max) - EXACT matching
          if (pro && !size) {
            const exactProPattern = new RegExp(`iphone\\s*${searchNumber}${variant}\\s*pro(?!\\s*(max|plus|mini))(?:\\s|$)`, 'i');

            if (exactProPattern.test(normalizedModel)) {
              return 2000; // Highest priority for exact Pro matches (not Pro Max)
            }
            return 0; // No score for Pro Max when searching just Pro
          }

          // For variant models with size (e.g., "iPhone 16 Pro Max")
          if (size) {
            let exactPattern = `iphone\\s*${searchNumber}`;
            if (variant) exactPattern += variant;
            if (pro) exactPattern += '\\s*pro';

            const sizeNormalized = size.trim().toLowerCase();
            if (sizeNormalized.includes('max')) {
              exactPattern += '\\s*max';
            } else if (sizeNormalized.includes('plus')) {
              exactPattern += '\\s*plus';
            } else if (sizeNormalized.includes('mini')) {
              exactPattern += '\\s*mini';
            }

            exactPattern += '(?:\\s|$)';
            const exactRegex = new RegExp(exactPattern, 'i');

            if (exactRegex.test(normalizedModel)) {
              return 2000; // Highest priority for exact variant matches
            }
            return 0; // No score for non-matching variants
          }

          return 0; // No score for non-matching patterns
        }
      }

      // For other searches, prioritize exact matches
      if (normalizedModel === normalizedSearch) {
        return 1000; // High priority for exact model matches
      }

      // Partial model matches (but lower priority)
      if (normalizedModel.includes(normalizedSearch)) {
        return 500; // Medium priority for partial matches
      }

      return 0;
    };

    return [...results].sort((a, b) => {
      const scoreA = getSearchRelevanceScore(a, searchTerm);
      const scoreB = getSearchRelevanceScore(b, searchTerm);

      // Sort by relevance score first (higher scores first)
      if (scoreA !== scoreB) {
        return scoreB - scoreA;
      }

      // If same relevance, sort by price (lower first)
      const priceA = parseFloat(String(a.price).replace(/[^\d.-]/g, '')) || 0;
      const priceB = parseFloat(String(b.price).replace(/[^\d.-]/g, '')) || 0;
      return priceA - priceB;
    });
  }

  /**
   * Parse natural language query into structured filters
   */
  private parseSearchQuery(query: string): Partial<SearchFilters> {
    const filters: Partial<SearchFilters> = {};
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

export default SearchEngine.getInstance();