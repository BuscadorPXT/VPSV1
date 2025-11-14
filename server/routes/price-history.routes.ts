import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { sql } from 'drizzle-orm';
import { db } from '../db';
import { products, priceChangeEvents } from '../../shared/schema';
import { priceHistoryQuerySchema } from '../../shared/priceHistoryTypes';

const router = Router();
import { authenticateToken } from '../middleware/auth';

const router = Router();

// Cache for price history data
const cache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

interface CacheEntry {
  data: any;
  timestamp: number;
}

// Get price history for a product
router.get('/', authenticateToken, async (req: Request, res: Response) => {
  try {
    console.log('🔍 Price history request:', req.query);
    console.log('🔍 User ID:', req.user?.id);

    // Validate query parameters
    const validationResult = priceHistoryQuerySchema.safeParse(req.query);
    if (!validationResult.success) {
      return res.status(400).json({
        error: 'Invalid query parameters',
        details: validationResult.error.errors
      });
    }

    const query = validationResult.data;

    // Check if we have minimum required data
    if (!query.model && !query.productId) {
      return res.status(400).json({
        error: 'Either model or productId is required'
      });
    }

    // Generate cache key
    const cacheKey = JSON.stringify(query);
    const cached = cache.get(cacheKey) as CacheEntry;

    if (cached && (Date.now() - cached.timestamp) < CACHE_TTL) {
      console.log('✅ Cache hit for price history');
      return res.json(cached.data);
    }

    // Build conditions for product matching
    const conditions: any[] = [];

    if (query.productId) {
      conditions.push(sql`${products.id} = ${query.productId}`);
    }

    if (query.model) {
      conditions.push(sql`${products.model} ILIKE ${`%${query.model}%`}`);
    }

    if (query.supplier) {
      // Join with suppliers table to match by name
      conditions.push(sql`EXISTS (
        SELECT 1 FROM suppliers s 
        WHERE s.id = ${products.supplierId} 
        AND s.name ILIKE ${`%${query.supplier}%`}
      )`);
    }

    if (query.brand) {
      conditions.push(sql`${products.brand} ILIKE ${`%${query.brand}%`}`);
    }

    if (query.storage) {
      conditions.push(sql`${products.storage} ILIKE ${`%${query.storage}%`}`);
    }

    if (query.color) {
      conditions.push(sql`${products.color} ILIKE ${`%${query.color}%`}`);
    }

    if (conditions.length === 0) {
      return res.status(400).json({
        error: 'At least one search criteria must be provided'
      });
    }

    // Find matching products to get their price history
    const matchingProducts = await db
      .select({
        id: products.id,
        model: products.model,
        brand: products.brand,
        storage: products.storage,
        color: products.color,
        currentPrice: products.price,
        supplier: sql`(SELECT name FROM suppliers WHERE id = ${products.supplierId})`,
        ultimaAtualizacao: products.ultimaAtualizacao
      })
      .from(products)
      .where(sql`${sql.join(conditions, sql` AND `)}`)
      .orderBy(sql`${products.ultimaAtualizacao} DESC`)
      .limit(1);

    if (matchingProducts.length === 0) {
      return res.json(null);
    }

    const product = matchingProducts[0];

    // Get price history from price change events
    const priceHistory = await db
      .select({
        price: priceChangeEvents.newPrice,
        timestamp: priceChangeEvents.createdAt
      })
      .from(priceChangeEvents)
      .where(sql`
        ${priceChangeEvents.model} ILIKE ${`%${product.model}%`} AND
        ${priceChangeEvents.supplier} ILIKE ${`%${product.supplier}%`}
      `)
      .orderBy(sql`${priceChangeEvents.createdAt} ASC`)
      .limit(query.limit || 100);

    // If we don't have price change events, create a minimal history
    const historyPoints = priceHistory.length > 0 ? 
      priceHistory.map(event => ({
        price: parseFloat(event.price.toString()),
        timestamp: event.timestamp.toISOString()
      })) : 
      [{
        price: parseFloat(product.currentPrice.toString()),
        timestamp: product.ultimaAtualizacao?.toISOString() || new Date().toISOString()
      }];

    // Calculate statistics
    const prices = historyPoints.map(p => p.price);
    const currentPrice = parseFloat(product.currentPrice.toString());
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const avgPrice = prices.reduce((sum, price) => sum + price, 0) / prices.length;

    const firstPrice = prices[0];
    const priceChange = currentPrice - firstPrice;
    const priceChangePercentage = firstPrice > 0 ? (priceChange / firstPrice) * 100 : 0;

    // Calculate volatility (standard deviation)
    const variance = prices.reduce((sum, price) => sum + Math.pow(price - avgPrice, 2), 0) / prices.length;
    const volatility = Math.sqrt(variance);
    const volatilityPercentage = avgPrice > 0 ? (volatility / avgPrice) * 100 : 0;

    const result = {
      productId: product.id.toString(),
      model: product.model,
      supplier: product.supplier || 'Desconhecido',
      brand: product.brand,
      storage: product.storage,
      color: product.color,
      currentPrice,
      priceHistory: historyPoints,
      statistics: {
        minPrice,
        maxPrice,
        avgPrice,
        priceChange,
        priceChangePercentage,
        volatility: volatilityPercentage
      },
      lastUpdated: product.ultimaAtualizacao?.toISOString() || new Date().toISOString()
    };

    // Cache the result
    cache.set(cacheKey, {
      data: result,
      timestamp: Date.now()
    });

    // Clean old cache entries periodically
    if (cache.size > 1000) {
      const now = Date.now();
      const entriesToDelete: string[] = [];
      cache.forEach((entry: CacheEntry, key: string) => {
        if (now - entry.timestamp > CACHE_TTL) {
          entriesToDelete.push(key);
        }
      });
      entriesToDelete.forEach(key => cache.delete(key));
    }

    console.log(`✅ Price history retrieved for ${product.model} with ${historyPoints.length} data points`);
    
    // Add warning for single data point
    if (historyPoints.length === 1) {
      console.log('⚠️ Warning: Only 1 data point found - insufficient for meaningful history');
    }
    
    res.json({
      success: true,
      data: result,
      meta: {
        dataPoints: historyPoints.length,
        hasInsufficientData: historyPoints.length < 2
      }
    });

  } catch (error) {
    console.error('❌ Error fetching price history:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to fetch price history'
    });
  }
});

export { router as priceHistoryRouter };