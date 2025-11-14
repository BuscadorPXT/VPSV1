import React, { useState, useMemo, useCallback, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useUserProfile } from "@/hooks/use-user-profile";
import { useQuery } from "@tanstack/react-query";
import { 
  BarChart3, 
  User, 
  Crown, 
  Settings, 
  History, 
  LogOut, 
  Menu, 
  X,
  Shield,
  Moon,
  Sun,
  Heart,
  Sparkles,
  Filter,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  ListChecks,
  Star,
  MessageSquare,
  ShoppingCart,
  Calculator,
  HelpCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useTheme } from "@/components/theme-provider";
import { SubscriptionPlan, getPlanDisplayTag, getEffectivePlan } from "@shared/subscription";
import NotificationBell from "@/components/NotificationBell";
import logoSymbol from "@/assets/logo-symbol.png";
import logoBranca from "/logo_natal_branca.png";
import logoClara from "/logonatalsistema.png";

interface SidebarProps {
  isOpen: boolean;
  onToggle: () => void;
  isCollapsed?: boolean;
  onCollapsedChange?: (collapsed: boolean) => void;
  externalNavigationItems?: any[];
  externalHandleNavigation?: (href: string) => void;
}

interface UserProfile {
  id: number;
  email: string;
  name: string;
  subscriptionPlan: SubscriptionPlan;
  subscriptionStartDate?: string;
  subscriptionEndDate?: string;
  isSubscriptionActive: boolean;
  isAdmin: boolean;
  role: string;
}

export function Sidebar({ isOpen, onToggle, isCollapsed, onCollapsedChange, externalNavigationItems, externalHandleNavigation }: SidebarProps) {
  const { user, logout } = useAuth();
  const [location] = useLocation();
  const { theme, setTheme } = useTheme();
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [preferencesCollapsed, setPreferencesCollapsed] = useState(false);
  const [adminCollapsed, setAdminCollapsed] = useState(false);
  const [watchlistCount, setWatchlistCount] = useState(0);
  const [showProModal, setShowProModal] = useState(false);
  const [internalSidebarCollapsed, setInternalSidebarCollapsed] = useState(false);

  const sidebarCollapsed = isCollapsed !== undefined ? isCollapsed : internalSidebarCollapsed;
  const setSidebarCollapsed = onCollapsedChange || setInternalSidebarCollapsed;

  // ✅ OTIMIZAÇÃO: Usar hook centralizado para evitar queries duplicadas
  const { data: userProfile, isLoading: userProfileLoading, error: userProfileError } = useUserProfile();

  // Removed excessive logging for better performance

  // Load profile image from localStorage
  useEffect(() => {
    const savedImage = localStorage.getItem('profileImage');
    if (savedImage) {
      setProfileImage(savedImage);
    }
  }, []);

  // Monitor watchlist changes
  useEffect(() => {
    const updateWatchlistCount = () => {
      const savedWatchlist = localStorage.getItem('trading-watchlist');
      if (savedWatchlist) {
        try {
          const watchlist = JSON.parse(savedWatchlist);
          setWatchlistCount(Array.isArray(watchlist) ? watchlist.length : 0);
        } catch {
          setWatchlistCount(0);
        }
      } else {
        setWatchlistCount(0);
      }
    };

    // Initial load
    updateWatchlistCount();

    // Listen for storage changes (when watchlist is updated)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'trading-watchlist') {
        updateWatchlistCount();
      }
    };

    window.addEventListener('storage', handleStorageChange);

    // Also listen for custom events (for same-tab updates)
    const handleWatchlistChange = () => updateWatchlistCount();
    window.addEventListener('watchlistChanged', handleWatchlistChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('watchlistChanged', handleWatchlistChange);
    };
  }, []);

  const handleLogout = useCallback(async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Logout error:', error);
    }
  }, [logout]);

  const toggleTheme = useCallback(() => {
    setTheme(theme === 'light' ? 'dark' : 'light');
  }, [theme, setTheme]);

  // Get current user plan for badge display
  const currentPlan = (userProfile ? getEffectivePlan(userProfile.subscriptionPlan as SubscriptionPlan, userProfile.isAdmin, userProfile.role) : 'free') as SubscriptionPlan;

  const handleSubscriptionClick = useCallback((e: React.MouseEvent) => {
    // If user is PRO, show modal instead of navigating
    if (currentPlan === 'pro' && !userProfile?.isAdmin) {
      e.preventDefault();
      e.stopPropagation();
      setShowProModal(true);
      return false;
    }
    // For non-PRO users, allow normal navigation
    return true;
  }, [currentPlan, userProfile?.isAdmin]);

  // Custom icon component for Meus Dados
  const MeusDadosIcon = ({ className }: { className?: string }) => (
    <img src="/incon1.svg" alt="Meus Dados" className={className} />
  );

  // Custom icon component for Dashboard
  const DashboardIcon = ({ className }: { className?: string }) => (
    <img src="/icon5.svg" alt="Dashboard" className={className} />
  );

  // Custom icon component for Plano e Assinatura
  const SubscriptionIcon = ({ className }: { className?: string }) => (
    <img src="/icon4.svg" alt="Plano e Assinatura" className={className} />
  );

  // Custom icon component for Preferências
  const PreferencesIcon = ({ className }: { className?: string }) => (
    <img src="/icon3.svg" alt="Preferências" className={className} />
  );

  // Custom icon component for FAQ
  const FAQIcon = ({ className }: { className?: string }) => (
    <img src="/inconfaq.svg" alt="FAQ" className={className} />
  );

  // Navigation items
  const navigationItems = useMemo(() => [
    {
      name: 'Dashboard',
      href: '/buscador',
      icon: DashboardIcon,
      active: location === '/buscador'
    },
    // Dynamic watchlist navigation item
    ...(watchlistCount > 0 ? [{
      name: 'Minha Lista',
      href: '/dashboard',
      icon: ListChecks,
      active: false,
      badge: watchlistCount,
      onClick: () => {
        // Trigger the watchlist drawer to open
        window.dispatchEvent(new CustomEvent('openWatchlist'));
      }
    }] 
    : []),

    {
      name: 'Meus Dados',
      href: '/perfil',
      icon: MeusDadosIcon,
      active: location === '/perfil' || location === '/meu-perfil'
    },
    {
      name: 'Plano & Assinatura',
      href: '/minha-assinatura',
      icon: SubscriptionIcon,
      active: location === '/minha-assinatura' || location === '/my-subscription',
      badge: currentPlan === 'pro' ? 'PRO' : undefined,
      badgeColor: currentPlan === 'pro' ? 'bg-blue-500 text-white' : undefined
    },
    {
      name: 'Preferências',
      href: '/preferences',
      icon: PreferencesIcon,
      active: location === '/preferences'
    },
    {
      name: 'FAQ',
      href: '/faq',
      icon: FAQIcon,
      active: location === '/faq' || location === '/perguntas-frequentes',
      badge: 'New',
      badgeColor: 'bg-green-500 text-white text-[8px] px-1 py-0.5 font-normal'
    }
  ], [watchlistCount, location, currentPlan]);

// Calculate admin status
  const effectiveProfile = userProfile || user;
  const isAdminUser = effectiveProfile?.isAdmin || 
                      effectiveProfile?.role === 'admin' || 
                      effectiveProfile?.role === 'superadmin' || 
                      false;

  // Admin access control: Only users with admin/superadmin roles can see admin menu
  const adminItems = useMemo(() => isAdminUser ? [
    {
      name: 'Painel Admin',
      href: '/admin',
      icon: Shield,
      active: location === '/admin'
    }
  ] : [], [isAdminUser, location]);

  // [INSTRUMENTATION] Track final admin items array
  console.log('[ADMIN ITEMS FINAL]', {
    adminItemsCount: adminItems.length,
    adminItems: adminItems,
    isAdminUser: isAdminUser,
    timestamp: new Date().toISOString()
  });

  const sidebarContent = useMemo(() => (
    <div className={`fixed left-0 top-0 h-screen flex flex-col bg-card border-r border-border/50 transition-all duration-300 z-40 ${
      sidebarCollapsed ? 'w-16' : 'w-full lg:w-64'
    }`}>
      {/* Header */}
      <div className="px-6 py-0 border-b border-border/50 relative z-10">
        <div className="flex items-center justify-between min-h-0">
          <div className={`flex items-center ${sidebarCollapsed ? 'justify-center w-full' : ''}`}>
            <div className={`${sidebarCollapsed ? 'h-16 w-16' : 'h-32 w-32'} rounded-lg flex items-center justify-center overflow-hidden flex-shrink-0`}>
              <img 
                src={logoBranca} 
                alt="Buscador PXT Logo" 
                className="h-full w-full object-contain dark:block hidden"
              />
              <img 
                src={logoClara} 
                alt="Buscador PXT Logo" 
                className="h-full w-full object-contain dark:hidden block"
              />
            </div>
          </div>

          {/* Mobile close button */}
          <div className="lg:hidden">
            <button
              onClick={onToggle}
              className="p-2 rounded-md hover:bg-muted/50 transition-colors duration-200"
              aria-label="Fechar menu"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Desktop collapse button */}
          {!sidebarCollapsed && (
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="p-2 rounded-md hover:bg-muted/50 transition-colors duration-200 hidden lg:block"
            >
              <ChevronLeft className="h-4 w-4 transition-transform duration-300" />
            </button>
          )}
        </div>

        {/* Collapsed state expand button */}
        {sidebarCollapsed && (
          <div className="flex justify-center mt-4">
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="p-2 rounded-md hover:bg-muted/50 transition-colors duration-200"
            >
              <ChevronRight className="h-4 w-4 transition-transform duration-300" />
            </button>
          </div>
        )}
      </div>



      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-2">
        {navigationItems.map((item) => {
          const IconComponent = item.icon;

          // Handle watchlist item with custom click handler
          if (item.onClick) {
            return (
              <div
                key={item.name}
                onClick={() => {
                  item.onClick();
                  // Close mobile sidebar after navigation
                  if (window.innerWidth < 1024) {
                    onToggle();
                  }
                }}
                className={`relative flex items-center ${sidebarCollapsed ? 'justify-center' : 'justify-between'} px-3 py-2 rounded-md text-sm font-medium transition-all duration-300 cursor-pointer min-h-[44px] ${
                  item.active 
                    ? 'bg-primary/15 text-primary shadow-sm border-l-4 border-primary ml-1' 
                    : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground hover:translate-x-1'
                }`}
                title={sidebarCollapsed ? item.name : undefined}
              >
                <div className={`flex items-center ${sidebarCollapsed ? '' : 'space-x-3'}`}>
                  <IconComponent className={`${sidebarCollapsed ? 'h-6 w-6' : 'h-5 w-5'} ${item.active ? 'text-primary' : ''}`} />
                  {!sidebarCollapsed && <span className={item.active ? 'font-semibold' : ''}>{item.name}</span>}
                </div>
                {!sidebarCollapsed && item.badge && (
                  <span className="bg-green-500 text-white text-xs px-2 py-1 rounded-full font-medium">
                    {item.badge}
                  </span>
                )}
                {item.active && (
                  <div className={`absolute ${sidebarCollapsed ? 'right-1' : 'right-2'} w-2 h-2 bg-primary rounded-full animate-pulse`} />
                )}
              </div>
            );
          }

          // Special handling for subscription item - simple navigation
          if (item.name === 'Plano & Assinatura') {
            return (
              <Link key={item.name} href={item.href}>
                <div 
                  className={`relative flex items-center ${sidebarCollapsed ? 'justify-center' : 'justify-between'} px-3 py-2 rounded-md text-sm font-medium transition-all duration-200 cursor-pointer ${
                    item.active 
                      ? 'bg-primary/15 text-primary shadow-sm border-l-4 border-primary ml-1' 
                      : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground hover:translate-x-1'
                  }`}
                  title={sidebarCollapsed ? item.name : undefined}
                >
                  <div className={`flex items-center ${sidebarCollapsed ? '' : 'space-x-3'}`}>
                    <IconComponent className={`${sidebarCollapsed ? 'h-6 w-6' : 'h-5 w-5'} ${item.active ? 'text-primary' : ''}`} />
                    {!sidebarCollapsed && <span className={item.active ? 'font-semibold' : ''}>{item.name}</span>}
                  </div>
                  {!sidebarCollapsed && (
                    <div className="flex items-center space-x-2">
                      {item.badge && (
                        <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                          item.badgeColor || 'bg-green-500 text-white'
                        }`}>
                          {item.badge}
                        </span>
                      )}
                      {item.active && (
                        <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
                      )}
                    </div>
                  )}
                </div>
              </Link>
            );
          }

          // Regular navigation items (com suporte a disabled opcional)
          if ('disabled' in item && item.disabled) {
            return (
              <div
                key={item.name}
                className={`relative flex items-center ${sidebarCollapsed ? 'justify-center' : 'justify-between'} px-2 py-1.5 rounded-md text-xs font-medium transition-all duration-200 cursor-not-allowed border-t border-border/30 mt-1 pt-2 ${
                  'text-muted-foreground/40 opacity-60'
                }`}
                title={sidebarCollapsed ? item.name : undefined}
              >
                <div className={`flex items-center ${sidebarCollapsed ? '' : 'space-x-2'}`}>
                  <IconComponent className="h-4 w-4 text-muted-foreground/40 flex-shrink-0" />
                  {!sidebarCollapsed && <span className="line-through text-xs truncate">{item.name}</span>}
                </div>
                {!sidebarCollapsed && item.badge && (
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium whitespace-nowrap flex-shrink-0 ${
                    item.badgeColor || 'bg-gray-400 text-white'
                  }`}>
                    {item.badge}
                  </span>
                )}
              </div>
            );
          }

          return (
            <Link key={item.name} href={item.href}>
              <div 
                onClick={() => {
                  // Close mobile sidebar after navigation
                  if (window.innerWidth < 1024) {
                    setTimeout(() => onToggle(), 100);
                  }
                }}
                className={`relative flex items-center ${sidebarCollapsed ? 'justify-center' : 'justify-between'} px-3 py-2 rounded-md text-sm font-medium transition-all duration-300 cursor-pointer min-h-[44px] ${
                  item.active 
                    ? 'bg-primary/15 text-primary shadow-sm border-l-4 border-primary ml-1' 
                    : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground hover:translate-x-1'
                }`}
                title={sidebarCollapsed ? item.name : undefined}
              >
                <div className={`flex items-center ${sidebarCollapsed ? '' : 'space-x-3'}`}>
                  <IconComponent className={`${sidebarCollapsed ? 'h-6 w-6' : 'h-5 w-5'} ${item.active ? 'text-primary' : ''}`} />
                  {!sidebarCollapsed && <span className={item.active ? 'font-semibold' : ''}>{item.name}</span>}
                </div>
                {!sidebarCollapsed && (
                  <div className="flex items-center space-x-2">
                    {item.badge && (
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                        item.badgeColor || 'bg-green-500 text-white'
                      }`}>
                        {item.badge}
                      </span>
                    )}
                    {item.active && (
                      <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
                    )}
                  </div>
                )}
              </div>
            </Link>
          );
        })}

        {/* Admin Section */}
        {adminItems.length > 0 && !sidebarCollapsed && (
          <>
            <div className="pt-4 border-t border-border/50 mt-4">
              <button
                onClick={() => setAdminCollapsed(!adminCollapsed)}
                className="flex items-center justify-between w-full px-3 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors duration-200"
              >
                <span>Administração</span>
                {adminCollapsed ? (
                  <ChevronRight className="h-3 w-3" />
                ) : (
                  <ChevronDown className="h-3 w-3" />
                )}
              </button>
              {!adminCollapsed && (
                <div className="mt-2 space-y-1">
                  {adminItems.map((item) => {
                    const IconComponent = item.icon;
                    return (
                      <Link key={item.name} href={item.href}>
                        <div className={`relative flex items-center space-x-3 px-3 py-2 rounded-md text-sm font-medium transition-all duration-200 cursor-pointer ${
                          item.active 
                            ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 border-l-4 border-purple-500 ml-1 shadow-sm' 
                            : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground hover:translate-x-1'
                        }`}>
                          <IconComponent className={`h-5 w-5 ${item.active ? 'text-purple-600 dark:text-purple-400' : ''}`} />
                          <span className={item.active ? 'font-semibold' : ''}>{item.name}</span>
                          {item.active && (
                            <div className="absolute right-2 w-2 h-2 bg-purple-500 rounded-full animate-pulse" />
                          )}
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        )}

        {/* Admin Section - Collapsed */}
        {adminItems.length > 0 && sidebarCollapsed && (
          <div className="pt-4 border-t border-border/50 mt-4">
            {adminItems.map((item) => {
              const IconComponent = item.icon;
              return (
                <Link key={item.name} href={item.href}>
                  <div 
                    className={`relative flex items-center justify-center px-3 py-2 rounded-md text-sm font-medium transition-all duration-200 cursor-pointer ${
                      item.active 
                        ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 border-l-4 border-purple-500 ml-1 shadow-sm' 
                        : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground hover:translate-x-1'
                    }`}
                    title={item.name}
                  >
                    <IconComponent className={`h-6 w-6 ${item.active ? 'text-purple-600 dark:text-purple-400' : ''}`} />
                    {item.active && (
                      <div className="absolute right-1 w-2 h-2 bg-purple-500 rounded-full animate-pulse" />
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        )}

        {/* Preferences Section */}
        {!sidebarCollapsed && (
          <div className="pt-4 border-t border-border/50 mt-4">
            <button
              onClick={() => setPreferencesCollapsed(!preferencesCollapsed)}
              className="flex items-center justify-between w-full px-3 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors duration-200"
            >
              <span>Preferências</span>
              {preferencesCollapsed ? (
                <ChevronRight className="h-3 w-3" />
              ) : (
                <ChevronDown className="h-3 w-3" />
              )}
            </button>

            {!preferencesCollapsed && (
              <div className="mt-2 space-y-1">
                {/* Theme Toggle */}
                <button
                  onClick={toggleTheme}
                  className="flex items-center space-x-3 px-3 py-2 rounded-md text-sm font-medium text-muted-foreground hover:bg-muted/50 hover:text-foreground hover:translate-x-1 transition-all duration-200 w-full"
                >
                  {theme === 'light' ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
                  <span>{theme === 'light' ? 'Modo Escuro' : 'Modo Claro'}</span>
                </button>
                
                {/* WhatsApp Button */}
                <button
                  onClick={() => {
                    const message = encodeURIComponent('Olá! Vim através do Buscador PXT e gostaria de mais informações.');
                    const whatsappUrl = `https://wa.me/5511963232465?text=${message}`;
                    window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
                  }}
                  className="flex items-center space-x-3 px-3 py-2 rounded-md text-sm font-medium text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 hover:text-green-700 transition-all duration-200 w-full"
                >
                  <MessageSquare className="h-5 w-5" />
                  <span>Fale Conosco</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* Preferences Section - Collapsed */}
        {sidebarCollapsed && (
          <div className="pt-4 border-t border-border/50 mt-4 space-y-2">
            <button
              onClick={toggleTheme}
              className="flex items-center justify-center px-3 py-2 rounded-md text-sm font-medium text-muted-foreground hover:bg-muted/50 hover:text-foreground hover:translate-x-1 transition-all duration-300 w-full"
              title={theme === 'light' ? 'Modo Escuro' : 'Modo Claro'}
            >
              {theme === 'light' ? <Moon className="h-6 w-6 transition-all duration-300" /> : <Sun className="h-6 w-6 transition-all duration-300" />}
            </button>
            
            <button
              onClick={() => {
                const message = encodeURIComponent('Olá! Vim através do Buscador PXT e gostaria de mais informações.');
                const whatsappUrl = `https://wa.me/5511963232465?text=${message}`;
                window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
              }}
              className="flex items-center justify-center px-3 py-2 rounded-md text-sm font-medium text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 hover:text-green-700 transition-all duration-300 w-full"
              title="Fale conosco no WhatsApp"
            >
              <MessageSquare className="h-6 w-6 transition-all duration-300" />
            </button>
          </div>
        )}

      </nav>

      {/* Footer - User Profile and Logout */}
      <div className="p-4 border-t border-border/50 space-y-4">
        {/* User Profile Section */}
        {sidebarCollapsed ? (
          <div className="flex flex-col items-center space-y-1">
            {/* Custom icon above profile - larger and better positioned */}
            <div className="h-8 w-8 flex items-center justify-center -mb-1 relative z-10">
              <img
                src="/incon1.svg"
                alt="User Icon"
                className="h-full w-full object-contain drop-shadow-sm"
              />
            </div>
            <div className="relative">
              <div className="h-10 w-10 rounded-full overflow-hidden bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center border border-border/50">
                {profileImage ? (
                  <img
                    src={profileImage}
                    alt="Foto do perfil"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <User className="h-5 w-5 text-muted-foreground" />
                )}
              </div>
              <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-card"></div>
            </div>
          </div>
        ) : (
          <div className="flex items-start gap-3">
            {/* Avatar with custom icon and online indicator */}
            <div className="relative flex-shrink-0 flex flex-col items-center space-y-0">
              {/* Custom icon above profile - larger and better positioned */}
              <div className="h-7 w-7 flex items-center justify-center -mb-1 relative z-10">
                <img
                  src="/incon1.svg"
                  alt="User Icon"
                  className="h-full w-full object-contain drop-shadow-sm"
                />
              </div>
              <div className="relative">
                <div className="h-10 w-10 rounded-full overflow-hidden bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center border border-border/50">
                  {profileImage ? (
                    <img
                      src={profileImage}
                      alt="Foto do perfil"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <User className="h-5 w-5 text-muted-foreground" />
                  )}
                </div>
                {/* Online Status - Simplified */}
                <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-card"></div>
              </div>
            </div>

            {/* User Info - Vertical Hierarchy */}
            <div className="flex-1 min-w-0 space-y-1.5">
              {/* Primary: Name */}
              <div className="space-y-0.5">
                <h4 className="text-sm font-medium text-foreground truncate leading-none">
                  {user?.name || user?.email}
                </h4>
                {/* Secondary: Email (only if different from name) */}
                {user?.email && user?.name && (
                  <p className="text-xs text-muted-foreground truncate leading-none">
                    {user.email}
                  </p>
                )}
              </div>

              {/* Tertiary: Role Badge */}
              {userProfile?.subscriptionPlan && (
                <div className="flex items-center gap-2">
                  {userProfile.role === 'superadmin' ? (
                    <span className="inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 border border-amber-200/50 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-700/30">
                      <Crown className="w-3 h-3 mr-1" />
                      Super Admin
                    </span>
                  ) : userProfile.isAdmin ? (
                    <span className="inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200/50 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-700/30">
                      <Shield className="w-3 h-3 mr-1" />
                      Admin
                    </span>
                  ) : userProfile.subscriptionPlan === 'pro' ? (
                    <span className="inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 border border-purple-200/50 dark:bg-purple-900/20 dark:text-purple-400 dark:border-purple-700/30">
                      <Sparkles className="w-3 h-3 mr-1" />
                      PRO
                    </span>
                  ) : null}

                  {/* Online Status - Minimal */}
                  <div className="flex items-center gap-1">
                    <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
                    <span className="text-xs text-green-600 dark:text-green-400 font-medium">Online</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Logout Button */}
        <button
          onClick={handleLogout}
          className={`flex items-center ${sidebarCollapsed ? 'justify-center' : 'space-x-3'} px-3 py-2 rounded-md text-sm font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors duration-200 w-full`}
          title={sidebarCollapsed ? 'Sair' : undefined}
        >
          <LogOut className="h-5 w-5" />
          {!sidebarCollapsed && <span>Sair</span>}
        </button>

        {/* Subscription Info - Only show when expanded */}
        {!sidebarCollapsed && userProfile && (userProfile as any).subscriptionEndDate && (
          <div className="px-3 text-xs text-muted-foreground">
            <p>Plano válido até: {new Date((userProfile as any).subscriptionEndDate).toLocaleDateString('pt-BR')}</p>
          </div>
        )}
      </div>
    </div>
  ), [sidebarCollapsed, profileImage, user, userProfile, handleLogout, toggleTheme, adminItems, navigationItems]);

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden"
          onClick={onToggle}
          style={{ touchAction: 'none' }}
        />
      )}

      {/* Desktop Sidebar - Fixed */}
      <aside className={`fixed left-0 top-0 bottom-0 hidden lg:flex lg:flex-shrink-0 transition-all duration-300 z-1 ${
        sidebarCollapsed ? 'lg:w-16' : 'lg:w-64'
      }`}>
        {sidebarContent}
      </aside>

      {/* Mobile Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-80 max-w-[85vw] lg:hidden transition-transform duration-300 ease-in-out ${
        isOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        <div className="h-full overflow-y-auto bg-card" style={{ 
          height: '100dvh',
          overscrollBehavior: 'contain',
          WebkitOverflowScrolling: 'touch'
        }}>
          {sidebarContent}
        </div>
      </aside>

      {/* PRO User Modal */}
      {showProModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-40" onClick={() => setShowProModal(false)}>
          <Card className="max-w-md mx-auto border-blue-200 bg-white dark:bg-gray-800 dark:border-blue-800 shadow-xl relative" onClick={(e) => e.stopPropagation()}>
            <Button
              variant="ghost"
              size="sm"
              className="absolute top-2 right-2 h-8 w-8 p-0"
              onClick={() => setShowProModal(false)}
            >
              <X className="h-5 w-5" />
            </Button>
            <CardHeader className="text-center">
              <div className="flex justify-center mb-4">
                <div className="p-3 bg-blue-500 rounded-full">
                  <Star className="h-8 w-8 text-white" />
                </div>
              </div>
              <CardTitle className="text-2xl text-blue-800 dark:text-blue-200">Usuário PRO</CardTitle>
              <CardDescription className="text-gray-600 dark:text-gray-400">
                Você possui acesso PRO ao sistema
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <Badge variant="outline" className="text-lg px-4 py-2 bg-blue-100 border-blue-500 text-blue-700 font-semibold mb-4">
                <Star className="h-4 w-4 mr-2" />
                PRO
              </Badge>
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Você possui acesso PRO ativo. Seu plano não requer assinatura e é gerenciado diretamente pelos administradores do sistema.
                </p>
              </div>
              <div className="pt-4">
                <Button 
                  onClick={() => setShowProModal(false)}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                >
                  Entendido
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </>
  );
}

// Mobile Header with Hamburger Menu
export function MobileHeader({ onToggleSidebar }: { onToggleSidebar: () => void }) {
  const { user } = useAuth();
  const [profileImage, setProfileImage] = useState<string | null>(null);

  useEffect(() => {
    const savedImage = localStorage.getItem('profileImage');
    if (savedImage) {
      setProfileImage(savedImage);
    }
  }, []);

  return (
    <header className="lg:hidden bg-card border-b border-border/50 px-4 py-3 sticky top-0 z-1 flex items-center justify-between backdrop-blur-sm bg-card/95">
      <div className="flex items-center space-x-3 flex-1 min-w-0">
        <Button
          variant="ghost"
          size="sm"
          onClick={onToggleSidebar}
          className="p-2 flex-shrink-0 hover:bg-muted"
          aria-label="Abrir menu"
        >
          <Menu className="h-5 w-5" />
        </Button>
        <div className="flex items-center min-w-0">
          <div className="h-12 w-12 rounded flex items-center justify-center overflow-hidden flex-shrink-0">
            <img 
              src={logoBranca} 
              alt="Buscador PXT Logo" 
              className="h-full w-full object-contain dark:block hidden"
            />
            <img 
              src={logoClara} 
              alt="Buscador PXT Logo" 
              className="h-full w-full object-contain dark:hidden block"
            />
          </div>
        </div>
      </div>

      <div className="flex items-center space-x-3">
        <NotificationBell />
        <div className="relative">
          <div className="h-8 w-8 rounded-full overflow-hidden bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center border border-border/50">
            {profileImage ? (
              <img
                src={profileImage}
                alt="Foto do perfil"
                className="w-full h-full object-cover"
              />
            ) : (
              <User className="h-5 w-5 text-muted-foreground" />
            )}
          </div>
        </div>
      </div>
    </header>
  );
}