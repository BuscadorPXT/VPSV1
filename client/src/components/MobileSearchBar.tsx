import React, { useState, useRef, useEffect } from 'react';
import { Search, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useIsMobile } from '@/hooks/use-mobile';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

interface MobileSearchBarProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  onSearchComplete?: (value: string) => void; // Callback para quando uma pesquisa é completada
  isSticky?: boolean;
  selectedDate: string; // Data selecionada no calendário
}

interface Suggestion {
  value: string;
  count: number;
}

interface RecentSearch {
  query: string;
  timestamp: number;
}

export function MobileSearchBar({ 
  searchTerm, 
  onSearchChange,
  onSearchComplete,
  isSticky = true,
  selectedDate
}: MobileSearchBarProps) {
  console.log('📱 MobileSearchBar RENDERIZADA:', { 
    searchTerm, 
    selectedDate
  });
  console.log('📱 MobileSearchBar: Component is ACTIVE and rendering');
  console.log('📱 MobileSearchBar: Props received:', JSON.stringify({
    searchTerm,
    selectedDate,
    onSearchChangeType: typeof onSearchChange
  }, null, 2));
  const { safeAreaInsets } = useIsMobile();
  const [isFocused, setIsFocused] = useState(false);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [isLoading, setIsLoading] = useState(false);
  const [recentSearches, setRecentSearches] = useState<RecentSearch[]>([]);
  const [showRecentSearches, setShowRecentSearches] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout>();

  // Funções para gerenciar pesquisas recentes
  const getRecentSearches = (): RecentSearch[] => {
    try {
      const stored = localStorage.getItem('recentSearches');
      if (stored) {
        const parsed = JSON.parse(stored);
        // Filtrar pesquisas antigas (mais de 30 dias)
        const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
        return parsed.filter((search: RecentSearch) => search.timestamp > thirtyDaysAgo);
      }
    } catch (error) {
      console.error('Erro ao carregar pesquisas recentes:', error);
    }
    return [];
  };

  const saveRecentSearch = (query: string) => {
    if (!query.trim() || query.length < 2) return;

    try {
      const current = getRecentSearches();
      // Remover duplicatas
      const filtered = current.filter(search => search.query.toLowerCase() !== query.toLowerCase());
      // Adicionar nova pesquisa no início
      const updated = [{ query: query.trim(), timestamp: Date.now() }, ...filtered];
      // Manter apenas as 10 mais recentes
      const limited = updated.slice(0, 10);

      localStorage.setItem('recentSearches', JSON.stringify(limited));
      setRecentSearches(limited);
    } catch (error) {
      console.error('Erro ao salvar pesquisa recente:', error);
    }
  };

  const clearRecentSearches = () => {
    try {
      localStorage.removeItem('recentSearches');
      setRecentSearches([]);
    } catch (error) {
      console.error('Erro ao limpar pesquisas recentes:', error);
    }
  };

  // Função para buscar sugestões da API com correspondência exata
  const fetchSuggestions = async (query: string) => {
    if (!query || query.length < 1) { // Alterado para buscar a partir da primeira letra
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    // Set loading immediately for visual feedback
    setIsLoading(true);

    try {
      const token = localStorage.getItem('firebaseToken');
      if (!token) return;

      const isNumberQuery = /^\d{1,2}$/.test(query.trim());

      const params = new URLSearchParams({
        q: query,
        limit: isNumberQuery ? '12' : '6',
        ...(isNumberQuery ? {} : { exact: 'true' }),
      });

      // Adicionar data se não for 'all'
      if (selectedDate && selectedDate !== 'all') {
        params.append('date', selectedDate);
      }

      const response = await fetch(`/api/search/suggestions?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        const queryLower = query.toLowerCase().trim();

        const isNumberQuery = /^\d{1,2}$/.test(query.trim());

        const inclusiveSuggestions = isNumberQuery
          ? (data.suggestions || [])
          : (data.suggestions || []).filter((suggestion: any) => {
          const suggestionValue = typeof suggestion === 'string' ? suggestion : suggestion.value;
          let cleanValue = suggestionValue;

          // Extrair modelo e contagem do formato "iPhone 15 (5 produtos)"
          const match = suggestionValue.match(/^(.+?)\s*\((\d+)\s+produtos?\)$/);
          if (match) {
            cleanValue = match[1].trim();
          }

          const valueLower = cleanValue.toLowerCase().trim();
          const queryLower = query.toLowerCase().trim();

          // Busca super inclusiva desde a primeira letra
          return valueLower.includes(queryLower) || 
                 valueLower.startsWith(queryLower) ||
                 valueLower.split(' ').some(word => 
                   word.startsWith(queryLower) || 
                   word.includes(queryLower)
                 ) ||
                 // Busca em números e caracteres sem espaços
                 valueLower.replace(/[^a-z0-9]/g, '').includes(queryLower.replace(/[^a-z0-9]/g, ''));
        });

        const formattedSuggestions = inclusiveSuggestions.map((suggestion: string) => {
          // Extrair modelo e contagem do formato "iPhone 15 (5 produtos)"
          const match = suggestion.match(/^(.+?)\s*\((\d+)\s+produtos?\)$/);
          if (match) {
            return {
              value: match[1].trim(),
              count: parseInt(match[2])
            };
          }
          return {
            value: suggestion,
            count: 0
          };
        });

        setSuggestions(formattedSuggestions);
        setShowSuggestions(formattedSuggestions.length > 0);
      }
    } catch (error) {
      console.error('Erro ao buscar sugestões:', error);
      setSuggestions([]);
      setShowSuggestions(false);
    } finally {
      setIsLoading(false);
    }
  };

  // Função para completar uma pesquisa (salva no histórico)
  const completeSearch = (query: string) => {
    if (query.trim().length >= 1) { // Alterado para permitir salvar a partir da primeira letra
      saveRecentSearch(query.trim());
    }
  };

  // Effect para reagir a mudanças no termo de busca (agora instantâneo)
  useEffect(() => {
    if (isFocused) {
      if (searchTerm.trim().length >= 1) { // Alterado para >= 1
        fetchSuggestions(searchTerm); // Chamada direta sem debounce
        setShowRecentSearches(false);
      } else {
        // Mostrar pesquisas recentes quando campo está vazio ou com menos de 1 caractere
        setSuggestions([]);
        setShowSuggestions(false);
        setShowRecentSearches(recentSearches.length > 0);
      }
    }

    // Limpa o timeout se ele existir
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchTerm, isFocused, selectedDate, recentSearches]);


  // Effect para carregar pesquisas recentes ao montar o componente
  useEffect(() => {
    const recent = getRecentSearches();
    setRecentSearches(recent);
  }, []);


  const handleSuggestionSelect = (suggestion: Suggestion) => {
    const searchValue = suggestion.value;
    onSearchChange(searchValue);
    completeSearch(searchValue);

    // Notificar que a pesquisa foi completada
    if (onSearchComplete) {
      onSearchComplete(searchValue);
    }

    setShowSuggestions(false);
    setShowRecentSearches(false);
    setSelectedIndex(-1);
    inputRef.current?.blur();
  };

  const handleRecentSearchSelect = (recentSearch: RecentSearch) => {
    onSearchChange(recentSearch.query);
    completeSearch(recentSearch.query); // Atualizar timestamp

    // Notificar que a pesquisa foi completada
    if (onSearchComplete) {
      onSearchComplete(recentSearch.query);
    }

    setShowRecentSearches(false);
    setShowSuggestions(false);
    setSelectedIndex(-1);
    inputRef.current?.blur();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    const currentList = showSuggestions ? suggestions : (showRecentSearches ? recentSearches : []);
    if (currentList.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev < currentList.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev > 0 ? prev - 1 : currentList.length - 1
        );
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0) {
          if (showSuggestions && suggestions[selectedIndex]) {
            handleSuggestionSelect(suggestions[selectedIndex]);
          } else if (showRecentSearches && recentSearches[selectedIndex]) {
            handleRecentSearchSelect(recentSearches[selectedIndex]);
          }
        } else if (searchTerm.trim()) {
          // Apenas fechar sugestões, não salvar automaticamente no Enter
          setShowSuggestions(false);
          setShowRecentSearches(false);
          inputRef.current?.blur();
        }
        break;
      case 'Escape':
        setShowSuggestions(false);
        setShowRecentSearches(false);
        setSelectedIndex(-1);
        inputRef.current?.blur();
        break;
    }
  };

  const handleFocus = () => {
    setIsFocused(true);
    if (searchTerm.length >= 1) { // Alterado para >= 1
      fetchSuggestions(searchTerm); // Chamada direta sem debounce
    } else if (recentSearches.length > 0) {
      setShowRecentSearches(true);
    }
  };

  const handleBlur = () => {
    // Delay para permitir cliques nas sugestões
    setTimeout(() => {
      setIsFocused(false);
      setShowSuggestions(false);
      setShowRecentSearches(false);
      setSelectedIndex(-1);
    }, 150);
  };

  const handleClear = () => {
    onSearchChange('');
    setSuggestions([]);
    setShowSuggestions(false);
    setSelectedIndex(-1);
    // Mostrar pesquisas recentes após limpar
    if (recentSearches.length > 0) {
      setShowRecentSearches(true);
    }
    inputRef.current?.focus();
  };

  return (
    <div className="relative">
      {/* Barra de pesquisa */}
      <div
        className={cn(
          isSticky ? 'sticky top-0 z-30' : '',
          'transition-all duration-200'
        )}
        style={{
          paddingTop: `max(${safeAreaInsets.top}px, 8px)`,
          paddingBottom: '12px'
        }}
      >
        <div className="px-4">
          <div className="flex items-center">
            {/* Input de pesquisa */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400 z-10" />
              <Input
                ref={inputRef}
                type="search"
                placeholder="Buscar produtos..."
                value={searchTerm}
                onChange={(e) => onSearchChange(e.target.value)}
                onFocus={handleFocus}
                onBlur={handleBlur}
                onKeyDown={handleKeyDown}
                className="pl-10 pr-10 h-11 text-16 bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                style={{ fontSize: '16px' }} // Previne zoom no iOS
                autoComplete="off"
              />

              {/* Botão limpar */}
              {searchTerm && (
                <button
                  onClick={handleClear}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 p-1 rounded-full hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors z-10"
                >
                  <X className="w-4 h-4 text-slate-400" />
                </button>
              )}

              {/* Indicador de carregamento */}
              {isLoading && (
                <div className="absolute right-10 top-1/2 transform -translate-y-1/2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Sugestões e Pesquisas Recentes */}
      <AnimatePresence>
        {((showSuggestions && suggestions.length > 0) || (showRecentSearches && recentSearches.length > 0)) && isFocused && (
          <motion.div
            initial={{ opacity: 0, y: -10, height: 0 }}
            animate={{ opacity: 1, y: 0, height: "auto" }}
            exit={{ opacity: 0, y: -10, height: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute top-full left-0 right-0 z-50 bg-white dark:bg-slate-900 border-x border-b border-slate-200 dark:border-slate-700 rounded-b-xl shadow-lg max-h-64 overflow-y-auto"
            style={{ marginTop: '-1px' }}
          >
            {/* Header */}
            <div className="px-4 py-3 bg-gradient-to-r from-slate-50 to-slate-100/50 dark:from-slate-800/70 dark:to-slate-900/50 border-b border-slate-200/50 dark:border-slate-700/50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className={cn(
                    "w-2 h-2 rounded-full animate-pulse",
                    showSuggestions ? "bg-blue-500" : "bg-green-500"
                  )} />
                  <span className={cn(
                    "text-xs font-bold uppercase tracking-wide",
                    showSuggestions 
                      ? "text-blue-700 dark:text-blue-400" 
                      : "text-green-700 dark:text-green-400"
                  )}>
                    {showSuggestions ? `Sugestões ${selectedDate !== 'all' ? `(${selectedDate})` : ''}` : 'Pesquisas Recentes'}
                  </span>
                  <div className={cn(
                    "px-2 py-0.5 rounded-full text-xs font-medium",
                    showSuggestions 
                      ? "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300"
                      : "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300"
                  )}>
                    {showSuggestions ? suggestions.length : recentSearches.length}
                  </div>
                </div>
                {showRecentSearches && recentSearches.length > 0 && (
                  <button
                    onClick={clearRecentSearches}
                    className="text-xs font-medium text-slate-500 hover:text-red-600 dark:hover:text-red-400 transition-all duration-200 px-2.5 py-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 hover:scale-105 active:scale-95"
                  >
                    Limpar
                  </button>
                )}
              </div>
            </div>

            {/* Lista de sugestões ou pesquisas recentes */}
            <div className="py-2">
              {showSuggestions ? suggestions.map((suggestion, index) => (
                <motion.button
                  key={`${suggestion.value}-${index}`}
                  className={cn(
                    "w-full px-4 py-3.5 text-left transition-all duration-200 relative group",
                    "hover:bg-gradient-to-r hover:from-blue-50 hover:to-purple-50 dark:hover:from-blue-900/20 dark:hover:to-purple-900/20",
                    "active:scale-[0.98] active:bg-blue-100 dark:active:bg-blue-900/30",
                    selectedIndex === index 
                      ? "bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/30 dark:to-purple-900/30 scale-[1.02] shadow-sm" 
                      : "hover:shadow-sm"
                  )}
                  onClick={() => handleSuggestionSelect(suggestion)}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.03 }}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className={cn(
                        "w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200",
                        "bg-blue-100 dark:bg-blue-900/30 group-hover:bg-blue-200 dark:group-hover:bg-blue-800/50",
                        selectedIndex === index && "bg-blue-200 dark:bg-blue-800/50 scale-110"
                      )}>
                        <Search className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className={cn(
                          "text-sm font-semibold truncate block",
                          "text-slate-900 dark:text-slate-100",
                          "group-hover:text-blue-900 dark:group-hover:text-blue-100"
                        )}>
                          {suggestion.value}
                        </span>
                        {suggestion.count > 0 && (
                          <span className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 block">
                            {suggestion.count} produtos encontrados
                          </span>
                        )}
                      </div>
                    </div>
                    {suggestion.count > 0 && (
                      <div className={cn(
                        "px-2.5 py-1 rounded-full text-xs font-medium transition-all duration-200",
                        "bg-gradient-to-r from-blue-100 to-purple-100 dark:from-blue-900/40 dark:to-purple-900/40",
                        "text-blue-700 dark:text-blue-300",
                        "group-hover:from-blue-200 group-hover:to-purple-200 dark:group-hover:from-blue-800/60 dark:group-hover:to-purple-800/60",
                        selectedIndex === index && "scale-105 shadow-sm"
                      )}>
                        {suggestion.count}
                      </div>
                    )}
                  </div>

                  {selectedIndex === index && (
                    <motion.div
                      layoutId="mobile-suggestion-highlight"
                      className="absolute inset-0 bg-gradient-to-r from-blue-100/50 to-purple-100/50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-lg border border-blue-200/50 dark:border-blue-800/50"
                      style={{ zIndex: -1 }}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.2 }}
                    />
                  )}
                </motion.button>
              )) : recentSearches.map((recentSearch, index) => (
                <motion.button
                  key={`recent-${recentSearch.query}-${index}`}
                  className={cn(
                    "w-full px-4 py-3.5 text-left transition-all duration-200 relative group",
                    "hover:bg-gradient-to-r hover:from-green-50 hover:to-blue-50 dark:hover:from-green-900/20 dark:hover:to-blue-900/20",
                    "active:scale-[0.98] active:bg-green-100 dark:active:bg-green-900/30",
                    selectedIndex === index 
                      ? "bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-900/30 dark:to-blue-900/30 scale-[1.02] shadow-sm" 
                      : "hover:shadow-sm"
                  )}
                  onClick={() => handleRecentSearchSelect(recentSearch)}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.03 }}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className={cn(
                        "w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200",
                        "bg-green-100 dark:bg-green-900/30 group-hover:bg-green-200 dark:group-hover:bg-green-800/50",
                        selectedIndex === index && "bg-green-200 dark:bg-green-800/50 scale-110"
                      )}>
                        <svg className="w-4 h-4 text-green-600 dark:text-green-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <circle cx="12" cy="12" r="3"/>
                          <path d="M12 1v6m0 6v6"/>
                          <path d="m21 12-6 0m-6 0-6 0"/>
                        </svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className={cn(
                          "text-sm font-semibold truncate block",
                          "text-slate-900 dark:text-slate-100",
                          "group-hover:text-green-900 dark:group-hover:text-green-100"
                        )}>
                          {recentSearch.query}
                        </span>
                        <span className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 block">
                          Pesquisa recente
                        </span>
                      </div>
                    </div>
                    <div className={cn(
                      "px-2.5 py-1 rounded-full text-xs font-medium transition-all duration-200",
                      "bg-gradient-to-r from-green-100 to-blue-100 dark:from-green-900/40 dark:to-blue-900/40",
                      "text-green-700 dark:text-green-300",
                      "group-hover:from-green-200 group-hover:to-blue-200 dark:group-hover:from-green-800/60 dark:group-hover:to-blue-800/60",
                      selectedIndex === index && "scale-105 shadow-sm"
                    )}>
                      {new Date(recentSearch.timestamp).toLocaleDateString('pt-BR', { 
                        day: '2-digit', 
                        month: '2-digit'
                      })}
                    </div>
                  </div>

                  {selectedIndex === index && (
                    <motion.div
                      layoutId="mobile-suggestion-highlight"
                      className="absolute inset-0 bg-gradient-to-r from-green-100/50 to-blue-100/50 dark:from-green-900/20 dark:to-blue-900/20 rounded-lg border border-green-200/50 dark:border-green-800/50"
                      style={{ zIndex: -1 }}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.2 }}
                    />
                  )}
                </motion.button>
              ))}
            </div>

            {/* Footer */}
            <div className="px-4 py-3 bg-gradient-to-r from-slate-50 to-slate-100/50 dark:from-slate-800/70 dark:to-slate-900/50 border-t border-slate-200/50 dark:border-slate-700/50">
              <div className="flex items-center justify-center gap-2">
                <div className={cn(
                  "w-1 h-1 rounded-full",
                  showSuggestions ? "bg-blue-400" : "bg-green-400"
                )} />
                <p className={cn(
                  "text-xs font-medium text-center",
                  showSuggestions 
                    ? "text-blue-600 dark:text-blue-400" 
                    : "text-green-600 dark:text-green-400"
                )}>
                  {showSuggestions ? 'Toque para selecionar ou continue digitando' : 'Suas pesquisas mais recentes'}
                </p>
                <div className={cn(
                  "w-1 h-1 rounded-full",
                  showSuggestions ? "bg-blue-400" : "bg-green-400"
                )} />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}