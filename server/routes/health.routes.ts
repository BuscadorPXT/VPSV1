
import { Router } from 'express';
import { db } from '../db';
import { sql } from 'drizzle-orm';

const router = Router();

// Database health check
router.get('/db', async (req, res) => {
  try {
    const start = Date.now();
    
    // Simple query to test connection
    await db.execute(sql`SELECT 1 as health_check`);
    
    const duration = Date.now() - start;
    
    res.json({
      status: 'healthy',
      database: 'connected',
      responseTime: `${duration}ms`,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Database health check failed:', error);
    
    res.status(503).json({
      status: 'unhealthy',
      database: 'disconnected',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Complete system health check
router.get('/system', async (req, res) => {
  const checks = {
    database: 'unknown',
    environment: 'unknown',
    memory: 'unknown'
  };

  let overallStatus = 'healthy';

  // Database check
  try {
    await db.execute(sql`SELECT 1`);
    checks.database = 'connected';
  } catch (error) {
    checks.database = 'disconnected';
    overallStatus = 'unhealthy';
  }

  // Environment check
  checks.environment = process.env.DATABASE_URL ? 'configured' : 'missing_config';
  if (!process.env.DATABASE_URL) {
    overallStatus = 'unhealthy';
  }

  // Memory check
  const memUsage = process.memoryUsage();
  checks.memory = `${Math.round(memUsage.heapUsed / 1024 / 1024)}MB used`;

  res.status(overallStatus === 'healthy' ? 200 : 503).json({
    status: overallStatus,
    checks,
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

export default router;
