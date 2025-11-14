import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { auth } from '@/lib/firebase';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { 
  Users, 
  MapPin, 
  Wifi, 
  Clock, 
  AlertTriangle, 
  CheckCircle, 
  ChevronDown,
  ChevronUp,
  Search,
  Filter,
  Settings
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Session {
  sessionId: number;
  ipAddress: string;
  city: string | null;
  country: string | null;
  latitude: string | null;
  longitude: string | null;
  deviceInfo: string | null;
  connectedAt: string;
  lastActivityAt: string;
  distanceFromFirst?: number;
}

interface UserWithSharing {
  userId: number;
  userName: string;
  userEmail: string;
  userPhone: string | null;
  userPlan: string;
  maxConcurrentIps: number;
  totalSessions: number;
  differentIPs: number;
  differentLocations: number;
  sessions: Session[];
  maxDistance: number;
  isSuspicious: boolean;
}

interface LoginSharingData {
  totalUsers: number;
  usersWithMultipleSessions: number;
  suspiciousUsers: number;
  users: UserWithSharing[];
}

export const LoginSharingSection = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showOnlySuspicious, setShowOnlySuspicious] = useState(false);
  const [expandedUsers, setExpandedUsers] = useState<Set<number>>(new Set());
  const [ipLimitDialogOpen, setIpLimitDialogOpen] = useState<number | null>(null);
  const [newIpLimit, setNewIpLimit] = useState<number>(5);
  const { toast } = useToast();
  
  // Garante que o Firebase auth está pronto antes de fazer as queries
  const isAuthReady = auth.currentUser !== null;

  // Mutation para atualizar localizações Unknown
  const refreshLocationsMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest('/api/admin/login-sharing/refresh-geolocation', {
        method: 'POST',
      });
    },
    onSuccess: (data: any) => {
      toast({
        title: 'Localizações atualizadas',
        description: data.message || 'Localizações foram atualizadas com sucesso',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/login-sharing'] });
    },
    onError: (error: any) => {
      toast({
        title: 'Erro ao atualizar',
        description: error.message || 'Não foi possível atualizar as localizações',
        variant: 'destructive',
      });
    },
  });

  // Mutation para desconectar usuários suspeitos
  const disconnectSuspiciousMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest('/api/admin/login-sharing/disconnect-suspicious', {
        method: 'POST',
      });
    },
    onSuccess: (data: any) => {
      toast({
        title: 'Usuários desconectados',
        description: data.message || 'Usuários suspeitos foram desconectados',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/login-sharing'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/login-sharing/stats'] });
    },
    onError: (error: any) => {
      toast({
        title: 'Erro ao desconectar',
        description: error.message || 'Não foi possível desconectar os usuários',
        variant: 'destructive',
      });
    },
  });

  // Mutation para ajustar limite de IPs de um usuário
  const setIpLimitMutation = useMutation({
    mutationFn: async ({ userId, maxConcurrentIps }: { userId: number; maxConcurrentIps: number }) => {
      return await apiRequest(`/api/admin/users/${userId}/set-ip-limit`, {
        method: 'POST',
        body: JSON.stringify({ maxConcurrentIps }),
        headers: { 'Content-Type': 'application/json' },
      });
    },
    onSuccess: (data: any) => {
      toast({
        title: 'Limite atualizado',
        description: data.message || 'Limite de IPs foi atualizado com sucesso',
      });
      setIpLimitDialogOpen(null);
      queryClient.invalidateQueries({ queryKey: ['/api/admin/login-sharing'] });
    },
    onError: (error: any) => {
      toast({
        title: 'Erro ao atualizar limite',
        description: error.message || 'Não foi possível atualizar o limite de IPs',
        variant: 'destructive',
      });
    },
  });

  const { data, isLoading, refetch } = useQuery<{ success: boolean; data: LoginSharingData }>({
    queryKey: ['/api/admin/login-sharing'],
    queryFn: async () => {
      return await apiRequest('/api/admin/login-sharing');
    },
    refetchInterval: 30000, // Atualiza a cada 30 segundos
    enabled: isAuthReady, // Só executa quando autenticado
  });

  const { data: stats } = useQuery<{ success: boolean; data: { totalSessions: number; uniqueUsers: number; uniqueIPs: number; uniqueCountries: number } }>({
    queryKey: ['/api/admin/login-sharing/stats'],
    queryFn: async () => {
      return await apiRequest('/api/admin/login-sharing/stats');
    },
    refetchInterval: 30000,
    enabled: isAuthReady, // Só executa quando autenticado
  });

  const toggleUserExpansion = (userId: number) => {
    const newExpanded = new Set(expandedUsers);
    if (newExpanded.has(userId)) {
      newExpanded.delete(userId);
    } else {
      newExpanded.add(userId);
    }
    setExpandedUsers(newExpanded);
  };

  const filteredUsers = data?.data?.users?.filter(user => {
    const matchesSearch = !searchTerm || 
      user.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.userEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.userPhone?.includes(searchTerm);
    
    const matchesFilter = !showOnlySuspicious || user.isSuspicious;
    
    return matchesSearch && matchesFilter;
  }) || [];

  const formatLocation = (city: string | null, country: string | null) => {
    if (!city && !country) return 'Localização desconhecida';
    if (!city) return country;
    if (!country) return city;
    return `${city}, ${country}`;
  };

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
    } catch {
      return dateString;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Carregando dados de compartilhamento...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Info Card */}
      <Card className="border-blue-200 bg-blue-50 dark:bg-blue-950 dark:border-blue-800">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-blue-900 dark:text-blue-100">
            <AlertTriangle className="h-5 w-5" />
            Sistema de Auditoria e Detecção de Compartilhamento
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-blue-800 dark:text-blue-200 space-y-2">
          <p className="font-medium">Como funciona:</p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li>Monitora <strong>todos os usuários</strong> com sessões ativas em tempo real</li>
            <li>Detecta automaticamente usuários acessando de <strong>múltiplos IPs</strong></li>
            <li>Identifica acessos simultâneos de <strong>localizações geograficamente distantes</strong> (&gt;100km)</li>
            <li>Marca como <strong className="text-red-600 dark:text-red-400">"Suspeito"</strong> quando detecta possível compartilhamento de conta</li>
          </ul>
          <p className="mt-3 text-xs">
            💡 Use o filtro "Apenas suspeitos" para focar em casos de compartilhamento detectado
          </p>
        </CardContent>
      </Card>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sessões Ativas</CardTitle>
            <Wifi className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.data?.totalSessions || 0}</div>
            <p className="text-xs text-muted-foreground">
              {stats?.data?.uniqueUsers || 0} usuários únicos
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Múltiplas Sessões</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data?.data?.usersWithMultipleSessions || 0}</div>
            <p className="text-xs text-muted-foreground">
              Usuários com mais de 1 sessão
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Suspeitos</CardTitle>
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{data?.data?.suspiciousUsers || 0}</div>
            <p className="text-xs text-muted-foreground">
              Possível compartilhamento
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Localizações</CardTitle>
            <MapPin className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.data?.uniqueCountries || 0}</div>
            <p className="text-xs text-muted-foreground">
              Países diferentes
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <Label htmlFor="search">Buscar usuário</Label>
              <div className="relative mt-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Nome, email ou telefone..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                  data-testid="input-search-user"
                />
              </div>
            </div>
            
            <div className="flex items-end gap-2">
              <Button
                variant={showOnlySuspicious ? 'default' : 'outline'}
                onClick={() => setShowOnlySuspicious(!showOnlySuspicious)}
                data-testid="button-filter-suspicious"
              >
                <AlertTriangle className="h-4 w-4 mr-2" />
                Apenas suspeitos
              </Button>
              <Button
                variant="outline"
                onClick={() => refetch()}
                data-testid="button-refresh"
              >
                Atualizar
              </Button>
            </div>
          </div>
          
          {/* Ações Administrativas */}
          <div className="border-t pt-4 mt-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                variant="default"
                size="sm"
                onClick={() => refreshLocationsMutation.mutate()}
                disabled={refreshLocationsMutation.isPending}
                className="bg-blue-600 hover:bg-blue-700"
                data-testid="button-refresh-locations"
              >
                <MapPin className="h-4 w-4 mr-2" />
                {refreshLocationsMutation.isPending ? 'Atualizando...' : 'Atualizar Localizações Unknown'}
              </Button>
              
              <Button
                variant="destructive"
                size="sm"
                onClick={() => {
                  if (confirm(`Desconectar ${data?.data?.suspiciousUsers || 0} usuários suspeitos?\n\nEsta ação irá remover todas as sessões ativas de usuários com múltiplas localizações (>100km de distância).`)) {
                    disconnectSuspiciousMutation.mutate();
                  }
                }}
                disabled={disconnectSuspiciousMutation.isPending || (data?.data?.suspiciousUsers || 0) === 0}
                data-testid="button-disconnect-suspicious"
              >
                <AlertTriangle className="h-4 w-4 mr-2" />
                {disconnectSuspiciousMutation.isPending ? 'Desconectando...' : `Desconectar Suspeitos (${data?.data?.suspiciousUsers || 0})`}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              💡 Use "Atualizar Localizações" para resolver sessões com geolocalização "Unknown". Use "Desconectar Suspeitos" para remover usuários com múltiplas localizações distantes.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Lista de usuários */}
      <Card>
        <CardHeader>
          <CardTitle>Auditoria de Sessões - Detecção de Compartilhamento</CardTitle>
          <CardDescription>
            Monitora todos os usuários com sessões ativas e identifica automaticamente aqueles acessando de múltiplas localizações.
            {filteredUsers.length > 0 && ` • ${filteredUsers.length} usuário(s) com sessões ativas`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredUsers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="font-medium mb-2">Nenhum usuário encontrado com os filtros aplicados</p>
              <p className="text-sm">
                {showOnlySuspicious 
                  ? 'Não há usuários com compartilhamento suspeito no momento. Tente remover o filtro para ver todas as sessões ativas.'
                  : 'Não há sessões ativas no momento ou os filtros não retornaram resultados.'}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredUsers.map((user) => (
                <Collapsible
                  key={user.userId}
                  open={expandedUsers.has(user.userId)}
                  onOpenChange={() => toggleUserExpansion(user.userId)}
                >
                  <Card className={user.isSuspicious ? 'border-destructive' : ''}>
                    <CollapsibleTrigger className="w-full" asChild>
                      <CardHeader className="cursor-pointer hover:bg-accent/50 transition-colors">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            {expandedUsers.has(user.userId) ? (
                              <ChevronUp className="h-5 w-5 text-muted-foreground" />
                            ) : (
                              <ChevronDown className="h-5 w-5 text-muted-foreground" />
                            )}
                            <div className="text-left">
                              <div className="flex items-center gap-2">
                                <CardTitle className="text-lg">{user.userName}</CardTitle>
                                {user.isSuspicious && (
                                  <Badge variant="destructive" className="gap-1">
                                    <AlertTriangle className="h-3 w-3" />
                                    Suspeito
                                  </Badge>
                                )}
                              </div>
                              <CardDescription className="mt-1">
                                {user.userEmail} • {user.userPhone || 'Sem telefone'}
                              </CardDescription>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="flex items-center gap-4">
                              <div>
                                <p className="text-sm font-medium">{user.totalSessions} sessão(ões)</p>
                                <p className="text-xs text-muted-foreground">
                                  {user.differentIPs} IP(s) • {user.differentLocations} local(is)
                                </p>
                              </div>
                              {user.maxDistance > 0 && (
                                <Badge variant="outline">
                                  <MapPin className="h-3 w-3 mr-1" />
                                  {user.maxDistance} km
                                </Badge>
                              )}
                              <Dialog 
                                open={ipLimitDialogOpen === user.userId} 
                                onOpenChange={(open) => setIpLimitDialogOpen(open ? user.userId : null)}
                              >
                                <DialogTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 w-8 p-0"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setNewIpLimit(user.maxConcurrentIps || 5);
                                    }}
                                    data-testid={`button-ip-limit-${user.userId}`}
                                  >
                                    <Settings className="h-4 w-4" />
                                  </Button>
                                </DialogTrigger>
                                <DialogContent onClick={(e) => e.stopPropagation()}>
                                  <DialogHeader>
                                    <DialogTitle>Ajustar Limite de IPs</DialogTitle>
                                    <DialogDescription>
                                      Configure o número máximo de IPs simultâneos permitidos para {user.userName}
                                    </DialogDescription>
                                  </DialogHeader>
                                  <div className="space-y-4 py-4">
                                    <div className="space-y-2">
                                      <Label htmlFor="ip-limit">Limite de IPs simultâneos (1-20)</Label>
                                      <Input
                                        id="ip-limit"
                                        type="number"
                                        min="1"
                                        max="20"
                                        value={newIpLimit}
                                        onChange={(e) => setNewIpLimit(parseInt(e.target.value) || 1)}
                                        data-testid="input-ip-limit"
                                      />
                                      <p className="text-xs text-muted-foreground">
                                        Limite atual: {user.maxConcurrentIps} IP(s) • Ativos agora: {user.differentIPs} IP(s)
                                      </p>
                                    </div>
                                  </div>
                                  <DialogFooter>
                                    <Button
                                      variant="outline"
                                      onClick={() => setIpLimitDialogOpen(null)}
                                      data-testid="button-cancel-ip-limit"
                                    >
                                      Cancelar
                                    </Button>
                                    <Button
                                      onClick={() => {
                                        setIpLimitMutation.mutate({ 
                                          userId: user.userId, 
                                          maxConcurrentIps: newIpLimit 
                                        });
                                      }}
                                      disabled={setIpLimitMutation.isPending}
                                      data-testid="button-save-ip-limit"
                                    >
                                      {setIpLimitMutation.isPending ? 'Salvando...' : 'Salvar'}
                                    </Button>
                                  </DialogFooter>
                                </DialogContent>
                              </Dialog>
                            </div>
                          </div>
                        </div>
                      </CardHeader>
                    </CollapsibleTrigger>
                    
                    <CollapsibleContent>
                      <CardContent className="pt-0">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>IP Address</TableHead>
                              <TableHead>Localização</TableHead>
                              <TableHead>Device</TableHead>
                              <TableHead>Conectado</TableHead>
                              <TableHead>Última Atividade</TableHead>
                              <TableHead>Distância</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {user.sessions.map((session, index) => (
                              <TableRow key={session.sessionId}>
                                <TableCell className="font-mono text-sm">
                                  {session.ipAddress}
                                </TableCell>
                                <TableCell>
                                  <div className="flex items-center gap-1">
                                    <MapPin className="h-3 w-3 text-muted-foreground" />
                                    {formatLocation(session.city, session.country)}
                                  </div>
                                </TableCell>
                                <TableCell>{session.deviceInfo || 'Unknown'}</TableCell>
                                <TableCell>
                                  <div className="flex items-center gap-1 text-xs">
                                    <Clock className="h-3 w-3" />
                                    {formatDate(session.connectedAt)}
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                    {formatDate(session.lastActivityAt)}
                                  </div>
                                </TableCell>
                                <TableCell>
                                  {index === 0 ? (
                                    <Badge variant="outline">
                                      <CheckCircle className="h-3 w-3 mr-1" />
                                      Primeira
                                    </Badge>
                                  ) : session.distanceFromFirst ? (
                                    <Badge 
                                      variant={session.distanceFromFirst > 100 ? 'destructive' : 'secondary'}
                                    >
                                      {session.distanceFromFirst} km
                                    </Badge>
                                  ) : (
                                    <span className="text-xs text-muted-foreground">-</span>
                                  )}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </CardContent>
                    </CollapsibleContent>
                  </Card>
                </Collapsible>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
