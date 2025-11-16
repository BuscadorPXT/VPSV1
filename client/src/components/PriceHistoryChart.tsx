import React, { useState, useEffect, memo } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';

// ⚡ OTIMIZAÇÃO #18: Lazy load Recharts dinamicamente (-150KB do bundle inicial)
type RechartsModule = typeof import('recharts');

interface PricePoint {
  timestamp: string;
  price: number;
  date?: string;
}

interface PriceHistoryChartProps {
  data: PricePoint[];
  className?: string;
  width?: number;
  height?: number;
  showGrid?: boolean;
  showTooltip?: boolean;
  currentPrice?: number;
}

// Custom tooltip component for the chart
function CustomTooltip({ active, payload, label }: any) {
  if (active && payload && payload.length) {
    const price = payload[0].value;
    
    // Validate and parse the date
    let formattedDate = 'Data inválida';
    try {
      const date = new Date(label);
      // Check if date is valid
      if (!isNaN(date.getTime())) {
        formattedDate = format(date, "dd/MM/yyyy", { locale: ptBR });
      }
    } catch (error) {
      console.warn('Invalid date in tooltip:', label);
    }
    
    return (
      <div className="bg-white dark:bg-gray-800 p-2 border border-gray-200 dark:border-gray-700 rounded shadow-lg">
        <p className="text-xs text-gray-600 dark:text-gray-400">
          {formattedDate}
        </p>
        <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
          R$ {price.toFixed(2).replace('.', ',')}
        </p>
      </div>
    );
  }
  return null;
}

// Function to determine trend based on price data
function getTrendInfo(data: PricePoint[]) {
  if (data.length < 2) {
    return { trend: 'stable', color: '#6b7280', icon: Minus };
  }

  const firstPrice = data[0].price;
  const lastPrice = data[data.length - 1].price;
  const change = lastPrice - firstPrice;
  const changePercentage = ((change / firstPrice) * 100);

  if (Math.abs(changePercentage) < 0.5) {
    return { trend: 'stable', color: '#6b7280', icon: Minus };
  } else if (change > 0) {
    return { trend: 'up', color: '#ef4444', icon: TrendingUp }; // Red for price increase
  } else {
    return { trend: 'down', color: '#10b981', icon: TrendingDown }; // Green for price decrease
  }
}

// ⚡ OTIMIZAÇÃO #22: React.memo para evitar re-renders desnecessários
const PriceHistoryChartComponent = ({
  data,
  className,
  width = 280,
  height = 150,
  showGrid = true,
  showTooltip = true,
  currentPrice
}: PriceHistoryChartProps) => {
  // ⚡ OTIMIZAÇÃO #18: Lazy load Recharts
  const [recharts, setRecharts] = useState<RechartsModule | null>(null);

  useEffect(() => {
    // Dynamically import Recharts only when component mounts
    import('recharts').then((module) => {
      setRecharts(module);
    }).catch(err => {
      console.error('Failed to load Recharts:', err);
    });
  }, []);

  // Show skeleton while Recharts is loading
  if (!recharts) {
    return (
      <div className={cn("relative", className)} style={{ width, height }}>
        <Skeleton className="w-full h-full rounded-lg" />
      </div>
    );
  }

  const { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip: RechartsTooltip, ResponsiveContainer } = recharts;

  if (!data || data.length === 0) {
    return (
      <div className={cn("flex items-center justify-center border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg", className)} style={{ width, height }}>
        <p className="text-xs text-gray-500 dark:text-gray-400">Sem dados históricos</p>
      </div>
    );
  }

  if (data.length === 1) {
    return (
      <div className={cn("flex items-center justify-center border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800", className)} style={{ width, height }}>
        <div className="text-center">
          <p className="text-xs text-gray-500 dark:text-gray-400">Produto recente</p>
          <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
            R$ {data[0].price.toFixed(2).replace('.', ',')}
          </p>
        </div>
      </div>
    );
  }

  const { trend, color, icon: TrendIcon } = getTrendInfo(data);

  // Prepare data for Recharts
  const chartData = data.map(point => ({
    timestamp: point.timestamp,
    price: point.price,
    formattedDate: format(new Date(point.timestamp), "dd/MM", { locale: ptBR })
  }));

  const minPrice = Math.min(...data.map(p => p.price));
  const maxPrice = Math.max(...data.map(p => p.price));
  const priceRange = maxPrice - minPrice;
  
  // Add some padding to the Y-axis
  const yAxisDomain = priceRange > 0 
    ? [minPrice - (priceRange * 0.1), maxPrice + (priceRange * 0.1)]
    : [minPrice * 0.95, maxPrice * 1.05];

  return (
    <div className={cn("relative", className)} style={{ width, height }}>
      {/* Trend indicator */}
      <div className="absolute top-2 right-2 z-10 flex items-center gap-1 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded px-2 py-1">
        <TrendIcon className="h-3 w-3" style={{ color }} />
        <span className="text-xs font-medium" style={{ color }}>
          {trend === 'up' ? 'Alta' : trend === 'down' ? 'Baixa' : 'Estável'}
        </span>
      </div>

      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 10 }}>
          {showGrid && (
            <CartesianGrid 
              strokeDasharray="3 3" 
              className="opacity-30 dark:opacity-20" 
            />
          )}
          
          <XAxis 
            dataKey="formattedDate"
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 10, fill: 'currentColor' }}
            className="text-gray-500 dark:text-gray-400"
          />
          
          <YAxis 
            domain={yAxisDomain}
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 10, fill: 'currentColor' }}
            tickFormatter={(value) => `R$ ${value.toFixed(0)}`}
            className="text-gray-500 dark:text-gray-400"
          />
          
          {showTooltip && (
            <RechartsTooltip content={<CustomTooltip />} />
          )}
          
          <Line 
            type="monotone" 
            dataKey="price" 
            stroke={color}
            strokeWidth={2}
            dot={{ fill: color, strokeWidth: 0, r: 3 }}
            activeDot={{ r: 4, stroke: color, strokeWidth: 2, fill: 'white' }}
            connectNulls={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

// ⚡ OTIMIZAÇÃO #22: Export memoized component
export const PriceHistoryChart = memo(PriceHistoryChartComponent);

// Mini version for use in small spaces like table cells
export const MiniPriceHistoryChart = memo(({ data, className }: { data: PricePoint[], className?: string }) => {
  return (
    <PriceHistoryChart
      data={data}
      width={80}
      height={40}
      showGrid={false}
      showTooltip={false}
      className={className}
    />
  );
});