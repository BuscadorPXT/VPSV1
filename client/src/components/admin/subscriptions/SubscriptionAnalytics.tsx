import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Users, 
  TrendingUp, 
  Clock, 
  AlertTriangle,
  CheckCircle,
  XCircle,
  DollarSign,
  Calendar,
  TrendingDown,
  Activity
} from 'lucide-react';

interface AnalyticsData {
  overview: {
    totalUsers: number;
    activeSubscriptions: number;
    pendingPayments: number;
    suspendedUsers: number;
    churnRate: string;
    activeRate: string;
  };
  planDistribution: Array<{
    plan: string;
    count: number;
    percentage: string;
  }>;
  upcoming: {
    renewalsNext30Days: number;
  };
  revenue: {
    estimatedMonthly: number;
    averagePayment: number;
  };
}

interface SubscriptionAnalyticsProps {
  data: AnalyticsData;
  isLoading: boolean;
}

const getPlanColor = (plan: string) => {
  switch (plan.toLowerCase()) {
    case 'free': return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300';
    case 'pro': return 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300';
    case 'business': return 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300';
    case 'admin': return 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300';
    case 'tester': return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300';
    default: return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300';
  }
};

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
  }).format(value);
};

export const SubscriptionAnalytics = ({ data, isLoading }: SubscriptionAnalyticsProps) => {
  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                <div className="h-4 bg-muted animate-pulse rounded"></div>
              </CardTitle>
              <div className="h-4 w-4 bg-muted animate-pulse rounded"></div>
            </CardHeader>
            <CardContent>
              <div className="h-8 bg-muted animate-pulse rounded mb-2"></div>
              <div className="h-4 bg-muted animate-pulse rounded w-2/3"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const { overview, planDistribution, upcoming, revenue } = data;

  return (
    <div className="space-y-6">
      {/* Main Overview Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Usuários</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overview.totalUsers.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              Base total de usuários
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Assinaturas Ativas</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{overview.activeSubscriptions.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              {overview.activeRate}% da base total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pagamentos Pendentes</CardTitle>
            <Clock className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{overview.pendingPayments.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              Requer atenção imediata
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Taxa de Churn</CardTitle>
            <TrendingDown className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{overview.churnRate}%</div>
            <p className="text-xs text-muted-foreground">
              {overview.suspendedUsers} usuários suspensos
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Revenue and Upcoming Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Receita Estimada</CardTitle>
            <DollarSign className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(revenue.estimatedMonthly)}
            </div>
            <p className="text-xs text-muted-foreground">
              Receita mensal estimada
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ticket Médio</CardTitle>
            <Activity className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {formatCurrency(revenue.averagePayment)}
            </div>
            <p className="text-xs text-muted-foreground">
              Valor médio por pagamento
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Renovações Próximas</CardTitle>
            <Calendar className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{upcoming.renewalsNext30Days}</div>
            <p className="text-xs text-muted-foreground">
              Próximos 30 dias
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Plan Distribution */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Distribuição por Planos</CardTitle>
          <CardDescription>
            Quantidade de usuários por tipo de plano
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {planDistribution.map((plan) => (
              <div key={plan.plan} className="text-center">
                <Badge className={getPlanColor(plan.plan)}>
                  {plan.plan.toUpperCase()}
                </Badge>
                <div className="mt-2">
                  <div className="text-lg font-bold">{plan.count}</div>
                  <div className="text-xs text-muted-foreground">{plan.percentage}%</div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};