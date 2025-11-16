const EmergencyAlertsSection = () => {
  const { toast } = useToast();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false); // State for delete confirmation dialog
  const [selectedAlert, setSelectedAlert] = useState<any>(null); // State to hold the alert to be deleted
  const [alertForm, setAlertForm] = useState({
    title: '',
    message: '',
    urgency: 'medium' as 'low' | 'medium' | 'high'
  });

  // Fetch alerts using the EmergencyAlertsAdmin component's logic (or adapt here)
  // For now, let's assume we have a similar hook or can refetch data.
  // If EmergencyAlertsAdmin manages its own state, we might not need this here.
  // However, for the admin dashboard to *display* alerts, we need the data.
  // Let's fetch it directly for demonstration.

  const { data: alertsData, isLoading, refetch } = useQuery({
    queryKey: ['/api/emergency-alerts'], // Assuming this is the correct API endpoint
    refetchInterval: 60000, // Refetch every minute
    staleTime: 30000,
    retry: 3,
  });

  const alerts = alertsData?.alerts || []; // Adjust based on actual API response structure

  // Mutation to create a new alert
  const createAlertMutation = useMutation({
    mutationFn: async (alertData: typeof alertForm) => {
      const response = await apiRequest('/api/emergency-alerts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(alertData),
      });
      return response;
    },
    onSuccess: (data) => {
      toast({
        title: "Aviso Enviado!",
        description: "Aviso emergencial enviado para " + data.sentToUsers + " usuários", // Adjust based on API response
      });
      setShowCreateDialog(false);
      setAlertForm({ title: '', message: '', urgency: 'medium' });
      refetch(); // Refetch the list of alerts after creation
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Erro ao enviar aviso",
        variant: "destructive",
      });
    }
  });

  // Mutation to delete an alert
  const deleteAlertMutation = useMutation({
    mutationFn: async (alertId: number) => {
      const response = await apiRequest(`/api/emergency-alerts/${alertId}`, {
        method: 'DELETE',
      });
      return response;
    },
    onSuccess: () => {
      toast({
        title: "Aviso Excluído",
        description: "O aviso emergencial foi removido com sucesso.",
      });
      setShowDeleteDialog(false);
      setSelectedAlert(null);
      refetch(); // Refetch the list of alerts
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Erro ao excluir aviso",
        variant: "destructive",
      });
    }
  });

  // Function to handle creating an alert
  const handleCreateAlert = () => {
    if (!alertForm.title.trim() || !alertForm.message.trim()) {
      toast({
        title: "Campos obrigatórios",
        description: "Título e mensagem são obrigatórios",
        variant: "destructive",
      });
      return;
    }
    createAlertMutation.mutate(alertForm);
  };

  // Function to open the delete confirmation dialog
  const openDeleteDialog = (alert: any) => {
    setSelectedAlert(alert);
    setShowDeleteDialog(true);
  };

  // Placeholder for enabling/disabling alerts if needed
  // const toggleAlertStatusMutation = useMutation({...});

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center border-b pb-4">
          <div>
            <h2 className="text-2xl font-bold">Avisos Emergenciais</h2>
            <p className="text-slate-600 dark:text-slate-400">Envie notificações importantes para todos os usuários</p>
          </div>
          <Button disabled className="bg-red-600 hover:bg-red-700 text-white flex items-center gap-2">
            <Siren className="h-4 w-4" />
            Novo Aviso
          </Button>
        </div>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Megaphone className="h-5 w-5" />
              Carregando Avisos...
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-16 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center border-b pb-4">
        <div>
          <h2 className="text-2xl font-bold">Avisos Emergenciais</h2>
          <p className="text-slate-600 dark:text-slate-400">Envie notificações importantes para todos os usuários</p>
        </div>
        <Button 
          onClick={() => setShowCreateDialog(true)}
          className="bg-red-600 hover:bg-red-700 text-white flex items-center gap-2"
        >
          <Siren className="h-4 w-4" />
          Novo Aviso
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Megaphone className="h-5 w-5" />
            Histórico de Avisos ({alerts.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {alerts.length === 0 ? (
            <div className="text-center py-8">
              <Megaphone className="h-12 w-12 text-slate-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Nenhum aviso enviado</h3>
              <p className="text-slate-500 dark:text-slate-400">
                Clique em "Novo Aviso" para enviar sua primeira notificação emergencial
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {alerts.map((alert: any) => (
                <Card key={alert.id} className={`border-l-4 ${alert.urgency === 'high' ? 'border-l-red-500' : alert.urgency === 'medium' ? 'border-l-yellow-500' : 'border-l-blue-500'}`}>
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start">
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-lg">{alert.title}</h3>
                          <Badge variant={alert.isActive ? "outline" : "destructive"}>
                            {alert.isActive ? "Ativo" : "Inativo"}
                          </Badge>
                          <Badge className={alert.urgency === 'high' ? 'bg-red-100 text-red-700' : alert.urgency === 'medium' ? 'bg-yellow-100 text-yellow-700' : 'bg-blue-100 text-blue-700'}>
                            {alert.urgency.toUpperCase()}
                          </Badge>
                        </div>
                        <p className="text-slate-600 dark:text-slate-400">{alert.message}</p>
                        <div className="flex flex-wrap gap-4 text-sm text-slate-500">
                          <span>📊 {alert.viewCount || 0} visualizações</span>
                          <span>👤 Por: {alert.senderName || 'Admin'}</span>
                          <span>📅 {new Date(alert.sentAt).toLocaleString('pt-BR')}</span>
                        </div>
                      </div>
                      <div className="flex gap-2 items-center">
                        {/* Placeholder for Toggle action */}
                        {/* <Switch checked={alert.isActive} onCheckedChange={() => { }} /> */}
                        <Button 
                          size="sm" 
                          variant="outline" 
                          onClick={() => openDeleteDialog(alert)} 
                          className="text-red-500 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog de Criação */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <Siren className="h-5 w-5" />
              Novo Aviso Emergencial
            </DialogTitle>
            <DialogDescription>
              Este aviso será enviado instantaneamente para todos os usuários online.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="alert-title">Título do Aviso*</Label>
              <Input
                id="alert-title"
                placeholder="Ex: Manutenção Programada"
                value={alertForm.title}
                onChange={(e) => setAlertForm(prev => ({ ...prev, title: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="alert-urgency">Nível de Urgência</Label>
              <Select
                value={alertForm.urgency}
                onValueChange={(value: 'low' | 'medium' | 'high') => 
                  setAlertForm(prev => ({ ...prev, urgency: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o nível de urgência" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                      Baixa - Informativo
                    </div>
                  </SelectItem>
                  <SelectItem value="medium">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-yellow-400 rounded-full"></div>
                      Média - Importante
                    </div>
                  </SelectItem>
                  <SelectItem value="high">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-red-400 rounded-full"></div>
                      Alta - Urgente
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="alert-message">Mensagem*</Label>
              <textarea
                id="alert-message"
                className="w-full min-h-[100px] px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Digite aqui a mensagem do aviso emergencial..."
                value={alertForm.message}
                onChange={(e) => setAlertForm(prev => ({ ...prev, message: e.target.value }))}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleCreateAlert}
              disabled={createAlertMutation.isPending}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {createAlertMutation.isPending ? 'Enviando...' : 'Enviar Aviso'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de Confirmação de Exclusão */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-red-600">
              <Trash2 className="h-5 w-5" />
              Confirmar Exclusão
            </AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o aviso "{selectedAlert?.title}"?
              <br />
              <span className="text-sm text-red-600 font-medium">
                Esta ação não pode ser desfeita e removerá permanentemente o alerta e todas as suas visualizações.
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setShowDeleteDialog(false);
              setSelectedAlert(null);
            }}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (selectedAlert) {
                  deleteAlertMutation.mutate(selectedAlert.id);
                }
              }}
              disabled={deleteAlertMutation.isPending}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {deleteAlertMutation.isPending ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Excluindo...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Excluir Definitivamente
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

// 5. System Settings Section
const SystemSettingsSection = () => {
  const { toast } = useToast();
  const [settings, setSettings] = useState({
    maintenanceMode: false,
    allowNewRegistrations: true,
    maxUsersPerPlan: {
      free: 1000,
      pro: 5000,
      business: 10000
    },
    systemNotifications: true,
    emergencyContactEmail: 'admin@sistema.com'
  });

  const { data: systemSettings, isLoading, error } = useQuery({
    queryKey: ['/api/admin/system-settings'],
    retry: 3,
  });

  const updateSettingMutation = useMutation({
    mutationFn: async ({ key, value }: { key: string; value: any }) => {
      const response = await apiRequest('/api/admin/system-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, value }),
      });
      return response;
    },
    onSuccess: (data) => {
      toast({
        title: "Configuração Atualizada",
        description: "A configuração do sistema foi salva com sucesso",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Erro ao atualizar configuração",
        variant: "destructive",
        });
    }
  });

  const handleSettingChange = (key: string, value: any) => {
    setSettings(prev => ({ ...prev, [key]: value }));
    updateSettingMutation.mutate({ key, value });
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <h2 className="text-2xl font-bold">Configurações do Sistema</h2>
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-16 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="border-b pb-4">
        <h2 className="text-2xl font-bold">Configurações do Sistema</h2>
        <p className="text-slate-600 dark:text-slate-400">Gerencie configurações globais da plataforma</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Configurações Gerais */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Configurações Gerais
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label className="text-sm font-medium">Modo de Manutenção</Label>
                <p className="text-xs text-slate-500">
                  Bloqueia acesso de usuários regulares ao sistema
                </p>
              </div>
              <Switch
                checked={settings.maintenanceMode}
                onCheckedChange={(checked) => handleSettingChange('maintenanceMode', checked)}
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label className="text-sm font-medium">Novos Registros</Label>
                <p className="text-xs text-slate-500">
                  Permite que novos usuários se registrem
                </p>
              </div>
              <Switch
                checked={settings.allowNewRegistrations}
                onCheckedChange={(checked) => handleSettingChange('allowNewRegistrations', checked)}
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label className="text-sm font-medium">Notificações do Sistema</Label>
                <p className="text-xs text-slate-500">
                  Envia notificações automáticas do sistema
                </p>
              </div>
              <Switch
                checked={settings.systemNotifications}
                onCheckedChange={(checked) => handleSettingChange('systemNotifications', checked)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Limites de Usuários */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Limites por Plano
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="free-limit">Plano FREE</Label>
              <Input
                id="free-limit"
                type="number"
                value={settings.maxUsersPerPlan.free}
                onChange={(e) => handleSettingChange('maxUsersPerPlan', {
                  ...settings.maxUsersPerPlan,
                  free: parseInt(e.target.value)
                })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="pro-limit">Plano PRO</Label>
              <Input
                id="pro-limit"
                type="number"
                value={settings.maxUsersPerPlan.pro}
                onChange={(e) => handleSettingChange('maxUsersPerPlan', {
                  ...settings.maxUsersPerPlan,
                  pro: parseInt(e.target.value)
                })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="business-limit">Plano BUSINESS</Label>
              <Input
                id="business-limit"
                type="number"
                value={settings.maxUsersPerPlan.business}
                onChange={(e) => handleSettingChange('maxUsersPerPlan', {
                  ...settings.maxUsersPerPlan,
                  business: parseInt(e.target.value)
                })}
              />
            </div>
          </CardContent>
        </Card>

        {/* Configurações de Contato */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Configurações de Contato
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="emergency-email">Email de Emergência</Label>
              <Input
                id="emergency-email"
                type="email"
                value={settings.emergencyContactEmail}
                onChange={(e) => handleSettingChange('emergencyContactEmail', e.target.value)}
                placeholder="admin@sistema.com"
              />
              <p className="text-xs text-slate-500">
                Email para receber alertas críticos do sistema
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Estatísticas do Sistema */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Estatísticas do Sistema
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">99.9%</div>
                <div className="text-xs text-blue-600 dark:text-blue-400">Uptime</div>
              </div>
              <div className="text-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <div className="text-2xl font-bold text-green-600 dark:text-green-400">1.2s</div>
                <div className="text-xs text-green-600 dark:text-green-400">Resp. Média</div>
              </div>
            </div>

            <Button variant="outline" className="w-full">
              <RefreshCw className="h-4 w-4 mr-2" />
              Atualizar Estatísticas
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

const getSectionName = (section: string) => {
    const names = {
      dashboard: 'Dashboard',
      users: 'Aprovações',
      'manage-users': 'Usuários',
      emergency: 'Emergência',
      keys: 'API Keys',
      feedback: 'Feedback',
      alerts: 'Alertas',
      whatsapp: 'WhatsApp Analytics',
      ratings: 'Avaliações',
      suppliers: 'Fornecedores',
      subscriptions: 'Assinaturas',
      cobrancas: 'Cobranças',
      settings: 'Configurações'
    };
    return names[section as keyof typeof names] || section;
  };

  const getSectionIcon = (section: string) => {
    const icons = {
      dashboard: <BarChart3 className="h-4 w-4" />,
      users: <UserPlus className="h-4 w-4" />,
      'manage-users': <Users className="h-4 w-4" />,
      sessions: <Globe className="h-4 w-4" />,
      emergency: <AlertTriangle className="h-4 w-4" />,
      keys: <Key className="h-4 w-4" />,
      feedback: <MessageSquare className="h-4 w-4" />,
      alerts: <Bell className="h-4 w-4" />,
      whatsapp: <MessageCircle className="h-4 w-4" />,
      ratings: <Star className="h-4 w-4" />,
      suppliers: <Building2 className="h-4 w-4" />,
      subscriptions: <CreditCard className="h-4 w-4" />,
      cobrancas: <DollarSign className="h-4 w-4" />,
      settings: <Settings className="h-4 w-4" />
    };
    return icons[section as keyof typeof icons];
  };

