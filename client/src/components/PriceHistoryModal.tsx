import React from 'react';
import { X, TrendingUp, TrendingDown, Calendar, DollarSign, BarChart3 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { DetailedPriceSparkline } from './PriceSparkline';
import { cn } from '@/lib/utils';
import { PriceHistoryData } from '../../../shared/priceHistoryTypes';

interface PriceHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: PriceHistoryData | null;
  isLoading?: boolean;
}

export function PriceHistoryModal({ isOpen, onClose, data, isLoading }: PriceHistoryModalProps) {
  if (!data && !isLoading) return null;

  const formatPrice = (price: number) => `R$ ${price.toFixed(2)}`;
  const formatPercentage = (percentage: number) => `${percentage >= 0 ? '+' : ''}${percentage.toFixed(2)}%`;
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const isPriceRising = data && data.statistics.priceChange > 0;
  const isPriceStable = data && Math.abs(data.statistics.priceChange) < 0.01;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-[95vw] max-w-[95vw] max-h-[90vh] overflow-y-auto p-3 sm:max-w-4xl sm:w-full sm:p-6 mx-2 sm:mx-0">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Evolução de Preços
          </DialogTitle>
          {data && (
            <DialogDescription>
              {data.model} - {data.brand} - {data.storage} - {data.color}
            </DialogDescription>
          )}
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8 sm:py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <span className="ml-3 text-sm text-gray-600 dark:text-gray-400">Carregando histórico...</span>
          </div>
        ) : data ? (
          <div className="space-y-4 sm:space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 sm:gap-4 lg:grid-cols-4">
              <Card>
                <CardHeader className="pb-2 px-3 pt-3 sm:pb-2 sm:px-6 sm:pt-6">
                  <CardTitle className="text-sm font-medium sm:text-base">Preço Atual</CardTitle>
                </CardHeader>
                <CardContent className="px-3 pb-3 sm:px-6 sm:pb-6">
                  <div className="text-lg font-bold sm:text-xl lg:text-2xl">{formatPrice(data.currentPrice)}</div>
                  <div className="flex items-center mt-1">
                    {isPriceStable ? (
                      <Badge variant="secondary" className="text-xs">
                        Estável
                      </Badge>
                    ) : isPriceRising ? (
                      <Badge variant="destructive" className="text-xs flex items-center gap-1">
                        <TrendingUp className="h-3 w-3" />
                        {formatPercentage(data.statistics.priceChangePercentage)}
                      </Badge>
                    ) : (
                      <Badge variant="default" className="text-xs flex items-center gap-1 bg-green-500 hover:bg-green-600">
                        <TrendingDown className="h-3 w-3" />
                        {formatPercentage(data.statistics.priceChangePercentage)}
                      </Badge>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2 px-3 pt-3 sm:pb-2 sm:px-6 sm:pt-6">
                  <CardTitle className="text-sm font-medium sm:text-base">Menor Preço</CardTitle>
                </CardHeader>
                <CardContent className="px-3 pb-3 sm:px-6 sm:pb-6">
                  <div className="text-lg font-bold text-green-600 dark:text-green-400 sm:text-xl lg:text-2xl">
                    {formatPrice(data.statistics.minPrice)}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 hidden sm:block">
                    Economia: {formatPrice(data.currentPrice - data.statistics.minPrice)}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2 px-3 pt-3 sm:pb-2 sm:px-6 sm:pt-6">
                  <CardTitle className="text-sm font-medium sm:text-base">Maior Preço</CardTitle>
                </CardHeader>
                <CardContent className="px-3 pb-3 sm:px-6 sm:pb-6">
                  <div className="text-lg font-bold text-red-600 dark:text-red-400 sm:text-xl lg:text-2xl">
                    {formatPrice(data.statistics.maxPrice)}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 hidden sm:block">
                    Diferença: {formatPrice(data.statistics.maxPrice - data.currentPrice)}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2 px-3 pt-3 sm:pb-2 sm:px-6 sm:pt-6">
                  <CardTitle className="text-sm font-medium sm:text-base">Preço Médio</CardTitle>
                </CardHeader>
                <CardContent className="px-3 pb-3 sm:px-6 sm:pb-6">
                  <div className="text-lg font-bold text-blue-600 dark:text-blue-400 sm:text-xl lg:text-2xl">
                    {formatPrice(data.statistics.avgPrice)}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 hidden sm:block">
                    Volatilidade: {data.statistics.volatility.toFixed(1)}%
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Price Chart */}
            <Card>
              <CardHeader className="px-3 pt-3 sm:px-6 sm:pt-6">
                <CardTitle className="flex items-center gap-2 text-sm sm:text-lg">
                  <TrendingUp className="h-4 w-4 sm:h-4 sm:w-4" />
                  Gráfico de Evolução
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 pt-0 px-2 pb-3 sm:px-6 sm:pb-6">
                <div className="w-full overflow-x-auto">
                  <DetailedPriceSparkline
                    priceHistory={data.priceHistory}
                    currentPrice={data.currentPrice}
                    showGrid={true}
                    className="w-full"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Recent Price History Table */}
            <Card>
              <CardHeader className="px-3 pt-3 sm:px-6 sm:pt-6">
                <CardTitle className="flex items-center gap-2 text-sm sm:text-lg">
                  <Calendar className="h-4 w-4 sm:h-4 sm:w-4" />
                  Histórico Recente
                </CardTitle>
              </CardHeader>
              <CardContent className="px-2 pb-3 sm:px-6 sm:pb-6">
                <div className="max-h-48 overflow-y-auto overflow-x-auto sm:max-h-64">
                  <table className="w-full text-sm min-w-full sm:text-sm">
                    <thead className="sticky top-0 bg-background">
                      <tr className="border-b">
                        <th className="text-left p-1 sm:p-2 text-xs sm:text-sm">Data</th>
                        <th className="text-right p-1 sm:p-2 text-xs sm:text-sm">Preço</th>
                        <th className="text-right p-1 sm:p-2 text-xs sm:text-sm">Variação</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.priceHistory.slice(-15).reverse().map((point: any, index: number, array: any[]) => {
                        const prevPoint = array[index + 1];
                        const change = prevPoint ? point.price - prevPoint.price : 0;
                        const changePercent = prevPoint ? ((point.price - prevPoint.price) / prevPoint.price) * 100 : 0;
                        
                        return (
                          <tr key={point.timestamp} className="border-b border-gray-100 dark:border-gray-800">
                            <td className="p-1 sm:p-2 text-xs sm:text-sm">{formatDate(point.timestamp)}</td>
                            <td className="text-right p-1 sm:p-2 font-medium text-xs sm:text-sm">{formatPrice(point.price)}</td>
                            <td className={cn(
                              "text-right p-1 sm:p-2 text-xs sm:text-sm",
                              change > 0 ? "text-red-600 dark:text-red-400" : 
                              change < 0 ? "text-green-600 dark:text-green-400" : 
                              "text-gray-500 dark:text-gray-400"
                            )}>
                              {change !== 0 ? (
                                <span className="flex items-center justify-end gap-1">
                                  {change > 0 ? <TrendingUp className="h-2 w-2 sm:h-3 sm:w-3" /> : <TrendingDown className="h-2 w-2 sm:h-3 sm:w-3" />}
                                  <span className="hidden sm:inline">{formatPrice(Math.abs(change))} ({formatPercentage(changePercent)})</span>
                                  <span className="sm:hidden">{formatPercentage(changePercent)}</span>
                                </span>
                              ) : (
                                <span>-</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            {/* Product Info */}
            <Card>
              <CardHeader className="px-3 pt-3 sm:px-6 sm:pt-6">
                <CardTitle className="flex items-center gap-2 text-sm sm:text-lg">
                  <DollarSign className="h-4 w-4 sm:h-4 sm:w-4" />
                  Informações do Produto
                </CardTitle>
              </CardHeader>
              <CardContent className="px-3 pb-3 sm:px-6 sm:pb-6">
                <div className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2 sm:gap-4 sm:text-sm lg:grid-cols-4">
                  <div>
                    <span className="font-medium text-gray-500 dark:text-gray-400">Fornecedor:</span>
                    <p>{data.supplier}</p>
                  </div>
                  <div>
                    <span className="font-medium text-gray-500 dark:text-gray-400">Marca:</span>
                    <p>{data.brand}</p>
                  </div>
                  <div>
                    <span className="font-medium text-gray-500 dark:text-gray-400">Armazenamento:</span>
                    <p>{data.storage}</p>
                  </div>
                  <div>
                    <span className="font-medium text-gray-500 dark:text-gray-400">Cor:</span>
                    <p>{data.color}</p>
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t text-xs text-gray-500 dark:text-gray-400">
                  Última atualização: {formatDate(data.lastUpdated)}
                </div>
              </CardContent>
            </Card>
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-gray-500 dark:text-gray-400">Nenhum dado histórico encontrado</p>
          </div>
        )}

        <div className="flex justify-end pt-3 px-3 sm:pt-4 sm:px-0 sticky bottom-0 bg-background border-t sm:border-t-0 sm:bg-transparent sm:relative">
          <Button onClick={onClose} variant="outline" size="default" className="w-full sm:w-auto">
            Fechar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}