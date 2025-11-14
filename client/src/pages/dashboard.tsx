import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useUserProfile } from "@/hooks/use-user-profile";
import { useActivityTracker } from "@/hooks/use-activity-tracker";
import { useToast } from "@/hooks/use-toast";
import { useUnifiedWebSocket } from "@/hooks/use-unified-websocket";
import { DashboardLayout } from "@/components/dashboard-layout";
import { StatsCards } from "@/features/products/components/StatsCards";
import { Watermark } from "@/components/Watermark";
import { CurrencySection } from "@/components/CurrencySection";

import { ExcelStylePriceList } from "@/components/ExcelStylePriceList";
import { ProfitMarginsWrapper } from "@/components/ProfitMarginsWrapper";
import { PriceDropNotifications } from "@/components/price-drop-notifications";
import { UpgradeBanner } from "@/features/auth/components/SubscriptionGuard";
import { TopSearchBar } from "@/components/top-search-bar";
import { useInitialData } from "@/hooks/use-initial-data";
import { useProgressiveLoading } from "@/hooks/useProgressiveLoading";
// import { useSingleSessionMonitor } from "@/hooks/use-single-session-monitor";

import { apiRequest } from "@/lib/queryClient";
import { getAuthHeaders } from "@/lib/auth-api";
import { SubscriptionPlan, getPlanDisplayTag, getEffectivePlan } from "@shared/subscription";
import { Filter } from "lucide-react";
import watermarkPattern from "@/assets/watermark-pattern.png";
import watermarkPatternDark from "@/assets/watermark-pattern-dark.png";
import { useTheme } from "@/components/theme-provider";
import { ApprovalBlockingModal } from "@/components/ApprovalBlockingModal";
import { TesterStatusCard } from '@/components/TesterStatusCard';
import { TesterUpgradeDashboard } from '@/components/TesterUpgradeDashboard';
import { MobileSearchBar } from '@/components/MobileSearchBar';
import { SimpleMobileFilters } from '@/components/SimpleMobileFilters';
import { useIsMobile } from '@/hooks/use-mobile';
import { Loader2 } from 'lucide-react';


export default function Dashboard() {
  const { user, loading: authLoading, isAuthReady } = useAuth();
  const isMobile = useIsMobile();

  // Track user activity to maintain online status
  useActivityTracker(!!user && !authLoading);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { isConnected } = useUnifiedWebSocket(toast);
  const { theme } = useTheme();

  // 🚀 ULTRA OTIMIZAÇÃO: Estados para carregamento progressivo
  const {
    currentPhase,
    advanceToPhase,
    isPhaseActive,
    isComplete
  } = useProgressiveLoading({
    phases: ['skeleton', 'critical', 'important', 'optional', 'complete'],
    delays: {
      critical: 50,
      important: 150,
      optional: 300,
      complete: 500
    }
  });

  const [showRealContent, setShowRealContent] = useState(false);

  // Show approval blocking modal for unapproved users
  if (user && user.needsApproval && !user.isApproved) {
    return (
      <ApprovalBlockingModal
        user={{
          email: user.email,
          name: user.name,
          createdAt: user.createdAt || new Date().toISOString(),
          isApproved: user.isApproved,
          rejectedAt: user.rejectedAt,
          rejectionReason: user.rejectionReason,
        }}
      />
    );
  }

  // Initialize cache with empty data for immediate rendering
  useInitialData();

  const [searchFilter, setSearchFilter] = useState("");
  const [dateFilter, setDateFilter] = useState("all");
  const [listKey, setListKey] = useState(0);

  // ⚡ OTIMIZAÇÃO: Memoizar callback para evitar re-renders
  const handleFiltersReset = useCallback(() => {
    console.log('🔄 Dashboard: Resetting all filters');
    setSearchFilter("");
    setListKey(prev => prev + 1); // Force component re-render
  }, []);

  // Local sync status state for enhanced UI feedback
  const [localSyncStatus, setLocalSyncStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

  // ✅ OTIMIZAÇÃO: Usar hook centralizado para evitar queries duplicadas
  const { data: userProfile, isLoading: userProfileLoading, error: userProfileError } = useUserProfile();

  // 🚀 Mostrar conteúdo progressivamente
  useEffect(() => {
    if (userProfile && !userProfileLoading && currentPhase !== 'skeleton') {
      const timer = setTimeout(() => {
        setShowRealContent(true);
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [userProfile, userProfileLoading, currentPhase]);

  // Sync status query - Otimizado para reduzir custos
  const { data: syncStatus } = useQuery({
    queryKey: ['/api/sync/status'],
    refetchInterval: false, // Desabilitado - economia de compute units
    staleTime: 10 * 60 * 1000, // 10 minutos
    refetchOnWindowFocus: false,
  });

  // 🚀 PERFORMANCE: Dates com cache máximo
  const { data: datesResponse, isLoading: datesLoading } = useQuery({
    queryKey: ['/api/products/dates'],
    queryFn: async () => {
      const headers = await getAuthHeaders();
      const res = await fetch('/api/products/dates', { headers });
      if (!res.ok) throw new Error('Failed to load dates');
      return await res.json();
    },
    refetchInterval: false,
    staleTime: 24 * 60 * 60 * 1000, // 24 horas de cache
    gcTime: 48 * 60 * 60 * 1000, // 48 horas garbage collection
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchOnMount: false,
    retry: 0,
    structuralSharing: false,
    networkMode: 'online',
    enabled: !!user && isAuthReady,
  });

  // ⚡ PERFORMANCE: Usar datesResponse diretamente - não duplicar query
  const dates = Array.isArray(datesResponse?.dates) ? datesResponse.dates :
                Array.isArray(datesResponse) ? datesResponse : [];

  // Auto-select the most recent date when dates are loaded
  useEffect(() => {
    if (dates && dates.length > 0 && dateFilter === 'all') {
      // Sort dates and pick the most recent one
      const sortedDates = [...dates].sort((a, b) => {
        const [dayA, monthA] = a.split('-').map(Number);
        const [dayB, monthB] = b.split('-').map(Number);
        if (monthA !== monthB) return monthB - monthA;
        return dayB - dayA;
      });
      const mostRecentDate = sortedDates[0];
      console.log('📅 Auto-selecting most recent date:', mostRecentDate);
      setDateFilter(mostRecentDate);
    }
  }, [dates, dateFilter]);

  // Invalidate apenas quando necessário
  const previousDateFilter = useMemo(() => dateFilter, [dateFilter]);
  useEffect(() => {
    if (dateFilter !== previousDateFilter && dateFilter && dateFilter !== 'all') {
      // Debounce para evitar múltiplas invalidações
      const timeoutId = setTimeout(() => {
        queryClient.invalidateQueries({
          queryKey: ['/api/products', dateFilter],
          exact: true,
          refetchType: 'active'
        });
      }, 300);
      return () => clearTimeout(timeoutId);
    }
  }, [dateFilter, previousDateFilter, queryClient]);

  // ⚡ OTIMIZAÇÃO: Memoizar callback para evitar re-renders
  const handleManualSync = useCallback(async () => {
    try {
      setLocalSyncStatus('loading');

      toast({
        title: "Sincronização iniciada",
        description: "Aguarde enquanto sincronizamos os dados...",
      });

      const token = localStorage.getItem('firebaseToken');
      if (!token) throw new Error('Token not found');

      const response = await fetch('/api/sync/manual', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Sync failed');
      }

      const result = await response.json();

      // Invalidate all queries to refresh data
      queryClient.invalidateQueries();

      setLocalSyncStatus('success');

      toast({
        title: "Sincronização concluída",
        description: `${result.productsProcessed} produtos processados com sucesso!`,
      });
    } catch (error: any) {
      setLocalSyncStatus('error');

      toast({
        title: "Erro na sincronização",
        description: error.message || "Falha ao sincronizar dados",
        variant: "destructive",
      });
    }
  }, [toast, queryClient]);

  // ⚡ REMOVIDO: Query duplicada - usar datesResponse em vez de availableDates
  const availableDates = dates; // Alias para compatibilidade

  // Função temporária para teste de termos
  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any).clearUserTerms = () => {
        const STORAGE_KEY = 'buscador_pxt_terms_acceptance';
        const storedData = localStorage.getItem(STORAGE_KEY);
        if (storedData) {
          const parsedData = JSON.parse(storedData);
          console.log('Dados de termos encontrados:', parsedData);
          // Limpar todos os dados
          localStorage.removeItem(STORAGE_KEY);
          console.log('Dados de termos limpos. Recarregue a página.');
        } else {
          console.log('Nenhum dado de termos encontrado no localStorage');
        }
      };
      console.log('Função clearUserTerms() disponível no console');
    }
  }, []);

  const [selectedDate, setSelectedDate] = useState(availableDates?.[0] || 'all');
  const [filters, setFilters] = useState({
      search: '',
      storage: 'all',
      color: 'all',
      category: 'all',
      capacity: 'all',
      region: 'all',
      date: '',
      supplierId: 'all',
      supplierIds: [] as string[],
      brandCategory: 'all' as 'all' | 'xiaomi' | 'iphone',
    });
  const [activeFilters, setActiveFilters] = useState({});

  // Mobile filters state
  const [isMobileFiltersOpen, setIsMobileFiltersOpen] = useState(false);
  const [mobileSelectedFilters, setMobileSelectedFilters] = useState({
    categories: [] as string[],
    capacities: [] as string[],
    regions: [] as string[],
    colors: [] as string[],
    suppliers: [] as string[]
  });

  // Debug mobile filters state
  React.useEffect(() => {
    console.log('📱 Dashboard: Mobile filters state changed', {
      isMobileFiltersOpen,
      mobileSelectedFilters,
      timestamp: new Date().toISOString()
    });
  }, [isMobileFiltersOpen, mobileSelectedFilters]);

  const { data: testerStatus } = useQuery({
    queryKey: ['/api/tester/status'],
    queryFn: async () => {
      const headers = await getAuthHeaders();
      const res = await fetch('/api/tester/status', { headers });
      if (!res.ok) {
        throw new Error(`Failed to load tester status: ${res.status}`);
      }
      return await res.json();
    },
    enabled: !!user && isAuthReady,
    staleTime: 5 * 60 * 1000, // 5 minutes cache
    gcTime: 10 * 60 * 1000, // 10 minutes
    retry: 1,
    refetchOnWindowFocus: false,
    refetchInterval: false,
  });

  // Buscar produtos para o sistema de margem de lucro
  const { data: productsData, isLoading: productsLoading, error: productsError } = useQuery({
    queryKey: ['/api/products', dateFilter],
    queryFn: async () => {
      console.log('🔄 Dashboard: Fetching products data with dateFilter:', dateFilter);

      try {
        const headers = await getAuthHeaders();
        const params = new URLSearchParams();

        if (dateFilter && dateFilter !== 'all') {
          params.set('date', dateFilter);
        }
        params.set('limit', '999999');
        params.set('page', '1');

        const url = `/api/products${params.toString() ? `?${params}` : ''}`;

        console.log('📡 Dashboard: Making request to:', url);
        console.log('🔑 Dashboard: Headers present:', !!headers);

        const res = await fetch(url, {
          headers
        });

        console.log('📊 Dashboard: Response status:', res.status);

        if (!res.ok) {
          const errorText = await res.text();
          console.error('❌ Dashboard: API Error Response:', errorText);

          if (res.status === 401) {
            throw new Error('Authentication required');
          }
          if (res.status === 500) {
            throw new Error('Server error - please try again');
          }
          throw new Error(`Failed to load products: ${res.status} - ${errorText}`);
        }

        const responseData = await res.json();
        console.log('✅ Dashboard: Products data received:', {
          total: responseData.total || responseData.totalCount || responseData.products?.length || 0,
          productsCount: responseData.products?.length || 0,
          hasProducts: !!(responseData.products && responseData.products.length > 0),
          structure: Object.keys(responseData),
          actualDate: responseData.actualDate || responseData.selectedDate,
          requestedDate: dateFilter
        });

        return responseData;
      } catch (error) {
        console.error('❌ Dashboard: Products fetch error:', error);
        throw error;
      }
    },
    enabled: isAuthReady && !!dateFilter && dateFilter !== 'all',
    staleTime: 2 * 60 * 1000, // 2 minutes cache
    gcTime: 5 * 60 * 1000, // 5 minutes
    retry: (failureCount, error) => {
      console.log('🔄 Dashboard: Retry attempt', failureCount, 'for error:', error.message);
      if (error.message?.includes('401') || error.message?.includes('Authentication required')) {
        return false;
      }
      return failureCount < 3;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    refetchOnWindowFocus: false,
    refetchInterval: false,
    notifyOnChangeProps: ['data', 'error'],
  });

  // Declare variables that depend on productsData AFTER the query
  const products = productsData?.products || [];
  const filteredProductsForSearch = productsData?.products || [];
  const hasActiveFilters = Object.keys(activeFilters).length > 0 || searchFilter !== "";

  // Debug products data
  React.useEffect(() => {
    console.log('🎯 Dashboard: Products data updated:', {
      hasProductsData: !!productsData,
      productsArray: products,
      productsCount: products?.length || 0,
      isLoading: productsLoading,
      hasError: !!productsError,
      error: productsError?.message,
      dateFilter,
      searchFilter,
      userAuthenticated: !!user,
      isAuthReady
    });
  }, [productsData, products, productsLoading, productsError, dateFilter, searchFilter, user, isAuthReady]);

  // ⚡ OTIMIZAÇÃO: Memoizar callbacks para evitar re-renders
  const handleClearAllFilters = useCallback(() => {
      setActiveFilters({});
      setSearchFilter("");
      setListKey(prev => prev + 1);
  }, []);

  const getActiveFiltersCount = useCallback(() => {
    return Object.keys(activeFilters).length + (searchFilter ? 1 : 0);
  }, [activeFilters, searchFilter]);

  const clearFilters = useCallback(() => {
      setFilters({
        search: '',
        storage: 'all',
        color: 'all',
        category: 'all',
        capacity: 'all',
        region: 'all',
        date: filters.date, // Keep date filter
        supplierId: 'all',
        supplierIds: [],
        brandCategory: 'all' as 'all' | 'xiaomi' | 'iphone',
      });
    }, [filters.date]);

  const handleViewSupplierProducts = useCallback((supplierId: number, supplierName: string) => {
    console.log('Viewing products for supplier:', supplierName, 'ID:', supplierId);
    // This function can be expanded later to handle supplier product viewing
  }, []);

  // ⚡ OTIMIZAÇÃO: Memoizar mobile filter handlers
  const handleMobileFilterChange = useCallback((filterType: string, values: string[]) => {
    setMobileSelectedFilters(prev => ({
      ...prev,
      [filterType]: values
    }));
  }, []);

  const handleApplyMobileFilters = useCallback(() => {
    // Apply mobile filters to main filters
    // This is a simplified implementation - you can expand based on your needs
    console.log('Applying mobile filters:', mobileSelectedFilters);
    // Here you would apply the filters to your main data
  }, [mobileSelectedFilters]);

  const handleClearMobileFilters = useCallback(() => {
    setMobileSelectedFilters({
      categories: [],
      capacities: [],
      regions: [],
      colors: [],
      suppliers: []
    });
  }, []);

  // Get available filter options from products
  const getAvailableFilters = (): {
    categories: string[];
    capacities: string[];
    regions: string[];
    colors: string[];
    suppliers: string[];
  } => {
    if (!products || products.length === 0) {
      return {
        categories: [],
        capacities: [],
        regions: [],
        colors: [],
        suppliers: []
      };
    }

    const categories = Array.from(new Set(products.map((p: any) => p.category).filter(Boolean))) as string[];
    const capacities = Array.from(new Set(products.map((p: any) => p.capacity).filter(Boolean))) as string[];
    const regions = Array.from(new Set(products.map((p: any) => p.region).filter(Boolean))) as string[];
    const colors = Array.from(new Set(products.map((p: any) => p.color).filter(Boolean))) as string[];
    const suppliers = Array.from(new Set(products.map((p: any) => p.supplierName).filter(Boolean))) as string[];

    return {
      categories: categories.sort(),
      capacities: capacities.sort(),
      regions: regions.sort(),
      colors: colors.sort(),
      suppliers: suppliers.sort()
    };
  };

  // ✅ CRITICAL: All hooks must be called before this conditional return
  const shouldShowError = userProfileError && userProfileError.message?.includes('temporariamente indisponível');

  if (shouldShowError) {
    return (
      <DashboardLayout dateFilter={dateFilter}>
        <div className="min-h-screen flex items-center justify-center bg-background">
          <div className="max-w-md p-6 bg-card rounded-lg border border-border shadow-sm text-center">
            <div className="text-destructive mb-4">
              <svg className="h-12 w-12 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 15.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-foreground mb-2">
              Serviço temporariamente indisponível
            </h2>
            <p className="text-sm text-muted-foreground mb-4">
              {userProfileError?.message?.includes('temporariamente indisponível')
                ? 'Problema de conectividade com o banco de dados. Nossa equipe foi notificada automaticamente.'
                : 'Falha na conexão com a fonte de dados.'
              }<br/>
              Status: Reconectando automaticamente...<br/>
              Os dados serão atualizados assim que a conexão for restaurada.
            </p>
            <div className="space-y-2">
              <button
                onClick={() => window.location.reload()}
                className="w-full px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90"
              >
                Recarregar Página
              </button>
              <button
                onClick={() => queryClient.refetchQueries()}
                className="w-full px-4 py-2 bg-secondary text-secondary-foreground rounded hover:bg-secondary/90"
              >
                Tentar Novamente
              </button>
            </div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  // 🚀 PERFORMANCE: Loading ultra minimalista
  if (authLoading || !isAuthReady) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">Carregando dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <DashboardLayout dateFilter={dateFilter}>
      <div className="dashboard-container min-h-screen bg-background relative" translate="no" style={{
        transform: 'translate3d(0,0,0)', // Use translate3d for potential hardware acceleration
        backfaceVisibility: 'hidden',
        perspective: '1000px'
      }}>
        {/* Content Layer */}
        <div className="relative z-10 min-h-screen" style={{
          overflowAnchor: 'none' // Previne scroll jumping
        }}>
          {/* Main Dashboard Grid Container */}
          <div className="w-full px-2 sm:px-4 py-4 space-y-6">

            {/* Tester Status Card - Render imediato */}
            <TesterStatusCard />

            {/* Dashboard de Upgrade - Render imediato com fallback */}
            {testerStatus?.isTester && (testerStatus.daysRemaining <= 3 || !testerStatus.isActive) && (
              <TesterUpgradeDashboard
                daysRemaining={testerStatus.daysRemaining}
                isExpired={!testerStatus.isActive}
              />
            )}




            {/* Stats Cards - Show system information */}
            <div className="animate-in slide-in-from-top-4 duration-300">
              <StatsCards
                dateFilter={dateFilter}
                brandCategory={filters.brandCategory}
                userPlan={userProfile?.subscriptionPlan || 'free'}
                isAdmin={userProfile?.isAdmin || false}
                role={userProfile?.role || 'user'}
                user={userProfile}
                onViewSupplierProducts={handleViewSupplierProducts}
              />
            </div>

            {/* Search Bar - Conditional rendering for mobile/desktop */}
            {isMobile ? (
              <MobileSearchBar
                searchTerm={searchFilter}
                onSearchChange={(newValue) => {
                  console.log('📊 Dashboard: MobileSearchBar onChange called with:', newValue);
                  console.log('📊 Dashboard: Previous search value was:', searchFilter);
                  setSearchFilter(newValue);
                  console.log('📊 Dashboard: Search filter updated to:', newValue);
                }}
                selectedDate={dateFilter}
              />
            ) : (
              <TopSearchBar
                value={searchFilter}
                onChange={(newValue) => {
                  console.log('📊 Dashboard: TopSearchBar onChange called with:', newValue);
                  console.log('📊 Dashboard: Previous search value was:', searchFilter);
                  setSearchFilter(newValue);
                  console.log('📊 Dashboard: Search filter updated to:', newValue);
                }}
                hasActiveFilters={hasActiveFilters}
                onFiltersReset={handleFiltersReset}
                filteredProducts={filteredProductsForSearch} // Pass filtered products for dropdown
              />
            )}

            {/* Main Content - Product List com Sistema de Margem de Lucro */}
            <div className={`transition-all duration-300 ${
              showRealContent ? 'opacity-100 translate-y-0' : 'opacity-90 translate-y-1'
            }`}>
              {productsError && (
                <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                  <div className="flex items-center gap-2 text-red-800 dark:text-red-200">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L10 8.586 8.707 7.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                    <span className="font-medium">Erro ao carregar produtos</span>
                  </div>
                  <p className="text-sm text-red-700 dark:text-red-300 mt-1">
                    {productsError.message}
                  </p>
                  <button
                    onClick={() => queryClient.invalidateQueries({ queryKey: ['/api/products'] })}
                    className="mt-2 px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700"
                  >
                    Tentar Novamente
                  </button>
                </div>
              )}

              <div className="animate-in slide-in-from-top-6 duration-300">
                <ProfitMarginsWrapper
                  userId={user?.uid || ''}
                  products={products}
                  className="space-y-6"
                >
                  <div className="bg-card/50 backdrop-blur-sm rounded-xl border border-border/50 shadow-sm overflow-hidden relative z-10">

                    <ExcelStylePriceList
                      key={listKey}
                      searchFilter={searchFilter}
                      dateFilter={dateFilter}
                      userPlan={(userProfile?.subscriptionPlan || 'free') as SubscriptionPlan}
                      isAdmin={userProfile?.isAdmin || false}
                      role={userProfile?.role || 'user'}
                      onFiltersReset={handleFiltersReset}
                      onDateFilterChange={(newDate) => {
                        console.log(`📅 Date changed from ExcelStylePriceList: ${newDate}`);
                        setDateFilter(newDate);
                      }}
                      availableDates={dates}
                      datesLoading={datesLoading}
                    />
                  </div>
                </ProfitMarginsWrapper>
              </div>
            </div>
          </div>
        </div>

        {/* Mobile Filters Modal - Rendered outside main layout as fixed overlay */}
        {isMobile && (
          <SimpleMobileFilters
            isOpen={isMobileFiltersOpen}
            onClose={() => {
              console.log('🔘 Dashboard: Closing mobile filters modal');
              setIsMobileFiltersOpen(false);
            }}
            availableFilters={getAvailableFilters()}
            selectedFilters={mobileSelectedFilters}
            onFilterChange={handleMobileFilterChange}
            onApplyFilters={handleApplyMobileFilters}
            onClearFilters={handleClearMobileFilters}
            productCount={products?.length || 0}
          />
        )}
      </div>
    </DashboardLayout>
  );
}