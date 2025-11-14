// Rotas para métricas de custo e economia
import { Router } from 'express';
import type { Request, Response } from 'express';
import { CostTrackingService } from '../services/cost-tracking.service';
import { authenticateToken, type AuthenticatedRequest } from '../middleware/auth';

const router = Router();
const costTracker = CostTrackingService.getInstance();

// Endpoint público para métricas básicas
router.get('/metrics', (req: Request, res: Response) => {
  try {
    const metrics = costTracker.getMetrics();
    
    res.json({
      success: true,
      data: metrics,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Error fetching cost metrics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch cost metrics'
    });
  }
});

// Endpoint detalhado (requer autenticação)
router.get('/detailed', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  try {
    const stats = costTracker.getDetailedStats();
    
    res.json({
      success: true,
      data: stats,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Error fetching detailed cost stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch detailed cost stats'
    });
  }
});

export { router as costMetricsRoutes };
