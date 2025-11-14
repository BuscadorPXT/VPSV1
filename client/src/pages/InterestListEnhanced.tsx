import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/use-auth';
import { useInterestList } from '@/hooks/useInterestList';
import { MarginInput } from '@/components/MarginInput';
import { InterestListSummary } from '@/components/InterestListSummary';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { 
  ShoppingCart, 
  Trash2, 
  Calculator, 
  TrendingUp,
  Search,
  Filter,
  Eye,
  EyeOff,
  BarChart3,
  Package,
  ArrowLeft
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLocation } from 'wouter';
import { useTheme } from 'next-themes';

interface InterestListItem {
  id: number;
  model: string;
  brand: string;
  storage: string;
  color: string;
  category?: string;
  capacity?: string;
  region?: string;
  supplierName: string;
  supplierPrice: number;
  quantity: number;
  dateAdded: string;
  marginValue?: number;
  marginType?: 'percentage' | 'fixed';
  salesPrice?: number;
  createdAt: string;
  updatedAt: string;
}

interface InterestListResponse {
  success: boolean;
  data: {
    suppliers: Array<{
      supplier: string;
      items: InterestListItem[];
      subtotal: number;
    }>;
    items: InterestListItem[];
    totalValue: number;
    itemCount: number;
    isRealTime?: boolean;
    lastUpdate?: string;
  };
}

export default function InterestListEnhanced() {
  const { theme } = useTheme();
  const { user, isLoading: authLoading, isAuthReady } = useAuth();
  const [, setLocation] = useLocation();
  const { removeFromInterestList, clearInterestList, updateQuantity } = useInterestList();
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(20);
  const [showSummary, setShowSummary] = useState(true);
  const [searchFilter, setSearchFilter] = useState('');
  const [supplierFilter, setSupplierFilter] = useState('');
  const [compactView, setCompactView] = useState(false);

  console.log('🔍 [INTEREST-LIST-ENHANCED] Component mounted with user:', {
    user: user ? {
      id: user.id,
      email: user.email,
      role: user.role,
      isAdmin: user.isAdmin
    } : null,
    authLoading
  });

  const isLoading = removeFromInterestList.isPending || clearInterestList.isPending || updateQuantity.isPending;

  const { data: interestListResponse, isLoading: isLoadingItems, refetch, error } = useQuery<InterestListResponse>({
    queryKey: ['/api/interest-list', currentPage, itemsPerPage, user?.uid],
    queryFn: async (): Promise<InterestListResponse> => {
      console.log('🔄 [INTEREST-LIST-ENHANCED] Starting API call for interest list');

      if (!user || !user.uid) {
        console.error('🚫 [INTEREST-LIST-ENHANCED] No authenticated user found');
        throw new Error('Usuário não autenticado');
      }

      if (user.isApproved !== true) {
        console.error('🚫 [INTEREST-LIST-ENHANCED] User not approved:', user.isApproved);
        throw new Error('Usuário não aprovado');
      }

      const { auth } = await import('@/lib/firebase');
      const currentUser = auth.currentUser;

      if (!currentUser) {
        console.error('🚫 [INTEREST-LIST-ENHANCED] Firebase user not found');
        throw new Error('Token Firebase não encontrado');
      }

      let firebaseToken: string;
      try {
        firebaseToken = await currentUser.getIdToken(false);
        console.log('🔑 [INTEREST-LIST-ENHANCED] Firebase token obtained (cached)');
      } catch (tokenError) {
        console.log('🔄 [INTEREST-LIST-ENHANCED] Cached token failed, forcing refresh...');
        firebaseToken = await currentUser.getIdToken(true);
        console.log('🔑 [INTEREST-LIST-ENHANCED] Firebase token refreshed');
      }

      const response = await fetch(`/api/interest-list?page=${currentPage}&limit=${itemsPerPage}`, {
        headers: {
          'Authorization': `Bearer ${firebaseToken}`,
          'X-Firebase-Token': firebaseToken,
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ [INTEREST-LIST-ENHANCED] API call failed:', response.status, errorText);
        throw new Error(`Failed to fetch interest list: ${response.status}`);
      }

      const result = await response.json();
      console.log('✅ [INTEREST-LIST-ENHANCED] API call successful:', {
        itemCount: result.data?.itemCount || 0,
        supplierCount: result.data?.suppliers?.length || 0
      });

      return result;
    },
    enabled: isAuthReady && !!user && user.isApproved === true,
    retry: 3,
    staleTime: 30000, // 30 seconds
  });

  // Filter and search functionality
  const filteredItems = useMemo(() => {
    if (!interestListResponse?.data?.items) return [];

    return interestListResponse.data.items.filter(item => {
      const matchesSearch = !searchFilter || 
        item.model.toLowerCase().includes(searchFilter.toLowerCase()) ||
        item.brand.toLowerCase().includes(searchFilter.toLowerCase()) ||
        item.color.toLowerCase().includes(searchFilter.toLowerCase());

      const matchesSupplier = !supplierFilter || 
        item.supplierName.toLowerCase().includes(supplierFilter.toLowerCase());

      return matchesSearch && matchesSupplier;
    });
  }, [interestListResponse?.data?.items, searchFilter, supplierFilter]);

  // Get unique suppliers for filter
  const suppliers = useMemo(() => {
    if (!interestListResponse?.data?.items) return [];
    const uniqueSuppliers = [...new Set(interestListResponse.data.items.map(item => item.supplierName))];
    return uniqueSuppliers.sort();
  }, [interestListResponse?.data?.items]);

  const formatPrice = (price: number) => `R$ ${price.toFixed(2).replace('.', ',')}`;

  const handleMarginChange = (itemId: number, marginValue: number | null, marginType: 'percentage' | 'fixed', salesPrice: number) => {
    // This will be handled by the MarginInput component's auto-save functionality
    console.log(`Margin updated for item ${itemId}:`, { marginValue, marginType, salesPrice });
  };

  const handleRemoveItem = async (itemId: number) => {
    try {
      await removeFromInterestList.mutateAsync(itemId);
      refetch();
    } catch (error) {
      console.error('Error removing item:', error);
    }
  };

  if (authLoading || !isAuthReady) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center">
            <ShoppingCart className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <h2 className="text-xl font-semibold mb-2">Acesso Necessário</h2>
            <p className="text-gray-600 mb-4">Você precisa estar logado para acessar sua lista de interesses.</p>
            <Button onClick={() => setLocation('/login')}>
              Fazer Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (user.isApproved !== true) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center">
            <Package className="h-12 w-12 mx-auto mb-4 text-amber-400" />
            <h2 className="text-xl font-semibold mb-2">Aprovação Pendente</h2>
            <p className="text-gray-600 mb-4">Sua conta está sendo analisada. Aguarde a aprovação para acessar sua lista de interesses.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center">
            <div className="text-red-500 mb-4">❌</div>
            <h2 className="text-xl font-semibold mb-2">Erro ao Carregar</h2>
            <p className="text-gray-600 mb-4">Não foi possível carregar sua lista de interesses.</p>
            <Button onClick={() => refetch()}>
              Tentar Novamente
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const hasItems = filteredItems && filteredItems.length > 0;

  return (
    <div className="container mx-auto p-4 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            onClick={() => setLocation('/dashboard')}
            variant="outline"
            size="sm"
            className="bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100 hover:text-blue-800 dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-400 dark:hover:bg-blue-900/30 shadow-sm"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar ao Dashboard
          </Button>
          <div className="h-6 w-px bg-gray-300 dark:bg-gray-600" />
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Calculator className="h-6 w-6" />
              Lista de Interesses - Planejamento de Vendas
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Calcule suas margens de lucro e planeje suas vendas
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowSummary(!showSummary)}
          >
            {showSummary ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            {showSummary ? 'Ocultar' : 'Mostrar'} Resumo
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCompactView(!compactView)}
          >
            {compactView ? 'Expandir' : 'Compactar'}
          </Button>
        </div>
      </div>

      {/* Summary */}
      {showSummary && hasItems && (
        <InterestListSummary 
          items={filteredItems.map(item => ({
            id: item.id,
            supplierPrice: item.supplierPrice,
            quantity: item.quantity,
            marginValue: item.marginValue,
            marginType: item.marginType,
            salesPrice: item.salesPrice
          }))}
        />
      )}

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Filter className="h-5 w-5" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Buscar por modelo, marca ou cor..."
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                className="pl-10"
              />
            </div>
            <div>
              <select
                value={supplierFilter}
                onChange={(e) => setSupplierFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800"
              >
                <option value="">Todos os fornecedores</option>
                {suppliers.map(supplier => (
                  <option key={supplier} value={supplier}>{supplier}</option>
                ))}
              </select>
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400 flex items-center">
              {filteredItems.length} de {interestListResponse?.data?.itemCount || 0} itens
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Items Table */}
      {isLoadingItems ? (
        <Card>
          <CardContent className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4 text-gray-600 dark:text-gray-400">Carregando lista de interesses...</p>
          </CardContent>
        </Card>
      ) : hasItems ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Produtos e Margens
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Produto</TableHead>
                    <TableHead>Fornecedor</TableHead>
                    <TableHead>Preço de Custo</TableHead>
                    <TableHead>Qtd</TableHead>
                    <TableHead>Minha Margem</TableHead>
                    <TableHead>Meu Preço de Venda</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredItems.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="font-medium">{item.model}</div>
                          <div className="text-sm text-gray-500">
                            {item.storage} • {item.color}
                          </div>
                          {!compactView && item.category && (
                            <Badge variant="secondary" className="text-xs">
                              {item.category}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">{item.supplierName}</div>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium text-blue-600 dark:text-blue-400">
                          {formatPrice(item.supplierPrice)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="w-16">
                          <Input
                            type="number"
                            value={item.quantity}
                            onChange={(e) => {
                              const newQuantity = parseInt(e.target.value) || 1;
                              updateQuantity.mutate({ itemId: item.id, quantity: newQuantity });
                            }}
                            min="1"
                            className="text-center"
                          />
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="w-48">
                          <MarginInput
                            itemId={item.id}
                            supplierPrice={item.supplierPrice}
                            initialMarginValue={item.marginValue}
                            initialMarginType={item.marginType}
                            onMarginChange={(marginValue, marginType, salesPrice) => 
                              handleMarginChange(item.id, marginValue, marginType, salesPrice)
                            }
                          />
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="font-semibold text-green-600 dark:text-green-400">
                          {item.salesPrice ? formatPrice(item.salesPrice) : formatPrice(item.supplierPrice)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveItem(item.id)}
                          disabled={isLoading}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-8 text-center">
            <ShoppingCart className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <h3 className="text-lg font-semibold mb-2">Lista Vazia</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Você ainda não salvou nenhum produto na sua lista de interesses.
            </p>
            <Button onClick={() => setLocation('/dashboard')}>
              Buscar Produtos
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}