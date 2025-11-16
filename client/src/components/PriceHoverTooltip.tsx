import React, { memo } from 'react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';
import { PriceHistoryChart } from './PriceHistoryChart';
import { TrendingUp, TrendingDown, Clock, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PriceHistoryData } from '../../../shared/priceHistoryTypes';

interface PriceHoverTooltipProps {
  children: React.ReactNode;
  data: PriceHistoryData | null;
  isLoading?: boolean;
  className?: string;
}

// ⚡ OTIMIZAÇÃO #22: React.memo para evitar re-renders desnecessários (renderizado 100+ vezes)
export const PriceHoverTooltip = memo(({ children, data, isLoading, className }: PriceHoverTooltipProps) => {
  // ⚡ OTIMIZAÇÃO #17: Console.logs de debug removidos
  // Esses logs eram executados para cada célula de preço na tabela (100+ produtos)
  // Causando poluição no console (400+ logs por renderização)

  const formatPrice = (price: number) => `R$ ${price.toFixed(2)}`;
  const formatPercentage = (percentage: number) => `${percentage >= 0 ? '+' : ''}${percentage.toFixed(1)}%`;
  
  const formatRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMinutes = Math.floor(diffMs / (1000 * 60));

    if (diffDays > 0) {
      return `${diffDays}d atrás`;
    } else if (diffHours > 0) {
      return `${diffHours}h atrás`;
    } else if (diffMinutes > 0) {
      return `${diffMinutes}min atrás`;
    } else {
      return 'Agora';
    }
  };

  const isPriceRising = data && data.statistics.priceChange > 0;
  const isPriceStable = data && Math.abs(data.statistics.priceChange) < 0.01;

  return (
    <TooltipProvider>
      <Tooltip delayDuration={300}>
        <TooltipTrigger asChild className={className}>
          {children}
        </TooltipTrigger>
        <TooltipContent 
          side="top" 
          className="p-0 w-96 max-w-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-lg overflow-hidden"
          sideOffset={8}
        >
          {isLoading ? (
            <div className="p-4 flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
              <span className="text-sm">Carregando histórico de preços...</span>
            </div>
          ) : data && data.priceHistory && data.priceHistory.length > 0 ? (
            <div className="space-y-0">
              {/* Header */}
              <div className="p-4 pb-3 space-y-1 border-b border-gray-200 dark:border-gray-700">
                <h4 className="font-medium text-sm line-clamp-2">{data.model}</h4>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {data.supplier} • {data.storage} • {data.color}
                </p>
              </div>

              {/* Price Chart */}
              <div className="p-4 pb-3">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <div className="text-lg font-bold">{formatPrice(data.currentPrice)}</div>
                    <div className="flex items-center gap-1 text-xs">
                      {isPriceStable ? (
                        <span className="text-gray-500 dark:text-gray-400">Estável</span>
                      ) : isPriceRising ? (
                        <span className="text-red-600 dark:text-red-400 flex items-center gap-1">
                          <TrendingUp className="h-3 w-3" />
                          {formatPercentage(data.statistics.priceChangePercentage)}
                        </span>
                      ) : (
                        <span className="text-green-600 dark:text-green-400 flex items-center gap-1">
                          <TrendingDown className="h-3 w-3" />
                          {formatPercentage(data.statistics.priceChangePercentage)}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {data.priceHistory.length} registros
                  </div>
                </div>

                {/* Interactive Price Chart */}
                <PriceHistoryChart
                  data={data.priceHistory}
                  width={352}
                  height={120}
                  showGrid={true}
                  showTooltip={true}
                  currentPrice={data.currentPrice}
                />
              </div>

              {/* Statistics */}
              <div className="px-4 pb-3">
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-gray-500 dark:text-gray-400">Menor:</span>
                    <span className="ml-1 font-medium text-green-600 dark:text-green-400">
                      {formatPrice(data.statistics.minPrice)}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500 dark:text-gray-400">Maior:</span>
                    <span className="ml-1 font-medium text-red-600 dark:text-red-400">
                      {formatPrice(data.statistics.maxPrice)}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500 dark:text-gray-400">Médio:</span>
                    <span className="ml-1 font-medium">
                      {formatPrice(data.statistics.avgPrice)}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500 dark:text-gray-400">Volatilidade:</span>
                    <span className="ml-1 font-medium">
                      {data.statistics.volatility.toFixed(1)}%
                    </span>
                  </div>
                </div>
              </div>

              {/* Last Update */}
              <div className="px-4 py-3 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                  <Clock className="h-3 w-3" />
                  <span>Atualizado {formatRelativeTime(data.lastUpdated)}</span>
                </div>
              </div>
            </div>
          ) : data ? (
            <div className="p-4 text-center">
              <div className="text-sm text-gray-500 dark:text-gray-400">
                {data.priceHistory && data.priceHistory.length === 1 ? 
                  `Produto recente - apenas ${data.priceHistory.length} registro` :
                  'Dados insuficientes para gráfico'
                }
              </div>
              {data.currentPrice && (
                <div className="mt-2 text-lg font-bold">
                  {formatPrice(data.currentPrice)}
                </div>
              )}
            </div>
          ) : (
            <div className="p-4 text-center">
              <div className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                Histórico não disponível
              </div>
              <div className="text-xs text-gray-400 dark:text-gray-500">
                Passe o mouse novamente ou clique para tentar recarregar
              </div>
            </div>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
});