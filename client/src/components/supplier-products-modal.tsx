import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { getAuthHeaders } from "@/lib/auth-api";
import { ArrowLeft, Search, Package, TrendingDown, Calendar, Palette, Loader2 } from "lucide-react";
import { useState } from "react";
import { formatPrice } from "@/lib/formatters";
import { Watermark } from "@/components/Watermark";
import { LowestPricesModal } from "@/components/lowest-prices-modal";

interface Product {
  id: number;
  model: string;
  brand: string;
  storage: string;
  color: string;
  price: string;
  category: string | null;
  capacity: string | null;
  region: string | null;
  available: boolean;
  isLowestPrice: boolean;
  updatedAt: string;
}

interface SupplierProductsResponse {
  products: Product[];
  total: number;
  supplier: {
    id: number;
    name: string;
  };
}

interface SupplierProductsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  supplierId: number;
  supplierName: string;
  dateFilter?: string;
  onBack?: () => void;
}

export function SupplierProductsModal({ 
  open, 
  onOpenChange, 
  supplierId,
  supplierName,
  dateFilter,
  onBack 
}: SupplierProductsModalProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [showLowestPricesModal, setShowLowestPricesModal] = useState(false);

  console.log('SupplierProductsModal render - open:', open, 'supplierId:', supplierId, 'supplierName:', supplierName);

  const { data: productsData, isLoading, error, refetch } = useQuery<SupplierProductsResponse>({
    queryKey: ['supplierProducts', supplierName, dateFilter],
    queryFn: async () => {
      console.log(`🏪📦 Fetching products for supplier ${supplierId} (${supplierName}) with date:`, dateFilter);

      const headers = await getAuthHeaders();
      const params = new URLSearchParams();
      params.set('supplierFilter', supplierName);

      // Garantir que usamos a mesma data dos fornecedores
      const finalDateFilter = dateFilter || '01-07';
      params.set('dateFilter', finalDateFilter);
      params.set('date', finalDateFilter);

      console.log('SupplierProductsModal - Final API call params:', Object.fromEntries(params));
      console.log('🏪📦 SupplierProductsModal - Using consistent dateFilter:', finalDateFilter);

      const url = `/api/products?${params.toString()}`;

      const res = await fetch(url, { headers });

      if (!res.ok) {
        const errorText = await res.text();
        console.error('Failed to fetch supplier products:', res.status, res.statusText, errorText);
        throw new Error(`Falha ao carregar produtos: ${res.status} - ${res.statusText}`);
      }

      const data = await res.json();
      console.log('SupplierProductsModal - Received products from sheet date:', data.dateFilter, 'products:', data.products?.length, 'total:', data.total);

      // Usar produtos direto da API sem reprocessamento complexo
      const supplierProducts = data.products || [];
      
      console.log(`🏪📦 ${supplierName} - Received ${supplierProducts.length} products from API`);
      
      // A API já calcula isLowestPrice corretamente, vamos apenas verificar os dados
      const productsWithLowestPrices = supplierProducts.filter(p => p.isLowestPrice);
      
      console.log(`🏪📦 ${supplierName} - Products with lowest prices from API: ${productsWithLowestPrices.length}`);
      
      // Use the data as received from API since it already has correct isLowestPrice calculation
      console.log(`🏪📦 ${supplierName} - Using API-calculated lowest prices (globally compared)`);
      
      const lowestPriceProducts = supplierProducts.filter((p: Product) => p.isLowestPrice);
      
      console.log(`🏪📦 ${supplierName} - Products with GLOBAL lowest prices:`, {
        totalProducts: supplierProducts.length,
        productsWithLowestPrices: lowestPriceProducts.length,
        ratio: `${lowestPriceProducts.length}/${supplierProducts.length}`,
        sampleLowestPriceProducts: lowestPriceProducts.slice(0, 3).map(p => ({
          model: p.model,
          storage: p.storage,
          color: p.color,
          price: p.price
        }))
      });
      
      return {
        products: supplierProducts,
        total: supplierProducts.length,
        supplier: {
          id: supplierId,
          name: supplierName
        }
      };

      return {
        products: supplierProducts,
        total: supplierProducts.length,
        supplier: {
          id: supplierId,
          name: supplierName
        }
      };
    },
    enabled: open && !!supplierName,
    retry: 2,
    staleTime: 30000,
    retryDelay: 1000,
  });

  const products = productsData?.products || [];

  const filteredProducts = products.filter(product => {
    // Se não há termo de busca, mostrar todos os produtos do fornecedor
    if (!searchTerm.trim()) {
      return true;
    }

    const searchLower = searchTerm.toLowerCase();
    return (
      product.model.toLowerCase().includes(searchLower) ||
      product.color.toLowerCase().includes(searchLower) ||
      (product.capacity && product.capacity.toLowerCase().includes(searchLower)) ||
      product.storage.toLowerCase().includes(searchLower)
    );
  });

  const formatDate = (dateString: string) => {
    // Se a data vier no formato DD-MM, usar ela diretamente
    if (dateFilter && dateFilter !== 'all') {
      const [day, month] = dateFilter.split('-');
      if (day && month) {
        return `${day}/${month}`;
      }
    }

    // Fallback para dateString se disponível
    if (dateString && dateString !== 'Invalid Date') {
      const date = new Date(dateString);
      if (!isNaN(date.getTime())) {
        return date.toLocaleDateString('pt-BR', {
          day: '2-digit',
          month: '2-digit'
        });
      }
    }

    // Se nada funcionar, mostrar a data atual
    return new Date().toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit'
    });
  };

  const lowestPriceProducts = filteredProducts.filter(p => p.isLowestPrice);

  // Calculate unique product groups for more accurate stats
  const uniqueProductGroups = new Map<string, Product[]>();
  filteredProducts.forEach(product => {
    const key = `${product.model}-${product.storage || ''}-${product.color || ''}`.toLowerCase();
    if (!uniqueProductGroups.has(key)) {
      uniqueProductGroups.set(key, []);
    }
    uniqueProductGroups.get(key)!.push(product);
  });

  // Debug logging for development
  console.log(`🏆 SupplierProductsModal - ${supplierName}:`, {
    totalProducts: filteredProducts.length,
    uniqueProductVariants: uniqueProductGroups.size,
    lowestPriceProducts: lowestPriceProducts.length,
    expectedLowestPrices: uniqueProductGroups.size, // Should match number of unique variants
    isConsistent: lowestPriceProducts.length === uniqueProductGroups.size,
    sampleGroups: Array.from(uniqueProductGroups.entries()).slice(0, 3).map(([key, products]) => ({
      variant: key,
      count: products.length,
      prices: products.map(p => p.price),
      hasLowestMarked: products.some(p => p.isLowestPrice)
    }))
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
        {/* Watermark for screenshot protection */}
        <Watermark opacity={0.12} position="pattern" size="small" />

        <DialogHeader>
          <div className="flex items-center gap-3">
            {onBack && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onBack}
                className="flex items-center gap-1"
                disabled={isLoading}
              >
                <ArrowLeft className="h-4 w-4" />
                Voltar
              </Button>
            )}
            <div className="flex-1">
              <DialogTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Produtos de {supplierName}
                {!isLoading && !error && filteredProducts.length > 0 && (
                  <Badge variant="secondary" className="ml-2">
                    {filteredProducts.length} produtos
                  </Badge>
                )}
              </DialogTitle>
              <p className="text-sm text-muted-foreground">
                {isLoading 
                  ? "Carregando produtos..." 
                  : error 
                    ? "Erro ao carregar produtos"
                    : `Lista completa de produtos disponíveis de ${supplierName}`
                }
              </p>
            </div>
          </div>
        </DialogHeader>

        <div className="flex flex-col gap-4 flex-1 min-h-0">
          {/* Stats - Only show when data is loaded */}
          {!isLoading && !error && filteredProducts.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-muted/50 rounded-lg p-3">
                <div className="flex items-center gap-2">
                  <Package className="h-4 w-4 text-blue-500" />
                  <span className="text-sm font-medium">Total de Produtos</span>
                </div>
                <p className="text-2xl font-bold">{filteredProducts.length}</p>
                <p className="text-xs text-muted-foreground mt-1">Todos os produtos disponíveis</p>
              </div>

              <div className="bg-muted/50 rounded-lg p-3">
                <div className="flex items-center gap-2">
                  <Palette className="h-4 w-4 text-purple-500" />
                  <span className="text-sm font-medium">Variantes Únicas</span>
                </div>
                <p className="text-2xl font-bold">{uniqueProductGroups.size}</p>
                <p className="text-xs text-muted-foreground mt-1">Modelos × Cor × Capacidade</p>
              </div>

              <div 
                className="bg-muted/50 hover:bg-green-50 dark:hover:bg-green-950/20 rounded-lg p-3 cursor-pointer transition-colors border border-transparent hover:border-green-200 dark:hover:border-green-800"
                onClick={() => setShowLowestPricesModal(true)}
              >
                <div className="flex items-center gap-2">
                  <TrendingDown className="h-4 w-4 text-green-500" />
                  <span className="text-sm font-medium">Menores Preços</span>
                </div>
                <p className="text-2xl font-bold text-green-600">{lowestPriceProducts.length}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {lowestPriceProducts.length === uniqueProductGroups.size 
                    ? "1 por variante" 
                    : `${lowestPriceProducts.length}/${uniqueProductGroups.size} variantes`
                  }
                </p>
              </div>
            </div>
          )}

          {/* Search - Only show when products are loaded */}
          {!isLoading && !error && products.length > 0 && (
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar produto por modelo, cor ou capacidade..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          )}

          {/* Products List */}
          <div className="flex-1 overflow-y-auto">
            {isLoading ? (
              <div className="flex items-center justify-center py-16">
                <div className="text-center">
                  <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-primary" />
                  <p className="text-lg font-medium mb-2">Carregando produtos...</p>
                  <p className="text-sm text-muted-foreground">Buscando produtos de {supplierName}</p>
                </div>
              </div>
            ) : error ? (
              <div className="text-center py-16">
                <Package className="h-16 w-16 mx-auto mb-4 opacity-50 text-red-500" />
                <p className="text-xl font-semibold text-red-600 mb-2">Falha ao carregar produtos</p>
                <p className="text-sm text-muted-foreground mb-4">
                  {error instanceof Error ? error.message : 'Erro desconhecido ao buscar produtos'}
                </p>
                <div className="flex gap-2 justify-center">
                  <Button 
                    variant="outline" 
                    onClick={() => refetch()}
                    className="flex items-center gap-2"
                  >
                    <Package className="h-4 w-4" />
                    Tentar novamente
                  </Button>
                  <Button 
                    variant="ghost" 
                    onClick={() => onOpenChange(false)}
                  >
                    Fechar
                  </Button>
                </div>
              </div>
            ) : products.length === 0 ? (
              <div className="text-center py-16">
                <Package className="h-16 w-16 mx-auto mb-4 opacity-50 text-muted-foreground" />
                <p className="text-xl font-semibold mb-2">Nenhum produto encontrado</p>
                <p className="text-sm text-muted-foreground mb-4">
                  O fornecedor <strong>{supplierName}</strong> não possui produtos disponíveis na data selecionada.
                </p>
                <Button 
                  variant="outline" 
                  onClick={() => onOpenChange(false)}
                >
                  Voltar aos fornecedores
                </Button>
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="text-center py-12">
                <Search className="h-12 w-12 mx-auto mb-4 opacity-50 text-muted-foreground" />
                <p className="text-lg font-medium mb-2">
                  Nenhum produto encontrado para "{searchTerm}"
                </p>
                <p className="text-sm text-muted-foreground mb-4">
                  Tente um termo de busca diferente ou limpe o filtro.
                </p>
                <Button 
                  variant="outline" 
                  onClick={() => setSearchTerm("")}
                >
                  Limpar busca
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredProducts.map((product) => (
                  <div
                    key={product.id}
                    className={`border rounded-lg p-4 hover:bg-muted/50 transition-colors ${
                      product.isLowestPrice ? 'border-green-500 bg-green-50 dark:bg-green-950/20' : ''
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-medium text-lg truncate">
                            {product.model}
                          </h3>
                          {product.isLowestPrice && (
                            <Badge variant="default" className="bg-green-500">
                              Menor Preço
                            </Badge>
                          )}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2 text-sm text-muted-foreground mb-2">
                          {product.color && (
                            <div className="flex items-center gap-1">
                              <Palette className="h-3 w-3" />
                              <span>{product.color}</span>
                            </div>
                          )}

                          {product.storage && (
                            <div className="flex items-center gap-1">
                              <span className="font-mono text-xs bg-muted px-1 rounded">
                                {product.storage}
                              </span>
                            </div>
                          )}

                          {product.category && (
                            <div className="flex items-center gap-1">
                              <span>{product.category}</span>
                            </div>
                          )}

                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            <span>{formatDate(dateFilter || '')}</span>
                          </div>
                        </div>
                      </div>

                      <div className="text-right flex-shrink-0 ml-4">
                        <p className={`text-2xl font-bold ${
                          product.isLowestPrice ? 'text-green-600' : 'text-foreground'
                        }`}>
                          {formatPrice(product.price)}
                        </p>
                        {product.region && (
                          <p className="text-xs text-muted-foreground">{product.region}</p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </DialogContent>

      {/* Modal de Menores Preços */}
      <LowestPricesModal
        open={showLowestPricesModal}
        onOpenChange={setShowLowestPricesModal}
        supplierId={supplierId}
        supplierName={supplierName}
        dateFilter={dateFilter}
        onBack={() => setShowLowestPricesModal(false)}
      />
    </Dialog>
  );
}