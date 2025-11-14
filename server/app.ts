import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import { validateEnvironmentConfig } from './config-validator';
import { errorHandler, notFoundHandler } from './utils/error-handler';
import { logger } from './utils/logger';
// import { storage } from './storage'; // storage is not used in this file
// import { db } from './db'; // db is not used in this file
// import websocketManager from './websocket-manager'; // websocketManager is not used in this file
import supplierRecommendationRoutes from './routes/supplier-recommendations.routes';
import { whatsappTrackingRoutes } from './routes/whatsapp-tracking.routes';
import authRoutes from './routes/auth.routes';
import authDebugRoutes from './routes/auth-debug.routes';
import userRoutes from './routes/user.routes';
import adminRoutes from './routes/admin.routes';
import { authenticateToken } from './middleware/auth.middleware'; // Assuming authenticateToken is defined here

// Import route modules
import { publicRoutes } from './routes/public.routes';
import { productRoutes } from './routes/product.routes';
import { webhookRoutes } from './routes/webhook.routes';
import { notificationsRoutes } from './routes/notifications.routes';
import { emergencyAlertsRoutes } from './routes/emergency-alerts.routes';
import { feedbackAlertsRoutes } from './routes/feedback-alerts.routes';
import { bugReportRoutes } from './routes/bug-report.routes';
import { subscriptionManagementRoutes } from './routes/subscription-management.routes';
import { userSubscriptionRoutes } from './routes/user-subscription.routes';
import { stripeRoutes } from './routes/stripe.routes';
import { apiKeysRoutes } from './routes/api-keys.routes';
import { testerAdminRoutes } from './routes/tester-admin.routes';
import { interestListRoutes } from './routes/interest-list.routes';
import { sheetsRoutes } from './routes/sheets.routes';
import { filterRoutes } from './routes/filter.routes';
import { priceHistoryRoutes } from './routes/price-history.routes';
import { profitMarginsRoutes } from './routes/profit-margins.routes';
import { monitoringRoutes } from './routes/monitoring.routes';
import { publicExchangeRoutes } from './routes/public-exchange.routes';
import { sessionDiagnosticsRoutes } from './routes/session-diagnostics.routes';
import { realtimeAdminRoutes } from './routes/realtime-admin.routes';
import { safariDiagnosticsRoutes } from './routes/safari-diagnostics.routes';
import healthRoutes from './routes/health.routes';
import { costMetricsRoutes } from './routes/cost-metrics.routes';

const app = express();

// ✅ SECURITY: Trust proxy for accurate IP addresses
app.set('trust proxy', 1);

// ✅ CORS configuration - must be before routes
const corsOrigins = process.env.CORS_ORIGIN?.split(',') || [
  'https://7081f9c2-0746-4fa0-bc2f-2274a33b30ad-00-27oyim1rk306b.riker.replit.dev',
  'http://localhost:5173',
  'http://localhost:3000',
  'https://localhost:5173'
];

app.use(cors({
  origin: corsOrigins,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-session-token', 'x-api-key', 'Accept', 'User-Agent'],
  exposedHeaders: ['set-cookie', 'x-session-token'], // ✅ SAFARI FIX: Expor headers necessários
  preflightContinue: false,
  optionsSuccessStatus: 200 // ✅ SAFARI FIX: Compatibilidade com navegadores antigos
}));

// ✅ Essential middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// ✅ PERFORMANCE: Cache headers para recursos estáticos
app.use((req, res, next) => {
  // 🔥 CACHE BUSTING: No-cache para HTML para forçar revalidação
  if (req.path.endsWith('.html') || req.path === '/' || !req.path.includes('.')) {
    res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
  }
  // Cache moderado para JS/CSS (5 minutos em vez de browser default)
  else if (req.path.endsWith('.js') || req.path.endsWith('.css')) {
    res.set('Cache-Control', 'public, max-age=300'); // 5 min
  }
  // Cache para recursos API específicos
  else if (req.path.includes('/api/products/dates') || req.path.includes('/api/user/profile')) {
    res.set('Cache-Control', 'public, max-age=3600'); // 1 hora de cache
  }
  next();
});

// ✅ Request logging middleware
app.use((req, res, next) => {
  const timestamp = new Date().toLocaleTimeString();
  console.log(`${timestamp} [express] ${req.method} ${req.path}`);
  next();
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Import routes from the main routes file
import routes from './routes';

// ✅ WEBSOCKET BYPASS: Ensure WebSocket connections bypass HTTP auth middleware
// The /ws route should be handled by the WebSocket server directly, not Express middleware
app.use((req, res, next) => {
  // Skip auth middleware for WebSocket upgrade requests
  if (req.url === '/ws' || req.headers.upgrade === 'websocket') {
    console.log('🔄 [WebSocket] Bypassing HTTP auth middleware for WebSocket connection');
    return next();
  }
  next();
});

// Mount routes - IMPORTANT: Mount products routes first to avoid conflicts
app.use('/api/products', productRoutes);
// API Routes with detailed logging
app.use('/api/auth', authRoutes);
app.use('/api/user', authenticateToken, userRoutes);
app.use('/api/admin', authenticateToken, adminRoutes);
app.use('/api/public', publicRoutes);
app.use('/api/webhook', webhookRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/emergency-alerts', emergencyAlertsRoutes);
app.use('/api/feedback-alerts', feedbackAlertsRoutes);
app.use('/api/bug-report', bugReportRoutes);
app.use('/api/subscription-management', subscriptionManagementRoutes);
app.use('/api/user-subscription', userSubscriptionRoutes);
app.use('/api/stripe', stripeRoutes);
app.use('/api/api-keys', apiKeysRoutes);
app.use('/api/whatsapp-tracking', whatsappTrackingRoutes);
app.use('/api/supplier-recommendations', supplierRecommendationRoutes);
app.use('/api/tester-admin', testerAdminRoutes);
app.use('/api/interest-list', interestListRoutes);
app.use('/api/sheets', sheetsRoutes);
app.use('/api/filters', filterRoutes);
app.use('/api/price-history', priceHistoryRoutes);
app.use('/api/profit-margins', profitMarginsRoutes);
app.use('/api/monitoring', monitoringRoutes);
app.use('/api/public-exchange', publicExchangeRoutes);
app.use('/api/session-diagnostics', sessionDiagnosticsRoutes);
app.use('/api/realtime-admin', realtimeAdminRoutes);
app.use('/api/safari-diagnostics', safariDiagnosticsRoutes);
app.use('/api/health', healthRoutes);
app.use('/api/cost-metrics', costMetricsRoutes); // Cost tracking and savings metrics
app.use('/api/auth', authDebugRoutes); // Added authDebugRoutes back

// Removed rating functionality middleware - no longer blocking all routes

// Handler for API routes not found
app.use('/api/*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Endpoint not found',
    path: req.path,
    method: req.method
  });
});

// 404 handler
app.use(notFoundHandler);

// Global error handler
app.use(errorHandler);

export class App {
  public app: express.Application;
  public server: any;
  public wss: WebSocketServer | undefined;

  constructor() {
    this.app = app;
    this.initializeMiddlewares();
    this.initializeRoutes();
    this.initializeErrorHandling();
  }

  private initializeMiddlewares(): void {
    // Validate environment configuration
    validateEnvironmentConfig();

    // CORS configuration (this is redundant as CORS is already configured globally)
    const corsOptions = {
      origin: process.env.CORS_ORIGIN?.split(',') || [
        'http://localhost:5173',
        'http://localhost:3000',
        /\.replit\.dev$/,
        /\.replit\.app$/
      ],
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
    };

    // this.app.use(cors(corsOptions)); // The cors middleware is applied before the App class is instantiated
    // this.app.use(cookieParser()); // ✅ SEGURANÇA: Middleware para parsing de cookies
    // this.app.use(express.json({ limit: '10mb' }));
    // this.app.use(express.urlencoded({ extended: true }));

    // Request logging
    this.app.use((req, res, next) => {
      logger.info(`${req.method} ${req.path}`);
      next();
    });
  }

  private initializeRoutes(): void {
    // Use centralized routes system
    // this.app.use('/api', routes); // The routes middleware is applied before the App class is instantiated

    // Health check
    this.app.get('/api/health', (req, res) => {
      res.json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development'
      });
    });

    // API documentation
    this.app.get('/api', (req, res) => {
      res.json({
        name: 'Buscador PXT API',
        version: '2.0.0',
        description: 'Apple product price comparison system',
        endpoints: {
          auth: '/api/auth',
          products: '/api/products',
          admin: '/api/admin',
          webhooks: '/api/webhook'
        }
      });
    });
  }

  private initializeErrorHandling(): void {
    // Handler para rotas de API não encontradas
    this.app.use('/api/*', (req, res) => {
      res.status(404).json({
        success: false,
        message: 'Endpoint não encontrado',
        path: req.path,
        method: req.method
      });
    });

    // 404 handler
    this.app.use(notFoundHandler);

    // Global error handler
    this.app.use(errorHandler);
  }

  public initializeWebSocket(server: any): void {
    this.wss = new WebSocketServer({ server });

    this.wss.on('connection', (ws, req) => {
      logger.info('New WebSocket connection established');

      ws.on('message', (message) => {
        try {
          const data = JSON.parse(message.toString());
          logger.debug('WebSocket message received:', data);
        } catch (error) {
          logger.error('Invalid WebSocket message:', error);
        }
      });

      ws.on('close', () => {
        logger.info('WebSocket connection closed');
      });

      ws.on('error', (error) => {
        logger.error('WebSocket error:', error);
      });
    });
  }

  public broadcast(message: any): void {
    if (this.wss) {
      this.wss.clients.forEach((client) => {
        if (client.readyState === client.OPEN) {
          client.send(JSON.stringify(message));
        }
      });
    }
  }

  private async gracefulShutdown(): Promise<void> {
    console.log('🔄 Starting graceful shutdown...');

    if (this.server) {
      this.server.close(() => {
        console.log('✅ HTTP server closed');
        process.exit(0);
      });

      // Force close after 10 seconds
      setTimeout(() => {
        console.log('⚠️ Force closing server');
        process.exit(1);
      }, 10000);
    } else {
      process.exit(0);
    }
  }

  public async listen(port: number): Promise<void> {
    this.server = createServer(this.app);

    // Graceful shutdown handling
    process.on('SIGTERM', this.gracefulShutdown.bind(this));
    process.on('SIGINT', this.gracefulShutdown.bind(this));
    process.on('uncaughtException', (error) => {
      console.error('❌ Uncaught Exception:', error);
      this.gracefulShutdown();
    });
    process.on('unhandledRejection', (reason) => {
      console.error('❌ Unhandled Rejection:', reason);
      this.gracefulShutdown();
    });

    // Initialize WebSocket server
    try {
      const { UnifiedWebSocketManager } = await import('./services/websocket-manager');
      const wsManager = UnifiedWebSocketManager.getInstance();
      wsManager.initialize(this.server);
      console.log('✅ WebSocket Manager initialized');

      // Also set the WebSocket clients for the webhook routes
      const { setWebSocketClients } = await import('./routes/webhook.routes');
      // Create a bridge between the two WebSocket systems
      const wsClients = new Set();

      // Store reference for webhook broadcasting
      (global as any).wsManager = wsManager;

      // Initialize Real-time Sync Service for business hours optimization
      try {
        const { RealtimeSyncService } = await import('./services/realtime-sync.service');
        const realtimeSync = RealtimeSyncService.getInstance();
        realtimeSync.start();
        console.log('🚀 Real-time Sync Service started for business hours optimization');
      } catch (error) {
        console.error('❌ Failed to initialize Real-time Sync Service:', error);
      }

      // Initialize Session Cleanup Service
      try {
        const { SessionCleanupService } = await import('./services/session-cleanup.service');
        const sessionCleanup = SessionCleanupService.getInstance();
        sessionCleanup.start();
        console.log('🧹 Session Cleanup Service started');
      } catch (error) {
        console.error('❌ Failed to initialize Session Cleanup Service:', error);
      }

      console.log('✅ WebSocket bridge established for real-time updates');
    } catch (error) {
      console.error('❌ Failed to initialize WebSocket Manager:', error);
    }

    // Configurar storage
    // await storage.initialize(); // Already initialized elsewhere

    // Inicializar serviço de expiração automática de testers
    // testerCronService.start(); // testerCronService is not defined
    logger.info('🚀 Tester automatic expiration service started');

    const PORT = parseInt(process.env.PORT || '5000', 10);
    const HOST = process.env.NODE_ENV === 'production' ? '0.0.0.0' : 'localhost';

    this.server.listen(PORT, HOST, () => {
      console.log(`✅ Server running on ${HOST}:${PORT}`);
      console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
      if (process.env.NODE_ENV === 'development') {
        console.log(`🔗 URL: http://localhost:${PORT}`);
      } else {
        console.log(`🔗 Production server listening on 0.0.0.0:${PORT}`);
      }
      console.log(`✅ WebSocket server initialized`);
    });
  }
}

export default App;