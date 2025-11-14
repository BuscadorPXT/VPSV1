import { useState, useMemo } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { 
  Search, 
  Filter, 
  Users, 
  TrendingUp, 
  Clock, 
  AlertTriangle,
  CheckCircle,
  XCircle,
  Plus,
  Edit,
  Eye,
  Ban,
  Play,
  Pause,
  Calendar,
  DollarSign,
  CreditCard,
  UserCheck,
  AlertCircle
} from 'lucide-react';
import { SubscriptionTable } from './SubscriptionTable';
import { SubscriptionAnalytics } from './SubscriptionAnalytics';
import { SubscriptionFilters } from './SubscriptionFilters';

interface SubscriptionData {
  userId: number;
  name: string;
  email: string;
  phone?: string;
  subscriptionPlan: string;
  isSubscriptionActive: boolean;
  status: string;
  subscriptionNickname?: string;
  paymentDate?: string;
  renewalDate?: string;
  daysUntilRenewal: number;
  notes?: string;
  paymentMethod?: string;
  paymentAmount?: number;
  paymentStatus: string;
  createdAt: string;
  lastLoginAt?: string;
}

interface SubscriptionResponse {
  success: boolean;
  data: {
    subscriptions: SubscriptionData[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      pages: number;
    };
  };
}

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

interface Filters {
  search: string;
  status: string;
  plan: string;
  paymentMethod: string;
  daysWithoutPayment: string;
  page: number;
  limit: number;
  sortBy: 'name' | 'email' | 'paymentDate' | 'renewalDate' | 'daysWithoutPayment';
  sortOrder: 'asc' | 'desc';
}

export const SubscriptionManagementSection = () => {
  const { toast } = useToast();
  const [filters, setFilters] = useState<Filters>({
    search: '',
    status: 'all',
    plan: 'all',
    paymentMethod: 'all',
    daysWithoutPayment: 'all',
    page: 1,
    limit: 20,
    sortBy: 'name',
    sortOrder: 'asc',
  });

  // Fetch subscriptions data
  const { data: subscriptionsData, isLoading: loadingSubscriptions, refetch: refetchSubscriptions } = useQuery<SubscriptionResponse>({
    queryKey: ['/api/admin/subscriptions', filters],
    queryFn: () => apiRequest(`/api/admin/subscriptions?${new URLSearchParams({
      ...filters,
      page: filters.page.toString(),
      limit: filters.limit.toString(),
    }).toString()}`),
    refetchOnWindowFocus: false,
  });

  // Fetch analytics data
  const { data: analyticsData, isLoading: loadingAnalytics } = useQuery<{ success: boolean; data: AnalyticsData }>({
    queryKey: ['/api/admin/analytics'],
    queryFn: () => apiRequest('/api/admin/analytics'),
    refetchOnWindowFocus: false,
  });

  // Mutation for subscription actions
  const subscriptionActionMutation = useMutation({
    mutationFn: ({ userId, action, data }: { userId: number; action: string; data?: any }) => {
      return apiRequest(`/api/admin/subscriptions/${userId}/${action}`, {
        method: 'PATCH',
        body: JSON.stringify(data || {}),
      });
    },
    onSuccess: (data: any, variables) => {
      toast({
        title: 'Sucesso',
        description: data.message || 'Ação executada com sucesso',
      });
      refetchSubscriptions();
      queryClient.invalidateQueries({ queryKey: ['/api/admin/analytics'] });
    },
    onError: (error: any) => {
      toast({
        title: 'Erro',
        description: error.message || 'Erro ao executar ação',
        variant: 'destructive',
      });
    },
  });

  // Handle subscription actions
  const handleSubscriptionAction = (userId: number, action: string, data?: any) => {
    subscriptionActionMutation.mutate({ userId, action, data });
  };

  // Mutation to update user subscription
  const updateUserMutation = useMutation({
    mutationFn: async (data: { userId: number; subscriptionPlan: string; expiresAt?: string }) => {
      const response = await apiRequest(`/api/admin/users/${data.userId}/subscription`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subscriptionPlan: data.subscriptionPlan,
          expiresAt: data.expiresAt
        }),
      });
      return response;
    },
    onSuccess: () => {
      toast({
        title: "Usuário atualizado",
        description: "Assinatura do usuário foi atualizada com sucesso",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/subscriptions/users'] });
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Erro ao atualizar usuário",
        variant: "destructive",
      });
    }
  });

  // Handle filter changes
  const handleFilterChange = (key: keyof Filters, value: string | number) => {
    setFilters(prev => ({
      ...prev,
      [key]: value,
      page: key !== 'page' ? 1 : value, // Reset page when other filters change
    }));
  };

  // Handle pagination
  const handlePageChange = (page: number) => {
    setFilters(prev => ({ ...prev, page }));
  };

  const subscriptions = subscriptionsData?.data?.subscriptions || [];
  const pagination = subscriptionsData?.data?.pagination;
  const analytics = analyticsData?.data;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Gerenciamento de Assinaturas</h2>
          <p className="text-muted-foreground">
            Controle completo das assinaturas e pagamentos dos usuários
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetchSubscriptions()}
            disabled={loadingSubscriptions}
          >
            <Search className="h-4 w-4 mr-2" />
            Atualizar
          </Button>
        </div>
      </div>

      {/* Analytics Cards */}
      {analytics && (
        <SubscriptionAnalytics 
          data={analytics} 
          isLoading={loadingAnalytics} 
        />
      )}

      {/* Filters */}
      <SubscriptionFilters
        filters={filters}
        onFilterChange={handleFilterChange}
      />

      {/* Subscriptions Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Users className="h-5 w-5 mr-2" />
            Assinaturas ({pagination?.total || 0})
          </CardTitle>
          <CardDescription>
            Lista completa de usuários e seus dados de assinatura
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SubscriptionTable
            subscriptions={subscriptions}
            isLoading={loadingSubscriptions}
            pagination={pagination}
            onPageChange={handlePageChange}
            onAction={handleSubscriptionAction}
            isActionLoading={subscriptionActionMutation.isPending}
          />
        </CardContent>
      </Card>
    </div>
  );
};