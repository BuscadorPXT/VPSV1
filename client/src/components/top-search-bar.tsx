"use client"

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Search, X, RotateCcw, Loader2, ChevronDown, Smartphone, Laptop, Watch, Headphones, Tablet, Settings, CircleDot } from 'lucide-react';
import { debounce } from 'lodash';
import { ElegantDateSelector } from '@/components/ui/elegant-date-selector';
import { AnimatePresence, motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface SearchSuggestion {
  value: string;
  type: string;
  count?: number;
}

type SuggestionItem = SearchSuggestion | string;

interface RecentSearch {
  query: string;
  timestamp: number;
}

// Fallback popular products data
const FALLBACK_POPULAR_PRODUCTS = [
  { name: 'iPhone 15', category: 'iPhone', icon: Smartphone },
  { name: 'iPhone 14', category: 'iPhone', icon: Smartphone },
  { name: 'MacBook Air', category: 'MacBook', icon: Laptop },
  { name: 'iPad Air', category: 'iPad', icon: Tablet },
  { name: 'Apple Watch', category: 'Watch', icon: Watch },
  { name: 'AirPods Pro', category: 'AirPods', icon: Headphones },
];

const GooeyFilter = () => (
  <svg style={{ position: "absolute", width: 0, height: 0 }} aria-hidden="true">
    <defs>
      <filter id="gooey-effect">
        <feGaussianBlur in="SourceGraphic" stdDeviation="7" result="blur" />
        <feColorMatrix in="blur" type="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 19 -8" result="goo" />
        <feComposite in="SourceGraphic" in2="goo" operator="atop" />
      </filter>
    </defs>
  </svg>
);

interface TopSearchBarProps {
  value: string;
  onChange: (value: string) => void;
  onFiltersReset?: () => void;
  hasActiveFilters?: boolean;
  placeholder?: string;
  className?: string;
  filteredProducts?: any[]; // Add filtered products prop
  selectedDate?: string;
  onDateChange?: (date: string) => void;
  availableDates?: string[];
}

export function TopSearchBar({
  value,
  onChange,
  placeholder = "Buscar produtos em tempo real...",
  onFiltersReset,
  hasActiveFilters = false,
  className = "",
  filteredProducts = [], // Add filtered products with default
  selectedDate = 'all',
  onDateChange,
  availableDates = []
}: TopSearchBarProps) {
  // TODOS OS HOOKS EM ORDEM FIXA E CONSISTENTE
  const [isMobileDevice, setIsMobileDevice] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.innerWidth <= 768 || /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  });

  const [suggestions, setSuggestions] = useState<SuggestionItem[]>([]);
  const [allProducts, setAllProducts] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(-1);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [hasLoadedAllProducts, setHasLoadedAllProducts] = useState(false);
  const [popularProducts, setPopularProducts] = useState(FALLBACK_POPULAR_PRODUCTS);
  const [isLoadingPopular, setIsLoadingPopular] = useState(false);
  const [allowSuggestions, setAllowSuggestions] = useState(true);
  const [isSelectingFromSuggestion, setIsSelectingFromSuggestion] = useState(false);
  const [recentSearches, setRecentSearches] = useState<RecentSearch[]>([]);
  const [showRecentSearches, setShowRecentSearches] = useState(false);

  // Modern search bar state
  const [isFocused, setIsFocused] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isAnimating, setIsAnimating] = useState(false);
  const [isClicked, setIsClicked] = useState(false);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  // Mobile search behavior states
  const [isMobileSearchActive, setIsMobileSearchActive] = useState(false);
  const [isKeyboardMode, setIsKeyboardMode] = useState(false);

  // TODOS OS useRef JUNTOS
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const cacheRef = useRef<Map<string, SuggestionItem[]>>(new Map());
  const lastSelectedValueRef = useRef<string>('');

  // TODOS OS useMemo JUNTOS
  const isUnsupportedBrowser = useMemo(() => {
    if (typeof window === "undefined") return false;
    const ua = navigator.userAgent.toLowerCase();
    const isSafari = ua.includes("safari") && !ua.includes("chrome") && !ua.includes("chromium");
    const isChromeOniOS = ua.includes("crios");
    return isSafari || isChromeOniOS;
  }, []);

  // Memoized unique models extraction with caching - ALWAYS use all products for complete model list
  const uniqueModels = useMemo(() => {
    // ALWAYS use ALL products to ensure we have complete model suggestions
    const productsToUse = allProducts;

    console.log('🔍 TopSearchBar uniqueModels extraction:', {
      allProductsCount: allProducts.length,
      filteredProductsCount: filteredProducts.length,
      hasActiveFilters,
      usingAllProducts: true
    });

    if (!productsToUse.length) return [];

    const cacheKey = `models_all_${productsToUse.length}`;
    if (cacheRef.current.has(cacheKey)) {
      return cacheRef.current.get(cacheKey) || [];
    }

    const models = new Map<string, number>();
    productsToUse.forEach((product) => {
      if (product.model && typeof product.model === 'string') {
        const modelName = product.model.trim();
        if (modelName) {
          models.set(modelName, (models.get(modelName) || 0) + 1);
        }
      }
    });

    const result = Array.from(models.entries())
      .map(([model, count]) => ({ value: model, type: 'model', count }))
      .sort((a, b) => b.count - a.count);

    console.log('🔍 TopSearchBar unique models generated:', {
      totalUnique: result.length,
      sampleModels: result.slice(0, 10).map(m => m.value),
      iPhone16ProMaxCount: result.filter(m => m.value.toLowerCase().includes('iphone') && m.value.toLowerCase().includes('16') && m.value.toLowerCase().includes('pro') && m.value.toLowerCase().includes('max')).length
    });

    cacheRef.current.set(cacheKey, result);
    return result;
  }, [allProducts, filteredProducts, hasActiveFilters]);

  // TODOS OS useCallback JUNTOS NA ORDEM CORRETA
  // Funções para gerenciar pesquisas recentes
  const getRecentSearches = useCallback((): RecentSearch[] => {
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
  }, []);

  const saveRecentSearch = useCallback((query: string) => {
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
  }, [getRecentSearches]);

  const isSimpleNumberQuery = (query: string): boolean => {
    return /^\d{1,2}$/.test(query.trim());
  };

  const expandNumberQuery = (query: string, models: string[]): string[] => {
    const queryNum = query.trim();
    const results: string[] = [];

    models.forEach(model => {
      if (typeof model === 'string') {
        const modelLower = model.toLowerCase();

        if (modelLower.includes('iphone')) {
          const iphonePattern = new RegExp(`iphone\\s+${queryNum}(?:\\s|$|\\s+pro|\\s+plus|\\s+max|\\s+mini)`, 'i');
          if (iphonePattern.test(model)) {
            results.push(model);
          }
        }
        else if (modelLower.includes(queryNum)) {
          const numberPattern = new RegExp(`\\b${queryNum}\\b`);
          if (numberPattern.test(modelLower)) {
            results.push(model);
          }
        }
      }
    });

    return results.sort((a, b) => {
      const aLower = a.toLowerCase();
      const bLower = b.toLowerCase();

      const aIsBase = !/(pro|max|plus|mini)/i.test(a);
      const bIsBase = !/(pro|max|plus|mini)/i.test(b);

      if (aIsBase && !bIsBase) return -1;
      if (!aIsBase && bIsBase) return 1;

      const variantOrder = ['pro max', 'pro', 'plus', 'mini'];
      const aVariantIndex = variantOrder.findIndex(v => aLower.includes(v));
      const bVariantIndex = variantOrder.findIndex(v => bLower.includes(v));

      if (aVariantIndex !== -1 && bVariantIndex !== -1) {
        return aVariantIndex - bVariantIndex;
      }

      return a.localeCompare(b);
    });
  };

  // Load popular searches from analytics
  const loadPopularSearches = useCallback(async () => {
    if (isLoadingPopular) return;

    setIsLoadingPopular(true);
    try {
      const token = localStorage.getItem('firebaseToken');
      if (!token) return;

      const sessionToken = localStorage.getItem('sessionToken');
      const headers: Record<string, string> = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      };

      if (sessionToken) {
        headers['x-session-token'] = sessionToken;
      }

      const response = await fetch('/api/search-analytics/popular-searches?limit=6&days=7', {
        headers
      });

      if (response.ok) {
        const data = await response.json();
        const analyticsProducts = data.popularSearches?.map((item: any, index: number) => ({
          name: item.query,
          category: `${item.search_count} buscas`,
          icon: [Smartphone, Laptop, Tablet, Watch, Headphones, Settings][index % 6]
        })) || [];

        if (analyticsProducts.length > 0) {
          setPopularProducts(analyticsProducts);
          console.log('📊 Loaded real popular searches:', analyticsProducts.length);
        }
      }
    } catch (error) {
      console.error('Error loading popular searches:', error);
    } finally {
      setIsLoadingPopular(false);
    }
  }, [isLoadingPopular]);

  // Track search when user submits
  const trackSearch = useCallback(async (query: string) => {
    if (!query || query.length < 2) return;

    try {
      const token = localStorage.getItem('firebaseToken');
      if (!token) return;

      const sessionToken = localStorage.getItem('sessionToken');
      const headers: Record<string, string> = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      };

      if (sessionToken) {
        headers['x-session-token'] = sessionToken;
      }

      await fetch('/api/search-analytics/track-search', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          query: query.trim(),
          userId: null // You can add user ID if available
        })
      });
    } catch (error) {
      console.error('Error tracking search:', error);
    }
  }, []);

  // Load all products once with better error handling
  const loadAllProducts = useCallback(async () => {
    if (hasLoadedAllProducts || isLoadingSuggestions) return;

    // Cancel any existing request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    abortControllerRef.current = new AbortController();
    setIsLoadingSuggestions(true);

    try {
      const token = localStorage.getItem('firebaseToken');
      if (!token) {
        console.warn('No authentication token found');
        return;
      }

      const sessionToken = localStorage.getItem('sessionToken');
      const headers: Record<string, string> = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      };

      if (sessionToken) {
        headers['x-session-token'] = sessionToken;
      }

      const response = await fetch('/api/products?limit=5000&page=1', {
        headers,
        signal: abortControllerRef.current.signal
      });

      if (response.ok) {
        const data = await response.json();
        const products = data.products || [];

        setAllProducts(products);
        setHasLoadedAllProducts(true);
      } else {
        console.error('Failed to load products:', response.status);
      }
    } catch (error: any) {
      if (error.name !== 'AbortError') {
        console.error('Error loading products:', error);
      }
    } finally {
      setIsLoadingSuggestions(false);
      abortControllerRef.current = null;
    }
  }, [hasLoadedAllProducts, isLoadingSuggestions]);

  // Optimized search function with inclusive matching for better results
  const performSearch = useCallback(async (query: string) => {
    // Don't show suggestions if they're disabled or if we're in the middle of a selection
    if (!allowSuggestions || isSelectingFromSuggestion) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    if (!query) {
      if (uniqueModels.length > 0) {
        setSuggestions(uniqueModels.slice(0, 10));
        setShowSuggestions(true);
      } else {
        setSuggestions([]);
        setShowSuggestions(false);
      }
      return;
    }

    // Process search from first character
    if (query.length < 1) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    // Check cache first - optimized cache key
    const cacheKey = `search_${query.toLowerCase().trim()}`;
    if (cacheRef.current.has(cacheKey)) {
      const cachedResults = cacheRef.current.get(cacheKey) || [];
      setSuggestions(cachedResults);
      setShowSuggestions(cachedResults.length > 0);
      setIsLoadingSuggestions(false);
      return;
    }

    // ALWAYS prioritize ALL products over filtered products for suggestions
    // This ensures we show all available models in suggestions
    const productsAvailable = allProducts.length > 0 || (hasLoadedAllProducts && uniqueModels.length > 0);
    if (productsAvailable && uniqueModels.length > 0) {
      // For single character searches, don't show loading indicator
      if (query.length > 1) {
        setIsLoadingSuggestions(true);
      }

      const queryLower = query.toLowerCase().trim();

      // ALWAYS use ALL products for model suggestions, not filtered products
      const modelsToSearch = uniqueModels.map(item => typeof item === 'string' ? item : item.value);

      console.log('🔍 TopSearchBar search - using ALL models:', {
        query: queryLower,
        totalModels: modelsToSearch.length,
        hasActiveFilters,
        filteredProductsCount: filteredProducts.length,
        allProductsCount: allProducts.length,
        usingAllProducts: true
      });

      let filtered: string[] = [];

      if (isSimpleNumberQuery(query)) {
        console.log('🔢 Detected simple number query:', query);
        filtered = expandNumberQuery(query, modelsToSearch);
        console.log('🔢 Expanded to variants:', filtered);
      } else {
        filtered = modelsToSearch
          .filter(model => {
          if (typeof model === 'string') {
            const modelLower = model.toLowerCase();
            // Ultra-inclusive matching for instant suggestions from first letter
            return modelLower.includes(queryLower) || 
                   modelLower.startsWith(queryLower) ||
                   modelLower.split(' ').some(word => 
                     word.startsWith(queryLower) || 
                     word.includes(queryLower)
                   ) ||
                   // Additional matching for partial words and numbers
                   modelLower.replace(/[^a-z0-9]/g, '').includes(queryLower.replace(/[^a-z0-9]/g, ''));
          }
          return false;
        })
        .sort((a, b) => {
          const aLower = a.toLowerCase();
          const bLower = b.toLowerCase();

          // Priority order for better UX:
          // 1. Exact start match
          if (aLower.startsWith(queryLower) && !bLower.startsWith(queryLower)) return -1;
          if (!aLower.startsWith(queryLower) && bLower.startsWith(queryLower)) return 1;

          // 2. Word start match
          const aWordStarts = aLower.split(' ').some(word => word.startsWith(queryLower));
          const bWordStarts = bLower.split(' ').some(word => word.startsWith(queryLower));
          if (aWordStarts && !bWordStarts) return -1;
          if (!aWordStarts && bWordStarts) return 1;

          // 3. Contains match
          if (aLower.includes(queryLower) && !bLower.includes(queryLower)) return -1;
          if (!aLower.includes(queryLower) && bLower.includes(queryLower)) return 1;

          return a.localeCompare(b);
        })
        .slice(0, query.length === 1 ? 25 : 20);
      }

      const suggestions = filtered.map(model => ({ value: model, type: 'model' }));

      console.log('🔍 TopSearchBar filtered suggestions:', {
        query: queryLower,
        originalCount: modelsToSearch.length,
        filteredCount: suggestions.length,
        suggestions: suggestions.map(s => s.value)
      });

      // Cache the result and set state immediately
      cacheRef.current.set(cacheKey, suggestions);
      setSuggestions(suggestions);
      setShowSuggestions(suggestions.length > 0);
      setIsLoadingSuggestions(false);
      return;
    }

      // Cancel previous request before API call
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      abortControllerRef.current = new AbortController();

      // Fallback to API search with exact matching
      try {
        const token = localStorage.getItem('firebaseToken');
        if (!token) {
          setSuggestions([]);
          setShowSuggestions(false);
          return;
        }

        const sessionToken = localStorage.getItem('sessionToken');
        const headers: Record<string, string> = {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        };

        if (sessionToken) {
          headers['x-session-token'] = sessionToken;
        }

        const isNumberQuery = /^\d{1,2}$/.test(query.trim());
        const exactParam = isNumberQuery ? '' : '&exact=true';

        const response = await fetch(
          `/api/search/suggestions?q=${encodeURIComponent(query)}&limit=15${exactParam}`,
          {
            headers,
            signal: abortControllerRef.current.signal
          }
        );

        if (response.ok) {
          const data = await response.json();
          const suggestions = data.suggestions || [];

          // Cache the result
          cacheRef.current.set(cacheKey, suggestions);
          setSuggestions(suggestions);
          setShowSuggestions(suggestions.length > 0);
        } else {
          setSuggestions([]);
          setShowSuggestions(false);
        }
      } catch (error: any) {
      if (error.name !== 'AbortError') {
        console.error('Search error:', error);
        setSuggestions([]);
        setShowSuggestions(false);
      }
    } finally {
      setIsLoadingSuggestions(false);
      abortControllerRef.current = null;
    }
  }, [hasLoadedAllProducts, uniqueModels, allowSuggestions, isSelectingFromSuggestion, hasActiveFilters, filteredProducts, allProducts]);

  // Completely instant search - no debounce at all
  const instantSearch = useCallback((query: string) => {
    // Execute search immediately without any delay
    performSearch(query);
  }, [performSearch]);

  // 🚀 PERFORMANCE: Debounced search with proper cleanup - faster response for single characters
  const debouncedSearch = useMemo(() => {
    if (!performSearch) return () => {};

    const debouncedFn = debounce(performSearch, 100);

    // Return a wrapper that cleans up on unmount
    return (query: string) => {
      // Clear any pending searches
      if (debouncedFn.cancel) {
        debouncedFn.cancel();
      }
      debouncedFn(query);
    };
  }, [performSearch]);

  // Handle input change with optimizations
  const handleInputChange = useCallback((inputValue: string) => {
    console.log('🔍 TopSearchBar: Search input changed:', inputValue);
    console.log('🔍 TopSearchBar: Current value before change:', value);
    console.log('🔍 TopSearchBar: allowSuggestions:', allowSuggestions);
    console.log('🔍 TopSearchBar: isSelectingFromSuggestion:', isSelectingFromSuggestion);

    // Update internal state
    setSearchQuery(inputValue);

    // CRITICAL: Always update parent immediately - never block user input
    onChange(inputValue);

    // Reset selection
    setSelectedSuggestionIndex(-1);

    // Trigger search for suggestions from first character
    if (inputValue.length >= 1) {
      console.log('🔍 TopSearchBar: Triggering instant search for:', inputValue, 'length:', inputValue.length);
      instantSearch(inputValue);
    } else {
      console.log('🔍 TopSearchBar: Query empty, showing popular products');
      // Show popular products when empty instead of clearing
      if (hasLoadedAllProducts && uniqueModels.length > 0) {
        setSuggestions(uniqueModels.slice(0, 10));
        setShowSuggestions(true);
      } else {
        setSuggestions([]);
        setShowSuggestions(false);
      }
    }
  }, [value, onChange, instantSearch, allowSuggestions, isSelectingFromSuggestion, hasLoadedAllProducts, uniqueModels]);

  // Handle search submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      trackSearch(searchQuery);
      setIsAnimating(true);
      setTimeout(() => setIsAnimating(false), 1000);
    }
  };

  // Handle mouse move for gooey effects
  const handleMouseMove = (e: React.MouseEvent) => {
    if (isFocused) {
      const rect = e.currentTarget.getBoundingClientRect();
      setMousePosition({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      });
    }
  };

  // Handle click effects
  const handleClick = (e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setMousePosition({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
    setIsClicked(true);
    setTimeout(() => setIsClicked(false), 800);
  };

  // Handle mobile search bar click
  const handleMobileSearchClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!isMobileDevice) {
      return;
    }

    if (!isMobileSearchActive) {
      // First click: activate search mode without keyboard (NO BLUR!)
      console.log('🔍 Primeiro clique: ativando busca mobile - SEM blur()');
      setIsMobileSearchActive(true);
      setIsFocused(true);
      setShowSuggestions(true);

      if (!hasLoadedAllProducts) {
        loadAllProducts();
      }
      loadPopularSearches();

      // DON'T call blur() - this kills the second click keyboard activation
    } else if (!isKeyboardMode) {
      // Second click: remove readonly and focus in same interaction cycle
      console.log('🔍 Segundo clique: ativando teclado com requestAnimationFrame...');
      setIsKeyboardMode(true);

      if (inputRef.current) {
        const input = inputRef.current;

        // Remove readonly first
        input.readOnly = false;
        input.removeAttribute('readonly');

        // Use requestAnimationFrame to ensure readonly removal is applied before focus
        requestAnimationFrame(() => {
          input.focus();
          input.click(); // Ensure cursor appears
        });
      }
    } else {
      // Third click and beyond: maintain focus
      console.log('🔍 Clique adicional: mantendo foco...');
      if (inputRef.current) {
        inputRef.current.focus();
      }
    }
  };

  // Handle backdrop click (close mobile search)
  const handleBackdropClick = () => {
    if (isMobileDevice && isMobileSearchActive) {
      console.log('🔍 TopSearchBar: Closing mobile search');
      setIsMobileSearchActive(false);
      setIsKeyboardMode(false);
      setIsFocused(false);
      setShowSuggestions(false);
      setShowDropdown(false);

      // Reset readonly state properly
      if (inputRef.current) {
        const input = inputRef.current;
        input.blur();
        input.readOnly = true;
        input.setAttribute('readonly', 'true');
      }
    }
  };



  // Função para completar uma pesquisa (salva no histórico)
  const completeSearch = useCallback((query: string) => {
    if (query.trim().length >= 2) {
      saveRecentSearch(query.trim());
      trackSearch(query.trim());
    }
  }, [trackSearch, saveRecentSearch]);

  // Handle keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showSuggestions || suggestions.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedSuggestionIndex(prev => 
          prev < suggestions.length - 1 ? prev + 1 : prev
        );
        break;

      case 'ArrowUp':
        e.preventDefault();
        setSelectedSuggestionIndex(prev => prev > 0 ? prev - 1 : -1);
        break;

      case 'Enter':
        e.preventDefault();
        if (selectedSuggestionIndex >= 0) {
          const suggestion = suggestions[selectedSuggestionIndex];
          const modelName = typeof suggestion === 'string' ? suggestion : suggestion.value;
          // Clean the value to remove any count information
          const cleanModelName = modelName.replace(/\s*\(\d+\s+produtos?\)$/, '').trim();

          console.log('⌨️ Keyboard suggestion selected:', cleanModelName);

          // Set selection state to block all suggestion-related activities
          setIsSelectingFromSuggestion(true);
          lastSelectedValueRef.current = cleanModelName;

          setSearchQuery(cleanModelName);
          onChange(cleanModelName);
          setShowSuggestions(false);
          setSelectedSuggestionIndex(-1);

          // Disable suggestions until next user interaction
          setAllowSuggestions(false);

          // Completar a pesquisa (salva no histórico)
          completeSearch(cleanModelName);

          // Re-enable after shorter delay
          setTimeout(() => {
            setAllowSuggestions(true);
            setIsSelectingFromSuggestion(false);
          }, 300);
        }
        break;
      case 'Escape':
        setShowSuggestions(false);
        setShowDropdown(false);
        setSelectedSuggestionIndex(-1);
        setIsFocused(false);
        break;
    }
  }, [showSuggestions, suggestions.length, selectedSuggestionIndex, completeSearch, onChange, lastSelectedValueRef, allowSuggestions, isSelectingFromSuggestion, setSearchQuery, setShowSuggestions, setSelectedSuggestionIndex, setIsFocused]);

  // Handle suggestion selection
  const handleSuggestionSelect = useCallback((suggestion: SuggestionItem) => {
    const displayValue = typeof suggestion === 'string' ? suggestion : suggestion.value;

    console.log('🎯 Suggestion selected:', displayValue);

    // Set selection state to block all suggestion-related activities
    setIsSelectingFromSuggestion(true);
    lastSelectedValueRef.current = displayValue;

    // Close all suggestion dropdowns immediately
    setShowSuggestions(false);
    setShowDropdown(false);
    setSelectedSuggestionIndex(-1);

    // Disable suggestions until next user interaction
    setAllowSuggestions(false);

    // Update both internal and external state
    setSearchQuery(displayValue);
    onChange(displayValue);

    // Completar a pesquisa (salva no histórico e faz tracking)
    completeSearch(displayValue);

    inputRef.current?.focus();

    // Re-enable suggestions after a short delay and clear selection state
    setTimeout(() => {
      console.log('🎯 Search value after suggestion selection:', displayValue);
      console.log('🎯 Re-enabling suggestions after delay');
      setAllowSuggestions(true);
      setIsSelectingFromSuggestion(false);
    }, 300); // Reduced delay to prevent input blocking
  }, [onChange, completeSearch, inputRef, setSearchQuery, setShowSuggestions, setShowDropdown, setSelectedSuggestionIndex, setAllowSuggestions, setIsSelectingFromSuggestion, lastSelectedValueRef]);

  // Handle focus with optimizations - show popular products when empty
  const handleFocus = useCallback(() => {
    console.log('🔍 TopSearchBar: Focus event', { isMobileDevice, isMobileSearchActive, isKeyboardMode });

    // Mobile behavior: only set focus state if in keyboard mode or not mobile
    if (isMobileDevice && isMobileSearchActive && !isKeyboardMode) {
      console.log('🔍 TopSearchBar: Blocking focus - not in keyboard mode');
      return;
    }

    console.log('🔍 TopSearchBar: Setting focus state');
    setIsFocused(true);

    if (!hasLoadedAllProducts) {
      loadAllProducts();
    }

    // Load popular searches from analytics
    loadPopularSearches();

    // Show suggestions/search based on current value
    if (value.trim()) {
      if (value.length >= 1 && allowSuggestions && !isSelectingFromSuggestion) {
        instantSearch(value.trim());
      }
    } else {
      // Show popular products when field is empty and focused
      setShowSuggestions(true);
      setShowDropdown(false);
    }
  }, [hasLoadedAllProducts, value, loadAllProducts, loadPopularSearches, allowSuggestions, isSelectingFromSuggestion, instantSearch, isMobileDevice, isMobileSearchActive, isKeyboardMode]);

  // Handle blur
  const handleBlur = useCallback(() => {
    // Delay the blur to allow for clicks on suggestions
    setTimeout(() => {
      setIsFocused(false);
    }, 150);
  }, []);

  // Clear search
  const handleClear = useCallback(() => {
    setSearchQuery('');
    onChange('');
    setSuggestions([]);
    setShowSuggestions(false);
    setShowDropdown(false);
    setSelectedSuggestionIndex(-1);
    inputRef.current?.focus();
  }, [onChange, inputRef, setSearchQuery, setSuggestions, setShowSuggestions, setShowDropdown, setSelectedSuggestionIndex]);

  // Toggle dropdown
  const handleDropdownToggle = useCallback(() => {
    if (showDropdown) {
      setShowDropdown(false);
    } else {
      setShowSuggestions(false);
      if (!hasLoadedAllProducts) {
        loadAllProducts().then(() => {
          setShowDropdown(true);
        });
      } else {
        setShowDropdown(true);
      }
    }
  }, [showDropdown, hasLoadedAllProducts, loadAllProducts, setShowDropdown, setShowSuggestions]);

  return (
    <div className={`w-full relative ${className}`}>
      <GooeyFilter />

      {/* Mobile Search Backdrop */}
      <AnimatePresence>
        {isMobileDevice && isMobileSearchActive && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[999999] mobile-search-backdrop"
            onClick={handleBackdropClick}
          />
        )}
      </AnimatePresence>

      <div className={cn(
        "relative max-w-4xl mx-auto transition-all duration-300",
        isMobileDevice && isMobileSearchActive ? "relative z-[1000000] px-0" : "px-6"
      )}>
        {/* Container principal com design moderno */}
        <div className="flex items-center gap-4">
          <motion.form
            onSubmit={handleSubmit}
            className={cn(
              "relative flex items-center justify-center w-full mx-auto",
              isMobileDevice && isMobileSearchActive && "fixed top-0 left-0 right-0 z-[9999] w-full max-w-none mx-0 px-4 pt-2"
            )}
            initial={{ width: "100%" }}
            animate={{
              width: "100%",
              scale: isFocused ? 1.02 : 1,
              y: isMobileDevice && isMobileSearchActive ? 0 : 0
            }}
            transition={{ type: "spring", stiffness: 400, damping: 25 }}
            onMouseMove={handleMouseMove}
          >
            <motion.div
              className={cn(
                "flex items-center w-full rounded-2xl relative overflow-hidden backdrop-blur-sm border transition-all duration-300",
                isFocused
                  ? "shadow-xl bg-white/98 dark:bg-slate-800/98 border-blue-200/50 dark:border-blue-500/30 ring-2 ring-blue-100/50 dark:ring-blue-500/20"
                  : "bg-white/95 dark:bg-slate-800/90 shadow-md border-slate-200/30 dark:border-slate-700/50 hover:shadow-lg hover:border-slate-300/40 dark:hover:border-slate-600/60"
              )}
              animate={{
                scale: isFocused ? 1.01 : 1,
                y: isFocused ? -2 : 0,
              }}
              onClick={isMobileDevice ? handleMobileSearchClick : handleClick}
              style={{
                position: "relative"
              }}
            >
              {/* Subtle focus indicator */}
              <AnimatePresence>
                {isFocused && (
                  <motion.div
                    className="absolute inset-0 rounded-2xl pointer-events-none"
                    initial={{ opacity: 0 }}
                    animate={{
                      opacity: [0.1, 0.2, 0.1],
                    }}
                    exit={{ opacity: 0 }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      ease: "easeInOut"
                    }}
                    style={{
                      background: "linear-gradient(135deg, rgba(59, 130, 246, 0.05), rgba(99, 102, 241, 0.05))",
                    }}
                  />
                )}
              </AnimatePresence>

              {/* Simple click feedback */}
              <AnimatePresence>
                {isClicked && (
                  <motion.div
                    className="absolute inset-0 rounded-2xl bg-blue-100/50 dark:bg-blue-500/10 pointer-events-none"
                    initial={{ opacity: 0.5, scale: 0.95 }}
                    animate={{ opacity: 0, scale: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3, ease: "easeOut" }}
                  />
                )}
              </AnimatePresence>

              {/* Search Icon with subtle animation */}
              <motion.div
                className="pl-4 py-3 flex-shrink-0"
                animate={{
                  scale: isAnimating ? [1, 1.1, 1] : isFocused ? 1.05 : 1,
                }}
                transition={{
                  duration: 0.2,
                  ease: "easeInOut"
                }}
              >
                <Search
                  size={18}
                  strokeWidth={2}
                  className={cn(
                    "transition-all duration-200",
                    isFocused
                      ? "text-blue-600 dark:text-blue-400"
                      : "text-slate-500 dark:text-slate-400"
                  )}
                />
              </motion.div>



              {/* Input Field */}
              <input
                ref={inputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => handleInputChange(e.target.value)}
                onKeyDown={handleKeyDown}
                onFocus={handleFocus}
                onBlur={handleBlur}
                placeholder={placeholder}
                readOnly={isMobileDevice && isMobileSearchActive && !isKeyboardMode}
                key={`search-input-${isKeyboardMode ? 'keyboard' : 'readonly'}`}
                className={cn(
                  "w-full py-4 pl-3 bg-transparent outline-none border-0 placeholder:text-slate-400 dark:placeholder:text-slate-500 font-medium text-base relative z-10 transition-colors duration-200",
                  isFocused
                    ? "text-slate-900 dark:text-white"
                    : "text-slate-700 dark:text-slate-200",
                  // Dynamic padding based on active buttons
                  searchQuery && onFiltersReset && hasActiveFilters ? "pr-20" :
                  searchQuery || (onFiltersReset && hasActiveFilters) ? "pr-12" :
                  "pr-6",
                  // Mobile specific styles
                  isMobileDevice && isMobileSearchActive && !isKeyboardMode && "cursor-pointer"
                )}
                autoComplete="off"
                spellCheck="false"
                inputMode={isMobileDevice && isKeyboardMode ? "search" : undefined}
                style={{ zIndex: 10, border: 'none', boxShadow: 'none', outline: 'none' }}
                onTouchStart={isMobileDevice ? (e) => {
                  console.log('🔍 TouchStart:', { isMobileSearchActive, isKeyboardMode });
                  if (isMobileSearchActive && !isKeyboardMode) {
                    // No primeiro clique, previne o foco
                    console.log('🔍 Preventing touch focus on first click');
                    e.preventDefault();
                  } else if (isKeyboardMode) {
                    console.log('🔍 Allowing touch focus in keyboard mode');
                  }
                } : undefined}
              />

              {/* Loading Indicator */}
              <AnimatePresence>
                {isLoadingSuggestions && (
                  <motion.div
                    className="absolute right-24 top-1/2 transform -translate-y-1/2"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    transition={{ duration: 0.2 }}
                  >
                    <Loader2 className="w-4 h-4 animate-spin text-blue-500 dark:text-blue-400" />
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Action Buttons Container */}
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2 flex items-center gap-2 z-30">
                {/* Clear Button */}
                <AnimatePresence>
                  {searchQuery && (
                    <motion.button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleClear();
                      }}
                      className={cn(
                        "p-1.5 h-7 w-7 rounded-full transition-all duration-200 relative",
                        "hover:bg-gray-100 dark:hover:bg-gray-700",
                        "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200",
                        "focus:outline-none focus:ring-2 focus:ring-blue-500/20",
                        "cursor-pointer select-none"
                      )}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.95 }}
                      style={{ pointerEvents: 'auto', zIndex: 40 }}
                    >
                      <X className="w-3.5 h-3.5" />
                    </motion.button>
                  )}
                </AnimatePresence>

                {/* Reset Filters Button */}
                <AnimatePresence>
                  {onFiltersReset && hasActiveFilters && (
                    <motion.button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        onFiltersReset();
                      }}
                      title="Limpar todos os filtros"
                      className={cn(
                        "p-1.5 h-7 w-7 rounded-full transition-all duration-200 relative",
                        "hover:bg-red-50 dark:hover:bg-red-900/20",
                        "text-red-500 dark:text-red-400 hover:text-red-600 dark:hover:text-red-300",
                        "focus:outline-none focus:ring-2 focus:ring-red-500/20",
                        "cursor-pointer select-none"
                      )}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.95 }}
                      style={{ pointerEvents: 'auto', zIndex: 40 }}
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                    </motion.button>
                  )}
                </AnimatePresence>
              </div>


            </motion.div>
          </motion.form>

          {/* Date Selector */}
          {onDateChange && (
            <div className="flex-shrink-0 w-48">
              <ElegantDateSelector
                selectedDate={selectedDate || 'all'}
                availableDates={availableDates || []}
                onDateChange={onDateChange}
                className="bg-white dark:bg-gray-800 rounded-full shadow-lg border border-blue-100 dark:border-blue-900/30"
                placeholder="Selecionar data"
              />
            </div>
          )}
        </div>

        {/* Popular Products Dropdown - quando campo está vazio e focado */}
        <AnimatePresence>
          {showSuggestions && !searchQuery.trim() && allowSuggestions && (
            <motion.div
              ref={suggestionsRef}
              initial={{ opacity: 0, y: 15, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 15, scale: 0.95 }}
              transition={{
                duration: 0.3,
                type: "spring",
                stiffness: 300,
                damping: 30
              }}
              className={cn(
                "absolute bg-white/98 dark:bg-gray-800/98 backdrop-blur-xl shadow-2xl rounded-2xl max-h-80 overflow-hidden",
                isMobileDevice && isMobileSearchActive
                  ? "fixed top-[4.5rem] left-4 right-4 z-[1000002]"
                  : "top-full left-0 right-0 mt-3 z-50"
              )}
              style={!isUnsupportedBrowser ? {
                filter: "drop-shadow(0 25px 50px rgba(59, 130, 246, 0.15))",
                backdropFilter: "blur(20px)"
              } : {}}
            >
              {/* Header com título */}
              <div className="px-6 py-4 bg-gradient-to-r from-blue-50/70 to-transparent dark:from-blue-900/30">
                <div className="flex items-center gap-3">
                  <motion.div
                    className="w-2 h-2 bg-blue-500 rounded-full"
                    animate={{
                      scale: [1, 1.3, 1],
                      opacity: [0.7, 1, 0.7]
                    }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      ease: "easeInOut"
                    }}
                  />
                  <h3 className="text-blue-600 dark:text-blue-400 font-semibold text-sm uppercase tracking-wide">
                    PRODUTOS POPULARES
                  </h3>
                </div>
              </div>

              {/* Lista de produtos populares */}
              <div className="p-4">
                {isLoadingPopular && (
                  <div className="flex items-center justify-center py-6">
                    <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
                    <span className="ml-3 text-sm text-muted-foreground">Carregando produtos populares...</span>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-3">
                  {popularProducts.map((product, index) => {
                    const IconComponent = product.icon;
                    return (
                      <motion.div
                        key={`popular-${index}-${product.name}`}
                        className={cn(
                          "flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all duration-200 group",
                          "hover:bg-blue-50/80 dark:hover:bg-blue-900/30",
                          "border border-transparent hover:border-blue-200/50 dark:hover:border-blue-800/50"
                        )}
                        onClick={() => {
                          console.log('🎯 Popular product selected:', product.name);

                          // Set selection state to block all suggestion-related activities
                          setIsSelectingFromSuggestion(true);
                          lastSelectedValueRef.current = product.name;

                          setSearchQuery(product.name);
                          onChange(product.name);

                          // Completar a pesquisa (salva no histórico e faz tracking)
                          completeSearch(product.name);

                          // Close suggestions after selecting popular product
                          setShowSuggestions(false);
                          setShowDropdown(false);
                          setSelectedSuggestionIndex(-1);

                          // Disable suggestions until next user interaction
                          setAllowSuggestions(false);

                          // Re-enable after delay
                          setTimeout(() => {
                            setAllowSuggestions(true);
                            setIsSelectingFromSuggestion(false);
                          }, 300);
                        }}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{
                          opacity: 1,
                          y: 0,
                        }}
                        transition={{
                          delay: index * 0.1,
                          duration: 0.4,
                          ease: "easeOut"
                        }}
                        whileHover={{
                          scale: 1.03,
                          y: -3,
                          transition: { duration: 0.2 }
                        }}
                        whileTap={{ scale: 0.98 }}
                      >
                        <motion.div
                          className={cn(
                            "w-10 h-10 rounded-lg flex items-center justify-center transition-colors",
                            "bg-blue-50 dark:bg-blue-900/20",
                            "group-hover:bg-blue-100 dark:group-hover:bg-blue-900/40"
                          )}
                          whileHover={{
                            rotate: [0, -15, 15, 0],
                            scale: 1.1
                          }}
                          transition={{ duration: 0.5 }}
                        >
                          <IconComponent className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                        </motion.div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-gray-900 dark:text-gray-100 text-sm truncate">
                            {product.name}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                            {product.category}
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </div>

              {/* Dica da IA */}
              <motion.div
                className="px-6 py-4 bg-blue-50/60 dark:bg-blue-900/20"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
              >
                <div className="flex items-start gap-3">
                  <Settings className="w-4 h-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-blue-800 dark:text-blue-300 text-sm font-medium">
                      Dica da IA
                    </p>
                    <p className="text-blue-600 dark:text-blue-400 text-xs mt-1">
                      Digite apenas números como "15" para iPhone 15, ou "air" para MacBook Air. Nossa IA entende você!
                    </p>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Enhanced Search Suggestions Dropdown */}
        <AnimatePresence>
          {showSuggestions && searchQuery.trim() && suggestions.length > 0 && allowSuggestions && (
            <motion.div
              ref={suggestionsRef}
              initial={{ opacity: 0, y: 15, height: 0 }}
              animate={{ opacity: 1, y: 0, height: "auto" }}
              exit={{ opacity: 0, y: 15, height: 0 }}
              transition={{ duration: 0.3 }}
              className={cn(
                "absolute overflow-hidden bg-white/98 dark:bg-gray-900/98 backdrop-blur-xl rounded-xl shadow-2xl",
                isMobileDevice && isMobileSearchActive
                  ? "fixed top-[4.5rem] left-4 right-4 z-[1000002]"
                  : "z-10 w-full mt-2"
              )}
              style={{
                maxHeight: "350px",
                overflowY: "auto",
                filter: isUnsupportedBrowser ? "none" : "drop-shadow(0 20px 25px rgba(0,0,0,0.15))",
              }}
            >
              {/* Header com título */}
              <div className="px-6 py-4 bg-gradient-to-r from-green-50/70 to-transparent dark:from-green-900/30">
                <div className="flex items-center gap-3">
                  <motion.div
                    className="w-2 h-2 bg-green-500 rounded-full"
                    animate={{
                      scale: [1, 1.3, 1],
                      opacity: [0.7, 1, 0.7]
                    }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      ease: "easeInOut"
                    }}
                  />
                  <h3 className="text-green-600 dark:text-green-400 font-semibold text-sm uppercase tracking-wide">
                    SUGESTÕES DE BUSCA
                  </h3>
                </div>
              </div>

              {/* Lista de sugestões */}
              <div className="p-4 overflow-y-auto max-h-64">
                <div className="space-y-2">
                  {suggestions.map((suggestion, index) => {
                    const displayValue = typeof suggestion === 'string' ? suggestion : suggestion.value;
                    const count = typeof suggestion === 'string' ? null : suggestion.count;
                    const type = typeof suggestion === 'string' ? 'model' : suggestion.type;

                    return (
                      <motion.div
                        key={`suggestion-${index}-${displayValue}`}
                        custom={index}
                        variants={{
                          hidden: (i: number) => ({
                            opacity: 0,
                            y: -15,
                            scale: 0.95,
                            transition: { duration: 0.2, delay: i * 0.05 },
                          }),
                          visible: (i: number) => ({
                            opacity: 1,
                            y: 0,
                            scale: 1,
                            transition: { type: "spring", stiffness: 300, damping: 20, delay: i * 0.1 },
                          }),
                          exit: (i: number) => ({
                            opacity: 0,
                            y: -10,
                            scale: 0.9,
                            transition: { duration: 0.15, delay: i * 0.03 },
                          }),
                        }}
                        initial="hidden"
                        animate="visible"
                        exit="exit"
                        className={cn(
                          "flex items-center gap-3 px-4 py-2.5 cursor-pointer rounded-lg group transition-all duration-200",
                          selectedSuggestionIndex === index
                            ? "bg-purple-50 dark:bg-purple-900/30 scale-[1.02]"
                            : "hover:bg-purple-50 dark:hover:bg-purple-900/20"
                        )}
                        onClick={() => {
                          const cleanValue = displayValue.replace(/\s*\(\d+\s+produtos?\)$/, '').trim();
                          const cleanSuggestion = typeof suggestion === 'string' ? cleanValue : { ...suggestion, value: cleanValue };
                          handleSuggestionSelect(cleanSuggestion);
                        }}
                        whileHover={{ scale: 1.02, x: 6 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        <motion.div
                          initial={{ scale: 0.8, rotate: -180 }}
                          animate={{ scale: 1, rotate: 0 }}
                          transition={{ delay: index * 0.08, type: "spring" }}
                        >
                          <CircleDot size={16} className="text-purple-400 group-hover:text-purple-600 transition-colors" />
                        </motion.div>
                        <motion.span
                          className="text-gray-700 dark:text-gray-100 group-hover:text-purple-700 dark:group-hover:text-purple-400 flex-1 font-medium"
                          initial={{ x: -10, opacity: 0 }}
                          animate={{ x: 0, opacity: 1 }}
                          transition={{ delay: index * 0.1 }}
                        >
                          {displayValue}
                        </motion.span>
                        {count && (
                          <motion.div
                            className="flex-shrink-0"
                            initial={{ scale: 0, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ delay: index * 0.05 + 0.2 }}
                          >
                            <Badge
                              variant="outline"
                              className="text-xs bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 border-green-200 dark:border-green-800"
                            >
                              {count}
                            </Badge>
                          </motion.div>
                        )}
                      </motion.div>
                    );
                  })}
                </div>
              </div>

              {/* Dica da IA */}
              <motion.div
                className="px-6 py-4 bg-green-50/60 dark:bg-green-900/20"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
              >
                <div className="flex items-start gap-3">
                  <Search className="w-4 h-4 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-green-800 dark:text-green-300 text-sm font-medium">
                      Resultados encontrados
                    </p>
                    <p className="text-green-600 dark:text-green-400 text-xs mt-1">
                      Clique em qualquer sugestão para ver os produtos relacionados
                    </p>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Products Dropdown */}
        <AnimatePresence>
          {showDropdown && !showSuggestions && uniqueModels.length > 0 && (
            <motion.div
              ref={dropdownRef}
              initial={{ opacity: 0, y: 15, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 15, scale: 0.95 }}
              transition={{ duration: 0.3 }}
              className={cn(
                "absolute top-full left-0 right-0 mt-2 bg-white dark:bg-gray-800 shadow-xl rounded-2xl max-h-80 overflow-y-auto z-50",
                isMobileDevice && isMobileSearchActive
                  ? "fixed top-[4.5rem] left-4 right-4 z-[1000002]"
                  : "z-10 w-full mt-2"
              )}
            >
              <div className="sticky top-0 bg-muted/80 backdrop-blur-sm px-4 py-2 border-b border-border">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-foreground">
                    {hasActiveFilters && filteredProducts.length > 0 ? 'Produtos Filtrados' : 'Todos os Produtos'}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {uniqueModels.length} produtos
                  </span>
                </div>
              </div>
              <div className="max-h-72 overflow-y-auto">
                {uniqueModels.slice(0, 100).map((suggestion, index) => {
                  const displayValue = typeof suggestion === 'string' ? suggestion : suggestion.value;
                  const count = typeof suggestion === 'string' ? 0 : suggestion.count;

                  return (
                    <motion.div
                      key={`dropdown-${index}-${displayValue}`}
                      className="px-4 py-2.5 cursor-pointer transition-colors hover:bg-muted/50"
                      onClick={() => handleSuggestionSelect(suggestion)}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.02 }}
                      whileHover={{ x: 4 }}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-foreground font-medium truncate">
                          {displayValue}
                        </span>
                        <Badge variant="outline" className="text-xs ml-2 flex-shrink-0">
                          {count}
                        </Badge>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}