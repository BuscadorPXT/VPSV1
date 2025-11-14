
import { Router } from 'express';
import { sessionManager } from '../services/session-manager.service';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// Aplicar autenticação a todas as rotas
router.use(authenticateToken);

// ✅ Estatísticas de sessões (apenas para admins)
router.get('/stats', async (req, res) => {
  try {
    const userData = (req as any).user?.userData;
    
    if (!userData || (userData.role !== 'admin' && userData.role !== 'superadmin')) {
      return res.status(403).json({
        success: false,
        message: 'Acesso negado - apenas administradores'
      });
    }

    const stats = await sessionManager.getSessionStats();
    
    res.json({
      success: true,
      stats
    });
  } catch (error) {
    console.error('Session stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao obter estatísticas de sessão'
    });
  }
});

// ✅ Limpeza de emergência (apenas para superadmins)
router.post('/emergency-cleanup', async (req, res) => {
  try {
    const userData = (req as any).user?.userData;
    
    if (!userData || userData.role !== 'superadmin') {
      return res.status(403).json({
        success: false,
        message: 'Acesso negado - apenas superadministradores'
      });
    }

    const result = await sessionManager.forceCleanupDuplicateSessions();
    
    res.json({
      success: true,
      message: 'Limpeza de emergência concluída',
      result
    });
  } catch (error) {
    console.error('Emergency cleanup error:', error);
    res.status(500).json({
      success: false,
      message: 'Erro na limpeza de emergência'
    });
  }
});

// ✅ Limpeza de sessões expiradas
router.post('/cleanup-expired', async (req, res) => {
  try {
    const userData = (req as any).user?.userData;
    
    if (!userData || (userData.role !== 'admin' && userData.role !== 'superadmin')) {
      return res.status(403).json({
        success: false,
        message: 'Acesso negado - apenas administradores'
      });
    }

    const cleanedCount = await sessionManager.cleanupExpiredSessions();
    
    res.json({
      success: true,
      message: `${cleanedCount} sessões expiradas removidas`
    });
  } catch (error) {
    console.error('Cleanup expired sessions error:', error);
    res.status(500).json({
      success: false,
      message: 'Erro na limpeza de sessões expiradas'
    });
  }
});

export default router;
