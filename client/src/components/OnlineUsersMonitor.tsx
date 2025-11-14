import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users, Globe, Clock, Monitor, Wifi } from 'lucide-react';
import { useUnifiedWebSocket } from '@/hooks/use-unified-websocket';

interface OnlineUser {
  id: number;
  name: string;
  email: string;
  role: string;
  subscriptionPlan: string;
  isAdmin: boolean;
  ipAddress: string;
  lastActivity: string;
  userAgent: string;
  browser: string;
  isSessionActive: boolean;
  sessionCreatedAt?: string;
}

interface OnlineUsersData {
  data?: {
    onlineUsers: OnlineUser[];
    totalOnline: number;
    wsConnections: number;
    timeWindow: string;
    lastCheck: string;
  };
  success: boolean;
  error?: string;
}

export const OnlineUsersMonitor: React.FC = React.memo(() => {
  const { data: onlineData, isLoading, error, refetch } = useQuery<OnlineUsersData>({
    queryKey: ['/api/admin/users/online'],
    queryFn: async () => {
      console.log('🔍 Fetching online users data...');
      try {
        const response = await apiRequest('/api/admin/users/online');
        console.log('📊 Online users response:', response);
        return response;
      } catch (error) {
        console.error('❌ Error fetching online users:', error);
        // Return a default structure to prevent crashes
        return {
          success: false,
          data: {
            totalOnline: 0,
            wsConnections: 0,
            onlineUsers: [],
            timeWindow: '5 minutes',
            lastCheck: new Date().toISOString()
          },
          error: error.message
        };
      }
    },
    refetchInterval: 30000, // Refetch every 30 seconds
    staleTime: 15000, // Consider data fresh for 15 seconds
    retry: 2,
    retryDelay: 2000,
  });

  const { isConnected } = useUnifiedWebSocket();

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wifi className="h-5 w-5 animate-pulse" />
            Carregando usuários online...
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || !onlineData?.success) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-600">
            <Users className="h-5 w-5" />
            Erro ao carregar
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-red-500">
            {onlineData?.error || 'Não foi possível carregar os usuários online. Tente novamente.'}
          </p>
        </CardContent>
      </Card>
    );
  }

  const totalOnline = onlineData?.data?.totalOnline || 0;
  const onlineUsers = onlineData?.data?.onlineUsers || [];

  return (
    <div className="space-y-4">
      {/* Card de resumo */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <div className="relative">
              <Wifi className={`h-5 w-5 ${isConnected ? 'text-green-500' : 'text-red-500'}`} />
              <div className={`absolute -top-1 -right-1 w-3 h-3 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
            </div>
            Usuários Online em Tempo Real
          </CardTitle>
          <CardDescription>
            Últimos 30 minutos • Atualizado: {onlineData?.data?.lastCheck ? new Date(onlineData.data.lastCheck).toLocaleTimeString('pt-BR') : 'N/A'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="text-3xl font-bold text-green-600">{totalOnline}</div>
            <div>
              <p className="text-sm text-gray-600">
                {totalOnline === 0 ? 'Nenhum usuário online' :
                 totalOnline === 1 ? '1 usuário ativo' :
                 `${totalOnline} usuários ativos`}
              </p>
              <p className="text-xs text-gray-500">
                Últimos 30 minutos
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Card com métricas e status WebSocket */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Monitor className="h-5 w-5" />
            Estatísticas do Servidor
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Summary Stats */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
                <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {isLoading ? '...' : (onlineData?.data?.totalOnline || 0)}
                </div>
                <div className="text-sm text-green-600 dark:text-green-400">Usuários Online</div>
              </div>

              <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {isLoading ? '...' : (onlineData?.data?.onlineUsers?.length || 0)}
                </div>
                <div className="text-sm text-blue-600 dark:text-blue-400">Sessões DB</div>
              </div>

              <div className="bg-cyan-50 dark:bg-cyan-900/20 p-4 rounded-lg">
                <div className="text-2xl font-bold text-cyan-600 dark:text-cyan-400">
                  {isLoading ? '...' : (onlineData?.data?.wsConnections || 0)}
                </div>
                <div className="text-sm text-cyan-600 dark:text-cyan-400">WebSocket</div>
              </div>

              <div className="bg-orange-50 dark:bg-orange-900/20 p-4 rounded-lg">
                <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                  {onlineData?.data?.timeWindow || '5min'}
                </div>
                <div className="text-sm text-orange-600 dark:text-orange-400">Janela</div>
              </div>

              <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg">
                <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                  {onlineData?.data?.lastCheck ? new Date(onlineData.data.lastCheck).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                </div>
                <div className="text-sm text-purple-600 dark:text-purple-400">Última Check</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lista de usuários online */}
      {totalOnline > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Usuários Ativos ({totalOnline})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {onlineUsers.map((user) => (
                <div key={user.id} className="flex items-start gap-3 p-3 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                  <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse mt-2" />
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-gray-900 dark:text-gray-100">
                        {user.name}
                      </span>
                      <Badge variant={user.role === 'superadmin' ? 'default' : user.role === 'admin' ? 'secondary' : 'outline'} className="text-xs">
                        {user.role === 'superadmin' ? 'Super Admin' : user.role === 'admin' ? 'Admin' : 'Usuário'}
                      </Badge>
                      {user.isAdmin && (
                        <Badge variant="destructive" className="text-xs">
                          Admin
                        </Badge>
                      )}
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                        <Globe className="h-3 w-3" />
                        <span>{user.email}</span>
                      </div>

                      <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                        <Monitor className="h-3 w-3" />
                        <span>IP: {user.ipAddress || 'N/A'}</span>
                        {user.browser && <span>• {user.browser}</span>}
                      </div>

                      <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                        <Clock className="h-3 w-3" />
                        <span>
                          Login realizado: {(() => {
                            // Priorizar sessionCreatedAt se disponível
                            if (user.sessionCreatedAt && new Date(user.sessionCreatedAt).toString() !== 'Invalid Date') {
                              return new Date(user.sessionCreatedAt).toLocaleString('pt-BR', {
                                day: '2-digit',
                                month: '2-digit',
                                hour: '2-digit',
                                minute: '2-digit',
                                second: '2-digit'
                              });
                            }
                            // Fallback para lastActivity
                            if (user.lastActivity && new Date(user.lastActivity).toString() !== 'Invalid Date') {
                              return new Date(user.lastActivity).toLocaleString('pt-BR', {
                                day: '2-digit',
                                month: '2-digit',
                                hour: '2-digit',
                                minute: '2-digit',
                                second: '2-digit'
                              });
                            }
                            return 'N/A';
                          })()}
                        </span>
                      </div>
                      
                      {user.lastActivity && new Date(user.lastActivity).toString() !== 'Invalid Date' && (
                        <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-500">
                          <div className="h-3 w-3 rounded-full bg-blue-400" />
                          <span>
                            Última atividade: {new Date(user.lastActivity).toLocaleString('pt-BR', {
                              day: '2-digit',
                              month: '2-digit',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Informações de debug - removido para simplificar e focar nas métricas principais */}
      {/* A informação de debug foi substituída pela nova seção de métricas no Card de Estatísticas do Servidor */}
    </div>
  );
});

export default OnlineUsersMonitor;