import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useUnifiedWebSocket } from '@/hooks/use-unified-websocket';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Users,
  RefreshCw,
  AlertTriangle,
  Activity,
  Clock
} from 'lucide-react';

export const DashboardOverviewSection = () => {
  const { toast } = useToast();

  const { data: userStats = {}, isLoading: userStatsLoading, error: userStatsError } = useQuery({
    queryKey: ['/api/admin/stats/users'],
    queryFn: async () => {
      return await apiRequest('/api/admin/stats/users');
    },
    refetchInterval: 60000,
    staleTime: 60000,
    retry: 3,
    retryDelay: 1000,
    placeholderData: (previousData) => previousData,
  });

  const { data: onlineData, isLoading: onlineLoading, error: onlineError, refetch: refetchOnlineUsers } = useQuery({
    queryKey: ['/api/admin/users/online'],
    queryFn: async () => {
      return await apiRequest('/api/admin/users/online');
    },
    refetchInterval: 30000,
    staleTime: 15000,
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
    placeholderData: (previousData) => previousData,
    onError: (error) => {
      console.error('❌ Error fetching online users:', error);
    },
    onSuccess: (data) => {
      console.log('✅ Online users data received:', data);
    }
  });

  const { data: loginStats = {}, isLoading: loginStatsLoading, error: loginStatsError } = useQuery({
    queryKey: ['/api/admin/stats/logins'],
    queryFn: async () => {
      return await apiRequest('/api/admin/stats/logins');
    },
    refetchInterval: 120000,
    staleTime: 60000,
    retry: 3,
    retryDelay: 1000,
    placeholderData: (previousData) => previousData,
  });

  const { data: activityData = {}, isLoading: activityLoading, error: activityError } = useQuery({
    queryKey: ['/api/admin/activity/recent'],
    queryFn: async () => {
      return await apiRequest('/api/admin/activity/recent');
    },
    refetchInterval: 60000,
    staleTime: 30000,
    retry: 3,
    retryDelay: 1000,
    placeholderData: (previousData) => previousData,
    onError: (error) => {
      console.error('❌ Error fetching activity data:', error);
    },
    select: (data) => {
      if (!data) return { data: { activities: [], total: 0 }, total: 0 };
      if (!data.data) return { data: { activities: [], total: 0 }, total: 0 };
      if (!Array.isArray(data.data.activities)) {
        return { data: { activities: [], total: 0 }, total: 0 };
      }
      return data;
    }
  });

  const isLoading = userStatsLoading || onlineLoading || loginStatsLoading || activityLoading;
  const hasErrors = userStatsError || onlineError || loginStatsError || activityError;

  const { isConnected } = useUnifiedWebSocket(({ title, description, duration, variant }: any) => {
    toast({ title, description, duration, variant });
  });

  const clearCacheMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest('/api/monitoring/clear-cache', {
        method: 'POST',
      });
    },
    onSuccess: (data) => {
      toast({
        title: "✅ Cache limpo com sucesso",
        description: data.message || "Todos os usuários receberão dados atualizados automaticamente.",
        variant: "default",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin'] });
    },
    onError: (error: any) => {
      toast({
        title: "❌ Erro ao limpar cache",
        description: error.message || "Não foi possível limpar o cache. Tente novamente.",
        variant: "destructive",
      });
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-28 bg-gradient-to-br from-slate-200 to-slate-300 dark:from-slate-700 dark:to-slate-800 rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (hasErrors) {
    return (
      <Card className="border-red-200 bg-red-50 dark:bg-red-900/10">
        <CardContent className="p-6">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5" />
            <div>
              <h3 className="font-semibold text-red-900 dark:text-red-100 mb-2">
                Erro ao carregar dados do dashboard
              </h3>
              <Button
                variant="outline"
                size="sm"
                className="mt-3"
                onClick={() => window.location.reload()}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Recarregar Página
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="text-center lg:text-left">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-3xl lg:text-4xl font-bold text-slate-900 dark:text-white mb-2">
              Dashboard Administrativo
            </h1>
            <p className="text-lg text-slate-600 dark:text-slate-400">
              Visão geral completa do sistema e estatísticas em tempo real
            </p>
          </div>
          <Button
            onClick={() => clearCacheMutation.mutate()}
            disabled={clearCacheMutation.isPending}
            className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-lg"
            data-testid="button-clear-cache"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${clearCacheMutation.isPending ? 'animate-spin' : ''}`} />
            {clearCacheMutation.isPending ? 'Limpando Cache...' : 'Limpar Cache do Sistema'}
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <Card className="border-0 shadow-lg bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <p className="text-sm font-medium text-blue-600 dark:text-blue-400">Total de Usuários</p>
                <p className="text-3xl font-bold text-blue-900 dark:text-blue-100">{(userStats as any)?.totalUsers || 0}</p>
                <div className="flex gap-2">
                  <Badge className="bg-blue-200 text-blue-800 text-xs">
                    PRO: {(userStats as any)?.proUsers || 0}
                  </Badge>
                  <Badge className="bg-emerald-200 text-emerald-800 text-xs">
                    Admin: {(userStats as any)?.adminUsers || 0}
                  </Badge>
                </div>
              </div>
              <div className="p-3 bg-blue-500 rounded-xl">
                <Users className="h-8 w-8 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <p className="text-sm font-medium text-green-600 dark:text-green-400">Usuários Online</p>
                <p className="text-3xl font-bold text-green-900 dark:text-green-100">
                  {onlineLoading ? (
                    <span className="animate-pulse">...</span>
                  ) : (
                    (onlineData as any)?.data?.totalOnline || 0
                  )}
                </p>
                <Badge className="bg-green-200 text-green-800 text-xs">
                  Tempo real
                </Badge>
              </div>
              <div className="p-3 bg-green-500 rounded-xl">
                <Activity className="h-8 w-8 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <p className="text-sm font-medium text-purple-600 dark:text-purple-400">Logins Hoje</p>
                <p className="text-3xl font-bold text-purple-900 dark:text-purple-100">{(loginStats as any)?.logins24h || 0}</p>
                <Badge className="bg-purple-200 text-purple-800 text-xs">
                  Últimas 24h
                </Badge>
              </div>
              <div className="p-3 bg-purple-500 rounded-xl">
                <Clock className="h-8 w-8 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <p className="text-sm font-medium text-orange-600 dark:text-orange-400">Atividades Recentes</p>
                <p className="text-3xl font-bold text-orange-900 dark:text-orange-100">
                  {(activityData as any)?.data?.activities?.length || 0}
                </p>
                <Badge className="bg-orange-200 text-orange-800 text-xs">
                  Última hora
                </Badge>
              </div>
              <div className="p-3 bg-orange-500 rounded-xl">
                <RefreshCw className="h-8 w-8 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
