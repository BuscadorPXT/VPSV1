
import React from 'react';
import { MobileProductCard } from './MobileProductCard';
import { MobileSearchBar } from './MobileSearchBar';
import { MobileFiltersPanel } from './MobileFiltersPanel';
import { useIsMobile } from '@/hooks/use-mobile';
import { useMobileOptimization } from '@/hooks/use-mobile-optimization';
import { Spinner } from '@/components/ui/spinner';
import { AlertCircle } from 'lucide-react';

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

interface MobileProductViewProps {
  products: TradingProduct[];
  filteredProducts: TradingProduct[];
  searchTerm: string;
  onSearchChange: (value: string) => void;
  filters: {
    categories: string[];
    capacities: string[];
    regions: string[];
    colors: string[];
    suppliers: string[];
  };
  selectedFilters: {
    categories: string[];
    capacities: string[];
    regions: string[];
    colors: string[];
    suppliers: string[];
  };
  onFilterChange: (filterType: string, values: string[]) => void;
  isLoading?: boolean;
  error?: string;
  currentPage: number;
  itemsPerPage: number;
  isProductInWatchlist: (id: number) => boolean;
  toggleProductInWatchlist: (product: TradingProduct) => void;
  getCategoryIcon: (category: string) => string;
  formatChange: (change: number) => string;
  formatChangePercent: (changePercent: number) => string;
  flashingProducts: Set<number>;
  selectedDate?: string; // Add selectedDate prop
}

export function MobileProductView({
  products,
  filteredProducts,
  searchTerm,
  onSearchChange,
  filters,
  selectedFilters,
  onFilterChange,
  isLoading = false,
  error,
  currentPage,
  itemsPerPage,
  isProductInWatchlist,
  toggleProductInWatchlist,
  getCategoryIcon,
  formatChange,
  formatChangePercent,
  flashingProducts,
  selectedDate = 'all'
}: MobileProductViewProps) {
  const { isMobile, safeAreaInsets } = useIsMobile();
  const { triggerHapticFeedback } = useMobileOptimization();
  const [isFiltersOpen, setIsFiltersOpen] = React.useState(false);

  // Calculate active filters count
  const activeFiltersCount = Object.values(selectedFilters).reduce(
    (count, filters) => count + filters.length, 
    0
  );
  const hasActiveFilters = activeFiltersCount > 0;

  const handleFilterToggle = () => {
    console.log('🔘 MobileProductView: handleFilterToggle called!', {
      currentState: isFiltersOpen,
      willBecome: !isFiltersOpen,
      timestamp: new Date().toISOString()
    });
    setIsFiltersOpen(!isFiltersOpen);
    triggerHapticFeedback('light');
  };

  const handleFilterClose = () => {
    setIsFiltersOpen(false);
    triggerHapticFeedback('light');
  };

  if (!isMobile) {
    return null; // Component should only render on mobile
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] p-8">
        <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
          Erro ao carregar produtos
        </h3>
        <p className="text-slate-600 dark:text-slate-400 text-center">
          {error}
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full mobile-optimized">
      {/* Mobile Search Bar */}
      <MobileSearchBar
        searchTerm={searchTerm}
        onSearchChange={onSearchChange}
        onFilterToggle={handleFilterToggle}
        hasActiveFilters={hasActiveFilters}
        activeFiltersCount={activeFiltersCount}
        selectedDate={selectedDate}
      />

      {/* Products Content */}
      <div 
        className="flex-1 overflow-y-auto mobile-smooth-scroll"
        data-mobile-scroll
        style={{ 
          paddingBottom: `max(${safeAreaInsets.bottom}px, 16px)` 
        }}
      >
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Spinner className="w-8 h-8 text-blue-600" />
            <span className="ml-2 text-slate-600 dark:text-slate-400">
              Carregando produtos...
            </span>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 px-6">
            <div className="text-4xl mb-4">📱</div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
              Nenhum produto encontrado
            </h3>
            <p className="text-slate-600 dark:text-slate-400 text-center">
              {hasActiveFilters ? 
                'Tente ajustar os filtros ou limpar a busca' : 
                'Tente uma busca diferente'
              }
            </p>
          </div>
        ) : (
          <div className="p-4 space-y-3">
            {filteredProducts.map((product, index) => (
              <MobileProductCard
                key={`${product.id}-${product.lastUpdated}`}
                product={product}
                index={index}
                currentPage={currentPage}
                itemsPerPage={itemsPerPage}
                isFlashing={flashingProducts.has(product.id)}
                isProductInWatchlist={isProductInWatchlist}
                toggleProductInWatchlist={toggleProductInWatchlist}
                getCategoryIcon={getCategoryIcon}
                formatChange={formatChange}
                formatChangePercent={formatChangePercent}
                filteredProducts={filteredProducts}
              />
            ))}
            
            {/* Load More Indicator */}
            {filteredProducts.length >= itemsPerPage && (
              <div className="text-center py-4">
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Mostrando {filteredProducts.length} produtos
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Mobile Filters Panel */}
      <MobileFiltersPanel
        isOpen={isFiltersOpen}
        onClose={handleFilterClose}
        filters={filters}
        selectedFilters={selectedFilters}
        onFilterChange={onFilterChange}
        productCount={filteredProducts.length}
      />
    </div>
  );
}
