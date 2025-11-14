import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { getAuthHeaders } from "@/lib/auth-api";
import { Building, Search, Eye, Calendar, Package, Lock, Crown, ChevronDown, ChevronUp, TrendingDown } from "lucide-react";
import { useState, useMemo } from "react";
import { SupplierProductsModal } from "./supplier-products-modal";
import { SubscriptionPlan, canUserAccessFeature } from "@shared/subscription";
import { WhatsAppButton } from "@/components/WhatsAppButton";

interface Supplier {
  id: number;
  name: string;
  active: boolean;
  createdAt: string;
  productCount?: number;
}

interface Product {
  id: number;
  model: string;
  price: number;
  storage?: string;
  color?: string;
  region?: string;
  category?: string;
  supplier: {
    id: number;
    name: string;
  };
  isLowestPrice?: boolean;
}

interface SuppliersModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dateFilter?: string;
  onViewSupplierProducts?: (supplierId: number, supplierName: string) => void;
  userPlan?: SubscriptionPlan;
  isAdmin?: boolean;
  role?: string;
}

export function SuppliersModal({ 
  open, 
  onOpenChange, 
  dateFilter,
  onViewSupplierProducts,
  userPlan = 'free',
  isAdmin = false,
  role = ''
}: SuppliersModalProps) {

  // Debug log to track dateFilter prop
  console.log('🏪 SuppliersModal - Props received:', { 
    open, 
    dateFilter, 
    userPlan, 
    isAdmin, 
    role 
  });

  // All hooks must be declared at the top level, unconditionally
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSupplier, setSelectedSupplier] = useState<{id: number, name: string} | null>(null);
  const [showProductsModal, setShowProductsModal] = useState(false);
  const [expandedSuppliers, setExpandedSuppliers] = useState<Set<number>>(new Set());

  // Fetch suppliers data
  const { data: suppliersData, isLoading, error, refetch } = useQuery({
    queryKey: ['/api/suppliers', dateFilter],
    queryFn: async () => {
      console.log('🔍 Fetching suppliers with date filter:', dateFilter);
      const headers = await getAuthHeaders();

      // CRÍTICO: Sempre usar dateFilter para garantir que fornecedores venham da planilha do dia atual
      const params = new URLSearchParams();
      if (dateFilter && dateFilter !== 'all') {
        params.set('dateFilter', dateFilter);
        console.log('🏪 SuppliersModal - Using provided dateFilter:', dateFilter);
      } else {
        // Se não há dateFilter específico, usar a data mais recente disponível
        params.set('dateFilter', '01-07');
        console.log('🏪 SuppliersModal - Using fallback dateFilter: 01-07');
      }

      console.log('🏪 SuppliersModal - Requesting suppliers from sheet:', dateFilter || '01-07');

      const response = await fetch(`/api/suppliers?${params.toString()}`, {
        headers
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Failed to fetch suppliers: ${response.status}`, errorText);
        throw new Error(`Failed to fetch suppliers: ${response.status}`);
      }

      const data = await response.json();
      console.log('📦 Suppliers data received for date:', data.dateFilter, 'suppliers:', data.suppliers?.length);

      // Ensure we return the suppliers array
      return {
        suppliers: data.suppliers || [],
        totalCount: data.totalCount || 0,
        dateFilter: data.dateFilter
      };
    },
    enabled: open,
    refetchInterval: 30000,
    // Forçar refetch quando dateFilter muda
    refetchOnWindowFocus: true,
  });

  // Fetch all products to filter by supplier for expanded sections
  const { data: allProductsData } = useQuery({
    queryKey: ['/api/products', dateFilter, 'for-suppliers'],
    queryFn: async () => {
      if (expandedSuppliers.size === 0) return { products: [] };

      const headers = await getAuthHeaders();
      const params = new URLSearchParams();
      params.set('page', '1');
      params.set('limit', '5000');

      // Garantir que usamos exatamente a mesma data dos fornecedores
      const finalDateFilter = dateFilter || suppliersData?.dateFilter || '01-07';
      params.set('dateFilter', finalDateFilter);
      params.set('date', finalDateFilter);

      console.log('🏪 SuppliersModal - Fetching products for expansion with consistent date:', finalDateFilter);

      const response = await fetch(`/api/products?${params.toString()}`, {
        headers
      });

      if (!response.ok) {
        throw new Error('Failed to fetch products');
      }

      const data = await response.json();
      console.log('🏪 Products for suppliers expansion from date:', data.dateFilter, 'products:', data.products?.length);
      return data;
    },
    enabled: open && expandedSuppliers.size > 0,
    refetchInterval: 30000,
  });

  // Derived values
  // Process suppliers data from API
  const allSuppliers = suppliersData?.suppliers || [];

  // Create supplier products mapping from all products
  const supplierProductsData = useMemo(() => {
    if (!allProductsData?.products || expandedSuppliers.size === 0) return {};

    const productsData: Record<number, Product[]> = {};
    const allSupplierNames = allSuppliers?.reduce((acc: Record<number, string>, supplier: Supplier) => {
      acc[supplier.id] = supplier.name;
      return acc;
    }, {}) || {};

    console.log('🏪 Processing supplier products mapping for expanded suppliers:', Array.from(expandedSuppliers));

    // First, create a global lowest prices map for accurate comparison
    const globalLowestPrices = new Map<string, number>();

    // Group ALL products globally by model+storage+color combination for precise matching
    const globalProductGroups = new Map<string, Product[]>();

    allProductsData.products.forEach((product: Product) => {
      // Use model+storage+color as key for precise grouping (same as in other modals)
      const key = `${product.model}-${product.storage || ''}-${product.color || ''}`.toLowerCase().trim();
      if (key && product.model) {
        if (!globalProductGroups.has(key)) {
          globalProductGroups.set(key, []);
        }
        globalProductGroups.get(key)!.push(product);
      }
    });

    // Calculate global lowest prices for each product variant
    globalProductGroups.forEach((products, variantKey) => {
      const prices = products.map(p => parseFloat(p.price?.toString().replace(/[^\d.-]/g, '') || '0')).filter(p => p > 0);
      if (prices.length > 0) {
        const lowestPrice = Math.min(...prices);
        globalLowestPrices.set(variantKey, lowestPrice);
      }
    });

    console.log('🏪 SuppliersModal - Global lowest prices calculated:', globalLowestPrices.size, 'unique product variants');

    // Now group products by supplier
    allProductsData.products.forEach((product: Product) => {
      // Extract supplier name from different possible sources
      let supplierName = '';
      if (product.supplierName) {
        supplierName = product.supplierName;
      } else if (typeof product.supplier === 'string') {
        supplierName = product.supplier;
      } else if (product.supplier && typeof product.supplier === 'object') {
        supplierName = product.supplier.name || '';
      } else if (product.brand) {
        supplierName = product.brand;
      }

      // Create a stable hash function for supplier IDs (consistent with backend)
      const generateSupplierId = (name: string): number => {
        let hash = 0;
        for (let i = 0; i < name.length; i++) {
          const char = name.charCodeAt(i);
          hash = ((hash << 5) - hash) + char;
          hash = hash & hash; // Convert to 32bit integer
        }
        return Math.abs(hash);
      };

      const supplierNumericId = generateSupplierId(supplierName);

      // Check if this supplier is expanded and matches our consistent ID
      if (expandedSuppliers.has(supplierNumericId)) {
        if (!productsData[supplierNumericId]) {
          productsData[supplierNumericId] = [];
        }
        productsData[supplierNumericId].push(product);
      }
    });

    // Process each supplier's products with global lowest price comparison
    Object.keys(productsData).forEach(supplierId => {
      const id = parseInt(supplierId);
      const supplierProducts = productsData[id];

      // Filter to show ONLY products that have global lowest prices
      const lowestPriceProducts: Product[] = [];

      supplierProducts.forEach(product => {
        const variantKey = `${product.model}-${product.storage || ''}-${product.color || ''}`.toLowerCase().trim();
        const globalLowestPrice = globalLowestPrices.get(variantKey) || 0;
        const productPrice = parseFloat(product.price?.toString().replace(/[^\d.-]/g, '') || '0');

        // Only include products that have the global lowest price for their variant
        const isGlobalLowestPrice = globalLowestPrice > 0 && Math.abs(productPrice - globalLowestPrice) < 0.01;

        if (isGlobalLowestPrice) {
          lowestPriceProducts.push({
            ...product,
            isLowestPrice: true
          });
        }
      });

      // Sort by price ascending and limit to 15 products
      productsData[id] = lowestPriceProducts
        .sort((a, b) => {
          const priceA = parseFloat(a.price?.toString().replace(/[^\d.-]/g, '') || '0');
          const priceB = parseFloat(b.price?.toString().replace(/[^\d.-]/g, '') || '0');
          return priceA - priceB;
        })
        .slice(0, 15);

      console.log(`🏪 Supplier ${allSupplierNames[id]}: ${productsData[id].length} products with GLOBAL lowest prices (filtered from ${supplierProducts.length} total)`);
    });

    return productsData;
  }, [allProductsData, expandedSuppliers, allSuppliers]);
  const totalSuppliersCount = suppliersData?.totalCount || suppliersData?.suppliers?.length || allSuppliers.length;

  console.log('🏪 SuppliersModal - Data state:', {
    suppliersDataExists: !!suppliersData,
    suppliersCount: allSuppliers.length,
    totalCount: totalSuppliersCount,
    hasApiData: !!suppliersData?.suppliers
  });

  const filteredSuppliers = allSuppliers?.filter((supplier: Supplier) =>
    supplier.name.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  // All authenticated users have full access (PRO, ADMIN, SUPERADMIN only)
  const hasFullAccess = true;



  // Helper functions
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const formatPrice = (price: number) => {
    return `R$ ${price.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const toggleSupplierExpansion = (supplierId: number) => {
    const newExpanded = new Set(expandedSuppliers);
    if (newExpanded.has(supplierId)) {
      newExpanded.delete(supplierId);
    } else {
      newExpanded.add(supplierId);
    }
    setExpandedSuppliers(newExpanded);
  };

  const handleBackToSuppliers = () => {
    setShowProductsModal(false);
    setSelectedSupplier(null);
  };

  const handleViewProducts = (supplier: Supplier) => {
    console.log('handleViewProducts clicked for supplier:', supplier.name, 'ID:', supplier.id);
    console.log('Setting selectedSupplier and opening products modal');
    setSelectedSupplier({ id: supplier.id, name: supplier.name });
    setShowProductsModal(true);
  };

  // Render nothing if modal is not open
  if (!open) {
    return null;
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building className="h-5 w-5" />
              Lista de Fornecedores
              {allSuppliers && (
                <Badge variant="secondary" className="ml-2">
                  {filteredSuppliers.length} de {allSuppliers.length}
                </Badge>
              )}
            </DialogTitle>
            <DialogDescription>
              Visualize todos os fornecedores disponíveis e seus produtos
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-4 flex-1 min-h-0">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar fornecedor..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto">
              {error ? (
                <div className="text-center py-8 text-red-600">
                  <Building className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>Erro ao carregar fornecedores</p>
                  <p className="text-sm text-muted-foreground mt-2">
                    {error instanceof Error ? error.message : 'Erro desconhecido'}
                  </p>
                </div>
              ) : isLoading ? (
                <div className="space-y-3">
                  {[...Array(6)].map((_, i) => (
                    <div key={i} className="border rounded-lg p-4 animate-pulse">
                      <div className="flex items-center justify-between">
                        <div className="space-y-2 flex-1">
                          <div className="h-4 bg-muted rounded w-1/3"></div>
                          <div className="h-3 bg-muted rounded w-1/4"></div>
                        </div>
                        <div className="h-8 bg-muted rounded w-20"></div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : filteredSuppliers.length > 0 ? (
                <div className="space-y-3">
                  {filteredSuppliers.map((supplier: Supplier) => {
                    const isExpanded = expandedSuppliers.has(supplier.id);
                    const supplierProducts = supplierProductsData?.[supplier.id] || [];

                    return (
                      <Collapsible
                        key={supplier.id}
                        open={isExpanded}
                        onOpenChange={() => toggleSupplierExpansion(supplier.id)}
                      >
                        <div className="border rounded-lg overflow-hidden">
                          <CollapsibleTrigger asChild>
                            <div className="p-4 hover:bg-muted/50 transition-colors cursor-pointer">
                              <div className="flex items-center justify-between">
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-2">
                                    <Building className="w-4 h-4 text-blue-600" />
                                    <h3 className="font-semibold text-sm truncate">
                                      {supplier.name}
                                    </h3>
                                    <Badge 
                                      variant={supplier.active ? "default" : "secondary"} 
                                      className="text-xs"
                                      withWhatsAppIcon={supplier.active}
                                    >
                                      {supplier.active ? "Ativo" : "Inativo"}
                                    </Badge>
                                  </div>

                                  <div className="text-xs text-muted-foreground space-y-1">
                                    <div className="flex items-center gap-1">
                                      <Package className="w-3 h-3" />
                                      <span>{supplier.productCount || 0} produtos disponíveis</span>
                                    </div>


                                  </div>
                                </div>

                                <div className="flex items-center gap-2">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleViewProducts(supplier);
                                    }}
                                    className="text-xs hover:bg-blue-50 hover:text-blue-700 hover:border-blue-300"
                                  >
                                    <Eye className="w-3 h-3 mr-1" />
                                    Ver Todos
                                  </Button>
                                </div>
                              </div>
                            </div>
                          </CollapsibleTrigger>

                          <CollapsibleContent>
                            <div className="border-t bg-muted/30 p-4">
                              <div className="flex items-center gap-2 mb-3">
                                <TrendingDown className="w-4 h-4 text-green-600" />
                                <h4 className="font-medium text-sm text-green-700">Melhores Preços</h4>
                                {supplierProducts.length > 0 && (
                                  <Badge variant="default" className="text-xs bg-green-500">
                                    {supplierProducts.length} produtos
                                  </Badge>
                                )}
                              </div>

                              {supplierProducts.length > 0 ? (
                                <div className="space-y-2 max-h-60 overflow-y-auto">
                                  {/* Debug info for development */}
                                  {process.env.NODE_ENV === 'development' && (
                                    <div className="text-xs text-gray-500 mb-2">
                                      Debug: {supplierProducts.filter(p => p.isLowestPrice).length} produtos com menor preço de {supplierProducts.length} total
                                    </div>
                                  )}
                                  {supplierProducts.map((product: Product) => (
                                    <div 
                                      key={`${product.model}-${product.storage}-${product.color}`}
                                      className="bg-white rounded-lg p-3 border flex items-center justify-between hover:shadow-sm transition-shadow"
                                    >
                                      <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                          <h5 className="font-medium text-sm truncate text-gray-900">
                                            {product.model}
                                          </h5>
                                          {product.isLowestPrice && (
                                            <Badge variant="default" className="text-xs bg-green-500 text-white">
                                              Menor Preço
                                            </Badge>
                                          )}
                                        </div>

                                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                          {product.storage && (
                                            <span className="bg-gray-100 px-2 py-1 rounded">
                                              {product.storage}
                                            </span>
                                          )}
                                          {product.color && (
                                            <span className="bg-gray-100 px-2 py-1 rounded">
                                              {product.color}
                                            </span>
                                          )}
                                          {product.region && (
                                            <span className="text-blue-600">
                                              {product.region}
                                            </span>
                                          )}
                                        </div>
                                      </div>

                                      <div className="text-right flex-shrink-0 ml-4">
                                        <p className="text-lg font-bold text-green-600">
                                          {formatPrice(product.price)}
                                        </p>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              ) : isExpanded ? (
                                <div className="text-center py-4 text-muted-foreground">
                                  <Package className="w-8 h-8 mx-auto mb-2 opacity-50" />
                                  <p className="text-sm">Carregando produtos...</p>
                                </div>
                              ) : null}
                            </div>
                          </CollapsibleContent>
                        </div>
                      </Collapsible>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Building className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>
                    {searchTerm 
                      ? `Nenhum fornecedor encontrado para "${searchTerm}"`
                      : "Nenhum fornecedor encontrado"
                    }
                  </p>
                </div>
              )}
            </div>

            {/* Summary Stats */}
            <div className="pt-4 border-t">
              <div className="grid grid-cols-4 gap-4 text-center">
                <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600 font-mono">{filteredSuppliers.length}</div>
                  <div className="text-xs text-blue-700 dark:text-blue-300 uppercase tracking-wide font-medium">
                    Total Disponível
                  </div>
                </div>
                <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded-lg">
                  <div className="text-2xl font-bold text-green-600 font-mono">
                    {filteredSuppliers.filter((s: Supplier) => s.active).length}
                  </div>
                  <div className="text-xs text-green-700 dark:text-green-300 uppercase tracking-wide font-medium">Ativos</div>
                </div>
                <div className="bg-red-50 dark:bg-red-900/20 p-3 rounded-lg">
                  <div className="text-2xl font-bold text-red-600 font-mono">
                    {filteredSuppliers.filter((s: Supplier) => !s.active).length}
                  </div>
                  <div className="text-xs text-red-700 dark:text-red-300 uppercase tracking-wide font-medium">Inativos</div>
                </div>
                <div className="bg-purple-50 dark:bg-purple-900/20 p-3 rounded-lg">
                  <div className="text-2xl font-bold text-purple-600 font-mono">
                    {filteredSuppliers.reduce((acc: number, s: Supplier) => acc + (s.productCount || 0), 0).toLocaleString('pt-BR')}
                  </div>
                  <div className="text-xs text-purple-700 dark:text-purple-300 uppercase tracking-wide font-medium">Produtos Total</div>
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Supplier Products Modal */}
      {selectedSupplier && (
        <SupplierProductsModal
          open={showProductsModal}
          onOpenChange={setShowProductsModal}
          supplierId={selectedSupplier.id}
          supplierName={selectedSupplier.name}
          dateFilter={dateFilter || suppliersData?.dateFilter || '01-07'}
          onBack={handleBackToSuppliers}
        />
      )}

      {/* Debug info */}
      {process.env.NODE_ENV === 'development' && (
        <div style={{ display: 'none' }}>
          Selected Supplier: {selectedSupplier?.name}, ID: {selectedSupplier?.id}, Show Modal: {showProductsModal.toString()}
        </div>
      )}
    </>
  );
}