// Product types for the ExcelStylePriceList component
export interface Product {
  id?: number;
  model: string;
  brand: string;
  storage: string;
  color: string;
  category?: string;
  capacity?: string;
  region?: string;
  date?: string;
  supplier: string | { id: number; name: string; averageRating?: string; ratingCount?: number } | any;
  supplierName?: string;
  price: number | string;
  preco?: number | string;
  sku?: string;
  available?: boolean;
  isLowestPrice?: boolean;
  sheetRowId?: string;
  ultimaAtualizacao?: string | Date;
  searchVector?: string;
  createdAt?: string | Date;
  updatedAt?: string | Date;
  [key: string]: any; // Allow additional properties
}

export interface Supplier {
  id: number;
  name: string;
  active?: boolean;
  averageRating?: string;
  ratingCount?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface FilterState {
  search: string;
  date: string;
  suppliers: string[];
  categories: string[];
  colors: string[];
  storages: string[];
  regions: string[];
  capacity: string[];
  supplierId: string;
  supplierIds: number[];
  brandCategory: string;
}

export interface SortConfig {
  field: string;
  direction: 'asc' | 'desc';
}

export interface ExcelStylePriceListProps {
  userPlan?: string;
  isAdmin?: boolean;
  role?: string;
  searchFilter?: string;
  dateFilter?: string;
  onFiltersReset?: () => void;
  onDateFilterChange?: (date: string) => void;
  availableDates?: string[];
  datesLoading?: boolean;
  className?: string;
  loadingPhase?: string;
}

export type SortField = 'price' | 'model' | 'brand' | 'supplier' | 'ultimaAtualizacao' | 'storage' | 'color' | string;
export type SortDirection = 'asc' | 'desc';