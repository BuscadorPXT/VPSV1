import { useQuery, useMutation } from '@tanstack/react-query';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Mail, Phone, Calendar, DollarSign, CheckCircle, Clock, AlertCircle, Check, X, RefreshCw } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

type EventConfirmation = {
  id: number;
  name: string;
  email: string;
  whatsapp: string;
  accompanists: number;
  paymentStatus: string;
  adminConfirmationStatus?: string;
  confirmedByAdmin?: number;
  adminConfirmedAt?: string;
  createdAt: string;
  userId?: number;
  ipAddress?: string;
  notes?: string;
};

export default function AdminEncontroPage() {
  const { toast } = useToast();
  
  const { data, isLoading, error } = useQuery<{ success: boolean; data: EventConfirmation[]; total: number }>({
    queryKey: ['/api/event/confirmations'],
    queryFn: async () => {
      return await apiRequest('/api/event/confirmations');
    },
    refetchInterval: 10000, // Auto-refresh every 10 seconds
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      return await apiRequest(`/api/event/confirmation/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['/api/event/confirmations'] });
      
      const statusText = variables.status === 'confirmed' ? 'confirmada' : 
                        variables.status === 'cancelled' ? 'cancelada' : 'pendente';
      
      toast({
        title: '✅ Status atualizado!',
        description: `Presença ${statusText} com sucesso`,
      });
    },
    onError: (error: any) => {
      toast({
        title: '❌ Erro ao atualizar',
        description: error.message || 'Tente novamente',
        variant: 'destructive',
      });
    },
  });

  const confirmations = data?.data || [];
  const totalConfirmations = data?.total || 0;

  const totalPeople = confirmations.reduce((sum, conf) => sum + conf.accompanists, 0);
  const totalRevenue = confirmations.reduce((sum, conf) => {
    const amount = conf.accompanists === 2 ? 250 : 500;
    return sum + amount;
  }, 0);

  const paidCount = confirmations.filter(c => c.paymentStatus === 'paid').length;
  const pendingCount = confirmations.filter(c => c.paymentStatus === 'pending').length;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-gray-950 dark:via-blue-950/20 dark:to-purple-950/20 py-12 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-gray-600 dark:text-gray-400">Carregando confirmações...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-gray-950 dark:via-blue-950/20 dark:to-purple-950/20 py-12 px-4">
        <div className="max-w-7xl mx-auto">
          <Card className="border-red-200 bg-red-50 dark:bg-red-950/20">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <AlertCircle className="w-6 h-6 text-red-600" />
                <div>
                  <h3 className="font-semibold text-red-900 dark:text-red-200">Erro ao carregar confirmações</h3>
                  <p className="text-sm text-red-700 dark:text-red-300">Tente novamente mais tarde</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <AdminLayout
      title="Gerenciar Confirmações do Evento"
      description="Acompanhe todas as confirmações de presença para o encontro de networking"
      actions={
        <Button
          onClick={() => queryClient.invalidateQueries({ queryKey: ['/api/event/confirmations'] })}
          disabled={isLoading}
          variant="outline"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          Atualizar
        </Button>
      }
    >
      <div className="max-w-7xl mx-auto space-y-8">

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="border-0 shadow-xl bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/50 dark:to-blue-900/50">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-blue-700 dark:text-blue-300 mb-1">Total de Confirmações</p>
                  <p className="text-3xl font-bold text-blue-900 dark:text-blue-100">{totalConfirmations}</p>
                </div>
                <div className="p-3 bg-blue-500 rounded-xl">
                  <Users className="w-6 h-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-xl bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950/50 dark:to-purple-900/50">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-purple-700 dark:text-purple-300 mb-1">Total de Pessoas</p>
                  <p className="text-3xl font-bold text-purple-900 dark:text-purple-100">{totalPeople}</p>
                </div>
                <div className="p-3 bg-purple-500 rounded-xl">
                  <Users className="w-6 h-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-xl bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950/50 dark:to-green-900/50">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-green-700 dark:text-green-300 mb-1">Receita Total</p>
                  <p className="text-3xl font-bold text-green-900 dark:text-green-100">R$ {totalRevenue}</p>
                </div>
                <div className="p-3 bg-green-500 rounded-xl">
                  <DollarSign className="w-6 h-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-xl bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-950/50 dark:to-amber-900/50">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-amber-700 dark:text-amber-300 mb-1">Status</p>
                  <div className="flex gap-2 items-center">
                    <span className="text-sm font-semibold text-amber-900 dark:text-amber-100">
                      {paidCount} pagos
                    </span>
                    <span className="text-xs text-amber-700 dark:text-amber-300">|</span>
                    <span className="text-sm font-semibold text-amber-900 dark:text-amber-100">
                      {pendingCount} pendentes
                    </span>
                  </div>
                </div>
                <div className="p-3 bg-amber-500 rounded-xl">
                  <CheckCircle className="w-6 h-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Confirmations List */}
        <Card className="border-0 shadow-2xl">
          <CardHeader>
            <CardTitle className="text-2xl">Lista de Confirmações</CardTitle>
            <CardDescription>
              {totalConfirmations === 0 
                ? 'Nenhuma confirmação ainda' 
                : `${totalConfirmations} ${totalConfirmations === 1 ? 'confirmação registrada' : 'confirmações registradas'}`
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            {confirmations.length === 0 ? (
              <div className="text-center py-12">
                <Users className="w-16 h-16 text-gray-300 dark:text-gray-700 mx-auto mb-4" />
                <p className="text-gray-500 dark:text-gray-400 text-lg">Nenhuma confirmação registrada ainda</p>
                <p className="text-gray-400 dark:text-gray-500 text-sm mt-2">
                  As confirmações aparecerão aqui quando os participantes se inscreverem
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {confirmations.map((confirmation) => (
                  <Card key={confirmation.id} className="border border-gray-200 dark:border-gray-800 hover:shadow-lg transition-shadow">
                    <CardContent className="pt-6">
                      <div className="grid md:grid-cols-2 gap-6">
                        {/* Left Column - Personal Info */}
                        <div className="space-y-3">
                          <div>
                            <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                              {confirmation.name}
                            </h3>
                            <div className="flex gap-2 flex-wrap">
                              <Badge 
                                variant={confirmation.paymentStatus === 'paid' ? 'default' : 'secondary'}
                                className={confirmation.paymentStatus === 'paid' ? 'bg-green-500' : 'bg-amber-500'}
                              >
                                {confirmation.paymentStatus === 'paid' ? '✓ Pago' : '⏳ Pendente'}
                              </Badge>
                              <Badge 
                                variant={confirmation.adminConfirmationStatus === 'confirmed' ? 'default' : 
                                        confirmation.adminConfirmationStatus === 'cancelled' ? 'destructive' : 'secondary'}
                                className={
                                  confirmation.adminConfirmationStatus === 'confirmed' ? 'bg-blue-500' :
                                  confirmation.adminConfirmationStatus === 'cancelled' ? 'bg-red-500' : 'bg-gray-500'
                                }
                              >
                                {confirmation.adminConfirmationStatus === 'confirmed' ? '✓ Confirmado' : 
                                 confirmation.adminConfirmationStatus === 'cancelled' ? '✗ Cancelado' : '⏳ Aguardando'}
                              </Badge>
                            </div>
                          </div>

                          <div className="space-y-2">
                            <div className="flex items-center gap-2 text-sm">
                              <Mail className="w-4 h-4 text-gray-500" />
                              <span className="text-gray-700 dark:text-gray-300">{confirmation.email}</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm">
                              <Phone className="w-4 h-4 text-gray-500" />
                              <span className="text-gray-700 dark:text-gray-300">{confirmation.whatsapp}</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm">
                              <Users className="w-4 h-4 text-gray-500" />
                              <span className="text-gray-700 dark:text-gray-300">
                                {confirmation.accompanists} {confirmation.accompanists === 1 ? 'pessoa' : 'pessoas'} 
                                {confirmation.accompanists === 2 && ' (você + 1 acompanhante)'}
                                {confirmation.accompanists === 3 && ' (você + 2 acompanhantes)'}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Right Column - Details */}
                        <div className="space-y-3">
                          <div className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800/50 dark:to-gray-800/30 rounded-lg p-4">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Valor</span>
                              <span className="text-xl font-bold text-gray-900 dark:text-gray-100">
                                R$ {confirmation.accompanists === 2 ? '250,00' : '500,00'}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                              <Calendar className="w-3 h-3" />
                              <span>Confirmado em {new Date(confirmation.createdAt).toLocaleDateString('pt-BR', {
                                day: '2-digit',
                                month: '2-digit',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}</span>
                            </div>
                          </div>

                          {confirmation.notes && (
                            <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
                              <p className="text-sm font-medium text-blue-900 dark:text-blue-200 mb-1">Observações:</p>
                              <p className="text-sm text-blue-700 dark:text-blue-300">{confirmation.notes}</p>
                            </div>
                          )}

                          {confirmation.ipAddress && (
                            <div className="text-xs text-gray-400 dark:text-gray-600">
                              IP: {confirmation.ipAddress}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Admin Actions */}
                      <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                        <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-3">Ações do Administrador:</p>
                        <div className="flex gap-3">
                          <Button
                            onClick={() => updateStatusMutation.mutate({ id: confirmation.id, status: 'confirmed' })}
                            disabled={updateStatusMutation.isPending || confirmation.adminConfirmationStatus === 'confirmed'}
                            className="flex-1 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700"
                            data-testid={`button-confirm-${confirmation.id}`}
                          >
                            <Check className="w-4 h-4 mr-2" />
                            {confirmation.adminConfirmationStatus === 'confirmed' ? 'Confirmado' : 'Confirmar Presença'}
                          </Button>
                          <Button
                            onClick={() => updateStatusMutation.mutate({ id: confirmation.id, status: 'cancelled' })}
                            disabled={updateStatusMutation.isPending || confirmation.adminConfirmationStatus === 'cancelled'}
                            variant="destructive"
                            className="flex-1"
                            data-testid={`button-cancel-${confirmation.id}`}
                          >
                            <X className="w-4 h-4 mr-2" />
                            {confirmation.adminConfirmationStatus === 'cancelled' ? 'Cancelado' : 'Cancelar'}
                          </Button>
                          {confirmation.adminConfirmationStatus && confirmation.adminConfirmationStatus !== 'pending' && (
                            <Button
                              onClick={() => updateStatusMutation.mutate({ id: confirmation.id, status: 'pending' })}
                              disabled={updateStatusMutation.isPending}
                              variant="outline"
                              data-testid={`button-reset-${confirmation.id}`}
                            >
                              Resetar
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
