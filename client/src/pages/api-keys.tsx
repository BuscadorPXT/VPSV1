
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/api-client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Copy, Key, Trash2, Eye, EyeOff } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const ApiKeysPage = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showApiKey, setShowApiKey] = useState(false);

  const { data: apiKeyData, isLoading } = useQuery({
    queryKey: ['/api/api-keys/current'],
    queryFn: () => apiRequest('/api/api-keys/current')
  });

  const generateApiKeyMutation = useMutation({
    mutationFn: () => apiRequest('/api/api-keys/generate', { method: 'POST' }),
    onSuccess: (data) => {
      toast({
        title: "API Key Gerada",
        description: "Sua nova API key foi gerada com sucesso!",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/api-keys/current'] });
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Erro ao gerar API key",
        variant: "destructive",
      });
    }
  });

  const revokeApiKeyMutation = useMutation({
    mutationFn: () => apiRequest('/api/api-keys/revoke', { method: 'DELETE' }),
    onSuccess: () => {
      toast({
        title: "API Key Revogada",
        description: "Sua API key foi revogada com sucesso!",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/api-keys/current'] });
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
    return `${apiKey.substring(0, 8)}${'*'.repeat(apiKey.length - 16)}${apiKey.substring(apiKey.length - 8)}`;
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">API Keys</h1>
        <p className="text-gray-600">Gerencie suas chaves de API para acesso programático aos dados</p>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            Sua API Key
          </CardTitle>
          <CardDescription>
            Use esta chave para acessar os endpoints da API v1
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {apiKeyData?.apiKey ? (
            <div className="space-y-4">
              <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                <Badge variant="secondary">Ativa</Badge>
                <span className="text-sm text-gray-600">
                  Criada em {format(new Date(apiKeyData.createdAt), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                </span>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="api-key">API Key</Label>
                <div className="flex gap-2">
                  <Input
                    id="api-key"
                    type="text"
                    value={showApiKey ? apiKeyData.apiKey : maskApiKey(apiKeyData.apiKey)}
                    readOnly
                    className="font-mono"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setShowApiKey(!showApiKey)}
                  >
                    {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => copyToClipboard(apiKeyData.apiKey)}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="destructive"
                  onClick={() => revokeApiKeyMutation.mutate()}
                  disabled={revokeApiKeyMutation.isPending}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Revogar API Key
                </Button>
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <Key className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <p className="text-gray-600 mb-4">Você ainda não possui uma API key</p>
              <Button
                onClick={() => generateApiKeyMutation.mutate()}
                disabled={generateApiKeyMutation.isPending}
              >
                Gerar Nova API Key
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Como Usar</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <AlertDescription>
              <strong>Base URL:</strong> {window.location.origin}/api/v1/
            </AlertDescription>
          </Alert>

          <div className="space-y-3">
            <div>
              <h4 className="font-semibold mb-2">Endpoints Disponíveis:</h4>
              <ul className="space-y-2 text-sm">
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
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ApiKeysPage;
