import { Request, Response } from 'express';
import { z } from 'zod';
import hybridSearch from './services/hybrid-search';
import searchEngine, { SearchFilters } from './services/search-engine';
import { authenticateToken, AuthenticatedRequest } from './middleware/auth';
import { google } from 'googleapis';
import { getGoogleAuth } from './services/google-auth';

// Validation schemas
const searchQuerySchema = z.object({
  // Text search
  search: z.string().optional(),

  // Product attributes
  model: z.string().optional(),
  brand: z.string().optional(),
  storage: z.string().optional(),
  color: z.string().optional(),
  category: z.string().optional(),
  capacity: z.string().optional(),
  region: z.string().optional(),
  date: z.string().optional(),

  // Supplier filters
  supplierId: z.string().transform(val => val ? parseInt(val) : undefined).optional(),
  supplierIds: z.string().transform(val => val ? val.split(',').map(id => parseInt(id.trim())) : undefined).optional(),
  supplierName: z.string().optional(),

  // Price filters
  minPrice: z.string().transform(val => val ? parseFloat(val) : undefined).optional(),
  maxPrice: z.string().transform(val => val ? parseFloat(val) : undefined).optional(),

  // Boolean filters
  available: z.string().transform(val => val === 'true').optional(),
  isLowestPrice: z.string().transform(val => val === 'true').optional(),

  // Date range
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),

  // Pagination
  page: z.string().transform(val => val ? parseInt(val) : 1).optional(),
  limit: z.string().transform(val => val ? parseInt(val) : 50).optional(),

  // Sorting
  sortField: z.enum(['price', 'model', 'brand', 'date', 'updatedAt']).optional(),
  sortDirection: z.enum(['asc', 'desc']).optional(),

  // Search options
  source: z.enum(['database', 'sheets', 'hybrid']).optional(),
  useDatabase: z.string().transform(val => val !== 'false').optional(),
  useGoogleSheets: z.string().transform(val => val !== 'false').optional(),
});

const intelligentSearchSchema = z.object({
  query: z.string().min(1, 'Query is required'),
  source: z.enum(['database', 'sheets', 'hybrid']).optional(),
  limit: z.string().transform(val => val ? parseInt(val) : 50).optional(),
  page: z.string().transform(val => val ? parseInt(val) : 1).optional(),
});

const suggestionsSchema = z.object({
  q: z.string().min(2, 'Query must be at least 2 characters'),
  limit: z.string().transform(val => val ? parseInt(val) : 10).optional(),
  exact: z.string().transform(val => val === 'true').optional(),
});

export function registerSearchRoutes(app: any) {

  /**
   * Advanced search endpoint with comprehensive filtering
   * GET /api/search/products
   */
  app.get('/api/search/products', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      console.log('🔍 Advanced product search initiated');
      const startTime = Date.now();

      // Validate and parse query parameters
      const validationResult = searchQuerySchema.safeParse(req.query);
      if (!validationResult.success) {
        return res.status(400).json({
          error: 'Invalid search parameters',
          details: validationResult.error.errors
        });
      }

      const filters: SearchFilters = validationResult.data;

      // Search options
      const searchOptions = {
        preferredSource: filters.source || 'hybrid',
        useDatabase: filters.useDatabase !== false,
        useGoogleSheets: filters.useGoogleSheets !== false,
        fallbackEnabled: true
      };

      console.log('🔍 Search filters:', filters);
      console.log('⚙️ Search options:', searchOptions);

      // Perform search
      const result = await hybridSearch.search(filters, searchOptions);

      const executionTime = Date.now() - startTime;
      console.log(`✅ Search completed in ${executionTime}ms: ${result.total} products found`);

      // Add metadata to response
      res.json({
        ...result,
        metadata: {
          searchType: 'advanced',
          executionTime,
          source: searchOptions.preferredSource,
          timestamp: new Date().toISOString()
        }
      });

    } catch (error) {
      console.error('❌ Advanced search error:', error);
      res.status(500).json({
        error: 'Search failed',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  /**
   * Intelligent search with natural language processing
   * GET /api/search/intelligent
   */
  app.get('/api/search/intelligent', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      console.log('🧠 Intelligent search initiated');
      const startTime = Date.now();

      // Validate query parameters
      const validationResult = intelligentSearchSchema.safeParse(req.query);
      if (!validationResult.success) {
        return res.status(400).json({
          error: 'Invalid search parameters',
          details: validationResult.error.errors
        });
      }

      const { query, source = 'hybrid', limit = 50, page = 1 } = validationResult.data;

      console.log(`🧠 Processing intelligent query: "${query}"`);

      // Search options
      const searchOptions = {
        preferredSource: source,
        useDatabase: true,
        useGoogleSheets: true,
        fallbackEnabled: true
      };

      // Perform intelligent search
      const result = await hybridSearch.intelligentSearch(query, searchOptions);

      const executionTime = Date.now() - startTime;
      console.log(`✅ Intelligent search completed in ${executionTime}ms: ${result.total} products found`);

      res.json({
        ...result,
        metadata: {
          searchType: 'intelligent',
          originalQuery: query,
          parsedFilters: result.filters,
          executionTime,
          source,
          timestamp: new Date().toISOString()
        }
      });

    } catch (error) {
      console.error('❌ Intelligent search error:', error);
      res.status(500).json({
        error: 'Intelligent search failed',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  /**
   * Search suggestions endpoint with enhanced model matching
   * GET /api/search/suggestions
   */
  app.get('/api/search/suggestions', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      console.log('💡 Search suggestions requested for user:', req.user?.uid);

      // Validate query parameters
      const validationResult = suggestionsSchema.safeParse(req.query);
      if (!validationResult.success) {
        console.log('❌ Invalid suggestions parameters:', validationResult.error.errors);
        return res.status(400).json({
          error: 'Invalid parameters',
          details: validationResult.error.errors
        });
      }

      const { q: query, limit = 10, exact = false } = validationResult.data;

      console.log(`💡 Getting suggestions for "${query}" (exact: ${exact})`);

      // Get suggestions from search engine
      const suggestions = await searchEngine.getSearchSuggestions(query, limit, exact);

      // Format suggestions with count information
      const formattedSuggestions = suggestions.map(s => 
        s.count > 1 ? `${s.value} (${s.count} produtos)` : s.value
      );

      res.json({
        suggestions: formattedSuggestions,
        query,
        exact,
        count: suggestions.length,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('❌ Suggestions error:', error);
      res.status(500).json({
        error: 'Suggestions search failed',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  /**
   * Search facets/aggregations endpoint
   * GET /api/search/facets
   */
  app.get('/api/search/facets', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      console.log('📊 Search facets requested');
      const startTime = Date.now();

      // Parse filters (same as advanced search but for facets only)
      const validationResult = searchQuerySchema.safeParse(req.query);
      if (!validationResult.success) {
        return res.status(400).json({
          error: 'Invalid parameters',
          details: validationResult.error.errors
        });
      }

      const filters: SearchFilters = {
        ...validationResult.data,
        limit: 0, // We only want aggregations, not results
      };

      // Search options
      const searchOptions = {
        preferredSource: filters.source || 'hybrid',
        useDatabase: filters.useDatabase !== false,
        useGoogleSheets: filters.useGoogleSheets !== false,
        fallbackEnabled: true
      };

      console.log('📊 Getting facets with filters:', filters);

      // Perform search to get aggregations
      const result = await hybridSearch.search(filters, searchOptions);

      const executionTime = Date.now() - startTime;
      console.log(`✅ Facets calculated in ${executionTime}ms`);

      res.json({
        facets: result.aggregations,
        appliedFilters: filters,
        metadata: {
          executionTime,
          source: searchOptions.preferredSource,
          timestamp: new Date().toISOString()
        }
      });

    } catch (error) {
      console.error('❌ Facets error:', error);
      res.status(500).json({
        error: 'Failed to get facets',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  /**
   * Quick search endpoint for real-time search
   * GET /api/search/quick
   */
  app.get('/api/search/quick', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
    try {
      console.log('⚡ Quick search initiated');
      const startTime = Date.now();

      const { q: query, limit = 10 } = req.query as { q?: string; limit?: string };

      if (!query || query.length < 2) {
        return res.status(400).json({
          error: 'Query must be at least 2 characters'
        });
      }

      console.log(`⚡ Quick search for: "${query}"`);

      // Simple search with minimal filters for speed
      const filters: SearchFilters = {
        search: query,
        limit: parseInt(limit) || 10,
        page: 1
      };

      // Use Google Sheets for real-time data
      const searchOptions = {
        preferredSource: 'sheets' as const,
        useDatabase: false,
        useGoogleSheets: true,
        fallbackEnabled: false
      };

      const result = await hybridSearch.search(filters, searchOptions);

      const executionTime = Date.now() - startTime;
      console.log(`⚡ Quick search completed in ${executionTime}ms: ${result.data.length} products`);

      // Return simplified response for speed
      res.json({
        products: result.data.map(product => ({
          id: product.id,
          model: product.model,
          brand: product.brand,
          price: product.price,
          color: product.color,
          category: product.category
        })),
        total: result.total,
        executionTime,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('❌ Quick search error:', error);
      res.status(500).json({
        error: 'Quick search failed',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  console.log('✅ Search routes registered successfully');
}