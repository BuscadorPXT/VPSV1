import { ReactNode } from 'react';
import { Link } from 'wouter';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Lock, Crown } from 'lucide-react';
import { SubscriptionPlan, getUserPlanFeatures, canUserAccessFeature, isAdminUser } from '@shared/subscription';

interface SubscriptionGuardProps {
  userPlan: SubscriptionPlan;
  requiredFeature: 'canViewSuppliers' | 'canFilterBySuppliers' | 'canExportData' | 'canCreateAlerts' | 'hasAdminAccess';
  children: ReactNode;
  fallbackContent?: ReactNode;
  showUpgradePrompt?: boolean;
  isAdmin?: boolean;
  role?: string;
}

export function SubscriptionGuard({ 
  userPlan, 
  requiredFeature, 
  children, 
  fallbackContent,
  showUpgradePrompt = true,
  isAdmin,
  role
}: SubscriptionGuardProps) {
  const hasAccess = canUserAccessFeature(userPlan, requiredFeature, isAdmin, role);
  
  if (hasAccess) {
    return <>{children}</>;
  }

  if (fallbackContent) {
    return <>{fallbackContent}</>;
  }

  if (!showUpgradePrompt) {
    return null;
  }

  // Only show upgrade prompt for free users who are NOT admins
  if (isAdminUser(userPlan, isAdmin, role)) {
    return null;
  }

  return (
    <Card className="border-2 border-dashed border-gray-300 bg-gray-50 dark:bg-gray-900">
      <CardHeader className="text-center">
        <div className="flex justify-center mb-2">
          <Lock className="h-8 w-8 text-gray-400" />
        </div>
        <CardTitle className="text-lg">🔒 Exclusivo para assinantes</CardTitle>
        <CardDescription>
          Este recurso está disponível apenas para usuários dos planos Pro ou Business
        </CardDescription>
      </CardHeader>
      <CardContent className="text-center">
        <Button 
          className="gap-2"
          onClick={() => {
            console.log('DEBUG Assine agora clicked in: SubscriptionGuard.tsx');
            // Trigger subscription modal instead of navigation
            // O modal deve ser aberto pelo componente pai
          }}
        >
          <Crown className="h-4 w-4" />
          Assine agora para desbloquear
        </Button>
      </CardContent>
    </Card>
  );
}

interface RestrictedContentProps {
  userPlan: SubscriptionPlan;
  requiredFeature: 'canViewSuppliers' | 'canFilterBySuppliers' | 'canExportData' | 'canCreateAlerts' | 'hasAdminAccess';
  children: ReactNode;
  restrictedMessage?: string;
  isAdmin?: boolean;
  role?: string;
}

export function RestrictedContent({ 
  userPlan, 
  requiredFeature, 
  children, 
  restrictedMessage = "🔒 Somente no plano Pro",
  isAdmin,
  role
}: RestrictedContentProps) {
  const hasAccess = canUserAccessFeature(userPlan, requiredFeature, isAdmin, role);
  
  if (hasAccess) {
    return <>{children}</>;
  }

  return (
    <div className="text-gray-500 italic text-sm">
      {restrictedMessage}
    </div>
  );
}

interface UpgradeBannerProps {
  userPlan: SubscriptionPlan;
  className?: string;
  isAdmin?: boolean;
  role?: string;
}

export function UpgradeBanner({ userPlan, className = "", isAdmin, role }: UpgradeBannerProps) {
  // Only show for free users who are NOT admins
  if (userPlan !== 'free' || isAdminUser(userPlan, isAdmin, role)) {
    return null;
  }

  return (
    <Card className={`bg-gradient-to-r from-blue-500 to-purple-600 text-white border-0 ${className}`}>
      <CardContent className="flex items-center justify-between p-4">
        <div>
          <h3 className="font-semibold">Desbloqueie todos os recursos</h3>
          <p className="text-sm opacity-90">
            Veja fornecedores, use filtros avançados e muito mais
          </p>
        </div>
        <Button 
          variant="secondary" 
          className="bg-white text-blue-600 hover:bg-gray-100"
          onClick={() => {
            console.log('DEBUG Assine agora clicked in: UpgradeBanner');
            // Trigger subscription modal instead of navigation
          }}
        >
          👉 Assine agora
        </Button>
      </CardContent>
    </Card>
  );
}