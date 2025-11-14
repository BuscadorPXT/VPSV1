
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
  supplier: {
    name: string;
  };
}

interface LowestPricesModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  supplierId: number;
  supplierName: string;
  dateFilter?: string;
  onBack?: () => void;
}

export function LowestPricesModal({ 
  open, 
  onOpenChange, 
  supplierId,
  supplierName,
  dateFilter,
  onBack 
}: LowestPricesModalProps) {
  const [searchTerm, setSearchTerm] = useState("");

  console.log('🏆 LowestPricesModal - Props received:', { 
    open, 
    supplierId, 
    supplierName, 
    dateFilter 
  });

  const { data: productsData, isLoading, error, refetch } = useQuery<{ products: Product[]; total: number }>({
    queryKey: ['supplierLowestPrices', supplierName, dateFilter],
    queryFn: async () => {
      if (!supplierName) {
        throw new Error('Supplier name is required');
      }

      const params = new URLSearchParams();
      params.set('supplierFilter', supplierName);

      if (dateFilter && dateFilter !== 'all') {
        params.set('dateFilter', dateFilter);
        console.log('🏆 LowestPricesModal - Using provided dateFilter:', dateFilter);
      } else {
        params.set('dateFilter', '24-06');
        console.log('🏆 LowestPricesModal - Using fallback dateFilter: 24-06');
      }

      params.set('lowestPrices', 'true');

      const headers = await getAuthHeaders();
      const url = `/api/products?${params.toString()}`;

      console.log('🏆 LowestPricesModal - Fetching lowest prices for supplier:', supplierName, 'date:', dateFilter || '24-06', 'URL:', url);

      const res = await fetch(url, { headers });

      if (!res.ok) {
        const errorText = await res.text();
        console.error('🏆 Failed to fetch supplier lowest prices:', res.status, res.statusText, errorText);
        throw new Error(`Falha ao carregar menores preços: ${res.status} - ${res.statusText}`);
      }

      const data = await res.json();
      console.log('🏆 LowestPricesModal - Received lowest prices from sheet date:', data.dateFilter, 'products:', data.products?.length, 'total:', data.total);

      // Usar produtos direto da API que já tem isLowestPrice calculado corretamente
      const supplierProducts = data.products || [];
      
      console.log('🏆 LowestPricesModal - Received products from API:', supplierProducts.length);
      
      // Filtrar apenas produtos que já estão marcados como menor preço GLOBAL
      let lowestPriceProducts = supplierProducts.filter((product: Product) => product.isLowestPrice);
      
      console.log('🏆 LowestPricesModal - Products with GLOBAL lowest prices:', lowestPriceProducts.length);
      
      // Debug: mostrar alguns exemplos para verificação
      const debugSamples = lowestPriceProducts.slice(0, 5).map(p => ({
        model: p.model,
        storage: p.storage,
        color: p.color,
        price: p.price,
        supplier: p.supplierName || (typeof p.supplier === 'string' ? p.supplier : p.supplier?.name)
      }));
      
      console.log('🏆 LowestPricesModal - Sample products with global lowest prices:', debugSamples);
      
      // Se a API não marcou nenhum produto, calcular manualmente
      if (lowestPriceProducts.length === 0) {
        console.log('🏆 LowestPricesModal - No products marked as lowest price, calculating manually...');
        
        // Group products by model+storage+color combination
        const productGroups = new Map<string, Product[]>();
        
        supplierProducts.forEach((product: Product) => {
          const key = `${product.model}-${product.storage || ''}-${product.color || ''}`.toLowerCase();
          if (!productGroups.has(key)) {
            productGroups.set(key, []);
          }
          productGroups.get(key)!.push(product);
        });
        
        // Get only ONE product per group (the one with lowest price)
        lowestPriceProducts = [];
        
        productGroups.forEach((groupProducts) => {
          // Sort by price (lowest first)
          const sortedProducts = groupProducts.sort((a, b) => {
            const priceA = parseFloat(a.price?.toString().replace(/[^\d.-]/g, '') || '0');
            const priceB = parseFloat(b.price?.toString().replace(/[^\d.-]/g, '') || '0');
            return priceA - priceB;
          });
          
          // Add only the first (cheapest) product from each group
          if (sortedProducts.length > 0) {
            lowestPriceProducts.push({
              ...sortedProducts[0],
              isLowestPrice: true
            });
          }
        });
      }

      console.log('🏆 LowestPricesModal - Final lowest prices for supplier:', supplierName, 'unique products:', lowestPriceProducts.length);
      
      // Debug: verify all products belong to the correct supplier
      const incorrectSuppliers = lowestPriceProducts.filter((product: Product) => {
        const productSupplier = product.supplierName || (typeof product.supplier === 'string' ? product.supplier : product.supplier?.name);
        return productSupplier?.toLowerCase().trim() !== supplierName.toLowerCase().trim();
      });
      
      if (incorrectSuppliers.length > 0) {
        console.warn('🚨 LowestPricesModal - Found products from wrong suppliers:', incorrectSuppliers.map(p => ({
          model: p.model,
          supplier: p.supplierName || p.supplier,
          expected: supplierName
        })));
      }

      return {
        products: lowestPriceProducts,
        total: lowestPriceProducts.length
      };
    },
    enabled: open && !!supplierName,
    retry: 2,
    staleTime: 30000,
    retryDelay: 1000,
  });

  const products = productsData?.products || [];

  const filteredProducts = products.filter(product => {
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
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
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
                <TrendingDown className="h-5 w-5 text-green-500" />
                Menores Preços - {supplierName}
                {!isLoading && !error && filteredProducts.length > 0 && (
                  <Badge variant="default" className="ml-2 bg-green-500">
                    {filteredProducts.length} produtos
                  </Badge>
                )}
              </DialogTitle>
              <p className="text-sm text-muted-foreground">
                {isLoading 
                  ? "Carregando menores preços..." 
                  : error 
                    ? "Erro ao carregar menores preços"
                    : `Produtos com os menores preços de ${supplierName}`
                }
              </p>
            </div>
          </div>
        </DialogHeader>

        <div className="flex flex-col gap-4 flex-1 min-h-0">
          {!isLoading && !error && filteredProducts.length > 0 && (
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 rounded-lg p-4 border border-green-200 dark:border-green-800">
              <div className="flex items-center gap-2 mb-2">
                <TrendingDown className="h-5 w-5 text-green-600" />
                <span className="font-semibold text-green-700 dark:text-green-300">Economia Máxima</span>
              </div>
              <p className="text-sm text-green-600 dark:text-green-400">
                Estes são os produtos com os menores preços disponíveis de {supplierName}
              </p>
            </div>
          )}

          {!isLoading && !error && products.length > 0 && (
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar entre os menores preços..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          )}

          <div className="flex-1 overflow-y-auto">
            {isLoading ? (
              <div className="flex items-center justify-center py-16">
                <div className="text-center">
                  <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-green-500" />
                  <p className="text-lg font-medium mb-2">Carregando menores preços...</p>
                  <p className="text-sm text-muted-foreground">Buscando melhores ofertas de {supplierName}</p>
                </div>
              </div>
            ) : error ? (
              <div className="text-center py-16">
                <TrendingDown className="h-16 w-16 mx-auto mb-4 opacity-50 text-red-500" />
                <p className="text-xl font-semibold text-red-600 mb-2">Falha ao carregar menores preços</p>
                <p className="text-sm text-muted-foreground mb-4">
                  {error instanceof Error ? error.message : 'Erro desconhecido ao buscar menores preços'}
                </p>
                <div className="flex gap-2 justify-center">
                  <Button 
                    variant="outline" 
                    onClick={() => refetch()}
                    className="flex items-center gap-2"
                  >
                    <TrendingDown className="h-4 w-4" />
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
                <TrendingDown className="h-16 w-16 mx-auto mb-4 opacity-50 text-muted-foreground" />
                <p className="text-xl font-semibold mb-2">Nenhum menor preço encontrado</p>
                <p className="text-sm text-muted-foreground mb-4">
                  O fornecedor <strong>{supplierName}</strong> não possui produtos com menores preços na data selecionada.
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
                  Nenhum menor preço encontrado para "{searchTerm}"
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
                    className="border-2 border-green-200 dark:border-green-800 rounded-lg p-4 bg-green-50 dark:bg-green-950/20 hover:bg-green-100 dark:hover:bg-green-950/30 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-medium text-lg truncate">
                            {product.model}
                          </h3>
                          <Badge variant="default" className="bg-green-500 flex-shrink-0">
                            🏆 Menor Preço
                          </Badge>
                          <Badge 
                            variant={product.available ? "default" : "secondary"}
                            className="flex-shrink-0"
                          >
                            {product.available ? "Disponível" : "Indisponível"}
                          </Badge>
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
                            <span>{formatDate(product.updatedAt)}</span>
                          </div>
                        </div>
                      </div>

                      <div className="text-right flex-shrink-0 ml-4">
                        <p className="text-2xl font-bold text-green-600">
                          {formatPrice(product.price)}
                        </p>
                        {product.region && (
                          <p className="text-xs text-muted-foreground">{product.region}</p>
                        )}
                        <p className="text-xs text-green-600 font-medium mt-1">
                          💰 Melhor oferta
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
