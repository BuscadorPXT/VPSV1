
import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { X, Filter, Hash } from 'lucide-react';
import { useSmartFilters, SmartFilterOption } from '@/hooks/use-smart-filters';

interface CompactFiltersProps {
  searchTerm?: string;
  currentProducts?: any[];
  onFilterChange?: (filters: Record<string, string>) => void;
  className?: string;
}

export function CompactFilters({ 
  searchTerm, 
  currentProducts, 
  onFilterChange,
  className = "" 
}: CompactFiltersProps) {
  const { 
    activeFilters, 
    updateFilter, 
    clearNonDateFilters,
    dynamicFilters,
    isLoadingFilters
  } = useSmartFilters(searchTerm, currentProducts);

  React.useEffect(() => {
    if (onFilterChange) {
      onFilterChange(activeFilters);
    }
  }, [activeFilters, onFilterChange]);

  console.log('📊 CompactFilters props:', { 
    searchTerm, 
    currentProductsCount: currentProducts?.length || 0,
    hasSearchTerm: !!searchTerm,
    dynamicFilters: !!dynamicFilters,
    isLoadingFilters
  });

  // Só não mostrar filtros se não há produtos disponíveis
  if (!currentProducts || currentProducts.length === 0) {
    console.log('🚫 CompactFilters: Não renderizando - sem produtos');
    return null;
  }

  // Não mostrar se ainda está carregando e não há produtos locais
  if (isLoadingFilters && !currentProducts) {
    return (
      <div className={`flex items-center gap-2 text-sm text-gray-500 ${className}`}>
        <Filter className="h-4 w-4 animate-pulse" />
        <span>Carregando filtros...</span>
      </div>
    );
  }

  // Não mostrar se não há filtros dinâmicos
  if (!dynamicFilters) {
    console.log('🚫 CompactFilters: Não renderizando - sem filtros dinâmicos');
    return null;
  }
  
  console.log('📊 CompactFilters: Renderizando filtros', {
    totalProducts: dynamicFilters.totalProducts,
    categoriesCount: dynamicFilters.categories?.length,
    brandsCount: dynamicFilters.brands?.length,
    colorsCount: dynamicFilters.colors?.length
  });

  const hasActiveNonDateFilters = Object.keys(activeFilters).some(key => 
    key !== 'date' && activeFilters[key]
  );

  const renderFilterSelect = (
    label: string,
    filterKey: string,
    options: SmartFilterOption[],
    icon?: React.ReactNode
  ) => {
    if (!options || options.length === 0) return null;

    // Apenas mostrar se há mais de uma opção ou se é o filtro ativo
    if (options.length === 1 && !activeFilters[filterKey]) return null;

    return (
      <div className="flex items-center gap-2">
        {icon}
        <Select
          value={activeFilters[filterKey] || ''}
          onValueChange={(value) => updateFilter(filterKey, value)}
        >
          <SelectTrigger className="w-auto min-w-[120px] h-8 text-xs">
            <SelectValue placeholder={label} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">Todos</SelectItem>
            {options.slice(0, 10).map((option) => (
              <SelectItem key={option.value} value={option.value}>
                <div className="flex items-center justify-between w-full">
                  <span>{option.label}</span>
                  {option.count && (
                    <Badge variant="secondary" className="ml-2 text-xs">
                      {option.count}
                    </Badge>
                  )}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    );
  };

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Cabeçalho com informações da busca */}
      {searchTerm && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Filter className="h-4 w-4" />
            <span>Filtros para: <strong>"{searchTerm}"</strong></span>
            {dynamicFilters.totalProducts !== undefined && (
              <Badge variant="outline" className="text-xs">
                <Hash className="h-3 w-3 mr-1" />
                {dynamicFilters.totalProducts} produtos
              </Badge>
            )}
          </div>
          
          {hasActiveNonDateFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearNonDateFilters}
              className="text-xs h-7"
            >
              <X className="h-3 w-3 mr-1" />
              Limpar filtros
            </Button>
          )}
        </div>
      )}

      {/* Filtros dinâmicos */}
      <div className="flex flex-wrap items-center gap-3">
        {renderFilterSelect("Categoria", "category", dynamicFilters.categories)}
        {renderFilterSelect("Marca", "brand", dynamicFilters.brands)}
        {renderFilterSelect("Cor", "color", dynamicFilters.colors)}
        {renderFilterSelect("Armazenamento", "storage", dynamicFilters.storages)}
        {renderFilterSelect("Região", "region", dynamicFilters.regions)}
      </div>

      {/* Badges dos filtros ativos */}
      {hasActiveNonDateFilters && (
        <div className="flex flex-wrap gap-2">
          {Object.entries(activeFilters).map(([key, value]) => {
            if (key === 'date' || !value) return null;
            
            const labels: Record<string, string> = {
              category: 'Categoria',
              brand: 'Marca', 
              color: 'Cor',
              storage: 'Armazenamento',
              region: 'Região'
            };

            return (
              <Badge key={key} variant="secondary" className="text-xs">
                {labels[key]}: {value}
                <button
                  onClick={() => updateFilter(key, '')}
                  className="ml-1 hover:text-red-600"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            );
          })}
        </div>
      )}
    </div>
  );
}
