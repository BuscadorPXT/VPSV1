import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { PriceHistoryData, PriceHistoryQuery } from '../../../shared/priceHistoryTypes';

export interface PriceMonitorData {
  productId: number;
  currentPrice: number;
  targetPrice: number;
  priceHistory: Array<{
    price: number;
    timestamp: string;
  }>;
}

export function usePriceMonitoring(productId?: number) {
  return useQuery({
    queryKey: ['/api/price-monitoring', productId],
    queryFn: () => apiRequest(`/api/price-monitoring${productId ? `/${productId}` : ''}`),
    enabled: !!productId,
    staleTime: 1000 * 60 * 2, // 2 minutes
  });
}

// Enhanced hook for price history with caching and debouncing
export function usePriceHistory(query: PriceHistoryQuery) {
  return useQuery({
    queryKey: ['price-history', query],
    queryFn: async () => {
      if (!query.model || !query.supplier) {
        return null;
      }

      console.log('🔍 Fetching price history for:', query);

      const params = new URLSearchParams();
      if (query.model) params.append('model', query.model);
      if (query.supplier) params.append('supplier', query.supplier);
      if (query.storage) params.append('storage', query.storage);
      if (query.color) params.append('color', query.color);
      if (query.productId) params.append('productId', query.productId.toString());

      const response = await fetch(`/api/price-history?${params}`);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Price history fetch failed:', response.status, errorText);
        throw new Error(`Failed to fetch price history: ${response.status}`);
      }

      const result = await response.json();
      console.log('📊 Price history result:', result);
      console.log('📊 Price history data structure:', {
        hasData: !!result,
        hasPriceHistory: !!(result && result.priceHistory),
        priceHistoryLength: result?.priceHistory?.length || 0,
        dataKeys: result ? Object.keys(result) : []
      });

      return result;
    },
    enabled: !!(query.model && query.supplier),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
    retry: 2,
    retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000)
  });
}