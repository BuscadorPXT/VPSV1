
import { useState, useEffect, useMemo } from 'react';
import { Product } from '../types/productTypes';
import { useDebounce } from './use-debounce';

export function useSearchSuggestions(products: Product[], searchTerm: string, selectedDate?: string) {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  // Sugestões locais baseadas nos produtos carregados
  const localSuggestions = useMemo(() => {
    if (!debouncedSearchTerm.trim() || debouncedSearchTerm.length < 2) {
      return [];
    }

    const term = debouncedSearchTerm.toLowerCase();
    const suggestionMap = new Map<string, number>();

    // Filtrar produtos pela data selecionada se necessário
    const filteredProducts = selectedDate && selectedDate !== 'all' 
      ? products.filter(p => p.date === selectedDate)
      : products;

    filteredProducts.forEach(product => {
      const model = product.model?.toLowerCase() || '';
      const brand = product.brand?.toLowerCase() || '';
      
      // Priorizar matches exatos no início do modelo
      if (model.startsWith(term)) {
        suggestionMap.set(product.model, (suggestionMap.get(product.model) || 0) + 3);
      } else if (model.includes(term)) {
        suggestionMap.set(product.model, (suggestionMap.get(product.model) || 0) + 2);
      }
      
      // Buscar também na marca
      if (brand.startsWith(term)) {
        suggestionMap.set(product.brand, (suggestionMap.get(product.brand) || 0) + 2);
      } else if (brand.includes(term)) {
        suggestionMap.set(product.brand, (suggestionMap.get(product.brand) || 0) + 1);
      }
    });

    // Retornar top 6 sugestões ordenadas por relevância
    return Array.from(suggestionMap.entries())
      .sort(([, scoreA], [, scoreB]) => scoreB - scoreA)
      .slice(0, 6)
      .map(([suggestion]) => suggestion);
  }, [products, debouncedSearchTerm, selectedDate]);

  const hideSuggestions = () => setShowSuggestions(false);
  const showSuggestionsDropdown = () => setShowSuggestions(true);

  useEffect(() => {
    if (localSuggestions.length > 0 && debouncedSearchTerm.length >= 2) {
      setShowSuggestions(true);
    } else {
      setShowSuggestions(false);
    }
  }, [localSuggestions, debouncedSearchTerm]);

  return {
    suggestions: localSuggestions,
    showSuggestions,
    hideSuggestions,
    showSuggestionsDropdown,
    isLoading
  };
}
