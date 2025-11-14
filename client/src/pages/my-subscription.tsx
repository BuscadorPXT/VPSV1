import React from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  CreditCard, 
  Calendar, 
  DollarSign, 
  CheckCircle, 
  XCircle, 
  Clock, 
  User,
  AlertTriangle,
  Settings,
  Crown,
  ArrowLeft
} from "lucide-react";
import { useLocation } from "wouter";

interface SubscriptionData {
  userId: number;
  name: string;
  email: string;
  subscriptionPlan: string;
  isSubscriptionActive: boolean;
  status: string;
  paymentDate?: string;
  renewalDate?: string;
  daysUntilRenewal: number;
  daysWithoutPayment: number;
  subscriptionNickname?: string;
  notes?: string;
  paymentMethod?: string;
  paymentAmount?: number;
  paymentStatus: string;
  createdAt?: string;
  lastLoginAt?: string;
  updatedAt?: string;
}

interface SubscriptionResponse {
  success: boolean;
  data: SubscriptionData;
}

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(amount);
};

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
};

const getStatusBadge = (status: string, isActive: boolean) => {
  if (status === 'approved' && isActive) {
    return <Badge className="bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400"><CheckCircle className="w-3 h-3 mr-1" />Ativo</Badge>;
  } else if (status === 'pending_payment') {
    return <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400"><Clock className="w-3 h-3 mr-1" />Pendente</Badge>;
  } else if (status === 'suspended') {
    return <Badge className="bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400"><XCircle className="w-3 h-3 mr-1" />Suspenso</Badge>;
  } else {
    return <Badge className="bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400"><AlertTriangle className="w-3 h-3 mr-1" />Inativo</Badge>;
  }
};

const getPlanBadge = (plan: string) => {
  const planConfig = {
    'pro': { label: 'PRO', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400', icon: Crown },
    'apoiador': { label: 'Apoiador', color: 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400', icon: Crown },
    'admin': { label: 'Admin', color: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400', icon: Settings },
    'tester': { label: 'Tester', color: 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400', icon: User },
    'free': { label: 'Gratuito', color: 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400', icon: User }
  };

  const config = planConfig[plan as keyof typeof planConfig] || planConfig.free;
  const IconComponent = config.icon;

  return (
    <Badge className={config.color}>
      <IconComponent className="w-3 h-3 mr-1" />
      {config.label}
    </Badge>
  );
};

const getRenewalStatus = (daysUntilRenewal: number) => {
  if (daysUntilRenewal > 7) {
    return { status: 'Em dia', color: 'text-green-600 dark:text-green-400', icon: CheckCircle };
  } else if (daysUntilRenewal > 0) {
    return { status: `${daysUntilRenewal} dias restantes`, color: 'text-yellow-600 dark:text-yellow-400', icon: Clock };
  } else if (daysUntilRenewal === 0) {
    return { status: 'Renovação hoje', color: 'text-orange-600 dark:text-orange-400', icon: AlertTriangle };
  } else {
    return { status: `${Math.abs(daysUntilRenewal)} dias em atraso`, color: 'text-red-600 dark:text-red-400', icon: XCircle };
  }
};

export default function MySubscriptionPage() {
  const [, setLocation] = useLocation();
  
  const { data, isLoading, error } = useQuery<SubscriptionResponse>({
    queryKey: ['/api/user/my-subscription'],
    queryFn: () => apiRequest('/api/user/my-subscription'),
  });

  console.log('📋 [MySubscription] Component state:', { 
    isLoading, 
    hasError: !!error, 
    hasData: !!data,
    success: data?.success,
    errorMessage: error?.message
  });

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8 space-y-6">
        <div className="space-y-2">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-96" />
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-32" />
                <Skeleton className="h-4 w-48" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-20 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error || !data?.success) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Alert className="border-red-200 dark:border-red-900/20">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Erro ao carregar informações da assinatura. Tente novamente mais tarde.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const subscription = data.data;
  const renewalInfo = getRenewalStatus(subscription.daysUntilRenewal);
  const RenewalIcon = renewalInfo.icon;

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      <div className="space-y-4">
        <Button 
          variant="ghost" 
          onClick={() => setLocation('/dashboard')}
          className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Voltar para Dashboard
        </Button>
        
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
            Minha Assinatura
          </h1>
          <p className="text-muted-foreground">
            Visualize todos os detalhes da sua assinatura e informações de pagamento
          </p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* User Info Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Informações do Usuário
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="text-sm text-muted-foreground">Nome</p>
              <p className="font-medium">{subscription.name}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Email</p>
              <p className="font-medium">{subscription.email}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Membro desde</p>
              <p className="font-medium">
                {subscription.createdAt ? formatDate(subscription.createdAt) : 'Não informado'}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Subscription Plan Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Crown className="h-5 w-5" />
              Plano Atual
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="text-sm text-muted-foreground">Plano</p>
              <div className="mt-1">
                {getPlanBadge(subscription.subscriptionPlan)}
              </div>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Status</p>
              <div className="mt-1">
                {getStatusBadge(subscription.status, subscription.isSubscriptionActive)}
              </div>
            </div>
            {subscription.subscriptionNickname && (
              <div>
                <p className="text-sm text-muted-foreground">Apelido</p>
                <p className="font-medium">{subscription.subscriptionNickname}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Payment Information Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Informações de Pagamento
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {subscription.paymentAmount && (
              <div>
                <p className="text-sm text-muted-foreground">Valor do Pagamento</p>
                <p className="text-xl font-bold text-green-600 dark:text-green-400">
                  {formatCurrency(subscription.paymentAmount)}
                </p>
              </div>
            )}
            {subscription.paymentMethod && (
              <div>
                <p className="text-sm text-muted-foreground">Método de Pagamento</p>
                <p className="font-medium">{subscription.paymentMethod}</p>
              </div>
            )}
            <div>
              <p className="text-sm text-muted-foreground">Status do Pagamento</p>
              <Badge 
                className={subscription.paymentStatus === 'ativo' 
                  ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400' 
                  : 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
                }
              >
                {subscription.paymentStatus}
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Payment Dates Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Datas de Pagamento
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {subscription.paymentDate && (
              <div>
                <p className="text-sm text-muted-foreground">Último Pagamento</p>
                <p className="font-medium">{formatDate(subscription.paymentDate)}</p>
                {subscription.daysWithoutPayment > 0 && (
                  <p className="text-sm text-muted-foreground">
                    {subscription.daysWithoutPayment} dias atrás
                  </p>
                )}
              </div>
            )}
            {subscription.renewalDate && (
              <div>
                <p className="text-sm text-muted-foreground">Próxima Renovação</p>
                <p className="font-medium">{formatDate(subscription.renewalDate)}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Renewal Status Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Status de Renovação
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="text-sm text-muted-foreground">Status</p>
              <div className={`flex items-center gap-2 font-medium ${renewalInfo.color}`}>
                <RenewalIcon className="h-4 w-4" />
                {renewalInfo.status}
              </div>
            </div>
            {subscription.renewalDate && subscription.daysUntilRenewal <= 7 && subscription.daysUntilRenewal > 0 && (
              <Alert className="border-yellow-200 dark:border-yellow-900/20">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Sua assinatura será renovada em breve. Certifique-se de que seus dados de pagamento estão atualizados.
                </AlertDescription>
              </Alert>
            )}
            {subscription.daysUntilRenewal < 0 && (
              <Alert className="border-red-200 dark:border-red-900/20">
                <XCircle className="h-4 w-4" />
                <AlertDescription>
                  Sua assinatura está em atraso. Entre em contato com o suporte para regularizar.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* Additional Information Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Informações Adicionais
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="text-sm text-muted-foreground">Último Login</p>
              <p className="font-medium">
                {subscription.lastLoginAt ? formatDate(subscription.lastLoginAt) : 'Não informado'}
              </p>
            </div>
            {subscription.updatedAt && (
              <div>
                <p className="text-sm text-muted-foreground">Última Atualização</p>
                <p className="font-medium">{formatDate(subscription.updatedAt)}</p>
              </div>
            )}
            {subscription.notes && (
              <div>
                <p className="text-sm text-muted-foreground">Observações</p>
                <p className="text-sm bg-gray-50 dark:bg-gray-900/50 p-2 rounded-md">
                  {subscription.notes}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}