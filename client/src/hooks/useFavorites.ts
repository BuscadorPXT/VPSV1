import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';

export interface Favorite {
  id: number;
  productName: string;
  model: string;
  storage: string;
  color: string;
  targetPrice: number;
  currentPrice: number;
  supplier: string;
  createdAt: string;
}

export function useFavorites() {
  return useQuery({
    queryKey: ['/api/favorites'],
    queryFn: () => apiRequest('/api/favorites'),
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

export function useToggleFavorite() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (productData: Partial<Favorite>) => 
      apiRequest('/api/favorites/toggle', {
        method: 'POST',
        body: JSON.stringify(productData),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/favorites'] });
    },
  });
}