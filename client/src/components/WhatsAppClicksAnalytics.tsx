
import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Area, AreaChart } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Badge } from './ui/badge';
import { Loader2, TrendingUp, Users, Package, Building, BarChart3, Calendar, RefreshCw, AlertCircle, CheckCircle, Clock, MessageCircle } from 'lucide-react';
import { useAuth } from '../hooks/use-auth';
import { queryClient, apiRequest } from '../lib/queryClient';
import { useQuery } from '@tanstack/react-query';

interface WhatsAppStats {
  totalClicks: number;
  uniqueUsers: number;
  uniqueProducts: number;
  uniqueSuppliers: number;
  period: string;
}

interface AnalyticsData {
  stats: WhatsAppStats;
  dailyStats?: Array<{
    date: string;
    clicks: number;
  }>;
  topProducts?: Array<{
    productId: string;
    productName: string;
    clicks: number;
  }>;
  topSuppliers?: Array<{
    supplierId: string;
    supplierName: string;
    clicks: number;
  }>;
}

const WhatsAppClicksAnalytics: React.FC = () => {
  const { user } = useAuth();
  const [period, setPeriod] = useState('30');

  // Usar React Query para gerenciar o estado e cache dos dados
  const { 
    data: analyticsData, 
    isLoading, 
    error, 
    refetch,
    isFetching 
  } = useQuery({
    queryKey: ['whatsapp-analytics', period],
    queryFn: async (): Promise<AnalyticsData> => {
      try {
        console.log('🔍 Fetching WhatsApp analytics with auth...');
        
        const response = await apiRequest(`/api/whatsapp-tracking/stats?days=${period}&limit=10`);
        
        console.log('📊 Analytics response received:', response);
        return response;
      } catch (error) {
        console.error('❌ Error fetching analytics:', error);
        throw error;
      }
    },
    enabled: !!user?.isAdmin, // Só buscar se for admin
    retry: 2,
    retryDelay: 1000,
    staleTime: 1000 * 60 * 5, // 5 minutos
    refetchInterval: 1000 * 60 * 10, // 10 minutos
  });

  const handleRefresh = () => {
    refetch();
  };

  // Se não for admin, não mostrar o componente
  if (!user?.isAdmin) {
    return (
      <Card className="border-yellow-200 bg-yellow-50 dark:bg-yellow-900/10">
        <CardContent className="pt-6">
          <div className="text-center py-8 space-y-4">
            <AlertCircle className="h-12 w-12 text-yellow-500 mx-auto" />
            <div>
              <h3 className="text-lg font-medium text-yellow-700">Acesso Restrito</h3>
              <p className="text-yellow-600 text-sm mt-1">
                Você precisa de permissões de administrador para acessar os analytics do WhatsApp.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-12 space-y-4">
        <Loader2 className="h-12 w-12 animate-spin text-blue-600" />
        <div className="text-center">
          <h3 className="text-lg font-medium">Carregando Analytics</h3>
          <p className="text-sm text-gray-500">Processando dados do WhatsApp...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Card className="border-red-200">
        <CardContent className="pt-6">
          <div className="text-center py-8 space-y-4">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto" />
            <div>
              <h3 className="text-lg font-medium text-red-700">Erro no Analytics</h3>
              <p className="text-red-600 text-sm mt-1">
                {error instanceof Error ? error.message : 'Erro ao carregar dados do analytics'}
              </p>
            </div>
            <div className="flex gap-2 justify-center">
              <Button onClick={handleRefresh} variant="outline">
                <RefreshCw className="h-4 w-4 mr-2" />
                Tentar Novamente
              </Button>
              <Button onClick={() => window.location.reload()}>
                Recarregar Página
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!analyticsData) {
    return (
      <Card className="border-gray-200">
        <CardContent className="pt-6">
          <div className="text-center py-8 space-y-4">
            <MessageCircle className="h-12 w-12 text-gray-400 mx-auto" />
            <div>
              <h3 className="text-lg font-medium text-gray-700">Nenhum Dado Disponível</h3>
              <p className="text-gray-600 text-sm mt-1">
                Ainda não há dados de analytics do WhatsApp para exibir.
              </p>
              <p className="text-xs text-gray-500 mt-2">
                Para gerar dados, clique nos botões do WhatsApp nos produtos da plataforma.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const stats = analyticsData.stats || {
    totalClicks: 0,
    uniqueUsers: 0,
    uniqueProducts: 0,
    uniqueSuppliers: 0,
    period: `Últimos ${period} dias`
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <BarChart3 className="h-6 w-6" />
            Analytics do WhatsApp
          </h2>
          <p className="text-sm text-gray-500 mt-1 flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {stats.period}
          </p>
        </div>
        <div className="flex items-center gap-4">
          <Button 
            onClick={handleRefresh} 
            variant="outline" 
            size="sm"
            disabled={isFetching}
          >
            {isFetching ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            {isFetching ? 'Atualizando...' : 'Atualizar'}
          </Button>
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Últimos 7 dias</SelectItem>
              <SelectItem value="15">Últimos 15 dias</SelectItem>
              <SelectItem value="30">Últimos 30 dias</SelectItem>
              <SelectItem value="60">Últimos 60 dias</SelectItem>
              <SelectItem value="90">Últimos 90 dias</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Estatísticas Principais */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total de Cliques</p>
                <p className="text-3xl font-bold text-blue-600">{stats.totalClicks.toLocaleString('pt-BR')}</p>
                <p className="text-xs text-gray-500 mt-1">
                  {stats.period}
                </p>
              </div>
              <div className="p-3 bg-blue-100 rounded-lg">
                <TrendingUp className="h-8 w-8 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Usuários Únicos</p>
                <p className="text-3xl font-bold text-green-600">{stats.uniqueUsers.toLocaleString('pt-BR')}</p>
                <p className="text-xs text-gray-500 mt-1">
                  Engagement: {stats.totalClicks > 0 ? ((stats.totalClicks / Math.max(stats.uniqueUsers, 1)).toFixed(1)) : '0'} cliques/usuário
                </p>
              </div>
              <div className="p-3 bg-green-100 rounded-lg">
                <Users className="h-8 w-8 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Produtos Únicos</p>
                <p className="text-3xl font-bold text-purple-600">{stats.uniqueProducts.toLocaleString('pt-BR')}</p>
                <p className="text-xs text-gray-500 mt-1">
                  Diversidade de produtos
                </p>
              </div>
              <div className="p-3 bg-purple-100 rounded-lg">
                <Package className="h-8 w-8 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Fornecedores</p>
                <p className="text-3xl font-bold text-orange-600">{stats.uniqueSuppliers.toLocaleString('pt-BR')}</p>
                <p className="text-xs text-gray-500 mt-1">
                  Rede de parceiros
                </p>
              </div>
              <div className="p-3 bg-orange-100 rounded-lg">
                <Building className="h-8 w-8 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Gráficos adicionais se houver dados */}
      {analyticsData.dailyStats && analyticsData.dailyStats.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Cliques por Dia</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={analyticsData.dailyStats}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="clicks" stroke="#2563eb" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Status de funcionamento */}
      <Card className="border-green-200 bg-green-50 dark:bg-green-900/10">
        <CardContent className="pt-6">
          <div className="flex items-center gap-3">
            <CheckCircle className="h-5 w-5 text-green-600" />
            <div>
              <p className="text-sm font-medium text-green-800">
                Sistema de Analytics Funcionando
              </p>
              <p className="text-xs text-green-600">
                Os cliques do WhatsApp estão sendo rastreados e contabilizados corretamente.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default WhatsAppClicksAnalytics;
export { WhatsAppClicksAnalytics };
