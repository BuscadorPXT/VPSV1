
import { Router } from 'express';
import { authenticateToken } from '../middleware/auth';
import { db } from '../db';
import { sql } from 'drizzle-orm';

const router = Router();

// All routes require authentication
router.use(authenticateToken);

// Track search query
router.post('/track-search', async (req, res) => {
  try {
    const { query, userId } = req.body;
    
    if (!query || query.trim().length < 2) {
      return res.status(400).json({ error: 'Query too short' });
    }

    // Insert search tracking
    await db.execute(sql`
      INSERT INTO search_analytics (query, user_id, searched_at)
      VALUES (${query.trim().toLowerCase()}, ${userId}, NOW())
    `);

    res.json({ success: true });
  } catch (error) {
    console.error('Search tracking error:', error);
    res.status(500).json({ error: 'Failed to track search' });
  }
});

// Get popular searches
router.get('/popular-searches', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 10;
    const days = parseInt(req.query.days as string) || 7;

    const popularSearches = await db.execute(sql`
      SELECT 
        query,
        COUNT(*) as search_count,
        COUNT(DISTINCT user_id) as unique_users
      FROM search_analytics 
      WHERE searched_at >= NOW() - INTERVAL '${days} days'
      GROUP BY query
      HAVING COUNT(*) >= 2
      ORDER BY search_count DESC, unique_users DESC
      LIMIT ${limit}
    `);

    res.json({
      popularSearches: popularSearches.rows || [],
      period: `${days} days`,
      total: popularSearches.rows?.length || 0
    });
  } catch (error) {
    console.error('Popular searches error:', error);
    res.status(500).json({ error: 'Failed to get popular searches' });
  }
});

// Get search trends
router.get('/search-trends', async (req, res) => {
  try {
    const days = parseInt(req.query.days as string) || 7;

    const trends = await db.execute(sql`
      SELECT 
        DATE(searched_at) as search_date,
        query,
        COUNT(*) as daily_count
      FROM search_analytics 
      WHERE searched_at >= NOW() - INTERVAL '${days} days'
      GROUP BY DATE(searched_at), query
      HAVING COUNT(*) >= 2
      ORDER BY search_date DESC, daily_count DESC
    `);

    res.json({
      trends: trends.rows || [],
      period: `${days} days`
    });
  } catch (error) {
    console.error('Search trends error:', error);
    res.status(500).json({ error: 'Failed to get search trends' });
  }
});

export { router as searchAnalyticsRoutes };
