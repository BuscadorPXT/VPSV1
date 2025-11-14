import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getAuthHeaders } from '@/lib/auth-api';

export interface SmartFilterOption {
  value: string;
  label: string;
  count?: number;
}

export interface DynamicFilters {
  categories: SmartFilterOption[];
  brands: SmartFilterOption[];
  colors: SmartFilterOption[];
  storages: SmartFilterOption[];
  regions: SmartFilterOption[];
}

export function useSmartFilters(searchTerm?: string, currentProducts?: any[]) {
  const [activeFilters, setActiveFilters] = useState<Record<string, string>>({});

  // Buscar datas disponíveis
  const { data: availableDates } = useQuery({
    queryKey: ['available-dates'],
    queryFn: async () => {
      const headers = await getAuthHeaders();
      const res = await fetch('/api/products/available-dates', { headers });
      if (!res.ok) throw new Error('Failed to fetch available dates');
      const data = await res.json();
      return data.availableDates || [];
    },
    staleTime: 5 * 60 * 1000, // Cache por 5 minutos
  });

  // Buscar filtros dinâmicos baseados na busca
  const { data: dynamicFilters } = useQuery({
    queryKey: ['dynamic-filters', searchTerm, activeFilters.date],
    queryFn: async () => {
      const headers = await getAuthHeaders();
      const params = new URLSearchParams();

      if (searchTerm && searchTerm.trim()) {
        params.append('search', searchTerm.trim());
      }
      if (activeFilters.date && activeFilters.date !== 'all') {
        params.append('date', activeFilters.date);
      }

      console.log('🔍 Buscando filtros dinâmicos baseados na busca:', { searchTerm, date: activeFilters.date, params: params.toString() });

      const res = await fetch(`/api/filters/dynamic?${params.toString()}`, { headers });
      if (!res.ok) throw new Error('Failed to fetch dynamic filters');
      const data = await res.json();

      console.log('📊 Filtros dinâmicos recebidos (baseados na busca):', {
        searchTerm,
        totalProducts: data.totalProducts,
        categories: data.categories?.length || 0,
        brands: data.brands?.length || 0,
        colors: data.colors?.length || 0
      });

      return data;
    },
    enabled: true,
    staleTime: 30 * 1000, // Cache reduzido para 30 segundos para melhor reatividade
  });

  // Aplicar filtro de busca nos produtos antes de gerar filtros
  const applySearchFilter = (products: any[], searchTerm: string): any[] => {
    if (!searchTerm || searchTerm.trim().length === 0) {
      return products;
    }

    const searchLower = searchTerm.toLowerCase().trim();

    // Exact iPhone pattern matching to prevent cross-contamination
    const iphoneMatch = searchLower.match(/^iphone\s*(\d+)([a-z]*)?(\s+pro)?(\s+max|\s+plus|\s+mini)?$/i);

    return products.filter(product => {
      const productModel = (product.model || '').toLowerCase();
      const productBrand = (product.brand || '').toLowerCase();
      const productCategory = (product.category || '').toLowerCase();
      const supplierName = typeof product.supplier === 'string' ? 
        product.supplier.toLowerCase() : 
        (product.supplier?.name || product.supplierName || '').toLowerCase();

      if (iphoneMatch) {
          const number = iphoneMatch[1];
          const variant = iphoneMatch[2] || '';
          const pro = iphoneMatch[3] || '';
          const size = iphoneMatch[4] || '';

          // Must be iPhone category
          if (product.category !== 'IPH' && !productModel.includes('iphone')) {
            return false;
          }

          // Build exact pattern for iPhone search with strict matching
          let exactPattern = `^iphone\\s*${number}`;
          if (variant) exactPattern += variant;
          if (pro) exactPattern += '\\s*pro';
          if (size) {
            const sizeNormalized = size.trim().toLowerCase();
            if (sizeNormalized.includes('plus')) {
              exactPattern += '\\s*plus';
            } else if (sizeNormalized.includes('max')) {
              exactPattern += '\\s*max';
            } else if (sizeNormalized.includes('mini')) {
              exactPattern += '\\s*mini';
            }
          }

          // Add negative lookahead to prevent matching longer variants
          // For example: searching "iphone 15" should not match "iphone 15 pro"
          if (!pro && !size) {
            exactPattern += '(?!\\s*(pro|max|plus|mini))';
          } else if (pro && !size) {
            exactPattern += '(?!\\s*(max|plus))';
          }

          exactPattern += '(?:\\s|$)';
          const exactRegex = new RegExp(exactPattern, 'i');
          return exactRegex.test(productModel);
        }

      // Basic text search across key fields for other products
      return productModel.includes(searchLower) || 
             productBrand.includes(searchLower) || 
             productCategory.includes(searchLower) ||
             supplierName.includes(searchLower) ||
             (product.color && product.color.toLowerCase().includes(searchLower)) ||
             (product.storage && product.storage.toLowerCase().includes(searchLower));
    });
  };

  // Gerar filtros baseados nos produtos filtrados pela busca
  const generateFiltersFromProducts = (products: any[], searchTerm?: string): DynamicFilters => {
    // Aplicar filtro de busca primeiro
    const filteredProducts = searchTerm ? applySearchFilter(products, searchTerm) : products;

    console.log('🔍 Gerando filtros a partir de produtos filtrados:', {
      originalCount: products.length,
      filteredCount: filteredProducts.length,
      searchTerm
    });

    const categories = new Map<string, number>();
    const brands = new Map<string, number>();
    const colors = new Map<string, number>();
    const storages = new Map<string, number>();
    const regions = new Map<string, number>();

    filteredProducts.forEach(product => {
      if (product.category) {
        categories.set(product.category, (categories.get(product.category) || 0) + 1);
      }
      if (product.brand) {
        brands.set(product.brand, (brands.get(product.brand) || 0) + 1);
      }
      if (product.color) {
        colors.set(product.color, (colors.get(product.color) || 0) + 1);
      }
      if (product.storage || product.capacity) {
        const storage = product.storage || product.capacity;
        storages.set(storage, (storages.get(storage) || 0) + 1);
      }
      if (product.region) {
        regions.set(product.region, (regions.get(product.region) || 0) + 1);
      }
    });

    return {
      categories: Array.from(categories.entries()).map(([value, count]) => ({ value, label: value, count })),
      brands: Array.from(brands.entries()).map(([value, count]) => ({ value, label: value, count })),
      colors: Array.from(colors.entries()).map(([value, count]) => ({ value, label: value, count })),
      storages: Array.from(storages.entries()).map(([value, count]) => ({ value, label: value, count })),
      regions: Array.from(regions.entries()).map(([value, count]) => ({ value, label: value, count }))
    };
  };

  // Usar filtros dinâmicos ou gerar a partir dos produtos disponíveis
  const contextualFilters = dynamicFilters || (currentProducts && currentProducts.length > 0 ? generateFiltersFromProducts(currentProducts, searchTerm) : null);

  const updateFilter = (key: string, value: string) => {
    setActiveFilters(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const clearFilters = () => {
    setActiveFilters({});
  };

  const updateDateFilter = (date: string) => {
    updateFilter('date', date);
  };

  const clearNonDateFilters = () => {
    setActiveFilters(prev => ({
      date: prev.date // Manter apenas o filtro de data
    }));
  };

  // Inicializar com data atual se nenhuma data estiver selecionada
  useEffect(() => {
    if (!activeFilters.date && availableDates && availableDates.length > 0) {
      // Usar a data mais recente disponível
      const today = new Date();
      const todayStr = [
        String(today.getDate()).padStart(2, '0'),
        String(today.getMonth() + 1).padStart(2, '0')
      ].join('-');

      // Se hoje está disponível, usar hoje, senão usar a mais recente
      const dateToUse = availableDates.includes(todayStr) ? todayStr : availableDates[0];
      updateFilter('date', dateToUse);
    }
  }, [availableDates, activeFilters.date]);

  return {
    activeFilters,
    updateFilter,
    clearFilters,
    clearNonDateFilters,
    updateDateFilter,
    availableDates: availableDates || [],
    dynamicFilters: contextualFilters,
    isLoadingFilters: !dynamicFilters && !currentProducts
  };
}