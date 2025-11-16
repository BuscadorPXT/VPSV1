import React, { useEffect, useCallback, useState, Component, ErrorInfo, lazy } from "react";
import { Switch, Route, useLocation, Redirect, Router } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import { useAuth } from "@/hooks/use-auth";
// WebSocket notifications - temporarily disabled for stability
// import { useWebSocketNotifications } from "@/hooks/use-websocket-notifications";
import LandingPage from "@/pages/landing";
import MaintenancePage from "@/pages/maintenance";
import Login from "@/pages/login";
import { MAINTENANCE_CONFIG } from "@/config/maintenance";
import Subscribe from "@/pages/subscribe";
import PaymentSuccess from "@/pages/payment-success";
import TesteGratis from "@/pages/teste-gratis";
import TrialSuccess from "@/pages/trial-success";
import CompleteSignup from "@/pages/complete-signup";

// ⚡ PERFORMANCE: Lazy loading para reduzir bundle inicial e tempo de login
const Dashboard = lazy(() => import("@/pages/dashboard"));
const AdminDashboard = lazy(() => import("@/pages/admin"));
const AdminRatingsDashboard = lazy(() => import("@/pages/AdminDashboard"));
const AdminFeedbackAlertsPage = lazy(() => import("@/pages/admin-feedback-alerts"));
const AdminUserDiagnosticPage = lazy(() => import("@/pages/AdminUserDiagnostic"));
const AdminCobrancasPage = lazy(() => import("@/pages/admin-cobrancas"));
const RankingPage = lazy(() => import("@/pages/RankingPage"));
const RealtimeMonitoringPage = lazy(() => import("@/pages/realtime-monitoring"));
const AdminEncontroPage = lazy(() => import("@/pages/admin-encontro"));

import FavoritesPage from "@/pages/favorites";
import InterestList from "@/pages/InterestList";
import InterestListEnhanced from "@/pages/InterestListEnhanced";
import NotificationsPage from './pages/notifications';
import NotificationsCenterPage from './pages/notifications-center';
import SecurityPage from "@/pages/security";
import Profile from "@/pages/profile";
import PreferencesPage from "@/pages/preferences";
import { AISearchPage } from "@/pages/AISearchPage";
import ApiKeysPage from "@/pages/api-keys";
import TermsOfUsePage from "@/pages/terms-of-use";
import FAQPage from "@/pages/faq";
import MySubscriptionPage from "@/pages/my-subscription";
import PriceMonitoringPage from "@/pages/price-monitoring";
import PendingApproval from "@/pages/pending-approval";
import NotFound from "@/pages/not-found";
import PendingPaymentPage from "@/pages/pending-payment";
import AuthRecovery from "@/pages/auth-recovery";
import EncontroPage from "@/pages/encontro";
import { EmergencyAlertDialog } from './components/EmergencyAlertDialog';
import FeedbackAlertModal from './components/FeedbackAlertModal';
// ⚡ OTIMIZAÇÃO #13: Importar ProtectedRoute externo (remover duplicação)
import ProtectedRoute from '@/components/ProtectedRoute';
import { useFeedbackAlerts } from './hooks/use-feedback-alerts';
import { useTermsAcceptance } from './hooks/use-terms-acceptance';
import TermsAcceptanceModal from './components/TermsAcceptanceModal';
import ErrorBoundary from './components/ErrorBoundary';
// ⚡ OTIMIZAÇÃO #15: Importar getAuthHeaders para prefetch
import { getAuthHeaders } from './lib/auth-api';
import { AdBlockerCompatibilityLayer } from './components/AdBlockerCompatibilityLayer';
import { Spinner } from './components/ui/spinner'; // Import Spinner
import { RealtimeNotificationsProvider } from './components/RealtimeNotificationsProvider';
// ⚡ OTIMIZAÇÃO #14: Skeleton loading para melhor UX
import { DashboardSkeleton } from './components/DashboardSkeleton';
import { ChristmasDecorations } from './components/ChristmasDecorations';
import { FloatingWhatsAppButton } from './components/FloatingWhatsAppButton';
// Removed react-router-dom imports to avoid conflicts with wouter

// ✅ CORREÇÃO: FullPageLoader para aguardar autenticação
function FullPageLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
        <div className="text-muted-foreground">
          Verificando autenticação...
        </div>
      </div>
    </div>
  );
}

// Define RainbowLoadingWave component (assuming it's in components/ui/rainbow-loading-wave.tsx)
// You'll need to create this component if it doesn't exist.
// Example structure:
const RainbowLoadingWave = ({ text, size }: { text: string; size: 'sm' | 'md' | 'lg' }) => {
  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return 'h-6 w-6 border-b-2';
      case 'md':
        return 'h-8 w-8 border-b-3';
      case 'lg':
        return 'h-12 w-12 border-b-4';
      default:
        return 'h-8 w-8 border-b-3';
    }
  };

  return (
    <div className="text-center">
      <div className={`animate-rainbow-wave rounded-full ${getSizeClasses()} border-t-2 border-l-2 border-r-2 border-purple-500 mx-auto mb-4`}></div>
      <p className="text-muted-foreground">{text}</p>
    </div>
  );
};

// ⚡ OTIMIZAÇÃO #13: ProtectedRoute duplicado REMOVIDO
// Agora usando o componente externo de @/components/ProtectedRoute
// Isso elimina 1 loading screen duplicado e economiza 200-500ms

// ⚡ OTIMIZAÇÃO #13: AdminProtectedRoute usando ProtectedRoute externo
// Evita duplicação de auth checks
function AdminProtectedRoute({ children }: { children: React.ReactNode }) {
  // ProtectedRoute externo já faz auth check, aqui só verifica admin
  return (
    <ProtectedRoute requireAdmin={true}>
      {children}
    </ProtectedRoute>
  );
}

// ⚡ OTIMIZAÇÃO #13: PublicRoute simplificado
// Rotas públicas não precisam de loading check
function PublicRoute({ children }: { children: React.ReactNode }) {
  // Rotas públicas renderizam direto, sem verificação de auth
  return <>{children}</>;
}

function AppRoutes() {
  return (
    <Switch>
      {/* Public Routes */}
      <Route path="/">
        <PublicRoute>
          {MAINTENANCE_CONFIG.MAINTENANCE_MODE ? <MaintenancePage /> : <LandingPage />}
        </PublicRoute>
      </Route>

      <Route path="/login">
        <PublicRoute>
          <Login />
        </PublicRoute>
      </Route>

      <Route path="/ranking">
        <PublicRoute>
          <RankingPage />
        </PublicRoute>
      </Route>

      <Route path="/melhores-lojas">
        <PublicRoute>
          <RankingPage />
        </PublicRoute>
      </Route>

      <Route path="/subscribe">
        <PublicRoute>
          <Subscribe />
        </PublicRoute>
      </Route>

      <Route path="/pagamento-sucesso">
        <PaymentSuccess />
      </Route>

      <Route path="/teste-gratis">
        <TesteGratis />
      </Route>

      <Route path="/trial-success">
        <TrialSuccess />
      </Route>

      <Route path="/complete-signup">
        <CompleteSignup />
      </Route>

      <Route path="/pending-approval">
        <PendingApproval />
      </Route>

      <Route path="/pending-payment">
        <PublicRoute>
          <PendingPaymentPage />
        </PublicRoute>
      </Route>

      {/* Protected Routes */}
      <Route path="/buscador">
        <ProtectedRoute>
          <ErrorBoundary>
            <Dashboard />
          </ErrorBoundary>
        </ProtectedRoute>
      </Route>

      <Route path="/dashboard">
        <ProtectedRoute>
          <ErrorBoundary>
            <Dashboard />
          </ErrorBoundary>
        </ProtectedRoute>
      </Route>

      <Route path="/busca-ia">
        <ProtectedRoute>
          <AISearchPage />
        </ProtectedRoute>
      </Route>

      <Route path="/favoritos">
        <ProtectedRoute>
          <FavoritesPage />
        </ProtectedRoute>
      </Route>

      <Route path="/lista-de-interesses">
        <ProtectedRoute>
          <InterestList />
        </ProtectedRoute>
      </Route>

      <Route path="/interest-list">
        <ProtectedRoute>
          <InterestList />
        </ProtectedRoute>
      </Route>

      <Route path="/planejamento-vendas">
        <ProtectedRoute>
          <InterestListEnhanced />
        </ProtectedRoute>
      </Route>

      <Route path="/notifications">
        <ProtectedRoute>
          <NotificationsPage />
        </ProtectedRoute>
      </Route>

      <Route path="/notifications-center">
        <ProtectedRoute>
          <NotificationsCenterPage />
        </ProtectedRoute>
      </Route>

      <Route path="/price-monitoring">
        <ProtectedRoute>
          <PriceMonitoringPage />
        </ProtectedRoute>
      </Route>

      <Route path="/security">
        <ProtectedRoute>
          <SecurityPage />
        </ProtectedRoute>
      </Route>

      <Route path="/perfil">
        <ProtectedRoute>
          <Profile />
        </ProtectedRoute>
      </Route>

      <Route path="/meu-perfil">
        <ProtectedRoute>
          <Profile />
        </ProtectedRoute>
      </Route>

      <Route path="/preferencias">
        <ProtectedRoute>
          <PreferencesPage />
        </ProtectedRoute>
      </Route>

      <Route path="/preferences">
        <ProtectedRoute>
          <PreferencesPage />
        </ProtectedRoute>
      </Route>

      <Route path="/admin">
        <AdminProtectedRoute>
          <AdminDashboard />
        </AdminProtectedRoute>
      </Route>

      <Route path="/admin/encontro">
        <AdminProtectedRoute>
          <AdminEncontroPage />
        </AdminProtectedRoute>
      </Route>

      <Route path="/admin/ratings">
        <AdminProtectedRoute>
          <AdminRatingsDashboard />
        </AdminProtectedRoute>
      </Route>

      <Route path="/admin/feedback-alerts">
        <AdminProtectedRoute>
          <AdminFeedbackAlertsPage />
        </AdminProtectedRoute>
      </Route>

      <Route path="/admin/user-diagnostic">
        <AdminProtectedRoute>
          <AdminUserDiagnosticPage />
        </AdminProtectedRoute>
      </Route>

      <Route path="/admin/cobrancas">
        <AdminProtectedRoute>
          <AdminCobrancasPage />
        </AdminProtectedRoute>
      </Route>

      <Route path="/api-keys">
        <ProtectedRoute>
          <ApiKeysPage />
        </ProtectedRoute>
      </Route>

      <Route path="/minha-assinatura">
        <ProtectedRoute>
          <MySubscriptionPage />
        </ProtectedRoute>
      </Route>

      <Route path="/my-subscription">
        <ProtectedRoute>
          <MySubscriptionPage />
        </ProtectedRoute>
      </Route>

       {/* Public route for Terms of Use page */}
       <Route path="/terms-of-use">
        <PublicRoute>
          <TermsOfUsePage />
        </PublicRoute>
      </Route>

      {/* Public route for FAQ page */}
      <Route path="/faq">
        <PublicRoute>
          <FAQPage />
        </PublicRoute>
      </Route>

      <Route path="/perguntas-frequentes">
        <PublicRoute>
          <FAQPage />
        </PublicRoute>
      </Route>

      {/* Public route for Encontro event page */}
      <Route path="/encontro">
        <PublicRoute>
          <EncontroPage />
        </PublicRoute>
      </Route>

      {/* 404 Page */}
      <Route component={NotFound} />
    </Switch>
  );
}

// Define a simple ErrorBoundary component
interface FeedbackErrorBoundaryProps {
  children: React.ReactNode;
}

interface FeedbackErrorBoundaryState {
  hasError: boolean;
}

class FeedbackErrorBoundary extends Component<FeedbackErrorBoundaryProps, FeedbackErrorBoundaryState> {
  constructor(props: FeedbackErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): FeedbackErrorBoundaryState {
    // Update state so the next render will show the fallback UI.
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // You can also log the error to an error reporting service
    console.error("FeedbackErrorBoundary caught an error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      // You can render any custom fallback UI
      return (
        <div className="text-red-500">
          Ocorreu um erro ao exibir o feedback. Por favor, tente novamente mais tarde.
        </div>
      );
    }

    return this.props.children;
  }
}

function FeedbackSystem() {
  const { currentAlert, submitResponse, closeCurrentAlert } = useFeedbackAlerts();

  return (
    <FeedbackAlertModal
      alert={currentAlert}
      isOpen={!!currentAlert}
      onClose={closeCurrentAlert}
      onSubmit={submitResponse}
    />
  );
}

function App() {
  // ✅ CORREÇÃO: Mover TODOS os hooks para o topo antes de qualquer return condicional
  const { user, loading, error, isAuthReady, authInitialized } = useAuth();
  const { currentAlert, submitResponse, closeCurrentAlert } = useFeedbackAlerts();
  const { 
    hasAcceptedTerms, 
    showTermsModal, 
    acceptTerms, 
    declineTerms 
  } = useTermsAcceptance();
  const location = useLocation()[0]; // Get the current path
  const currentPath = useLocation()[0];

  // ✅ OTIMIZAÇÃO: Remover estado duplicado - usar dados direto do useAuth
  // const [profile, setProfile] = useState(null); // REMOVIDO - causa loop

  // 🧹 CLEANUP: Desregistrar service workers para evitar problemas de cache
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        registrations.forEach((registration) => {
          registration.unregister();
          console.log('🧹 Service Worker unregistered');
        });
      });
    }
  }, []);

  // ✅ CORREÇÃO: Mover useEffect para o topo antes de qualquer return condicional
  useEffect(() => {
    // Allow right-click context menu
    const handleContextMenu = (e: MouseEvent) => {
      // Allow default context menu behavior
      return true;
    };

    // No need to prevent context menu anymore
    return () => {
      // Cleanup if needed
    };
  }, []);

  // ✅ OTIMIZAÇÃO: useEffect duplicado REMOVIDO - usar dados direto do useAuth
  // Isso eliminava o loop infinito de chamadas ao /api/user/profile

  // Check for pending payment status and redirect
  // ✅ OTIMIZAÇÃO: Simplificado para usar dados direto do user (sem estado intermediário)
  useEffect(() => {
    if (user) {
      // Check if user has pending payment status
      const hasPendingPayment = 
        user.subscriptionPlan === 'pro_pending' ||
        user.status === 'pending_payment' ||
        user.role === 'pending_payment';

      console.log('🔍 Checking payment status for user:', user.email, {
        subscriptionPlan: user.subscriptionPlan,
        status: user.status,
        role: user.role,
        hasPendingPayment
      });

      if (hasPendingPayment && currentPath !== '/pending-payment') {
        console.log('🔄 Redirecting to pending payment page for user:', user.email);
        window.location.href = '/pending-payment'; // Use window.location.href for full page redirect
        return;
      }
    }
  }, [user, currentPath]);

  // ✅ Listener para eventos de recuperação de sessão
  useEffect(() => {
    const handleSessionRecovery = () => {
      console.log('🔄 Evento de recuperação de sessão recebido');
      // Recarregar a página para reinicializar completamente o Firebase
      window.location.reload();
    };

    window.addEventListener('session-recovery-needed', handleSessionRecovery);

    return () => {
      window.removeEventListener('session-recovery-needed', handleSessionRecovery);
    };
  }, []);

  // ⚡ OTIMIZAÇÃO #15: Prefetch de dados críticos após autenticação
  // Carrega dados em paralelo durante auth para Dashboard já ter dados prontos
  useEffect(() => {
    if (user && isAuthReady && !loading) {
      console.log('🚀 Prefetching critical data for faster Dashboard load...');

      // Prefetch em paralelo de dados críticos
      Promise.all([
        // User profile
        queryClient.prefetchQuery({
          queryKey: ['/api/user/profile'],
          queryFn: async () => {
            const headers = await getAuthHeaders();
            const res = await fetch('/api/user/profile', { headers });
            if (!res.ok) throw new Error('Failed to prefetch profile');
            return res.json();
          },
          staleTime: 5 * 60 * 1000, // 5 minutes
        }),
        // Available dates
        queryClient.prefetchQuery({
          queryKey: ['/api/products/dates'],
          queryFn: async () => {
            const headers = await getAuthHeaders();
            const res = await fetch('/api/products/dates', { headers });
            if (!res.ok) throw new Error('Failed to prefetch dates');
            return res.json();
          },
          staleTime: 24 * 60 * 60 * 1000, // 24 hours
        }),
        // Tester status
        queryClient.prefetchQuery({
          queryKey: ['/api/tester/status'],
          queryFn: async () => {
            const headers = await getAuthHeaders();
            const res = await fetch('/api/tester/status', { headers });
            if (!res.ok) throw new Error('Failed to prefetch tester status');
            return res.json();
          },
          staleTime: 60 * 60 * 1000, // 1 hour
        }),
        // ⚡ OTIMIZAÇÃO #21: Prefetch primeiros 50 produtos para render rápido
        // Carrega apenas os primeiros 50 para mostrar algo imediatamente
        // O componente vai carregar o resto depois
        queryClient.prefetchQuery({
          queryKey: ['/api/products/preview'],
          queryFn: async () => {
            const headers = await getAuthHeaders();
            const params = new URLSearchParams({
              limit: '50',
              page: '1',
            });
            const res = await fetch(`/api/products?${params}`, { headers });
            if (!res.ok) throw new Error('Failed to prefetch products preview');
            return res.json();
          },
          staleTime: 2 * 60 * 1000, // 2 minutes (shorter since it's a preview)
        }),
      ])
        .then(() => {
          console.log('✅ Critical data prefetched successfully');
        })
        .catch((error) => {
          console.log('⚠️ Prefetch failed (non-critical):', error.message);
          // Não bloqueia - se falhar, queries normais vão carregar
        });
    }
  }, [user, isAuthReady, loading, queryClient]);

  // Maintenance mode check
  const isMaintenanceMode = MAINTENANCE_CONFIG.MAINTENANCE_MODE;

  // Early return for maintenance mode
  if (isMaintenanceMode) {
    return (
      <ThemeProvider defaultTheme="light" storageKey="pxt-ui-theme">
        <ChristmasDecorations />
        <MaintenancePage />
        <Toaster />
      </ThemeProvider>
    );
  }

  // Early return for loading states
  // ⚡ OTIMIZAÇÃO #30: DashboardSkeleton unificado para auth e lazy loading
  // Elimina loading duplicado (RainbowLoadingWave + DashboardSkeleton)
  // Mostra estrutura da página imediatamente, melhor UX
  if (loading || !authInitialized || !isAuthReady) {
    return <DashboardSkeleton />;
  }

  console.log('🎯 App component mounted');
  console.log('📍 Current location:', window.location.href);

  // 🎯 SINGLE RETURN with global Suspense boundary
  return (
    <AdBlockerCompatibilityLayer>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider defaultTheme="light" storageKey="pxt-ui-theme">
          <TooltipProvider>
            {/* ⚡ OTIMIZAÇÃO #14: DashboardSkeleton para loading progressivo */}
            <React.Suspense fallback={<DashboardSkeleton />}>
              {!user ? (
                // Not authenticated - public routes
                ['/', '/landing', '/login', '/terms-of-use', '/faq', '/ranking', '/melhores-lojas', '/subscribe', '/encontro'].includes(location) ? (
                  <>
                    <ChristmasDecorations />
                    <Toaster />
                    <Switch>
                      <Route path="/">
                        <LandingPage />
                      </Route>
                      <Route path="/landing">
                        <LandingPage />
                      </Route>
                      <Route path="/login">
                        <Login />
                      </Route>
                      <Route path="/terms-of-use">
                        <TermsOfUsePage />
                      </Route>
                      <Route path="/faq">
                        <FAQPage />
                      </Route>
                      <Route path="/ranking">
                        <RankingPage />
                      </Route>
                      <Route path="/melhores-lojas">
                        <RankingPage />
                      </Route>
                      <Route path="/realtime-monitoring">
                        <RealtimeMonitoringPage />
                      </Route>
                      <Route path="/subscribe">
                        <Subscribe />
                      </Route>
                      <Route path="/encontro">
                        <EncontroPage />
                      </Route>
                      <Route path="/maintenance">
                        <MaintenancePage />
                      </Route>
                      <Route>
                        <Redirect to="/" />
                      </Route>
                    </Switch>
                  </>
                ) : (
                  // Not authenticated - redirect to login
                  <>
                    <ChristmasDecorations />
                    <Toaster />
                    <Redirect to="/login" />
                  </>
                )
              ) : (
                // Authenticated - full app
                <RealtimeNotificationsProvider>
                  <ChristmasDecorations />
                  <Toaster />
                  <AppRoutes />
                  <EmergencyAlertDialog />
                  <FeedbackErrorBoundary>
                    <FeedbackAlertModal
                      alert={currentAlert}
                      isOpen={!!currentAlert}
                      onClose={closeCurrentAlert}
                      onSubmit={submitResponse}
                    />
                  </FeedbackErrorBoundary>
                  <TermsAcceptanceModal 
                    isOpen={showTermsModal}
                    onAccept={acceptTerms}
                    onDecline={declineTerms}
                  />
                </RealtimeNotificationsProvider>
              )}
            </React.Suspense>
          </TooltipProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </AdBlockerCompatibilityLayer>
  );
}

export default App;