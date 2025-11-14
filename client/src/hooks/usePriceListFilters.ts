
import { useState, useCallback } from 'react';
import { FilterState, SortField, SortDirection } from '../types/productTypes';

const initialFilters: FilterState = {
  search: '',
  brand: '',
  storage: '',
  color: '',
  category: '',
  capacity: '',
  region: '',
  date: '',
  supplier: '',
  minPrice: '',
  maxPrice: '',
  availability: '',
  isLowestPrice: false
};

export function usePriceListFilters() {
  const [filters, setFilters] = useState<FilterState>(initialFilters);
  const [page, setPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(50);
  const [sortField, setSortField] = useState<SortField>('ultimaAtualizacao');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  const updateFilter = useCallback((key: keyof FilterState, value: string | boolean) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }));
    setPage(1); // Reset to first page when filters change
  }, []);

  const clearFilters = useCallback(() => {
    setFilters(initialFilters);
    setPage(1);
  }, []);

  const handleSort = useCallback((field: SortField) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  }, [sortField]);

  const resetPagination = useCallback(() => {
    setPage(1);
  }, []);

  return {
    filters,
    page,
    itemsPerPage,
    sortField,
    sortDirection,
    updateFilter,
    clearFilters,
    setPage,
    setItemsPerPage,
    handleSort,
    resetPagination
  };
}
