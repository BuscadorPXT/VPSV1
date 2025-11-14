import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Search, User as UserIcon, ChevronLeft, ChevronRight } from 'lucide-react';

interface UserData {
  id: number;
  name: string;
  email: string;
  phone?: string;
  company?: string;
  role: string;
  subscriptionPlan: string;
  status: string;
  isApproved: boolean;
  isAdmin: boolean;
  isSubscriptionActive: boolean;
  createdAt: string;
  lastLoginAt?: string;
}

interface UsersResponse {
  success: boolean;
  data: {
    users: UserData[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      pages: number;
    };
  };
}

const getStatusColor = (status: string) => {
  switch (status) {
    case 'approved': return 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300';
    case 'pending_approval': return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300';
    case 'pending_payment': return 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300';
    case 'suspended': return 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300';
    case 'rejected': return 'bg-gray-100 text-gray-700 dark:bg-gray-900 dark:text-gray-300';
    default: return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300';
  }
};

const getPlanColor = (plan: string) => {
  switch (plan.toLowerCase()) {
    case 'free': return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300';
    case 'pro': return 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300';
    case 'business': return 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300';
    case 'admin': return 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300';
    case 'tester': return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300';
    default: return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300';
  }
};

const formatDate = (dateString?: string) => {
  if (!dateString) return '-';
  return new Date(dateString).toLocaleDateString('pt-BR');
};

export const UsersManagementSection = () => {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const limit = 20;

  const { data: usersData, isLoading, refetch } = useQuery<UsersResponse>({
    queryKey: ['/api/admin/users', { search, page, limit }],
    queryFn: () => apiRequest(`/api/admin/users?search=${search}&page=${page}&limit=${limit}`),
    refetchOnWindowFocus: false,
  });

  const users = usersData?.data?.users || [];
  const pagination = usersData?.data?.pagination;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Gerenciamento de Usuários</h2>
          <p className="text-muted-foreground">
            Visualize e gerencie todos os usuários do sistema
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isLoading}
            data-testid="button-refresh-users"
          >
            <Search className="h-4 w-4 mr-2" />
            Atualizar
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <UserIcon className="h-5 w-5 mr-2" />
            Usuários ({pagination?.total || 0})
          </CardTitle>
          <CardDescription>
            Lista completa de usuários cadastrados no sistema
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <Input
              placeholder="Buscar por nome, email ou empresa..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="max-w-md"
              data-testid="input-search-users"
            />
          </div>

          {isLoading ? (
            <div className="space-y-4">
              <div className="animate-pulse">
                <div className="h-10 bg-muted rounded w-full mb-4"></div>
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="h-16 bg-muted rounded mb-2"></div>
                ))}
              </div>
            </div>
          ) : (
            <>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Usuário</TableHead>
                      <TableHead>Telefone</TableHead>
                      <TableHead>Empresa</TableHead>
                      <TableHead>Plano</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Criado em</TableHead>
                      <TableHead>Último Login</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                          Nenhum usuário encontrado
                        </TableCell>
                      </TableRow>
                    ) : (
                      users.map((user) => (
                        <TableRow key={user.id} data-testid={`row-user-${user.id}`}>
                          <TableCell>
                            <div className="flex items-center space-x-3">
                              <div className="flex-shrink-0">
                                <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-sm font-medium">
                                  {user.name.charAt(0).toUpperCase()}
                                </div>
                              </div>
                              <div>
                                <div className="font-medium text-sm">{user.name}</div>
                                <div className="text-xs text-muted-foreground">{user.email}</div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm" data-testid={`text-phone-${user.id}`}>
                              {user.phone || '-'}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">
                              {user.company || '-'}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge className={getPlanColor(user.subscriptionPlan)}>
                              {user.subscriptionPlan.toUpperCase()}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge className={getStatusColor(user.status)}>
                              {user.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">{formatDate(user.createdAt)}</div>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">{formatDate(user.lastLoginAt)}</div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>

              {pagination && pagination.pages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <div className="text-sm text-muted-foreground">
                    Mostrando {((pagination.page - 1) * pagination.limit) + 1} a {Math.min(pagination.page * pagination.limit, pagination.total)} de {pagination.total} resultados
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(page - 1)}
                      disabled={page === 1}
                      data-testid="button-prev-page"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="text-sm font-medium">
                      Página {pagination.page} de {pagination.pages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(page + 1)}
                      disabled={page === pagination.pages}
                      data-testid="button-next-page"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
