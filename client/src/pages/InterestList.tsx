import React, { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Checkbox } from '@/components/ui/checkbox';
import { Trash2, Heart, ArrowLeft, Plus, Minus, Calendar, Tag, MapPin, Palette, HardDrive, MessageCircle, Filter, BarChart3, Package } from 'lucide-react';
import { useInterestList } from '@/hooks/useInterestList';
import { useInterestListSelection } from '@/hooks/useInterestListSelection';
import { formatPrice } from '@/lib/formatters';
import { useTheme } from '@/components/theme-provider';
import { useLocation } from 'wouter';
import { useAuth } from '@/hooks/use-auth';
import { auth } from '@/lib/firebase';
import { InterestListAnalytics } from '@/components/InterestListAnalytics';
import { InterestListFilters, FilterState } from '@/components/InterestListFilters';
import { WhatsAppButton } from '@/components/WhatsAppButton';
import { MarginInput } from '@/components/MarginInput';
import { InterestListSummary } from '@/components/InterestListSummary';
import { SalesPricePreview } from '@/components/SalesPricePreview';

interface InterestListProduct {
  id: number;
  productId: number;
  userId: number;
  model: string;
  brand: string;
  storage: string;
  color: string;
  price?: string;
  supplierPrice?: number;
  supplierName: string;
  supplierId: number;
  category: string;
  region: string;
  quantity?: number;
  createdAt: string;
  dateAdded?: string;
  isRealTimePrice?: boolean;
  // Add WhatsApp number field
  supplierWhatsApp?: string;
  // Add margin fields
  marginValue?: number;
  marginType?: 'percentage' | 'fixed';
  salesPrice?: number;
}

interface GroupedProducts {
  [supplierName: string]: InterestListProduct[];
}

const InterestList: React.FC = () => {
  const { theme } = useTheme();
  const { user, isLoading: authLoading, isAuthReady } = useAuth();
  const { removeFromInterestList, clearInterestList, updateQuantity } = useInterestList();
  const [, setLocation] = useLocation();
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [compactView, setCompactView] = useState(true);
  const [showMarginSummary, setShowMarginSummary] = useState(true);

  console.log('🔍 [INTEREST-LIST] Component mounted with user:', {
    user: user ? {
      id: user.id,
      email: user.email,
      role: user.role,
      isAdmin: user.isAdmin
    } : null,
    authLoading
  });

  const isLoading = removeFromInterestList.isPending || clearInterestList.isPending || updateQuantity.isPending;

  const { data: interestListResponse, isLoading: isLoadingItems, refetch, error } = useQuery<{
    success: boolean;
    data: {
      suppliers: Array<{
        supplier: string;
        items: InterestListProduct[];
        subtotal: number;
      }>;
      items: InterestListProduct[];
      totalValue: number;
      itemCount: number;
      isRealTime?: boolean;
      lastUpdate?: string;
    };
  }>({
    queryKey: ['/api/interest-list', currentPage, itemsPerPage, user?.uid],
    queryFn: async () => {
      console.log('🔄 [INTEREST-LIST] Starting API call for interest list');

      // Verificar se o usuário está autenticado
      if (!user || !user.uid) {
        console.error('🚫 [INTEREST-LIST] No authenticated user found');
        throw new Error('Usuário não autenticado');
      }

      // Verificar se o usuário está aprovado
      if (user.isApproved !== true) {
        console.error('🚫 [INTEREST-LIST] User not approved:', user.isApproved);
        throw new Error('Usuário não aprovado');
      }

      const { auth } = await import('@/lib/firebase');
      const currentUser = auth.currentUser;

      if (!currentUser) {
        console.error('🚫 [INTEREST-LIST] Firebase user not found');
        throw new Error('Token Firebase não encontrado');
      }

      let firebaseToken: string;
      try {
        // Try to get token without forcing refresh first
        firebaseToken = await currentUser.getIdToken(false);
        console.log('🔑 [INTEREST-LIST] Firebase token obtained (cached)');
      } catch (tokenError) {
        console.log('🔄 [INTEREST-LIST] Cached token failed, forcing refresh...');
        firebaseToken = await currentUser.getIdToken(true);
        console.log('🔑 [INTEREST-LIST] Firebase token refreshed');
      }

      const response = await fetch(`/api/interest-list?page=${currentPage}&limit=${itemsPerPage}`, {
        headers: {
          'Authorization': `Bearer ${firebaseToken}`,
          'X-Firebase-Token': firebaseToken,
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      console.log('📡 [INTEREST-LIST] API response status:', response.status);

      if (response.status === 401) {
        console.error('🚫 [INTEREST-LIST] Unauthorized - clearing auth state');
        // Don't redirect immediately, let the auth system handle it
        throw new Error('Sessão expirada');
      }

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ [INTEREST-LIST] API error:', errorText);
        throw new Error(`Erro ao carregar lista: ${response.status}`);
      }

      const data = await response.json();
      console.log('✅ [INTEREST-LIST] Data loaded successfully:', {
        itemCount: data.data?.itemCount,
        suppliersCount: data.data?.suppliers?.length,
        success: data.success,
        totalValue: data.data?.totalValue
      });

      return data;
    },
    enabled: !authLoading && isAuthReady && !!user && user.isApproved === true,
    refetchOnWindowFocus: false,
    staleTime: 10000,
    gcTime: 5 * 60 * 1000, // 5 minutes
    networkMode: 'online',
    retry: (failureCount, error) => {
      console.log(`🔄 [INTEREST-LIST] Retry attempt ${failureCount}:`, error.message);

      // Don't retry on authentication errors
      if (error.message.includes('autenticado') || 
          error.message.includes('Sessão expirada') ||
          error.message.includes('Firebase token') ||
          error.message.includes('401') ||
          error.message.includes('Unauthorized') ||
          error.message.includes('não aprovado')) {
        console.log('🚫 [INTEREST-LIST] Authentication/approval error - not retrying');
        return false;
      }

      // Only retry twice for other errors
      return failureCount < 2;
    },
    retryDelay: 1000,
  });

  // Function to generate/mock WhatsApp number - replace with real database lookup
  const generateWhatsAppNumber = (supplierName: string): string => {
    // This is a temporary solution - in production, you should:
    // 1. Add a whatsapp_number column to your suppliers table
    // 2. Fetch this data from the database
    // 3. Return the actual WhatsApp number from supplier data

    // Mock numbers based on supplier name for demonstration
    const mockNumbers: { [key: string]: string } = {
      'AZUR 2728': '5511987654321',
      'NASSER 5307': '5511876543210',
      'TECH SUPPLIER': '5511765432109',
    };

    return mockNumbers[supplierName] || '5511999999999'; // Default fallback
  };

  // Extract items from the response
  const interestListItems = useMemo(() => {
    if (!interestListResponse?.success || !interestListResponse?.data) {
      return [];
    }

    let items = interestListResponse.data.items;

    if (!items && interestListResponse.data.suppliers) {
      items = interestListResponse.data.suppliers.flatMap(supplier => supplier.items);
    }

    if (!items || items.length === 0) {
      return [];
    }

    // Fix supplier name issues and log date fields for debugging
    const fixedItems = items.map(item => {
      console.log('🗓️ [DATE-DEBUG] Product date fields:', {
        id: item.id,
        model: item.model,
        createdAt: item.createdAt,
        dateAdded: item.dateAdded,
        created_at: item.created_at,
        updatedAt: item.updatedAt,
        allKeys: Object.keys(item)
      });

      return {
        ...item,
        supplierName: item.supplierName || item.suppliername || item.supplier_name || 'Fornecedor Desconhecido',
        // Mock WhatsApp number based on supplier name - in production, this should come from database
        supplierWhatsApp: generateWhatsAppNumber(item.supplierName || item.suppliername || item.supplier_name || ''),
        // Map margin fields from database
        marginValue: item.marginvalue || item.marginValue,
        marginType: item.margintype || item.marginType || 'percentage',
        salesPrice: item.salesprice && !isNaN(parseFloat(item.salesprice)) ? parseFloat(item.salesprice) : item.salesPrice
      };
    });

    return fixedItems;
  }, [interestListResponse, generateWhatsAppNumber]);

  // Initialize selection hook
  const {
    selectedProducts,
    selectionStats,
    allSelected,
    selectProduct,
    selectAllProducts,
    selectSupplierProducts,
    selectByCriteria,
    clearSelection,
    isProductSelected,
    getSelectedProducts
  } = useInterestListSelection({ products: interestListItems });

  // Initialize filters
  const [filters, setFilters] = useState<FilterState>({
    search: '',
    priceRange: [0, 10000],
    suppliers: [],
    categories: [],
    dateRange: [null, null],
    sortBy: 'date',
    sortOrder: 'desc'
  });

  // Filter and sort products
  const filteredAndSortedProducts = useMemo(() => {
    let filtered = [...interestListItems];

    // Apply search filter
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(product =>
        product.model?.toLowerCase().includes(searchLower) ||
        product.brand?.toLowerCase().includes(searchLower) ||
        product.supplierName?.toLowerCase().includes(searchLower) ||
        product.category?.toLowerCase().includes(searchLower)
      );
    }

    // Apply supplier filter
    if (filters.suppliers.length > 0) {
      filtered = filtered.filter(product =>
        filters.suppliers.includes(product.supplierName)
      );
    }

    // Apply category filter
    if (filters.categories.length > 0) {
      filtered = filtered.filter(product =>
        filters.categories.includes(product.category || 'Outros')
      );
    }

    // Apply price range filter
    filtered = filtered.filter(product => {
      const price = product.supplierPrice || 0;
      return price >= filters.priceRange[0] && price <= filters.priceRange[1];
    });

    // Apply date range filter
    if (filters.dateRange[0] || filters.dateRange[1]) {
      filtered = filtered.filter(product => {
        const productDate = new Date(product.createdAt);
        const startDate = filters.dateRange[0];
        const endDate = filters.dateRange[1];

        if (startDate && productDate < startDate) return false;
        if (endDate && productDate > endDate) return false;
        return true;
      });
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let compareValue = 0;

      switch (filters.sortBy) {
        case 'name':
          compareValue = (a.model || '').localeCompare(b.model || '');
          break;
        case 'price':
          compareValue = (a.supplierPrice || 0) - (b.supplierPrice || 0);
          break;
        case 'date':
          compareValue = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
          break;
        case 'supplier':
          compareValue = a.supplierName.localeCompare(b.supplierName);
          break;
        default:
          compareValue = 0;
      }

      return filters.sortOrder === 'desc' ? -compareValue : compareValue;
    });

    return filtered;
  }, [interestListItems, filters]);

  // Group filtered products by supplier
  const groupedProducts: GroupedProducts = useMemo(() => {
    if (!filteredAndSortedProducts || filteredAndSortedProducts.length === 0) {
      return {};
    }

    const grouped = filteredAndSortedProducts.reduce((acc, product) => {
      const supplierName = product.supplierName || 'Fornecedor Desconhecido';
      if (!acc[supplierName]) {
        acc[supplierName] = [];
      }
      acc[supplierName].push(product);
      return acc;
    }, {} as GroupedProducts);

    return grouped;
  }, [filteredAndSortedProducts]);

  // Calculate totals
  const calculateSupplierTotal = React.useCallback((products: InterestListProduct[]) => {
    return products.reduce((sum, product) => {
      let unitPrice = 0;

      if (typeof product.supplierPrice === 'number' && product.supplierPrice > 0) {
        unitPrice = product.supplierPrice;
      } else if (product.price && product.price.toString().trim()) {
        const priceString = product.price.toString()
          .replace(/[^\d.,]/g, '')
          .replace(',', '.');
        const parsedPrice = parseFloat(priceString);
        if (!isNaN(parsedPrice) && parsedPrice > 0) {
          unitPrice = parsedPrice;
        }
      }

      const quantity = product.quantity || 1;
      const total = unitPrice * quantity;

      return sum + total;
    }, 0);
  }, []);

  const grandTotal = useMemo(() => {
    const total = Object.values(groupedProducts).reduce((total, products) => {
      return total + calculateSupplierTotal(products);
    }, 0);

    console.log('🧮 [TOTAL] Grand total calculated:', total);
    return total;
  }, [groupedProducts, calculateSupplierTotal]);

  // Extract unique suppliers and categories for filters
  const availableSuppliers = useMemo(() => {
    return [...new Set(interestListItems.map(item => item.supplierName))].filter(Boolean).sort();
  }, [interestListItems]);

  const availableCategories = useMemo(() => {
    return [...new Set(interestListItems.map(item => item.category || 'Outros'))].sort();
  }, [interestListItems]);

  const priceRange = useMemo((): [number, number] => {
    if (interestListItems.length === 0) return [0, 10000];

    const prices = interestListItems
      .map(item => item.supplierPrice || 0)
      .filter(price => price > 0);

    if (prices.length === 0) return [0, 10000];

    return [Math.min(...prices), Math.max(...prices)];
  }, [interestListItems]);

  const handleRemoveItem = async (productId: number) => {
    try {
      await removeFromInterestList.mutateAsync(productId);
      refetch();
    } catch (error) {
      console.error('Error removing item:', error);
    }
  };

  const handleClearAll = async () => {
    try {
      await clearInterestList.mutateAsync();
      refetch();
    } catch (error) {
      console.error('Error clearing all items:', error);
    }
  };

  const handleQuantityChange = async (itemId: number, newQuantity: number) => {
    if (newQuantity < 1) return;

    console.log('🔄 [QUANTITY] Updating quantity:', { itemId, newQuantity });

    try {
      await updateQuantity.mutateAsync({ itemId, quantity: newQuantity });
      refetch();
    } catch (error) {
      console.error('❌ [QUANTITY] Error updating quantity:', error);
    }
  };

  // Check if user can access WhatsApp - FIXED LOGIC
  const canUseWhatsApp = useMemo(() => {
    if (!user) return false;

    const hasAccess = user.isAdmin === true || 
                     user.role === 'admin' || 
                     user.role === 'pro' || 
                     user.role === 'superadmin' ||
                     user.role === 'super_admin' ||
                     user.subscriptionPlan === 'pro' ||
                     user.subscriptionPlan === 'business';

    console.log('🔍 [WHATSAPP] Access check:', {
      userExists: !!user,
      userRole: user?.role,
      subscriptionPlan: user?.subscriptionPlan,
      isAdmin: user?.isAdmin,
      hasAccess
    });

    return hasAccess;
  }, [user]);

  // Generate WhatsApp message for multiple products
  const generateWhatsAppMessage = (supplierProducts: InterestListProduct[]) => {
    const selectedSupplierProducts = supplierProducts.filter(product => isProductSelected(product.id));

    if (selectedSupplierProducts.length === 0) return null;

    const multipleProducts = selectedSupplierProducts.map(product => ({
      model: product.model,
      brand: product.brand,
      color: product.color,
      storage: product.storage,
      price: product.supplierPrice,
      region: product.region,
      quantity: product.quantity || 1
    }));

    const total = selectedSupplierProducts.reduce((sum, product) => {
      const unitPrice = product.supplierPrice || 0;
      const quantity = product.quantity || 1;
      return sum + (unitPrice * quantity);
    }, 0);

    return {
      multipleProducts,
      totalValue: total,
      count: selectedSupplierProducts.length
    };
  };

  // Show loading if still loading authentication
  if (authLoading || !isAuthReady) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Carregando informações...</p>
        </div>
      </div>
    );
  }

  // If no user after auth loading is complete, redirect to login
  if (!user) {
    console.log('🚫 No user authenticated, redirecting to login');
    setTimeout(() => setLocation('/login'), 100);

    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="text-blue-600 dark:text-blue-400 mb-4">
            <h3 className="text-lg font-semibold mb-2">Redirecionando...</h3>
            <p className="text-sm">Você será redirecionado para o login</p>
          </div>
          <Button 
            onClick={() => setLocation('/login')} 
            variant="outline"
            className="mt-4"
          >
            Ir para Login
          </Button>
        </div>
      </div>
    );
  }

  // Check if user is approved - more robust validation
  console.log('🔍 [InterestList] User approval check:', {
    isApproved: user.isApproved,
    role: user.role,
    status: user.status,
    isAdmin: user.isAdmin,
    userAgent: navigator.userAgent.includes('Mobile') ? 'Mobile' : 'Desktop'
  });

  const isUserApproved = user.isApproved === true || 
                        user.role === 'admin' || 
                        user.role === 'superadmin' || 
                        user.isAdmin === true ||
                        user.status === 'active';

  if (!isUserApproved) {
    console.log('🚫 User not approved, redirecting to pending approval');
    console.log('🚫 Approval details:', {
      isApproved: user.isApproved,
      role: user.role,
      status: user.status,
      isAdmin: user.isAdmin
    });
    
    setTimeout(() => setLocation('/pending-approval'), 100);

    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="text-orange-600 dark:text-orange-400 mb-4">
            <h3 className="text-lg font-semibold mb-2">Aguardando Aprovação</h3>
            <p className="text-sm">Sua conta precisa ser aprovada para acessar esta funcionalidade</p>
          </div>
          <Button 
            onClick={() => setLocation('/pending-approval')} 
            variant="outline"
            className="mt-4"
          >
            Ver Status da Conta
          </Button>
        </div>
      </div>
    );
  }

  if (isLoadingItems) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="max-w-6xl mx-auto px-6 py-8">
          <div className="mb-8">
            <Skeleton className="h-8 w-48 mb-2" />
            <Skeleton className="h-4 w-96" />
          </div>
          <div className="space-y-6">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="border-0 shadow-sm">
                <CardContent className="p-6">
                  <Skeleton className="h-6 w-32 mb-4" />
                  <div className="space-y-4">
                    {[1, 2].map((j) => (
                      <Skeleton key={j} className="h-20 w-full" />
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Display error if there's a request problem
  if (error) {
    console.error('❌ [INTEREST-LIST] Query error:', error);
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="max-w-6xl mx-auto px-6 py-8">
          <div className="mb-8">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-4">
                <Button
                  onClick={() => setLocation('/dashboard')}
                  variant="ghost"
                  size="sm"
                  className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Dashboard
                </Button>
                <div className="h-6 w-px bg-gray-300 dark:bg-gray-600" />
                <h1 className="text-2xl font-light text-gray-900 dark:text-white">
                  Lista de Interesses
                </h1>
              </div>
            </div>

            <Card className="border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950">
              <CardContent className="p-6">
                <div className="text-center">
                  <div className="text-red-600 dark:text-red-400 mb-4">
                    <h3 className="text-lg font-semibold mb-2">
                      {error.message.includes('401') || error.message.includes('Firebase token') || error.message.includes('autenticado')
                        ? 'Problema de Autenticação' 
                        : 'Erro ao carregar lista'}
                    </h3>
                    <p>
                      {error.message.includes('401') || error.message.includes('Firebase token') || error.message.includes('autenticado')
                        ? 'Sua sessão expirou ou há um problema de autenticação.' 
                        : 'Não foi possível carregar sua lista de interesses.'}
                    </p>
                    <p className="text-sm mt-2 opacity-75">Detalhes: {error.message}</p>
                  </div>
                  <div className="flex gap-4 justify-center">
                    {error.message.includes('401') || error.message.includes('Firebase token') || error.message.includes('autenticado') ? (
                      <Button onClick={() => setLocation('/login')} variant="default">
                        Fazer Login Novamente
                      </Button>
                    ) : (
                      <Button onClick={() => refetch()} variant="outline">
                        Tentar Novamente
                      </Button>
                    )}
                    <Button onClick={() => setLocation('/dashboard')} variant="outline">
                      Voltar ao Dashboard
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  const isEmpty = !interestListItems || interestListItems.length === 0;
  const hasProducts = interestListItems && interestListItems.length > 0;

  console.log('🎯 [RENDER] Final render state:', {
    isEmpty,
    hasProducts,
    itemsCount: interestListItems?.length,
    groupedSuppliersCount: Object.keys(groupedProducts).length,
    grandTotal,
    selectionCount: selectedProducts.size,
    canUseWhatsApp,
    showAnalytics,
    showFilters
  });

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
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
              <h1 className="text-2xl font-light text-gray-900 dark:text-white">
                Lista de Interesses
              </h1>
            </div>

            <div className="flex items-center gap-2">
              {/* Compact View Toggle - ALWAYS SHOW IF HAS PRODUCTS */}
              {hasProducts && (
                <Button
                  onClick={() => setCompactView(!compactView)}
                  variant="outline"
                  size="sm"
                  className="text-gray-600 border-gray-200 hover:bg-gray-50 dark:text-gray-400 dark:border-gray-600 dark:hover:bg-gray-800"
                >
                  <Package className="h-4 w-4 mr-2" />
                  {compactView ? 'Ver Detalhes' : 'Ver Compacta'}
                </Button>
              )}

              {/* Analytics Toggle - ALWAYS SHOW IF HAS PRODUCTS */}
              {hasProducts && (
                <Button
                  onClick={() => {
                    console.log('📊 [ANALYTICS] Toggling analytics:', !showAnalytics);
                    setShowAnalytics(!showAnalytics);
                  }}
                  variant="outline"
                  size="sm"
                  className="text-blue-600 border-blue-200 hover:bg-blue-50 dark:text-blue-400 dark:border-blue-800 dark:hover:bg-blue-950"
                >
                  <BarChart3 className="h-4 w-4 mr-2" />
                  {showAnalytics ? 'Ocultar' : 'Mostrar'} Análises
                </Button>
              )}

              {/* Filters Toggle - ALWAYS SHOW IF HAS PRODUCTS */}
              {hasProducts && (
                <Button
                  onClick={() => {
                    console.log('🔍 [FILTERS] Toggling filters:', !showFilters);
                    setShowFilters(!showFilters);
                  }}
                  variant="outline"
                  size="sm"
                  className="text-purple-600 border-purple-200 hover:bg-purple-50 dark:text-purple-400 dark:border-purple-800 dark:hover:bg-purple-950"
                >
                  <Filter className="h-4 w-4 mr-2" />
                  {showFilters ? 'Ocultar' : 'Mostrar'} Filtros
                </Button>
              )}

              {/* Margin Summary Toggle - ALWAYS SHOW IF HAS PRODUCTS */}
              {hasProducts && (
                <Button
                  onClick={() => {
                    console.log('💰 [MARGIN-SUMMARY] Toggling margin summary:', !showMarginSummary);
                    setShowMarginSummary(!showMarginSummary);
                  }}
                  variant="outline"
                  size="sm"
                  className="text-green-600 border-green-200 hover:bg-green-50 dark:text-green-400 dark:border-green-800 dark:hover:bg-green-950"
                >
                  <Package className="h-4 w-4 mr-2" />
                  {showMarginSummary ? 'Ocultar' : 'Mostrar'} Lucros
                </Button>
              )}

              {/* Selection Controls - SHOW IF HAS PRODUCTS */}
              {hasProducts && (
                <div className="flex items-center gap-2">
                  <Button
                    onClick={() => selectAllProducts(!allSelected)}
                    variant="outline"
                    size="sm"
                    className="text-green-600 border-green-200 hover:bg-green-50 dark:text-green-400 dark:border-green-800 dark:hover:bg-green-950"
                  >
                    {allSelected ? 'Desmarcar' : 'Selecionar'} Todos
                  </Button>

                  <Button
                    onClick={() => selectByCriteria('cheapest')}
                    variant="outline"
                    size="sm"
                    className="text-blue-600 border-blue-200 hover:bg-blue-50 dark:text-blue-400 dark:border-blue-800 dark:hover:bg-blue-950"
                  >
                    5 Mais Baratos
                  </Button>

                  <Button
                    onClick={() => selectByCriteria('recent')}
                    variant="outline"
                    size="sm"
                    className="text-indigo-600 border-indigo-200 hover:bg-indigo-50 dark:text-indigo-400 dark:border-indigo-800 dark:hover:bg-indigo-950"
                  >
                    Recentes
                  </Button>
                </div>
              )}

              {selectedProducts.size > 0 && (
                <Button
                  onClick={clearSelection}
                  variant="outline"
                  size="sm"
                  className="text-orange-600 border-orange-200 hover:bg-orange-50 dark:text-orange-400 dark:border-orange-800 dark:hover:bg-orange-950"
                >
                  Limpar Seleção ({selectedProducts.size})
                </Button>
              )}

              {hasProducts && (
                <Button
                  onClick={handleClearAll}
                  variant="outline"
                  size="sm"
                  disabled={isLoading}
                  className="text-red-600 border-red-200 hover:bg-red-50 dark:text-red-400 dark:border-red-800 dark:hover:bg-red-950"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Limpar Tudo
                </Button>
              )}
            </div>
          </div>

          {/* Summary Info */}
          {hasProducts && (
            <div className="flex items-center gap-6 text-sm text-gray-600 dark:text-gray-400">
              <span>{interestListItems.length} produtos totais</span>
              <span>•</span>
              <span>{filteredAndSortedProducts.length} produtos filtrados</span>
              <span>•</span>
              <span>{Object.keys(groupedProducts).length} fornecedores</span>
              <span>•</span>
              <span className="font-medium text-gray-900 dark:text-white">
                Total: {formatPrice(grandTotal)}
              </span>
              {selectedProducts.size > 0 && (
                <>
                  <span>•</span>
                  <div className="flex items-center gap-2 bg-green-50 dark:bg-green-900/20 px-2 py-1 rounded-full">
                    <MessageCircle className="h-3 w-3 text-green-600 dark:text-green-400" />
                    <span className="text-green-700 dark:text-green-300 font-medium text-sm">
                      {selectedProducts.size} selecionados (Total: {formatPrice(selectionStats.totalValue)})
                    </span>
                                    </div>
                </>
              )}
              {canUseWhatsApp && (
                <div className="flex items-center gap-1 bg-blue-50 dark:bg-blue-900/20 px-2 py-1 rounded-full">
                  <MessageCircle className="h-3 w-3 text-blue-600 dark:text-blue-400" />
                  <span className="text-blue-700 dark:text-blue-300 font-medium text-xs">
                    WhatsApp Ativo
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Analytics Component - FORCE RENDER IF ENABLED */}
        {showAnalytics && hasProducts && (
          <div className="mb-6">
            <InterestListAnalytics
              products={filteredAndSortedProducts}
              selectedProducts={selectedProducts}
            />
          </div>
        )}

        {/* Filters Component - FORCE RENDER IF ENABLED */}
        {showFilters && hasProducts && (
          <div className="mb-6">
            <InterestListFilters
              filters={filters}
              onFiltersChange={setFilters}
              availableSuppliers={availableSuppliers}
              availableCategories={availableCategories}
              priceRange={priceRange}
            />
          </div>
        )}

        {/* Margin Summary Component - FORCE RENDER IF ENABLED */}
        {showMarginSummary && hasProducts && (
          <div className="mb-6 space-y-4">
            <InterestListSummary 
              items={filteredAndSortedProducts.map(item => ({
                id: item.id,
                supplierPrice: item.supplierPrice || 0,
                quantity: item.quantity || 1,
                marginValue: item.marginValue,
                marginType: item.marginType,
                salesPrice: item.salesPrice
              }))}
            />

            <SalesPricePreview 
              items={filteredAndSortedProducts.map(item => ({
                id: item.id,
                supplierPrice: item.supplierPrice || 0,
                quantity: item.quantity || 1,
                marginValue: item.marginValue,
                marginType: item.marginType,
                salesPrice: item.salesPrice
              }))}
            />
          </div>
        )}

        {/* Empty State */}
        {isEmpty && (
          <div className="text-center py-20">
            <div className="w-16 h-16 mx-auto mb-6 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center">
              <Heart className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="text-xl font-light text-gray-900 dark:text-white mb-2">
              Nenhum produto na lista
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-8 max-w-md mx-auto">
              Adicione produtos à sua lista de interesses para organizá-los por fornecedor e calcular totais.
            </p>
            <div className="flex gap-4 justify-center">
              <Button 
                variant="outline" 
                onClick={() => setLocation('/dashboard')}
                className="border-gray-300 text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
              >
                Explorar Produtos
              </Button>
            </div>
          </div>
        )}

        {/* Product List */}
        {hasProducts && Object.keys(groupedProducts).length > 0 && (
          <div className="space-y-6">
            {Object.entries(groupedProducts).map(([supplierName, products]) => {
              const supplierTotal = calculateSupplierTotal(products);
              const selectedCount = products.filter(p => isProductSelected(p.id)).length;
              const allSupplierSelected = products.every(p => isProductSelected(p.id));
              const whatsAppData = generateWhatsAppMessage(products);
              const supplierWhatsApp = products[0]?.supplierWhatsApp || '5511999999999';

              return (
                <Card key={supplierName} className="border-0 shadow-sm bg-white dark:bg-gray-800">
                  <CardHeader className="pb-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2 bg-green-50 dark:bg-green-900/20 px-3 py-1 rounded-full">
                          <Checkbox
                            checked={allSupplierSelected}
                            onCheckedChange={(checked) => selectSupplierProducts(products, checked as boolean)}
                            className="data-[state=checked]:bg-green-600 data-[state=checked]:border-green-600 h-4 w-4"
                          />
                          <span className="text-xs font-medium text-green-700 dark:text-green-300">
                            Selecionar todos ({selectedCount}/{products.length})
                          </span>
                        </div>

                        <CardTitle className="text-lg font-medium text-gray-900 dark:text-white">
                          {supplierName}
                        </CardTitle>
                      </div>

                      <div className="text-right">
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          {products.length} {products.length === 1 ? 'produto' : 'produtos'}
                        </div>
                        <div className="text-lg font-semibold text-gray-900 dark:text-white">
                          {formatPrice(supplierTotal)}
                        </div>
                        {/* Show sales total if any product has margin */}
                        {products.some(p => p.marginValue && p.marginValue > 0) && (
                          <div className="text-sm text-green-600 dark:text-green-400 font-medium">
                            Venda: {formatPrice(products.reduce((sum, p) => {
                              const salesPrice = p.salesPrice || p.supplierPrice || 0;
                              return sum + (salesPrice * (p.quantity || 1));
                            }, 0))}
                          </div>
                        )}
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="pt-0 bg-gray-50/30 dark:bg-gray-900/30">
                    {compactView ? (
                      /* Compact View */
                      <div className="space-y-2">
                        {products.map((product, productIndex) => {
                          let unitPrice = 0;

                          if (typeof product.supplierPrice === 'number' && product.supplierPrice > 0) {
                            unitPrice = product.supplierPrice;
                          } else if (product.price && product.price.toString().trim()) {
                            const priceString = product.price.toString()
                              .replace(/[^\d.,]/g, '')
                              .replace(',', '.');
                            const parsedPrice = parseFloat(priceString);
                            if (!isNaN(parsedPrice) && parsedPrice > 0) {
                              unitPrice = parsedPrice;
                            }
                          }

                          const quantity = product.quantity || 1;
                          const totalPrice = unitPrice * quantity;
                          const isSelected = isProductSelected(product.id);

                          return (
                            <div 
                              key={product.id} 
                              className={`group flex items-center justify-between p-3 rounded-lg transition-all duration-200 ${
                                isSelected 
                                  ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800' 
                                  : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600'
                              }`}
                            >
                              <div className="flex items-center gap-3 flex-1">
                                <Checkbox
                                  checked={isSelected}
                                  onCheckedChange={(checked) => selectProduct(product.id, checked as boolean)}
                                  className="data-[state=checked]:bg-green-600 data-[state=checked]:border-green-600 h-4 w-4"
                                />

                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className="text-xs bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded text-gray-600 dark:text-gray-300 font-medium">
                                      #{productIndex + 1}
                                    </span>
                                    <h4 className="font-medium text-gray-900 dark:text-white truncate">
                                      {product.model && product.model.trim() && product.model !== 'Produto sem nome' 
                                        ? product.model 
                                        : 'Produto não identificado'}
                                    </h4>
                                  </div>

                                  <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
                                    {product.brand && product.brand.trim() && product.brand !== 'Marca não informada' && (
                                      <span>{product.brand}</span>
                                    )}
                                    {product.storage && product.storage.trim() && product.storage !== 'Não informado' && (
                                      <span>•</span>
                                    )}
                                    {product.storage && product.storage.trim() && product.storage !== 'Não informado' && (
                                      <span>{product.storage}</span>
                                    )}
                                    {product.color && product.color.trim() && product.color !== 'Não informado' && (
                                      <span>•</span>
                                    )}
                                    {product.color && product.color.trim() && product.color !== 'Não informado' && (
                                      <span>{product.color}</span>
                                    )}
                                  </div>
                                </div>
                              </div>

                              <div className="flex items-center gap-4">
                                <div className="flex items-center gap-1">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleQuantityChange(product.id, Math.max(1, quantity - 1))}
                                    disabled={isLoading || quantity <= 1}
                                    className="h-6 w-6 p-0 border-gray-300 dark:border-gray-600"
                                  >
                                    <Minus className="h-3 w-3" />
                                  </Button>
                                  <span className="min-w-[1.5rem] text-center text-sm font-medium text-gray-900 dark:text-white">
                                    {quantity}
                                  </span>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleQuantityChange(product.id, quantity + 1)}
                                    disabled={isLoading}
                                    className="h-6 w-6 p-0 border-gray-300 dark:border-gray-600"
                                  >
                                    <Plus className="h-3 w-3" />
                                  </Button>
                                </div>

                                <div className="text-right">
                                  <div className="text-sm font-semibold text-gray-900 dark:text-white">
                                    {formatPrice(totalPrice)}
                                  </div>
                                  <div className="text-xs text-gray-500 dark:text-gray-400">
                                    {formatPrice(unitPrice)} unit.
                                  </div>
                                </div>

                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleRemoveItem(product.id)}
                                  disabled={isLoading}
                                  className="opacity-0 group-hover:opacity-100 transition-opacity text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950 h-6 w-6 p-0"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      /* Detailed View */
                      <div className="space-y-3">
                        {products.map((product, productIndex) => {
                          let unitPrice = 0;

                          if (typeof product.supplierPrice === 'number' && product.supplierPrice > 0) {
                            unitPrice = product.supplierPrice;
                          } else if (product.price && product.price.toString().trim()) {
                            const priceString = product.price.toString()
                              .replace(/[^\d.,]/g, '')
                              .replace(',', '.');
                            const parsedPrice = parseFloat(priceString);
                            if (!isNaN(parsedPrice) && parsedPrice > 0) {
                              unitPrice = parsedPrice;
                            }
                          }

                          const quantity = product.quantity || 1;
                          const totalPrice = unitPrice * quantity;
                          const isSelected = isProductSelected(product.id);

                          return (
                            <div 
                              key={product.id} 
                              className={`group relative border-l-4 rounded-r-lg p-4 transition-all duration-200 shadow-sm hover:shadow-md ${
                                isSelected 
                                  ? 'border-l-green-500 bg-green-50 dark:border-l-green-400 dark:bg-green-900/20 shadow-md' 
                                  : 'border-l-gray-300 bg-white dark:border-l-gray-600 dark:bg-gray-800 hover:border-l-blue-400 dark:hover:border-l-blue-500'
                              }`}
                            >
                              {/* Product Number Badge */}
                              <div className="absolute -left-1 top-2 w-6 h-6 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center text-xs font-bold text-gray-600 dark:text-gray-300 border-2 border-white dark:border-gray-800">
                                {productIndex + 1}
                              </div>
                            <div className="flex items-start justify-between mb-3">
                              <div className="flex items-start gap-3 flex-1">
                                <div className="flex items-center gap-2">
                                  <Checkbox
                                    checked={isSelected}
                                    onCheckedChange={(checked) => selectProduct(product.id, checked as boolean)}
                                    className="data-[state=checked]:bg-green-600 data-[state=checked]:border-green-600 h-4 w-4 mt-1"
                                  />
                                </div>

                                <div className="flex-1">
                                  <div className="flex items-center justify-between mb-1">
                                    <h4 className="font-medium text-gray-900 dark:text-white">
                                      {product.model && product.model.trim() && product.model !== 'Produto sem nome' 
                                        ? product.model 
                                        : 'Produto não identificado'}
                                    </h4>
                                    <div className="flex items-center gap-1 bg-blue-50 dark:bg-blue-900/20 px-2 py-1 rounded-full">
                                      <Calendar className="h-3 w-3 text-blue-600 dark:text-blue-400" />
                                      <span className="text-xs font-medium text-blue-700 dark:text-blue-300">
                                        {(() => {
                                          // Try different date fields in priority order
                                          const dateStr = product.createdAt || product.dateAdded || product.created_at;
                                          if (!dateStr) {
                                            console.warn('No date found for product:', product);
                                            return 'Data não disponível';
                                          }

                                          const date = new Date(dateStr);
                                          if (isNaN(date.getTime())) {
                                            console.warn('Invalid date for product:', dateStr, product);
                                            return 'Data inválida';
                                          }

                                          return date.toLocaleDateString('pt-BR', {
                                            day: '2-digit',
                                            month: '2-digit'
                                          });
                                        })()}
                                      </span>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                                    {product.brand && product.brand.trim() && product.brand !== 'Marca não informada' && (
                                      <span className="flex items-center gap-1">
                                        <Tag className="h-3 w-3" />
                                        {product.brand}
                                      </span>
                                    )}
                                    {product.storage && product.storage.trim() && product.storage !== 'Não informado' && (
                                      <span className="flex items-center gap-1">
                                        <HardDrive className="h-3 w-3" />
                                        {product.storage}
                                      </span>
                                    )}
                                    {product.color && product.color.trim() && product.color !== 'Não informado' && (
                                      <span className="flex items-center gap-1">
                                        <Palette className="h-3 w-3" />
                                        {product.color}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleRemoveItem(product.id)}
                                disabled={isLoading}
                                className="opacity-0 group-hover:opacity-100 transition-opacity text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>

                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-6">
                                <div>
                                  <div className="text-sm text-gray-500 dark:text-gray-400">Preço unitário</div>
                                  <div className="font-semibold text-gray-900 dark:text-white">
                                    {formatPrice(unitPrice)}
                                  </div>
                                </div>

                                <div>
                                  <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">Quantidade</div>
                                  <div className="flex items-center gap-2">
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => handleQuantityChange(product.id, Math.max(1, quantity - 1))}
                                      disabled={isLoading || quantity <= 1}
                                      className="h-8 w-8 p-0 border-gray-300 dark:border-gray-600"
                                    >
                                      <Minus className="h-3 w-3" />
                                    </Button>
                                    <span className="min-w-[2rem] text-center font-medium text-gray-900 dark:text-white">
                                      {quantity}
                                    </span>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => handleQuantityChange(product.id, quantity + 1)}
                                      disabled={isLoading}
                                      className="h-8 w-8 p-0 border-gray-300 dark:border-gray-600"
                                    >
                                      <Plus className="h-3 w-3" />
                                    </Button>
                                  </div>
                                </div>

                                <div>
                                  <div className="text-sm text-gray-500 dark:text-gray-400">Data de Adição</div>
                                  <div className="text-sm font-medium text-gray-900 dark:text-white">
                                    {(() => {
                                      // Try different date fields in priority order
                                      const dateStr = product.createdAt || product.dateAdded || product.created_at;
                                      if (!dateStr) {
                                        console.warn('No date found for product:', product);
                                        return 'Data não disponível';
                                      }

                                      const date = new Date(dateStr);
                                      if (isNaN(date.getTime())) {
                                        console.warn('Invalid date for product:', dateStr, product);
                                        return 'Data inválida';
                                      }

                                      return date.toLocaleDateString('pt-BR', {
                                        day: '2-digit',
                                        month: '2-digit',
                                        year: 'numeric',
                                        hour: '2-digit',
                                        minute: '2-digit'
                                      });
                                    })()}
                                  </div>
                                </div>
                              </div>

                              <div className="text-right">
                                <div className="text-sm text-gray-500 dark:text-gray-400">Total</div>
                                <div className="text-lg font-semibold text-gray-900 dark:text-white">
                                  {formatPrice(totalPrice)}
                                </div>
                              </div>
                            </div>

                            {/* Margin Input Component */}
                            <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
                              <MarginInput
                                itemId={product.id}
                                supplierPrice={unitPrice}
                                initialMarginValue={product.marginValue}
                                initialMarginType={product.marginType}
                                initialSalesPrice={product.salesPrice}
                                onMarginChange={(marginValue, marginType, salesPrice) => {
                                  console.log(`💰 [MARGIN-CHANGE] Item ${product.id} updated:`, { marginValue, marginType, salesPrice });
                                  // Refetch data to show updated prices
                                  setTimeout(() => refetch(), 500);
                                }}
                              />
                            </div>

                            {(product.category || product.region) && (
                              <div className="flex items-center gap-4 mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
                                {product.category && (
                                  <Badge variant="secondary" className="text-xs">
                                    {product.category}
                                  </Badge>
                                )}
                                {product.region && (
                                  <span className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                                    <MapPin className="h-3 w-3" />
                                    {product.region}
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}


      </div>
    </div>
  );
};

export default InterestList;