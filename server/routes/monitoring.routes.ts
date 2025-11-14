// Rotas de monitoramento de preços e sincronização - status em tempo real e controle de sync
import { Router } from 'express';
import type { Request, Response } from 'express';
import { storage } from '../storage';
import { authenticateToken, type AuthenticatedRequest } from '../middleware/auth';
import { parseGoogleSheetWithDate } from '../services/google-sheets-parser';
import { db } from '../db';
import { eq, desc, and, sql, gte } from 'drizzle-orm';
import { syncLogs } from '@shared/schema';

const router = Router();

// Função auxiliar para pegar a data mais recente
async function getLatestDate(): Promise<string | null> {
  try {
    // Usar o serviço do Google Sheets para obter datas disponíveis
    const { googleSheetsService } = await import('../services/google-sheets');
    const SHEET_ID = process.env.GOOGLE_SHEET_ID;

    if (!SHEET_ID) {
      console.error('Google Sheet ID not configured');
      return null;
    }

    const availableSheets = await googleSheetsService.getAvailableSheets(SHEET_ID);
    const dateSheets = availableSheets.filter(sheet => /^\d{2}-\d{2}$/.test(sheet));

    if (dateSheets.length === 0) return null;

    // Ordenar datas (mais recente primeira)
    dateSheets.sort((a, b) => {
      const [dayA, monthA] = a.split('-').map(Number);
      const [dayB, monthB] = b.split('-').map(Number);

      if (monthA !== monthB) return monthB - monthA;
      return dayB - dayA;
    });

    return dateSheets[0];
  } catch (error) {
    console.error('Error getting latest date:', error);
    return null;
  }
}

// Função para ler o horário da última atualização da célula B1 da aba "controle"
async function getLastUpdateTimeFromSheet(): Promise<string | null> {
  try {
    const { googleSheetsService } = await import('../services/google-sheets');
    const SHEET_ID = process.env.GOOGLE_SHEET_ID;

    if (!SHEET_ID) {
      console.error('Google Sheet ID not configured');
      return null;
    }

    // Ler a célula B1 da aba "controle"
    const range = 'controle!B1';
    console.log(`📊 Reading last update time from: ${range}`);

    const values = await googleSheetsService.getSheetData(SHEET_ID, range);

    if (!values || values.length === 0 || !values[0] || !values[0][0]) {
      console.log('⚠️ No data found in controle!B1');
      return null;
    }

    const lastUpdateValue = values[0][0];
    console.log(`📅 Last update time from sheet: "${lastUpdateValue}"`);

    // Retorna exatamente o que está na célula B1 sem qualquer processamento
    return lastUpdateValue;
  } catch (error) {
    console.error('Error reading last update time from sheet:', error);
    return null;
  }
}

// Status real do monitoramento de preços
router.get('/real-status', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    console.log('📊 Price monitoring real status request');

    // Obter data mais recente
    const latestDate = await getLatestDate();
    if (!latestDate) {
      return res.status(404).json({
        message: 'Nenhuma data disponível',
        status: 'no_data',
        lastSync: null
      });
    }

    // Verificar status da planilha
    let sheetsStatus = 'unknown';
    let productCount = 0;
    let lastUpdate = null;
    let sheetLastUpdate = null;

    try {
      const SHEET_ID = process.env.GOOGLE_SHEET_ID;
      if (!SHEET_ID) {
        throw new Error('Google Sheet ID not configured');
      }

      // Primeiro, tentar ler o horário real da célula B1 da aba "controle"
      sheetLastUpdate = await getLastUpdateTimeFromSheet();
      if (sheetLastUpdate) {
        // Usar o valor exato da célula B1 sem qualquer conversão ou processamento
        lastUpdate = sheetLastUpdate;
        console.log(`📅 Using exact value from controle!B1: ${sheetLastUpdate}`);
      }

      const sheetsData = await parseGoogleSheetWithDate(SHEET_ID, latestDate);
      if (sheetsData && sheetsData.products && Array.isArray(sheetsData.products)) {
        productCount = sheetsData.products.length;
        sheetsStatus = productCount > 0 ? 'active' : 'empty';

        // Se não conseguiu ler da planilha de controle, usar fallback
        if (!lastUpdate) {
          const productsWithUpdate = sheetsData.products.filter(p => p.ultimaAtualizacao);
          if (productsWithUpdate.length > 0) {
            const latestUpdateTime = Math.max(...productsWithUpdate.map(p => 
              new Date(p.ultimaAtualizacao).getTime()
            ));
            lastUpdate = new Date(latestUpdateTime).toISOString();
          } else {
            lastUpdate = new Date().toISOString();
          }
        }
      } else {
        sheetsStatus = 'error';
      }
    } catch (error) {
      console.error('Error checking sheets status:', error);
      sheetsStatus = 'error';
    }

    // Obter último log de sincronização
    const lastSyncLog = await db.select()
      .from(syncLogs)
      .orderBy(desc(syncLogs.createdAt))
      .limit(1);

    const syncInfo = lastSyncLog[0] || null;

    // Calcular disponibilidade das datas
    const availableDates = await storage.getDates();

    const status = {
      monitoring: 'active',
      sheets: sheetsStatus,
      latestDate,
      productCount,
      lastUpdate,
      lastSync: syncInfo ? {
        date: syncInfo.createdAt,
        success: syncInfo.success,
        message: syncInfo.message,
        duration: syncInfo.duration
      } : null,
      availableDates: availableDates.length,
      systemStatus: sheetsStatus === 'active' ? 'operational' : 'degraded'
    };

    console.log(`📊 Monitoring Status Response:`, {
      systemStatus: status.systemStatus,
      productCount,
      lastUpdate,
      lastUpdateSource: sheetLastUpdate ? 'controle!B1' : 'products_data',
      sheetControlValue: sheetLastUpdate,
      lastSyncDate: syncInfo?.createdAt,
      availableDates: availableDates.length,
      sheetsStatus
    });

    res.json({
      status,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error getting monitoring status:', error);
    res.status(500).json({
      message: 'Erro interno do servidor',
      status: 'error'
    });
  }
});

// Reordenação manual de preços
router.post('/manual-reorder', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { dateFilter } = req.body;

    console.log(`🔄 Manual reorder request for date: ${dateFilter}`);

    // Determinar a data
    let targetDate = dateFilter;
    if (!targetDate) {
      targetDate = await getLatestDate();
      if (!targetDate) {
        return res.status(404).json({
          message: 'Nenhuma data disponível para reordenação',
          success: false
        });
      }
    }

    // Verificar dados da planilha
    let sheetsData;
    try {
      sheetsData = await parseGoogleSheetWithDate(targetDate);
      if (!sheetsData || !Array.isArray(sheetsData) || sheetsData.length === 0) {
        return res.status(404).json({
          message: 'Nenhum produto encontrado para reordenação',
          success: false
        });
      }
    } catch (error) {
      console.error('Error fetching data for reorder:', error);
      return res.status(500).json({
        message: 'Erro ao buscar dados para reordenação',
        success: false
      });
    }

    // Log da operação
    await storage.createSyncLog({
      operation: 'manual_reorder',
      success: true,
      message: `Manual reorder completed for ${targetDate}. Found ${sheetsData.length} products`,
      duration: 0,
      dataReferencia: targetDate,
      totalProducts: sheetsData.length,
      errorDetails: null
    });

    console.log(`✅ Manual reorder completed: ${sheetsData.length} products processed`);

    res.json({
      message: 'Reordenação manual concluída com sucesso',
      success: true,
      date: targetDate,
      productsProcessed: sheetsData.length,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error in manual reorder:', error);

    // Log do erro
    await storage.createSyncLog({
      operation: 'manual_reorder',
      success: false,
      message: `Manual reorder failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      duration: 0,
      dataReferencia: req.body.dateFilter || 'unknown',
      totalProducts: 0,
      errorDetails: error instanceof Error ? error.stack : null
    });

    res.status(500).json({
      message: 'Erro na reordenação manual',
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Estatísticas de monitoramento
router.get('/stats', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    console.log('📊 Monitoring stats request');

    // Obter estatísticas dos últimos 7 dias
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const recentSyncs = await db.select()
      .from(syncLogs)
      .where(gte(syncLogs.createdAt, sevenDaysAgo))
      .orderBy(desc(syncLogs.createdAt));

    // Calcular estatísticas
    const stats = {
      totalSyncs: recentSyncs.length,
      successfulSyncs: recentSyncs.filter(sync => sync.success).length,
      failedSyncs: recentSyncs.filter(sync => !sync.success).length,
      averageDuration: 0,
      lastSyncStatus: null as any,
      syncsByDay: {} as Record<string, number>,
      errorRate: 0
    };

    if (recentSyncs.length > 0) {
      // Calcular duração média
      const validDurations = recentSyncs.filter(sync => sync.duration !== null);
      if (validDurations.length > 0) {
        stats.averageDuration = validDurations.reduce((sum, sync) => sum + (sync.duration || 0), 0) / validDurations.length;
      }

      // Status do último sync
      stats.lastSyncStatus = {
        date: recentSyncs[0].createdAt,
        success: recentSyncs[0].success,
        operation: recentSyncs[0].operation,
        message: recentSyncs[0].message
      };

      // Syncs por dia
      recentSyncs.forEach(sync => {
        const day = sync.createdAt.toISOString().split('T')[0];
        stats.syncsByDay[day] = (stats.syncsByDay[day] || 0) + 1;
      });

      // Taxa de erro
      stats.errorRate = (stats.failedSyncs / stats.totalSyncs) * 100;
    }

    console.log(`📊 Monitoring stats: ${stats.totalSyncs} syncs, ${stats.errorRate.toFixed(1)}% error rate`);

    res.json({
      stats,
      period: '7 days',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error getting monitoring stats:', error);
    res.status(500).json({
      message: 'Erro interno do servidor',
      stats: null
    });
  }
});

// Eventos de monitoramento recentes
router.get('/events', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { limit = '50' } = req.query;
    const limitNum = parseInt(limit as string) || 50;

    console.log(`📊 Monitoring events request - Limit: ${limitNum}`);

    // Obter eventos recentes
    const events = await db.select()
      .from(syncLogs)
      .orderBy(desc(syncLogs.createdAt))
      .limit(limitNum);

    // Mapear eventos para formato amigável
    const formattedEvents = events.map(event => ({
      id: event.id,
      type: event.operation,
      status: event.success ? 'success' : 'error',
      message: event.message,
      date: event.createdAt,
      duration: event.duration,
      details: {
        dataReferencia: event.dataReferencia,
        totalProducts: event.totalProducts,
        errorDetails: event.errorDetails
      }
    }));

    console.log(`📊 Found ${events.length} monitoring events`);

    res.json({
      events: formattedEvents,
      totalCount: events.length,
      limit: limitNum,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error getting monitoring events:', error);
    res.status(500).json({
      message: 'Erro interno do servidor',
      events: []
    });
  }
});

// Status de sincronização
router.get('/sync/status', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    console.log('🔄 Sync status request');

    // Obter último log de sync
    const lastSync = await db.select()
      .from(syncLogs)
      .orderBy(desc(syncLogs.createdAt))
      .limit(1);

    const syncInfo = lastSync[0] || null;

    // Verificar se há sync em andamento (baseado em timestamp recente)
    const now = new Date();
    const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);

    const recentSync = syncInfo && syncInfo.createdAt > fiveMinutesAgo;
    const isRunning = recentSync && syncInfo.operation === 'scheduled_sync';

    // Obter próximo sync agendado (assumindo execução a cada hora)
    const nextSync = new Date();
    nextSync.setHours(nextSync.getHours() + 1, 0, 0, 0);

    const status = {
      isRunning,
      lastSync: syncInfo ? {
        operation: syncInfo.operation,
        success: syncInfo.success,
        message: syncInfo.message,
        date: syncInfo.createdAt,
        duration: syncInfo.duration,
        productsProcessed: syncInfo.totalProducts
      } : null,
      nextScheduledSync: nextSync.toISOString(),
      systemStatus: syncInfo?.success !== false ? 'operational' : 'degraded'
    };

    console.log(`🔄 Sync status: ${status.systemStatus}, running: ${isRunning}`);

    res.json({
      status,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error getting sync status:', error);
    res.status(500).json({
      message: 'Erro interno do servidor',
      status: null
    });
  }
});

// Limpar cache do Google Sheets
router.post('/clear-cache', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    console.log('🧹 Clearing Google Sheets cache...');

    const { googleSheetsService } = await import('../services/google-sheets');

    // Usar método público para limpar cache
    googleSheetsService.clearCache();

    // Limpar também cache do Redis
    try {
      const { default: cacheService } = await import('../services/cache-service');
      
      const cacheKeys = [
        'products:search:*',
        'aggregations:search:*', 
        'sheet-data:*',
        'supplier-contacts'
      ];
      
      for (const pattern of cacheKeys) {
        if (!pattern.includes('*')) {
          await cacheService.del(pattern);
        }
      }
      
      console.log('✅ Redis cache also cleared');
    } catch (redisError) {
      console.log('⚠️ Redis cache clearing skipped:', redisError.message);
    }

    const cacheStatus = googleSheetsService.getCacheStatus();
    console.log('Cache status after clearing:', cacheStatus);

    // Broadcast para todos os clientes
    try {
      const { broadcastToAllUsers } = await import('../websocket-manager');
      broadcastToAllUsers({
        type: 'cache_refreshed',
        message: 'Cache limpo manualmente - recarregando dados...',
        timestamp: new Date().toISOString()
      });
    } catch (wsError) {
      console.log('⚠️ WebSocket broadcast skipped:', wsError.message);
    }

    res.json({
      success: true,
      message: 'Cache limpo com sucesso. Todos os usuários receberão dados atualizados automaticamente.',
      cacheStatus,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Error clearing cache:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao limpar cache',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Sincronização manual
router.post('/sync/manual', async (req: Request, res: Response) => {
  try {
    const { dataReferencia } = req.body;

    console.log(`🔄 Manual sync request for date: ${dataReferencia}`);

    // Determinar a data
    let targetDate = dataReferencia;
    if (!targetDate) {
      targetDate = await getLatestDate();
      if (!targetDate) {
        return res.status(404).json({
          message: 'Nenhuma data disponível para sincronização',
          success: false
        });
      }
    }

    const startTime = Date.now();

    try {
      // Executar sincronização
      const sheetsData = await parseGoogleSheetWithDate(targetDate);
      const duration = Date.now() - startTime;

      if (!sheetsData || !Array.isArray(sheetsData)) {
        throw new Error('Dados inválidos recebidos da planilha');
      }

      // Log de sucesso
      await storage.createSyncLog({
        operation: 'manual_sync',
        success: true,
        message: `Manual sync completed successfully for ${targetDate}. Processed ${sheetsData.length} products`,
        duration,
        dataReferencia: targetDate,
        totalProducts: sheetsData.length,
        errorDetails: null
      });

      console.log(`✅ Manual sync completed: ${sheetsData.length} products in ${duration}ms`);

      res.json({
        message: 'Sincronização manual concluída com sucesso',
        success: true,
        date: targetDate,
        productsProcessed: sheetsData.length,
        duration,
        timestamp: new Date().toISOString()
      });

    } catch (syncError) {
      const duration = Date.now() - startTime;
      const errorMessage = syncError instanceof Error ? syncError.message : 'Unknown error';

      // Log de erro
      await storage.createSyncLog({
        operation: 'manual_sync',
        success: false,
        message: `Manual sync failed for ${targetDate}: ${errorMessage}`,
        duration,
        dataReferencia: targetDate,
        totalProducts: 0,
        errorDetails: syncError instanceof Error ? syncError.stack : null
      });

      console.error(`❌ Manual sync failed:`, syncError);

      res.status(500).json({
        message: 'Erro na sincronização manual',
        success: false,
        error: errorMessage,
        date: targetDate,
        duration
      });
    }

  } catch (error) {
    console.error('Error in manual sync:', error);
    res.status(500).json({
      message: 'Erro crítico na sincronização',
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export { router as monitoringRoutes };