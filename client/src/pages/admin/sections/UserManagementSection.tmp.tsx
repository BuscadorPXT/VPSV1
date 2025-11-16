const UserManagementSection = () => {
  const { toast } = useToast();
  const { user: currentUser } = useAuth(); // Get current logged-in admin user
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showForceLogoutDialog, setShowForceLogoutDialog] = useState(false);
  const [showDiagnosticDialog, setShowDiagnosticDialog] = useState(false);
  const [showUserDetailsDialog, setShowUserDetailsDialog] = useState(false);
  const [showRoleChangeDialog, setShowRoleChangeDialog] = useState(false);
  const [showStatusChangeDialog, setShowStatusChangeDialog] = useState(false);
  const [showResetPasswordDialog, setShowResetPasswordDialog] = useState(false);
  const [showImpersonateDialog, setShowImpersonateDialog] = useState(false);
  const [diagnosticEmail, setDiagnosticEmail] = useState('');
  const [userDetailsTab, setUserDetailsTab] = useState('profile');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'email' | 'createdAt' | 'role'>('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [statusFilter, setStatusFilter] = useState<'all' | 'approved' | 'pending' | 'online'>('all');
  const [roleFilter, setRoleFilter] = useState<'all' | 'admin' | 'pro' | 'user' | 'tester' | 'apoiador'>('all');
  const [newRole, setNewRole] = useState('');
  const [newStatus, setNewStatus] = useState('');
  const [changeReason, setChangeReason] = useState('');

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const { data: usersData, isLoading, error: usersError, refetch } = useQuery({
    queryKey: ['/api/admin/users'],
    queryFn: async () => {
      return await apiRequest('/api/admin/users');
    },
    refetchInterval: 30000,
    staleTime: 10000,
    retry: 3,
    onError: (error) => {
      console.error('❌ Error loading users:', error);
      toast({
        title: "Erro ao carregar usuários",
        description: "Não foi possível carregar a lista de usuários. Tentando novamente...",
        variant: "destructive",
      });
    }
  });

  const { data: userDetailsData, isLoading: isLoadingDetails } = useQuery({
    queryKey: ['/api/admin/users/details', selectedUser?.id],
    queryFn: async () => {
      if (!selectedUser?.id) return null;
      return await apiRequest('/api/admin/users/' + selectedUser.id + '/details');
    },
    enabled: !!selectedUser?.id && showUserDetailsDialog,
  });

  const filteredUsers = useMemo(() => {
    if (!usersData?.users) return [];

    return usersData.users.filter((user: any) => {
      const matchesSearch = 
        user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.company?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus = statusFilter === 'all' || 
        (statusFilter === 'approved' && user.isApproved) ||
        (statusFilter === 'pending' && !user.isApproved) ||
        (statusFilter === 'online' && user.isOnline);

      const matchesRole = roleFilter === 'all' || 
        (roleFilter === 'admin' && user.isAdmin) ||
        (roleFilter === 'pro' && user.subscriptionPlan === 'pro') ||
        (roleFilter === 'tester' && user.subscriptionPlan === 'tester') ||
        (roleFilter === 'apoiador' && user.subscriptionPlan === 'apoiador') ||
        (roleFilter === 'user' && user.subscriptionPlan === 'free');

      return matchesSearch && matchesStatus && matchesRole;
    });
  }, [usersData?.users, searchTerm, statusFilter, roleFilter]);

  const sortedUsers = useMemo(() => {
    return [...filteredUsers].sort((a, b) => {
      let aValue, bValue;

      switch (sortBy) {
        case 'name':
          aValue = a.name?.toLowerCase() || '';
          bValue = b.name?.toLowerCase() || '';
          break;
        case 'email':
          aValue = a.email?.toLowerCase() || '';
          bValue = b.email?.toLowerCase() || '';
          break;
        case 'createdAt':
          aValue = new Date(a.createdAt || 0).getTime();
          bValue = new Date(b.createdAt || 0).getTime();
          break;
        case 'role':
          aValue = a.role || '';
          bValue = b.role || '';
          break;
        case 'lastActivity':
          aValue = new Date(a.lastActivity || a.lastLoginAt || 0).getTime();
          bValue = new Date(b.lastActivity || b.lastLoginAt || 0).getTime();
          break;
        default:
          return 0;
      }

      if (sortOrder === 'asc') {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
      }
    });
  }, [filteredUsers, sortBy, sortOrder]);

  // Calculate total pages
  const totalPages = Math.ceil(sortedUsers.length / itemsPerPage);

  // Get current page users
  const currentPageUsers = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return sortedUsers.slice(startIndex, endIndex);
  }, [sortedUsers, currentPage, itemsPerPage]);

  const handleDeleteUser = async (userId: number) => {
    try {
      await apiRequest('/api/admin/delete-user/' + userId, {
        method: 'DELETE',
      });

      toast({
        title: "Usuário excluído",
        description: "O usuário foi excluído com sucesso do sistema.",
      });

      // Invalidate all relevant caches
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/pending-users'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/stats/users'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users/online'] });
      refetch();
    } catch (error) {
      toast({
        title: "Erro ao excluir usuário",
        description: error.message || "Ocorreu um erro inesperado.",
        variant: "destructive",
      });
    }
  };

  const handleForceLogout = async (userId: number) => {
    try {
      await apiRequest('/api/admin/force-logout/' + userId, {
        method: 'POST',
        body: JSON.stringify({
          reason: 'admin_force_logout'
        }),
      });

      toast({
        title: "Logout forçado",
        description: "O usuário foi desconectado de todas as sessões.",
      });

      // Invalidate all relevant caches
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users/online'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/stats/users'] });
      refetch();
    } catch (error) {
      toast({
        title: "Erro ao forçar logout",
        description: error.message || "Ocorreu um erro inesperado.",
        variant: "destructive",
      });
    }
  };

  const handleRoleChange = async (userId: number, newRole: string, reason: string) => {
    try {
      await apiRequest('/api/admin/users/' + userId + '/role', {
        method: 'PATCH',
        body: JSON.stringify({
          role: newRole,
          reason: reason
        }),
      });

      toast({
        title: "Função alterada",
        description: 'A função do usuário foi alterada para ' + newRole + '.',
      });

      // Invalidate all relevant caches
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/pending-users'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/stats/users'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users/online'] });
      refetch();
    } catch (error) {
      toast({
        title: "Erro ao alterar função",
        description: error.message || "Ocorreu um erro inesperado.",
        variant: "destructive",
      });
    }
  };

  const handleStatusChange = async (userId: number, newStatus: string, reason: string) => {
    try {
      await apiRequest('/api/admin/users/' + userId + '/status', {
        method: 'PATCH',
        body: JSON.stringify({
          status: newStatus,
          reason: reason
        }),
      });

      toast({
        title: "Status alterado",
        description: 'O status do usuário foi alterado para ' + newStatus + '.',
      });

      // Invalidate all relevant caches
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/pending-users'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/stats/users'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users/online'] });
      refetch();
    } catch (error) {
      toast({
        title: "Erro ao alterar status",
        description: error.message || "Ocorreu um erro inesperado.",
        variant: "destructive",
      });
    }
  };

  const handleResetPassword = async (userId: number) => {
    try {
      await apiRequest('/api/admin/users/' + userId + '/reset-password', {
        method: 'POST',
      });

      toast({
        title: "Reset de senha enviado",
        description: "Um link de redefinição de senha foi enviado para o email do usuário.",
      });
    } catch (error) {
      toast({
        title: "Erro ao resetar senha",
        description: error.message || "Ocorreu um erro inesperado.",
        variant: "destructive",
      });
    }
  };

  const handleImpersonate = async (userId: number) => {
    try {
      const response = await apiRequest('/api/admin/users/' + userId + '/impersonate', {
        method: 'POST',
      });

      // Store impersonation token and redirect
      localStorage.setItem('impersonation_token', response.token);
      window.location.href = '/dashboard?impersonating=true';
    } catch (error) {
      toast({
        title: "Erro ao personificar usuário",
        description: error.message || "Ocorreu um erro inesperado.",
        variant: "destructive",
      });
    }
  };

  const handleExportUsers = () => {
    try {
      // Preparar dados para exportação
      const exportData = filteredUsers.map(user => ({
        'ID': user.id,
        'Nome': user.name || 'N/A',
        'Email': user.email || 'N/A',
        'Empresa': user.company || 'N/A',
        'Função': user.isAdmin ? 'Admin' : 
                 user.subscriptionPlan === 'pro' ? 'PRO' :
                 user.subscriptionPlan === 'apoiador' ? 'Apoiador' :
                 user.subscriptionPlan === 'tester' ? 'Tester' : 'Free',
        'Status': user.status === 'suspended' ? 'Suspenso' :
                  user.status === 'disabled' || user.status === 'inactive' ? 'Inativo' :
                  user.isOnline ? 'Online' :
                  user.isApproved ? 'Ativo' : 'Pendente',
        'Aprovado': user.isApproved ? 'Sim' : 'Não',
        'Data de Criação': user.createdAt ? new Date(user.createdAt).toLocaleDateString('pt-BR') : 'N/A',
        'Última Atividade': user.lastActivity || user.lastLoginAt 
          ? new Date(user.lastActivity || user.lastLoginAt).toLocaleString('pt-BR')
          : 'Nunca',
        'Telefone': user.phone || 'N/A',
        'Plano de Assinatura': user.subscriptionPlan || 'N/A',
        'Verificado': user.emailVerified ? 'Sim' : 'Não'
      }));

      // Criar workbook
      const worksheet = XLSX.utils.json_to_sheet(exportData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Usuários');

      // Ajustar largura das colunas
      const maxWidth = exportData.reduce((w, r) => Math.max(w, Object.keys(r).length), 10);
      worksheet['!cols'] = Array(maxWidth).fill({ wch: 15 });

      // Gerar nome do arquivo com data atual
      const now = new Date();
      const fileName = `usuarios_${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}h${String(now.getMinutes()).padStart(2, '0')}.xlsx`;

      // Fazer download
      XLSX.writeFile(workbook, fileName);

      toast({
        title: "Exportação realizada",
        description: `${exportData.length} usuários foram exportados para ${fileName}`,
      });

    } catch (error) {
      console.error('Erro ao exportar usuários:', error);
      toast({
        title: "Erro na exportação",
        description: "Ocorreu um erro ao exportar os dados dos usuários.",
        variant: "destructive",
      });
    }
  };

  const getUserRoleBadge = (user: any) => {
    // Defensive coding - check if user exists before accessing properties
    if (!user) return <Badge className="bg-gray-100 text-gray-700">Carregando...</Badge>;

    // Check for pending payment status first
    if (user.status === 'pending_payment') return <Badge className="bg-orange-100 text-orange-700">Pendente Pagamento</Badge>;

    if (user.isAdmin) return <Badge className="bg-red-100 text-red-700">Admin</Badge>;
    if (user.subscriptionPlan === 'pro') return <Badge className="bg-blue-100 text-blue-700">PRO</Badge>;
    if (user.subscriptionPlan === 'apoiador') return <Badge className="bg-green-100 text-green-700">Apoiador</Badge>;
    if (user.subscriptionPlan === 'tester') return <Badge className="bg-yellow-100 text-yellow-700">Tester</Badge>;
    return <Badge className="bg-gray-100 text-gray-700">Free</Badge>;
  };

  const getUserStatusBadge = (user: any) => {
    // Defensive coding - check if user exists before accessing properties
    if (!user) return <Badge className="bg-gray-100 text-gray-700">Carregando...</Badge>;

    // Check status first (most important)
    if (user.status === 'suspended') return <Badge className="bg-red-100 text-red-700">Suspenso</Badge>;
    if (user.status === 'disabled' || user.status === 'inactive') return <Badge className="bg-gray-100 text-gray-700">Inativo</Badge>;

    // Then check online status
    if (user.isOnline) return <Badge className="bg-green-100 text-green-700">Online</Badge>;

    // Then check approval status
    if (user.isApproved) return <Badge className="bg-blue-100 text-blue-700">Ativo</Badge>;

    // Default to pending
    return <Badge className="bg-yellow-100 text-yellow-700">Pendente</Badge>;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-2" />
          <p className="text-sm text-gray-500">Carregando dados dos usuários...</p>
        </div>
      </div>
    );
  }

  if (usersError) {
    return (
      <div className="flex items-center justify-center h-48">
        <Card className="border-red-200 bg-red-50 dark:bg-red-900/10 max-w-md">
          <CardContent className="p-6 text-center">
            <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-red-900 dark:text-red-100 mb-2">
              Erro ao carregar usuários
            </h3>
            <p className="text-red-700 dark:text-red-300 mb-4">
              {usersError?.message || "Não foi possível carregar os dados dos usuários"}
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

  if (!usersData?.users || usersData.users.length === 0) {
    return (
      <div className="flex items-center justify-center h-48">
        <Card className="border-yellow-200 bg-yellow-50 dark:bg-yellow-900/10 max-w-md">
          <CardContent className="p-6 text-center">
            <Users className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-yellow-900 dark:text-yellow-100 mb-2">
              Nenhum usuário encontrado
            </h3>
            <p className="text-yellow-700 dark:text-yellow-300 mb-4">
              Não há usuários cadastrados no sistema ainda.
            </p>
            <Button onClick={() => refetch()} variant="outline" className="border-yellow-300 text-yellow-700 hover:bg-yellow-100">
              <RefreshCw className="h-4 w-4 mr-2" />
              Atualizar
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Gerenciamento de Usuários</h2>
        <div className="flex items-center gap-2">
          <Button 
            onClick={handleExportUsers}
            variant="outline"
            className="flex items-center gap-2"
          >
            <Download className="h-4 w-4" />
            Exportar Usuários
          </Button>
          <Button 
            onClick={() => setShowDiagnosticDialog(true)}
            variant="outline"
            className="flex items-center gap-2"
          >
            <Search className="h-4 w-4" />
            Diagnóstico de Usuário
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4 p-4 bg-gray-50 rounded-lg">
        <div className="flex-1 min-w-64">
          <Input
            placeholder="Buscar por nome, email ou empresa..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full"
          />
        </div>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos Status</SelectItem>
            <SelectItem value="approved">Aprovados</SelectItem>
            <SelectItem value="pending">Pendentes</SelectItem>
            <SelectItem value="online">Online</SelectItem>
          </SelectContent>
        </Select>

        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Função" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas Funções</SelectItem>
            <SelectItem value="admin">Admin</SelectItem>
            <SelectItem value="pro">PRO</SelectItem>
            <SelectItem value="apoiador">Apoiador</SelectItem>
            <SelectItem value="tester">Tester</SelectItem>
            <SelectItem value="user">Free</SelectItem>
          </SelectContent>
        </Select>

        <Select value={sortBy} onValueChange={setSortBy}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Ordenar por" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="createdAt">Data de Criação</SelectItem>
            <SelectItem value="lastActivity">Última Atividade</SelectItem>
            <SelectItem value="name">Nome</SelectItem>
            <SelectItem value="email">Email</SelectItem>
            <SelectItem value="role">Função</SelectItem>
          </SelectContent>
        </Select>

        <Button
          variant="outline"
          onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
          className="flex items-center gap-2"
        >
          {sortOrder === 'asc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />}
        </Button>
      </div>

      {/* Users Table */}
      <Card>
        <CardHeader>
          <CardTitle>Usuários ({sortedUsers.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b">
                <tr className="text-left">
                  <th className="pb-3 font-semibold">Usuário</th>
                  <th className="pb-3 font-semibold">Status</th>
                  <th className="pb-3 font-semibold">Função</th>
                  <th className="pb-3 font-semibold">Criado em</th>
                  <th className="pb-3 font-semibold">Última Atividade</th>
                  <th className="pb-3 font-semibold">Ações</th>
                </tr>
              </thead>
              <tbody>
                {currentPageUsers.map((user: any) => (
                  <tr key={user.id} className="border-b hover:bg-gray-50">
                    <td className="py-3">
                      <div>
                        <div className="font-medium flex items-center gap-2">
                          {user.name || 'Sem nome'}
                          {user.isOnline && <div className="w-2 h-2 bg-green-500 rounded-full" />}
                        </div>
                        <div className="text-sm text-gray-500">{user.email}</div>
                        {user.company && <div className="text-xs text-gray-400">{user.company}</div>}
                      </div>
                    </td>
                    <td className="py-3">
                      <button
                        onClick={() => {
                          setSelectedUser(user);
                          setShowStatusChangeDialog(true);
                        }}
                        className="hover:opacity-75 transition-opacity"
                      >
                        {getUserStatusBadge(user)}
                      </button>
                    </td>
                    <td className="py-3">
                      <button
                        onClick={() => {
                          setSelectedUser(user);
                          setShowRoleChangeDialog(true);
                        }}
                        className="hover:opacity-75 transition-opacity"
                      >
                        {getUserRoleBadge(user)}
                      </button>
                    </td>
                    <td className="py-3 text-sm text-gray-500">
                      {user.createdAt ? new Date(user.createdAt).toLocaleDateString('pt-BR') : 'N/A'}
                    </td>
                    <td className="py-3 text-sm text-gray-500">
                      {user.lastActivity || user.lastLoginAt 
                        ? new Date(user.lastActivity || user.lastLoginAt).toLocaleString('pt-BR')
                        : 'Nunca'
                      }
                    </td>
                    <td className="py-3">
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedUser(user);
                            setShowUserDetailsDialog(true);
                          }}
                          title="Ver detalhes"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>

                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="sm">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => {
                                setSelectedUser(user);
                                setShowForceLogoutDialog(true);
                              }}
                            >
                              <LogOut className="h-4 w-4 mr-2" />
                              Forçar Logout
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => {
                                setSelectedUser(user);
                                setShowResetPasswordDialog(true);
                              }}
                            >
                              <Key className="h-4 w-4 mr-2" />
                              Resetar Senha
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => {
                                setSelectedUser(user);
                                setShowImpersonateDialog(true);
                              }}
                            >
                              <UserCheck className="h-4 w-4 mr-2" />
                              Personificar
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => {
                                setSelectedUser(user);
                                setShowDeleteDialog(true);
                              }}
                              className="text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Excluir
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-t">
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-500">
                Mostrando {((currentPage - 1) * itemsPerPage) + 1} a {Math.min(currentPage * itemsPerPage, sortedUsers.length)} de {sortedUsers.length} usuários
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(1)}
                disabled={currentPage === 1}
              >
                <ArrowUp className="h-4 w-4 rotate-[-90deg]" />
                <ArrowUp className="h-4 w-4 rotate-[-90deg]" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
              >
                <ArrowUp className="h-4 w-4 rotate-[-90deg]" />
                Anterior
              </Button>

              <div className="flex space-x-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (currentPage <= 3) {
                    pageNum = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = currentPage - 2 + i;
                  }

                  return (
                    <Button
                      key={pageNum}
                      variant={pageNum === currentPage ? "default" : "outline"}
                      size="sm"
                      onClick={() => setCurrentPage(pageNum)}
                      className="min-w-[40px]"
                    >
                      {pageNum}
                    </Button>
                  );
                })}
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
              >
                Próxima
                <ArrowUp className="h-4 w-4 rotate-[90deg]" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(totalPages)}
                disabled={currentPage === totalPages}
              >
                <ArrowUp className="h-4 w-4 rotate-[90deg]" />
                <ArrowUp className="h-4 w-4 rotate-[90deg]" />
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* User Details Dialog */}
      <Dialog open={showUserDetailsDialog} onOpenChange={setShowUserDetailsDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalhes do Usuário: {selectedUser?.name || selectedUser?.email}</DialogTitle>
          </DialogHeader>

          {isLoadingDetails ? (
            <div className="flex items-center justify-center h-48">
              <RefreshCw className="h-8 w-8 animate-spin text-blue-600" />
            </div>
          ) : (
            <>
              <div className="flex gap-2 border-b pb-2 mb-4">
                {['profile', 'activity', 'sessions', 'logs', 'api'].map((tab) => (
                  <Button
                    key={tab}
                    variant={userDetailsTab === tab ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setUserDetailsTab(tab)}
                  >
                    {tab === 'profile' && 'Perfil'}
                    {tab === 'activity' && 'Atividade'}
                    {tab === 'sessions' && 'Sessões'}
                    {tab === 'logs' && 'Logs'}
                    {tab === 'api' && 'API'}
                  </Button>
                ))}
              </div>

              {userDetailsTab === 'profile' && (
                <div className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Informações Básicas</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-sm font-medium text-gray-600">Nome</Label>
                        <p className="text-sm">{selectedUser?.name || 'Não informado'}</p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-gray-600">Email</Label>
                        <p className="text-sm">{selectedUser?.email}</p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-gray-600">Empresa</Label>
                        <p className="text-sm">{selectedUser?.company || 'Não informado'}</p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-gray-600">ID</Label>
                        <p className="text-sm font-mono">{selectedUser?.id}</p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-gray-600">Status</Label>
                        <p className="text-sm">{getUserStatusBadge(selectedUser)}</p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-gray-600">Função</Label>
                        <p className="text-sm">{getUserRoleBadge(selectedUser)}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                </div>
              )}

              {userDetailsTab === 'activity' && (
                <div className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Atividade Recente</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-gray-500">
                      Funcionalidade em desenvolvimento...
                    </p>
                  </CardContent>
                </Card>
                </div>
              )}

              {userDetailsTab === 'sessions' && (
                <div className="space-y-4">
                <LoginSharingSection />
                </div>
              )}

              {userDetailsTab === 'logs' && (
                <div className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Logs de Auditoria</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-gray-500">
                      Funcionalidade em desenvolvimento...
                    </p>
                  </CardContent>
                </Card>
                </div>
              )}

              {userDetailsTab === 'api' && (
                <div className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Uso da API</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-gray-500">
                      Funcionalidade em desenvolvimento...
                    </p>
                  </CardContent>
                </Card>
                </div>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Role Change Dialog */}
      <Dialog open={showRoleChangeDialog} onOpenChange={setShowRoleChangeDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Alterar Função do Usuário</DialogTitle>
            <DialogDescription>
              Alterar função de {selectedUser?.name} ({selectedUser?.email})
              <br />
              <span className="text-sm text-muted-foreground">
                Função atual: {getRoleDisplayName(selectedUser?.role || 'user')}
              </span>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nova Função</Label>
              <Select value={newRole} onValueChange={setNewRole}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma função" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-slate-400 rounded-full"></div>
                      Free - Usuário padrão
                    </div>
                  </SelectItem>
                  <SelectItem value="tester">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-yellow-400 rounded-full"></div>
                      Tester - Acesso temporário (7 dias)
                    </div>
                  </SelectItem>
                  <SelectItem value="pro">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                      PRO - Acesso completo
                    </div>
                  </SelectItem>
                  <SelectItem value="apoiador">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                      Apoiador - Acesso completo gratuito para parceiros
                    </div>
                  </SelectItem>
                  <SelectItem value="admin">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-red-400 rounded-full"></div>
                      Admin - Administrador
                    </div>
                  </SelectItem>
                  <SelectItem value="pending_payment">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-orange-400 rounded-full"></div>
                      Pendente de Pagamento - Acesso limitado
                    </div>
                  </SelectItem>
                  {(currentUser?.role === 'superadmin') && (
                    <SelectItem value="superadmin">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-purple-400 rounded-full"></div>
                        Super Admin - Controle total
                      </div>
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Motivo da Alteração</Label>
              <Input
                placeholder="Descreva o motivo da alteração..."
                value={changeReason}
                onChange={(e) => setChangeReason(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <Button 
                className="flex-1"
                onClick={() => {
                  if (selectedUser && newRole && changeReason) {
                    handleRoleChange(selectedUser.id, newRole, changeReason);
                    setShowRoleChangeDialog(false);
                    setNewRole('');
                    setChangeReason('');
                  }
                }}
                disabled={!newRole || !changeReason}
              >
                Confirmar
              </Button>
              <Button 
                variant="outline"
                onClick={() => {
                  setShowRoleChangeDialog(false);
                  setNewRole('');
                  setChangeReason('');
                }}
              >
                Cancelar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Status Change Dialog */}
      <Dialog open={showStatusChangeDialog} onOpenChange={setShowStatusChangeDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Alterar Status do Usuário</DialogTitle>
            <DialogDescription>
              Alterar status de {selectedUser?.name} ({selectedUser?.email})
              <br />
              <span className="text-sm text-muted-foreground">
                Status atual: {selectedUser?.status || 'approved'}
              </span>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Novo Status</Label>
              <Select value={newStatus} onValueChange={setNewStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="approved">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                      Ativo - Usuário pode acessar normalmente
                    </div>
                  </SelectItem>
                  <SelectItem value="suspended">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-red-400 rounded-full"></div>
                      Suspenso - Acesso temporariamente bloqueado
                    </div>
                  </SelectItem>
                  <SelectItem value="disabled">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                      Desativado - Conta permanentemente desabilitada
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {(newStatus === 'suspended' || newStatus === 'disabled') && (
              <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 rounded-lg">
                <p className="text-sm text-yellow-700 dark:text-yellow-300">
                  ⚠️ <strong>Atenção:</strong> Esta ação irá {newStatus === 'suspended' ? 'suspender' : 'desativar'} o usuário e invalidar todas as suas sessões ativas.
                </p>
              </div>
            )}
            <div>
              <Label>Motivo da Alteração</Label>
              <Input
                placeholder="Descreva o motivo da alteração..."
                value={changeReason}
                onChange={(e) => setChangeReason(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <Button 
                className="flex-1"
                onClick={() => {
                  if (selectedUser && newStatus && changeReason) {
                    handleStatusChange(selectedUser.id, newStatus, changeReason);
                    setShowStatusChangeDialog(false);
                    setNewStatus('');
                    setChangeReason('');
                  }
                }}
                disabled={!newStatus || !changeReason}
              >
                Confirmar
              </Button>
              <Button 
                variant="outline"
                onClick={() => {
                  setShowStatusChangeDialog(false);
                  setNewStatus('');
                  setChangeReason('');
                }}
              >
                Cancelar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Reset Password Dialog */}
      <AlertDialog open={showResetPasswordDialog} onOpenChange={setShowResetPasswordDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Resetar Senha</AlertDialogTitle>
            <AlertDialogDescription>
              Enviar um link de redefinição de senha para {selectedUser?.email}?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (selectedUser) {
                  handleResetPassword(selectedUser.id);
                  setShowResetPasswordDialog(false);
                }
              }}
            >
              Enviar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Impersonate Dialog */}
      <AlertDialog open={showImpersonateDialog} onOpenChange={setShowImpersonateDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Personificar Usuário</AlertDialogTitle>
            <AlertDialogDescription>
              Você será logado como {selectedUser?.name} ({selectedUser?.email}) para fins de depuração.
              Esta ação será registrada nos logs de auditoria.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (selectedUser) {
                  handleImpersonate(selectedUser.id);
                  setShowImpersonateDialog(false);
                }
              }}
              className="bg-orange-600 hover:bg-orange-700"
            >
              Personificar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o usuário <strong>{selectedUser?.name}</strong> ({selectedUser?.email})?
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (selectedUser) {
                  handleDeleteUser(selectedUser.id);
                  setShowDeleteDialog(false);
                  setSelectedUser(null);
                }
              }}
              className="bg-red-600 hover:bg-red-700"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Force Logout Confirmation Dialog */}
      <AlertDialog open={showForceLogoutDialog} onOpenChange={setShowForceLogoutDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Forçar Logout</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja desconectar o usuário <strong>{selectedUser?.name}</strong> ({selectedUser?.email}) 
              de todas as sessões ativas?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (selectedUser) {
                  handleForceLogout(selectedUser.id);
                  setShowForceLogoutDialog(false);
                  setSelectedUser(null);
                }
              }}
            >
              Forçar Logout
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* User Diagnostic Dialog */}
      <Dialog open={showDiagnosticDialog} onOpenChange={setShowDiagnosticDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Diagnóstico de Usuário</DialogTitle>
            <DialogDescription>
              Digite o email do usuário para ver informações detalhadas
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              placeholder="usuario@exemplo.com"
              value={diagnosticEmail}
              onChange={(e) => setDiagnosticEmail(e.target.value)}
              type="email"
            />
            <div className="flex gap-2">
              <Button 
                className="flex-1"
                onClick={() => {
                  if (diagnosticEmail) {
                    setLocation('/admin/user-diagnostic?email=' + encodeURIComponent(diagnosticEmail));
                    setShowDiagnosticDialog(false);
                    setDiagnosticEmail('');
                  }
                }}
                disabled={!diagnosticEmail}
              >
                <Search className="h-4 w-4 mr-2" />
                Diagnosticar
              </Button>
              <Button 
                variant="outline"
                onClick={() => {
                  setShowDiagnosticDialog(false);
                  setDiagnosticEmail('');
                }}
              >
                Cancelar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

// 4. Emergency Alerts Section
