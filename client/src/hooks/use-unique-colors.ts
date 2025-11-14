import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';

interface UseUniqueColorsOptions {
  date?: string;
  enabled?: boolean;
}

export function useUniqueColors(options: UseUniqueColorsOptions = {}) {
  const { date, enabled = true } = options;
  
  // Build query parameters
  const params = new URLSearchParams();
  if (date && date !== 'all') {
    params.append('date', date);
  }
  
  const queryString = params.toString();
  const url = `/api/colors/unique${queryString ? `?${queryString}` : ''}`;
  
  return useQuery({
    queryKey: ['/api/colors/unique', { date }],
    queryFn: async () => {
      const sessionToken = localStorage.getItem('sessionToken');
      if (!sessionToken) {
        throw new Error('Authentication required');
      }

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${sessionToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch colors: ${response.status}`);
      }

      const data = await response.json();
      return Array.isArray(data) ? data : [];
    },
    enabled: enabled,
    staleTime: 1000 * 60 * 5, // 5 minutes
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
}