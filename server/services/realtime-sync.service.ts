import { UnifiedWebSocketManager } from './websocket-manager';
import { parseGoogleSheetWithDate } from './google-sheets-parser';
// import { CacheService } from './cache-service';

interface BusinessHours {
  start: number; // 8 (8h)
  end: number;   // 16 (16h)
  timezone: string; // 'America/Sao_Paulo'
}

interface SyncConfig {
  businessHours: BusinessHours;
  businessHoursInterval: number; // 30 segundos durante horário comercial
  regularInterval: number; // 5 minutos fora do horário
  batchSize: number;
  maxRetries: number;
}

export class RealtimeSyncService {
  private static instance: RealtimeSyncService;
  private syncInterval: NodeJS.Timeout | null = null;
  private isBusinessHours = false;
  private lastSyncData: any = null;
  private wsManager: UnifiedWebSocketManager;
  // private cacheService: CacheService;

  private config: SyncConfig = {
    businessHours: {
      start: 8,  // 8h
      end: 16,   // 16h
      timezone: 'America/Sao_Paulo'
    },
    businessHoursInterval: 3600000,  // 1 hora (reduzido de 30s para economia)
    regularInterval: 300000,         // 5 minutos (mantido)
    batchSize: 50,
    maxRetries: 3
  };

  private constructor() {
    this.wsManager = UnifiedWebSocketManager.getInstance();
    // this.cacheService = CacheService.getInstance();
    this.updateBusinessHoursStatus();
  }

  public static getInstance(): RealtimeSyncService {
    if (!RealtimeSyncService.instance) {
      RealtimeSyncService.instance = new RealtimeSyncService();
    }
    return RealtimeSyncService.instance;
  }

  public start(): void {
    if (this.syncInterval) {
      console.log('⚠️ [RealtimeSync] Service already running');
      return;
    }

    console.log('🚀 [RealtimeSync] Starting real-time sync service');
    this.setupSyncLoop();
    
    // Update business hours status every minute
    setInterval(() => {
      this.updateBusinessHoursStatus();
    }, 60000);
  }

  public stop(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
      console.log('🛑 [RealtimeSync] Service stopped');
    }
  }

  private updateBusinessHoursStatus(): void {
    const now = new Date();
    const brazilTime = new Intl.DateTimeFormat('en-US', {
      timeZone: this.config.businessHours.timezone,
      hour: 'numeric',
      hour12: false
    });
    
    const currentHour = parseInt(brazilTime.format(now));
    const wasBusinessHours = this.isBusinessHours;
    
    this.isBusinessHours = currentHour >= this.config.businessHours.start && 
                          currentHour < this.config.businessHours.end;

    // Se mudou o status, reinicializar o sync com novo intervalo
    if (wasBusinessHours !== this.isBusinessHours) {
      console.log(`⏰ [RealtimeSync] Business hours status changed: ${this.isBusinessHours ? 'ACTIVE' : 'INACTIVE'}`);
      this.restartSyncLoop();
    }
  }

  private setupSyncLoop(): void {
    const interval = this.isBusinessHours 
      ? this.config.businessHoursInterval 
      : this.config.regularInterval;

    console.log(`🔄 [RealtimeSync] Setting up sync loop - ${this.isBusinessHours ? 'Business Hours' : 'Regular'} mode`);
    console.log(`⏱️ [RealtimeSync] Sync interval: ${interval / 1000}s`);

    this.syncInterval = setInterval(() => {
      this.performSync();
    }, interval);

    // Executar sync imediatamente
    this.performSync();
  }

  private restartSyncLoop(): void {
    this.stop();
    this.setupSyncLoop();
  }

  private async performSync(): Promise<void> {
    try {
      const syncMode = this.isBusinessHours ? 'BUSINESS_HOURS' : 'REGULAR';
      console.log(`🔄 [RealtimeSync] Performing sync - Mode: ${syncMode}`);

      // Buscar dados mais recentes
      const latestData = await parseGoogleSheetWithDate('all');
      
      if (!latestData || !latestData.products) {
        console.log('⚠️ [RealtimeSync] No data received from sheets');
        return;
      }

      // Comparar com dados anteriores para detectar mudanças
      if (this.lastSyncData) {
        const changes = this.detectChanges(this.lastSyncData, latestData);
        
        if (changes.length > 0) {
          console.log(`📊 [RealtimeSync] Detected ${changes.length} changes`);
          await this.processChanges(changes);
        } else {
          console.log('✅ [RealtimeSync] No changes detected');
        }
      } else {
        console.log('🆕 [RealtimeSync] First sync - storing baseline data');
      }

      // Atualizar dados de referência
      this.lastSyncData = latestData;

      // Invalidar cache durante horário comercial para garantir dados frescos
      if (this.isBusinessHours) {
        await this.invalidateRelevantCache();
      }

    } catch (error) {
      console.error('❌ [RealtimeSync] Error during sync:', error);
    }
  }

  private detectChanges(oldData: any, newData: any): any[] {
    const changes: any[] = [];

    if (!oldData.products || !newData.products) {
      return changes;
    }

    // Criar maps para comparação eficiente
    const oldProductsMap = new Map();
    oldData.products.forEach((product: any) => {
      const key = `${product.model}-${product.storage}-${product.color}`.toLowerCase();
      oldProductsMap.set(key, product);
    });

    // Verificar mudanças nos produtos
    newData.products.forEach((newProduct: any) => {
      const key = `${newProduct.model}-${newProduct.storage}-${newProduct.color}`.toLowerCase();
      const oldProduct = oldProductsMap.get(key);

      if (!oldProduct) {
        // Produto novo
        changes.push({
          type: 'NEW_PRODUCT',
          product: newProduct,
          timestamp: new Date().toISOString()
        });
      } else {
        const oldPrice = parseFloat(oldProduct.price);
        const newPrice = parseFloat(newProduct.price);

        // Verificar mudança de preço
        if (Math.abs(oldPrice - newPrice) > 0.01) {
          const priceDrop = oldPrice - newPrice;
          const dropPercentage = ((priceDrop / oldPrice) * 100);

          changes.push({
            type: priceDrop > 0 ? 'PRICE_DROP' : 'PRICE_INCREASE',
            product: newProduct,
            oldPrice,
            newPrice,
            priceDrop,
            dropPercentage,
            timestamp: new Date().toISOString()
          });
        }

        // Verificar mudanças em outras propriedades (fornecedor, etc.)
        if (oldProduct.supplier?.name !== newProduct.supplier?.name) {
          changes.push({
            type: 'SUPPLIER_CHANGE',
            product: newProduct,
            oldSupplier: oldProduct.supplier?.name,
            newSupplier: newProduct.supplier?.name,
            timestamp: new Date().toISOString()
          });
        }
      }
    });

    return changes;
  }

  private async processChanges(changes: any[]): Promise<void> {
    for (const change of changes) {
      try {
        await this.processChange(change);
      } catch (error) {
        console.error('❌ [RealtimeSync] Error processing change:', error);
      }
    }
  }

  private async processChange(change: any): Promise<void> {
    switch (change.type) {
      case 'PRICE_DROP':
        await this.handlePriceDrop(change);
        break;
      
      case 'PRICE_INCREASE':
        console.log(`📈 [RealtimeSync] Price increase: ${change.product.model} - R$${change.oldPrice.toFixed(2)} → R$${change.newPrice.toFixed(2)}`);
        break;
      
      case 'NEW_PRODUCT':
        await this.handleNewProduct(change);
        break;
      
      case 'SUPPLIER_CHANGE':
        await this.handleSupplierChange(change);
        break;
    }
  }

  private async handlePriceDrop(change: any): Promise<void> {
    const { product, oldPrice, newPrice, priceDrop, dropPercentage } = change;
    
    console.log(`📉 [RealtimeSync] PRICE DROP DETECTED: ${product.model} ${product.storage} ${product.color}`);
    console.log(`💰 [RealtimeSync] ${oldPrice.toFixed(2)} → ${newPrice.toFixed(2)} (-R$${priceDrop.toFixed(2)}, ${dropPercentage.toFixed(1)}%)`);

    // Enviar notificação em tempo real via WebSocket
    this.wsManager.broadcastToAll({
      type: 'REALTIME_PRICE_DROP',
      timestamp: new Date().toISOString(),
      data: {
        productId: product.id,
        model: product.model,
        storage: product.storage,
        color: product.color,
        supplier: product.supplier?.name,
        oldPrice,
        newPrice,
        priceDrop,
        dropPercentage: parseFloat(dropPercentage.toFixed(2)),
        isRealtime: true,
        businessHours: this.isBusinessHours
      }
    });

    // Log para debugging
    console.log(`🔔 [RealtimeSync] Real-time price drop notification sent to all connected clients`);
  }

  private async handleNewProduct(change: any): Promise<void> {
    const { product } = change;
    
    console.log(`🆕 [RealtimeSync] New product detected: ${product.model} - R$${product.price}`);

    this.wsManager.broadcastToAll({
      type: 'NEW_PRODUCT_AVAILABLE',
      timestamp: new Date().toISOString(),
      data: {
        product,
        isRealtime: true,
        businessHours: this.isBusinessHours
      }
    });
  }

  private async handleSupplierChange(change: any): Promise<void> {
    const { product, oldSupplier, newSupplier } = change;
    
    console.log(`🏪 [RealtimeSync] Supplier change: ${product.model} - ${oldSupplier} → ${newSupplier}`);

    this.wsManager.broadcastToAll({
      type: 'SUPPLIER_UPDATE',
      timestamp: new Date().toISOString(),
      data: {
        product,
        oldSupplier,
        newSupplier,
        isRealtime: true,
        businessHours: this.isBusinessHours
      }
    });
  }

  private async invalidateRelevantCache(): Promise<void> {
    try {
      // Invalidar cache durante horário comercial usando googleSheetsService
      const { googleSheetsService } = await import('./google-sheets');
      
      // Limpar cache interno do googleSheetsService
      googleSheetsService.clearCache();
      console.log('🗑️ [RealtimeSync] Google Sheets cache invalidated for real-time updates');
    } catch (error) {
      console.error('❌ [RealtimeSync] Error invalidating cache:', error);
    }
  }

  public getStatus() {
    return {
      isRunning: this.syncInterval !== null,
      isBusinessHours: this.isBusinessHours,
      currentInterval: this.isBusinessHours 
        ? this.config.businessHoursInterval 
        : this.config.regularInterval,
      mode: this.isBusinessHours ? 'BUSINESS_HOURS' : 'REGULAR',
      connectedClients: this.wsManager.getClientCount()
    };
  }

  // Método para forçar sync manual (útil para testes)
  public async forcSync(): Promise<void> {
    console.log('🔄 [RealtimeSync] Manual sync triggered');
    await this.performSync();
  }
}