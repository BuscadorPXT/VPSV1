
import { Router } from 'express';
import type { Response } from 'express';
import { authenticateToken, type AuthenticatedRequest } from '../middleware/auth';
import { testerService } from '../services/tester.service';
import { testerCronService } from '../services/tester-cron.service';

const router = Router();

// Middleware para verificar se é admin
const requireAdmin = (req: AuthenticatedRequest, res: Response, next: Function) => {
  if (!req.user || !['admin', 'superadmin'].includes(req.user.role?.toLowerCase() || '')) {
    return res.status(403).json({ message: 'Acesso negado - Admin necessário' });
  }
  next();
};

// GET /api/tester-admin/status - Ver status dos testers
router.get('/status', authenticateToken, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const expiredTesters = await testerService.findExpiredTesters();
    const expiringTesters = await testerService.findExpiringTesters(2);
    
    res.json({
      success: true,
      data: {
        expiredCount: expiredTesters.length,
        expiringCount: expiringTesters.length,
        expired: expiredTesters.map(t => ({
          id: t.id,
          email: t.email,
          expiredAt: t.testerExpiresAt
        })),
        expiring: expiringTesters.map(t => ({
          id: t.id,
          email: t.email,
          expiresAt: t.testerExpiresAt
        }))
      }
    });
  } catch (error) {
    console.error('Error getting tester status:', error);
    res.status(500).json({ success: false, message: 'Erro interno' });
  }
});

// POST /api/tester-admin/process-expired - Processar manualmente
router.post('/process-expired', authenticateToken, requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const processedCount = await testerCronService.runManual();
    
    res.json({
      success: true,
      message: `${processedCount} testers expirados processados com sucesso`,
      processedCount
    });
  } catch (error) {
    console.error('Error processing expired testers:', error);
    res.status(500).json({ success: false, message: 'Erro ao processar testers expirados' });
  }
});

export default router;
