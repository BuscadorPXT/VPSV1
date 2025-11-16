import { useQuery } from "@tanstack/react-query";
import { getAuthHeaders } from "@/lib/auth-api";
import { Smartphone, Building, Clock, Bug, UserPlus, Wifi } from "lucide-react";
import NotificationBell from "@/components/NotificationBell";
import { useState, useEffect, memo } from "react";
import { SuppliersModal } from "@/components/suppliers-modal";
import { CurrencyCard } from "@/components/CurrencyCard";
import { BugReportDialog } from "@/components/BugReportDialog";
import { SupplierRecommendationDialog } from "@/components/supplier-recommendation-dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface Stats {
  totalProducts: number;
  suppliersCount: number;
  lastSync: string | null;
}

interface LiveClockProps {
  showDate?: boolean;
  className?: string;
}

// ⚡ OTIMIZAÇÃO #22: React.memo para evitar re-renders desnecessários
export const LiveClock = memo(({ showDate = true, className = "" }: LiveClockProps) => {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Converter para horário de São Paulo (UTC-3)
  const saoPauloTime = new Date(currentTime.toLocaleString("en-US", {timeZone: "America/Sao_Paulo"}));
  
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('pt-BR', {
      weekday: 'short',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  return (
    <div className={`relative ${className}`}>
      <div className="flex items-center gap-3 px-4 py-2.5 bg-gradient-to-r from-emerald-50 to-blue-50 dark:from-emerald-900/20 dark:to-blue-900/20 rounded-xl border border-emerald-200/50 dark:border-emerald-700/30 shadow-sm backdrop-blur-sm">
        {/* Status Online com animação */}
        <div className="flex items-center gap-2">
          <div className="relative">
            <Wifi className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            <div className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
          </div>
          <span className="text-sm font-semibold text-emerald-700 dark:text-emerald-300 tracking-wide">
            ONLINE
          </span>
        </div>

        {/* Divisor vertical */}
        <div className="w-px h-6 bg-gradient-to-b from-transparent via-gray-300 dark:via-gray-600 to-transparent"></div>

        {/* Horário com ícone do relógio */}
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          <div className="flex flex-col">
            <div className="font-mono text-lg font-bold text-gray-900 dark:text-gray-100 leading-none tracking-wider">
              {formatTime(saoPauloTime)}
            </div>
            {showDate && (
              <div className="text-xs text-gray-600 dark:text-gray-400 font-medium leading-none mt-0.5">
                {formatDate(saoPauloTime)} (SP)
              </div>
            )}
          </div>
        </div>

        {/* Indicador de batimento do coração */}
        <div className="flex items-center">
          <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping"></div>
        </div>
      </div>

      {/* Sombra suave embaixo */}
      <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/10 to-blue-500/10 rounded-xl blur-lg -z-10 opacity-60"></div>
    </div>
  );
});

interface StatsCardsProps {
  dateFilter: string;
  brandCategory?: 'all' | 'iphone' | 'xiaomi';
  userPlan?: string;
  isAdmin?: boolean;
  role?: string;
  user?: any;
  onViewSupplierProducts?: (supplierId: number, supplierName: string) => void;
}

// ⚡ OTIMIZAÇÃO #22: React.memo para evitar re-renders desnecessários
export const StatsCards = memo(({
  dateFilter,
  brandCategory = 'all',
  userPlan = 'free',
  isAdmin = false,
  role = '',
  user,
  onViewSupplierProducts = () => {}
}: StatsCardsProps) => {
  const [showSuppliersModal, setShowSuppliersModal] = useState(false);
  const [showBugReport, setShowBugReport] = useState(false);
  const [showSupplierRecommendation, setShowSupplierRecommendation] = useState(false);

  // Stats query
  const { data: stats, isLoading } = useQuery({
    queryKey: [`/api/products/stats`, dateFilter, brandCategory],
    queryFn: async () => {
      const headers = await getAuthHeaders();
      const params = new URLSearchParams();
      if (dateFilter && dateFilter !== 'all') {
        params.set('date', dateFilter);
      }
      if (brandCategory && brandCategory !== 'all') {
        params.set('brandCategory', brandCategory);
      }
      const url = `/api/products/stats${params.toString() ? `?${params}` : ''}`;
      const res = await fetch(url, { headers });
      if (!res.ok) throw new Error("Failed to load stats");
      return await res.json();
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: 1,
    refetchInterval: false,
  });

  // Real-time monitoring query to get actual last sync from Google Sheets
  // Otimizado: removido polling, usa apenas WebSocket para atualizações
  const { data: monitoringData } = useQuery({
    queryKey: ['/api/monitoring/real-status'],
    queryFn: async () => {
      const headers = await getAuthHeaders();
      const res = await fetch('/api/monitoring/real-status', { headers });
      if (!res.ok) return null;
      const data = await res.json();
      console.log('🕐 Monitoring data received:', data);
      return data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutos
    gcTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: 1,
    refetchInterval: false, // Desabilitado - usa WebSocket para updates
  });

  // Show exact value from Google Sheets controle!B1 cell
  const formatLastSync = (lastSync: string | null) => {
    if (!lastSync) return 'Nunca';

    console.log('🕐 Raw value from controle!B1:', lastSync);
    console.log('🕐 Type of value:', typeof lastSync);
    console.log('🕐 Full monitoring data:', monitoringData);

    // Return exactly what's in the Google Sheets controle!B1 cell without any processing
    return lastSync.toString().trim();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-between py-2 text-xs">
        <div className="flex items-center gap-6 text-muted-foreground">
          <div className="animate-pulse bg-muted rounded h-3 w-16"></div>
          <div className="animate-pulse bg-muted rounded h-3 w-16"></div>
          <div className="animate-pulse bg-muted rounded h-3 w-20"></div>
          <div className="animate-pulse bg-muted rounded h-3 w-24"></div>
        </div>
        <div className="flex gap-2">
          <div className="animate-pulse bg-muted rounded h-6 w-16"></div>
          <div className="animate-pulse bg-muted rounded h-6 w-16"></div>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Desktop Stats Bar */}
      <div className="hidden md:flex items-center justify-between py-3 px-4 mb-6 text-xs border rounded-lg bg-background/50">
        {/* Left side - Stats */}
        <div className="flex items-center gap-4 lg:gap-6">
          {/* Products */}
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Smartphone className="h-3 w-3 text-blue-500" />
            <span className="font-medium text-foreground">{stats?.totalProducts || 0}</span>
            <span className="text-muted-foreground hidden sm:inline">produtos</span>
          </div>

          <div className="hidden md:block w-px h-3 bg-border"></div>

          {/* Suppliers */}
          <button 
            className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors cursor-pointer hover:bg-muted/50 rounded-md px-2 py-1"
            onClick={() => setShowSuppliersModal(true)}
          >
            <Building className="h-3 w-3 text-green-500" />
            <span className="font-medium text-foreground">{stats?.suppliersCount || 0}</span>
            <span className="text-muted-foreground hidden sm:inline">fornecedores</span>
          </button>

          <div className="hidden md:block w-px h-3 bg-border"></div>

          {/* Currency */}
          <div className="flex items-center">
            <CurrencyCard
              pairs={['USD-BRL']}
              title=""
              className="border-0 bg-transparent p-0 shadow-none text-xs"
            />
          </div>

          <div className="hidden lg:block w-px h-3 bg-border"></div>

          {/* Live Clock */}
          <div className="flex items-center">
            <LiveClock showDate={true} className="scale-75 origin-left" />
          </div>
        </div>

        {/* Right side - Action buttons */}
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowSupplierRecommendation(true)}
            className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground"
            data-testid="button-indicar"
          >
            <UserPlus className="h-3 w-3 mr-1" />
            Indicar
          </Button>

          <NotificationBell />

          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowBugReport(true)}
            className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground"
            data-testid="button-bug"
          >
            <Bug className="h-3 w-3 mr-1" />
            Bug
          </Button>
        </div>
      </div>

      {/* Mobile Stats Cards - Estilo Booking Ultra Compacto */}
      <div className="md:hidden mb-2">
        {/* Single line stats similar to Booking.com */}
        <div className="bg-white dark:bg-gray-800 mx-2 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-3 mobile-stats-card">
          <div className="flex items-center justify-between">
            {/* Left side - Main stats */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5">
                <Smartphone className="h-4 w-4 text-blue-500" />
                <span className="text-sm font-bold text-gray-900 dark:text-white stats-text">{stats?.totalProducts || 0}</span>
                <span className="text-xs text-gray-500 stats-text">produtos</span>
              </div>
              
              <div className="w-px h-4 bg-gray-300 dark:bg-gray-600"></div>
              
              <button 
                className="flex items-center gap-1.5 hover:bg-gray-50 dark:hover:bg-gray-700 rounded px-2 py-1 transition-colors"
                onClick={() => setShowSuppliersModal(true)}
              >
                <Building className="h-4 w-4 text-green-500" />
                <span className="text-sm font-bold text-gray-900 dark:text-white stats-text">{stats?.suppliersCount || 0}</span>
<span className="text-xs text-gray-500 stats-text">forn.</span>
              </button>
            </div>

            {/* Right side - Quick actions */}
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowSupplierRecommendation(true)}
                className="h-7 px-2 text-xs text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900/20"
              >
                <UserPlus className="h-3 w-3 mr-1" />
                Indicar
              </Button>
            </div>
          </div>

          {/* Bottom row - Clock and currency in one line */}
          <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-100 dark:border-gray-700">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <LiveClock showDate={false} className="scale-75 origin-left flex-shrink-0" />
            </div>
            
            <div className="flex items-center min-w-0 max-w-[120px] sm:max-w-none">
              <CurrencyCard
                pairs={['USD-BRL']}
                title=""
                className="border-0 bg-transparent p-0 shadow-none text-xs min-w-0 flex-shrink"
              />
            </div>
          </div>
        </div>
      </div>

      <SuppliersModal
        open={showSuppliersModal}
        onOpenChange={setShowSuppliersModal}
        dateFilter={dateFilter}
        onViewSupplierProducts={onViewSupplierProducts}
        userPlan={userPlan || 'free'}
        isAdmin={isAdmin || false}
        role={role || ''}
      />

      <BugReportDialog
        trigger={
          <div style={{ display: 'none' }} />
        }
        open={showBugReport}
        onOpenChange={setShowBugReport}
      />

      <SupplierRecommendationDialog
        open={showSupplierRecommendation}
        onOpenChange={setShowSupplierRecommendation}
      />
    </>
  );
});