import express, { type Request, Response, NextFunction } from "express";
import router from "./routes";
import { registerSearchRoutes } from "./search-routes";
import { setupVite, serveStatic, log } from "./vite";
import { priceMonitorService } from "./services/price-monitor";
import { validateEnvironmentConfig, getConfig } from './config-validator';

// Validate environment configuration before starting
validateEnvironmentConfig();

const config = getConfig();
const app = express();
const PORT = config.port;


import cookieParser from 'cookie-parser';

// Middleware para parsing de cookies
app.use(cookieParser());

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Google Sheets webhook endpoint - must be registered FIRST before any other middleware
app.post('/api/webhook/google-sheets', async (req, res) => {
  try {
    console.log('Webhook recebido');
    console.log('🔗 Google Sheets webhook received:', req.body);

    const { dataReferencia, supplierName, productType } = req.body;

    if (!dataReferencia) {
      console.log('❌ Missing dataReferencia in request body');
      return res.status(400).json({ error: 'dataReferencia is required' });
    }

    console.log(`📅 Webhook triggered for date: ${dataReferencia}`);

    // ✅ CORREÇÃO CRÍTICA: Esperar sync completar ANTES de notificar via WebSocket
    console.log('🔄 Starting data sync - waiting for completion...');
    const syncSuccess = await triggerSyncForDate(dataReferencia);

    if (syncSuccess) {
      console.log('✅ Data sync completed successfully');
      
      // ✅ INVALIDAR CACHE DO SERVIDOR para garantir dados frescos
      try {
        const { googleSheetsService } = await import("./services/google-sheets");
        googleSheetsService.clearCache();
        console.log('🗑️ Server-side Google Sheets cache invalidated');
      } catch (cacheError) {
        console.warn('⚠️ Cache invalidation skipped:', cacheError);
      }
      
      // Send WebSocket notification ONLY AFTER sync AND cache invalidation
      const { UnifiedWebSocketManager } = await import("./services/websocket-manager");
      const wsManager = UnifiedWebSocketManager.getInstance();
      wsManager.broadcastSheetUpdate({
        dataReferencia,
        supplierName,
        productType
      });
      console.log('📡 WebSocket notification sent to all clients');
    } else {
      console.warn('⚠️ Sync failed - WebSocket notification not sent');
    }

    const response = { status: 'ok', message: 'Webhook received successfully', dataReferencia, syncSuccess };
    console.log('✅ Sending webhook response:', response);
    res.status(200).json(response);
  } catch (error: any) {
    console.error('❌ Google Sheets webhook error:', error);
    res.status(500).json({ status: 'error', message: 'Webhook processing failed', error: error.message });
  }
});

// Helper function to trigger sync for a specific date
async function triggerSyncForDate(dataReferencia: string): Promise<boolean> {
  try {
    console.log(`⏱️ Triggering sync for date: ${dataReferencia}`);
    
    // Make a local API call to trigger the sync with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout
    
    const response = await fetch(`http://localhost:5000/api/sync/manual`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer webhook-internal'
      },
      body: JSON.stringify({ dateOverride: dataReferencia }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Failed to trigger sync via API:', errorText);
      return false;
    }

    const result = await response.json();
    console.log('✅ Sync completed successfully:', result);
    return true;
  } catch (error: any) {
    if (error.name === 'AbortError') {
      console.error('❌ Sync timeout after 30 seconds');
    } else {
      console.error('❌ Error triggering sync for date:', error);
    }
    return false;
  }
}

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  // Use the new modular router system with /api prefix
  app.use('/api', router);

  // Register advanced search routes
  registerSearchRoutes(app);

  // Create HTTP server for WebSocket integration
  const { createServer } = await import("http");
  const server = createServer(app);

  // Initialize WebSocket Manager
  const { UnifiedWebSocketManager } = await import("./services/websocket-manager");
  const wsManager = UnifiedWebSocketManager.getInstance();
  wsManager.initialize(server);
  
  console.log('✅ WebSocket Manager initialized and connected to server');

  // ✅ COMPATIBILIDADE: Redirecionar /webhook (sem s) para /webhooks (com s)
  app.post('/api/webhook/sheets-update', async (req: Request, res: Response) => {
    console.log('🔄 Redirecting /webhook to /webhooks (compatibility)...');
    
    try {
      // Importar o handler correto
      const { handleSheetsWebhook } = await import('./sheets-webhook');
      await handleSheetsWebhook(req, res, new Set());
    } catch (error) {
      console.error('❌ Error handling webhook:', error);
      res.status(500).json({
        status: 'error',
        message: 'Webhook processing failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Endpoint para testar webhook manualmente
  // app.post('/api/test-webhook', authenticateToken, (req: Request, res: Response) => { // Assuming authenticateToken is defined elsewhere
  //   console.log('🧪 TESTE DE WEBHOOK MANUAL INICIADO');

  //   // Simular dados de webhook de alteração de preço
  //   const mockWebhookData = {
  //     sheetId: process.env.GOOGLE_SHEET_ID,
  //     sheetName: '08-06',
  //     range: 'G4',
  //     values: [['3100']], // Novo preço
  //     eventType: 'EDIT',
  //     rowIndex: 4,
  //     columnIndex: 6, // Coluna G (preço)
  //     oldValue: '3200', // Preço anterior
  //     newValue: '3100'  // Novo preço
  //   };

  //   req.body = mockWebhookData;
  //   console.log('📊 Dados simulados do webhook:', mockWebhookData);

  //   handleSheetsWebhook(req, res, wsClients);
  // });

  // Debug endpoint para verificar status do sistema
  // app.get('/api/debug/system-status', authenticateToken, (req: Request, res: Response) => { // Assuming authenticateToken is defined elsewhere
  //   const status = {
  //     timestamp: new Date().toISOString(),
  //     websocketClients: wsClients.size, // Assuming wsClients is defined elsewhere
  //     environment: {
  //       GOOGLE_SHEET_ID: process.env.GOOGLE_SHEET_ID ? 'Configurado' : 'Não configurado',
  //       NODE_ENV: process.env.NODE_ENV,
  //       PORT: process.env.PORT
  //     },
  //     endpoints: {
  //       webhook: '/api/webhook/sheets-update',
  //       testWebhook: '/api/test-webhook',
  //       notifications: '/api/notifications/price-drops'
  //     }
  //   };

  //   console.log('🔍 Status do sistema solicitado:', status);
  //   res.json(status);
  // });

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on port 5000
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = 5000;
  server.listen(port, "0.0.0.0", () => {
    log(`🚀 Server running on http://0.0.0.0:${port}`);
  });
})();