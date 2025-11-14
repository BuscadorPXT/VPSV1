import { useState } from "react";
import { Sidebar, MobileHeader } from "@/components/sidebar";
import { WATERMARK_CONFIG } from "@/config/watermark";
import React from "react";
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/theme-toggle';
import { useAuth } from '@/hooks/use-auth';
import { LogOut, User, Settings, Bell, Bug, Smartphone, Building, DollarSign, Clock, UserPlus, Home, Search, Heart, List, TrendingUp, BarChart3, HelpCircle } from 'lucide-react';
import { BugReportDialog } from '@/components/BugReportDialog';
import { useQuery } from "@tanstack/react-query";
import { getAuthHeaders } from "@/lib/auth-api";
import { CurrencyCard } from "@/components/CurrencyCard";
import { SuppliersModal } from "@/components/suppliers-modal";
import { OnlineUsersCounter } from './OnlineUsersCounter';
import EmergencyAlertDialog from './EmergencyAlertDialog';
import { SupplierRecommendationDialog } from './supplier-recommendation-dialog';
import { useUnifiedWebSocket } from '@/hooks/use-unified-websocket';
import { useToast } from '@/hooks/use-toast';
import { useLocation } from "wouter";

interface DashboardLayoutProps {
  children: React.ReactNode;
  dateFilter?: string;
}

// Quick stats component for header
const HeaderStats = React.memo(({ dateFilter = "01-07", onSuppliersClick }: {
  dateFilter?: string;
  onSuppliersClick?: () => void;
}) => {
  const { data: stats, isLoading } = useQuery({
    queryKey: [`/api/products/stats`, dateFilter],
    queryFn: async () => {
      const headers = await getAuthHeaders();
      const params = new URLSearchParams();
      if (dateFilter && dateFilter !== 'all') {
        params.set('date', dateFilter);
      }
      const url = `/api/products/stats${params.toString() ? `?${params}` : ''}`;
      const res = await fetch(url, { headers });
      if (!res.ok) throw new Error("Failed to load stats");
      return await res.json();
    },
    staleTime: 15 * 60 * 1000, // Cache mais longo
    gcTime: 30 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchInterval: false,
    retry: 1,
    notifyOnChangeProps: ['data'],
    structuralSharing: false,
  });

  if (isLoading || !stats) {
    return (
      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        <div className="animate-pulse bg-muted rounded h-4 w-16"></div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 lg:gap-6 text-xs">
      <div className="flex items-center gap-1.5 text-muted-foreground">
        <Smartphone className="h-3 w-3 text-blue-500" />
        <span className="font-medium text-foreground">{stats.totalProducts}</span>
        <span className="text-muted-foreground hidden sm:inline lg:inline">produtos</span>
      </div>

      <div className="hidden md:block w-px h-3 bg-border"></div>

      <button
        onClick={onSuppliersClick}
        className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors cursor-pointer hover:bg-muted/50 rounded-md px-1 lg:px-2 py-1"
      >
        <Building className="h-3 w-3 text-green-500" />
        <span className="font-medium text-foreground">{stats.suppliersCount}</span>
        <span className="text-muted-foreground hidden sm:inline lg:inline">fornecedores</span>
      </button>

      <div className="hidden md:block w-px h-3 bg-border"></div>

      <div className="flex items-center">
        <CurrencyCard
          pairs={['USD-BRL']}
          title=""
          className="border-0 bg-transparent p-0 shadow-none text-xs"
        />
      </div>
    </div>
  );
});

export const DashboardLayout = React.memo(({ children, dateFilter }: DashboardLayoutProps) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [, setLocation] = useLocation();
  const [showSuppliersModal, setShowSuppliersModal] = useState(false);
  const { toast } = useToast();
  const { socket, isConnected } = useUnifiedWebSocket(toast);

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const handleSuppliersClick = () => {
    setShowSuppliersModal(true);
  };

  // Get real monitoring status with last update time
  const { data: monitoringStatus } = useQuery({
    queryKey: ['monitoring-status'],
    queryFn: async () => {
      const headers = await getAuthHeaders();
      const res = await fetch('/api/monitoring/real-status', { headers });
      if (!res.ok) throw new Error("Failed to load monitoring status");
      return await res.json();
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
    refetchInterval: 3 * 60 * 1000, // Refresh every 3 minutes
    refetchOnWindowFocus: false,
  });

  const navigationItems = [
    { icon: Home, label: "Dashboard", href: "/dashboard", isActive: window.location.pathname === '/dashboard' || window.location.pathname === '/buscador' },
    { icon: Search, label: "Busca IA", href: "/busca-ia", isActive: window.location.pathname === '/busca-ia' },
    { icon: Heart, label: "Favoritos", href: "/favoritos", isActive: window.location.pathname === '/favoritos' },
    { icon: List, label: "Lista de Interesses", href: "/lista-de-interesses", isActive: window.location.pathname === '/lista-de-interesses' || window.location.pathname === '/interest-list' },
    { icon: TrendingUp, label: "Ranking Fornecedores", href: "/ranking", isActive: window.location.pathname === '/ranking' },
    { icon: Bell, label: "Notificações", href: "/notifications", isActive: window.location.pathname === '/notifications' },
    { icon: HelpCircle, label: "FAQ", href: "/faq", isActive: window.location.pathname === '/faq' || window.location.pathname === '/perguntas-frequentes' },
    { icon: BarChart3, label: "Monitoramento", href: "/price-monitoring", isActive: window.location.pathname === '/price-monitoring' },
    { icon: User, label: "Perfil", href: "/perfil", isActive: window.location.pathname === '/perfil' || window.location.pathname === '/meu-perfil' },
    { icon: Settings, label: "Preferências", href: "/preferencias", isActive: window.location.pathname === '/preferencias' || window.location.pathname === '/preferences' },
  ];

  const handleNavigation = (href: string) => {
    setLocation(href);
    setSidebarOpen(false);
  };


  return (
    <div className="relative min-h-screen w-full" onContextMenu={(e) => e.stopPropagation()}>
      {/* Watermark - Fully responsive configuration */}
      {WATERMARK_CONFIG.isVisible && (
        <div
          className="watermark-responsive"
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            width: '100vw',
            height: '100vh',
            minWidth: '100%',
            minHeight: '100%',
            maxWidth: '100vw',
            maxHeight: '100vh',
            zIndex: 9999,
            backgroundImage: `url(${WATERMARK_CONFIG.image})`,
            backgroundRepeat: 'repeat',
            backgroundSize: 'var(--watermark-size, 364px) var(--watermark-size, 364px)',
            backgroundPosition: '0 0',
            backgroundAttachment: 'fixed',
            opacity: WATERMARK_CONFIG.opacity,
            pointerEvents: 'none',
            mixBlendMode: 'multiply',
            transform: 'translateZ(0)', // Force GPU acceleration
            backfaceVisibility: 'hidden' // Optimize rendering
          }}
        />
      )}

      {/* Content Layer */}
      <div className="relative z-10 min-h-screen">
        {/* Mobile Header */}
        <MobileHeader onToggleSidebar={toggleSidebar} />

        {/* Main Layout */}
        <div className="flex min-h-screen">
          {/* Sidebar */}
          <Sidebar 
            isOpen={sidebarOpen} 
            onToggle={toggleSidebar} 
            isCollapsed={sidebarCollapsed}
            onCollapsedChange={setSidebarCollapsed}
            externalNavigationItems={navigationItems} 
            externalHandleNavigation={handleNavigation}
          />

          {/* Mobile Sidebar Overlay */}
          {sidebarOpen && (
            <div
              className="mobile-filters-overlay lg:hidden"
              onClick={() => setSidebarOpen(false)}
            />
          )}

          {/* Main Content - Ajustado para sidebar fixa com transição suave */}
          <main className={`flex-1 overflow-hidden transition-all duration-300 ${sidebarCollapsed ? 'lg:ml-16' : 'lg:ml-64'}`}>
            <div className="h-full overflow-y-auto">{children}</div>
          </main>
        </div>
      </div>

      {/* Suppliers Modal */}
      <SuppliersModal
        open={showSuppliersModal}
        onOpenChange={setShowSuppliersModal}
        dateFilter={dateFilter}
        userPlan="pro"
        isAdmin={false}
        role="user"
      />
    </div>
  );
});