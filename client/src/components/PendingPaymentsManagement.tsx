
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger
} from '@/components/ui/alert-dialog';
import { 
  CreditCard, 
  CheckCircle, 
  XCircle, 
  Clock, 
  User, 
  Calendar,
  AlertTriangle
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface PendingPaymentUser {
  id: number;
  email: string;
  name: string;
  company?: string;
  subscriptionPlan: string;
  status: string;
  createdAt: string;
  lastLoginAt?: string;
}

export function PendingPaymentsManagement() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedUser, setSelectedUser] = useState<PendingPaymentUser | null>(null);

  // Fetch users with pending payment status
  const { data: pendingUsers, isLoading, refetch } = useQuery({
    queryKey: ['admin-pending-payments'],
    queryFn: async () => {
      const response = await apiRequest('/api/admin/users');
      return response.users.filter((user: any) => user.status === 'pending_payment');
    },
    refetchInterval: 30000,
  });

  // Mutation to restore user access
  const restoreAccessMutation = useMutation({
    mutationFn: async (userId: number) => {
      return apiRequest(`/api/admin/users/${userId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          status: 'approved',
          reason: 'Pagamento regularizado pelo administrador'
        }),
      });
    },
    onSuccess: () => {
      toast({
        title: "✅ Acesso Restaurado",
        description: "O usuário teve seu acesso restaurado com sucesso",
      });
      queryClient.invalidateQueries({ queryKey: ['admin-pending-payments'] });
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      refetch();
      setSelectedUser(null);
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Erro ao restaurar acesso do usuário",
        variant: "destructive",
      });
    }
  });

  // Mutation to suspend user permanently
  const suspendUserMutation = useMutation({
    mutationFn: async (userId: number) => {
      return apiRequest(`/api/admin/users/${userId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          status: 'suspended',
          reason: 'Usuário suspenso devido a não pagamento'
        }),
      });
    },
    onSuccess: () => {
      toast({
        title: "⛔ Usuário Suspenso",
        description: "O usuário foi suspenso permanentemente",
      });
      queryClient.invalidateQueries({ queryKey: ['admin-pending-payments'] });
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      refetch();
      setSelectedUser(null);
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Erro ao suspender usuário",
        variant: "destructive",
      });
    }
  });

  const handleRestoreAccess = (user: PendingPaymentUser) => {
    setSelectedUser(user);
  };

  const handleSuspendUser = (user: PendingPaymentUser) => {
    setSelectedUser(user);
  };

  const confirmRestoreAccess = () => {
    if (selectedUser) {
      restoreAccessMutation.mutate(selectedUser.id);
    }
  };

  const confirmSuspendUser = () => {
    if (selectedUser) {
      suspendUserMutation.mutate(selectedUser.id);
    }
  };

  const users = pendingUsers || [];

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Gerenciar Pagamentos Pendentes
          </CardTitle>
          <CardDescription>
            Carregando usuários com pagamento pendente...
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="relative h-8 w-8">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary/20 border-t-primary"></div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Gerenciar Pagamentos Pendentes
          </CardTitle>
          <CardDescription>
            Usuários que precisam regularizar seus pagamentos para manter o acesso
          </CardDescription>
        </CardHeader>
        <CardContent>
          {users.length === 0 ? (
            <div className="text-center py-8">
              <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Nenhum pagamento pendente!</h3>
              <p className="text-muted-foreground">
                Todos os usuários PRO estão com seus pagamentos em dia.
              </p>
            </div>
          ) : (
            <>
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-yellow-500" />
                  <span className="text-sm font-medium">
                    {users.length} usuário{users.length !== 1 ? 's' : ''} com pagamento pendente
                  </span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => refetch()}
                  disabled={isLoading}
                >
                  Atualizar
                </Button>
              </div>

              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Usuário</TableHead>
                      <TableHead>Plano</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Criado em</TableHead>
                      <TableHead>Último Login</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-yellow-100 dark:bg-yellow-900/30">
                              <User className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
                            </div>
                            <div>
                              <div className="font-medium">{user.name || 'N/A'}</div>
                              <div className="text-sm text-muted-foreground">{user.email}</div>
                              {user.company && (
                                <div className="text-xs text-muted-foreground">{user.company}</div>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
                            {user.subscriptionPlan?.toUpperCase() || 'FREE'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="border-yellow-500 text-yellow-700 dark:text-yellow-400">
                            <Clock className="h-3 w-3 mr-1" />
                            Pendente
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Calendar className="h-3 w-3" />
                            {user.createdAt 
                              ? formatDistanceToNow(new Date(user.createdAt), { 
                                  addSuffix: true, 
                                  locale: ptBR 
                                })
                              : 'N/A'
                            }
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm text-muted-foreground">
                            {user.lastLoginAt 
                              ? formatDistanceToNow(new Date(user.lastLoginAt), { 
                                  addSuffix: true, 
                                  locale: ptBR 
                                })
                              : 'Nunca'
                            }
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button 
                                  size="sm" 
                                  variant="default"
                                  onClick={() => handleRestoreAccess(user)}
                                  className="bg-green-600 hover:bg-green-700"
                                >
                                  <CheckCircle className="h-3 w-3 mr-1" />
                                  Restaurar
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Restaurar Acesso</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Tem certeza que deseja restaurar o acesso de <strong>{user.name}</strong> ({user.email})?
                                    <br /><br />
                                    O usuário voltará a ter acesso completo ao sistema.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                  <AlertDialogAction 
                                    onClick={confirmRestoreAccess}
                                    className="bg-green-600 hover:bg-green-700"
                                  >
                                    Confirmar Restauração
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>

                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button 
                                  size="sm" 
                                  variant="destructive"
                                  onClick={() => handleSuspendUser(user)}
                                >
                                  <XCircle className="h-3 w-3 mr-1" />
                                  Suspender
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Suspender Usuário</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Tem certeza que deseja suspender permanentemente <strong>{user.name}</strong> ({user.email})?
                                    <br /><br />
                                    <span className="text-red-600 font-semibold">
                                      ⚠️ Esta ação bloqueará completamente o acesso do usuário ao sistema.
                                    </span>
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                  <AlertDialogAction 
                                    onClick={confirmSuspendUser}
                                    className="bg-red-600 hover:bg-red-700"
                                  >
                                    Confirmar Suspensão
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </>
  );
}
