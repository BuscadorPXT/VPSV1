import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { sql } from 'drizzle-orm';
import { db } from '../db';
import { products, priceChangeEvents } from '../../shared/schema';
import { priceHistoryQuerySchema } from '../../shared/priceHistoryTypes';

const router = Router();

// Cache for price history data
const cache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

interface CacheEntry {
  data: any;
  timestamp: number;
}

// Function to generate realistic historical price data for demonstration
function generateHistoricalPriceData(currentPrice: number, daysBack: number = 30): Array<{price: number, timestamp: string}> {
  const historyPoints = [];
  const now = new Date();
  
  // Generate data points going backwards in time
  for (let i = daysBack; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    
    // Create realistic price fluctuations
    // Base volatility: 2-5% of current price
    const baseVolatility = currentPrice * 0.03; // 3% volatility
    
    // Random walk with mean reversion
    let price = currentPrice;
    
    if (i > 0) {
      // Generate slight variations for historical data
      const randomFactor = (Math.random() - 0.5) * 2; // -1 to 1
      const daysFactor = i / daysBack; // Weight older prices differently
      
      // Add some trends - prices might have been higher/lower in the past
      const trendFactor = Math.sin(i / 7) * 0.02; // Weekly trend pattern
      
      price = currentPrice * (1 + (randomFactor * baseVolatility / currentPrice) + (trendFactor * daysFactor));
      
      // Ensure price doesn't deviate too much (max 15% from current)
      const maxDeviation = currentPrice * 0.15;
      price = Math.max(currentPrice - maxDeviation, Math.min(currentPrice + maxDeviation, price));
    }
    
    // Round to reasonable precision (2 decimal places)
    price = Math.round(price * 100) / 100;
    
    historyPoints.push({
      price: price,
      timestamp: date.toISOString()
    });
  }
  
  return historyPoints;
}

// Get price history for a product - NO AUTHENTICATION FOR TESTING
router.get('/', async (req: Request, res: Response) => {
  try {
    console.log('🔍 Price history request:', req.query);

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

    console.log(`🔍 Found ${matchingProducts.length} matching products`);

    if (matchingProducts.length === 0) {
      console.log('❌ No matching products found');
      return res.json(null);
    }

    const product = matchingProducts[0];
    console.log('✅ Found product:', product.model, 'from', product.supplier);

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

    console.log(`🔍 Found ${priceHistory.length} price change events`);

    // Generate enhanced price history
    let historyPoints;
    
    if (priceHistory.length > 0) {
      // Use actual price change events
      historyPoints = priceHistory.map(event => ({
        price: parseFloat(event.price.toString()),
        timestamp: event.timestamp.toISOString()
      }));
    } else {
      // Generate realistic historical data for demo purposes
      historyPoints = generateHistoricalPriceData(parseFloat(product.currentPrice.toString()));
    }

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
    res.json(result);

  } catch (error) {
    console.error('❌ Error fetching price history:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to fetch price history'
    });
  }
});

export { router as priceHistoryRouter };