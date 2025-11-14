import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown, DollarSign, Euro, Bitcoin } from "lucide-react";
import { useExchangeRates, ExchangeRate } from "@/hooks/use-exchange-rates";
import { cn } from "@/lib/utils";

interface CurrencyCardProps {
  pairs: string[];
  title: string;
  className?: string;
}

const getCurrencyIcon = (currency: string) => {
  switch (currency) {
    case 'USD':
      return <DollarSign className="h-5 w-5" />;
    case 'EUR':
      return <Euro className="h-5 w-5" />;
    case 'BTC':
      return <Bitcoin className="h-5 w-5" />;
    default:
      return <DollarSign className="h-5 w-5" />;
  }
};

const formatCurrency = (value: string, currency: string) => {
  const numValue = parseFloat(value);
  
  if (currency === 'BTC') {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(numValue);
  }
  
  // Formato compacto para mobile: R$ 5,45
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(numValue).replace('R$', 'R$');
};

const formatTime = (timestamp: string) => {
  const date = new Date(parseInt(timestamp) * 1000);
  return date.toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  });
};

const formatPercentage = (pctChange: string) => {
  const value = parseFloat(pctChange);
  return `${value > 0 ? '+' : ''}${value.toFixed(2)}%`;
};

export function CurrencyCard({ pairs, title, className }: CurrencyCardProps) {
  const { data: exchangeRates, isLoading, error } = useExchangeRates(pairs);

  if (isLoading) {
    return (
      <Card className={cn("w-full", className)}>
        <CardContent className="py-3 px-4">
          <div className="animate-pulse">
            <div className="flex items-center justify-between">
              <div className="h-3 w-12 bg-gray-200 rounded"></div>
              <div className="h-4 w-16 bg-gray-200 rounded"></div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return null; // Falha silenciosa para manter discrição
  }

  return (
    <Card className={cn("w-full", className)}>
      <CardContent className="py-3 px-4">
        {pairs.map((pair) => {
          const key = pair.replace('-', '');
          const rate: ExchangeRate | undefined = exchangeRates?.[key];
          
          if (!rate) return null;
          
          const pctChange = parseFloat(rate.pctChange);
          const isPositive = pctChange >= 0;
          
          return (
            <div key={pair} className="flex items-center gap-0.5 min-w-0 text-xs">
              <div className="flex items-center gap-0.5 flex-shrink-0">
                <DollarSign className="h-2.5 w-2.5 text-amber-500" />
                {title && <span className="text-xs font-medium text-muted-foreground">{title}</span>}
              </div>
              <div className="flex items-center gap-0.5 min-w-0">
                <span className="text-xs font-bold text-foreground truncate max-w-[80px] sm:max-w-none">
                  {formatCurrency(rate.bid, rate.code)}
                </span>
                {/* Porcentagem - oculta no mobile */}
                <div className={cn(
                  "hidden sm:flex items-center gap-0.5 text-xs flex-shrink-0",
                  isPositive ? "text-green-600" : "text-red-600"
                )}>
                  {isPositive ? (
                    <TrendingUp className="h-2 w-2" />
                  ) : (
                    <TrendingDown className="h-2 w-2" />
                  )}
                  <span className="font-medium text-xs">
                    {formatPercentage(rate.pctChange)}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}