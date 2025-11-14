import { usePriceMonitorStore } from "@/stores/price-monitor";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DollarSign, X, TrendingDown, Bell, CheckCircle2 } from "lucide-react";
import { formatPrice } from "@/lib/formatters";
import { useState, useEffect } from "react";
import { useUnifiedWebSocket } from '@/hooks/use-unified-websocket';

export function PriceDropNotifications() {
  const { recentPriceDrops, clearPriceDrops } = usePriceMonitorStore();
  const [isMinimized, setIsMinimized] = useState(false);
  const { notifications, markAsRead, markAllAsRead } = useUnifiedWebSocket();

  // Log para debug das notificações
  useEffect(() => {
    if (recentPriceDrops.length > 0) {
      console.log(`🎉 ${recentPriceDrops.length} notificações de queda de preço ativas:`, recentPriceDrops);
    }
  }, [recentPriceDrops]);

  if (recentPriceDrops.length === 0) {
    return null;
  }

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'agora mesmo';
    if (diffMins < 60) return `há ${diffMins} min`;
    if (diffMins < 1440) return `há ${Math.floor(diffMins / 60)}h`;
    return date.toLocaleDateString('pt-BR');
  };

  const totalSavings = recentPriceDrops.reduce((total, drop) => total + drop.priceDrop, 0);

  if (isMinimized) {
    return (
      <div className="fixed top-20 right-4 z-50 animate-in slide-in-from-right">
        <div className="bg-gradient-to-r from-green-500 to-emerald-600 text-white px-4 py-2 rounded-full shadow-lg border border-green-400 cursor-pointer hover:shadow-xl transition-all duration-200"
             onClick={() => setIsMinimized(false)}>
          <div className="flex items-center space-x-2">
            <Bell className="w-4 h-4 animate-bounce" />
            <span className="text-sm font-semibold">
              {recentPriceDrops.length} queda{recentPriceDrops.length !== 1 ? 's' : ''} de preço!
            </span>
            <Badge className="bg-white/20 text-white text-xs">
              -R$ {totalSavings.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </Badge>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="sticky top-16 z-40 mx-4 mt-4 mb-2 animate-in slide-in-from-top">
      <Card className="border-2 border-green-200 bg-gradient-to-r from-green-50 via-emerald-50 to-green-50 dark:from-green-900/20 dark:via-emerald-900/20 dark:to-green-900/20 dark:border-green-700 shadow-lg">
        <CardHeader className="pb-3 bg-gradient-to-r from-green-100 to-emerald-100 dark:from-green-800/30 dark:to-emerald-800/30 rounded-t-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-green-500 rounded-full">
                <TrendingDown className="w-5 h-5 text-white animate-pulse" />
              </div>
              <div>
                <CardTitle className="text-lg text-green-800 dark:text-green-200 flex items-center space-x-2">
                  <span>🎉 Alertas de Preço!</span>
                </CardTitle>
                <p className="text-sm text-green-700 dark:text-green-300">
                  {recentPriceDrops.length} produto{recentPriceDrops.length !== 1 ? 's' : ''} com queda de preço • 
                  Economia total: <span className="font-bold">R$ {totalSavings.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => setIsMinimized(true)}
                className="text-green-600 hover:text-green-800 hover:bg-green-100 dark:text-green-400 dark:hover:text-green-200"
                title="Minimizar"
              >
                ➖
              </Button>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={clearPriceDrops}
                className="text-green-600 hover:text-green-800 hover:bg-green-100 dark:text-green-400 dark:hover:text-green-200"
                title="Marcar como visto"
              >
                <CheckCircle2 className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="space-y-3 max-h-64 overflow-y-auto">
            {recentPriceDrops.slice(0, 5).map((drop, index) => {
              const savingsAmount = drop.priceDrop;
              const discountPercentage = ((drop.priceDrop / drop.oldPrice) * 100).toFixed(1);

              return (
                <div 
                  key={`${drop.productKey}-${index}`}
                  className="flex items-center justify-between p-4 bg-white dark:bg-slate-800 rounded-xl border border-green-200 dark:border-green-700 hover:shadow-md transition-all duration-200 hover:scale-[1.02]"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-3 mb-2">
                      <div className="p-1 bg-green-100 dark:bg-green-800 rounded-full">
                        <DollarSign className="w-4 h-4 text-green-600 dark:text-green-400" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h4 className="font-semibold text-gray-900 dark:text-white truncate">
                          {drop.model}
                        </h4>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {drop.storage} • {drop.color}
                        </p>
                      </div>
                      <Badge className="bg-gradient-to-r from-green-500 to-emerald-600 text-white font-bold shadow-sm">
                        -{discountPercentage}%
                      </Badge>
                    </div>

                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center space-x-2">
                        <span className="font-medium text-gray-700 dark:text-gray-300">{drop.supplier}</span>
                        {drop.region && (
                          <span className="text-gray-500 dark:text-gray-400">• {drop.region}</span>
                        )}
                      </div>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {formatTime(drop.timestamp)}
                      </span>
                    </div>
                  </div>

                  <div className="text-right ml-4 flex-shrink-0">
                    <div className="flex items-center space-x-3">
                      <div className="text-right">
                        <div className="text-sm text-gray-500 dark:text-gray-400 line-through">
                          {formatPrice(drop.oldPrice)}
                        </div>
                        <div className="text-lg font-bold text-green-600 dark:text-green-400">
                          {formatPrice(drop.newPrice)}
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="text-xs text-gray-500 dark:text-gray-400 uppercase">Economia</div>
                        <div className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                          R$ {savingsAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}

            {recentPriceDrops.length > 5 && (
              <div className="text-center pt-3 border-t border-green-200 dark:border-green-700">
                <span className="text-sm text-green-600 dark:text-green-400 font-medium">
                  +{recentPriceDrops.length - 5} mais produtos com preços reduzidos
                </span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}