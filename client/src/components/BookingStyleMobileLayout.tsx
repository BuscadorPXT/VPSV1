import React, { useState, useEffect } from 'react';
import { Search, Filter, MapPin, Calendar, Users, Star, Heart, ArrowLeft, Menu } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils'; // Assuming cn is available for class name merging

interface BookingStyleMobileLayoutProps {
  children: React.ReactNode;
  onSearch?: (query: string) => void;
  onFilterOpen?: () => void; // This prop is for opening the filter modal/drawer
  searchPlaceholder?: string;
  showBackButton?: boolean;
  onBack?: () => void;
  title?: string;
}

// Hook to detect if the current device is considered "mobile"
// This is a simplified example and might need to be more sophisticated based on actual breakpoints.
function useMobileSimple() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const userAgent = typeof window !== 'undefined' ? window.navigator.userAgent : '';
    // Basic check for common mobile user agents, can be expanded
    const mobileRegex = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i;
    setIsMobile(mobileRegex.test(userAgent));

    // Consider window resize if the layout is dynamic based on screen width
    const handleResize = () => {
      // Example: update based on screen width, if preferred over userAgent
      // setIsMobile(window.innerWidth < 768);
    };

    // window.addEventListener('resize', handleResize);
    // return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Logging for debugging purposes as requested in thinking process
  console.log('📱 useMobileSimple hook executed. isMobile:', isMobile);

  return isMobile;
}

// Hook removido - controle centralizado no componente principal

export function BookingStyleMobileLayout({
  children,
  onSearch,
  onFilterOpen,
  searchPlaceholder = "Buscar produtos...",
  showBackButton = false,
  onBack,
  title = "Produtos"
}: BookingStyleMobileLayoutProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const isMobile = useMobileSimple();

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch?.(searchQuery);
  };

  const handleFilterButtonClick = () => {
    console.log('🔘 [MOBILE-LAYOUT] Filter button clicked - calling onFilterOpen');
    console.log('🔘 [MOBILE-LAYOUT] onFilterOpen exists:', typeof onFilterOpen);
    
    if (onFilterOpen) {
      console.log('🔘 [MOBILE-LAYOUT] Executing onFilterOpen function');
      onFilterOpen();
    } else {
      console.warn('🔘 [MOBILE-LAYOUT] onFilterOpen is undefined!');
    }
  };

  // Debugging the render of the main layout component
  console.log(`📱 BookingStyleMobileLayout RENDER: isMobile=${isMobile}, searchQuery=${searchQuery}`);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header estilo Booking */}
      <div className="bg-blue-600 dark:bg-blue-700 text-white">
        {/* Top Bar */}
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            {showBackButton && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onBack}
                className="text-white hover:bg-white/20 p-2"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
            )}
            <h1 className="text-lg font-semibold">{title}</h1>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="text-white hover:bg-white/20 p-2"
          >
            <Menu className="h-5 w-5" />
          </Button>
        </div>

        {/* Search Bar estilo Booking */}
        <div className="px-4 pb-4">
          <form onSubmit={handleSearchSubmit} className="relative">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm">
              <div className="flex items-center p-3">
                <Search className="h-5 w-5 text-gray-400 mr-3" />
                <Input
                  type="text"
                  placeholder={searchPlaceholder}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="border-0 bg-transparent text-gray-900 dark:text-white placeholder:text-gray-500 focus:ring-0 flex-1"
                />
                <Button
                  type="button"
                  onClick={handleFilterButtonClick} // Changed to call our handler
                  variant="ghost"
                  size="sm"
                  className="text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900/20 p-2 ml-2"
                >
                  <Filter className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </form>
        </div>
      </div>

      {/* Quick Stats Bar estilo Booking */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">3.5K</div>
              <div className="text-xs text-gray-500">Produtos</div>
            </div>
            <div className="w-px h-8 bg-gray-200 dark:bg-gray-600"></div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">80</div>
              <div className="text-xs text-gray-500">Fornecedores</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
            <span className="text-sm font-medium">4.8</span>
            <span className="text-xs text-gray-500">(1.2k)</span>
          </div>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1">
        {children}
      </div>

      {/* Filtros são renderizados pelo componente pai */}
    </div>
  );
}

// Componente de Card de Produto estilo Booking
interface BookingStyleProductCardProps {
  product: any;
  onSelect?: (product: any) => void;
  onFavorite?: (product: any) => void;
  isFavorite?: boolean;
}

export function BookingStyleProductCard({
  product,
  onSelect,
  onFavorite,
  isFavorite = false
}: BookingStyleProductCardProps) {
  return (
    <Card className="mb-3 mx-4 shadow-sm hover:shadow-md transition-shadow">
      <CardContent className="p-0">
        <div className="flex">
          {/* Image/Icon Area */}
          <div className="w-20 h-20 bg-gradient-to-br from-blue-100 to-blue-200 dark:from-blue-900/20 dark:to-blue-800/20 rounded-l-lg flex items-center justify-center">
            <div className="text-2xl">📱</div>
          </div>

          {/* Content Area */}
          <div className="flex-1 p-3">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-semibold text-sm text-gray-900 dark:text-white">
                    {product.model} {product.storage}
                  </h3>
                  <Badge variant="secondary" className="text-xs">
                    {product.category}
                  </Badge>
                </div>

                <div className="flex items-center gap-2 mb-2">
                  <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                  <span className="text-xs text-gray-600 dark:text-gray-400">
                    {product.color}
                  </span>
                  <span className="text-xs text-gray-400">•</span>
                  <span className="text-xs text-gray-600 dark:text-gray-400">
                    {product.region}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <MapPin className="h-3 w-3 text-gray-400" />
                  <span className="text-xs text-gray-600 dark:text-gray-400">
                    {product.supplierName}
                  </span>
                  <div className="flex items-center gap-1">
                    <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />
                    <span className="text-xs text-gray-600">4.2</span>
                  </div>
                </div>
              </div>

              {/* Price and Actions */}
              <div className="text-right">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onFavorite?.(product)}
                  className="p-1 mb-1"
                >
                  <Heart className={`h-4 w-4 ${isFavorite ? 'fill-red-500 text-red-500' : 'text-gray-400'}`} />
                </Button>

                <div className="text-right">
                  <div className="text-lg font-bold text-green-600 dark:text-green-400">
                    R$ {product.price?.toFixed(2)}
                  </div>
                  {product.previousPrice && (
                    <div className="text-xs text-gray-500 line-through">
                      R$ {product.previousPrice.toFixed(2)}
                    </div>
                  )}
                  <div className="text-xs text-gray-500">
                    por unidade
                  </div>
                </div>
              </div>
            </div>

            {/* Action Button */}
            <div className="mt-3 pt-2 border-t border-gray-100 dark:border-gray-700">
              <Button
                onClick={() => onSelect?.(product)}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white text-sm py-2"
              >
                Ver Detalhes
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Componente de Filtros estilo Booking
interface BookingStyleFiltersProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyFilters: (filters: any) => void;
  onFilterToggle?: () => void; // Optional, if the filter component itself needs to trigger a toggle
  hasActiveFilters?: boolean; // Added for styling
  activeFiltersCount?: number; // Added for display
}

// The original component `BookingStyleFilters` was not present in the provided original code.
// Based on the user's intent and the changes snippet, it seems the intention was to modify a button that toggles filters.
// Assuming the change snippet refers to a filter toggle button that should be present in the mobile layout.
// I will create a placeholder for such a component or assume it's part of the `BookingStyleMobileLayout`'s header.
// Since the change snippet directly replaces a function definition, I will assume it's meant to be a separate component.

// Componente de filtros que é usado como modal/drawer no mobile
export function BookingStyleFilters({
  isOpen,
  onClose,
  onApplyFilters,
  onFilterToggle,
  hasActiveFilters,
  activeFiltersCount
}: BookingStyleFiltersProps) {
  console.log('📱 [BookingStyleFilters] RENDER CHECK:', {
    isOpen,
    hasActiveFilters,
    activeFiltersCount,
    onClose: typeof onClose,
    onApplyFilters: typeof onApplyFilters,
    timestamp: new Date().toISOString(),
    shouldRender: isOpen === true
  });

  // MÚLTIPLAS VERIFICAÇÕES: Só renderizar se explicitamente aberto
  if (!isOpen || isOpen !== true) {
    console.log('📱 [BookingStyleFilters] NOT RENDERING - isOpen:', isOpen);
    return null;
  }

  console.log('📱 BookingStyleFilters: RENDERING MODAL');

  return (
    <div className="fixed inset-0 bg-black/50 z-50">
      <div className="absolute bottom-0 left-0 right-0 bg-white dark:bg-gray-800 rounded-t-2xl max-h-[80vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold">Filtros</h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              console.log('📱 BookingStyleFilters close button clicked');
              onClose?.();
            }}
          >
            ✕
          </Button>
        </div>

        {/* Filter Content */}
        <div className="p-4 space-y-6">
          {/* Price Range */}
          <div>
            <h3 className="font-medium mb-3">Faixa de Preço</h3>
            <div className="flex gap-2">
              <Input placeholder="Mín" />
              <Input placeholder="Máx" />
            </div>
          </div>

          {/* Category */}
          <div>
            <h3 className="font-medium mb-3">Categoria</h3>
            <div className="grid grid-cols-2 gap-2">
              {['iPhone', 'iPad', 'AirPods', 'Apple Watch'].map((category) => (
                <Button key={category} variant="outline" className="justify-start">
                  {category}
                </Button>
              ))}
            </div>
          </div>

          {/* Apply Button */}
          <Button
            onClick={() => {
              console.log('📱 BookingStyleFilters apply button clicked');
              onApplyFilters?.({});
            }}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white"
          >
            Aplicar Filtros
          </Button>
        </div>
      </div>
    </div>
  );
}

// The original BookingStyleFilters component for the modal/drawer itself.
// This component is for displaying the filter options when the modal is open.
export function BookingStyleFiltersModal({ // Renamed to avoid conflict and clarify purpose
  isOpen,
  onClose,
  onApplyFilters
}: BookingStyleFiltersProps) { // Reusing the interface for filter props
  console.log('📱 BookingStyleFiltersModal render:', { isOpen });

  if (!isOpen) {
    console.log('📱 BookingStyleFiltersModal: Not open, returning null');
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50">
      <div className="absolute bottom-0 left-0 right-0 bg-white dark:bg-gray-800 rounded-t-2xl max-h-[80vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold">Filtros</h2>
          <Button variant="ghost" size="sm" onClick={onClose}>
            ✕
          </Button>
        </div>

        {/* Filter Content */}
        <div className="p-4 space-y-6">
          {/* Price Range */}
          <div>
            <h3 className="font-medium mb-3">Faixa de Preço</h3>
            <div className="flex gap-2">
              <Input placeholder="Mín" />
              <Input placeholder="Máx" />
            </div>
          </div>

          {/* Category */}
          <div>
            <h3 className="font-medium mb-3">Categoria</h3>
            <div className="grid grid-cols-2 gap-2">
              {['iPhone', 'iPad', 'AirPods', 'Apple Watch'].map((category) => (
                <Button key={category} variant="outline" className="justify-start">
                  {category}
                </Button>
              ))}
            </div>
          </div>

          {/* Apply Button */}
          <Button
            onClick={() => onApplyFilters({})}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white"
          >
            Aplicar Filtros
          </Button>
        </div>
      </div>
    </div>
  );
}