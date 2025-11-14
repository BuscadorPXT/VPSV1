import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';

export interface Supplier {
  id: number;
  name: string;
  active: boolean;
  average_rating: number;
  rating_count: number;
  created_at: string;
  updated_at: string;
}

export interface SupplierWithRatings extends Supplier {
  averageRating: string;
  ratingCount: number;
}

export function useSupplierData() {
  return useQuery<{ suppliers: Supplier[] }>({
    queryKey: ['suppliers', 'database'],
    queryFn: () => apiRequest('/api/suppliers/database'),
    // ⚡ PERFORMANCE: Cache agressivo - dados de fornecedores mudam raramente
    staleTime: 30 * 60 * 1000, // 30 minutos (era 5min)
    gcTime: 60 * 60 * 1000, // 1 hora
    refetchInterval: false, // ✅ Desabilitado - economiza recursos (era 10min)
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    select: (data) => ({
      suppliers: data.suppliers.map(supplier => ({
        ...supplier,
        averageRating: supplier.average_rating.toString(),
        ratingCount: supplier.rating_count
      }))
    })
  });
}

export function useSupplierLookup(): Map<string, any> {
  const [supplierMap, setSupplierMap] = useState<Map<string, any>>(new Map());

  const { data } = useQuery({
    queryKey: ['/api/suppliers/with-ratings'],
    queryFn: async () => {
      console.log('🏪 Fetching suppliers data (lazy load)...');
      const headers = await getAuthHeaders();
      const response = await fetch('/api/suppliers/with-ratings', { headers });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      console.log('✅ Suppliers data loaded:', result.suppliers?.length || 0, 'suppliers');
      return result;
    },
    staleTime: 30 * 60 * 1000, // 30 minutes - cache mais agressivo
    gcTime: 2 * 60 * 60 * 1000, // 2 hours
    retry: 1,
    refetchOnWindowFocus: false,
    refetchInterval: false,
    refetchOnReconnect: false,
    // 🚀 LAZY LOADING: Delay inicial para não bloquear carregamento crítico
    enabled: true,
    notifyOnChangeProps: ['data', 'error'],
    structuralSharing: false,
  });

  useEffect(() => {
    if (data?.suppliers) {
      const newMap = new Map();
      data.suppliers.forEach((supplier: any) => {
        newMap.set(supplier.name, supplier);
      });
      setSupplierMap(newMap);
      console.log('🗺️ Supplier lookup map updated:', newMap.size, 'entries');
    }
  }, [data]);

  return supplierMap;
}