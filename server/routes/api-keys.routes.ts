
import { Router } from 'express';
import { db } from '../db';
import { eq } from 'drizzle-orm';
import { users } from '../../shared/schema';
import { authenticateToken } from '../middleware/auth';
import crypto from 'crypto';

const router = Router();

// Generate API key for user
router.post('/generate', authenticateToken, async (req, res) => {
  try {
    const { user } = req as any;
    
    // Generate API key
    const apiKey = `pxt_${crypto.randomBytes(32).toString('hex')}`;
    
    // Update user with API key
    await db.update(users)
      .set({ 
        apiKey,
        apiKeyCreatedAt: new Date()
      })
      .where(eq(users.id, user.id));

    res.json({
      success: true,
      apiKey,
      message: 'API key gerada com sucesso'
    });
  } catch (error) {
    console.error('Error generating API key:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao gerar API key'
    });
  }
});

// Get current API key
router.get('/current', authenticateToken, async (req, res) => {
  try {
    const { user } = req as any;
    
    const userData = await db.query.users.findFirst({
      where: eq(users.id, user.id),
      columns: { apiKey: true, apiKeyCreatedAt: true }
    });

    res.json({
      success: true,
      apiKey: userData?.apiKey || null,
      createdAt: userData?.apiKeyCreatedAt || null
    });
  } catch (error) {
    console.error('Error getting API key:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao obter API key'
    });
  }
});

// Revoke API key
router.delete('/revoke', authenticateToken, async (req, res) => {
  try {
    const { user } = req as any;
    
    await db.update(users)
      .set({ 
        apiKey: null,
        apiKeyCreatedAt: null
      })
      .where(eq(users.id, user.id));

    res.json({
      success: true,
      message: 'API key revogada com sucesso'
    });
  } catch (error) {
    console.error('Error revoking API key:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao revogar API key'
    });
  }
});

export { router as apiKeysRoutes };
