import { useState, useMemo } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { 
  AlertTriangle,
  Clock,
  CheckCircle,
  XCircle,
  DollarSign,
  Calendar,
  Users,
  Search,
  RefreshCw,
  CreditCard,
  Mail,
  Phone,
  Edit,
  Eye,
  ArrowLeft,
  AlertCircle,
  Ban,
  Play,
  X,
  ChevronLeft,
  Menu,
  BarChart3,
  UserPlus,
  Globe,
  Key,
  MessageSquare,
  Bell,
  MessageCircle,
  Star,
  Building2,
  Settings,
  User
} from 'lucide-react';
import { useLocation } from 'wouter';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

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
  daysWithoutPayment: number;
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

const formatDate = (dateString?: string) => {
  if (!dateString) return 'Não definida';
  return new Date(dateString).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
};

const formatCurrency = (amount?: number) => {
  if (!amount) return 'R$ 0,00';
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(Number(amount));
};

export default function AdminCobrancasPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState<SubscriptionData | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const { data: subscriptionsData, isLoading, refetch } = useQuery<SubscriptionResponse>({
    queryKey: ['/api/admin/subscriptions', { limit: 1000 }],
    queryFn: () => apiRequest('/api/admin/subscriptions?limit=1000'),
    refetchInterval: 30000, // Atualiza a cada 30 segundos
  });

  // Mutation para ações de assinatura
  const actionMutation = useMutation({
    mutationFn: ({ userId, action, data }: { userId: number; action: string; data?: any }) => {
      return apiRequest(`/api/admin/subscriptions/${userId}/${action}`, {
        method: 'PATCH',
        body: JSON.stringify(data || {}),
      });
    },
    onSuccess: (data: any) => {
      toast({
        title: 'Sucesso',
        description: data.message || 'Ação executada com sucesso',
      });
      refetch();
    },
    onError: (error: any) => {
      toast({
        title: 'Erro',
        description: error.message || 'Erro ao executar ação',
        variant: 'destructive',
      });
    },
  });

  const subscriptions = subscriptionsData?.data?.subscriptions || [];

  // Filtrar por busca
  const filteredSubscriptions = useMemo(() => {
    if (!searchTerm) return subscriptions;
    
    const term = searchTerm.toLowerCase();
    return subscriptions.filter(sub => 
      sub.name.toLowerCase().includes(term) ||
      sub.email.toLowerCase().includes(term) ||
      sub.phone?.toLowerCase().includes(term) ||
      sub.subscriptionNickname?.toLowerCase().includes(term)
    );
  }, [subscriptions, searchTerm]);

  // Categorizar assinaturas
  const categorizedSubscriptions = useMemo(() => {
    const vencidas = filteredSubscriptions.filter(s => s.daysUntilRenewal < 0);
    const hoje = filteredSubscriptions.filter(s => s.daysUntilRenewal === 0);
    const um_dia = filteredSubscriptions.filter(s => s.daysUntilRenewal === 1);
    const dois_dias = filteredSubscriptions.filter(s => s.daysUntilRenewal === 2);
    const tres_sete_dias = filteredSubscriptions.filter(s => s.daysUntilRenewal >= 3 && s.daysUntilRenewal <= 7);
    const semDadosPagamento = filteredSubscriptions.filter(s => !s.renewalDate || !s.paymentDate);
    
    return {
      vencidas,
      hoje,
      um_dia,
      dois_dias,
      tres_sete_dias,
      semDadosPagamento,
    };
  }, [filteredSubscriptions]);

  const stats = useMemo(() => {
    const total = filteredSubscriptions.length;
    const totalVencidas = categorizedSubscriptions.vencidas.length;
    const totalUrgentes = categorizedSubscriptions.hoje.length + categorizedSubscriptions.um_dia.length;
    const totalAtencao = categorizedSubscriptions.dois_dias.length + categorizedSubscriptions.tres_sete_dias.length;
    const semDados = categorizedSubscriptions.semDadosPagamento.length;
    
    return { total, totalVencidas, totalUrgentes, totalAtencao, semDados };
  }, [filteredSubscriptions, categorizedSubscriptions]);

  const handleMarkPending = (userId: number) => {
    actionMutation.mutate({ userId, action: 'mark-pending' });
  };

  const handleActivate = (userId: number) => {
    actionMutation.mutate({ userId, action: 'activate' });
  };

  const handleSuspend = (userId: number) => {
    actionMutation.mutate({ userId, action: 'suspend', data: { reason: 'Suspenso por falta de pagamento' } });
  };

  const handleViewDetails = (subscription: SubscriptionData) => {
    setSelectedUser(subscription);
    setIsEditDialogOpen(true);
  };

  const SubscriptionRow = ({ subscription }: { subscription: SubscriptionData }) => {
    const getDaysColor = (days: number) => {
      if (days < 0) return 'text-red-600 dark:text-red-400';
      if (days === 0) return 'text-orange-600 dark:text-orange-400';
      if (days <= 2) return 'text-yellow-600 dark:text-yellow-400';
      return 'text-blue-600 dark:text-blue-400';
    };

    const getDaysBadge = (days: number) => {
      if (days < 0) return <Badge variant="destructive">Vencida há {Math.abs(days)} dias</Badge>;
      if (days === 0) return <Badge className="bg-orange-500">Vence hoje</Badge>;
      if (days === 1) return <Badge className="bg-yellow-500">Vence amanhã</Badge>;
      return <Badge className="bg-blue-500">Vence em {days} dias</Badge>;
    };

    return (
      <TableRow key={subscription.userId} data-testid={`row-subscription-${subscription.userId}`}>
        <TableCell className="font-medium">
          <div>
            <div className="font-semibold">{subscription.name}</div>
            {subscription.subscriptionNickname && (
              <div className="text-xs text-muted-foreground">{subscription.subscriptionNickname}</div>
            )}
          </div>
        </TableCell>
        <TableCell>
          <div className="text-sm">
            <div className="flex items-center gap-1">
              <Mail className="h-3 w-3" />
              {subscription.email}
            </div>
            {subscription.phone && (
              <div className="flex items-center gap-1 text-muted-foreground">
                <Phone className="h-3 w-3" />
                {subscription.phone}
              </div>
            )}
          </div>
        </TableCell>
        <TableCell>
          <Badge variant="outline">{subscription.subscriptionPlan}</Badge>
        </TableCell>
        <TableCell>
          <div className="text-sm">
            <div>{formatDate(subscription.renewalDate)}</div>
            {subscription.paymentDate && (
              <div className="text-xs text-muted-foreground">
                Pago: {formatDate(subscription.paymentDate)}
              </div>
            )}
          </div>
        </TableCell>
        <TableCell className={getDaysColor(subscription.daysUntilRenewal)}>
          {getDaysBadge(subscription.daysUntilRenewal)}
        </TableCell>
        <TableCell>
          {subscription.paymentAmount ? formatCurrency(subscription.paymentAmount) : '-'}
        </TableCell>
        <TableCell>
          <div className="flex gap-1">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => handleViewDetails(subscription)}
              data-testid={`button-view-${subscription.userId}`}
            >
              <Eye className="h-4 w-4" />
            </Button>
            {subscription.status === 'pending_payment' ? (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => handleActivate(subscription.userId)}
                disabled={actionMutation.isPending}
                data-testid={`button-activate-${subscription.userId}`}
              >
                <Play className="h-4 w-4 text-green-600" />
              </Button>
            ) : (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => handleMarkPending(subscription.userId)}
                disabled={actionMutation.isPending}
                data-testid={`button-pending-${subscription.userId}`}
              >
                <AlertCircle className="h-4 w-4 text-yellow-600" />
              </Button>
            )}
            <Button
              size="sm"
              variant="ghost"
              onClick={() => handleSuspend(subscription.userId)}
              disabled={actionMutation.isPending}
              data-testid={`button-suspend-${subscription.userId}`}
            >
              <Ban className="h-4 w-4 text-red-600" />
            </Button>
          </div>
        </TableCell>
      </TableRow>
    );
  };

  const SubscriptionTable = ({ subscriptions, title, description }: { 
    subscriptions: SubscriptionData[]; 
    title: string;
    description: string;
  }) => {
    if (subscriptions.length === 0) {
      return (
        <Card>
          <CardHeader>
            <CardTitle>{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8 text-muted-foreground">
              <CheckCircle className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>Nenhuma assinatura nesta categoria</p>
            </div>
          </CardContent>
        </Card>
      );
    }

    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            {title}
            <Badge variant="secondary">{subscriptions.length}</Badge>
          </CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome/Apelido</TableHead>
                  <TableHead>Contato</TableHead>
                  <TableHead>Plano</TableHead>
                  <TableHead>Data Renovação</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {subscriptions.map(sub => (
                  <SubscriptionRow key={sub.userId} subscription={sub} />
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    );
  };

  const menuItems = [
    { value: 'dashboard', label: 'Dashboard', icon: <BarChart3 className="h-5 w-5" /> },
    { value: 'users', label: 'Aprovação', icon: <UserPlus className="h-5 w-5" /> },
    { value: 'manage-users', label: 'Usuários', icon: <Users className="h-5 w-5" /> },
    { value: 'sessions', label: 'Sessões', icon: <Globe className="h-5 w-5" /> },
    { value: 'emergency', label: 'Emergência', icon: <AlertTriangle className="h-5 w-5" /> },
    { value: 'keys', label: 'API Keys', icon: <Key className="h-5 w-5" /> },
    { value: 'feedback', label: 'Feedback', icon: <MessageSquare className="h-5 w-5" /> },
    { value: 'alerts', label: 'Alertas', icon: <Bell className="h-5 w-5" /> },
    { value: 'whatsapp', label: 'WhatsApp', icon: <MessageCircle className="h-5 w-5" /> },
    { value: 'ratings', label: 'Avaliações', icon: <Star className="h-5 w-5" /> },
    { value: 'suppliers', label: 'Fornecedores', icon: <Building2 className="h-5 w-5" /> },
    { value: 'subscriptions', label: 'Assinaturas', icon: <CreditCard className="h-5 w-5" /> },
    { value: 'cobrancas', label: 'Cobranças', icon: <DollarSign className="h-5 w-5" />, isActive: true },
    { value: 'settings', label: 'Configurações', icon: <Settings className="h-5 w-5" /> },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`fixed top-0 left-0 z-50 h-screen w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-700 transform transition-transform duration-200 ease-in-out ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0`}>
        <div className="flex flex-col h-full">
          {/* Sidebar Header */}
          <div className="p-4 border-b border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">Admin Panel</h2>
              <Button
                variant="ghost"
                size="sm"
                className="lg:hidden"
                onClick={() => setSidebarOpen(false)}
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              Sistema Online
            </div>
          </div>

          {/* Navigation Menu */}
          <nav className="flex-1 overflow-y-auto p-2 space-y-1">
            {menuItems.map((item) => (
              <button
                key={item.value}
                onClick={() => {
                  if (item.value === 'cobrancas') {
                    setSidebarOpen(false);
                  } else {
                    setLocation('/admin');
                    setSidebarOpen(false);
                  }
                }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                  item.isActive
                    ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 font-medium'
                    : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                {item.icon}
                <span>{item.label}</span>
              </button>
            ))}
            
            <div className="pt-2 mt-2 border-t border-slate-200 dark:border-slate-700">
              <button
                onClick={() => setLocation('/admin/user-diagnostic')}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <User className="h-5 w-5" />
                <span>Diagnóstico</span>
              </button>
            </div>
          </nav>

          {/* Sidebar Footer */}
          <div className="p-4 border-t border-slate-200 dark:border-slate-700">
            <Button
              variant="outline"
              onClick={() => setLocation('/buscador')}
              className="w-full flex items-center justify-center gap-2"
            >
              <ChevronLeft className="h-4 w-4" />
              Voltar ao Dashboard
            </Button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="lg:pl-64">
        {/* Top Bar */}
        <header className="sticky top-0 z-30 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-center justify-between px-4 py-3">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                className="lg:hidden"
                onClick={() => setSidebarOpen(true)}
              >
                <Menu className="h-5 w-5" />
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Gestão de Cobranças</h1>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Controle de vencimentos e cobranças de assinaturas
                </p>
              </div>
            </div>
            <Button
              onClick={() => refetch()}
              disabled={isLoading}
              data-testid="button-refresh"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Atualizar
            </Button>
          </div>
        </header>

        {/* Page Content */}
        <div className="p-6">
          <div className="max-w-7xl mx-auto space-y-6">

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
          <Card data-testid="card-stat-total">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
              <p className="text-xs text-muted-foreground">Assinaturas monitoradas</p>
            </CardContent>
          </Card>

          <Card data-testid="card-stat-vencidas">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Vencidas</CardTitle>
              <XCircle className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{stats.totalVencidas}</div>
              <p className="text-xs text-muted-foreground">Requerem ação imediata</p>
            </CardContent>
          </Card>

          <Card data-testid="card-stat-urgentes">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Urgentes</CardTitle>
              <AlertTriangle className="h-4 w-4 text-orange-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">{stats.totalUrgentes}</div>
              <p className="text-xs text-muted-foreground">Hoje e amanhã</p>
            </CardContent>
          </Card>

          <Card data-testid="card-stat-atencao">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Atenção</CardTitle>
              <Clock className="h-4 w-4 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">{stats.totalAtencao}</div>
              <p className="text-xs text-muted-foreground">Próximos 2-7 dias</p>
            </CardContent>
          </Card>

          <Card data-testid="card-stat-sem-dados">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Sem Dados</CardTitle>
              <AlertCircle className="h-4 w-4 text-gray-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-600">{stats.semDados}</div>
              <p className="text-xs text-muted-foreground">Sem data de pagamento</p>
            </CardContent>
          </Card>
        </div>

        {/* Search */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Search className="h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome, email, telefone ou apelido..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="flex-1"
                data-testid="input-search"
              />
            </div>
          </CardContent>
        </Card>

        {/* Tabs com categorias */}
        <Tabs defaultValue="vencidas" className="space-y-4">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="vencidas" data-testid="tab-vencidas">
              Vencidas ({categorizedSubscriptions.vencidas.length})
            </TabsTrigger>
            <TabsTrigger value="hoje" data-testid="tab-hoje">
              Hoje ({categorizedSubscriptions.hoje.length})
            </TabsTrigger>
            <TabsTrigger value="1dia" data-testid="tab-1dia">
              1 Dia ({categorizedSubscriptions.um_dia.length})
            </TabsTrigger>
            <TabsTrigger value="2dias" data-testid="tab-2dias">
              2 Dias ({categorizedSubscriptions.dois_dias.length})
            </TabsTrigger>
            <TabsTrigger value="3-7dias" data-testid="tab-3-7dias">
              3-7 Dias ({categorizedSubscriptions.tres_sete_dias.length})
            </TabsTrigger>
            <TabsTrigger value="sem-dados" data-testid="tab-sem-dados">
              Sem Dados ({categorizedSubscriptions.semDadosPagamento.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="vencidas">
            <SubscriptionTable
              subscriptions={categorizedSubscriptions.vencidas}
              title="Assinaturas Vencidas"
              description="Assinaturas que já passaram da data de renovação e precisam de atenção imediata"
            />
          </TabsContent>

          <TabsContent value="hoje">
            <SubscriptionTable
              subscriptions={categorizedSubscriptions.hoje}
              title="Vencendo Hoje"
              description="Assinaturas que vencem hoje"
            />
          </TabsContent>

          <TabsContent value="1dia">
            <SubscriptionTable
              subscriptions={categorizedSubscriptions.um_dia}
              title="Vencendo em 1 Dia"
              description="Assinaturas que vencem amanhã"
            />
          </TabsContent>

          <TabsContent value="2dias">
            <SubscriptionTable
              subscriptions={categorizedSubscriptions.dois_dias}
              title="Vencendo em 2 Dias"
              description="Assinaturas que vencem daqui a 2 dias"
            />
          </TabsContent>

          <TabsContent value="3-7dias">
            <SubscriptionTable
              subscriptions={categorizedSubscriptions.tres_sete_dias}
              title="Vencendo em 3-7 Dias"
              description="Assinaturas que vencem entre 3 e 7 dias"
            />
          </TabsContent>

          <TabsContent value="sem-dados">
            <SubscriptionTable
              subscriptions={categorizedSubscriptions.semDadosPagamento}
              title="Sem Dados de Pagamento"
              description="Usuários que não possuem data de pagamento ou renovação cadastrada"
            />
          </TabsContent>
        </Tabs>
          </div>
        </div>
      </div>

      {/* Dialog de detalhes */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Detalhes da Assinatura</DialogTitle>
            <DialogDescription>
              Informações completas sobre a assinatura de {selectedUser?.name}
            </DialogDescription>
          </DialogHeader>
          {selectedUser && (
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium">Nome</Label>
                  <p className="text-sm text-muted-foreground">{selectedUser.name}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Apelido</Label>
                  <p className="text-sm text-muted-foreground">{selectedUser.subscriptionNickname || '-'}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium">Email</Label>
                  <p className="text-sm text-muted-foreground">{selectedUser.email}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Telefone</Label>
                  <p className="text-sm text-muted-foreground">{selectedUser.phone || '-'}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium">Plano</Label>
                  <p className="text-sm text-muted-foreground">{selectedUser.subscriptionPlan}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Status</Label>
                  <p className="text-sm text-muted-foreground">{selectedUser.paymentStatus}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium">Data de Pagamento</Label>
                  <p className="text-sm text-muted-foreground">{formatDate(selectedUser.paymentDate)}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Data de Renovação</Label>
                  <p className="text-sm text-muted-foreground">{formatDate(selectedUser.renewalDate)}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium">Dias até Renovação</Label>
                  <p className="text-sm text-muted-foreground">{selectedUser.daysUntilRenewal} dias</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Valor</Label>
                  <p className="text-sm text-muted-foreground">{formatCurrency(selectedUser.paymentAmount)}</p>
                </div>
              </div>
              <div>
                <Label className="text-sm font-medium">Método de Pagamento</Label>
                <p className="text-sm text-muted-foreground">{selectedUser.paymentMethod || '-'}</p>
              </div>
              {selectedUser.notes && (
                <div>
                  <Label className="text-sm font-medium">Notas</Label>
                  <p className="text-sm text-muted-foreground">{selectedUser.notes}</p>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Fechar
            </Button>
            <Button onClick={() => {
              if (selectedUser) {
                setLocation(`/admin`);
              }
            }}>
              Editar no Admin
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
