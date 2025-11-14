import { useState, useMemo, useEffect, useCallback, memo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { getAuthHeaders } from "@/lib/auth-api";
import { usePriceMonitoring } from "@/hooks/use-price-monitoring";
import { usePriceMonitorStore } from "@/stores/price-monitor";
import { getColorInfo } from "@/lib/color-mapping";
import { DollarSign, ChevronLeft, ChevronRight, ArrowUpDown, ArrowUp, ArrowDown, CheckCircle, Lock, Database } from "lucide-react";
import { CategoryIcon } from "@/lib/category-icons";
import { SubscriptionPlan, canUserAccessFeature } from "@shared/subscription";
import { FavoriteButton } from "@/components/FavoriteButton";
import { SimplePriceCell } from "@/components/PriceCell";
import { MiniPriceSparkline } from "@/components/PriceSparkline";
import { useDebounce } from "@/hooks/use-debounce";
import { formatPrice } from "@/lib/formatters";
import { WhatsAppButton } from "@/components/WhatsAppButton";
import { calculateLowestPricesInProducts } from "@/utils/productHelpers";

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
  supplierWhatsapp?: string;
  supplier: {
    id: number;
    name: string;
  };
}

interface PaginatedProducts {
  products: Product[];
  total: number;
  page: number;
  limit: number;
}

interface CompactProductTableProps {
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
  };
  onSearchChange?: (search: string) => void; // Optional callback for parent components
  userPlan?: SubscriptionPlan;
  isAdmin?: boolean;
  role?: string;
  limit?: number; // Items per page
}

const CompactProductTableInner = ({ filters, onSearchChange, userPlan = 'free', isAdmin, role, limit = 20 }: CompactProductTableProps) => {
  // 1. Todos os hooks de estado primeiro
  const [page, setPage] = useState(1);
  const [sortField, setSortField] = useState<string>('');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [searchTerm, setSearchTerm] = useState('');

  // 2. Hooks de efeito após declaração dos estados
  // Sync initial search term from filters (apenas na inicialização)
  useEffect(() => {
    if (filters.search && filters.search !== searchTerm) {
      setSearchTerm(filters.search);
    }
  }, [filters.search]); // Removido searchTerm da dependência

  // Notify parent of search changes (sem causar loops)
  useEffect(() => {
    if (onSearchChange && searchTerm !== filters.search) {
      onSearchChange(searchTerm);
    }
  }, [searchTerm, onSearchChange]);

  const queryClient = useQueryClient();
  const { priceHistory, getProductKey, markDropAsViewed, getPricePoints } = usePriceMonitorStore();

  // Debounce search term to avoid excessive re-renders
  const debouncedSearchTerm = useDebounce(searchTerm, 200);

  // Base query without search filter - fetch all products once
  const { search, ...baseFilters } = filters; // Remove search from API filters

  const { data: baseData, isLoading, error } = useQuery<PaginatedProducts>({
    queryKey: ['/api/products/base', { page: 1, limit: 10000, ...baseFilters, sortField, sortDirection }],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set('page', '1');
      params.set('limit', '10000'); // Get all products for client-side filtering
      if (sortField) {
        params.set('sortField', sortField);
        params.set('sortDirection', sortDirection);
      }

      if (filters.date) params.set('date', filters.date);
      if (filters.storage && filters.storage !== 'all') params.set('storage', filters.storage);
      if (filters.color && filters.color !== 'all') params.set('color', filters.color);
      if (filters.category && filters.category !== 'all') params.set('category', filters.category);
      if (filters.capacity && filters.capacity !== 'all') params.set('capacity', filters.capacity);
      if (filters.region && filters.region !== 'all') params.set('region', filters.region);

      if (filters.supplierIds && filters.supplierIds.length > 0) {
        filters.supplierIds.forEach(id => params.append('supplierIds', id));
      } else if (filters.supplierId && filters.supplierId !== 'all') {
        params.set('supplierId', filters.supplierId);
      }

      const headers = await getAuthHeaders();
      const res = await fetch(`/api/products?${params}`, { headers });
      if (!res.ok) throw new Error("Failed to load products");
      return await res.json();
    },
    refetchInterval: false,
    staleTime: 5 * 60 * 1000,
    placeholderData: (previousData) => previousData,
  });

  // Client-side filtering based on search term - pure memory filtering
  const filteredData = useMemo(() => {
    if (!baseData) {
      return null;
    }

    // Se não há termo de busca, retorna todos os dados
    let filteredProducts = baseData.products;
    if (debouncedSearchTerm.trim()) {
      // Filtragem puramente em memória - sem tocar na API
      const searchLower = debouncedSearchTerm.toLowerCase().trim();
      filteredProducts = baseData.products.filter(product => 
        product.model.toLowerCase().includes(searchLower) ||
        product.brand?.toLowerCase().includes(searchLower) ||
        product.color.toLowerCase().includes(searchLower) ||
        product.storage.toLowerCase().includes(searchLower) ||
        product.supplier.name.toLowerCase().includes(searchLower)
      );
    }

    // Recalcular dinamicamente o menor preço após filtragem 
    filteredProducts = calculateLowestPricesInProducts(filteredProducts);

    return {
      ...baseData,
      products: filteredProducts,
      total: filteredProducts.length
    };
  }, [baseData, debouncedSearchTerm]);

  // Paginate filtered results
  const paginated = useMemo(() => {
    if (!filteredData) return [];

    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    return filteredData.products.slice(startIndex, endIndex);
  }, [filteredData, page, limit]);

  const paginatedData = useMemo(() => {
    if (!filteredData) return null;

    return {
      ...filteredData,
      products: paginated,
      page,
      limit
    };
  }, [filteredData, paginated, page, limit]);

  usePriceMonitoring(paginatedData?.products || []);

  const handleSort = useCallback((field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
    setPage(1);
  }, [sortDirection, sortField]);



  const SortButton = ({ field, children }: { field: string; children: React.ReactNode }) => (
    <button 
      type="button"
      className="group flex items-center space-x-1 hover:text-foreground transition-colors text-muted-foreground" 
      onClick={(e) => {
        e.preventDefault();
        handleSort(field);
      }}
    >
      <span>{children}</span>
      {sortField === field ? (
        sortDirection === 'asc' ? (
          <ArrowUp className="h-3 w-3 text-primary" />
        ) : (
          <ArrowDown className="h-3 w-3 text-primary" />
        )
      ) : (
        <ArrowUpDown className="h-3 w-3 opacity-50 group-hover:opacity-100 transition-opacity" />
      )}
    </button>
  );

  if (error) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <div className="text-red-600 mb-2">
            <i className="fas fa-exclamation-circle text-2xl"></i>
          </div>
          <p className="text-slate-900 font-medium">Erro ao carregar produtos</p>
          <p className="text-slate-600 text-sm">Verifique sua conexão e tente novamente</p>
          <Button 
            className="mt-4" 
            onClick={() => queryClient.invalidateQueries({ queryKey: ['/api/products'] })}
          >
            Tentar novamente
          </Button>
        </CardContent>
      </Card>
    );
  }

  const totalPages = filteredData ? Math.ceil(filteredData.total / limit) : 0;

  return (
    <Card className="shadow-lg border-0 bg-gradient-to-br from-white to-gray-50/50 dark:from-gray-900 dark:to-gray-800/50">
      <CardContent className="p-0">
        {/* Header */}
        <div className="px-6 py-5 border-b border-gray-200/80 dark:border-gray-700/60 bg-white/80 dark:bg-gray-900/80">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="h-8 w-1 bg-gradient-to-b from-blue-500 to-purple-600 rounded-full"></div>
              <div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">Painel de Cotações</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">Tabela compacta com preços em tempo real</p>
              </div>
            </div>
            {filteredData && (
              <div className="bg-gray-100 dark:bg-gray-800 px-4 py-2 rounded-full">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  <span className="text-blue-600 dark:text-blue-400 font-bold">{((page - 1) * limit) + 1}</span> a{' '}
                  <span className="text-blue-600 dark:text-blue-400 font-bold">{Math.min(page * limit, filteredData.total)}</span> de{' '}
                  <span className="text-blue-600 dark:text-blue-400 font-bold">{filteredData.total}</span>
                  {debouncedSearchTerm && baseData && (
                    <span className="text-xs text-gray-500 ml-2">
                      (filtrado de {baseData.total})
                    </span>
                  )}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Modern Table */}
        <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200/50 dark:border-gray-700/50 overflow-hidden max-h-[70vh] overflow-y-auto">
          {/* Sticky Header */}
          <div className="sticky top-0 z-30 bg-white dark:bg-gray-900 border-b border-gray-200/80 dark:border-gray-700/60 shadow-sm"></div>

          {/* Scrollable Body */}
          <div className="max-h-96 overflow-y-auto">
            {isLoading ? (
              <div className="divide-y divide-gray-100 dark:divide-gray-700/50">
                {[...Array(limit)].map((_, i) => (
                  <div key={i} className="grid grid-cols-12 gap-3 px-6 py-5 hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-colors items-center">
                    <div className="col-span-1 flex justify-center"><Skeleton className="h-8 w-8 rounded-lg" /></div>
                    <div className="col-span-2 flex justify-center"><Skeleton className="h-6 w-16 rounded-full" /></div>
                    <div className="col-span-3"><Skeleton className="h-5 w-full rounded-md" /></div>
                    <div className="col-span-1 flex justify-center"><Skeleton className="h-5 w-5 rounded-full" /></div>
                    <div className="col-span-1 flex justify-center"><Skeleton className="h-6 w-12 rounded-md" /></div>
                    <div className="col-span-2 flex justify-end"><Skeleton className="h-6 w-20 rounded-md" /></div>
                    <div className="col-span-1 flex justify-center"><Skeleton className="h-5 w-10 rounded-full" /></div>
                    <div className="col-span-1"><Skeleton className="h-5 w-16 rounded-md" /></div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="divide-y divide-gray-100/60 dark:divide-gray-700/40">
                {paginated.map((product, index) => (
                  <tr 
                    key={product.id} 
                    className={`transition-all duration-200 rounded-lg mx-1 my-0.5 group ${
                      index % 2 === 0 
                        ? 'bg-white dark:bg-gray-800' 
                        : 'bg-gray-50 dark:bg-gray-750'
                    } hover:bg-blue-50/80 dark:hover:bg-blue-900/30 hover:shadow-sm hover:scale-[1.005] hover:-translate-y-0.5`}
                  >
                    {/* Category Icon */}
                    <div className="col-span-1 flex justify-center items-center">
                      <div className="relative p-2 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/40 dark:to-blue-800/40 rounded-xl group-hover:from-blue-100 group-hover:to-blue-200 dark:group-hover:from-blue-800/60 dark:group-hover:to-blue-700/60 transition-all duration-300 shadow-sm">
                        <CategoryIcon 
                          category={product.category} 
                          size="h-5 w-5" 
                          showTooltip={true}
                        />
                      </div>
                    </div>

                    {/* Category Badge */}
                    <div className="col-span-2 flex justify-center items-center">
                      <div className="flex items-center gap-2">
                        <CategoryIcon 
                          category={product.category} 
                          size="h-4 w-4" 
                          showTooltip={false}
                        />
                        <span className={`px-2 py-1 rounded-full text-xs font-medium border ${
                          product.category === 'IPH' ? 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/50 dark:text-blue-200 dark:border-blue-700' :
                          product.category === 'IPAD' ? 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/50 dark:text-green-200 dark:border-green-700' :
                          product.category === 'MCB' ? 'bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-900/50 dark:text-purple-200 dark:border-purple-700' :
                          product.category === 'RLG' ? 'bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-900/50 dark:text-orange-200 dark:border-orange-700' :
                          product.category === 'PODS' ? 'bg-pink-100 text-pink-800 border-pink-200 dark:bg-pink-900/50 dark:text-pink-200 dark:border-pink-700' :
                          product.category === 'ACSS' ? 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/50 dark:text-amber-200 dark:border-amber-700' :
                          'bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-700/50 dark:text-gray-300 dark:border-gray-600'
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
                    </div>

                    {/* Product */}
                    <div className="col-span-3 flex flex-col justify-center space-y-1">
                      <h4 className="font-medium text-gray-900 dark:text-white text-sm truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                        {product.model}
                      </h4>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        ID: {product.id}
                      </p>
                    </div>

                    {/* Color */}
                    <div className="col-span-1 flex justify-center items-center">
                      <div className="inline-flex items-center gap-2 bg-white dark:bg-gray-800 rounded-lg px-3 py-2 shadow-sm border border-gray-200/50 dark:border-gray-700/50 group-hover:shadow-md transition-all">
                        <div 
                          className="w-4 h-4 rounded-full border-2 border-white dark:border-gray-700 shadow-sm flex-shrink-0"
                          style={{ backgroundColor: getColorInfo(product.color).hex }}
                        ></div>
                        <span className="text-xs font-medium text-gray-700 dark:text-gray-300 truncate">
                          {product.color}
                        </span>
                      </div>
                    </div>

                    {/* Storage */}
                    <div className="col-span-1 flex justify-center items-center">
                      <div className="inline-flex items-center bg-gradient-to-r from-emerald-100 to-emerald-200 dark:from-emerald-900/50 dark:to-emerald-800/50 px-3 py-2 rounded-lg text-xs font-bold text-emerald-800 dark:text-emerald-200 shadow-sm border border-emerald-200/50 dark:border-emerald-700/50">
                        <Database className="w-3 h-3 mr-1" />
                        {product.storage}
                      </div>
                    </div>

                    {/* Price */}
                    <div className="col-span-2 flex justify-end items-center">
                      <div className="flex items-center gap-3 bg-white dark:bg-gray-800 rounded-xl px-4 py-3 shadow-sm border border-gray-200/50 dark:border-gray-700/50 group-hover:shadow-md transition-all">
                        <div className="flex flex-col items-end">
                          <SimplePriceCell 
                            price={product.price}
                            className={`text-lg font-bold ${product.isLowestPrice ? 'text-green-600 dark:text-green-400' : 'text-gray-900 dark:text-white'}`}
                          />
                          {product.isLowestPrice && (
                            <span className="text-xs text-green-600 dark:text-green-400 font-medium">
                              Melhor preço
                            </span>
                          )}
                        </div>
                        <MiniPriceSparkline
                          priceHistory={getPricePoints(getProductKey(product))}
                          currentPrice={parseFloat(product.price)}
                          className="opacity-60 hover:opacity-100 transition-opacity"
                        />
                      </div>
                    </div>

                    {/* Variation */}
                    <div className="col-span-1 flex justify-center items-center">
                      <div className="flex flex-col items-center gap-0.5">
                        {product.isLowestPrice && (
                          <span className="inline-flex items-center px-1 py-0.5 rounded-full text-xs font-bold bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300">
                            <CheckCircle className="w-2 h-2 mr-0.5" />
                            ↓
                          </span>
                        )}

                        {(() => {
                          const productKey = getProductKey(product);
                          const history = priceHistory[productKey];
                          return history?.hasPriceDrop && (
                            <span 
                              className="inline-flex items-center px-1 py-0.5 rounded-full text-xs font-bold bg-orange-100 dark:bg-orange-900/50 text-orange-700 dark:text-orange-300 cursor-pointer hover:bg-orange-200 dark:hover:bg-orange-800/50 transition-colors"
                              onClick={() => markDropAsViewed(productKey)}
                              title={`Novo menor preço! De R$ ${history.previousPrice?.toFixed(2)} para R$ ${history.currentPrice.toFixed(2)}`}
                            >
                              <DollarSign className="w-2 h-2 mr-0.5" />
                              $
                            </span>
                          );
                        })()}
                      </div>
                    </div>

                    {/* Supplier */}
                    <div className="col-span-1 flex items-center gap-1">
                      {canUserAccessFeature(userPlan, 'canViewSuppliers', isAdmin, role) || 
                       role === 'pro' || role === 'admin' || role === 'superadmin' || isAdmin ? (
                        <>
                          <div className="bg-purple-100 dark:bg-purple-900/50 px-2 py-1 rounded">
                            <span className="text-xs font-medium text-purple-800 dark:text-purple-200 truncate block">
                              {product.supplier.name.slice(0, 8)}
                            </span>
                          </div>
                          {product.supplierWhatsapp && (
                            <WhatsAppButton
                              whatsappNumber={product.supplierWhatsapp}
                              supplierName={product.supplier.name}
                              size="sm"
                            />
                          )}
                        </>
                      ) : (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="bg-gray-100 dark:bg-gray-700/50 px-2 py-1 rounded cursor-help inline-block">
                              <Lock className="h-3 w-3 text-gray-500" />
                            </div>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Atualize seu plano para ver os fornecedores</p>
                          </TooltipContent>
                        </Tooltip>
                      )}
                    </div>

                    {/* Status/Favorites */}
                    <div className="col-span-1 flex justify-center items-center">
                      <FavoriteButton 
                        type="product" 
                        itemId={product.id.toString()} 
                        metadata={{ model: product.model, supplier: product.supplier.name }}
                        size="sm"
                      />
                    </div>
                  </tr>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Modern Pagination */}
        <div className="px-6 py-5 border-t border-gray-200/80 dark:border-gray-700/60 bg-gradient-to-r from-gray-50/50 to-white dark:from-gray-900/50 dark:to-gray-900 backdrop-blur-sm">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="text-sm text-gray-600 dark:text-gray-400">
              {filteredData && (
                <div className="flex items-center gap-3">
                  <div className="bg-gradient-to-r from-blue-100 to-blue-200 dark:from-blue-900/40 dark:to-blue-800/40 px-4 py-2 rounded-xl shadow-sm border border-blue-200/50 dark:border-blue-700/50">
                    <span className="text-blue-800 dark:text-blue-200 font-semibold tracking-wide">
                      {((page - 1) * limit) + 1} - {Math.min(page * limit, filteredData.total)}
                    </span>
                  </div>
                  <span className="text-gray-500 dark:text-gray-400 font-medium">de</span>
                  <div className="bg-gradient-to-r from-gray-100 to-gray-200 dark:from-gray-700/50 dark:to-gray-600/50 px-4 py-2 rounded-xl shadow-sm border border-gray-200/50 dark:border-gray-700/50">
                    <span className="text-gray-700 dark:text-gray-300 font-semibold">{filteredData.total}</span>
                  </div>
                  {debouncedSearchTerm && baseData && (
                    <div className="bg-gradient-to-r from-emerald-100 to-emerald-200 dark:from-emerald-900/40 dark:to-emerald-800/40 px-4 py-2 rounded-xl shadow-sm border border-emerald-200/50 dark:border-emerald-700/50">
                      <span className="text-emerald-800 dark:text-emerald-200 text-sm font-semibold">
                        Filtrados
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(page - 1)}
                disabled={page <= 1}
                className="h-10 px-4 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:border-blue-300 dark:hover:border-blue-600 transition-all duration-300 shadow-sm"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>

              <div className="flex items-center gap-2">
                {[...Array(Math.min(totalPages, 5))].map((_, i) => {
                  const pageNum = i + 1;
                  return (
                    <Button
                      key={pageNum}
                      variant={page === pageNum ? "default" : "outline"}
                      size="sm"
                      onClick={() => setPage(pageNum)}
                      className={`w-10 h-10 p-0 transition-all duration-300 shadow-sm ${
                        page === pageNum
                          ? 'bg-blue-600 hover:bg-blue-700 border-blue-600 text-white shadow-md'
                          : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:border-blue-300 dark:hover:border-blue-600'
                      }`}
                    >
                      {pageNum}
                    </Button>
                  );
                })}
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(page + 1)}
                disabled={page >= totalPages}
                className="h-10 px-4 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:border-blue-300 dark:hover:border-blue-600 transition-all duration-300 shadow-sm"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// Memoized export to prevent unnecessary re-renders
export const CompactProductTable = memo(CompactProductTableInner);