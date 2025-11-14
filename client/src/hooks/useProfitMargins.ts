import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { getAuthHeaders } from '@/lib/auth-api';
import { debugAuthHeaders } from '@/lib/debug-auth';
import { 
  ProfitMarginConfig, 
  UserMargins, 
  CreateMarginRequest, 
  CalculatePricesRequest, 
  CalculatePricesResponse,
  ExtractCategoriesResponse,
  ExtractProductsResponse 
} from '@/types/profit-margins';

interface AvailableCategory {
  name: string;
}

interface AvailableProduct {
  id: string;
  name: string;
  category?: string;
}

const QUERY_KEYS = {
  globalMargin: (userId: string) => ['profit-margins', 'global', userId],
  categoryMargins: (userId: string) => ['profit-margins', 'categories', userId],
  productMargins: (userId: string) => ['profit-margins', 'products', userId],
  allMargins: (userId: string) => ['profit-margins', 'all', userId],
};

export function useProfitMargins(userId?: string) {
  const queryClient = useQueryClient();

  // Buscar margem global
  const {
    data: globalMargin,
    isLoading: globalLoading,
    error: globalError
  } = useQuery({
    queryKey: QUERY_KEYS.globalMargin(userId || ''),
    queryFn: async () => {
      try {
        const headers = await getAuthHeaders();
        const response = await fetch(`/api/profit-margins/global/${userId}`, {
          headers,
        });
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.message || 'Failed to fetch global margin');
        }
        return response.json();
      } catch (error) {
        console.error('Error fetching global margin:', error);
        return { margin: 0 }; // Return default value on error
      }
    },
    enabled: !!userId,
    retry: 2,
    retryDelay: 1000,
  });

  // Buscar margens por categoria
  const {
    data: categoryMargins,
    isLoading: categoriesLoading,
    error: categoriesError
  } = useQuery({
    queryKey: QUERY_KEYS.categoryMargins(userId || ''),
    queryFn: async () => {
      try {
        console.log('🔧 [PROFIT-MARGINS] Fetching category margins for user:', userId);
        const headers = await debugAuthHeaders(); // Use debug version
        const response = await fetch(`/api/profit-margins/categories/${userId}`, {
          headers,
        });
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.message || 'Failed to fetch category margins');
        }
        return response.json();
      } catch (error) {
        console.error('Error fetching category margins:', error);
        return []; // Return empty array on error
      }
    },
    enabled: !!userId,
    retry: 2,
    retryDelay: 1000,
  });

  // Buscar margens por produto
  const {
    data: productMargins,
    isLoading: productsLoading,
    error: productsError
  } = useQuery({
    queryKey: QUERY_KEYS.productMargins(userId || ''),
    queryFn: async () => {
      try {
        const headers = await getAuthHeaders();
        const response = await fetch(`/api/profit-margins/products/${userId}`, {
          headers,
        });
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.message || 'Failed to fetch product margins');
        }
        return response.json();
      } catch (error) {
        console.error('Error fetching product margins:', error);
        return []; // Return empty array on error
      }
    },
    enabled: !!userId,
    retry: 2,
    retryDelay: 1000,
  });

  // Criar/atualizar margem
  const createMarginMutation = useMutation({
    mutationFn: async (data: CreateMarginRequest) => {
      const endpoint = data.type === 'global' ? '/api/profit-margins/global' :
                     data.type === 'category' ? '/api/profit-margins/category' :
                     '/api/profit-margins/product';
      
      return apiRequest(endpoint, {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      if (userId) {
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.globalMargin(userId) });
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.categoryMargins(userId) });
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.productMargins(userId) });
      }
    },
  });

  // Remover margem de categoria
  const removeCategoryMarginMutation = useMutation({
    mutationFn: async (categoryName: string) => {
      return apiRequest(`/api/profit-margins/category/${encodeURIComponent(categoryName)}`, {
        method: 'DELETE',
      });
    },
    onSuccess: () => {
      if (userId) {
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.categoryMargins(userId) });
      }
    },
  });

  // Remover margem de produto
  const removeProductMarginMutation = useMutation({
    mutationFn: async (productId: string) => {
      return apiRequest(`/api/profit-margins/product/${encodeURIComponent(productId)}`, {
        method: 'DELETE',
      });
    },
    onSuccess: () => {
      if (userId) {
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.productMargins(userId) });
      }
    },
  });

  // Calcular preços em lote
  const calculatePricesMutation = useMutation<CalculatePricesResponse, Error, CalculatePricesRequest>({
    mutationFn: async (data: CalculatePricesRequest) => {
      return apiRequest('/api/profit-margins/calculate-prices', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
  });

  // Extrair categorias
  const extractCategoriesMutation = useMutation<ExtractCategoriesResponse, Error, { products: any[] }>({
    mutationFn: async (data) => {
      return apiRequest('/api/profit-margins/extract-categories', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
  });

  // Extrair produtos
  const extractProductsMutation = useMutation<ExtractProductsResponse, Error, { products: any[] }>({
    mutationFn: async (data) => {
      return apiRequest('/api/profit-margins/extract-products', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
  });

  // Aggregated loading state
  const isLoading = globalLoading || categoriesLoading || productsLoading;
  const hasError = globalError || categoriesError || productsError;

  // Combine all margins into UserMargins format
  const allMargins: UserMargins | null = userId ? {
    global: globalMargin?.marginPercentage || 0,
    categories: categoryMargins?.margins || [],
    products: productMargins?.margins || [],
  } : null;

  return {
    // Data
    globalMargin,
    categoryMargins: categoryMargins?.margins || [],
    productMargins: productMargins?.margins || [],
    allMargins,
    
    // Loading states
    isLoading,
    globalLoading,
    categoriesLoading,
    productsLoading,
    
    // Error states
    hasError,
    globalError,
    categoriesError,
    productsError,
    
    // Mutations
    createMargin: createMarginMutation.mutate,
    removeCategoryMargin: removeCategoryMarginMutation.mutate,
    removeProductMargin: removeProductMarginMutation.mutate,
    calculatePrices: calculatePricesMutation.mutate,
    extractCategories: extractCategoriesMutation.mutate,
    extractProducts: extractProductsMutation.mutate,
    
    // Mutation states
    isCreating: createMarginMutation.isPending,
    isRemoving: removeCategoryMarginMutation.isPending || removeProductMarginMutation.isPending,
    isCalculating: calculatePricesMutation.isPending,
    isExtracting: extractCategoriesMutation.isPending || extractProductsMutation.isPending,
    
    // Mutation results
    calculateResult: calculatePricesMutation.data,
    extractCategoriesResult: extractCategoriesMutation.data,
    extractProductsResult: extractProductsMutation.data,
    
    // Error states for mutations
    createError: createMarginMutation.error,
    removeError: removeCategoryMarginMutation.error || removeProductMarginMutation.error,
    calculateError: calculatePricesMutation.error,
    extractError: extractCategoriesMutation.error || extractProductsMutation.error,
  };
}