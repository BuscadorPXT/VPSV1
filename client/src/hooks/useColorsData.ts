
import { useQuery } from '@tanstack/react-query';

export function useColorsData() {
  return useQuery<string[]>({
    queryKey: ['colors'],
    queryFn: async () => {
      const response = await fetch('/api/products/colors', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch colors');
      }
      
      return response.json();
    },
    staleTime: 60 * 60 * 1000, // ✅ OTIMIZAÇÃO: 1 hora - cores são dados estáticos
    gcTime: 120 * 60 * 1000, // 2 horas
    refetchInterval: false, // ✅ Desabilitado - dados estáticos
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });
}
