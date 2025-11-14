import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/use-auth';
import { LoadingFallback } from '@/components/ui/loading-fallback';

interface ProtectedRouteProps {
  children: ReactNode;
  requireAdmin?: boolean;
  requireApproval?: boolean;
}

function ProtectedRoute({ 
  children, 
  requireAdmin = false, 
  requireApproval = true 
}: ProtectedRouteProps) {
  const { user, loading, isAuthReady, authInitialized } = useAuth();

  // ✅ CORREÇÃO: Aguardar inicialização completa
  if (!authInitialized || !isAuthReady) {
    return <LoadingFallback />;
  }

  // Se ainda está carregando após inicialização
  if (loading) {
    return <LoadingFallback />;
  }

  // Sem usuário - redirecionar para login
  if (!user) {
    return <Navigate to="/" replace />;
  }

  // Verificar aprovação se necessário - Trust backend response
  if (requireApproval && user.isApproved !== true) {
    console.log('🔒 ProtectedRoute: User not approved by backend, redirecting to pending-approval:', {
      email: user.email,
      isApproved: user.isApproved,
      needsApproval: user.needsApproval
    });
    return <Navigate to="/pending-approval" replace />;
  }

  // Verificar permissão de admin se necessário
  if (requireAdmin && user.role !== 'admin' && user.role !== 'superadmin') {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}

export default ProtectedRoute;