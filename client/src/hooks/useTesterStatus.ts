import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';

interface TesterStatusResponse {
  isTester: boolean;
  isActive: boolean;
  daysRemaining: number;
}

export function useTesterStatus() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['tester-status'],
    queryFn: async (): Promise<TesterStatusResponse> => {
      try {
        const response = await apiClient.get('/api/user/tester-status');
        console.log('📊 Tester status response:', response.data);
        return response.data;
      } catch (err) {
        console.warn('Failed to fetch tester status:', err);
        // 🔧 NOVO FALLBACK: Em caso de erro, permitir acesso (assumir não-tester)
        // Para evitar bloquear usuários legítimos em caso de problemas de rede
        return {
          isTester: false,
          isActive: true,
          daysRemaining: 999
        };
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutos - reduzir consultas
    gcTime: 15 * 60 * 1000, // 15 minutos
    refetchOnWindowFocus: false, // Evitar refetch desnecessário
    refetchOnMount: true,
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
    // Refetch apenas quando realmente necessário
    refetchInterval: 10 * 60 * 1000 // 10 minutos
  });

  // 🔧 NOVO COMPORTAMENTO: Durante loading, permitir acesso temporariamente
  // Apenas bloquear quando confirmarmos que é tester
  const testerStatus = data || {
    isTester: false, // Assumir não-tester durante loading/erro
    isActive: true,
    daysRemaining: 999
  };

  return {
    testerStatus,
    loading: isLoading,
    error
  };
}