// Serviço de rastreamento de custos e economia
// Monitora webhook hits vs polling evitado para calcular economia de compute units

interface CostMetrics {
  webhookHits: number;
  pollingEvited: number;
  computeUnitsSaved: number;
  lastReset: Date;
}

export class CostTrackingService {
  private static instance: CostTrackingService;
  private metrics: CostMetrics = {
    webhookHits: 0,
    pollingEvited: 0,
    computeUnitsSaved: 0,
    lastReset: new Date()
  };

  // Custo em compute units por operação
  private readonly COSTS = {
    webhookProcessing: 50, // Custo estimado de processar 1 webhook
    pollingCheck: 20, // Custo estimado de 1 check de polling
    cacheHit: 2, // Custo de usar cache
    cacheMiss: 100, // Custo de buscar dados do Google Sheets
  };

  private constructor() {
    // Reset metrics daily
    setInterval(() => {
      this.resetDailyMetrics();
    }, 24 * 60 * 60 * 1000);
  }

  public static getInstance(): CostTrackingService {
    if (!CostTrackingService.instance) {
      CostTrackingService.instance = new CostTrackingService();
    }
    return CostTrackingService.instance;
  }

  // Registra um hit de webhook
  public recordWebhookHit(): void {
    this.metrics.webhookHits++;
    
    // Calcula polling evitado
    // Antes: polling a cada 30s = 120 checks/hora por webhook
    // Agora: 1 webhook substitui 120 polls em 1 hora
    const pollingEvitedPerHour = 120;
    this.metrics.pollingEvited += pollingEvitedPerHour;
    
    // Calcula economia
    const pollingCost = pollingEvitedPerHour * this.COSTS.pollingCheck;
    const webhookCost = this.COSTS.webhookProcessing;
    const saved = pollingCost - webhookCost;
    
    this.metrics.computeUnitsSaved += saved;
    
    console.log(`💰 [CostTracking] Webhook processado - Economia: ${saved.toLocaleString()} compute units`);
  }

  // Registra uso de cache
  public recordCacheHit(fromWebhook: boolean = false): void {
    if (fromWebhook) {
      // Cache invalidado pelo webhook = custo do webhook já contabilizado
      return;
    }
    
    // Cache hit evitou uma chamada cara ao Google Sheets
    const saved = this.COSTS.cacheMiss - this.COSTS.cacheHit;
    this.metrics.computeUnitsSaved += saved;
  }

  // Retorna métricas atuais
  public getMetrics(): CostMetrics {
    return {
      ...this.metrics,
      // Calcular estimativas em dinheiro (baseado em $3.20 / 1 million)
      estimatedSavings: this.calculateMoneySaved(),
      // Calcular % de redução
      reductionPercentage: this.calculateReductionPercentage()
    } as any;
  }

  private calculateMoneySaved(): number {
    // $3.20 por milhão de compute units
    const dollarPerMillion = 3.20;
    return (this.metrics.computeUnitsSaved / 1000000) * dollarPerMillion;
  }

  private calculateReductionPercentage(): number {
    // Antes: ~2880 polls/dia (a cada 30s)
    // Agora: apenas webhooks quando necessário
    const pollsBeforeOptimization = 2880; // 24h * 60min * 2 (a cada 30s)
    const actualWebhooks = this.metrics.webhookHits;
    
    if (pollsBeforeOptimization === 0) return 0;
    
    const reduction = ((pollsBeforeOptimization - actualWebhooks) / pollsBeforeOptimization) * 100;
    return Math.max(0, Math.min(100, reduction));
  }

  private resetDailyMetrics(): void {
    const previous = { ...this.metrics };
    
    console.log(`📊 [CostTracking] Daily metrics reset:`);
    console.log(`   - Webhook hits: ${previous.webhookHits}`);
    console.log(`   - Polling evited: ${previous.pollingEvited}`);
    console.log(`   - Compute units saved: ${previous.computeUnitsSaved.toLocaleString()}`);
    console.log(`   - Money saved: $${this.calculateMoneySaved().toFixed(4)}`);
    console.log(`   - Reduction: ${this.calculateReductionPercentage().toFixed(1)}%`);
    
    this.metrics = {
      webhookHits: 0,
      pollingEvited: 0,
      computeUnitsSaved: 0,
      lastReset: new Date()
    };
  }

  // Retorna estatísticas detalhadas
  public getDetailedStats() {
    const now = new Date();
    const hoursActive = (now.getTime() - this.metrics.lastReset.getTime()) / (1000 * 60 * 60);
    
    return {
      current: this.metrics,
      calculated: {
        moneySaved: this.calculateMoneySaved(),
        reductionPercentage: this.calculateReductionPercentage(),
        webhooksPerHour: this.metrics.webhookHits / hoursActive,
        avgComputeUnitsPerWebhook: this.metrics.webhookHits > 0 
          ? this.metrics.computeUnitsSaved / this.metrics.webhookHits 
          : 0
      },
      projections: {
        dailySavings: (this.metrics.computeUnitsSaved / hoursActive) * 24,
        monthlySavings: ((this.metrics.computeUnitsSaved / hoursActive) * 24 * 30),
        monthlyDollarSavings: ((this.metrics.computeUnitsSaved / hoursActive) * 24 * 30 / 1000000) * 3.20
      }
    };
  }
}
