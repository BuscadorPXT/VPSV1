import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import { getAuthHeaders } from "@/lib/auth-api";
import { usePriceMonitoring } from "@/hooks/use-price-monitoring";
import { usePriceMonitorStore } from "@/stores/price-monitor";
import { getColorInfo } from "@/lib/color-mapping";
import { DollarSign, Smartphone, ChevronLeft, ChevronRight, ArrowUpDown, ArrowUp, ArrowDown, CheckCircle, Lock, RefreshCw, Zap, Activity } from "lucide-react";
import { CategoryIcon } from "@/lib/category-icons";
import { SubscriptionPlan, canUserAccessFeature } from "@shared/subscription";
import { useTheme } from "@/components/theme-provider";
import { FavoriteButton } from "@/components/FavoriteButton";
import { PriceCell } from "@/components/PriceCell";
import { MiniPriceSparkline } from "@/components/PriceSparkline";
import { FilterBadges } from "@/components/FilterBadges";
import { CompactFilters } from "@/components/CompactFilters";
import { EnhancedProductTable } from "@/components/EnhancedProductTable";
import { formatPrice } from "@/lib/formatters";
import { usePinnedColumns } from "@/hooks/usePinnedColumns";
import watermarkPattern from "@/assets/watermark-pattern.png";
import watermarkPatternDark from "@/assets/watermark-pattern-dark.png";
import watermarkLogo from "@/assets/watermark-logo.png";

interface Product {
  id: number;
  model: string;
  brand: string;
  storage: string;
  color: string;
  category: string | null;
  price: string;
  sku: string | null;
  available: boolean;
  isLowestPrice: boolean;
  updatedAt: string;
  supplier: {
    id: number;
    name: string;
  };
  supplierWhatsapp?: string;
}

interface PaginatedProducts {
  products: Product[];
  total: number;
  page: number;
  limit: number;
}

interface ProductTableProps {
  filters: {
    search: string;
    storage: string;
    color: string;
    category: string;
    capacity: string;
    region: string;
    supplierId: string;
    supplierIds: string[];
    date: string;
    brandCategory: 'all' | 'xiaomi' | 'iphone';
  };
  userPlan?: SubscriptionPlan;
  isAdmin?: boolean;
  role?: string;
}

function WhatsAppButton({ whatsappNumber, supplierName, size = "sm" }: { whatsappNumber: string, supplierName: string, size?: "sm" | "md" }) {
  const whatsappLink = `https://wa.me/${whatsappNumber}`;
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="outline"
            size={size}
            className="bg-green-50 hover:bg-green-100 dark:bg-green-900/50 dark:hover:bg-green-800/50 text-green-600 dark:text-green-400 border-green-300 dark:border-green-700 transition-colors"
            asChild
          >
            <a href={whatsappLink} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2">
              <Smartphone className="h-4 w-4" />
              {size === "sm" ? "WhatsApp" : "Fale com " + supplierName}
            </a>
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Entrar em contato com {supplierName} via WhatsApp</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export function ProductTable({ filters, userPlan = 'free', isAdmin, role }: ProductTableProps) {
  const [page, setPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(50);
  const [sortField, setSortField] = useState<string>('');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [isCondensedLayout, setIsCondensedLayout] = useState(false);
  const { pinnedColumns, isPinned, togglePin } = usePinnedColumns(['model', 'price']);
  const limit = itemsPerPage;

  const queryClient = useQueryClient();
  const { priceHistory, getProductKey, markDropAsViewed, getPricePoints } = usePriceMonitorStore();
  const { theme } = useTheme();

  const { data, isLoading, error } = useQuery<PaginatedProducts>({
    queryKey: ['/api/products', { page, limit, ...filters, ...(sortField ? { sortField, sortDirection } : {}) }],
    queryFn: async () => {
      console.log("ProductTable - Starting data fetch with permissions:", {
        userPlan,
        isAdmin,
        role,
        filters
      });

      try {
        const params = new URLSearchParams();
        params.set('page', page.toString());
        params.set('limit', limit.toString());

        // Only add sorting parameters if sortField is set
        if (sortField) {
          params.set('sortBy', sortField);
          params.set('sortOrder', sortDirection);
        }

        // Handle date filter consistently
        if (filters.date && filters.date !== 'all') {
          params.set('date', filters.date);
          console.log("ProductTable - Applying date filter:", filters.date);
        }

        if (filters.search) params.set('search', filters.search);
        if (filters.storage && filters.storage !== 'all') params.set('storage', filters.storage);
        if (filters.color && filters.color !== 'all') params.set('color', filters.color);
        if (filters.category && filters.category !== 'all') params.set('category', filters.category);
        if (filters.capacity && filters.capacity !== 'all') params.set('capacity', filters.capacity);
        if (filters.region && filters.region !== 'all') params.set('region', filters.region);
        if (filters.brandCategory && filters.brandCategory !== 'all') params.set('brandCategory', filters.brandCategory);

        // Support both single supplier and multiple suppliers
        if (filters.supplierIds && filters.supplierIds.length > 0) {
          filters.supplierIds.forEach(id => params.append('supplierIds', id));
        } else if (filters.supplierId && filters.supplierId !== 'all') {
          params.set('supplierId', filters.supplierId);
        }

        console.log("ProductTable - Fetching products with:", params.toString());

        const headers = await getAuthHeaders();
        const res = await fetch(`/api/products?${params}`, { 
          headers,
          signal: AbortSignal.timeout(30000) // 30 second timeout
        });

        if (!res.ok) {
          const errorText = await res.text();
          console.error("ProductTable - API Error:", res.status, errorText);
          throw new Error(`API Error: ${res.status} - ${errorText}`);
        }

        const responseData = await res.json();
        
        // Validate response structure
        if (!responseData || typeof responseData !== 'object') {
          throw new Error('Invalid response format');
        }

        console.log("ProductTable - Received products data:", {
          total: responseData.total,
          count: responseData.products?.length,
          page: responseData.page,
          requestedDate: filters.date,
          actualDate: responseData.actualDate,
          success: responseData.success
        });

        return {
          products: responseData.products || [],
          total: responseData.total || 0,
          page: responseData.page || page,
          limit: responseData.limit || limit,
          actualDate: responseData.actualDate,
          requestedDate: filters.date
        };
      } catch (error) {
        console.error("ProductTable - Fetch error:", error);
        throw error;
      }
    },
    refetchInterval: false,
    staleTime: 5 * 60 * 1000,
    placeholderData: (previousData) => previousData,
    retry: (failureCount, error) => {
      // Don't retry on auth errors
      if (error?.message?.includes('401') || error?.message?.includes('403')) {
        return false;
      }
      return failureCount < 2;
    },
  });

  // Enable price monitoring for the fetched products
  usePriceMonitoring(data?.products);

  // Função para recalcular dinamicamente o menor preço
  const productsWithDynamicLowestPrice = useMemo(() => {
    if (!data?.products || data.products.length === 0) {
      return [];
    }

    const products = [...data.products];
    
    // Encontrar o menor preço entre todos os produtos da lista atual
    const minPrice = Math.min(...products.map(product => {
      const priceValue = typeof product.price === 'string' 
        ? parseFloat(product.price.replace(/[^\d.,]/g, '').replace(',', '.')) 
        : parseFloat(product.price?.toString() || '0');
      return isNaN(priceValue) ? Infinity : priceValue;
    }));

    // Atualizar a propriedade isLowestPrice dinamicamente
    return products.map(product => {
      const priceValue = typeof product.price === 'string' 
        ? parseFloat(product.price.replace(/[^\d.,]/g, '').replace(',', '.')) 
        : parseFloat(product.price?.toString() || '0');
      
      return {
        ...product,
        isLowestPrice: !isNaN(priceValue) && Math.abs(priceValue - minPrice) < 0.01
      };
    });
  }, [data?.products]);

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
    setPage(1); // Reset to first page when sorting
  };

  // Reset to page 1 when items per page changes
  const handleItemsPerPageChange = (newItemsPerPage: number) => {
    setItemsPerPage(newItemsPerPage);
    setPage(1);
  };





  const getStorageBadgeColor = (storage: string) => {
    if (storage.includes('64')) return 'bg-blue-100 text-blue-800';
    if (storage.includes('128')) return 'bg-purple-100 text-purple-800';
    if (storage.includes('256')) return 'bg-green-100 text-green-800';
    if (storage.includes('512')) return 'bg-amber-100 text-amber-800';
    if (storage.includes('1TB')) return 'bg-red-100 text-red-800';
    return 'bg-slate-100 text-slate-800';
  };



  const handleFilterChange = (key: string, value: string) => {
    // This would typically update the parent component's filters
    console.log(`Filter changed: ${key} = ${value}`);
  };

  const handleSearchChange = (value: string) => {
    // This would typically update the parent component's search filter
    console.log(`Search changed: ${value}`);
  };

  const handleRemoveFilter = (filterKey: string) => {
    // This would typically reset the specific filter in the parent component
    console.log(`Remove filter: ${filterKey}`);
  };

  const SortButton = ({ field, children }: { field: string; children: React.ReactNode }) => (
    <button 
      className="group flex items-center space-x-2 hover:text-foreground transition-smooth text-muted-foreground hover-icon" 
      onClick={() => handleSort(field)}
    >
      <span>{children}</span>
      {sortField === field ? (
        sortDirection === 'asc' ? (
          <ArrowUp className="h-4 w-4 sort-icon text-primary" />
        ) : (
          <ArrowDown className="h-4 w-4 sort-icon text-primary" />
        )
      ) : (
        <ArrowUpDown className="h-4 w-4 opacity-50 group-hover:opacity-100 sort-icon transition-smooth" />
      )}
    </button>
  );

  // Enhanced Skeleton Loader Component
  const TableSkeleton = () => (
    <div className="animate-pulse">
      {/* Header Skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {Array(4).fill(0).map((_, i) => (
          <div key={i} className="bg-gray-100 dark:bg-gray-800 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <Skeleton className="h-6 w-16" />
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-3 w-20" />
              </div>
              <Skeleton className="h-8 w-8 rounded-full" />
            </div>
          </div>
        ))}
      </div>

      {/* Filter Skeleton */}
      <div className="flex flex-wrap gap-2 mb-4">
        {Array(5).fill(0).map((_, i) => (
          <Skeleton key={i} className="h-8 w-20 rounded-full" />
        ))}
      </div>

      {/* Table Skeleton */}
      <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
        {/* Table Header */}
        <div className="bg-gray-50 dark:bg-gray-800 p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="grid grid-cols-9 gap-4">
            {Array(9).fill(0).map((_, i) => (
              <Skeleton key={i} className="h-4 w-full" />
            ))}
          </div>
        </div>

        {/* Table Rows */}
        {Array(limit).fill(0).map((_, rowIndex) => (
          <div key={rowIndex} className="p-4 border-b border-gray-100 dark:border-gray-700 last:border-b-0">
            <div className="grid grid-cols-9 gap-4 items-center">
              <Skeleton className="h-4 w-6" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-3 w-3/4" />
              </div>
              <Skeleton className="h-6 w-12 rounded-full" />
              <div className="space-y-1">
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-3 w-12" />
              </div>
              <Skeleton className="h-6 w-16 rounded-full" />
              <div className="text-right space-y-1">
                <Skeleton className="h-5 w-20 ml-auto" />
                <Skeleton className="h-3 w-16 ml-auto" />
              </div>
              <div className="text-right space-y-1">
                <Skeleton className="h-4 w-16 ml-auto" />
                <Skeleton className="h-3 w-12 ml-auto" />
              </div>
              <div className="space-y-1">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-3 w-16" />
              </div>
              <div className="text-center space-y-2">
                <Skeleton className="h-6 w-16 mx-auto rounded-full" />
                <Skeleton className="h-4 w-4 mx-auto rounded-full" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Pagination Skeleton */}
      <div className="flex justify-between items-center mt-4">
        <Skeleton className="h-4 w-32" />
        <div className="flex gap-2">
          {Array(5).fill(0).map((_, i) => (
            <Skeleton key={i} className="h-8 w-8" />
          ))}
        </div>
      </div>
    </div>
  );

  if (error) {
    return (
      <Card className="transition-all duration-300 ease-in-out">
        <CardContent className="p-6 text-center">
          <div className="text-red-600 mb-2 animate-bounce">
            <Activity className="h-8 w-8 mx-auto" />
          </div>
          <p className="text-slate-900 dark:text-white font-medium">Erro ao carregar produtos</p>
          <p className="text-slate-600 dark:text-slate-400 text-sm">Verifique sua conexão e tente novamente</p>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                className="mt-4 transition-all duration-200 hover:scale-105" 
                onClick={() => queryClient.invalidateQueries({ queryKey: ['/api/products'] })}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Tentar novamente
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Recarregar dados dos produtos</p>
            </TooltipContent>
          </Tooltip>
        </CardContent>
      </Card>
    );
  }

  const totalPages = data ? Math.ceil(data.total / limit) : 0;

  return (
    <TooltipProvider>
      <Card className="shadow-lg border-0 bg-gradient-to-br from-white to-gray-50/50 dark:from-gray-900 dark:to-gray-800/50 relative overflow-hidden transition-all duration-300 ease-in-out z-10">
        {/* Modern gradient background */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50/30 via-transparent to-purple-50/20 dark:from-blue-950/20 dark:via-transparent dark:to-purple-950/10 pointer-events-none" />

        {/* Watermark Logo */}
        {false && (
          <div 
            className="absolute inset-0 pointer-events-none watermark-responsive"
            style={{
              backgroundImage: `url(${watermarkLogo})`,
              backgroundRepeat: 'repeat',
              backgroundSize: 'var(--watermark-size, 273px) var(--watermark-size, 273px)',
              backgroundPosition: '0 0',
              opacity: 0.08,
              zIndex: 9999,
              width: '100%',
              height: '100%',
              minWidth: '100%',
              minHeight: '100%'
            }}
          />
        )}>

      <CardContent className="p-0 relative z-10">
        <div className="px-6 py-5 border-b border-gray-200/80 dark:border-gray-700/60 bg-white/70 dark:bg-gray-900/70 backdrop-blur-sm relative z-20">
          <div className="flex flex-col gap-4">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="h-8 w-1 bg-gradient-to-b from-blue-500 to-purple-600 rounded-full"></div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white">Lista de Produtos</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Encontre os melhores preços em tempo real</p>
                </div>
              </div>
              {data && (
                <div className="bg-gray-100 dark:bg-gray-800 px-4 py-2 rounded-full">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    <span className="hidden sm:inline">Exibindo </span> 
                    <span className="text-blue-600 dark:text-blue-400 font-bold">{((page - 1) * limit) + 1}</span> a{' '}
                    <span className="text-blue-600 dark:text-blue-400 font-bold">{Math.min(page * limit, data.total)}</span> de{' '}
                    <span className="text-blue-600 dark:text-blue-400 font-bold">{data.total}</span>
                    <span className="hidden sm:inline"> produtos</span>
                  </span>
                </div>
              )}
            </div>

            {/* Filter Badges */}
            <FilterBadges
              filters={filters}
              onRemoveFilter={handleRemoveFilter}
              className="mb-4"
            />

            {/* Compact Filters */}
            <CompactFilters
              filters={filters}
              onFilterChange={handleFilterChange}
              onSearchChange={handleSearchChange}
              isCondensed={isCondensedLayout}
              onToggleCondensed={() => setIsCondensedLayout(!isCondensedLayout)}
              className="mb-4"
            />

            {/* Quick Actions & Sort */}
            <div className="hidden lg:flex items-center justify-between bg-gray-50/80 dark:bg-gray-800/50 rounded-lg px-4 py-3">
              <div className="flex items-center gap-4">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Ordenação:</span>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleSort('price')}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                      sortField === 'price'
                        ? 'bg-blue-600 text-white shadow-md'
                        : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span>Preço</span>
                      {sortField === 'price' && (
                        sortDirection === 'asc' ? (
                          <ArrowUp className="w-3 h-3" />
                        ) : (
                          <ArrowDown className="w-3 h-3" />
                        )
                      )}
                    </div>
                  </button>

                  <button
                    onClick={() => handleSort('model')}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                      sortField === 'model'
                        ? 'bg-blue-600 text-white shadow-md'
                        : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span>Nome</span>
                      {sortField === 'model' && (
                        sortDirection === 'asc' ? (
                          <ArrowUp className="w-3 h-3" />
                        ) : (
                          <ArrowDown className="w-3 h-3" />
                        )
                      )}
                    </div>
                  </button>

                  <button
                    onClick={() => handleSort('supplier')}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                      sortField === 'supplier'
                        ? 'bg-blue-600 text-white shadow-md'
                        : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span>Fornecedor</span>
                      {sortField === 'supplier' && (
                        sortDirection === 'asc' ? (
                          <ArrowUp className="w-3 h-3" />
                        ) : (
                          <ArrowDown className="w-3 h-3" />
                        )
                      )}
                    </div>
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {productsWithDynamicLowestPrice.filter(p => p.isLowestPrice).length || 0} melhores preços
                </span>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="text-xs text-gray-600 dark:text-gray-400">Melhor preço</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                  <span className="text-xs text-gray-600 dark:text-gray-400">Queda de preço</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Desktop Enhanced Table View - Visible on desktop */}
        <div className="hidden lg:block bg-white/40 dark:bg-gray-900/40 max-w-full overflow-hidden sticky-header-container relative z-15">
          {isLoading ? (
            <div className="p-6 transition-all duration-500 ease-in-out">
              <TableSkeleton />
            </div>
          ) : (
            <div className="transition-all duration-300 ease-in-out animate-fade-in">
              <EnhancedProductTable
                products={productsWithDynamicLowestPrice || []}
                onSort={handleSort}
                sortField={sortField}
                sortDirection={sortDirection}
                getProductKey={getProductKey}
                getPricePoints={getPricePoints}
                isLoading={isLoading}
              />
            </div>
          )}
        </div>



        {/* Medium Tablet View - Visible on medium screens */}
        <div className="hidden md:block lg:hidden bg-white/40 dark:bg-gray-900/40 max-w-full overflow-hidden relative z-15">
          <div className="overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700 relative max-h-[70vh]">
            <div className="overflow-auto max-h-[70vh]">
              <table className="w-full">
                <colgroup>
                  <col style={{ width: '15%' }} />
                  <col style={{ width: '45%' }} />
                  <col style={{ width: '25%' }} />
                  <col style={{ width: '15%' }} />
                </colgroup>

                <thead className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-30 shadow-sm">
                  <tr className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                    <th className="px-4 py-4 text-center bg-white dark:bg-gray-900">CAT</th>
                    <th className="px-3 py-3 text-left bg-white dark:bg-gray-900">
                      <SortButton field="model">PRODUTO</SortButton>
                    </th>
                    <th className="px-3 py-3 text-right bg-white dark:bg-gray-900">
                      <SortButton field="price">PREÇO</SortButton>
                    </th>
                    <th className="px-3 py-3 text-center bg-white dark:bg-gray-900">STATUS</th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800">
                  {isLoading ? (
                    [...Array(limit)].map((_, i) => (
                      <tr key={i} className="border-b border-gray-100 dark:border-gray-700">
                        <td className="px-4 py-4 text-center"><Skeleton className="h-6 w-6 mx-auto rounded" /></td>
                        <td className="px-3 py-3"><Skeleton className="h-4 w-full" /></td>
                        <td className="px-3 py-3 text-right"><Skeleton className="h-5 w-16 ml-auto rounded" /></td>
                        <td className="px-3 py-3 text-center"><Skeleton className="h-6 w-6 mx-auto rounded-full" /></td>
                      </tr>
                    ))
                  ) : (
                    productsWithDynamicLowestPrice.map((product, index) => (
                      <tr 
                        key={product.id} 
                        className={`border-b border-gray-100 dark:border-gray-700 transition-all duration-300 ease-in-out cursor-pointer ${
                          index % 2 === 0 
                            ? 'bg-white dark:bg-gray-800' 
                            : 'bg-gray-50 dark:bg-gray-750'
                        } hover:bg-gradient-to-r hover:from-blue-50/80 hover:to-indigo-50/60 dark:hover:from-blue-900/20 dark:hover:to-indigo-900/15 hover:shadow-lg hover:shadow-blue-500/10 hover:scale-[1.002] hover:border-blue-200/50 dark:hover:border-blue-700/50`}
                        style={{ animationDelay: `${index * 20}ms` }}
                      >
                        <td className="px-4 py-4 text-center align-middle">
                          <div className="flex flex-col items-center gap-3">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div className="p-2 rounded-lg bg-white dark:bg-gray-800/50 shadow-sm border border-gray-100 dark:border-gray-700/50 transition-all duration-200 hover:shadow-md hover:scale-110">
                                  <CategoryIcon 
                                    category={product.category} 
                                    size="h-5 w-5" 
                                    showTooltip={false}
                                  />
                                </div>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Categoria: {product.category}</p>
                              </TooltipContent>
                            </Tooltip>
                            <span className={`px-3 py-1.5 rounded-full text-xs font-semibold border shadow-sm min-w-[72px] text-center transition-all duration-200 hover:scale-105 hover:shadow-md ${
                              product.category === 'IPH' ? 'bg-gradient-to-r from-blue-50 to-blue-100 text-blue-800 border-blue-200 dark:from-blue-900/50 dark:to-blue-800/50 dark:text-blue-200 dark:border-blue-700' :
                              product.category === 'IPAD' ? 'bg-gradient-to-r from-green-50 to-green-100 text-green-800 border-green-200 dark:from-green-900/50 dark:to-green-800/50 dark:text-green-200 dark:border-green-700' :
                              product.category === 'MCB' ? 'bg-gradient-to-r from-purple-50 to-purple-100 text-purple-800 border-purple-200 dark:from-purple-900/50 dark:to-purple-800/50 dark:text-purple-200 dark:border-purple-700' :
                              product.category === 'RLG' ? 'bg-gradient-to-r from-orange-50 to-orange-100 text-orange-800 border-orange-200 dark:from-orange-900/50 dark:to-orange-800/50 dark:text-orange-200 dark:border-orange-700' :
                              product.category === 'PODS' ? 'bg-gradient-to-r from-pink-50 to-pink-100 text-pink-800 border-pink-200 dark:from-pink-900/50 dark:to-pink-800/50 dark:text-pink-200 dark:border-pink-700' :
                              product.category === 'ACSS' ? 'bg-gradient-to-r from-amber-50 to-amber-100 text-amber-800 border-amber-200 dark:from-amber-900/50 dark:to-amber-800/50 dark:text-amber-200 dark:border-amber-700' :
                              'bg-gradient-to-r from-gray-50 to-gray-100 text-gray-800 border-gray-200 dark:from-gray-700/50 dark:to-gray-600/50 dark:text-gray-300 dark:border-gray-600'
                            }`}>
                              {product.category === 'IPH' ? 'iPhone' :
                               product.category === 'IPAD' ? 'iPad' :
                               product.category === 'MCB' ? 'MacBook' :
                               product.category === 'RLG' ? 'Watch' :
                               product.category === 'PODS' ? 'AirPods' :
                               product.category === 'ACSS' ? 'Acessórios' :
                               product.category || 'N/A'}
                            </span>
                          </div>
                        </td>

                        <td className="px-3 py-3 align-middle">
                          <div>
                            <h4 className="font-medium text-gray-900 dark:text-white text-sm truncate mb-1">
                              {product.model}
                            </h4>
                            <div className="flex items-center gap-1 text-xs text-gray-600 dark:text-gray-400">
                              <span className="bg-blue-100 dark:bg-blue-900/50 px-2 py-0.5 rounded text-blue-800 dark:text-blue-200">
                                {product.storage}
                              </span>
                              <div 
                                className="w-2 h-2 rounded-full border border-white dark:border-gray-600"
                                style={{ backgroundColor: getColorInfo(product.color).hex }}
                              ></div>
                              <span className="truncate max-w-16">{product.color}</span>
                            </div>
                          </div>
                        </td>

                        <td className="px-3 py-3 text-right align-middle">
                          <div className="text-right space-y-1">
                            <div className="flex items-center justify-end gap-2">
                              <PriceCell 
                                price={product.price}
                                className={`text-sm font-bold ${product.isLowestPrice ? 'text-green-600 dark:text-green-400' : 'text-gray-900 dark:text-white'}`}
                                animated={true}
                                showArrows={true}
                              />
                              <MiniPriceSparkline
                                priceHistory={getPricePoints(getProductKey(product))}
                                currentPrice={parseFloat(product.price)}
                                className="opacity-60 hover:opacity-100 transition-opacity"
                              />
                            </div>
                            {product.isLowestPrice && (
                              <span className="text-xs text-green-600 dark:text-green-400 font-medium">
                                Melhor preço
                              </span>
                            )}
                          </div>
                        </td>

                        <td className="px-3 py-3 text-center align-middle">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div>
                                <FavoriteButton 
                                  type="product" 
                                  itemId={product.id.toString()} 
                                  metadata={{ model: product.model, supplier: typeof product.supplier === 'string' ? product.supplier : product.supplier?.name || '' }}
                                  size="sm"
                                />
                              </div>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Adicionar aos favoritos</p>
                            </TooltipContent>
                          </Tooltip>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Mobile Sorting Controls - Visible only on mobile */}
        <div className="md:hidden border-b border-gray-200 dark:border-gray-700 p-4 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm">
          <div className="flex items-center gap-3 overflow-x-auto">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300 whitespace-nowrap">Ordenar:</span>            <div className="flex gap-2">
              <Button
                variant={sortField === 'price' ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleSort('price')}
                className={`whitespace-nowrap text-xs transition-all duration-200 ${
                  sortField === 'price' 
                    ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-md' 
                    : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
                }`}
              >
                Preço
                {sortField === 'price' && (
                  sortDirection === 'asc' ? (
                    <ArrowUp className="h-3 w-3 ml-1" />
                  ) : (
                    <ArrowDown className="h-3 w-3 ml-1" />
                  )
                )}
              </Button>

              <Button
                variant={sortField === 'model' ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleSort('model')}
                className={`whitespace-nowrap text-xs transition-all duration-200 ${
                  sortField === 'model' 
                    ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-md' 
                    : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
                }`}
              >
                Nome
                {sortField === 'model' && (
                  sortDirection === 'asc' ? (
                    <ArrowUp className="h-3 w-3 ml-1" />
                  ) : (
                    <ArrowDown className="h-3 w-3 ml-1" />
                  )
                )}
              </Button>
            </div>
          </div>
        </div>

        {/* Mobile Cards View - Visible only on mobile */}
        <div className="md:hidden space-y-3 p-4 bg-gray-50/30 dark:bg-gray-900/30 transition-all duration-300 ease-in-out relative z-15">
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(limit)].map((_, i) => (
                <div 
                  key={i} 
                  className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm border border-gray-100 dark:border-gray-700 animate-pulse"
                  style={{ animationDelay: `${i * 50}ms` }}
                >
                  <div className="space-y-4">
                    {/* Header skeleton */}
                    <div className="flex items-start gap-3">
                      <div className="flex flex-col items-center gap-2">
                        <Skeleton className="h-8 w-8 rounded-lg" />
                        <Skeleton className="h-4 w-12 rounded-full" />
                      </div>
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-5 w-3/4" />
                        <div className="flex gap-2">
                          <Skeleton className="h-4 w-16 rounded-full" />
                          <Skeleton className="h-4 w-4 rounded-full" />
                          <Skeleton className="h-4 w-12" />
                        </div>
                      </div>
                    </div>

                    {/* Price section skeleton */}
                    <div className="flex items-center justify-between">
                      <Skeleton className="h-8 w-24" />
                      <div className="space-y-1">
                        <Skeleton className="h-4 w-20 rounded-full" />
                        <Skeleton className="h-4 w-16 rounded-full" />
                      </div>
                    </div>

                    {/* Footer skeleton */}
                    <div className="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-gray-700">
                      <div className="flex items-center gap-2">
                        <Skeleton className="h-3 w-16" />
                        <Skeleton className="h-6 w-20 rounded-lg" />
                      </div>
                      <div className="flex gap-2">
                        <Skeleton className="h-6 w-6 rounded" />
                        <Skeleton className="h-6 w-6 rounded" />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            productsWithDynamicLowestPrice.map((product, index) => (
              <div 
                key={product.id} 
                className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-md hover:border-blue-200 dark:hover:border-blue-700 transition-all duration-200 animate-fade-in-up group"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                {/* Product header with icon and name */}
                <div className="flex items-start gap-3 mb-4">
                  <div className="flex flex-col items-center gap-3">
                    <div className="p-3 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-800/30 rounded-xl shadow-sm border border-blue-100 dark:border-blue-800/50 transition-all duration-200 hover:shadow-md hover:scale-110">
                      <CategoryIcon 
                        category={product.category} 
                        size="h-6 w-6" 
                        showTooltip={false}
                      />
                    </div>
                    <span className={`px-3 py-1.5 rounded-full text-xs font-semibold border shadow-sm min-w-[80px] text-center transition-all duration-200 hover:scale-105 hover:shadow-md ${
                      product.category === 'IPH' ? 'bg-gradient-to-r from-blue-50 to-blue-100 text-blue-800 border-blue-200 dark:from-blue-900/50 dark:to-blue-800/50 dark:text-blue-200 dark:border-blue-700' :
                      product.category === 'IPAD' ? 'bg-gradient-to-r from-green-50 to-green-100 text-green-800 border-green-200 dark:from-green-900/50 dark:to-green-800/50 dark:text-green-200 dark:border-green-700' :
                      product.category === 'MCB' ? 'bg-gradient-to-r from-purple-50 to-purple-100 text-purple-800 border-purple-200 dark:from-purple-900/50 dark:to-purple-800/50 dark:text-purple-200 dark:border-purple-700' :
                      product.category === 'RLG' ? 'bg-gradient-to-r from-orange-50 to-orange-100 text-orange-800 border-orange-200 dark:from-orange-900/50 dark:to-orange-800/50 dark:text-orange-200 dark:border-orange-700' :
                      product.category === 'PODS' ? 'bg-gradient-to-r from-pink-50 to-pink-100 text-pink-800 border-pink-200 dark:from-pink-900/50 dark:to-pink-800/50 dark:text-pink-200 dark:border-pink-700' :
                      product.category === 'ACSS' ? 'bg-gradient-to-r from-amber-50 to-amber-100 text-amber-800 border-amber-200 dark:from-amber-900/50 dark:to-amber-800/50 dark:text-amber-200 dark:border-amber-700' :
                      'bg-gradient-to-r from-gray-50 to-gray-100 text-gray-800 border-gray-200 dark:from-gray-700/50 dark:to-gray-600/50 dark:text-gray-300 dark:border-gray-600'
                    }`}>
                      {product.category === 'IPH' ? 'iPhone' :
                       product.category === 'IPAD' ? 'iPad' :
                       product.category === 'MCB' ? 'MacBook' :
                       product.category === 'RLG' ? 'Watch' :
                       product.category === 'PODS' ? 'AirPods' :
                       product.category === 'ACSS' ? 'Acessórios' :
                       product.category || 'N/A'}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-gray-900 dark:text-white text-base break-words leading-snug mb-3 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                      {product.model}
                    </h4>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gradient-to-r from-blue-100 to-blue-200 text-blue-800 dark:from-blue-900/50 dark:to-blue-800/50 dark:text-blue-200 border border-blue-200 dark:border-blue-700">
                        {product.storage}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <div 
                          className="h-3 w-3 rounded-full border-2 border-white dark:border-gray-600 shadow-sm"
                          style={{ backgroundColor: getColorInfo(product.color).hex }}
                        ></div>
                        <span className="text-xs text-gray-600 dark:text-gray-400 font-medium">{product.color}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Price section */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <PriceCell 
                      price={product.price}
                      className={`text-2xl font-bold ${product.isLowestPrice ? 'text-green-600 dark:text-green-400' : 'text-gray-900 dark:text-white'}`}
                      animated={true}
                      showArrows={true}
                    />
                    <MiniPriceSparkline
                      priceHistory={getPricePoints(getProductKey(product))}
                      currentPrice={parseFloat(product.price)}
                      className="opacity-60 hover:opacity-100 transition-opacity"
                    />
                  </div>
                  <div className="flex flex-col gap-2 items-end">
                    {product.isLowestPrice && (
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gradient-to-r from-green-100 to-emerald-100 text-green-700 dark:from-green-900/50 dark:to-emerald-900/50 dark:text-green-300 border border-green-200 dark:border-green-700">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Melhor preço
                      </span>
                    )}
                    {(() => {
                      const productKey = getProductKey(product);
                      const history = priceHistory[productKey];
                      return history?.hasPriceDrop && (
                        <span 
                          className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gradient-to-r from-orange-100 to-amber-100 text-orange-700 dark:from-orange-900/50 dark:to-amber-900/50 dark:text-orange-300 cursor-pointer hover:from-orange-200 hover:to-amber-200 dark:hover:from-orange-800/50 dark:hover:to-amber-800/50 transition-all duration-200 border border-orange-200 dark:border-orange-700"
                          onClick={() => markDropAsViewed(productKey)}
                          title={`Novo menor preço! De R$ ${history.previousPrice?.toFixed(2)} para R$ ${history.currentPrice.toFixed(2)}`}
                        >
                          <DollarSign className="w-3 h-3 mr-1" />
                          Queda de preço!
                        </span>
                      );
                    })()}
                  </div>
                </div>

                {/* Supplier and actions section */}
                <div className="flex items-center justify-between border-t border-gray-200 dark:border-gray-700 pt-4">
                  
                  <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-600 dark:text-gray-400">Fornecedor:</span>
                      {canUserAccessFeature(userPlan, 'canViewSuppliers', isAdmin, role) || 
                       role === 'pro' || role === 'admin' || role === 'superadmin' || isAdmin ? (
                        <div className="flex items-center gap-2">
                          <div className="bg-gray-50 dark:bg-gray-700/50 px-3 py-1 rounded-lg">
                            <span className="text-sm font-medium text-gray-900 dark:text-white">{typeof product.supplier === 'string' ? product.supplier : product.supplier?.name || ''}</span>
                          </div>
                          {product.supplierWhatsapp && (
                            <WhatsAppButton
                              whatsappNumber={product.supplierWhatsapp}
                              supplierName={typeof product.supplier === 'string' ? product.supplier : product.supplier?.name || ''}
                              size="sm"
                            />
                          )}
                        </div>
                      ) : (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 cursor-help bg-gray-50 dark:bg-gray-700/50 px-3 py-1 rounded-lg">
                              <Lock className="h-3 w-3" />
                              <span className="text-xs">Premium</span>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Atualize seu plano para ver os fornecedores</p>
                          </TooltipContent>
                        </Tooltip>
                      )}
                    </div>
                  <div className="flex items-center gap-2">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div>
                          <FavoriteButton 
                            type="product" 
                            itemId={product.id.toString()} 
                            metadata={{ model: product.model, supplier: typeof product.supplier === 'string' ? product.supplier : product.supplier?.name || '' }}
                            size="sm"
                          />
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Favoritar produto</p>
                      </TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div>
                          <FavoriteButton 
                            type="supplier" 
                            itemId={product.supplier.id.toString()} 
                            metadata={{ name: typeof product.supplier === 'string' ? product.supplier : product.supplier?.name || '' }}
                            size="sm"
                          />
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Favoritar fornecedor</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Modern Pagination */}
        <div className="px-6 py-4 border-t border-gray-200/80 dark:gray-700/60 bg-white/70 dark:bg-gray-900/70 backdrop-blur-sm relative z-20">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="text-sm text-gray-600 dark:text-gray-400 text-center sm:text-left">
                {data && (
                  <div className="flex items-center justify-center sm:justify-start gap-2">
                    <div className="bg-blue-50 dark:bg-blue-900/30 px-3 py-1 rounded-full">
                      <span className="text-blue-700 dark:text-blue-300 font-medium">
                        {((page - 1) * limit) + 1} - {Math.min(page * limit, data.total)}
                      </span>
                    </div>
                    <span>de</span>
                    <div className="bg-gray-100 dark:bg-gray-800 px-3 py-1 rounded-full">
                      <span className="text-gray-700 dark:text-gray-300 font-medium">{data.total}</span>
                    </div>
                    <span className="hidden sm:inline">produtos</span>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600 dark:text-gray-400 whitespace-nowrap">Itens por página:</span>
                <select
                  value={itemsPerPage}
                  onChange={(e) => handleItemsPerPageChange(Number(e.target.value))}
                  className="px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                  <option value={200}>200</option>
                </select>
              </div>
            </div>

            <div className="flex items-center justify-center sm:justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(page - 1)}
                disabled={page <= 1}
                className="bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
              >
                <ChevronLeft className="h-4 w-4 md:mr-1" />
                <span className="hidden md:inline">Anterior</span>
              </Button>

              {/* Page numbers */}
              <div className="flex items-center gap-1">
                {[...Array(Math.min(totalPages, 5))].map((_, i) => {
                  const pageNum = i + 1;
                  return (
                    <Button
                      key={pageNum}
                      variant={page === pageNum ? "default" : "outline"}
                      size="sm"
                      onClick={() => setPage(pageNum)}
                      className={`w-10 h-10 p-0 transition-all duration-200 ${
                        page === pageNum 
                          ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-md border-blue-600' 
                          : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
                      }`}
                    >
                      {pageNum}
                    </Button>
                  );
                })}
                {totalPages > 5 && (
                  <>
                    <span className="px-2 text-gray-400 dark:text-gray-500 text-sm">...</span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(totalPages)}
                      className="w-10 h-10 p-0 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-200"
                    >
                      {totalPages}
                    </Button>
                  </>
                )}
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(page + 1)}
                disabled={page >= totalPages}
                className="bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
              >
                <span className="hidden md:inline">Próximo</span>
                <ChevronRight className="h-4 w-4 md:ml-1" />
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
    </TooltipProvider>
  );
}

// Removed getColorClass function - now using getColorInfo from color-mapping