const PendingApprovalSection = () => {
  const { toast } = useToast();
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [showApprovalDialog, setShowApprovalDialog] = useState(false);
  const [approvalReason, setApprovalReason] = useState('');

  const { data: pendingUsers = [], isLoading, error, refetch } = useQuery({
    queryKey: ['/api/admin/pending-users'],
    queryFn: async () => {
      return await apiRequest('/api/admin/pending-users');
    },
    refetchInterval: 30000,
    staleTime: 10000,
    retry: 3,
    onSuccess: (data) => {
      console.log('✅ [ADMIN] Pending users fetched successfully:', data);
    },
    onError: (error) => {
      console.error('❌ [ADMIN] Error fetching pending users:', error);
    }
  });

  const approveUserMutation = useMutation({
    mutationFn: async ({ userId, reason, userType }: { userId: number; reason?: string; userType?: string }) => {
      const response = await apiRequest('/api/admin/approve-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, reason, userType }),
      });
      return response;
    },
    onSuccess: (data) => {
      toast({
        title: "Usuário Aprovado",
        description: data.message || "Usuário aprovado com sucesso e promovido para PRO",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/pending-users'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/stats/users'] });
      setShowApprovalDialog(false);
      setApprovalReason('');
      setSelectedUser(null);
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Erro ao aprovar usuário",
        variant: "destructive",
      });
    }
  });

  const rejectUserMutation = useMutation({
    mutationFn: async ({ userId, reason }: { userId: number; reason?: string }) => {
      const response = await apiRequest('/api/admin/reject-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, reason }),
      });
      return response;
    },
    onSuccess: (data) => {
      toast({
        title: "Usuário Rejeitado",
        description: data.message || "Usuário rejeitado com sucesso",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/pending-users'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/stats/users'] });
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Erro ao rejeitar usuário",
        variant: "destructive",
      });
    }
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="border-b pb-4">
          <h2 className="text-2xl font-bold">Aguardando Aprovação</h2>
          <p className="text-slate-600 dark:text-slate-400">Carregando usuários pendentes...</p>
        </div>
        <Card>
          <CardContent className="p-6">
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="flex items-center space-x-4">
                  <div className="h-10 w-10 rounded-full bg-slate-200 dark:bg-slate-700 animate-pulse" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
                    <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-3/4 animate-pulse" />
                  </div>
                  <div className="flex gap-2">
                    <div className="h-8 w-20 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
                    <div className="h-8 w-20 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="border-b pb-4">
          <h2 className="text-2xl font-bold">Aguardando Aprovação</h2>
          <p className="text-slate-600 dark:text-slate-400">Erro ao carregar usuáriospendentes</p>
        </div>
        <Card className="border-red-200 bg-red-50 dark:bg-red-900/10">
          <CardContent className="p-6 text-center">
            <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-red-900 dark:text-red-100 mb-2">
              Erro ao carregar dados
            </h3>
            <p className="text-red-700 dark:text-red-300 mb-4">
              {error.message || "Não foi possível carregar os usuários pendentes"}
            </p>
            <Button onClick={() => refetch()} variant="outline" className="border-red-300 text-red-700 hover:bg-red-100">
              <RefreshCw className="h-4 w-4 mr-2" />
              Tentar Novamente
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b pb-4">
        <div>
          <h2 className="text-2xl font-bold">Aguardando Aprovação ({pendingUsers.length})</h2>
          <p className="text-slate-600 dark:text-slate-400">
            Novos usuários que precisam de aprovação para acessar o sistema
          </p>
        </div>
        <Button
          onClick={() => refetch()}
          variant="outline"
          size="sm"
          disabled={isLoading}
        >
          <RefreshCw className={'h-4 w-4 mr-2 ' + (isLoading ? 'animate-spin' : '')} />
          Atualizar
        </Button>
      </div>

      {pendingUsers.length === 0 ? (
        <Card className="border-green-200 bg-green-50 dark:bg-green-900/10">
          <CardContent className="p-8 text-center">
            <UserCheck className="h-16 w-16 text-green-500 mx-auto mb-6" />
            <h3 className="text-xl font-bold mb-3 text-green-700 dark:text-green-400">
              Nenhum usuário aguardando aprovação
            </h3>
            <p className="text-green-600 dark:text-green-300 text-lg mb-4">
              Todos os usuários estão aprovados e ativos no sistema
            </p>
            <div className="flex justify-center items-center gap-2 text-sm text-green-600 dark:text-green-400">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              Sistema funcionando normalmente
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Usuários Pendentes ({pendingUsers.length})
            </CardTitle>
            <CardDescription>
              Clique em "Aprovar" para conceder acesso PRO automaticamente
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 dark:bg-slate-800">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium text-slate-500">Usuário</th>
                    <th className="px-4 py-3 text-left font-medium text-slate-500">Empresa</th>
                    <th className="px-4 py-3 text-left font-medium text-slate-500">WhatsApp</th>
                    <th className="px-4 py-3 text-left font-medium text-slate-500">Status</th>
                    <th className="px-4 py-3 text-left font-medium text-slate-500">Registro</th>
                    <th className="px-4 py-3 text-left font-medium text-slate-500">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                  {pendingUsers.map((user: any) => (
                    <tr key={user.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                      <td className="px-4 py-4">
                        <div className="flex items-center">
                          <div className="h-8 w-8 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center mr-3">
                            <User className="h-4 w-4 text-slate-500" />
                          </div>
                          <div>
                            <div className="font-medium text-slate-900 dark:text-slate-100">
                              {user.name || 'Nome não informado'}
                            </div>
                            <div className="text-slate-500">{user.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <span className="text-slate-600 dark:text-slate-400">
                          {user.company || 'Não informado'}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <span className="text-slate-600 dark:text-slate-400">
                          {user.whatsapp || user.phone || 'Não informado'}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <Badge variant="outline" className="border-yellow-300 text-yellow-700 bg-yellow-50">
                          <Clock className="h-3 w-3 mr-1" />
                          {user.status || 'Pendente'}
                        </Badge>
                      </td>
                      <td className="px-4 py-4 text-slate-500">
                        {user.createdAt ? new Date(user.createdAt).toLocaleDateString('pt-BR', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        }) : 'Data não disponível'}
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() => {
                              approveUserMutation.mutate({
                                userId: user.id,
                                reason: 'Approved as PRO user',
                                userType: 'pro'
                              });
                            }}
                            disabled={approveUserMutation.isPending}
                            className="bg-green-600 hover:bg-green-700 text-white"
                          >
                            <CheckCircle className="h-4 w-4 mr-1" />
                            PRO
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => {
                              approveUserMutation.mutate({
                                userId: user.id,
                                reason: 'Approved as Tester user (7 days)',
                                userType: 'tester'
                              });
                            }}
                            disabled={approveUserMutation.isPending}
                            className="bg-orange-600 hover:bg-orange-700 text-white"
                          >
                            <Clock className="h-4 w-4 mr-1" />
                            Tester
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => rejectUserMutation.mutate({ 
                              userId: user.id, 
                              reason: 'Rejected by administrator' 
                            })}
                            disabled={rejectUserMutation.isPending}
                            className="text-red-600 hover:text-red-700 border-red-300 hover:bg-red-50"
                          >
                            <XCircle className="h-4 w-4 mr-1" />
                            Rejeitar
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Approval Dialog */}
      <Dialog open={showApprovalDialog} onOpenChange={setShowApprovalDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-green-600">
              <CheckCircle className="h-5 w-5" />
              Aprovar Usuário
            </DialogTitle>
            <DialogDescription>
              Este usuário será aprovado e automaticamente promovido para o plano PRO
            </DialogDescription>
          </DialogHeader>

          {selectedUser && (
            <div className="space-y-4">
              <div className="p-4 bg-green-50 dark:bg-green-900/10 border border-green-200 rounded-lg">
                <p className="font-medium text-green-900 dark:text-green-100">
                  {selectedUser.name || 'Nome não informado'}
                </p>
                <p className="text-sm text-green-700 dark:text-green-300">{selectedUser.email}</p>
                {selectedUser.company && (
                  <p className="text-sm text-green-700 dark:text-green-300">
                    Empresa: {selectedUser.company}
                  </p>
                )}
                {(selectedUser.whatsapp || selectedUser.phone) && (
                  <p className="text-sm text-green-700 dark:text-green-300">
                    WhatsApp: {selectedUser.whatsapp || selectedUser.phone}
                  </p>
                )}
              </div>

              <div className="p-3 bg-blue-50 dark:bg-blue-900/10 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  ✅ Usuário será aprovado automaticamente<br/>
                  🚀 Plano será atualizado para PRO<br/>
                  🔑 Acesso completo ao sistema será concedido
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="approval-reason">Motivo da aprovação (opcional):</Label>
                <Input
                  id="approval-reason"
                  placeholder="Ex: Usuário válido, documentação verificada..."
                  value={approvalReason}
                  onChange={(e) => setApprovalReason(e.target.value)}
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowApprovalDialog(false);
              setSelectedUser(null);
              setApprovalReason('');
            }}>
              Cancelar
            </Button>
            <Button 
              onClick={() => {
                if (selectedUser) {
                  approveUserMutation.mutate({
                    userId: selectedUser.id,                    reason: approvalReason || 'Approved by administrator'
                  });
                }
              }}
              disabled={approveUserMutation.isPending}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              {approveUserMutation.isPending ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Aprovando...
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Confirmar Aprovação
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

// 3. User Management Section (Enhanced with Delete Function)
// User Management Section
