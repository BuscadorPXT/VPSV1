const DashboardOverviewSection = () => {
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
    // ⚡ OTIMIZAÇÃO #31: placeholderData para mostrar cache instantaneamente
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
    // ⚡ OTIMIZAÇÃO #31: placeholderData para mostrar cache instantaneamente
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
    // ⚡ OTIMIZAÇÃO #31: placeholderData para mostrar cache instantaneamente
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
    // ⚡ OTIMIZAÇÃO #31: placeholderData para mostrar cache instantaneamente
    placeholderData: (previousData) => previousData,
    onError: (error) => {
      console.error('❌ Error fetching activity data:', error);
    },
    select: (data) => {
      // Ensure consistent data structure
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

        {/* Online Users Section */}
        <Card className="border-0 shadow-lg bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <p className="text-sm font-medium text-green-600 dark:text-green-400">Usuários Online</p>
                <p className="text-3xl font-bold text-green-900 dark:text-green-100">
                  {onlineLoading ? (
                    <span className="animate-pulse">...</span>
                  ) : (
                    (() => {
                      // Simplified logic - check API response structure
                      console.log('🔍 [Admin] Raw online data:', onlineData);
                      
                      let count = 0;
                      
                      // Check direct properties first
                      if (onlineData?.totalOnline !== undefined) {
                        count = onlineData.totalOnline;
                      } 
                      // Check nested data structure
                      else if (onlineData?.data?.totalOnline !== undefined) {
                        count = onlineData.data.totalOnline;
                      }
                      // Fallback to WebSocket connections
                      else if (onlineData?.wsConnections !== undefined) {
                        count = onlineData.wsConnections;
                      }
                      else if (onlineData?.data?.wsConnections !== undefined) {
                        count = onlineData.data.wsConnections;
                      }
                      // Final fallback to counting users array
                      else if (onlineData?.data?.onlineUsers?.length) {
                        count = onlineData.data.onlineUsers.length;
                      }
                      else if (onlineData?.onlineUsers?.length) {
                        count = onlineData.onlineUsers.length;
                      }
                      
                      console.log('📊 [Admin] Calculated online count:', count);
                      return count;
                    })()
                  )}
                </p>
                <div className="space-y-1">
                  <p className="text-xs text-green-600 dark:text-green-400">
                    {onlineData?.data?.timeWindow || onlineData?.timeWindow || 'Últimos 30 min'}
                  </p>
                  
                  {/* Show WebSocket info if available */}
                  {(() => {
                    const wsCount = onlineData?.wsConnections || onlineData?.data?.wsConnections;
                    if (wsCount) {
                      return (
                        <p className="text-xs text-blue-600 dark:text-blue-400">
                          WS: {wsCount} conexões
                        </p>
                      );
                    }
                    return null;
                  })()}
                  
                  {/* Show session info if available */}
                  {(() => {
                    const sessionCount = onlineData?.activeSessions || onlineData?.data?.activeSessions;
                    if (sessionCount) {
                      return (
                        <p className="text-xs text-purple-600 dark:text-purple-400">
                          DB: {sessionCount} sessões
                        </p>
                      );
                    }
                    return null;
                  })()}
                  
                  {onlineError && (
                    <p className="text-xs text-red-500">
                      ⚠️ Erro ao carregar dados online
                    </p>
                  )}
                  
                  {!onlineLoading && (() => {
                    const lastCheck = onlineData?.data?.lastCheck || onlineData?.lastCheck;
                    if (lastCheck) {
                      return (
                        <p className="text-xs text-green-500">
                          ✅ Atualizado: {new Date(lastCheck).toLocaleTimeString('pt-BR')}
                        </p>
                      );
                    }
                    return null;
                  })()}
                  
                  {/* Debug info sempre visível para diagnosticar o problema */}
                  {onlineData && (
                    <details className="text-xs text-gray-500 mt-2">
                      <summary>🔍 Debug API Response</summary>
                      <pre className="mt-1 text-xs bg-gray-100 dark:bg-gray-800 p-2 rounded overflow-auto max-h-32">
                        {JSON.stringify(onlineData, null, 2)}
                      </pre>
                    </details>
                  )}
                </div>
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
                <p className="text-sm font-medium text-purple-600 dark:text-purple-400">Logins 24h</p>
                <p className="text-3xl font-bold text-purple-900 dark:text-purple-100">{(loginStats as any)?.logins24h || 0}</p>
                <p className="text-xs text-purple-600 dark:text-purple-400">7 dias: {(loginStats as any)?.logins7d || 0}</p>
              </div>
              <div className="p-3 bg-purple-500 rounded-xl">
                <TrendingUp className="h-8 w-8 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <p className="text-sm font-medium text-orange-600 dark:text-orange-400">Atividade Recente</p>
                <p className="text-3xl font-bold text-orange-900 dark:text-orange-100">{(activityData as any)?.total || 0}</p>
                <p className="text-xs text-orange-600 dark:text-orange-400">Ações do sistema</p>
              </div>
              <div className="p-3 bg-orange-500 rounded-xl">
                <AlertTriangle className="h-8 w-8 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        {/* Online Users Monitor */}
        <div className="space-y-6">
          <OnlineUsersMonitor />
        </div>

        {/* Login Statistics */}
        <Card className="border-0 shadow-lg">
          <CardHeader className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
            <CardTitle className="flex items-center gap-3">
              <div className="p-2 bg-purple-500 rounded-lg">
                <BarChart3 className="h-5 w-5 text-white" />
              </div>
              Estatísticas de Login (7 dias)
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-4">
              {(loginStats as any)?.loginStats && (loginStats as any).loginStats.length > 0 ? (
                (loginStats as any).loginStats.map((stat: any, index: number) => {
                  const maxCount = Math.max(...(loginStats as any).loginStats.map((s: any) => s.count));
                  const percentage = maxCount > 0 ? Math.max((stat.count / maxCount) * 100, 2) : 2;

                  return (
                    <div key={stat.date} className="group">
                      <div className="flex items-center gap-4 p-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/50">
                        <div className="w-12 text-sm font-medium text-slate-600 dark:text-slate-400">
                          {stat.dayName}
                        </div>
                        <div className="flex-1">
                          <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-gradient-to-r from-purple-500 to-purple-600 rounded-full transition-all duration-700"
                              style={{ width: percentage + '%' }}
                            />
                          </div>
                        </div>
                        <div className="w-12 text-sm font-bold text-right text-slate-900 dark:text-slate-100">
                          {stat.count}
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-8">
                  <BarChart3 className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Nenhum login registrado</h3>
                  <p className="text-slate-500 dark:text-slate-400">
                    Não há dados de login para os últimos 7 dias
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      

      {/* Activity and Performance Section */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg font-semibold">Atividade Recente</CardTitle>
                <CardDescription>Últimas ações dos administradores</CardDescription>
              </div>
              <Badge variant="outline" className="text-xs">
                {(activityData as any)?.success && (activityData as any)?.data?.activities?.length || 0} atividades
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            {activityLoading ? (
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="animate-pulse">
                    <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                  </div>
                ))}
              </div>
            ) : activityError ? (
              <div className="text-center py-4">
                <AlertTriangle className="h-8 w-8 text-yellow-500 mx-auto mb-2" />
                <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">
                  Não foi possível carregar a atividade recente
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-500">
                  O sistema continua funcionando normalmente
                </p>
              </div>
            ) : (activityData as any)?.data?.activities?.length > 0 ? (
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {(activityData as any).data.activities.slice(0, 10).map((activity: any, index: number) => (
                  <div key={activity.id || index} className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                    <div className="flex-shrink-0 w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        {activity.adminEmail || activity.adminName || 'Admin desconhecido'}
                      </p>
                      <p className="text-xs text-gray-600 dark:text-gray-400 truncate">
                        {activity.action || activity.type || 'Ação não especificada'}
                        {activity.targetUserEmail && ` → ${activity.targetUserEmail}`}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-500">
                        {activity.timestamp ? new Date(activity.timestamp).toLocaleString('pt-BR') : 'Sem timestamp'}
                      </p>
                      {activity.details && (
                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1 truncate">
                          {activity.details}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Activity className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">Nenhuma atividade recente</h3>
                <p className="text-gray-500 dark:text-gray-400">
                  As ações administrativas aparecerão aqui
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* System Health Card */}
        <Card className="border-0 shadow-lg">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg font-semibold">Status do Sistema</CardTitle>
            <CardDescription>Monitoramento em tempo real</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <div className="text-2xl font-bold text-green-600 dark:text-green-400 mb-1">
                  {onlineLoading ? (
                    <span className="animate-pulse">...</span>
                  ) : (
                    (() => {
                      // Use the same simplified logic as above
                      let count = 0;
                      
                      if (onlineData?.totalOnline !== undefined) {
                        count = onlineData.totalOnline;
                      } else if (onlineData?.data?.totalOnline !== undefined) {
                        count = onlineData.data.totalOnline;
                      } else if (onlineData?.wsConnections !== undefined) {
                        count = onlineData.wsConnections;
                      } else if (onlineData?.data?.wsConnections !== undefined) {
                        count = onlineData.data.wsConnections;
                      } else if (onlineData?.data?.onlineUsers?.length) {
                        count = onlineData.data.onlineUsers.length;
                      } else if (onlineData?.onlineUsers?.length) {
                        count = onlineData.onlineUsers.length;
                      }
                      
                      return count;
                    })()
                  )}
                </div>
                <div className="text-sm text-green-600 dark:text-green-400">Usuários Online</div>
                {!onlineLoading && (() => {
                  const lastCheck = onlineData?.data?.lastCheck || onlineData?.lastCheck;
                  if (lastCheck) {
                    return (
                      <div className="text-xs text-green-500 mt-1">
                        ✅ {new Date(lastCheck).toLocaleTimeString('pt-BR')}
                      </div>
                    );
                  }
                  return null;
                })()}
              </div>

              <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <div className="text-2xl font-bold text-blue-600 dark:text-blue-400 mb-1">
                  {onlineLoading ? (
                    <span className="animate-pulse">...</span>
                  ) : (
                    (() => {
                      const wsCount = onlineData?.wsConnections || onlineData?.data?.wsConnections || 0;
                      return wsCount;
                    })()
                  )}
                </div>
                <div className="text-sm text-blue-600 dark:text-blue-400">Conexões WS</div>
                {!onlineLoading && (() => {
                  const sessionCount = onlineData?.data?.activeSessions || onlineData?.activeSessions;
                  if (sessionCount !== undefined && sessionCount !== null) {
                    return (
                      <div className="text-xs text-blue-500 mt-1">
                        DB: {sessionCount} sessões
                      </div>
                    );
                  }
                  return null;
                })()}
              </div>

              <div className="text-center p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                <div className="text-2xl font-bold text-orange-600 dark:text-orange-400 mb-1">
                  {(userStats as any)?.totalUsers || 0}
                </div>
                <div className="text-sm text-orange-600 dark:text-orange-400">Total Usuários</div>
              </div>

              <div className="text-center p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                <div className="text-2xl font-bold text-purple-600 dark:text-purple-400 mb-1">
                  {(loginStats as any)?.logins24h || 0}
                </div>
                <div className="text-sm text-purple-600 dark:text-purple-400">Logins 24h</div>
              </div>
            </div>

            {onlineError && (
              <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 rounded-lg">
                <p className="text-sm text-yellow-700 dark:text-yellow-300">
                  ⚠️ Problema ao carregar dados de usuários online. Verifique os logs do servidor.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

// 2. Pending Approval Section
