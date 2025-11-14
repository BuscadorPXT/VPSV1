import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { ExcelFilterDropdown } from "@/components/ui/excel-filter-dropdown";
import { getAuthHeaders } from "@/lib/auth-api";
import { formatPrice } from "@/lib/formatters";
import { getColorInfo } from "@/lib/color-mapping";
import { CategoryIcon } from "@/lib/category-icons";
import { useDebounce } from "@/hooks/use-debounce";
import { ArrowUpDown, ArrowUp, ArrowDown, Star, StarOff, TrendingDown, ChevronDown, ChevronUp, X, Filter, Search, Tag, RotateCcw, Loader2, RefreshCw, Clock } from "lucide-react";
import { SubscriptionPlan, canUserAccessFeature } from "@shared/subscription";
import { useTheme } from "@/components/theme-provider";
import { Trash2, Heart, BookmarkPlus, Share2, Download, Zap, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import watermarkPattern from "@/assets/watermark-pattern.png";
import watermarkPatternDark from "@/assets/watermark-pattern-dark.png";
import { Watermark } from "@/components/Watermark";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { BrandCategoryFilter } from "./BrandCategoryFilter";
import { ElegantDateSelector } from "@/components/ui/elegant-date-selector";
import { debounce } from 'lodash';
import { WhatsAppButton } from "@/components/WhatsAppButton";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useTesterStatusDebug } from "@/hooks/useTesterStatusDebug";
import { useAuth } from "@/hooks/use-auth";
import { StarRating } from './ui/star-rating';
import { SupplierCommentsModal } from './SupplierCommentsModal';
import { SupplierRatingModal } from './SupplierRatingModal';
import { SupplierRatingsDisplay } from './SupplierRatingsDisplay';
import { RateSupplierButton } from './RateSupplierButton';
import { apiRequest } from "@/lib/api-client";
import { useToast } from "@/hooks/use-toast";
import { useInterestList } from "@/hooks/useInterestList";
import { useUnifiedWebSocket } from "@/hooks/use-unified-websocket";
import { InteractivePriceCell } from "@/components/InteractivePriceCell";
import { calculateLowestPricesInProducts } from "@/utils/productHelpers";
import { useRealtimeProducts } from '@/hooks/use-realtime-products';
import { useMobile } from "@/hooks/use-mobile";

// Interface para o produto com fornecedor completo
interface Product {
  id?: string | number;
  name?: string;
  model?: string;
  supplier?: {
    id: number;
    name: string;
    rating?: number;
    totalRatings?: number;
    averageRating?: string; // Adicionado para compatibilidade com SupplierRatingsDisplay
    ratingCount?: number;  // Adicionado para compatibilidade com SupplierRatingsDisplay
  } | string;
  supplierName?: string;
  price?: number | string;
  priceFormatted?: string;
  color?: string;
  storage?: string;
  capacity?: string;
  region?: string;
  category?: string;
  brand?: string;
  date?: string;
  productTimestamp?: string; // Horário que o produto subiu no sistema (coluna H da planilha)
  // Portuguese field names (fallbacks)
  modelo?: string;
  fornecedor?: string;
  preco?: number;
  cor?: string;
  armazenamento?: string;
  regiao?: string;
  categoria?: string;
  marca?: string;
  data?: string;
  isLowestPrice?: boolean;
  isLowestPriceForColor?: boolean; // Novo campo para indicar menor preço da cor
  [key: string]: any;
}

// Função para buscar produtos com fornecedores da API
const fetchProductsWithSuppliers = async (filters: any = {}): Promise<Product[]> => {
  try {
    // Buscar produtos com fornecedores do endpoint específico
    const response = await apiRequest('/api/products/with-suppliers', {
      method: 'GET',
    });

    if (!response.success) {
      throw new Error(response.message || 'Falha ao buscar produtos');
    }

    console.log('✅ Products with suppliers loaded:', (response.data as Product[])?.length || 0);
    return (response.data as Product[]) || [];
  } catch (error: unknown) {
    console.error('Error fetching products with suppliers:', error);
    throw error;
  }
};

interface SupplierContacts {
  [supplierName: string]: {
    telefone: string;
    endereco?: string;
  };
}

interface FilterState {
  suppliers: string[];
  categories: string[];
  storages: string[];
  regions: string[];
  colors: string[];
  search: string;
  date: string;
  capacity: string[];
  supplierId: string;
  supplierIds: string[];
  brandCategory: 'all' | 'xiaomi' | 'iphone';
}

interface ExcelStylePriceListProps {
  searchFilter: string;
  dateFilter: string;
  userPlan: SubscriptionPlan;
  isAdmin: boolean;
  role: string;
  onFiltersReset?: () => void;
  onDateFilterChange?: (date: string) => void;
  availableDates?: string[];
  datesLoading?: boolean;
  filters?: {
    brandCategory?: 'all' | 'xiaomi' | 'iphone';
  };
}

interface FilterOption {
  value: string;
  label: string;
  count: number;
}

const ExcelStylePriceList: React.FC<ExcelStylePriceListProps> = (props) => {
  // Extract props first
  const {
    searchFilter,
    dateFilter,
    userPlan,
    isAdmin,
    role,
    onFiltersReset,
    onDateFilterChange,
    availableDates,
    datesLoading,
    filters = { brandCategory: 'all' }
  } = props;

  // ALL HOOKS MUST BE CALLED IN THE SAME ORDER EVERY RENDER
  // Core hooks first
  const { user } = useAuth();
  const isMobile = useMobile();
  const { toast } = useToast();
  const { theme } = useTheme();
  const { userProfile } = useTesterStatusDebug();
  const queryClient = useQueryClient();
  const { addToInterestList } = useInterestList();
  const debouncedSearchFilter = useDebounce(searchFilter, 300);

  // State hooks - all at once
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const [columnVisibility, setColumnVisibility] = useState<Record<string, boolean>>({});
  const [pinnedColumns, setPinnedColumns] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [sortField, setSortField] = useState('');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [showFilters, setShowFilters] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth >= 768;
    }
    return false;
  });
  const [searchTerm, setSearchTerm] = useState(searchFilter || '');
  const [showAllVariants, setShowAllVariants] = useState(false);
  const [addedProducts, setAddedProducts] = useState<Set<string>>(new Set());
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(-1);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [supplierContacts, setSupplierContacts] = useState<SupplierContacts>({});
  const [selectedSupplierForRating, setSelectedSupplierForRating] = useState<{
    id: number;
    name: string;
    averageRating?: string;
    ratingCount?: number;
  } | null>(null);
  const [isRatingModalOpen, setIsRatingModalOpen] = useState(false);
  const [selectedSupplierForComments, setSelectedSupplierForComments] = useState<{
    id: number;
    name: string;
    averageRating?: number;
    ratingCount?: number;
  } | null>(null);
  const [isCommentsModalOpen, setIsCommentsModalOpen] = useState(false);

  // Initialize currentFilters AFTER all other state
  const [currentFilters, setCurrentFilters] = useState<FilterState>({
    suppliers: [],
    categories: [],
    storages: [],
    regions: [],
    colors: [],
    search: searchFilter || '',
    date: dateFilter || 'all',
    capacity: [],
    supplierId: 'all',
    supplierIds: [],
    brandCategory: 'all'
  });

  // Refs
  const searchInputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Supplier contacts query - Load contact information for suppliers (MOVED TO BEGINNING)
  const { data: supplierContactsData } = useQuery({
    queryKey: ['supplier-contacts'],
    queryFn: async () => {
      try {
        const headers = await getAuthHeaders();
        const response = await fetch('/api/suppliers/contacts', { headers });

        if (!response.ok) {
          console.warn('Failed to fetch supplier contacts:', response.status);
          return {};
        }

        const data = await response.json();
        console.log('📞 Supplier contacts loaded:', Object.keys(data.contacts || {}).length, 'suppliers');
        return data.contacts || {};
      } catch (error) {
        console.error('Error fetching supplier contacts:', error);
        return {};
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes cache
    refetchOnWindowFocus: false,
    retry: 1
  });

  // Update supplier contacts when data is loaded (MOVED TO BEGINNING)
  useEffect(() => {
    if (supplierContactsData && Object.keys(supplierContactsData).length > 0) {
      console.log('📞 Updating supplier contacts state with', Object.keys(supplierContactsData).length, 'contacts');
      setSupplierContacts(supplierContactsData);
    }
  }, [supplierContactsData]);

  // Calculate the most recent date from availableDates
  const mostRecentDate = useMemo(() => {
    if (!availableDates || availableDates.length === 0) return null;
    
    // Sort dates to find the most recent one
    const sortedDates = [...availableDates].sort((a, b) => {
      const [dayA, monthA] = a.split('-').map(Number);
      const [dayB, monthB] = b.split('-').map(Number);
      if (monthA !== monthB) return monthB - monthA;
      return dayB - dayA;
    });
    
    return sortedDates[0];
  }, [availableDates]);

  // Add missing variables from useRealtimeProducts hook
  const {
    products: realtimeProducts = [],
    loading: realtimeLoading,
    error: realtimeError,
    isConnected: isRealtimeConnected,
    connectionState,
    lastUpdateTime,
    updateCount,
    stats,
    refreshProducts,
    registerRefreshCallback = () => {},
    unregisterRefreshCallback = () => {}
  } = useRealtimeProducts() || {};

  // Debug WebSocket connection status
  console.log('🔌 [ExcelStylePriceList] WebSocket status:', {
    isRealtimeConnected,
    realtimeError,
    realtimeLoading
  });

  // Use unified WebSocket for better connection reliability
  const { isConnected: isUnifiedWSConnected } = useUnifiedWebSocket(
    ({ title, description, duration, variant }: any) => {
      toast({ title, description, duration, variant });
    },
    { enabled: true }
  );

  // Prefer unified WebSocket status over realtime status
  const finalWebSocketStatus = isUnifiedWSConnected;


  // Add missing variable declarations
  const updateFilter = useCallback((key: keyof FilterState, value: any) => {
    setCurrentFilters(prev => ({
      ...prev,
      [key]: value
    }));
  }, []);

  // Add missing function
  const formatLastSync = (lastUpdate: string | null) => {
    if (!lastUpdate) return 'Nunca';
    return lastUpdate;
  };

  // Add missing addToList function
  const addToList = useCallback((product: Product) => {
    console.log('Adding product to list:', product);
  }, []);

  // Query for monitoring data - similar to other components
  const { data: monitoringData } = useQuery({
    queryKey: ['monitoring-status'],
    queryFn: async () => {
      try {
        const headers = await getAuthHeaders();
        const res = await fetch('/api/monitoring/real-status', { headers });
        if (!res.ok) return null;
        const data = await res.json();
        console.log('🕐 Monitoring data received:', data);
        return data;
      } catch (error) {
        console.warn('Failed to fetch monitoring data:', error);
        return null;
      }
    },
    staleTime: 30 * 1000, // 30 seconds
    refetchInterval: 30 * 1000, // Refresh every 30 seconds
    refetchOnWindowFocus: false,
    retry: 1
  });

  // Products data memoization - now after all variables are declared
  const {
    data,
    error,
    isLoading: productsLoading,
    refetch: refetchProducts
  } = useQuery({
    queryKey: ['/api/products', dateFilter, currentFilters.date, stats?.updateCount],
    queryFn: async () => {
      const currentDateFilter = dateFilter || currentFilters.date || 'all';
      console.log('🔄 ExcelStylePriceList: Fetching products...', {
        dateFilter: currentDateFilter,
        propsDateFilter: dateFilter,
        currentFiltersDate: currentFilters.date,
        updateCount: stats?.updateCount,
        timestamp: new Date().toISOString()
      });

      try {
        const headers = await getAuthHeaders();
        const params = new URLSearchParams();

        // Include date parameter using 'date' instead of 'dateFilter'
        if (currentDateFilter && currentDateFilter !== 'all') {
          params.set('date', currentDateFilter);
        }

        // Request all products without server-pagination
        params.set('limit', '999999');
        params.set('page', '1');

        // Add cache busting parameter for real-time updates
        params.set('_t', Date.now().toString());

        const url = `/api/products${params.toString() ? `?${params}` : ''}`;
        console.log('🔗 Request URL:', url, 'with date:', currentDateFilter);

        const res = await fetch(url, {
          headers: {
            ...headers,
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache'
          }
        });

        if (!res.ok) {
          const errorText = await res.text();
          console.error('❌ Products fetch failed:', res.status, errorText);

          // Return empty data structure instead of throwing to prevent infinite loading
          return {
            success: false,
            products: [],
            total: 0,
            actualDate: currentDateFilter,
            error: `API Error: ${res.status}`
          };
        }

        const result = await res.json();

        // Handle API errors gracefully
        if (!result.success && result.error) {
          console.warn('⚠️ API returned error:', result.error);
          return {
            success: false,
            products: [],
            total: 0,
            actualDate: currentDateFilter,
            error: result.error
          };
        }

        console.log('✅ Products response received for date:', currentDateFilter, {
          hasSuccess: 'success' in result,
          hasData: 'data' in result,
          hasProducts: 'products' in result,
          dataProductsLength: result.data?.products?.length || 0,
          directProductsLength: result.products?.length || 0,
          actualDate: result.data?.actualDate || result.actualDate,
          requestedDate: result.data?.requestedDate,
          totalCount: result.total || result.totalCount || 0,
          fetchTime: new Date().toISOString()
        });

        return result;
      } catch (error: unknown) {
        console.error('❌ Products query error:', error);
        const errorMessage = error instanceof Error ? error.message : 'Erro de conexão';
        // Return empty data structure instead of throwing to prevent infinite loading
        return {
          success: false,
          products: [],
          total: 0,
          actualDate: currentDateFilter,
          error: errorMessage
        };
      }
    },
    staleTime: 5 * 1000, // Reduzido para 5 segundos para atualizações mais rápidas
    refetchOnWindowFocus: true, // Reativar refresh ao focar na janela
    retry: 2, // Increase retry attempts
    enabled: true, // Always enabled - let the API handle filtering
    refetchInterval: false // Disable automatic refetching
  });

  // Register WebSocket callback for automatic refresh
  useEffect(() => {
    const refreshCallback = () => {
      console.log('🔄 WebSocket triggered refresh - invalidating cache and refetching products');
      queryClient.invalidateQueries({ queryKey: ['/api/products'] });
      refetchProducts();
    };

    if (registerRefreshCallback) {
      registerRefreshCallback(refreshCallback);
    }

    // Cleanup on unmount
    return () => {
      if (unregisterRefreshCallback) {
        unregisterRefreshCallback();
      }
    };
  }, [registerRefreshCallback, unregisterRefreshCallback, queryClient, refetchProducts]);

  // Listen for custom browser events for real-time updates
  useEffect(() => {
    const handleRealtimeUpdate = (event: CustomEvent) => {
      console.log('📡 Custom real-time update event received:', event.detail);
      queryClient.invalidateQueries({ queryKey: ['/api/products'] });
      refetchProducts();
    };

    window.addEventListener('realtimeDataUpdate', handleRealtimeUpdate as EventListener);

    return () => {
      window.removeEventListener('realtimeDataUpdate', handleRealtimeUpdate as EventListener);
    };
  }, [queryClient, refetchProducts]);

  // Extract products from normalized response with better error handling
  const products = useMemo(() => {
    console.log('📦 Processing products data:', {
      hasData: !!data,
      dataType: typeof data,
      dataKeys: data ? Object.keys(data) : [],
      isLoading: productsLoading,
      hasError: !!error
    });

    if (!data) {
      console.log('⚠️ No data received from API');
      return [];
    }

    // Handle different response structures
    let extractedProducts: Product[] = [];

    if ((data as any).data && Array.isArray((data as any).data.products)) {
      // Nested structure: { data: { products: [...] } }
      extractedProducts = (data as any).data.products as Product[];
    } else if (Array.isArray((data as any).products)) {
      // Direct structure: { products: [...] }
      extractedProducts = (data as any).products as Product[];
    } else if (Array.isArray((data as any).data)) {
      // Alternative structure: { data: [...] }
      extractedProducts = (data as any).data as Product[];
    } else if (Array.isArray(data)) {
      // Direct array
      extractedProducts = data;
    }

    console.log('📦 Extracted products:', {
      source: data.data?.products ? 'data.data.products' :
              data.products ? 'data.products' :
              data.data ? 'data.data' :
              Array.isArray(data) ? 'direct array' : 'unknown',
      count: extractedProducts.length,
      total: data.total || data.data?.total,
      actualDate: data.actualDate || data.data?.actualDate,
      success: data.success
    });

    return extractedProducts || [];
  }, [data, productsLoading, error]);


  // Function to generate suggestions based on product models
  const debouncedGetSuggestions = useCallback(
    debounce(async (query: string) => {
      if (!query || query.length < 2) {
        setSuggestions([]);
        setShowSuggestions(false);
        return;
      }

      setIsLoadingSuggestions(true);
      try {
        const queryLower = query.toLowerCase().trim();
        const uniqueModels: string[] = [];
        const seenModels = new Set<string>();

        // Use all products for suggestions to avoid empty results
        products.forEach((p: Product) => {
          if (p.model && typeof p.model === 'string') {
            const modelLower = p.model.toLowerCase();

            // Simple inclusive matching for better user experience
            if (modelLower.includes(queryLower) && !seenModels.has(p.model)) {
              seenModels.add(p.model);
              uniqueModels.push(p.model);
            }
          }
        });

        // Sort by relevance (exact matches first, then partial matches)
        const sortedSuggestions = uniqueModels.sort((a, b) => {
          const aLower = a.toLowerCase();
          const bLower = b.toLowerCase();

          // Exact start matches first
          const aStartsExact = aLower.startsWith(queryLower);
          const bStartsExact = bLower.startsWith(queryLower);

          if (aStartsExact && !bStartsExact) return -1;
          if (!aStartsExact && bStartsExact) return 1;

          // Then by length (shorter first)
          return a.length - b.length;
        });

        const finalSuggestions = sortedSuggestions.slice(0, 10);
        setSuggestions(finalSuggestions);
        setShowSuggestions(finalSuggestions.length > 0);
      } catch (error) {
        console.error('Error generating suggestions:', error);
        setSuggestions([]);
        setShowSuggestions(false);
      } finally {
        setIsLoadingSuggestions(false);
      }
    }, 300),
    [products] // Dependency on products ensures suggestions are based on current product list
  );


  // Function to check exact model match for filtering
  const isExactModelMatch = useCallback((product: Product, searchTerm: string, includeVariants: boolean = false) => {
    if (!searchTerm || !searchTerm.trim()) return true;

    const searchLower = searchTerm.toLowerCase().trim();
    const productModel = (product.model || '').toLowerCase();
    const productBrand = (product.brand || '').toLowerCase();

    // Define unwanted variants that should be excluded unless explicitly searched
    const unwantedVariants = ['cpo', 'recondicionado', 'ativado', 'usado', 'refurbished', 'open box'];

    // Check if the search term explicitly includes any unwanted variants
    const searchIncludesUnwantedVariant = unwantedVariants.some(variant =>
      searchLower.includes(variant)
    );

    // If includeVariants is true, skip variant filtering
    // If search doesn't include unwanted variants, exclude products that have them (unless includeVariants is true)
    if (!searchIncludesUnwantedVariant && !includeVariants) {
      const hasUnwantedVariant = unwantedVariants.some(variant =>
        productModel.includes(variant)
      );
      if (hasUnwantedVariant) {
        return false;
      }
    }

    // Check if it's a number search (like "14", "15", "16")
    const numberMatch = searchLower.match(/^(\d+)$/);
    if (numberMatch) {
      const searchNumber = numberMatch[1];
      // For number searches, match iPhone models with the number
      if (includeVariants) {
        // When showing all variants, include any iPhone with the number
        const anyIPhonePattern = new RegExp(`\\biphone\\s*${searchNumber}`, 'i');
        return anyIPhonePattern.test(productModel);
      } else {
        // Original strict matching for exact base model
        const exactIPhonePattern = new RegExp(`\\biphone\\s*${searchNumber}(?!\\s*[a-z]|\\s*(pro|max|plus|mini|e|se))\\b`, 'i');
        return exactIPhonePattern.test(productModel);
      }
    }

    // Check if it's an iPhone search that needs exact matching
    const iphoneMatch = searchLower.match(/^iphone\s*(\d+)([a-z]*)?(\s+pro)?(\s+max|\s+plus|\s+mini)?$/i);
    if (iphoneMatch) {
      const searchNumber = iphoneMatch[1];
      const searchVariant = iphoneMatch[2] || '';
      const searchPro = iphoneMatch[3] || '';
      const searchSize = iphoneMatch[4] || '';

      // Check if product is iPhone-related
      const isIPhoneProduct = productModel.includes('iphone') ||
                             (product.category && product.category.toUpperCase() === 'IPH');

      if (!isIPhoneProduct || !productModel.includes(searchNumber)) {
        return false;
      }

      // If showing all variants, include any iPhone with the search number
      if (includeVariants) {
        return productModel.includes(`iphone`) && productModel.includes(searchNumber);
      }

      // STRICT EXACT MATCHING LOGIC
      if (!searchVariant && !searchPro && !searchSize) {
        // Base iPhone model search - must NOT have ANY variants
        const strictBasePattern = new RegExp(`\\biphone\\s*${searchNumber}(?!\\s*[a-z]|\\s*(pro|max|plus|mini|e|se))\\b`, 'i');
        return strictBasePattern.test(productModel);
      } else if (searchVariant && !searchPro && !searchSize) {
        // Handle variants like iPhone 16e - exact match for the variant
        const variantPattern = new RegExp(`\\biphone\\s*${searchNumber}${searchVariant}(?!\\s*(pro|max|plus|mini))(?:\\s|$)`, 'i');
        return variantPattern.test(productModel);
      } else if (searchPro && searchSize) {
        // iPhone X Pro Max/Plus/Mini - must have BOTH pro AND size
        let exactPattern = `\\biphone\\s*${searchNumber}`;
        if (searchVariant) exactPattern += searchVariant;
        exactPattern += '\\s*pro';

        const sizeNormalized = searchSize.trim().toLowerCase();
        if (sizeNormalized.includes('plus')) {
          exactPattern += '\\s*plus';
        } else if (sizeNormalized.includes('max')) {
          exactPattern += '\\s*max';
        } else if (sizeNormalized.includes('mini')) {
          exactPattern += '\\s*mini';
        }
        exactPattern += '(?:\\s|$)';

        const exactRegex = new RegExp(exactPattern, 'i');
        return exactRegex.test(productModel);
      } else if (searchPro && !searchSize) {
        // iPhone X Pro (without Max) - must have pro but NOT max/plus/mini
        const exactProPattern = new RegExp(`\\biphone\\s*${searchNumber}${searchVariant}\\s*pro(?!\\s*(max|plus|mini))(?:\\s|$)`, 'i');
        return exactProPattern.test(productModel);
      } else if (!searchPro && searchSize) {
        // iPhone X Plus/Mini (without Pro) - must have size but NOT pro
        let exactPattern = `\\biphone\\s*${searchNumber}`;
        if (searchVariant) exactPattern += searchVariant;
        exactPattern += '(?!\\s*pro)';

        const sizeNormalized = searchSize.trim().toLowerCase();
        if (sizeNormalized.includes('plus')) {
          exactPattern += '\\s*plus';
        } else if (sizeNormalized.includes('mini')) {
          exactPattern += '\\s*mini';
        }
        exactPattern += '(?:\\s|$)';

        const exactRegex = new RegExp(exactPattern, 'i');
        return exactRegex.test(productModel);
      }

      // For "iPhone 16 Pro Max" searches, be EXTREMELY inclusive
      if (searchPro && searchSize && searchSize.includes('max')) {
        // Match ANY iPhone with the number that contains BOTH "pro" AND "max"
        // Use very flexible pattern matching
        const hasIPhone = productModel.includes('iphone') || productModel.includes('iph');
        const hasNumber = productModel.includes(searchNumber);
        const hasPro = productModel.includes('pro');
        const hasMax = productModel.includes('max');

        const matched = hasIPhone && hasNumber && hasPro && hasMax;

        if (matched) {
          console.log('✅ SUPER INCLUSIVE iPhone Pro Max matched:', productModel);
        } else {
          console.log('❌ iPhone Pro Max NOT matched:', productModel, {
            hasIPhone, hasNumber, hasPro, hasMax
          });
        }
        return matched;
      }

      return false;
    }

    // For non-iPhone searches, use partial matching
    if (includeVariants) {
      // When showing all variants, include any product that contains the search term
      return productModel.includes(searchLower);
    } else {
      // Original logic: exclude unwanted variants unless explicitly searched
      return productModel.includes(searchLower);
    }
  }, []);

  // Function to calculate search relevance score
  const getSearchRelevanceScore = useCallback((product: Product, searchTerm: string) => {
    if (!searchTerm || !searchTerm.trim()) return 0;

    const searchLower = searchTerm.toLowerCase().trim();
    const productModel = (product.model || '').toLowerCase();
    const productBrand = (product.brand || '').toLowerCase();
    const productCategory = (product.category || '').toLowerCase();

    // Use exact matching for iPhone searches
    if (searchLower.match(/^(\d+)$/) || searchLower.match(/^iphone\s*(\d+)/i)) {
      return isExactModelMatch(product, searchTerm) ? 1000 : 0;
    }

    // For other brand searches (Xiaomi, Samsung, etc.)
    const xiaomiMatch = searchLower.match(/^(redmi|poco|xiaomi)\s*(.+)$/i);
    if (xiaomiMatch) {
      const brand = xiaomiMatch[1];
      const model = xiaomiMatch[2];
      const brandRegex = new RegExp(`\\b${brand}\\s*${model.replace(/\s+/g, '\\s*')}\\b`, 'i');
      return brandRegex.test(productModel) ? 700 : 0;
    }

    // Default text matching
    if (productModel.includes(searchLower)) return 400;
    if (productBrand.includes(searchLower)) return 300;
    if (productCategory.includes(searchLower)) return 200;

    return 0;
  }, [isExactModelMatch]);

  // First filter products by search term to get search-filtered products
  const searchFilteredProducts = useMemo(() => {
    if (!products || products.length === 0) {
      console.log('⚠️ No products available for search');
      return [];
    }

    // Use searchTerm state as the primary source of truth
    const activeSearchTerm = searchTerm || currentFilters.search || searchFilter || '';

    console.log('🔍 ExcelStylePriceList: Processing search:', {
      searchTerm,
      activeSearchTerm,
      currentFiltersSearch: currentFilters.search,
      propsSearchFilter: searchFilter,
      productsCount: products.length,
      willFilter: !!activeSearchTerm.trim(),
      showAllVariants
    });

    if (!activeSearchTerm || activeSearchTerm.trim().length === 0) {
      console.log('📋 ExcelStylePriceList: No search term - returning all products');
      return products;
    }

    const searchLower = activeSearchTerm.toLowerCase().trim();

    // Apply strict exact model matching for iPhone searches
    const filteredProducts = products.filter((product: Product) => {
      const productModel = (product.model || '').toLowerCase();
      const productBrand = (product.brand || '').toLowerCase();
      const productCategory = (product.category || '').toLowerCase();
      const supplierName = typeof product.supplier === 'string' ?
        product.supplier.toLowerCase() :
        (product.supplier?.name || product.supplierName || '').toLowerCase();

      // For iPhone searches, use strict exact matching (or include variants if showAllVariants is true)
      if (searchLower.match(/^(\d+)$/) || searchLower.match(/^iphone\s*(\d+)/i)) {
        return isExactModelMatch(product, activeSearchTerm, showAllVariants);
      }

      // For non-iPhone searches, use broader matching
      return productModel.includes(searchLower) ||
             productBrand.includes(searchLower) ||
             productCategory.includes(searchLower) ||
             supplierName.includes(searchLower) ||
             (product.color && product.color.toLowerCase().includes(searchLower)) ||
             (product.storage && product.storage.toLowerCase().includes(searchLower));
    });

    // Sort by relevance score (highest first), then by price
    const sortedProducts = filteredProducts.sort((a: Product, b: Product) => {
      const scoreA = getSearchRelevanceScore(a, activeSearchTerm);
      const scoreB = getSearchRelevanceScore(b, activeSearchTerm);

      // Sort by relevance score first (higher scores first)
      if (scoreA !== scoreB) {
        return scoreB - scoreA;
      }

      // If same relevance, sort by price (lower first)
      const priceA = typeof a.price === 'string' ? parseFloat(a.price.replace(/[^\d.,]/g, '').replace(',', '.')) || 0 : (a.price || 0);
      const priceB = typeof b.price === 'string' ? parseFloat(b.price.replace(/[^\d.,]/g, '').replace(',', '.')) || 0 : (b.price || 0);
      return priceA - priceB;
    });

    console.log('🎯 ExcelStylePriceList: Search results with strict matching:', {
      activeSearchTerm,
      totalProducts: products.length,
      filteredProducts: filteredProducts.length,
      sortedProducts: sortedProducts.length,
      showAllVariants,
      topResults: sortedProducts.slice(0, 5).map((p: Product) => ({
        model: p.model,
        supplier: typeof p.supplier === 'string' ? p.supplier : p.supplier?.name || p.supplierName,
        score: getSearchRelevanceScore(p, activeSearchTerm),
        price: p.price,
        color: p.color,
        storage: p.storage
      })),
      searchSuccessful: sortedProducts.length > 0
    });

    if (sortedProducts.length === 0) {
      console.warn('⚠️ ExcelStylePriceList: Search returned no results for:', activeSearchTerm);
    }

    return sortedProducts;
  }, [products, searchTerm, currentFilters.search, searchFilter, getSearchRelevanceScore, isExactModelMatch, showAllVariants]);

  // Generate filter options based on search-filtered products only
  const filterOptions = useMemo(() => {
    // ALWAYS use search-filtered products for filters when there's a search term
    const hasActiveSearch = !!(currentFilters.search || searchFilter);
    const productsForFilters = hasActiveSearch ? searchFilteredProducts : products;

    console.log('🎯 Using products for filters:', {
      totalProducts: products.length,
      searchFilteredProducts: searchFilteredProducts.length,
      productsForFilters: productsForFilters.length,
      hasSearch: hasActiveSearch,
      searchTerm: currentFilters.search || searchFilter || '(nenhuma)'
    });

    // Build filter options with counts - specifically for the searched products
    const options = {
      categories: buildFilterOptions(productsForFilters, 'category'),
      capacities: buildFilterOptions(productsForFilters, 'capacity', (p) => p.capacity || p.storage), // Include storage as capacity fallback
      regions: buildFilterOptions(productsForFilters, 'region'),
      colors: buildFilterOptions(productsForFilters, 'color'),
      suppliers: buildFilterOptions(productsForFilters, 'supplier', (product: Product) =>
        typeof product.supplier === 'string' ? product.supplier : product.supplier?.name || 'Unknown'
      )
    };

    console.log('🎯 Filter options for search-filtered products:', {
      searchTerm: currentFilters.search || searchFilter || '(nenhuma)',
      productsCount: productsForFilters.length,
      filterCounts: {
        categories: options.categories.length,
        capacities: options.capacities.length,
        regions: options.regions.length,
        colors: options.colors.length,
        suppliers: options.suppliers.length
      },
      sampleOptions: {
        categories: options.categories.slice(0, 5).map(opt => `${opt.value} (${opt.count})`),
        colors: options.colors.slice(0, 5).map(opt => `${opt.value} (${opt.count})`),
        capacities: options.capacities.slice(0, 5).map(opt => `${opt.value} (${opt.count})`),
        suppliers: options.suppliers.slice(0, 5).map(opt => `${opt.value} (${opt.count})`)
      }
    });

    return options;
  }, [products, searchFilteredProducts, currentFilters.search, searchFilter]);

  // Function to generate consistent supplier IDs using hash
  const generateSupplierId = (name: string): number => {
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      const char = name.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash);
  };

  // Extract unique suppliers from products
  const suppliers = useMemo(() => {
    console.log('🏪 Extracting suppliers from products:', products.length, 'products');
    console.log('🏪 Current supplier contacts state:', Object.keys(supplierContacts).length, 'contacts loaded');

    const supplierSet = new Map<string, { id: number; name: string }>();

    products.forEach((product: Product, index: number) => {
      let supplierName = '';

      // Handle different supplier data structures
      if (product.supplierName) {
        supplierName = product.supplierName;
      } else if (typeof product.supplier === 'string') {
        supplierName = product.supplier;
      } else if (product.supplier && typeof product.supplier === 'object') {
        supplierName = product.supplier.name || product.supplier.id?.toString() || '';
      } else if (product.brand) {
        supplierName = product.brand;
      }

      if (supplierName && supplierName.trim()) {
        const cleanName = supplierName.trim();
        if (!supplierSet.has(cleanName)) {
          supplierSet.set(cleanName, {
            id: generateSupplierId(cleanName), // Use hash for consistent ID
            name: cleanName
          });
        }
      }
    });

    const suppliersArray = Array.from(supplierSet.values()).sort((a, b) => a.name.localeCompare(b.name));
    console.log('🏪 Extracted suppliers:', suppliersArray.length, 'unique suppliers');
    console.log('🏪 Sample suppliers vs contacts:', {
      suppliers: suppliersArray.slice(0, 5).map(s => s.name),
      contacts: Object.keys(supplierContacts).slice(0, 5)
    });

    return suppliersArray;
  }, [products, supplierContacts]);

  // Get the active search term from any source
  const activeSearchTerm = searchTerm || currentFilters.search || searchFilter || '';

  // Colors API query - ALWAYS enabled to prevent conditional hooks
  const { data: colorsData } = useQuery({
    queryKey: ['colors', activeSearchTerm, currentFilters.date, currentFilters.capacity, currentFilters.storages],
    queryFn: async () => {
      try {
        if (!activeSearchTerm.trim()) {
          return { colors: [] };
        }

        const headers = await getAuthHeaders();
        const searchParams = new URLSearchParams();
        searchParams.append('model', activeSearchTerm.trim());
        if (currentFilters.date && currentFilters.date !== 'all') {
          searchParams.append('date', currentFilters.date);
        }
        // Add storage filter if a single storage is selected
        if (currentFilters.storages && currentFilters.storages.length === 1) {
          searchParams.append('storage', currentFilters.storages[0]);
        }
        // Add capacity filter if a single capacity is selected
        if (currentFilters.capacity && currentFilters.capacity.length === 1) {
          searchParams.append('capacity', currentFilters.capacity[0]);
        }
        const response = await fetch(`/api/products/colors?${searchParams}`, { headers });
        if (!response.ok) return { colors: [] };
        const data = await response.json();
        console.log('🎨 Colors API response with EXACT model filters:', {
          searchParams: searchParams.toString(),
          modelFilter: activeSearchTerm,
          data
        });
        return data;
      } catch (error) {
        console.error('Error fetching colors:', error);
        return { colors: [] };
      }
    },
    enabled: true, // Always enabled
    staleTime: 30000,
    retry: false, // Disable retries to prevent hook order issues
  });

  // Storage options API query - ALWAYS enabled to prevent conditional hooks
  const { data: storageData } = useQuery({
    queryKey: ['storage-options', activeSearchTerm, currentFilters.date, currentFilters.colors],
    queryFn: async () => {
      try {
        if (!activeSearchTerm.trim()) {
          return { storageOptions: [] };
        }

        const headers = await getAuthHeaders();
        const searchParams = new URLSearchParams();
        searchParams.append('model', activeSearchTerm.trim());
        if (currentFilters.date && currentFilters.date !== 'all') {
          searchParams.append('date', currentFilters.date);
        }
        // Don't add color filter here to get all storage options for the model
        const response = await fetch(`/api/products/storage-options?${searchParams}`, { headers });
        if (!response.ok) return { storageOptions: [] };
        const data = await response.json();
        console.log('💾 Storage options API response with EXACT filtering:', {
          modelFilter: activeSearchTerm,
          data
        });
        return data;
      } catch (error) {
        console.error('Error fetching storage options:', error);
        return { storageOptions: [] };
      }
    },
    enabled: true, // Always enabled
    staleTime: 30000,
    retry: false, // Disable retries to prevent hook order issues
  });

  // Capacity options API query - ALWAYS enabled to prevent conditional hooks
  const { data: capacityData } = useQuery({
    queryKey: ['capacity-options', activeSearchTerm, currentFilters.date],
    queryFn: async () => {
      try {
        if (!activeSearchTerm.trim()) {
          return { capacityOptions: [] };
        }

        const headers = await getAuthHeaders();
        const searchParams = new URLSearchParams();
        searchParams.append('model', activeSearchTerm.trim());
        if (currentFilters.date && currentFilters.date !== 'all') {
          searchParams.append('date', currentFilters.date);
        }

        // Add includeVariants parameter for more inclusive results
        searchParams.append('includeVariants', 'true');

        const response = await fetch(`/api/products/capacity-options?${searchParams}`, { headers });
        if (!response.ok) {
          console.warn('❌ Capacity API failed:', response.status, response.statusText);
          return { capacityOptions: [] };
        }

        const data = await response.json();
        console.log('💾 Capacity options API response ENHANCED:', {
          modelFilter: activeSearchTerm,
          requestParams: searchParams.toString(),
          responseData: data,
          capacityCount: data?.capacityOptions?.length || 0
        });
        return data;
      } catch (error) {
        console.error('Error fetching capacity options:', error);
        return { capacityOptions: [] };
      }
    },
    enabled: true, // Always enabled
    staleTime: 15000, // Reduced cache time for more frequent updates
    retry: 1, // Allow one retry
  });

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: Event) => {
      const target = event.target as Node;

      // Create a parent container that includes search input, suggestions, and dropdown
      const searchContainer = searchInputRef.current?.parentElement;

      // Check if click is outside the entire search container
      let isClickOutside = true;

      if (searchContainer && searchContainer.contains(target)) {
        isClickOutside = false;
      }

      // Also check individual refs as fallback
      if (searchInputRef.current && searchInputRef.current.contains(target)) {
        isClickOutside = false;
      }

      if (suggestionsRef.current && suggestionsRef.current.contains(target)) {
        isClickOutside = false;
      }

      if (dropdownRef.current && dropdownRef.current.contains(target)) {
        isClickOutside = false;
      }

      // Only close if the click is definitely outside all related elements
      if (isClickOutside) {
        setShowSuggestions(false);
        setShowDropdown(false);
        setSelectedSuggestionIndex(-1);
      }
    };

    // Add event listener for clicks
    document.addEventListener('mousedown', handleClickOutside);
    // Also listen for touches on mobile
    document.addEventListener('touchstart', handleClickOutside);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, []); // Empty dependency array to only run once on mount

  // STRICT: When search is active, ONLY use API data from exact filtered endpoints
  const hasActiveSearch = !!activeSearchTerm.trim();

  const categories = hasActiveSearch ?
    // When searching, only show categories from search-filtered products
    filterOptions.categories.map(opt => opt.value) :
    filterOptions.categories.map(opt => opt.value);

  const capacities = hasActiveSearch ?
    // When searching, prioritize search-filtered products for capacity options
    (() => {
      // First, get capacities directly from search-filtered products
      const directCapacities = [...new Set(
        searchFilteredProducts
          .map(p => p.capacity || p.storage)
          .filter(cap => cap && cap.toString().trim() && cap !== 'undefined' && cap !== 'null')
      )];

      // Then combine with API data as backup
      const apiCapacities = capacityData?.capacityOptions || [];
      const apiStorages = storageData?.storageOptions || [];
      const filteredCapacities = filterOptions.capacities.map(opt => opt.value);

      // Combine all sources and remove duplicates, prioritizing direct capacities
      const combinedCapacities = [...new Set([...directCapacities, ...apiCapacities, ...apiStorages, ...filteredCapacities])];

      console.log('📊 Enhanced capacity options for search:', {
        searchTerm: activeSearchTerm,
        searchFilteredProductsCount: searchFilteredProducts.length,
        directCapacities: directCapacities.length,
        directValues: directCapacities,
        apiCapacities: apiCapacities.length,
        apiStorages: apiStorages.length,
        filteredCapacities: filteredCapacities.length,
        combined: combinedCapacities.length,
        finalValues: combinedCapacities
      });

      return combinedCapacities;
    })() :
    filterOptions.capacities.map(opt => opt.value);

  const regions = hasActiveSearch ?
    // When searching, only show regions from search-filtered products
    filterOptions.regions.map(opt => opt.value) :
    filterOptions.regions.map(opt => opt.value);

  const colors = hasActiveSearch ?
    // When searching, use API data if available, otherwise use filtered data from search results
    (colorsData?.colors || filterOptions.colors.map(opt => opt.value)) :
    filterOptions.colors.map(opt => opt.value);

  // STRICT validation: Remove empty filter options when search is active
  const validCategories = hasActiveSearch ?
    categories.filter(cat => cat && cat.trim() && cat !== 'undefined' && cat !== 'null') :
    categories;

  const validCapacities = hasActiveSearch ?
    capacities.filter((cap: string) => {
      const isValid = cap &&
                     cap.toString().trim() &&
                     cap.toString().trim() !== 'undefined' &&
                     cap.toString().trim() !== 'null' &&
                     cap.toString().trim() !== '' &&
                     cap.toString().trim() !== 'N/A';

      if (!isValid && activeSearchTerm.toLowerCase().includes('iphone 16 pro max')) {
        console.log('🚫 Invalid capacity filtered out:', cap);
      }

      return isValid;
    }) :
    capacities;

  const validRegions = hasActiveSearch ?
    regions.filter(reg => reg && reg.trim() && reg !== 'undefined' && reg !== 'null') :
    regions;

  const validColors = hasActiveSearch ?
    colors.filter((color: string) => color && color.trim() && color !== 'undefined' && color !== 'null') :
    colors;

  // Log filter data for debugging
  console.log('🎯 STRICT Filter arrays updated:', {
    activeSearchTerm: activeSearchTerm || '(nenhuma)',
    searchTerm,
    currentFiltersSearch: currentFilters.search,
    propsSearchFilter: searchFilter,
    hasActiveSearch,
    categories: validCategories.length,
    capacities: validCapacities.length,
    regions: validRegions.length,
    colors: validColors.length,
    sampleCategories: validCategories.slice(0, 3),
    sampleColors: validColors.slice(0, 3),
    sampleCapacities: validCapacities.slice(0, 3),
    allCapacities: validCapacities,
    originalCounts: {
      categories: categories.length,
      capacities: capacities.length,
      regions: regions.length,
      colors: colors.length
    },
    apiData: {
      capacityApiData: capacityData?.capacityOptions || null,
      storageApiData: storageData?.storageOptions || null,
      colorsApiData: colorsData?.colors || null,
      searchFilteredProducts: searchFilteredProducts.length
    },
    rawSearchFilteredProducts: searchFilteredProducts.map(p => ({
      model: p.model,
      capacity: p.capacity,
      storage: p.storage,
      color: p.color
    })).slice(0, 10)
  });

  // Log específico para iPhone 16 Pro Max
  if (activeSearchTerm.toLowerCase().includes('iphone 16 pro max')) {
    console.log('🎯 iPhone 16 Pro Max Debug SUPER ENHANCED:', {
      searchTerm: activeSearchTerm,
      originalProducts: products.length,
      searchFilteredProductsCount: searchFilteredProducts.length,
      uniqueCapacitiesInProducts: [...new Set(searchFilteredProducts.map(p => p.capacity).filter(Boolean))],
      uniqueStoragesInProducts: [...new Set(searchFilteredProducts.map(p => p.storage).filter(Boolean))],
      capacityApiResponse: capacityData,
      storageApiResponse: storageData,
      finalCapacitiesArray: validCapacities,
      // ALL iPhone 16 Pro Max products found
      allIPhone16ProMaxProducts: searchFilteredProducts.map(p => ({
        model: p.model,
        capacity: p.capacity,
        storage: p.storage,
        color: p.color,
        supplier: typeof p.supplier === 'string' ? p.supplier : p.supplier?.name,
        price: p.price,
        region: p.region
      })),
      // Check if there are more in original products
      potentialMatches: products.filter(p => {
        const model = (p.model || '').toLowerCase();
        return model.includes('iphone') && model.includes('16') && model.includes('pro') && model.includes('max');
      }).map(p => ({
        model: p.model,
        capacity: p.capacity,
        storage: p.storage,
        color: p.color
      })),
      // Statistics
      stats: {
        totalProducts: products.length,
        afterSearch: searchFilteredProducts.length,
        allCapacities: [...new Set(searchFilteredProducts.map(p => p.capacity || p.storage).filter(Boolean))],
        allColors: [...new Set(searchFilteredProducts.map(p => p.color).filter(Boolean))],
        allSuppliers: [...new Set(searchFilteredProducts.map(p =>
          typeof p.supplier === 'string' ? p.supplier : p.supplier?.name
        ).filter(Boolean))]
      }
    });
  }

  const hasActiveFilters = useMemo(() => {
    return !!(
      currentFilters.search ||
      currentFilters.categories?.length ||
      currentFilters.capacity?.length ||
      currentFilters.regions?.length ||
      currentFilters.colors?.length ||
      currentFilters.suppliers?.length ||
      currentFilters.storages?.length ||
      currentFilters.supplierIds?.length ||
      (currentFilters.supplierId && currentFilters.supplierId !== 'all') ||
      (currentFilters.brandCategory && currentFilters.brandCategory !== 'all')
    );
  }, [currentFilters]);

  // Check if there are active filters excluding search (for dropdown behavior)
  const hasActiveNonSearchFilters = useMemo(() => {
    return !!(
      currentFilters.categories?.length ||
      currentFilters.capacity?.length ||
      currentFilters.regions?.length ||
      currentFilters.colors?.length ||
      currentFilters.suppliers?.length ||
      currentFilters.storages?.length ||
      currentFilters.supplierIds?.length ||
      (currentFilters.supplierId && currentFilters.supplierId !== 'all') ||
      (currentFilters.brandCategory && currentFilters.brandCategory !== 'all')
    );
  }, [currentFilters]);

  // Helper function to get the correct source products for dropdown/suggestions
  const getSourceProducts = useCallback(() => {
    if (!searchFilteredProducts) return [];

    // If we have non-search filters active, apply them to searchFilteredProducts
    if (hasActiveNonSearchFilters) {
      return searchFilteredProducts.filter(product => {
        // Apply category filter
        if (currentFilters.categories.length > 0 && !currentFilters.categories.includes(product.category || '')) {
          return false;
        }

        // Apply capacity filter
        if (currentFilters.capacity.length > 0 && !currentFilters.capacity.includes(product.capacity || '')) {
          return false;
        }

        // Apply regions filter
        if (currentFilters.regions.length > 0 && !currentFilters.regions.includes(product.region || '')) {
          return false;
        }

        // Apply colors filter
        if (currentFilters.colors.length > 0 && !currentFilters.colors.includes(product.color || '')) {
          return false;
        }

        // Apply suppliers filter
        if (currentFilters.supplierIds.length > 0) {
          const productSupplierName = (product.supplierName ||
            (typeof product.supplier === 'string' ? product.supplier : product.supplier?.name) || '').trim();

          const isSupplierSelected = currentFilters.supplierIds.some(selectedSupplierId => {
            const selectedSupplier = suppliers.find(s => s.id.toString() === selectedSupplierId);
            return selectedSupplier && selectedSupplier.name.trim() === productSupplierName;
          });

          if (!isSupplierSelected) {
            return false;
          }
        }

        return true;
      });
    }

    // If no non-search filters, return searchFilteredProducts as is
    return searchFilteredProducts;
  }, [searchFilteredProducts, hasActiveNonSearchFilters, currentFilters, suppliers]);

  const getStorageBadgeColor = (storage: string) => {
    if (!storage) return "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300";

    const size = parseInt(storage);
    if (size >= 1000) return "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300";
    if (size >= 512) return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300";
    if (size >= 256) return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300";
    if (size >= 128) return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300";
    return "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300";
  };

  // Helper function to clear filters
  const clearFilters = () => {
    setCurrentFilters({
      suppliers: [],
      categories: [],
      storages: [],
      regions: [],
      colors: [],
      search: '',
      date: 'all',
      capacity: [],
      supplierId: 'all',
      supplierIds: [],
      brandCategory: 'all'
    });
    setSearchTerm(''); // Also clear the search term input
    setShowAllVariants(false); // Reset variants display
    setSuggestions([]);
    setShowSuggestions(false);
    setShowDropdown(false);
    clearAddedProducts(); // Clear animation state too
    if (onFiltersReset) {
      onFiltersReset();
    }
  };

  // Function to clear added products (optional - can be called from outside if needed)
  const clearAddedProducts = () => {
    setAddedProducts(new Set());
    try {
      localStorage.removeItem('addedProducts');
    } catch (error) {
      console.warn('Failed to clear added products from localStorage:', error);
    }
  };

  // Handle keyboard navigation for suggestions
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showSuggestions || suggestions.length === 0) {
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedSuggestionIndex(prev =>
        prev < suggestions.length - 1 ? prev + 1 : 0
      );
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedSuggestionIndex(prev =>
        prev > 0 ? prev - 1 : suggestions.length - 1
      );
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (selectedSuggestionIndex >= 0) {
        const suggestion = suggestions[selectedSuggestionIndex];
        setSearchTerm(suggestion);
        updateFilter('search', suggestion);
        setCurrentFilters(prev => ({
          ...prev,
          search: suggestion
        }));
        setShowSuggestions(false);
        setSelectedSuggestionIndex(-1);
      }
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
      setSelectedSuggestionIndex(-1);
    }
  };

  // Handle search input change - immediate reactive filtering
  const handleSearchChange = useCallback((value: string) => {
    console.log('🔍 ExcelStylePriceList search changed:', value);

    // Update search term state immediately
    setSearchTerm(value);

    // Update filter state for consistency
    updateFilter('search', value);

    // Reset showAllVariants when search changes
    setShowAllVariants(false);

    // Handle suggestions
    if (value.length === 0) {
      console.log('🔄 Search cleared');
      setSuggestions([]);
      setShowSuggestions(false);
      setShowDropdown(false);
    } else if (value.length >= 2) {
      // Generate suggestions after 2 characters
      debouncedGetSuggestions(value);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  }, [updateFilter, debouncedGetSuggestions]);

  // Auto-clear invalid filter selections when search results change
  useEffect(() => {
    if (hasActiveSearch) {
      const currentCapacityValid = currentFilters.capacity.every(cap => validCapacities.includes(cap));
      const currentColorsValid = currentFilters.colors.every(color => validColors.includes(color));
      const currentRegionsValid = currentFilters.regions.every(region => validRegions.includes(region));
      const currentCategoriesValid = currentFilters.categories.every(cat => validCategories.includes(cat));

      if (!currentCapacityValid || !currentColorsValid || !currentRegionsValid || !currentCategoriesValid) {
        console.log('🧹 Auto-clearing invalid filter selections after search change');

        setCurrentFilters(prev => ({
          ...prev,
          capacity: prev.capacity.filter(cap => validCapacities.includes(cap)),
          colors: prev.colors.filter(color => validColors.includes(color)),
          regions: prev.regions.filter(region => validRegions.includes(region)),
          categories: prev.categories.filter(cat => validCategories.includes(cat))
        }));
      }
    }
  }, [hasActiveSearch, validCapacities, validColors, validRegions, validCategories, currentFilters.capacity, currentFilters.colors, currentFilters.regions, currentFilters.categories]);

  // Apply additional filters and sorting to search-filtered products
  const filteredProducts = useMemo(() => {
    console.log('🔍 Filtering products:', {
      searchFilteredProductsCount: searchFilteredProducts.length,
      currentSearch: currentFilters.search,
      searchTerm,
      searchFilter
    });

    if (!searchFilteredProducts) return [];

    let filtered = searchFilteredProducts.filter(product => {
      // Filtro de categoria
      if (currentFilters.categories.length > 0 && !currentFilters.categories.includes(product.category || '')) {
        return false;
      }

      // Filtro de capacidade
      if (currentFilters.capacity.length > 0 && !currentFilters.capacity.includes(product.capacity || '')) {
        return false;
      }

      // Filtro de região
      if (currentFilters.regions.length > 0 && !currentFilters.regions.includes(product.region || '')) {
        return false;
      }

      // Filtro de cor
      if (currentFilters.colors.length > 0 && !currentFilters.colors.includes(product.color || '')) {
        return false;
      }

      // Filtro de fornecedor
      if (currentFilters.supplierIds.length > 0) {
        const productSupplierName = (product.supplierName ||
          (typeof product.supplier === 'string' ? product.supplier : product.supplier?.name) || '').trim();

        // Check if product supplier matches any selected supplier
        const isSupplierSelected = currentFilters.supplierIds.some(selectedSupplierId => {
          const selectedSupplier = suppliers.find(s => s.id.toString() === selectedSupplierId);
          return selectedSupplier && selectedSupplier.name.trim() === productSupplierName;
        });

        if (!isSupplierSelected) {
          return false;
        }
      }

      return true;
    });

    // Log filtering results without price-per-color filtering
    const activeSearchTerm = searchTerm || currentFilters.search || searchFilter || '';
    console.log('🔍 Exibindo todos os produtos filtrados:', {
      activeSearchTerm,
      totalProducts: filtered.length
    });

    // Aplicar ordenação se especificada
    if (sortField && sortDirection) {
      filtered.sort((a: Product, b: Product) => {
        let aValue: any;
        let bValue: any;

        switch (sortField) {
          case 'price':
            aValue = parseFloat(a.price?.toString().replace(/[^\d,.-]/g, '').replace(',', '.') || '0');
            bValue = parseFloat(b.price?.toString().replace(/[^\d,.-]/g, '').replace(',', '.') || '0');
            break;
          case 'model':
            aValue = a.model || '';
            bValue = b.model || '';
            break;
          case 'supplier':
            aValue = a.supplierName || (typeof a.supplier === 'string' ? a.supplier : a.supplier?.name) || '';
            bValue = b.supplierName || (typeof b.supplier === 'string' ? b.supplier : b.supplier?.name) || '';
            break;
          case 'color':
            aValue = a.color || '';
            bValue = b.color || '';
            break;
          case 'storage':
            aValue = a.storage || '';
            bValue = b.storage || '';
            break;
          case 'category':
            aValue = a.category || '';
            bValue = b.category || '';
            break;
          case 'capacity':
            aValue = a.capacity || '';
            bValue = b.capacity || '';
            break;
          case 'region':
            aValue = a.region || '';
            bValue = b.region || '';
            break;
          default:
            aValue = '';
            bValue = '';
        }

        if (typeof aValue === 'string' && typeof bValue === 'string') {
          return sortDirection === 'asc' ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue);
        }

        if (sortDirection === 'asc') {
          return aValue - bValue;
        } else {
          return bValue - aValue;
        }
      });
    }

    const filteredWithLowestPrices = calculateLowestPricesInProducts(filtered);
    const lowestCount = filteredWithLowestPrices.filter(p => (p as any).isLowestPrice).length;

    if (lowestCount > 0) {
      console.log('🏷️ [ExcelStylePriceList] Produtos com menor preço após filtragem:', lowestCount);
    }

    return filteredWithLowestPrices;
  }, [searchFilteredProducts, currentFilters, suppliers, sortField, sortDirection, searchTerm, searchFilter]);

  const safeProducts = useMemo(() => {
    if (!filteredProducts || !Array.isArray(filteredProducts)) {
      return [];
    }

    const filtered = filteredProducts.filter(product =>
      product &&
      typeof product === 'object' &&
      (product.id !== undefined || product.model !== undefined)
    );

    console.log('🔍 SafeProducts filtering:', {
      originalCount: filteredProducts.length,
      safeCount: filtered.length,
      sampleProduct: filtered[0],
      hasModel: filtered[0]?.model,
      hasPrice: filtered[0]?.price,
      hasSupplier: filtered[0]?.supplier || filtered[0]?.supplierName
    });

    return filtered;
  }, [filteredProducts]);

  const paginatedProducts = useMemo(() => {
    const paginated = safeProducts.slice((page - 1) * itemsPerPage, page * itemsPerPage);

    console.log('📄 Pagination debug:', {
      page,
      itemsPerPage,
      safeProductsCount: safeProducts.length,
      paginatedCount: paginated.length,
      startIndex: (page - 1) * itemsPerPage,
      endIndex: page * itemsPerPage
    });

    return paginated;
  }, [safeProducts, page, itemsPerPage]);

  // Early return if no user - AFTER all hooks are initialized
  if (!user) {
    return <div className="text-center py-8 text-muted-foreground">Usuário não autenticado</div>;
  }

  // Toggle dropdown with filtered products (respects category filter)
  const handleDropdownToggle = () => {
    if (showDropdown) {
      setShowDropdown(false);
    } else {
      // Close suggestions first
      setShowSuggestions(false);

      // Generate unique models from FILTERED products (respects category selection)
      const uniqueModels: string[] = [];
      const seenModels = new Set<string>();

      // Use helper function to get correctly filtered products
      const sourceProducts = getSourceProducts();

      sourceProducts.forEach((p: Product) => {
        if (p.model && typeof p.model === 'string' && !seenModels.has(p.model)) {
          seenModels.add(p.model);
          uniqueModels.push(p.model);
        }
      });

      setSuggestions(uniqueModels.slice(0, 100));
      setShowDropdown(true);
    }
  };

  // Handle add to interest list button click
  const handleAddToInterestList = (product: Product) => {
    addToList(product);
  };


  // Handle sorting
  const handleSort = (field: string) => {
    if (sortField === field) {
      // Toggle direction if same field
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // New field, start with ascending
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Sortable header component
  const SortableHeader = ({
    field,
    children,
    align = "left"
  }: {
    field: string;
    children: React.ReactNode;
    align?: "left" | "center" | "right"
  }) => (
    <TableHead className={`cursor-pointer select-none hover:bg-muted/50 transition-colors ${
        align === "center" ? "text-center" : align === "right" ? "text-right" : "text-left"
      } ${sortField === field ? "bg-accent" : ""}`}>
      <div
        className={`flex items-center gap-2 ${
          align === "center" ? "justify-center" : align === "right" ? "justify-end" : "justify-start"
        }`}
        onClick={() => handleSort(field)}
      >
        <span className="font-bold text-foreground">{children}</span>
        {sortField === field ? (
          sortDirection === 'asc' ? (
            <ArrowUp className="h-4 w-4 text-primary" />
          ) : (
            <ArrowDown className="h-4 w-4 text-primary" />
          )
        ) : (
          <ArrowUpDown className="h-4 w-4 opacity-50 group-hover:opacity-100" />
        )}
      </div>
    </TableHead>
  );

  console.log('🎯 ExcelStylePriceList render:', {
    isLoading: productsLoading,
    error: !!error,
    productsCount: products.length,
    filteredCount: filteredProducts.length,
    searchFilter,
    dateFilter,
    filtersDate: currentFilters.date,
    rawDataExists: !!data,
    dataType: typeof data,
    dataKeys: data ? Object.keys(data) : [],
    hasNestedData: data?.data ? true : false,
    hasDirectProducts: data?.products ? true : false,
    actualDate: data?.data?.actualDate || data?.actualDate,
    requestedDate: data?.data?.requestedDate,
    // DEBUG INFO
    userPlan,
    isAdmin,
    role,
    userProfileDebug: userProfile,
    // Real-time Debug
    isRealtimeConnected,
    connectionState,
    lastUpdateTime,
    updateCount,
    // Unified WS Debug
    isUnifiedWSConnected,
    finalWebSocketStatus
  });

  // Show loading state only for initial load when we actually have no data
  if (productsLoading && !data && products.length === 0) {
    return (
      <Card className="shadow-lg">
        <CardContent className="p-8">
          <div className="text-center space-y-6">
            {/* Logo/Icon Section */}
            <div className="flex justify-center">
              <div className="relative">
                <div className="w-16 h-16 bg-gradient-to-br from-primary/20 to-primary/10 rounded-2xl flex items-center justify-center">
                  <div className="w-8 h-8 bg-primary/20 rounded-lg animate-pulse"></div>
                </div>
                <div className="absolute -top-1 -right-1 w-6 h-6 bg-primary rounded-full animate-bounce flex items-center justify-center">
                  <div className="w-2 h-2 bg-white rounded-full"></div>
                </div>
              </div>
            </div>

            {/* Title and Description */}
            <div className="space-y-3">
              <h3 className="text-xl font-bold text-foreground">
                Carregando Catálogo de Produtos
              </h3>
              <p className="text-sm text-muted-foreground max-w-md mx-auto">
                Sincronizando dados em tempo real para oferecer os preços mais atualizados do mercado
              </p>
            </div>

            {/* Progress Bar */}
            <div className="max-w-sm mx-auto space-y-3">
              <div className="w-full bg-muted/30 rounded-full h-2.5 overflow-hidden">
                <div className="h-full bg-gradient-to-r from-primary to-primary/80 rounded-full animate-pulse relative">
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-pulse"></div>
                </div>
              </div>
              <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
                <div className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" style={{animationDelay: '0ms'}}></div>
                <div className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" style={{animationDelay: '150ms'}}></div>
                <div className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" style={{animationDelay: '300ms'}}></div>
                <span className="ml-2">Sincronizando...</span>
              </div>
            </div>

            {/* Filter Status */}
            {(searchFilter || dateFilter) && (
              <div className="pt-4 border-t border-border/20">
                <div className="text-sm text-muted-foreground space-y-1">
                  <div className="font-medium">Filtros Aplicados:</div>
                  <div className="flex flex-wrap gap-2 justify-center">
                    {searchFilter && (
                      <div className="px-3 py-1 bg-primary/10 text-primary rounded-full text-xs font-medium">
                        🔍 {searchFilter}
                      </div>
                    )}
                    {dateFilter && dateFilter !== 'all' && (
                      <div className="px-3 py-1 bg-accent/50 text-accent-foreground rounded-full text-xs font-medium">
                        📅 {dateFilter}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* CSS Animation */}
          <style>{`
            @keyframes loading-progress {
              0% { transform: translateX(-100%); }
              50% { transform: translateX(0%); }
              100% { transform: translateX(100%); }
            }
          `}</style>
        </CardContent>
      </Card>
    );
  }

  // Show error state with retry option only if we don't have cached data or products
  if (error && !data && products.length === 0) {
    console.error('❌ ExcelStylePriceList error:', error);
    return (
      <Card className="shadow-lg">
        <CardContent className="p-6">
          <div className="text-center py-8">
            <h3 className="text-lg font-semibold text-red-600 mb-2">
              Erro ao carregar produtos
            </h3>
            <p className="text-muted-foreground mb-4">
              {error.message || 'Erro desconhecido'}
            </p>
            <div className="flex gap-2 justify-center">
              <Button
                onClick={() => refetchProducts()}
                variant="outline"
                size="sm"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Tentar novamente
              </Button>
              <Button
                onClick={() => queryClient.invalidateQueries({ queryKey: ['/api/products'] })}
                variant="outline"
                size="sm"
              >
                Limpar cache
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }



  // Debug the data before processing
  console.log('🎯 ExcelStylePriceList: Component render state:', {
    hasData: !!data,
    dataStructure: data ? Object.keys(data) : 'no data',
    products: data?.products,
    productsLength: data?.products?.length || 0,
    productsArray: products,
    productsArrayLength: products?.length || 0,
    isLoading: productsLoading,
    hasError: !!error,
    errorMessage: error?.message,
    searchFilter,
    dateFilter
  });

  const totalPages = Math.ceil(safeProducts.length / itemsPerPage);

  // Handle closing the rating modal
  const handleCloseRatingModal = () => {
    setIsRatingModalOpen(false);
    setSelectedSupplierForRating(null);
  };

  return (
    <ErrorBoundary>
      <Card className="shadow-lg relative overflow-hidden">
        <Watermark />

        {/* Header with Time Information */}
        <div className="flex justify-between items-center p-4 bg-gradient-to-r from-background/95 to-muted/10 border-b border-border/20">
          {/* Last Sync Time */}
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Clock className="h-3 w-3 text-orange-500" />
            <span className="text-xs">
              <span className="text-muted-foreground mr-1">Última atualização:</span>
              {monitoringData?.status?.lastUpdate ? (
                <>
                  <span className="text-foreground font-medium">
                    {formatLastSync(monitoringData.status.lastUpdate)}
                  </span>
                  {monitoringData.status.lastUpdate && (() => {
                    const lastSyncTime = monitoringData.status.lastUpdate.includes(':') && !monitoringData.status.lastUpdate.includes('-') && !monitoringData.status.lastUpdate.includes('T')
                      ? (() => {
                          const [hours, minutes, seconds] = monitoringData.status.lastUpdate.split(':').map(Number);
                          const now = new Date();
                          const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                          const sheetTime = new Date(today.getTime() + (hours * 60 + minutes) * 60 * 1000 + (seconds || 0) * 1000);
                          if (sheetTime > now) sheetTime.setDate(sheetTime.getDate() - 1);
                          return sheetTime;
                        })()
                      : new Date(monitoringData.status.lastUpdate);

                    return new Date().getTime() - lastSyncTime.getTime() < 30 * 60 * 1000;
                  })() && (
                    <Badge variant="outline" className="ml-1 text-xs px-1 py-0 h-4 text-green-600 border-green-200">
                      Online
                    </Badge>
                  )}
                </>
              ) : (
                <span className="text-muted-foreground">11:42:51</span>
              )}
            </span>
          </div>

          {/* Refresh Controls */}
          <div className="flex items-center gap-2">
            {/* WebSocket Status */}
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1">
                <div className={cn(
                  "w-2 h-2 rounded-full",
                  finalWebSocketStatus ? "bg-green-500 animate-pulse" : "bg-red-500"
                )} />
                <span className="text-xs text-muted-foreground">
                  {finalWebSocketStatus ? "Online" : "Offline"}
                </span>
              </div>

              {/* Update Count Indicator */}
              {stats?.updateCount > 0 && (
                <Badge variant="outline" className="text-xs px-1 py-0 h-4 bg-blue-50 text-blue-600 border-blue-200">
                  {stats.updateCount} updates
                </Badge>
              )}

              {/* Last Update Time */}
              {lastUpdateTime && (
                <span className="text-xs text-muted-foreground">
                  {(() => {
                    const updateTime = new Date(lastUpdateTime);
                    const now = new Date();
                    const diffMs = now.getTime() - updateTime.getTime();
                    const diffSecs = Math.floor(diffMs / 1000);

                    if (diffSecs < 10) return 'agora';
                    if (diffSecs < 60) return `${diffSecs}s atrás`;
                    const diffMins = Math.floor(diffSecs / 60);
                    if (diffMins < 60) return `${diffMins}min atrás`;
                    return updateTime.toLocaleTimeString();
                  })()}
                </span>
              )}
            </div>

            {/* Manual Refresh Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                console.log('🔄 Manual refresh triggered');
                queryClient.invalidateQueries({ queryKey: ['/api/products'] });
                refetchProducts();
                toast({
                  title: "Atualizando dados...",
                  description: "Buscando as informações mais recentes do servidor",
                  duration: 2000,
                });
              }}
              disabled={productsLoading}
              className="h-7 px-2 text-xs"
            >
              <RefreshCw className={cn("h-3 w-3 mr-1", productsLoading && "animate-spin")} />
              Atualizar
            </Button>
          </div>
        </div>

        <CardContent className="p-0">


          {/* Advanced Filters Panel - Collapsible */}
          <div className={cn(
            "transition-all duration-300 ease-in-out overflow-hidden",
            showFilters
              ? "block max-h-[2000px] opacity-100"
              : "hidden max-h-0 opacity-0"
          )}>
            <div className={cn(
              "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 p-4 bg-gradient-to-br from-gray-50 to-white dark:from-gray-800 dark:to-gray-700 transition-all duration-300 border-b border-border/20",
              showFilters ? "transform translate-y-0" : "transform -translate-y-2"
            )}>
              {/* Main Filters Grid */}

              {/* Date Filter */}
              <div className="min-w-0">
                <ElegantDateSelector
                  selectedDate={currentFilters.date}
                  availableDates={availableDates || []}
                  onDateChange={(newDate) => {
                    console.log('ExcelStylePriceList: Date changed from ' + currentFilters.date + ' to: ' + newDate);

                    // Update internal state
                    updateFilter('date', newDate);

                    // Force refetch products with new date
                    queryClient.invalidateQueries({
                      queryKey: ['/api/products']
                    });

                    // Also refetch immediately
                    refetchProducts();

                    // Call parent callback
                    onDateFilterChange?.(newDate);
                  }}
                  disabled={datesLoading}
                  placeholder={datesLoading ? "Carregando datas..." : "Selecione uma data"}
                />
              </div>

              {/* Categories */}
              <div className="min-w-0">
                <label className="block text-xs font-medium text-foreground mb-1.5">
                  🏷️ Categoria
                </label>
                <ExcelFilterDropdown
                  title="Categoria"
                  options={validCategories.map(cat => {
                    const count = filterOptions.categories.find(opt => opt.value === cat)?.count || 0;
                    return { value: cat, label: cat, count };
                  })}
                  selectedValues={currentFilters.categories}
                  onSelectionChange={(values) => updateFilter('categories', values)}
                  onApply={(values) => updateFilter('categories', values)}
                  placeholder={hasActiveSearch && validCategories.length === 0 ? "Nenhuma categoria encontrada" : "Todas as Categorias"}
                  disabled={hasActiveSearch && validCategories.length === 0}
                />
              </div>

              {/* Capacities */}
              <div className="min-w-0">
                <label className="block text-xs font-medium text-foreground mb-1.5">
                  💾 Capacidade / MM
                </label>
                <ExcelFilterDropdown
                  title="Capacidade"
                  options={validCapacities.map(cap => {
                    // Use multiple sources to calculate count more accurately
                    const searchFilteredCount = hasActiveSearch ?
                      searchFilteredProducts.filter(p => (p.capacity === cap || p.storage === cap)).length : 0;
                    const filterOptionsCount = filterOptions.capacities.find(opt => opt.value === cap)?.count || 0;
                    const finalCount = Math.max(searchFilteredCount, filterOptionsCount);

                    return { value: cap, label: cap, count: finalCount };
                  })}
                  selectedValues={currentFilters.capacity}
                  onSelectionChange={(values) => updateFilter('capacity', values)}
                  onApply={(values) => updateFilter('capacity', values)}
                  placeholder={validCapacities.length === 0 ? "Nenhuma capacidade encontrada" : "Todas as Capacidades"}
                  disabled={validCapacities.length === 0}
                />
              </div>

              {/* Regions */}
              <div className="min-w-0">
                <label className="block text-xs font-medium text-foreground mb-1.5">
                  🌍 Região / GB-RAM
                </label>
                <ExcelFilterDropdown
                  title="Região"
                  options={validRegions.map(reg => {
                    const count = filterOptions.regions.find(opt => opt.value === reg)?.count || 0;
                    return { value: reg, label: reg, count };
                  })}
                  selectedValues={currentFilters.regions}
                  onSelectionChange={(values) => updateFilter('regions', values)}
                  onApply={(values) => updateFilter('regions', values)}
                  placeholder={hasActiveSearch && validRegions.length === 0 ? "Nenhuma região encontrada" : "Todas as Regiões"}
                  disabled={hasActiveSearch && validRegions.length === 0}
                />
              </div>

              {/* Colors */}
              <div className="min-w-0">
                <label className="block text-xs font-medium text-foreground mb-1.5">
                  🎨 Cor
                </label>
                <ExcelFilterDropdown
                  title="Cor"
                  options={validColors.map(color => {
                    const count = filterOptions.colors.find(opt => opt.value === color)?.count || 0;
                    return { value: color, label: color, count };
                  })}
                  selectedValues={currentFilters.colors}
                  onSelectionChange={(values) => updateFilter('colors', values)}
                  onApply={(values) => updateFilter('colors', values)}
                  placeholder={hasActiveSearch && validColors.length === 0 ? "Nenhuma cor encontrada" : "Todas as Cores"}
                  disabled={hasActiveSearch && validColors.length === 0}
                />
              </div>

              {/* Suppliers */}
              <div className="min-w-0">
                <label className="block text-xs font-medium text-foreground mb-1.5">
                  🏪 Fornecedor
                </label>
                <ExcelFilterDropdown
                  title="Fornecedor"
                  options={filterOptions.suppliers.map(supplierOption => ({
                    value: supplierOption.value,
                    label: supplierOption.label,
                    count: supplierOption.count
                  }))}
                  selectedValues={currentFilters.supplierIds.map(id => {
                    const supplier = suppliers.find(s => s.id.toString() === id);
                    return supplier ? supplier.name : '';
                  }).filter(Boolean)}
                  onSelectionChange={(values) => {
                    console.log('🏪 Supplier filter changed:', values);
                    const supplierIds = values.map(name => {
                      const supplier = suppliers.find(s => s.name.trim() === name.trim());
                      return supplier ? supplier.id.toString() : '';
                    }).filter(Boolean);
                    console.log('🏪 Mapped supplier IDs:', supplierIds);
                    updateFilter('supplierIds', supplierIds);
                  }}
                  onApply={(values) => {
                    console.log('🏪 Supplier filter applied:', values);
                    const supplierIds =values.map(name => {
                      const supplier = suppliers.find(s => s.name.trim() === name.trim());
                      return supplier ? supplier.id.toString() : '';
                    }).filter(Boolean);
                    console.log(' Apply supplier IDs:', supplierIds);
                    updateFilter('supplierIds', supplierIds);
                  }}
                  placeholder="Todos os Fornecedores"
                />
              </div>
            </div>

            {/* Clear Filters Button - Only show when filters are active */}
            {(currentFilters.search ||
              currentFilters.categories.length > 0 ||
              currentFilters.capacity.length > 0 ||
              currentFilters.regions.length > 0 ||
              currentFilters.colors.length > 0 ||
              currentFilters.supplierIds.length > 0) && (
              <div className="flex items-center justify-between pt-4 border-t border-border/20 md:col-span-full">
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <Filter className="w-4 h-4" />
                    <span>Filtros ativos:</span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {currentFilters.search && (
                      <Badge variant="secondary" className="text-xs">
                        Busca: "{currentFilters.search}"
                      </Badge>
                    )}
                    {currentFilters.categories.length > 0 && (
                      <Badge variant="secondary" className="text-xs">
                        {currentFilters.categories.length} categoria{currentFilters.categories.length > 1 ? 's' : ''}
                      </Badge>
                    )}
                    {currentFilters.capacity.length > 0 && (
                      <Badge variant="secondary" className="text-xs">
                        {currentFilters.capacity.length} capacidade{currentFilters.capacity.length > 1 ? 's' : ''}
                      </Badge>
                    )}
                    {currentFilters.regions.length > 0 && (
                      <Badge variant="secondary" className="text-xs">
                        {currentFilters.regions.length} regiõe{currentFilters.regions.length > 1 ? 's' : ''}
                      </Badge>
                    )}
                    {currentFilters.colors.length > 0 && (
                      <Badge variant="secondary" className="text-xs">
                        {currentFilters.colors.length} cor{currentFilters.colors.length > 1 ? 'es' : ''}
                      </Badge>
                    )}
                    {currentFilters.supplierIds.length > 0 && (
                      <Badge variant="secondary" className="text-xs">
                        {currentFilters.supplierIds.length} fornecedor{currentFilters.supplierIds.length > 1 ? 'es' : ''}
                      </Badge>
                    )}
                  </div>
                </div>
                <Button
                  variant="outline"
                  onClick={clearFilters}
                  className="border-destructive/30 text-destructive hover:bg-destructive/5 hover:text-destructive hover:border-destructive/50 transition-all duration-200 rounded-lg"
                >
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Limpar Filtros
                </Button>
              </div>
            )}
          </div>

          {/* Mobile Filter Toggle - Only visible on mobile */}
          <div className="block md:hidden p-4 border-b border-border/20 bg-gradient-to-r from-muted/30 to-muted/10">
            <div className="relative group">
              <div className="absolute inset-0 bg-gradient-to-r from-primary/10 to-primary/5 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 -z-10"></div>
              <Button
                variant="outline"
                size="lg"
                className={cn(
                  "w-full h-14 border-border/60 hover:border-primary/50 shadow-lg hover:shadow-xl transition-all duration-200 rounded-xl backdrop-blur-sm font-medium",
                  showFilters
                    ? "bg-gradient-to-r from-primary/5 to-primary/10 border-primary/30"
                    : "bg-gradient-to-r from-background/95 to-background/80"
                )}
                onClick={() => {
                  console.log('📱 Mobile filter toggle clicked:', !showFilters);
                  setShowFilters(!showFilters);
                }}
              >
                <div className="flex items-center justify-center gap-3">
                  <div className={
                    showFilters
                      ? "p-1.5 rounded-lg transition-colors duration-200 bg-primary/20 text-primary"
                      : "p-1.5 rounded-lg transition-colors duration-200 bg-muted/50 text-muted-foreground"
                  }>
                    <Filter className="h-4 w-4" />
                  </div>
                  <span className="text-base font-medium">
                    {showFilters ? 'Ocultar Filtros Avançados' : 'Mostrar Filtros Avançados'}
                  </span>
                  <div className={cn(
                    "p-1 rounded-lg transition-all duration-200",
                    showFilters
                      ? "bg-primary/20 text-primary rotate-180"
                      : "bg-muted/50 text-muted-foreground"
                  )}>
                    <ChevronDown className="h-4 w-4" />
                  </div>
                </div>
              </Button>
            </div>
          </div>
        </CardContent>

        {/* Product Views Container */}
        <div>
          {/* Desktop Table View - Hidden on mobile */}
          <div className="hidden md:block overflow-x-auto">
            {productsLoading ? (
              <div className="p-8 text-center">
                <div className="text-lg font-medium">Carregando produtos...</div>
                <div className="text-sm text-muted-foreground mt-2">
                  Status: {productsLoading ? 'Carregando' : 'Concluído'}
                </div>
              </div>
            ) : products.length === 0 ? (
              <div className="p-8 text-center">
                <div className="space-y-4">
                  <div className="text-xl font-semibold text-foreground">Nenhum resultado encontrado.</div>
                  <div className="text-sm text-muted-foreground max-w-md mx-auto space-y-2">
                    <p>No momento, nenhum fornecedor possui este produto cadastrado.</p>
                    {searchFilter && (
                      <p className="text-foreground font-medium">
                        Sua busca: <span className="italic font-semibold">"{searchFilter}"</span>
                      </p>
                    )}
                    {searchFilter && (
                      <p className="text-muted-foreground">
                        Tente variar os termos ou remover especificações como cor, capacidade ou versão.
                      </p>
                    )}
                    <p className="flex items-center justify-center gap-1 pt-2">
                      <span>O sistema está funcionando normalmente</span>
                      <span>👍</span>
                    </p>
                  </div>
                  {error && (
                    <div className="flex gap-2 justify-center">
                      <Button
                        onClick={() => {
                          console.log('🔄 Debug: Forcing page reset');
                          refetchProducts();
                        }}
                        variant="outline"
                        size="sm"
                        disabled={productsLoading}
                      >
                        <RefreshCw className={`w-4 h-4 mr-2 ${productsLoading ? 'animate-spin' : ''}`} />
                        Tentar novamente
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <SortableHeader field="model">Produto</SortableHeader>
                    <SortableHeader field="supplier" align="center">Fornecedor</SortableHeader>
                    <SortableHeader field="storage" align="center">Storage</SortableHeader>
                    <SortableHeader field="color" align="center">Cor</SortableHeader>
                    <SortableHeader field="category" align="center">Categoria</SortableHeader>
                    <SortableHeader field="region" align="center">Região</SortableHeader>
                    <SortableHeader field="price" align="right">Preço</SortableHeader>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedProducts.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-12">
                        <div className="space-y-4">
                          <div className="text-xl font-semibold text-foreground">Nenhum resultado encontrado.</div>
                          <div className="text-sm text-muted-foreground max-w-md mx-auto space-y-2">
                            <p>No momento, nenhum fornecedor possui este produto cadastrado.</p>
                            {searchFilter && (
                              <p className="text-foreground font-medium">
                                Sua busca: <span className="italic font-semibold">"{searchFilter}"</span>
                              </p>
                            )}
                            {searchFilter && (
                              <p className="text-muted-foreground">
                                Tente variar os termos ou remover especificações como cor, capacidade ou versão.
                              </p>
                            )}
                            <p className="flex items-center justify-center gap-1 pt-2">
                              <span>O sistema está funcionando normalmente</span>
                              <span>👍</span>
                            </p>
                          </div>
                          {hasActiveFilters && (
                            <div className="pt-4">
                              <button
                                onClick={clearFilters}
                                className="px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90 transition-colors"
                              >
                                Limpar Filtros
                              </button>
                            </div>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                  paginatedProducts.map((product, index) => {
                    const colorInfo = getColorInfo(product.color);

                    // Debug log for first few products
                    if (index < 3) {
                      console.log(`🎯 Rendering product ${index}:`, {
                        id: product.id,
                        model: product.model,
                        price: product.price,
                        supplier: product.supplier || product.supplierName,
                        hasAllFields: !!(product.model && product.price && (product.supplier || product.supplierName))
                      });
                    }

                    return (
                      <TableRow
                        key={product.id || "product-" + index}
                        className="hover:bg-muted/50 transition-colors"
                      >
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-3">
                            <CategoryIcon category={product.category} />
                            <div>
                              <div className="font-semibold text-sm">
                                {product.model}
                              </div>
                            </div>
                          </div>
                        </TableCell>

                        <TableCell className="text-center">
                          <TooltipProvider>
                            <div className="flex flex-col items-center gap-2">
                              {(() => {
                                // Get supplier name from multiple possible sources with better fallback
                                let supplierName = '';
                                if (product.supplierName && product.supplierName.trim()) {
                                  supplierName = product.supplierName;
                                } else if (typeof product.supplier === 'string') {
                                  supplierName = product.supplier;
                                } else if (product.supplier && typeof product.supplier === 'object') {
                                  if (product.supplier.name && product.supplier.name.trim()) {
                                    supplierName = product.supplier.name;
                                  } else if (product.supplier.id) {
                                    supplierName = "Supplier " + product.supplier.id;
                                  }
                                } else if (product.brand) {
                                  supplierName = product.brand;
                                } else {
                                  supplierName = 'Fornecedor N/A';
                                }

                                // Clean supplier name and look for WhatsApp
                                const cleanSupplierName = supplierName.toString().trim();

                                // Try exact match first, then partial match
                                let supplierContact = supplierContacts[cleanSupplierName];
                                let whatsappNumber = supplierContact?.telefone;
                                let supplierAddress = supplierContact?.endereco;

                                // If no exact match, try to find by partial match (case insensitive)
                                if (!whatsappNumber) {
                                  const contactKeys = Object.keys(supplierContacts);
                                  const matchedKey = contactKeys.find(key =>
                                    key.toLowerCase().trim() === cleanSupplierName.toLowerCase().trim()
                                  );
                                  if (matchedKey) {
                                    supplierContact = supplierContacts[matchedKey];
                                    whatsappNumber = supplierContact?.telefone;
                                    supplierAddress = supplierContact?.endereco;
                                  }
                                }

                                console.log('🏪 Desktop table - Supplier check:', {
                                  productId: product.id,
                                  originalSupplier: product.supplier,
                                  supplierName: cleanSupplierName,
                                  hasWhatsapp: !!whatsappNumber,
                                  whatsappNumber: whatsappNumber,
                                  totalContacts: Object.keys(supplierContacts).length,
                                  availableSuppliers: Object.keys(supplierContacts).slice(0, 5),
                                  exactMatch: !!supplierContacts[cleanSupplierName]
                                });

                                // 🎯 CORREÇÃO: Verificar se é admin primeiro
                                const isAdmin = user?.isAdmin === true ||
                                              user?.role === 'admin' ||
                                              user?.role === 'superadmin' ||
                                              user?.role === 'super_admin';

                                // Apenas usuários TESTER (que não são admin) são bloqueados
                                const isTesterNotAdmin = (user?.role === 'tester' || user?.subscriptionPlan === 'tester') && !isAdmin;

                                // 🔒 Verificar se o produto é da data mais recente (para WhatsApp)
                                const productDate = product.date || product.data;
                                const isCurrentDate = !mostRecentDate || productDate === mostRecentDate;
                                const canShowWhatsApp = isCurrentDate && !isTesterNotAdmin;

                                // Show supplier name with address below
                                if (isTesterNotAdmin) {
                                    return (
                                        <div className="flex flex-col items-center text-center">
                                          <div className="flex items-center gap-1">
                                            <span className="text-sm font-medium text-foreground">
                                                {cleanSupplierName}
                                            </span>
                                            🔒
                                          </div>
                                          {supplierAddress && (
                                            <span className="text-xs text-muted-foreground mt-1">
                                              {supplierAddress}
                                            </span>
                                          )}
                                        </div>
                                    );
                                } else if (!isCurrentDate && whatsappNumber) {
                                    return (
                                        <div className="flex flex-col items-center text-center">
                                          <div className="flex items-center gap-1">
                                            <span className="text-sm font-medium text-muted-foreground">
                                                {cleanSupplierName}
                                            </span>
                                            <span className="text-xs text-muted-foreground" title="WhatsApp disponível apenas na data atual">🔒</span>
                                          </div>
                                          {supplierAddress && (
                                            <span className="text-xs text-muted-foreground mt-1">
                                              {supplierAddress}
                                            </span>
                                          )}
                                        </div>
                                    );
                                } else if (whatsappNumber && whatsappNumber.trim() && whatsappNumber !== 'undefined' && whatsappNumber !== 'null' && canShowWhatsApp) {
                                  return (
                                    <div className="flex flex-col items-center text-center">
                                      <div className="flex items-center gap-1">
                                        <WhatsAppButton
                                          whatsappNumber={whatsappNumber}
                                          supplierName={cleanSupplierName}
                                          variant="link"
                                          size="sm"
                                          productModel={product.model}
                                          productBrand={product.brand}
                                          productColor={product.color}
                                          productStorage={product.storage}
                                          productCategory={product.category}
                                          productPrice={product.price}
                                          productRegion={product.region}
                                        />
                                        <svg
                                          width="16"
                                          height="16"
                                          viewBox="0 0 24 24"
                                          fill="none"
                                          className="text-green-600"
                                          xmlns="http://www.w3.org/2000/svg"
                                        >
                                          <path
                                            d="M17.472 14.382C17.233 14.262 15.963 13.635 15.754 13.545C15.545 13.456 15.395 13.411 15.244 13.65C15.094 13.889 14.616 14.485 14.495 14.635C14.375 14.785 14.254 14.802 14.015 14.682C13.776 14.562 12.985 14.308 12.042 13.465C11.313 12.808 10.829 12.005 10.708 11.766C10.588 11.527 10.695 11.414 10.815 11.295C10.924 11.186 11.054 11.015 11.174 10.895C11.294 10.775 11.339 10.685 11.429 10.535C11.518 10.385 11.474 10.265 11.414 10.145C11.354 10.025 10.874 8.755 10.695 8.275C10.521 7.809 10.342 7.869 10.207 7.862C10.078 7.855 9.928 7.854 9.778 7.854C9.628 7.854 9.389 7.914 9.18 8.154C8.971 8.393 8.314 9.02 8.314 10.29C8.314 11.56 9.21 12.79 9.33 12.94C9.45 13.09 10.869 15.29 13.109 16.43C13.649 16.68 14.069 16.83 14.399 16.94C14.939 17.11 15.429 17.09 15.819 17.03C16.259 16.96 17.289 16.41 17.519 15.8C17.749 15.19 17.749 14.67 17.689 14.57C17.629 14.47 17.479 14.41 17.24 14.29L17.472 14.382Z"
                                              fill="currentColor"
                                            />
                                            <path
                                              fillRule="evenodd"
                                              clipRule="evenodd"
                                              d="M12 2C6.477 2 2 6.477 2 12C2 13.89 2.525 15.66 3.438 17.168L2.546 20.2C2.491 20.365 2.495 20.544 2.557 20.706C2.619 20.868 2.736 21.002 2.888 21.082C3.04 21.162 3.217 21.183 3.383 21.141L6.832 20.562C8.34 21.475 10.11 22 12 22C17.523 22 22 17.523 22 12C22 6.477 17.523 2 12 2ZM12 4C16.411 4 20 7.589 20 12C20 16.411 16.411 20 12 20C10.33 20 8.773 19.516 7.455 18.686L7.257 18.562L4.697 19.062L5.438 17.257L5.314 17.059C4.484 15.741 4 14.184 4 12.514C4 7.589 7.589 4 12 4Z"
                                              fill="currentColor"
                                            />
                                          </svg>
                                        </div>
                                        {supplierAddress && (
                                          <span className="text-xs text-muted-foreground mt-1">
                                            {supplierAddress}
                                          </span>
                                        )}
                                      </div>
                                    );
                                  } else if (isAdmin) {
                                    // 🎯 ADMIN: Sempre mostrar como link mesmo sem WhatsApp
                                    return (
                                      <div className="flex flex-col">
                                        <div className="flex items-center gap-2">
                                          <span className="text-sm font-medium text-green-600 cursor-pointer hover:underline truncate">
                                            {cleanSupplierName}
                                          </span>
                                          ✅
                                        </div>
                                        {supplierAddress && (
                                          <span className="text-xs text-muted-foreground mt-1">
                                            {supplierAddress}
                                          </span>
                                        )}
                                      </div>
                                    );
                                  } else {
                                    return (
                                      <div className="flex flex-col">
                                        <span className="text-sm font-medium text-foreground truncate">
                                          {cleanSupplierName}
                                        </span>
                                        {supplierAddress && (
                                          <span className="text-xs text-muted-foreground mt-1">
                                            {supplierAddress}
                                          </span>
                                        )}
                                      </div>
                                    );
                                  }
                                })()}

                                {/* Comments button for suppliers with ratings */}
                                {product.supplier && typeof product.supplier === 'object' && product.supplier.averageRating && parseFloat(product.supplier.averageRating) > 0 && (
                                  <button
                                    onClick={() => {
                                      setSelectedSupplierForComments({
                                        id: product.supplier.id,
                                        name: product.supplier.name,
                                        averageRating: parseFloat(product.supplier.averageRating),
                                        ratingCount: product.supplier.ratingCount || 0
                                      });
                                      setIsCommentsModalOpen(true);
                                    }}
                                    className="text-xs text-blue-600 hover:text-blue-800 hover:underline"
                                  >
                                    Ver comentários
                                  </button>
                                )}
                              </div>
                            </TooltipProvider>
                          </TableCell>

                          <TableCell className="text-center">
                            <div className="flex flex-col items-center gap-1">
                              <div className="font-semibold text-sm">
                                {product.storage || 'N/A'}
                              </div>
                            </div>
                          </TableCell>

                          <TableCell className="text-center">
                            <div className="flex flex-col items-center gap-1">
                              {product.color && product.color.trim() ? (
                                <div className="flex items-center gap-2">
                                  <div
                                    className="w-4 h-4 rounded-full border border-border shadow-sm"
                                    style={{ backgroundColor: colorInfo.hex }}
                                    title={product.color}
                                  />
                                  <span className="font-semibold text-sm">{product.color}</span>
                                </div>
                              ) : (
                                <span className="font-semibold text-sm text-muted-foreground">N/A</span>
                              )}
                            </div>
                          </TableCell>

                          <TableCell className="text-center">
                            <div className="flex flex-col items-center gap-1">
                              <div className="font-semibold text-sm">
                                {product.category || 'N/A'}
                              </div>
                            </div>
                          </TableCell>

                          <TableCell className="text-center">
                            <div className="flex flex-col items-center gap-1">
                              <div className="font-semibold text-sm">
                                {product.region || 'N/A'}
                              </div>
                            </div>
                          </TableCell>

                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              <InteractivePriceCell
                                product={{
                                  id: product.id ? parseInt(product.id.toString()) : 0,
                                  model: product.model,
                                  brand: product.brand || '',
                                  storage: product.storage || '',
                                  color: product.color || '',
                                  category: product.category || '',
                                  supplier: typeof product.supplier === 'string' ? product.supplier : product.supplier?.name || product.supplierName || '',
                                  price: typeof product.price === 'string' ? parseFloat(product.price) || 0 : product.price || 0,
                                  productTimestamp: product.productTimestamp
                                }}
                                className={cn("font-bold text-lg cursor-pointer hover:bg-primary/5 rounded px-2 py-1 transition-colors",
                                  product.isLowestPrice
                                    ? "text-green-600 dark:text-green-400"
                                    : "text-foreground"
                                )}
                                title={
                                  product.isLowestPrice
                                    ? "Menor preço disponível"
                                    : undefined
                                }
                              />

                            </div>
                          </TableCell>


                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            )}
          </div>

            {/* Mobile Card View - Visible on mobile */}
            <div className="block md:hidden">
              {productsLoading ? (
                <div className="p-8 text-center">
                  <div className="text-lg font-medium">Carregando produtos...</div>
                </div>
              ) : products.length === 0 ? (
                <div className="text-center py-12 px-4">
                  <div className="space-y-4">
                    <div className="text-lg font-semibold text-foreground">Nenhum resultado encontrado.</div>
                    <div className="text-sm text-muted-foreground space-y-2">
                      <p>No momento, nenhum fornecedor possui este produto cadastrado.</p>
                      {searchFilter && (
                        <p className="text-foreground font-medium">
                          Sua busca: <span className="italic font-semibold">"{searchFilter}"</span>
                        </p>
                      )}
                      {searchFilter && (
                        <p className="text-muted-foreground">
                          Tente variar os termos ou remover especificações como cor, capacidade ou versão.
                        </p>
                      )}
                      <p className="flex items-center justify-center gap-1 pt-2">
                        <span>O sistema está funcionando normalmente</span>
                        <span>👍</span>
                      </p>
                    </div>
                    {error && (
                      <Button
                        onClick={() => refetchProducts()}
                        variant="outline"
                        size="sm"
                        disabled={productsLoading}
                      >
                        <RefreshCw className={`w-4 h-4 mr-2 ${productsLoading ? 'animate-spin' : ''}`} />
                        Tentar novamente
                      </Button>
                    )}
                  </div>
                </div>
              ) : paginatedProducts.length === 0 ? (
                <div className="text-center py-12 px-4">
                  <div className="space-y-4">
                    <div className="text-lg font-semibold text-foreground">Nenhum resultado encontrado.</div>
                    <div className="text-sm text-muted-foreground space-y-2">
                      <p>No momento, nenhum fornecedor possui este produto cadastrado.</p>
                      {searchFilter && (
                        <p className="text-foreground font-medium">
                          Sua busca: <span className="italic font-semibold">"{searchFilter}"</span>
                        </p>
                      )}
                      {searchFilter && (
                        <p className="text-muted-foreground">
                          Tente variar os termos ou remover especificações como cor, capacidade ou versão.
                        </p>
                      )}
                      <p className="flex items-center justify-center gap-1 pt-2">
                        <span>O sistema está funcionando normalmente</span>
                        <span>👍</span>
                      </p>
                    </div>
                    {hasActiveFilters && (
                      <button
                        onClick={clearFilters}
                        className="px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90 transition-colors"
                      >
                        Limpar Filtros
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                <div className="space-y-3 p-3">
                  {paginatedProducts.map((product, index) => {
                    const colorInfo = getColorInfo(product.color);

                    return (
                      <Card key={product.id || "mobile-product-" + index} className="overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-200 border border-border/50">
                        <CardContent className="p-0">
                          {/* TOPO: Nome do item + Preço em destaque */}
                          <div className="bg-gradient-to-r from-primary/5 to-primary/10 px-4 py-3 border-b border-border/30">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2 flex-1 min-w-0">
                                <CategoryIcon category={product.category} className="w-5 h-5 text-primary flex-shrink-0" />
                                <h3 className="font-bold text-base text-foreground leading-tight truncate">
                                  {product.model}
                                </h3>
                              </div>
                              <div className="text-right ml-3">
                                <InteractivePriceCell
                                  product={{
                                    id: product.id,
                                    model: product.model,
                                    brand: product.brand || '',
                                    storage: product.storage || '',
                                    color: product.color || '',
                                    category: product.category || '',
                                    supplier: typeof product.supplier === 'string' ? product.supplier : product.supplier?.name || product.supplierName || '',
                                    price: product.price,
                                    productTimestamp: product.productTimestamp
                                  }}
                                  className={cn("font-bold text-lg cursor-pointer hover:bg-primary/5 rounded px-2 py-1 transition-colors",
                                    product.isLowestPrice
                                      ? "text-green-600 dark:text-green-400"
                                      : "text-foreground"
                                  )}
                                  title={
                                    product.isLowestPrice
                                      ? "Menor preço disponível"
                                      : undefined
                                  }
                                />
                              </div>
                            </div>
                          </div>

                          {/* MEIO: Lista enxuta com Storage, Cor, Região, Fornecedor */}
                          <div className="px-4 py-3 space-y-2">
                            {/* Storage */}
                            <div className="flex items-center justify-between py-1">
                              <span className="text-sm text-muted-foreground">Storage:</span>
                              <Badge
                                variant="outline"
                                className={`text-xs font-medium ${getStorageBadgeColor(product.storage || '')}`}
                              >
                                {product.storage || 'N/A'}
                              </Badge>
                            </div>

                            {/* Cor */}
                            <div className="flex items-center justify-between py-1">
                              <span className="text-sm text-muted-foreground">Cor:</span>
                              {product.color && product.color.trim() ? (
                                <div className="flex items-center gap-2">
                                  <div
                                    className="w-3 h-3 rounded-full border border-border shadow-sm"
                                    style={{ backgroundColor: colorInfo.hex }}
                                    title={product.color}
                                  />
                                  <span className="text-sm font-medium">{product.color}</span>
                                </div>
                              ) : (
                                <span className="text-sm text-muted-foreground">N/A</span>
                              )}
                            </div>

                            {/* Região */}
                            <div className="flex items-center justify-between py-1">
                              <span className="text-sm text-muted-foreground">Região:</span>
                              <span className="text-sm font-medium">{product.region || 'N/A'}</span>
                            </div>

                            {/* Fornecedor */}
                            <div className="flex items-center justify-between py-1">
                              <span className="text-sm text-muted-foreground">Fornecedor:</span>
                              <span className="text-sm font-medium">
                                {(() => {
                                  let supplierName = '';
                                  if (product.supplierName && product.supplierName.trim()) {
                                    supplierName = product.supplierName;
                                  } else if (typeof product.supplier === 'string') {
                                    supplierName = product.supplier;
                                  } else if (product.supplier && typeof product.supplier === 'object') {
                                    if (product.supplier.name && product.supplier.name.trim()) {
                                      supplierName = product.supplier.name;
                                    } else if (product.supplier.id) {
                                      supplierName = "Supplier " + product.supplier.id;
                                    }
                                  } else if (product.brand && product.brand.trim()) {
                                    supplierName = product.brand;
                                  } else {
                                    supplierName = 'N/A';
                                  }
                                  return supplierName.toString().trim();
                                })()}
                              </span>
                            </div>
                          </div>

                          {/* RODAPÉ: Botão de ação (WhatsApp) e info extra */}
                          <div className="bg-muted/30 px-4 py-3 border-t border-border/30">
                            <TooltipProvider>
                              {(() => {
                                // Get supplier name and contact info
                                let supplierName = '';
                                if (product.supplierName && product.supplierName.trim()) {
                                  supplierName = product.supplierName;
                                } else if (typeof product.supplier === 'string') {
                                  supplierName = product.supplier;
                                } else if (product.supplier && typeof product.supplier === 'object') {
                                  if (product.supplier.name && product.supplier.name.trim()) {
                                    supplierName = product.supplier.name;
                                  } else if (product.supplier.id) {
                                    supplierName = "Supplier " + product.supplier.id;
                                  }
                                } else if (product.brand && product.brand.trim()) {
                                  supplierName = product.brand;
                                } else {
                                  supplierName = 'Fornecedor N/A';
                                }

                                const cleanSupplierName = supplierName.toString().trim();
                                let supplierContact = supplierContacts[cleanSupplierName];
                                let whatsappNumber = supplierContact?.telefone;
                                let supplierAddress = supplierContact?.endereco;

                                if (!whatsappNumber) {
                                  const contactKeys = Object.keys(supplierContacts);
                                  const matchedKey = contactKeys.find(key =>
                                    key.toLowerCase().trim() === cleanSupplierName.toLowerCase().trim()
                                  );
                                  if (matchedKey) {
                                    supplierContact = supplierContacts[matchedKey];
                                    whatsappNumber = supplierContact?.telefone;
                                    supplierAddress = supplierContact?.endereco;
                                  }
                                }

                                const isAdmin = user?.isAdmin === true ||
                                              user?.role === 'admin' ||
                                              user?.role === 'superadmin' ||
                                              user?.role === 'super_admin';

                                const isTesterNotAdmin = (user?.role === 'tester' || user?.subscriptionPlan === 'tester') && !isAdmin;

                                // 🔒 Verificar se o produto é da data mais recente (para WhatsApp)
                                const productDate = product.date || product.data;
                                const isCurrentDate = !mostRecentDate || productDate === mostRecentDate;
                                const canShowWhatsApp = isCurrentDate && !isTesterNotAdmin;

                                if (isTesterNotAdmin) {
                                  return (
                                    <div className="space-y-2">
                                      <div className="flex items-center justify-center gap-2 py-2 px-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                                        <span className="text-sm">🔒</span>
                                        <span className="text-sm text-yellow-700 dark:text-yellow-300 font-medium">
                                          Contatos bloqueados - Faça upgrade
                                        </span>
                                      </div>
                                      {supplierAddress && (
                                        <div className="text-xs text-muted-foreground text-center">
                                          📍 {supplierAddress}
                                        </div>
                                      )}
                                    </div>
                                  );
                                } else if (!isCurrentDate && whatsappNumber) {
                                  return (
                                    <div className="space-y-2">
                                      <div className="flex items-center justify-center gap-2 py-2 px-3 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg">
                                        <span className="text-sm">🔒</span>
                                        <span className="text-sm text-gray-600 dark:text-gray-400 font-medium">
                                          WhatsApp disponível apenas na data atual
                                        </span>
                                      </div>
                                      {supplierAddress && (
                                        <div className="text-xs text-muted-foreground text-center">
                                          📍 {supplierAddress}
                                        </div>
                                      )}
                                    </div>
                                  );
                                } else if (whatsappNumber && whatsappNumber.trim() && whatsappNumber !== 'undefined' && whatsappNumber !== 'null' && canShowWhatsApp) {
                                  return (
                                    <div className="space-y-2">
                                      <WhatsAppButton
                                        whatsappNumber={whatsappNumber}
                                        supplierName={cleanSupplierName}
                                        variant="default"
                                        size="default"
                                        className="w-full justify-center bg-green-600 hover:bg-green-700 text-white font-medium"
                                        productModel={product.model}
                                        productBrand={product.brand}
                                        productColor={product.color}
                                        productStorage={product.storage}
                                        productCategory={product.category}
                                        productPrice={product.price}
                                        productRegion={product.region}
                                      />
                                      {supplierAddress && (
                                        <div className="text-xs text-muted-foreground text-center">
                                          📍 {supplierAddress}
                                        </div>
                                      )}
                                    </div>
                                  );
                                } else if (isAdmin) {
                                  return (
                                    <div className="space-y-2">
                                      <div className="flex items-center justify-center gap-2 py-2 px-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                                        <span className="text-sm">👑</span>
                                        <span className="text-sm text-blue-700 dark:text-blue-300 font-medium">
                                          Acesso administrativo
                                        </span>
                                      </div>
                                      {supplierAddress && (
                                        <div className="text-xs text-muted-foreground text-center">
                                          📍 {supplierAddress}
                                        </div>
                                      )}
                                    </div>
                                  );
                                } else {
                                  return (
                                    <div className="space-y-2">
                                      <div className="flex items-center justify-center gap-2 py-2 px-3 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-lg">
                                        <span className="text-sm">📞</span>
                                        <span className="text-sm text-gray-600 dark:text-gray-400 font-medium">
                                          Contato não disponível
                                        </span>
                                      </div>
                                      {supplierAddress && (
                                        <div className="text-xs text-muted-foreground text-center">
                                          📍 {supplierAddress}
                                        </div>
                                      )}
                                    </div>
                                  );
                                }
                              })()}
                            </TooltipProvider>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

            {/* Show More Results Button - Only show when search returns less than 10 items and there are potential variants */}
            {(() => {
              const hasActiveSearchTerm = !!(searchTerm || currentFilters.search || searchFilter);
              const searchResults = filteredProducts.length;
              const isIPhoneSearch = hasActiveSearchTerm &&
                                     ((searchTerm || currentFilters.search || searchFilter || '').toLowerCase().match(/^(\d+)$/) ||
                                      (searchTerm || currentFilters.search || searchFilter || '').toLowerCase().match(/^iphone\s*(\d+)/i));

              // Calculate potential additional results (products with variants)
              const potentialAdditionalResults = hasActiveSearchTerm && !showAllVariants ? (() => {
                const activeSearchTerm = searchTerm || currentFilters.search || searchFilter || '';
                const allVariantsResults = products.filter(product => {
                  const productModel = (product.model || '').toLowerCase();
                  const productBrand = (product.brand || '').toLowerCase();
                  const productCategory = (product.category || '').toLowerCase();
                  const supplierName = typeof product.supplier === 'string' ?
                    product.supplier.toLowerCase() :
                    (product.supplier?.name || product.supplierName || '').toLowerCase();

                  if (isIPhoneSearch) {
                    return isExactModelMatch(product, activeSearchTerm, true);
                  }

                  return productModel.includes(activeSearchTerm.toLowerCase()) ||
                         productBrand.includes(activeSearchTerm.toLowerCase()) ||
                         productCategory.includes(activeSearchTerm.toLowerCase()) ||
                         supplierName.includes(activeSearchTerm.toLowerCase()) ||
                         (product.color && product.color.toLowerCase().includes(activeSearchTerm.toLowerCase())) ||
                         (product.storage && product.storage.toLowerCase().includes(activeSearchTerm.toLowerCase()));
                });

                return allVariantsResults.length - searchResults;
              })() : 0;

              const shouldShowButton = hasActiveSearchTerm &&
                                     searchResults < 10 &&
                                     searchResults > 0 &&
                                     !showAllVariants &&
                                     potentialAdditionalResults > 0;

              return shouldShowButton && (
                <div className="px-6 py-4 border-t border-border/20 bg-gradient-to-r from-blue-50/50 to-indigo-50/50 dark:from-blue-900/10 dark:to-indigo-900/10">
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="text-center sm:text-left">
                      <div className="text-sm font-medium text-foreground mb-1">
                        Encontrados apenas {searchResults} produtos para "{searchTerm || currentFilters.search || searchFilter}"
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Há mais {potentialAdditionalResults} produtos disponíveis incluindo variantes como CPO, Recondicionado, Ativado, etc.
                      </div>
                    </div>
                    <Button
                      onClick={() => {
                        setShowAllVariants(true);
                        setPage(1); // Reset to first page
                        console.log('🔍 Showing all variants for search:', searchTerm || currentFilters.search || searchFilter);
                      }}
                      className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg hover:shadow-xl transition-all duration-200 flex items-center gap-2"
                    >
                      <Search className="w-4 h-4" />
                      Ver Mais Preços
                      <Badge variant="secondary" className="ml-1 bg-white/20 text-white border-0">
                        +{potentialAdditionalResults}
                      </Badge>
                    </Button>
                  </div>
                </div>
              );
            })()}

            {/* Reset variants button - Show when all variants are being displayed */}
            {showAllVariants && (searchTerm || currentFilters.search || searchFilter) && (
              <div className="px-6 py-3 border-t border-border/20 bg-gradient-to-r from-green-50/50 to-emerald-50/50 dark:from-green-900/10 dark:to-emerald-900/10">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                  <div className="text-center sm:text-left">
                    <div className="text-sm font-medium text-green-700 dark:text-green-300 mb-1">
                      Exibindo todos os resultados incluindo variantes
                    </div>
                    <div className="text-xs text-green-600 dark:text-green-400">
                      Mostrando CPO, Recondicionado, Ativado e outras variantes
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setShowAllVariants(false);
                      setPage(1); // Reset to first page
                      console.log('🔍 Hiding variants, back to strict search');
                    }}
                    className="border-green-200 text-green-700 hover:bg-green-50 dark:border-green-800 dark:text-green-300 dark:hover:bg-green-900/20 flex items-center gap-2"
                  >
                    <X className="w-4 h-4" />
                    Apenas Lacrados
                  </Button>
                </div>
              </div>
            )}

            {/* Pagination */}
            {!productsLoading && safeProducts.length > 0 && (
              <div className="flex flex-col sm:flex-row items-center justify-between px-6 py-4 border-t border-border/50 gap-4">
                <div className="flex flex-col sm:flex-row items-center gap-4">
                  <div className="text-sm text-muted-foreground">
                    Mostrando {((page - 1) * itemsPerPage) + 1} a {Math.min(page * itemsPerPage, safeProducts.length)} de {safeProducts.length} produtos
                    {safeProducts.length !== products.length && (
                      <span className="text-xs text-muted-foreground ml-2">
                        (filtrado de {products.length} total)
                      </span>
                    )}
                    {showAllVariants && (
                      <span className="text-xs text-green-600 dark:text-green-400 ml-2">
                        • Incluindo variantes
                      </span>
                    )}
                  </div>

                  {/* Items per page selector */}
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground whitespace-nowrap">Itens por página:</span>
                    <select
                      value={itemsPerPage}
                      onChange={(e) => {
                        const newItemsPerPage = parseInt(e.target.value);
                        setItemsPerPage(newItemsPerPage);
                        setPage(1); // Reset to first page when changing items per page
                      }}
                      className="h-8 px-3 text-sm bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-all duration-200"
                    >
                      <option value={10}>10</option>
                      <option value={25}>25</option>
                      <option value={50}>50</option>
                      <option value={100}>100</option>
                      <option value={200}>200</option>
                    </select>
                  </div>
                </div>

                {totalPages > 1 && (
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(page - 1)}
                      disabled={page === 1}
                    >
                      Anterior
                    </Button>
                    <span className="text-sm font-medium whitespace-nowrap">
                      Página {page} de {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(page + 1)}
                      disabled={page === totalPages}
                    >
                      Próxima
                    </Button>
                  </div>
                )}
              </div>
            )}
        </Card>

        {/* Supplier Rating Modal */}
        {selectedSupplierForRating && (
          <SupplierRatingModal
            isOpen={isRatingModalOpen}
            onClose={handleCloseRatingModal}
            supplier={selectedSupplierForRating}
          />
        )}

        {/* Supplier Comments Modal */}
        {selectedSupplierForComments && (
          <SupplierCommentsModal
            isOpen={isCommentsModalOpen}
            onClose={() => setIsCommentsModalOpen(false)}
            supplier={selectedSupplierForComments}
          />
        )}
      </ErrorBoundary>
  );
};

// Helper function to build filter options with counts
function buildFilterOptions(
  products: any[],
  key: string,
  transform: (product: any) => string = (product) => product[key]
): FilterOption[] {
  if (!products || products.length === 0) {
    return [];
  }

  const counts: { [key: string]: number } = {};
  products.forEach((product) => {
    let value: string;

    // Special handling for supplier field
    if (key === 'supplier') {
      if (product.supplierName) {
        value = product.supplierName;
      } else if (typeof product.supplier === 'string') {
        value = product.supplier;
      } else if (product.supplier && typeof product.supplier === 'object' && product.supplier.name) {
        value = product.supplier.name;
      } else {
        value = '';
      }
    } else {
      value = transform(product);
    }

    if (value && value.toString().trim()) {
      const cleanValue = value.toString().trim();
      counts[cleanValue] = (counts[cleanValue] || 0) + 1;
    }
  });

  return Object.keys(counts)
    .filter(value => value && value.length > 0)
    .sort()
    .map((value) => ({ value, label: value, count: counts[value] }));
}

export { ExcelStylePriceList };