import React, { useState, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { PriceHoverTooltip } from './PriceHoverTooltip';
import { PriceHistoryModal } from './PriceHistoryModal';
import { usePriceHistory } from '../hooks/use-price-monitoring';
import { useDebounce } from '../hooks/use-debounce';
import { formatPrice } from '@/lib/formatters';

interface Product {
  id?: number;
  model: string;
  brand: string;
  storage: string;
  color: string;
  category: string;
  supplier: string;
  price: number | string;
  productTimestamp?: string;
}

interface InteractivePriceCellProps {
  product: Product;
  className?: string;
}

export function InteractivePriceCell({ product, className }: InteractivePriceCellProps) {
  const [hovering, setHovering] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Debounce hover to prevent excessive API calls
  const debouncedHovering = useDebounce(hovering, 300);

  // Price history query - only fetch when hovering or modal is open
  const priceHistoryQuery = {
    model: product.model,
    supplier: product.supplier,
    storage: product.storage,
    color: product.color,
    productId: product.id
  };

  const { data: priceHistoryData, isLoading, error } = usePriceHistory(
    debouncedHovering || isModalOpen ? priceHistoryQuery : {}
  );

  // Debug logging
  React.useEffect(() => {
    if (debouncedHovering || isModalOpen) {
      console.log('📊 Price history query:', priceHistoryQuery);
      console.log('🔄 Loading state:', isLoading);
      console.log('📈 Data received:', priceHistoryData);
      console.log('📈 Data structure check:', {
        hasData: !!priceHistoryData,
        hasPriceHistory: !!(priceHistoryData && priceHistoryData.priceHistory),
        priceHistoryLength: priceHistoryData?.priceHistory?.length || 0,
        dataKeys: priceHistoryData ? Object.keys(priceHistoryData) : []
      });
      if (error) console.error('❌ Error:', error);
    }
  }, [debouncedHovering, isModalOpen, priceHistoryQuery, isLoading, priceHistoryData, error]);

  const handleMouseEnter = useCallback(() => {
    console.log('🖱️ Mouse entered price cell for:', product.model);
    setHovering(true);
  }, [product.model]);

  const handleMouseLeave = useCallback(() => {
    console.log('🖱️ Mouse left price cell for:', product.model);
    setHovering(false);
  }, [product.model]);

  const handleClick = useCallback(() => {
    setIsModalOpen(true);
  }, []);

  const handleModalClose = useCallback(() => {
    setIsModalOpen(false);
  }, []);

  // Format price for display
  const displayPrice = formatPrice(product.price);

  return (
    <>
      <PriceHoverTooltip
        data={priceHistoryData || null}
        isLoading={isLoading && debouncedHovering}
      >
        <div
          className={cn(
            "relative inline-flex flex-col items-end cursor-pointer transition-all duration-200",
            "hover:shadow-sm active:scale-95",
            className
          )}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          onClick={handleClick}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              handleClick();
            }
          }}
        >
          <div>{displayPrice}</div>
          
          {/* Timestamp below price */}
          {product.productTimestamp && (
            <div className="text-xs text-muted-foreground mt-0.5">
              {product.productTimestamp}
            </div>
          )}

          {/* Hover indicator */}
          <div className={cn(
            "absolute inset-0 rounded-md border-2 border-transparent transition-colors",
            hovering && "border-primary/20 bg-primary/5"
          )} />
        </div>
      </PriceHoverTooltip>

      <PriceHistoryModal
        isOpen={isModalOpen}
        onClose={handleModalClose}
        data={priceHistoryData || null}
        isLoading={isLoading}
      />
    </>
  );
}