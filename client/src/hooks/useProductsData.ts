
import { useQuery } from '@tanstack/react-query';
import { Product } from '../types/productTypes';

interface SheetsProductsResponse {
  products: Product[];
  suppliers: string[];
  dates: string[];
  supplierContacts: { [key: string]: { telefone: string; endereco?: string } };
}

export function useProductsData(selectedDate?: string) {
  return useQuery<SheetsProductsResponse>({
    queryKey: ['sheets-products', selectedDate],
    queryFn: async () => {
      console.log('📡 Fetching products (ultra cache)...');
      
      // Try multiple token sources
      const token = localStorage.getItem('authToken') || 
                   localStorage.getItem('firebaseToken') ||
                   sessionStorage.getItem('authToken');

      if (!token) {
        throw new Error('No auth token found');
      }

      // Use the date parameter or default to current date
      const dateParam = selectedDate || 'all';
      const url = `/api/sheets/products?date=${dateParam}`;

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to fetch products from Google Sheets');
      }

      const result = await response.json();
      console.log('✅ Products loaded:', result.products?.length || 0);
      return result;
    },
    staleTime: 10 * 60 * 1000, // ⚡ 10 minutos (era 5min)
    gcTime: 30 * 60 * 1000, // ⚡ 30 minutos (era 15min)
    // ⚡ CRITICAL: Desabilitado polling - WebSocket já fornece atualizações em tempo real!
    refetchInterval: false, // ✅ Desabilitado - economiza ~720 requests/dia por usuário
    refetchOnWindowFocus: false, // ✅ Desabilitado - WebSocket mantém dados atualizados
    refetchOnReconnect: false, // ✅ Desabilitado - cache mantém dados
    refetchOnMount: false, // ✅ Desabilitado - usar cache (era 'always')
    retry: (failureCount, error) => {
      // Retry ultra-conservador
      if (error.message.includes('401') || error.message.includes('403')) {
        return false;
      }
      return failureCount < 1; // Máximo 1 tentativa
    },
    retryDelay: 5000, // 5 segundos de delay
    networkMode: 'online',
    notifyOnChangeProps: ['data', 'error'],
    structuralSharing: false,
    // 🚀 OTIMIZAÇÃO: Configurações especiais para performance
    meta: {
      persist: true, // Persistir no cache
    }
  });
}
