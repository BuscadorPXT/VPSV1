import React from 'react';
import { Check, Plus, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { formatPrice } from '@/lib/formatters';

interface TradingProduct {
  id: number;
  model: string;
  storage: string;
  color: string;
  category: string;
  capacity: string;
  region: string;
  price: number;
  previousPrice?: number;
  supplierName: string;
  lastUpdated: string;
  priceChange?: number;
  priceChangePercent?: number;
  isRising?: boolean;
  isFalling?: boolean;
  justUpdated?: boolean;
  quantity?: number;
}

interface MobileProductCardProps {
  product: TradingProduct;
  index: number;
  currentPage: number;
  itemsPerPage: number;
  isFlashing: boolean;
  isProductInWatchlist: (id: number) => boolean;
  toggleProductInWatchlist: (product: TradingProduct) => void;
  getCategoryIcon: (category: string) => string;
  formatChange: (change: number) => string;
  formatChangePercent: (changePercent: number) => string;
  filteredProducts: TradingProduct[];
}

export function MobileProductCard({
  product,
  index,
  currentPage,
  itemsPerPage,
  isFlashing,
  isProductInWatchlist,
  toggleProductInWatchlist,
  getCategoryIcon,
  formatChange,
  formatChangePercent,
  filteredProducts
}: MobileProductCardProps) {
  const [isExpanded, setIsExpanded] = React.useState(false)
  const [touchStart, setTouchStart] = React.useState<{ x: number; y: number } | null>(null)
  const [isPressed, setIsPressed] = React.useState(false)

  const priceChangeClass = product.priceChange 
    ? product.priceChange > 0 ? 'price-up' : 'price-down'
    : 'price-neutral';

  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0]
    setTouchStart({ x: touch.clientX, y: touch.clientY })
    setIsPressed(true)
    
    // Add haptic feedback for supported devices
    if ('vibrate' in navigator) {
      navigator.vibrate(10)
    }
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!touchStart) return
    
    const touch = e.touches[0]
    const deltaX = touch.clientX - touchStart.x
    const deltaY = touch.clientY - touchStart.y
    
    // Se movimento é maior que 8px, cancelar pressed state (reduzido para melhor responsividade)
    if (Math.abs(deltaX) > 8 || Math.abs(deltaY) > 8) {
      setIsPressed(false)
    }
  }

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStart) return
    
    const touch = e.changedTouches[0]
    const deltaX = touch.clientX - touchStart.x
    const deltaY = touch.clientY - touchStart.y
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY)
    
    // Se foi um tap (movimento < 8px) - reduzido para melhor responsividade
    if (distance < 8) {
      setIsExpanded(!isExpanded)
      
      // Haptic feedback para expansão
      if ('vibrate' in navigator) {
        navigator.vibrate(15)
      }
    }
    
    setTouchStart(null)
    setIsPressed(false)
  }

  return (
    <div 
      className={`bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700 shadow-sm transition-all duration-300 transform-gpu ${
        isFlashing ? 'price-flash' : ''
      } ${
        product.justUpdated ? 'bg-blue-50 dark:bg-blue-950' : ''
      } ${
        isPressed ? 'scale-98 shadow-lg' : 'scale-100'
      } ${
        isExpanded ? 'shadow-lg ring-2 ring-blue-500/20' : ''
      }`}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      style={{ touchAction: 'manipulation' }}
    >
      {/* Product Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center space-x-3 flex-1 min-w-0">
          <div className="text-2xl flex-shrink-0">{getCategoryIcon(product.category)}</div>
          <div className="min-w-0 flex-1">
            <h3 className="font-semibold text-slate-900 dark:text-white text-sm leading-tight truncate">
              {product.model}
            </h3>
            <div className="flex items-center space-x-2 mt-1">
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-200">
                {product.category}
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                #{(currentPage - 1) * itemsPerPage + index + 1}
              </span>
            </div>
          </div>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            toggleProductInWatchlist(product);
          }}
          className={`flex-shrink-0 w-8 h-8 rounded-full border-2 transition-all duration-200 hover:scale-110 ${
            isProductInWatchlist(product.id)
              ? 'bg-green-500 border-green-500 text-white shadow-lg'
              : 'bg-white dark:bg-slate-700 border-slate-300 dark:border-slate-600 text-slate-400 dark:text-slate-500 hover:border-green-400 hover:text-green-500'
          }`}
          title={isProductInWatchlist(product.id) ? 'Remover da lista' : 'Adicionar à lista'}
        >
          {isProductInWatchlist(product.id) ? (
            <Check className="w-4 h-4 mx-auto" />
          ) : (
            <Plus className="w-4 h-4 mx-auto" />
          )}
        </button>
      </div>

      {/* Product Details */}
      <div className="grid grid-cols-2 gap-3 mb-3">
        <div>
          <div className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wide font-medium">Especificações</div>
          <div className="text-sm text-slate-900 dark:text-white">
            <div className="font-medium">{product.storage}</div>
            <div className="text-slate-600 dark:text-slate-400">{product.color}</div>
          </div>
        </div>
        <div>
          <div className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wide font-medium">Região</div>
          <div className="text-sm">
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300">
              {product.region && product.region.length > 12 ? `${product.region.substring(0, 12)}...` : (product.region || '-')}
            </span>
          </div>
        </div>
      </div>

      {/* Price Section */}
      <div className="flex items-center justify-between py-3 border-t border-slate-200 dark:border-slate-700">
        <div>
          <div className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wide font-medium">Preço</div>
          <div className="font-bold text-lg font-mono text-slate-900 dark:text-white">
            {formatPrice(product.price)}
          </div>
          {product.previousPrice && (
            <div className="text-xs text-slate-500 dark:text-slate-400 font-mono">
              De: {formatPrice(product.previousPrice)}
            </div>
          )}
        </div>
        
        {product.priceChange ? (
          <div className="text-right">
            <div className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wide font-medium">Variação</div>
            <div className={`font-semibold font-mono text-sm flex items-center justify-end gap-1 ${priceChangeClass}`}>
              {product.priceChange > 0 ? (
                <TrendingUp className="w-3 h-3" />
              ) : product.priceChange < 0 ? (
                <TrendingDown className="w-3 h-3" />
              ) : (
                <Minus className="w-3 h-3" />
              )}
              {formatChange(product.priceChange)}
            </div>
            <div className={`text-xs font-mono ${priceChangeClass}`}>
              {formatChangePercent(product.priceChangePercent || 0)}
            </div>
          </div>
        ) : (
          <div className="text-right">
            <div className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wide font-medium">Variação</div>
            <span className="text-slate-400 dark:text-slate-500 text-xs flex items-center justify-end">
              <Minus className="w-3 h-3 mr-1" />—
            </span>
          </div>
        )}
      </div>

      {/* Supplier Section */}
      <div className="flex items-center justify-between pt-3 border-t border-slate-200 dark:border-slate-700">
        <div>
          <div className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wide font-medium">Fornecedor</div>
          <div className="font-medium text-slate-900 dark:text-white text-sm">
            {product.supplierName}
          </div>
        </div>
        <div className="text-right">
          <div className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wide font-medium">Atualizado</div>
          <div className="text-xs text-slate-600 dark:text-slate-400">
            {new Date(product.lastUpdated).toLocaleTimeString('pt-BR', { 
              hour: '2-digit', 
              minute: '2-digit' 
            })}
          </div>
        </div>
      </div>

      {/* Price Comparison Indicator */}
      {(() => {
        const similarProducts = filteredProducts.filter(p => 
          p.model === product.model && 
          p.storage === product.storage && 
          p.color === product.color &&
          p.id !== product.id
        );

        if (similarProducts.length > 0) {
          const minPrice = Math.min(...similarProducts.map(p => p.price));
          const isGoodDeal = product.price <= minPrice + 100;

          return (
            <div className="mt-2 pt-2 border-t border-slate-200 dark:border-slate-700">
              <div className={`text-xs px-2 py-1 rounded-full text-center ${
                isGoodDeal 
                  ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' 
                  : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300'
              }`}>
                {isGoodDeal ? '⭐ Melhor preço' : `💰 +R$ ${(product.price - minPrice).toFixed(0)} que o menor`}
              </div>
            </div>
          );
        }
        return null;
      })()}
    </div>
  );
}