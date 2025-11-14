import { Router } from 'express';
import { authenticateToken, type AuthenticatedRequest } from '../middleware/auth';
import { RealtimeSyncService } from '../services/realtime-sync.service';

const router = Router();

// Status do serviço de tempo real
router.get('/status', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const realtimeSync = RealtimeSyncService.getInstance();
    const status = realtimeSync.getStatus();
    
    res.json({
      success: true,
      data: status
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Error getting realtime sync status',
      error: error.message
    });
  }
});

// Forçar sincronização manual
router.post('/force-sync', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    if (!req.user?.isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Admin access required'
      });
    }

    const realtimeSync = RealtimeSyncService.getInstance();
    await realtimeSync.forcSync();
    
    res.json({
      success: true,
      message: 'Manual sync completed'
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Error forcing sync',
      error: error.message
    });
  }
});

// Iniciar serviço de tempo real
router.post('/start', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    if (!req.user?.isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Admin access required'
      });
    }

    const realtimeSync = RealtimeSyncService.getInstance();
    realtimeSync.start();
    
    res.json({
      success: true,
      message: 'Realtime sync service started'
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Error starting service',
      error: error.message
    });
  }
});

// Parar serviço de tempo real
router.post('/stop', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    if (!req.user?.isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Admin access required'
      });
    }

    const realtimeSync = RealtimeSyncService.getInstance();
    realtimeSync.stop();
    
    res.json({
      success: true,
      message: 'Realtime sync service stopped'
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Error stopping service',
      error: error.message
    });
  }
});

export { router as realtimeAdminRoutes };