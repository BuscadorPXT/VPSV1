import { Router } from 'express';

const router = Router();

// Import and register routes immediately
import authRoutes from './routes/auth.routes';
import userRoutes from './routes/user.routes';
import { productRoutes } from './routes/product.routes';
import { adminRouter as adminRoutes } from './routes/admin.routes';
import supplierRoutes from './routes/supplier.routes';
import { stripeRoutes } from './routes/stripe.routes';
import { webhookRoutes } from './routes/webhook.routes';
import { publicRoutes } from './routes/public.routes';
import { monitoringRoutes } from './routes/monitoring.routes';
import { bugReportRoutes } from './routes/bug-report.routes';
import filterRoutes from './routes/filter.routes';
import { emergencyAlertsRouter } from './routes/emergency-alerts.routes';
import notificationsRouter from './routes/notifications.routes';
import feedbackAlertsRoutes from './routes/feedback-alerts.routes';
import supplierRecommendationsRoutes from './routes/supplier-recommendations.routes';
import { whatsappTrackingRoutes } from './routes/whatsapp-tracking.routes';
import testerAdminRoutes from './routes/tester-admin.routes';
import sessionDiagnosticsRoutes from './routes/session-diagnostics.routes';
import { apiKeysRoutes } from './routes/api-keys.routes';
import { apiV1Routes } from './routes/api-v1.routes';
import ratingsRoutes from './routes/ratings.routes';
import rankingRoutes from './routes/ranking.routes';
import interestListRoutes from './routes/interest-list.routes';
import subscriptionManagementRoutes from './routes/subscription-management.routes';
import userSubscriptionRoutes from './routes/user-subscription.routes';
import { priceHistoryRouter } from './routes/price-history-simple.routes';
import profitMarginsRoutes from './routes/profit-margins.routes';
import { eventRoutes } from './routes/event.routes';

// Authentication routes (MUST be first)
router.use('/auth', authRoutes);

// Public routes (no authentication required)
router.use('/public', publicRoutes);
router.use('/ranking', rankingRoutes);
router.use('/price-history', priceHistoryRouter);
router.use('/event', eventRoutes);

// Protected routes (require authentication)
router.use('/user', userRoutes);
router.use('/user', userSubscriptionRoutes);

// Interest List routes (require authentication)
router.use('/interest-list', interestListRoutes);

// Profit Margins routes (require authentication)
router.use('/profit-margins', profitMarginsRoutes);

// Test route for profit margins (no auth)
router.get('/profit-margins-test', async (req, res) => {
  try {
    const { simplifiedProfitMarginsService } = await import('./services/profit-margins-simplified.service');
    const categories = simplifiedProfitMarginsService.getAvailableCategories();
    res.json({ 
      success: true, 
      message: 'Profit margins service is working',
      categories,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Service error',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Ratings routes - MUST be before general supplier routes to avoid conflicts
console.log('🔧 Registering ratings routes');
router.use('/', ratingsRoutes);

// Apply product routes (MUST be after auth routes)
router.use('/products', productRoutes);
router.use('/suppliers', supplierRoutes);

// Price history routes moved to public section
router.use('/admin', adminRoutes);
router.use('/admin', subscriptionManagementRoutes);
router.use('/stripe', stripeRoutes);
router.use('/monitoring', monitoringRoutes);
router.use('/bug-report', bugReportRoutes);
router.use('/emergency-alerts', emergencyAlertsRouter);
router.use('/notifications', notificationsRouter);
router.use('/feedback-alerts', feedbackAlertsRoutes);

// API Keys management (require authentication)
router.use('/api-keys', apiKeysRoutes);

// API v1 routes (require API key) 
router.use('/v1', apiV1Routes);

// Webhook routes (no authentication but will have other security)
router.use('/webhooks', webhookRoutes);
router.use('/supplier-recommendations', supplierRecommendationsRoutes);
router.use('/whatsapp-tracking', whatsappTrackingRoutes);
router.use('/api/session', sessionDiagnosticsRoutes);

// Filter routes (with authentication) - MUST be last to avoid conflicts
router.use('/', filterRoutes);

// Global error handler for unhandled errors
router.use((error: any, req: any, res: any, next: any) => {
  console.error('❌ Global error handler caught:', error);
  console.error('❌ Request URL:', req.url);
  console.error('❌ Request method:', req.method);

  // Ensure JSON response
  res.setHeader('Content-Type', 'application/json');

  if (!res.headersSent) {
    return res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      code: 'INTERNAL_ERROR',
      timestamp: new Date().toISOString(),
      error: process.env.NODE_ENV === 'development' ? error?.message : undefined
    });
  }
});

// Debug: Log route registration
console.log('✅ Simplified API routes registered:', {
  auth: '/api/auth ✓',
  user: '/api/user ✓',
  products: '/api/products ✓',
  admin: '/api/admin ✓',
  suppliers: '/api/suppliers ✓',
  interestList: '/api/interest-list ✓',
  stripe: '/api/stripe ✓',
  webhooks: '/api/webhooks ✓',
  public: '/api/public ✓',
  monitoring: '/api/monitoring ✓',
  bugReport: '/api/bug-report ✓',
  emergencyAlerts: '/api/emergency-alerts ✓',
  notifications: '/api/notifications ✓',
  feedbackAlerts: '/api/feedback-alerts ✓',
  apiKeys: '/api/api-keys ✓',
  apiV1: '/api/v1 ✓',
  supplierRecommendations: '/api/supplier-recommendations ✓',
  whatsappTracking: '/api/whatsapp-tracking ✓',
  sessionDiagnostics: '/api/session ✓',
  filters: '/api/filters ✓'
});

export default router;