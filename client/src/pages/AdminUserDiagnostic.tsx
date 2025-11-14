
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useAuth } from '@/hooks/use-auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { AlertTriangle, Search, User, Shield, Clock, CheckCircle, XCircle, RefreshCw } from 'lucide-react';
import { useLocation } from 'wouter';

export function AdminUserDiagnosticPage() {
  const [location, setLocation] = useLocation();
  const { user } = useAuth();
  const [email, setEmail] = useState('');
  const [searchTriggered, setSearchTriggered] = useState(false);

  // Check if user is admin
  const isAdmin = user?.isAdmin === true || user?.role === 'admin' || user?.role === 'superadmin';

  // Query para buscar dados do usuário - só executa quando searchTriggered for true e email não estiver vazio
  const { data: diagnosticData, isLoading, error, refetch } = useQuery({
    queryKey: ['/api/admin/user-diagnostic', email],
    queryFn: async () => {
      if (!email) throw new Error('Email é obrigatório');
      const response = await apiRequest(`/api/admin/user-diagnostic/${encodeURIComponent(email)}`, {
        method: 'GET',
      });
      return response;
    },
    enabled: searchTriggered && !!email,
    retry: false,
  });

  const handleDiagnose = () => {
    if (!email.trim()) {
      return;
    }
    setSearchTriggered(true);
    refetch();
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleDiagnose();
    }
  };

  // Redirect non-admin users
  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="max-w-md">
          <CardContent className="p-6 text-center">
            <Shield className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Acesso Negado</h2>
            <p className="text-muted-foreground mb-4">
              Esta página é restrita a administradores.
            </p>
            <Button onClick={() => setLocation('/admin')} variant="outline">
              Voltar ao Painel Admin
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const getUserStatusBadge = (profile: any) => {
    if (!profile) return null;

    const isApproved = profile.isApproved === true;
    const needsApproval = profile.needsApproval === true;
    const isActive = profile.status === 'approved' || profile.status === 'active';

    if (isApproved && isActive) {
      return <Badge className="bg-green-100 text-green-700"><CheckCircle className="h-3 w-3 mr-1" />Ativo</Badge>;
    } else if (needsApproval || profile.status === 'pending') {
      return <Badge className="bg-yellow-100 text-yellow-700"><Clock className="h-3 w-3 mr-1" />Pendente</Badge>;
    } else {
      return <Badge className="bg-red-100 text-red-700"><XCircle className="h-3 w-3 mr-1" />Inativo</Badge>;
    }
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'superadmin':
        return <Badge className="bg-red-100 text-red-700">Super Admin</Badge>;
      case 'admin':
        return <Badge className="bg-orange-100 text-orange-700">Admin</Badge>;
      case 'pro':
        return <Badge className="bg-blue-100 text-blue-700">PRO</Badge>;
      case 'business':
        return <Badge className="bg-purple-100 text-purple-700">Business</Badge>;
      case 'tester':
        return <Badge className="bg-yellow-100 text-yellow-700">Tester</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-700">Usuário</Badge>;
    }
  };

  const getPlanBadge = (plan: string) => {
    switch (plan) {
      case 'pro':
        return <Badge className="bg-blue-100 text-blue-700">PRO</Badge>;
      case 'business':
        return <Badge className="bg-purple-100 text-purple-700">BUSINESS</Badge>;
      case 'admin':
        return <Badge className="bg-orange-100 text-orange-700">ADMIN</Badge>;
      case 'tester':
        return <Badge className="bg-yellow-100 text-yellow-700">TESTER</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-700">FREE</Badge>;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <Button 
                variant="outline" 
                onClick={() => setLocation('/admin')}
                className="flex items-center gap-2"
              >
                <Shield className="h-4 w-4" />
                Voltar ao Painel Admin
              </Button>
            </div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">
              Diagnóstico de Usuário
            </h1>
            <p className="text-slate-600 dark:text-slate-400">
              Ferramenta para diagnosticar perfis completos de usuários no sistema
            </p>
          </div>

          {/* Search Form */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Search className="h-5 w-5" />
                Buscar Usuário
              </CardTitle>
              <CardDescription>
                Digite o email do usuário para ver seus dados completos do banco de dados
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4">
                <div className="flex-1">
                  <Label htmlFor="email">Email do usuário</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="usuario@exemplo.com"
                    className="mt-1"
                  />
                </div>
                <div className="flex items-end">
                  <Button 
                    onClick={handleDiagnose} 
                    disabled={isLoading || !email.trim()}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    {isLoading ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        Buscando...
                      </>
                    ) : (
                      <>
                        <Search className="h-4 w-4 mr-2" />
                        Diagnosticar
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Error Display */}
          {error && (
            <Card className="mb-6 border-red-200 bg-red-50 dark:bg-red-900/10">
              <CardContent className="p-6">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5" />
                  <div>
                    <h3 className="font-semibold text-red-900 dark:text-red-100 mb-2">
                      Erro na Busca
                    </h3>
                    <p className="text-red-700 dark:text-red-300">
                      {error.message || 'Ocorreu um erro ao buscar o usuário'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Results Display */}
          {diagnosticData?.success && diagnosticData?.profile && (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-5 w-5" />
                    Resultado para: {diagnosticData.profile.email}
                  </CardTitle>
                  <CardDescription>
                    Dados completos do usuário no banco de dados
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* User Basic Info */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm font-medium text-slate-500">Nome</Label>
                      <p className="text-lg font-semibold">{diagnosticData.profile.name || 'Não informado'}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-slate-500">Email</Label>
                      <p className="text-lg">{diagnosticData.profile.email}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-slate-500">ID do Usuário</Label>
                      <p className="text-lg font-mono">{diagnosticData.profile.id}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-slate-500">Firebase UID</Label>
                      <p className="text-sm font-mono break-all">{diagnosticData.profile.firebaseUid}</p>
                    </div>
                  </div>

                  <Separator />

                  {/* Status and Permissions */}
                  <div>
                    <Label className="text-sm font-medium text-slate-500 mb-3 block">Status e Permissões</Label>
                    <div className="flex flex-wrap gap-2">
                      {getUserStatusBadge(diagnosticData.profile)}
                      {getRoleBadge(diagnosticData.profile.role)}
                      {getPlanBadge(diagnosticData.profile.subscriptionPlan)}
                      {diagnosticData.profile.isAdmin && (
                        <Badge className="bg-red-100 text-red-700">
                          <Shield className="h-3 w-3 mr-1" />
                          Admin
                        </Badge>
                      )}
                    </div>
                  </div>

                  <Separator />

                  {/* Activity Info */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm font-medium text-slate-500">Sessões Ativas</Label>
                      <p className="text-lg">{diagnosticData.profile.activeSessions || 0}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-slate-500">Última Atividade</Label>
                      <p className="text-lg">
                        {diagnosticData.profile.lastActiveSession 
                          ? new Date(diagnosticData.profile.lastActiveSession).toLocaleString('pt-BR')
                          : 'Nunca'
                        }
                      </p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-slate-500">Data de Criação</Label>
                      <p className="text-lg">
                        {diagnosticData.profile.createdAt 
                          ? new Date(diagnosticData.profile.createdAt).toLocaleString('pt-BR')
                          : 'Não disponível'
                        }
                      </p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-slate-500">Timestamp do Diagnóstico</Label>
                      <p className="text-sm text-slate-500">
                        {diagnosticData.profile.diagnosticTimestamp 
                          ? new Date(diagnosticData.profile.diagnosticTimestamp).toLocaleString('pt-BR')
                          : 'Não disponível'
                        }
                      </p>
                    </div>
                  </div>

                  <Separator />

                  {/* Raw Data */}
                  <div>
                    <Label className="text-sm font-medium text-slate-500 mb-3 block">Dados Brutos do Banco</Label>
                    <div className="bg-slate-100 dark:bg-slate-800 rounded-lg p-4 overflow-auto">
                      <pre className="text-sm">
                        {JSON.stringify(diagnosticData.profile, null, 2)}
                      </pre>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default AdminUserDiagnosticPage;
