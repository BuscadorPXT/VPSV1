import express from 'express';
import { db } from '../db';
import { suppliers, supplierRatings } from '../../shared/schema';
import { eq, and, avg, count, gte, desc } from 'drizzle-orm';

const router = express.Router();

// Middleware to ensure all responses are JSON
router.use((req, res, next) => {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=300'); // Cache for 5 minutes
  res.removeHeader('X-Powered-By');
  next();
});

// GET /api/ranking/suppliers - Get suppliers ranking
router.get('/suppliers', async (req, res) => {
  try {
    console.log('🏆 [RANKING] Fetching suppliers ranking...');
    
    const minRatings = parseInt(req.query.minRatings as string) || 3;
    const limit = parseInt(req.query.limit as string) || 50;
    
    console.log(`📊 [RANKING] Filtering suppliers with minimum ${minRatings} ratings, limit: ${limit}`);
    
    // Get suppliers with their calculated average ratings and total count
    const suppliersWithRatings = await db
      .select({
        id: suppliers.id,
        name: suppliers.name,
        active: suppliers.active,
        createdAt: suppliers.createdAt,
        averageRating: avg(supplierRatings.rating).mapWith(Number),
        totalRatings: count(supplierRatings.id).mapWith(Number)
      })
      .from(suppliers)
      .leftJoin(supplierRatings, and(
        eq(suppliers.id, supplierRatings.supplierId),
        eq(supplierRatings.isApproved, true)
      ))
      .where(eq(suppliers.active, true))
      .groupBy(suppliers.id, suppliers.name, suppliers.active, suppliers.createdAt)
      .having(gte(count(supplierRatings.id), minRatings))
      .orderBy(desc(avg(supplierRatings.rating)))
      .limit(limit);

    console.log(`✅ [RANKING] Found ${suppliersWithRatings.length} suppliers with ${minRatings}+ ratings`);

    // Format the response with ranking positions
    const ranking = suppliersWithRatings.map((supplier, index) => ({
      position: index + 1,
      id: supplier.id,
      name: supplier.name,
      averageRating: supplier.averageRating ? parseFloat(supplier.averageRating.toFixed(2)) : 0,
      totalRatings: supplier.totalRatings,
      createdAt: supplier.createdAt
    }));

    // Get statistics
    const stats = {
      totalActiveSuppliers: suppliersWithRatings.length,
      minRatingsRequired: minRatings,
      topRating: ranking.length > 0 ? ranking[0].averageRating : 0,
      averageRating: ranking.length > 0 ? 
        parseFloat((ranking.reduce((sum, s) => sum + s.averageRating, 0) / ranking.length).toFixed(2)) : 0
    };

    console.log(`📊 [RANKING] Stats:`, stats);

    res.json({
      success: true,
      data: {
        ranking,
        stats,
        generatedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('❌ [RANKING] Error fetching suppliers ranking:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      data: {
        ranking: [],
        stats: {
          totalActiveSuppliers: 0,
          minRatingsRequired: 3,
          topRating: 0,
          averageRating: 0
        }
      }
    });
  }
});

// GET /api/ranking/suppliers/top - Get top N suppliers
router.get('/suppliers/top', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 10;
    const minRatings = parseInt(req.query.minRatings as string) || 3;
    
    console.log(`🏆 [RANKING] Fetching top ${limit} suppliers...`);
    
    const topSuppliers = await db
      .select({
        id: suppliers.id,
        name: suppliers.name,
        averageRating: avg(supplierRatings.rating).mapWith(Number),
        totalRatings: count(supplierRatings.id).mapWith(Number)
      })
      .from(suppliers)
      .leftJoin(supplierRatings, and(
        eq(suppliers.id, supplierRatings.supplierId),
        eq(supplierRatings.isApproved, true)
      ))
      .where(eq(suppliers.active, true))
      .groupBy(suppliers.id, suppliers.name)
      .having(gte(count(supplierRatings.id), minRatings))
      .orderBy(desc(avg(supplierRatings.rating)))
      .limit(limit);

    const ranking = topSuppliers.map((supplier, index) => ({
      position: index + 1,
      id: supplier.id,
      name: supplier.name,
      averageRating: supplier.averageRating ? parseFloat(supplier.averageRating.toFixed(2)) : 0,
      totalRatings: supplier.totalRatings
    }));

    console.log(`✅ [RANKING] Top ${limit} suppliers retrieved`);

    res.json({
      success: true,
      data: {
        ranking,
        limit,
        minRatingsRequired: minRatings
      }
    });

  } catch (error) {
    console.error('❌ [RANKING] Error fetching top suppliers:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      data: {
        ranking: [],
        limit: 0,
        minRatingsRequired: 3
      }
    });
  }
});

export default router;