import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';

// Initial data structure to show UI immediately
const initialStats = {
  totalProducts: 0,
  availableProducts: 0,
  suppliers: 0,
};

const initialProducts = {
  products: [],
  total: 0,
  page: 1,
  limit: 20,
};

const initialFilters = {
  categories: [],
  capacities: [],
  regions: [],
  dates: [],
  suppliers: [],
};

export function useInitialData() {
  const queryClient = useQueryClient();

  useEffect(() => {
    // Set initial data to prevent loading states
    queryClient.setQueryData(['/api/stats'], initialStats);
    queryClient.setQueryData(['/api/products'], initialProducts);
    queryClient.setQueryData(['/api/categories'], initialFilters.categories);
    queryClient.setQueryData(['/api/capacities'], initialFilters.capacities);
    queryClient.setQueryData(['/api/regions'], initialFilters.regions);
    queryClient.setQueryData(['/api/dates'], initialFilters.dates);
    queryClient.setQueryData(['/api/suppliers'], initialFilters.suppliers);
  }, [queryClient]);
}