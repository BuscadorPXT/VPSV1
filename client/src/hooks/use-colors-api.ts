import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';

export interface ColorOption {
  value: string;
  available: boolean;
}

interface UseColorsApiOptions {
  date?: string;
  category?: string;
  search?: string;
  storage?: string;
  capacity?: string;
  enabled?: boolean;
}

export function useColorsApi(options: UseColorsApiOptions = {}) {
  const { date = '07-06', category, search, storage, capacity, enabled = true } = options;
  
  // Build query parameters
  const params = new URLSearchParams();
  if (date && date !== 'all') {
    params.append('date', date);
  }
  if (category && category !== 'all') {
    params.append('category', category);
  }
  if (search && search.trim().length >= 2) {
    params.append('model', search.trim());
  }
  if (storage && storage !== 'all') {
    params.append('storage', storage);
  }
  if (capacity && capacity !== 'all') {
    params.append('capacity', capacity);
  }
  
  const queryString = params.toString();
  const url = `/api/products/colors${queryString ? `?${queryString}` : ''}`;
  
  return useQuery({
    queryKey: ['/api/products/colors', { date, category, search, storage, capacity }],
    queryFn: () => apiRequest(url),
    enabled: enabled && !!date,
    staleTime: 1000 * 60 * 5, // 5 minutes
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
}