import { Router } from 'express';
import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types/express.types';
import { authenticateToken } from '../middleware/auth';
import { db } from '../db';
import { whatsAppClicks, users } from '../../shared/schema';
import { desc, count, gte, sql } from 'drizzle-orm';
import { logger } from '../utils/logger';
import { validateWhatsAppAccess } from '../middleware/whatsapp-access';
import { whatsAppTrackingController } from '../controllers/whatsapp-tracking.controller';
import { eq } from 'drizzle-orm';

const router = Router();

// All routes require authentication
router.use(authenticateToken);

// Register WhatsApp click
router.post('/click', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const {
      productModel,
      productBrand,
      productColor,
      productStorage,
      productCategory,
      supplierName,
      whatsappNumber,
      productPrice
    } = req.body;

    // Validate and clean WhatsApp number
    const cleanWhatsAppNumber = (number: string): string | null => {
      if (!number || typeof number !== 'string') return null;
      const cleaned = number.replace(/\D/g, '');
      return cleaned.length >= 10 ? cleaned : null;
    };

    const cleanedWhatsAppNumber = cleanWhatsAppNumber(whatsappNumber);

    console.log('📱 WhatsApp click tracking:', {
      userId: req.user?.id,
      productModel,
      supplierName,
      whatsappNumber: cleanedWhatsAppNumber?.slice(0, 5) + '***', // Log partial number for privacy
      originalNumber: whatsappNumber?.slice(0, 5) + '***'
    });

    if (!req.user?.id || !productModel || !supplierName || !cleanedWhatsAppNumber) {
      console.warn('📱 Invalid WhatsApp tracking data:', {
        hasUserId: !!req.user?.id,
        hasProductModel: !!productModel,
        hasSupplierName: !!supplierName,
        hasValidWhatsApp: !!cleanedWhatsAppNumber,
        originalWhatsApp: whatsappNumber
      });

      return res.status(400).json({
        success: false,
        error: 'Missing or invalid required fields: productModel, supplierName, or whatsappNumber'
      });
    }

    // 🚨 VERIFICAÇÃO DE SEGURANÇA: Bloquear usuários Tester
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Usuário não autenticado'
      });
    }

    // 🚨 VERIFICAÇÃO DE SEGURANÇA: Bloquear apenas usuários Tester no backend
    const userInfo = await db.select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (userInfo.length > 0) {
      const user = userInfo[0];
      const isTester = user.role === 'tester' || user.subscriptionPlan === 'tester';

      if (isTester) {
        console.log(`🚫 BACKEND BLOCK: Tester user ${user.email} tried to click WhatsApp link`);
        return res.status(403).json({
          success: false,
          message: 'Usuários Tester não podem acessar links do WhatsApp',
          blocked: true,
          reason: 'tester_restriction'
        });
      }

      // ✅ LOG PARA USUÁRIOS NÃO-TESTER
      console.log(`✅ BACKEND ALLOW: Non-Tester user ${user.email} (Role: ${user.role}, Plan: ${user.subscriptionPlan}) can access WhatsApp links`);
    }

    // Get client IP and User Agent
    const ipAddress = req.headers['x-forwarded-for'] as string || 
                     req.headers['x-real-ip'] as string || 
                     req.connection.remoteAddress || 
                     req.socket.remoteAddress || 
                     'unknown';

    const userAgent = req.headers['user-agent'] || 'unknown';

    // Save click to database
    const [whatsappClick] = await db.insert(whatsAppClicks).values({
      userId: req.user.id,
      productModel: productModel.trim(),
      productBrand: productBrand?.trim() || null,
      productColor: productColor?.trim() || null,
      productStorage: productStorage?.trim() || null,
      productCategory: productCategory?.trim() || null,
      supplierName: supplierName.trim(),
      whatsappNumber: cleanedWhatsAppNumber, // Use cleaned number
      productPrice: productPrice ? productPrice.toString() : null,
      ipAddress: Array.isArray(ipAddress) ? ipAddress[0] : ipAddress,
      userAgent
    }).returning();

    logger.info(`📱 WhatsApp click registered: User ${req.user.email} clicked ${supplierName} for ${productModel}`);

    res.json({
      success: true,
      clickId: whatsappClick.id,
      message: 'Click registered successfully'
    });

  } catch (error) {
    logger.error('WhatsApp click tracking error:', error);
    console.error('❌ WhatsApp click tracking error:', error);
    next(error);
  }
});

// GET /api/whatsapp-tracking/stats - Buscar estatísticas de cliques
router.get('/stats', whatsAppTrackingController.getStats.bind(whatsAppTrackingController));

export { router as whatsappTrackingRoutes };