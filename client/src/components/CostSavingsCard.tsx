import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingDown, Zap, DollarSign, Activity } from 'lucide-react';

interface CostMetrics {
  webhookHits: number;
  pollingEvited: number;
  computeUnitsSaved: number;
  lastReset: string;
  estimatedSavings: number;
  reductionPercentage: number;
}

export function CostSavingsCard() {
  const { data: metrics, isLoading } = useQuery<{ success: boolean; data: CostMetrics }>({
    queryKey: ['/api/cost-metrics/metrics'],
    refetchInterval: 5 * 60 * 1000, // 5 minutos
    staleTime: 3 * 60 * 1000, // 3 minutos
  });

  if (isLoading) {
    return (
      <Card data-testid="cost-savings-card-loading">
        <CardHeader>
          <CardTitle>💰 Economia de Custos</CardTitle>
          <CardDescription>Carregando métricas...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const costData = metrics?.data;
  if (!costData) return null;

  const formatNumber = (num: number) => {
    if (num >= 1000000) {
      return `${(num / 1000000).toFixed(2)}M`;
    } else if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}k`;
    }
    return num.toLocaleString();
  };

  return (
    <Card className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 border-green-200 dark:border-green-800" data-testid="cost-savings-card">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-green-700 dark:text-green-300">💰 Economia de Custos</CardTitle>
          <Badge variant="default" className="bg-green-600">
            <TrendingDown className="h-3 w-3 mr-1" />
            {costData.reductionPercentage.toFixed(1)}% menos custos
          </Badge>
        </div>
        <CardDescription className="text-green-600 dark:text-green-400">
          Sistema otimizado via webhook event-driven
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* Webhooks Processados */}
          <div className="space-y-1" data-testid="metric-webhooks">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Zap className="h-4 w-4 text-yellow-500" />
              <span className="text-xs">Webhooks</span>
            </div>
            <div className="text-2xl font-bold text-foreground">{costData.webhookHits}</div>
            <p className="text-xs text-muted-foreground">eventos processados</p>
          </div>

          {/* Polling Evitado */}
          <div className="space-y-1" data-testid="metric-polling-evited">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Activity className="h-4 w-4 text-blue-500" />
              <span className="text-xs">Polling Evitado</span>
            </div>
            <div className="text-2xl font-bold text-foreground">{formatNumber(costData.pollingEvited)}</div>
            <p className="text-xs text-muted-foreground">checks desnecessários</p>
          </div>

          {/* Compute Units Economizados */}
          <div className="space-y-1" data-testid="metric-compute-units">
            <div className="flex items-center gap-2 text-muted-foreground">
              <TrendingDown className="h-4 w-4 text-green-500" />
              <span className="text-xs">Compute Units</span>
            </div>
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">
              {formatNumber(costData.computeUnitsSaved)}
            </div>
            <p className="text-xs text-muted-foreground">economizados</p>
          </div>

          {/* Dinheiro Economizado */}
          <div className="space-y-1" data-testid="metric-money-saved">
            <div className="flex items-center gap-2 text-muted-foreground">
              <DollarSign className="h-4 w-4 text-emerald-500" />
              <span className="text-xs">Economia</span>
            </div>
            <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
              ${costData.estimatedSavings.toFixed(4)}
            </div>
            <p className="text-xs text-muted-foreground">desde {new Date(costData.lastReset).toLocaleDateString('pt-BR')}</p>
          </div>
        </div>

        {/* Explicação */}
        <div className="mt-4 p-3 bg-white/50 dark:bg-black/20 rounded-md">
          <p className="text-xs text-muted-foreground">
            <strong>Como funciona:</strong> Ao invés de verificar mudanças a cada 30 segundos (polling), o sistema agora recebe notificações instantâneas via webhook do Google Sheets. Isso reduz drasticamente o uso de CPU e RAM.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
