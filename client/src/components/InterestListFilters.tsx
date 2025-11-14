
import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { 
  Search, 
  Filter, 
  SortAsc, 
  SortDesc, 
  Calendar,
  DollarSign,
  Package,
  Users
} from 'lucide-react';

interface FilterState {
  search: string;
  priceRange: [number, number];
  suppliers: string[];
  categories: string[];
  dateRange: [Date | null, Date | null];
  sortBy: 'name' | 'price' | 'date' | 'supplier';
  sortOrder: 'asc' | 'desc';
}

interface InterestListFiltersProps {
  filters: FilterState;
  onFiltersChange: (filters: FilterState) => void;
  availableSuppliers: string[];
  availableCategories: string[];
  priceRange: [number, number];
}

export const InterestListFilters: React.FC<InterestListFiltersProps> = ({
  filters,
  onFiltersChange,
  availableSuppliers,
  availableCategories,
  priceRange
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const updateFilters = (updates: Partial<FilterState>) => {
    onFiltersChange({ ...filters, ...updates });
  };

  const clearFilters = () => {
    onFiltersChange({
      search: '',
      priceRange: priceRange,
      suppliers: [],
      categories: [],
      dateRange: [null, null],
      sortBy: 'date',
      sortOrder: 'desc'
    });
  };

  const hasActiveFilters = 
    filters.search ||
    filters.suppliers.length > 0 ||
    filters.categories.length > 0 ||
    filters.priceRange[0] !== priceRange[0] ||
    filters.priceRange[1] !== priceRange[1] ||
    filters.dateRange[0] ||
    filters.dateRange[1];

  const toggleSupplier = (supplier: string) => {
    const newSuppliers = filters.suppliers.includes(supplier)
      ? filters.suppliers.filter(s => s !== supplier)
      : [...filters.suppliers, supplier];
    updateFilters({ suppliers: newSuppliers });
  };

  const toggleCategory = (category: string) => {
    const newCategories = filters.categories.includes(category)
      ? filters.categories.filter(c => c !== category)
      : [...filters.categories, category];
    updateFilters({ categories: newCategories });
  };

  return (
    <Card className="mb-4">
      <CardContent className="p-4">
        <div className="space-y-4">
          {/* Linha superior: Busca e controles principais */}
          <div className="flex items-center gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Buscar produtos..."
                value={filters.search}
                onChange={(e) => updateFilters({ search: e.target.value })}
                className="pl-10"
              />
            </div>
            
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsExpanded(!isExpanded)}
                className="flex items-center gap-2"
              >
                <Filter className="h-4 w-4" />
                Filtros
                {hasActiveFilters && (
                  <Badge variant="destructive" className="ml-1 px-1 text-xs">
                    !
                  </Badge>
                )}
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => updateFilters({ 
                  sortOrder: filters.sortOrder === 'asc' ? 'desc' : 'asc' 
                })}
                className="flex items-center gap-2"
              >
                {filters.sortOrder === 'asc' ? <SortAsc className="h-4 w-4" /> : <SortDesc className="h-4 w-4" />}
                Ordenar
              </Button>

              {hasActiveFilters && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearFilters}
                  className="text-red-600 hover:text-red-700"
                >
                  Limpar
                </Button>
              )}
            </div>
          </div>

          {/* Filtros expandidos */}
          {isExpanded && (
            <div className="space-y-4 pt-4 border-t border-gray-100 dark:border-gray-700">
              {/* Ordenação */}
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                  Ordenar por:
                </label>
                <div className="flex gap-2">
                  {[
                    { value: 'name', label: 'Nome', icon: Package },
                    { value: 'price', label: 'Preço', icon: DollarSign },
                    { value: 'date', label: 'Data', icon: Calendar },
                    { value: 'supplier', label: 'Fornecedor', icon: Users }
                  ].map(({ value, label, icon: Icon }) => (
                    <Button
                      key={value}
                      variant={filters.sortBy === value ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => updateFilters({ sortBy: value as any })}
                      className="flex items-center gap-2"
                    >
                      <Icon className="h-4 w-4" />
                      {label}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Filtro por fornecedor */}
              {availableSuppliers.length > 0 && (
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                    Fornecedores:
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {availableSuppliers.slice(0, 10).map(supplier => (
                      <Button
                        key={supplier}
                        variant={filters.suppliers.includes(supplier) ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => toggleSupplier(supplier)}
                      >
                        {supplier}
                      </Button>
                    ))}
                    {availableSuppliers.length > 10 && (
                      <Badge variant="secondary" className="px-2 py-1">
                        +{availableSuppliers.length - 10} mais
                      </Badge>
                    )}
                  </div>
                </div>
              )}

              {/* Filtro por categoria */}
              {availableCategories.length > 0 && (
                <div>
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                    Categorias:
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {availableCategories.map(category => (
                      <Button
                        key={category}
                        variant={filters.categories.includes(category) ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => toggleCategory(category)}
                      >
                        {category}
                      </Button>
                    ))}
                  </div>
                </div>
              )}

              {/* Filtro por faixa de preço */}
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                  Faixa de Preço:
                </label>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <span className="text-sm">Min:</span>
                    <Input
                      type="number"
                      value={filters.priceRange[0]}
                      onChange={(e) => updateFilters({ 
                        priceRange: [Number(e.target.value), filters.priceRange[1]] 
                      })}
                      className="w-24"
                      min={0}
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm">Max:</span>
                    <Input
                      type="number"
                      value={filters.priceRange[1]}
                      onChange={(e) => updateFilters({ 
                        priceRange: [filters.priceRange[0], Number(e.target.value)] 
                      })}
                      className="w-24"
                      min={0}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export type { FilterState };
