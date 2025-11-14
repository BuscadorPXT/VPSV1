
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/api-client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Copy, Key, Trash2, Eye, EyeOff, Plus, Search, User, Users, CheckCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface User {
  id: number;
  email: string;
  name: string;
  company?: string;
  role: string;
  subscriptionPlan: string;
  isApproved: boolean;
  isAdmin: boolean;
  apiKey?: string;
  apiKeyCreatedAt?: string;
  createdAt: string;
  status: string;
}

const ApiKeysManagement = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showApiKeys, setShowApiKeys] = useState<{[key: number]: boolean}>({});
  const [searchTerm, setSearchTerm] = useState('');

  const { data: users, isLoading, error } = useQuery({
    queryKey: ['/api/admin/users-with-api-keys'],
    queryFn: async () => {
      console.log('🔄 Fetching users with API keys...');
      try {
        const result = await apiRequest('/api/admin/users-with-api-keys');
        console.log('✅ Users fetched successfully:', result?.length || 0, 'users');
        return result;
      } catch (error) {
        console.error('❌ Error fetching users:', error);
        throw error;
      }
    },
    retry: 3,
    retryDelay: 1000
  });

  const generateApiKeyMutation = useMutation({
    mutationFn: async (userId: number) => {
      console.log(`🔄 Requesting API key generation for user ${userId}`);
      try {
        const result = await apiRequest(`/api/admin/generate-api-key/${userId}`, { method: 'POST' });
        console.log(`✅ API key generation successful for user ${userId}:`, result);
        return result;
      } catch (error) {
        console.error(`❌ API key generation failed for user ${userId}:`, error);
        throw error;
      }
    },
    onSuccess: (data, userId) => {
      console.log(`🎉 API key generated successfully for user ${userId}`);
      toast({
        title: "API Key Gerada",
        description: `API key gerada com sucesso para o usuário!`,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users-with-api-keys'] });
    },
    onError: (error: any, userId) => {
      console.error(`💥 API key generation error for user ${userId}:`, error);
      toast({
        title: "Erro ao Gerar API Key",
        description: error.message || "Erro interno do servidor. Tente novamente.",
        variant: "destructive",
      });
    }
  });

  const revokeApiKeyMutation = useMutation({
    mutationFn: (userId: number) => apiRequest(`/api/admin/revoke-api-key/${userId}`, { method: 'DELETE' }),
    onSuccess: (data, userId) => {
      toast({
        title: "API Key Revogada",
        description: "API key foi revogada com sucesso!",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users-with-api-keys'] });
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Erro ao revogar API key",
        variant: "destructive",
      });
    }
  });

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copiado!",
      description: "API key copiada para a área de transferência",
    });
  };

  const maskApiKey = (apiKey: string) => {
    if (!apiKey) return '';
    return `${apiKey.substring(0, 8)}${'*'.repeat(Math.max(0, apiKey.length - 16))}${apiKey.substring(apiKey.length - 8)}`;
  };

  const toggleApiKeyVisibility = (userId: number) => {
    setShowApiKeys(prev => ({
      ...prev,
      [userId]: !prev[userId]
    }));
  };

  const filteredUsers = users?.filter((user: User) => 
    user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (user.company && user.company.toLowerCase().includes(searchTerm.toLowerCase()))
  ) || [];

  if (isLoading) {
    return (
      <div className="container mx-auto p-6 max-w-6xl">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-24 bg-gray-200 rounded"></div>
            ))}
          </div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-6 max-w-6xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Gerenciamento de API Keys</h1>
          <p className="text-gray-600">Gerencie chaves de API para usuários do sistema</p>
        </div>
        <Alert variant="destructive">
          <AlertDescription>
            Erro ao carregar usuários: {error?.message || 'Erro desconhecido'}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const approvedUsers = users?.filter((u: User) => u.isApproved) || [];
  const usersWithApiKeys = users?.filter((u: User) => u.apiKey) || [];
  const totalUsers = users?.length || 0;

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Gerenciamento de API Keys</h1>
        <p className="text-gray-600">Gerencie chaves de API para usuários do sistema</p>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {totalUsers}
              </div>
              <div className="text-sm text-gray-600">Total de Usuários</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {approvedUsers.length}
              </div>
              <div className="text-sm text-gray-600">Usuários Aprovados</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {usersWithApiKeys.length}
              </div>
              <div className="text-sm text-gray-600">API Keys Ativas</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search Bar */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex items-center space-x-2">
            <Search className="h-4 w-4 text-gray-400" />
            <Input
              placeholder="Buscar usuário por nome, email ou empresa..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1"
            />
          </div>
        </CardContent>
      </Card>

      {/* Users List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Usuários do Sistema ({filteredUsers.length})
          </CardTitle>
          <CardDescription>
            Gerencie API keys para usuários aprovados
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredUsers.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              {users?.length === 0 ? 'Nenhum usuário encontrado no sistema' : 'Nenhum usuário encontrado com os filtros aplicados'}
            </div>
          ) : (
            <div className="space-y-4">
              {filteredUsers.map((user: User) => (
                <div key={user.id} className="border rounded-lg p-4 space-y-3">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <User className="h-4 w-4 text-gray-500" />
                        <h3 className="font-semibold">{user.name}</h3>
                        {user.isAdmin && <Badge variant="destructive">Admin</Badge>}
                      </div>
                      <p className="text-sm text-gray-600 mb-2">{user.email}</p>
                      {user.company && (
                        <p className="text-sm text-gray-500 mb-2">Empresa: {user.company}</p>
                      )}
                      <div className="flex gap-2 flex-wrap">
                        <Badge variant={user.isApproved ? "default" : "secondary"}>
                          {user.isApproved ? "Aprovado" : "Pendente"}
                        </Badge>
                        <Badge variant="outline">{user.role}</Badge>
                        <Badge variant="outline">{user.subscriptionPlan}</Badge>
                        <Badge variant="outline">ID: {user.id}</Badge>
                      </div>
                    </div>
                    
                    <div className="flex gap-2 ml-4">
                      {user.apiKey ? (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="destructive" size="sm">
                              <Trash2 className="h-4 w-4 mr-1" />
                              Revogar
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Revogar API Key</AlertDialogTitle>
                              <AlertDialogDescription>
                                Tem certeza que deseja revogar a API key de {user.name}? 
                                Esta ação não pode ser desfeita e o usuário perderá o acesso à API.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction 
                                onClick={() => revokeApiKeyMutation.mutate(user.id)}
                                className="bg-red-600 hover:bg-red-700"
                              >
                                Revogar
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      ) : (
                        <Button 
                          onClick={() => {
                            console.log(`🖱️ Generating API key for user ${user.id} (${user.email})`);
                            generateApiKeyMutation.mutate(user.id);
                          }}
                          disabled={!user.isApproved || generateApiKeyMutation.isPending}
                          size="sm"
                          variant={user.isApproved ? "default" : "secondary"}
                          className={generateApiKeyMutation.isPending ? "opacity-70" : ""}
                        >
                          {generateApiKeyMutation.isPending ? (
                            <>
                              <div className="h-4 w-4 mr-1 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                              Gerando...
                            </>
                          ) : (
                            <>
                              <Plus className="h-4 w-4 mr-1" />
                              Gerar API Key
                            </>
                          )}
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* API Key Display */}
                  {user.apiKey && (
                    <div className="bg-gray-50 rounded-lg p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <CheckCircle className="h-4 w-4 text-green-500" />
                          <span className="text-sm font-medium text-green-700">API Key Ativa</span>
                          {user.apiKeyCreatedAt && (
                            <span className="text-xs text-gray-500">
                              Criada em {format(new Date(user.apiKeyCreatedAt), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                            </span>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex gap-2">
                        <Input
                          type="text"
                          value={showApiKeys[user.id] ? user.apiKey : maskApiKey(user.apiKey)}
                          readOnly
                          className="font-mono text-sm"
                        />
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => toggleApiKeyVisibility(user.id)}
                        >
                          {showApiKeys[user.id] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => copyToClipboard(user.apiKey!)}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Warning for non-approved users */}
                  {!user.isApproved && (
                    <div className="text-sm text-orange-600 bg-orange-50 p-2 rounded">
                      ⚠️ Usuário precisa estar aprovado para receber uma API key
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* API Documentation */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Informações da API</CardTitle>
          <CardDescription>Documentação e exemplos de uso da API</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-blue-50 p-4 rounded-lg">
            <h4 className="font-semibold mb-2">Base URL:</h4>
            <code className="text-sm">{window.location.origin}/api/v1/</code>
          </div>

          <div>
            <h4 className="font-semibold mb-2">Endpoints Disponíveis:</h4>
            <ul className="space-y-1 text-sm">
              <li><code className="bg-gray-100 px-2 py-1 rounded">GET /api/v1/products</code> - Lista produtos</li>
              <li><code className="bg-gray-100 px-2 py-1 rounded">GET /api/v1/suppliers</code> - Lista fornecedores</li>
              <li><code className="bg-gray-100 px-2 py-1 rounded">GET /api/v1/categories</code> - Lista categorias</li>
              <li><code className="bg-gray-100 px-2 py-1 rounded">GET /api/v1/dates</code> - Datas disponíveis</li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-2">Exemplo de Requisição:</h4>
            <pre className="bg-gray-100 p-3 rounded-lg text-sm overflow-x-auto">
{`curl -X GET "${window.location.origin}/api/v1/products" \\
  -H "x-api-key: SUA_API_KEY_AQUI" \\
  -H "Content-Type: application/json"`}
            </pre>
          </div>

          <div>
            <h4 className="font-semibold mb-2">Parâmetros de Consulta:</h4>
            <ul className="space-y-1 text-sm">
              <li><code>model</code> - Filtrar por modelo</li>
              <li><code>capacity</code> - Filtrar por capacidade</li>
              <li><code>color</code> - Filtrar por cor</li>
              <li><code>supplier</code> - Filtrar por fornecedor</li>
              <li><code>category</code> - Filtrar por categoria</li>
              <li><code>limit</code> - Limitar resultados (máx: 500)</li>
              <li><code>offset</code> - Paginar resultados</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ApiKeysManagement;
