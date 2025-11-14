
import { useQuery } from '@tanstack/react-query';

export function useStorageOptionsData() {
  return useQuery<string[]>({
    queryKey: ['storage-options'],
    queryFn: async () => {
      const response = await fetch('/api/products/storage-options', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch storage options');
      }
      
      return response.json();
    },
    staleTime: 60 * 60 * 1000, // ✅ OTIMIZAÇÃO: 1 hora - storage options são dados estáticos
    gcTime: 120 * 60 * 1000, // 2 horas
    refetchInterval: false, // ✅ Desabilitado - dados estáticos
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });
}
