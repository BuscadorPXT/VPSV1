import { useQuery } from '@tanstack/react-query';

export function useDatesData() {
  return useQuery({
    queryKey: ['/api/products/dates'],
    queryFn: async () => {
      console.log('📅 Fetching available dates (cached)...');
      const response = await fetch('/api/products/dates');
      if (!response.ok) {
        console.error('❌ Error fetching dates:', response.status, response.statusText);
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const result = await response.json();
      console.log('✅ Dates loaded:', result.dates?.length || 0, 'dates', result.dates);
      return result.dates || [];
    },
    staleTime: 2 * 60 * 60 * 1000, // 2 hours - cache ultra-agressivo
    gcTime: 24 * 60 * 60 * 1000, // 24 hours
    retry: 0, // Não retry - dados de datas são estáveis
    refetchOnWindowFocus: false,
    refetchInterval: false,
    refetchOnReconnect: false,
    refetchOnMount: false, // Nunca refetch se tem cache
    notifyOnChangeProps: ['data', 'error'],
    structuralSharing: false,
  });
}