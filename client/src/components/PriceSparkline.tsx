import { cn } from "@/lib/utils";
import { useEffect, useRef, useState } from "react";

interface PricePoint {
  timestamp: string;
  price: number;
}

interface MiniPriceSparklineProps {
  priceHistory: PricePoint[];
  currentPrice: number;
  className?: string;
}

interface DetailedPriceSparklineProps {
  priceHistory: PricePoint[];
  currentPrice: number;
  className?: string;
  width?: number;
  height?: number;
  showGrid?: boolean;
  showTooltips?: boolean;
}

export function MiniPriceSparkline({ priceHistory, currentPrice, className }: MiniPriceSparklineProps) {
  if (!priceHistory || priceHistory.length < 2) {
    return (
      <div className={cn("w-12 h-6 flex items-center justify-center", className)}>
        <div className="w-1 h-1 bg-gray-400 rounded-full opacity-50" />
      </div>
    );
  }

  const prices = priceHistory.map(p => p.price);
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const priceRange = maxPrice - minPrice;

  if (priceRange === 0) {
    return <div className={cn("w-12 h-6 flex items-center", className)}>
      <div className="w-full h-px bg-gray-300 dark:bg-gray-600" />
    </div>;
  }

  const points = prices.map((price, index) => {
    const x = (index / (prices.length - 1)) * 100;
    const y = 100 - ((price - minPrice) / priceRange) * 100;
    return `${x},${y}`;
  }).join(' ');

  const isRising = prices[prices.length - 1] > prices[0];
  const strokeColor = isRising ? '#10b981' : '#ef4444';

  return (
    <div className={cn("w-12 h-6", className)}>
      <svg viewBox="0 0 100 100" className="w-full h-full">
        <polyline
          fill="none"
          stroke={strokeColor}
          strokeWidth="2"
          points={points}
        />
      </svg>
    </div>
  );
}

export function DetailedPriceSparkline({ 
  priceHistory, 
  currentPrice, 
  className,
  width,
  height,
  showGrid = true,
  showTooltips = false
}: DetailedPriceSparklineProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 600, height: 300 });

  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const container = containerRef.current;
        const containerWidth = container.offsetWidth;
        
        // Calculate responsive dimensions
        let chartWidth = containerWidth;
        let chartHeight = Math.min(400, Math.max(250, containerWidth * 0.4)); // Responsive height based on width
        
        // Adjust for mobile
        if (containerWidth < 640) { // sm breakpoint
          chartHeight = Math.max(200, containerWidth * 0.5);
        }
        
        setDimensions({ 
          width: chartWidth, 
          height: chartHeight 
        });
      }
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  if (!priceHistory || priceHistory.length < 2) {
    return (
      <div 
        ref={containerRef}
        className={cn("flex items-center justify-center border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg w-full", className)} 
        style={{ height: dimensions.height }}
      >
        <p className="text-gray-500 dark:text-gray-400">Dados históricos insuficientes</p>
      </div>
    );
  }

  const prices = priceHistory.map(p => p.price);
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const priceRange = maxPrice - minPrice;

  if (priceRange === 0) {
    return (
      <div 
        ref={containerRef}
        className={cn("flex items-center justify-center border border-gray-300 dark:border-gray-600 rounded-lg w-full", className)} 
        style={{ height: dimensions.height }}
      >
        <p className="text-gray-500 dark:text-gray-400">Preço constante: R$ {currentPrice.toFixed(2)}</p>
      </div>
    );
  }

  const actualWidth = width || dimensions.width;
  const actualHeight = height || dimensions.height;
  const padding = Math.min(50, actualWidth * 0.08); // Responsive padding
  const chartWidth = actualWidth - padding * 2;
  const chartHeight = actualHeight - padding * 2;

  const points = priceHistory.map((point, index) => {
    const x = padding + (index / (priceHistory.length - 1)) * chartWidth;
    const y = padding + chartHeight - ((point.price - minPrice) / priceRange) * chartHeight;
    return { x, y, price: point.price, timestamp: point.timestamp };
  });

  const pathData = points.map((point, index) => {
    return `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`;
  }).join(' ');

  const isRising = prices[prices.length - 1] > prices[0];
  const strokeColor = isRising ? '#10b981' : '#ef4444';
  const fillColor = isRising ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)';

  const formatPrice = (price: number) => `R$ ${price.toFixed(2)}`;
  const formatDate = (timestamp: string) => new Date(timestamp).toLocaleDateString('pt-BR');

  return (
    <div ref={containerRef} className={cn("relative w-full", className)} style={{ height: actualHeight }}>
      <svg width={actualWidth} height={actualHeight} className="w-full overflow-visible">
        {/* Grid lines */}
        {showGrid && (
          <g className="opacity-20 dark:opacity-10">
            {/* Horizontal grid lines */}
            {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
              const y = padding + chartHeight - ratio * chartHeight;
              return (
                <line
                  key={`h-${ratio}`}
                  x1={padding}
                  y1={y}
                  x2={actualWidth - padding}
                  y2={y}
                  stroke="currentColor"
                  strokeWidth="1"
                />
              );
            })}
            {/* Vertical grid lines */}
            {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
              const x = padding + ratio * chartWidth;
              return (
                <line
                  key={`v-${ratio}`}
                  x1={x}
                  y1={padding}
                  x2={x}
                  y2={actualHeight - padding}
                  stroke="currentColor"
                  strokeWidth="1"
                />
              );
            })}
          </g>
        )}

        {/* Area fill */}
        <path
          d={`${pathData} L ${points[points.length - 1].x} ${actualHeight - padding} L ${padding} ${actualHeight - padding} Z`}
          fill={fillColor}
        />

        {/* Main line */}
        <path
          d={pathData}
          fill="none"
          stroke={strokeColor}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Data points */}
        {points.map((point, index) => (
          <circle
            key={index}
            cx={point.x}
            cy={point.y}
            r="3"
            fill={strokeColor}
            className="hover:r-5 transition-all cursor-pointer"
          />
        ))}
      </svg>

      {/* Y-axis labels */}
      <div className="absolute left-0 top-0 bottom-0 flex flex-col justify-between text-xs text-gray-600 dark:text-gray-300 font-medium" style={{ width: padding - 10 }}>
        <span className="text-right">{formatPrice(maxPrice)}</span>
        <span className="text-right">{formatPrice((maxPrice + minPrice) / 2)}</span>
        <span className="text-right">{formatPrice(minPrice)}</span>
      </div>

      {/* X-axis labels */}
      <div className="absolute bottom-0 left-0 right-0 h-6 flex items-center justify-between text-xs text-gray-600 dark:text-gray-300 font-medium" style={{ paddingLeft: padding, paddingRight: padding }}>
        <div className="flex-shrink-0">
          {formatDate(priceHistory[0].timestamp)}
        </div>
        <div className="flex-shrink-0">
          {formatDate(priceHistory[priceHistory.length - 1].timestamp)}
        </div>
      </div>
    </div>
  );
}