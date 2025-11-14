import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { 
  Siren, 
  Megaphone, 
  Trash2, 
  RefreshCw, 
  Plus,
  Eye,
  Send,
  AlertTriangle
} from 'lucide-react';

interface EmergencyAlert {
  id: number;
  title: string;
  message: string;
  urgency: 'low' | 'medium' | 'high';
  isActive: boolean;
  sentAt: string;
  senderName: string;
  senderEmail: string;
  viewCount: number;
}

export function EmergencyAlertsAdmin() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedAlert, setSelectedAlert] = useState<EmergencyAlert | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [alertForm, setAlertForm] = useState({
    title: '',
    message: '',
    urgency: 'medium' as 'low' | 'medium' | 'high'
  });

  // Buscar todos os alertas
  const { data: alertsData, isLoading, refetch } = useQuery({
    queryKey: ['/api/emergency-alerts'],
    refetchInterval: 30000, // Atualizar a cada 30 segundos
  });

  const alerts: EmergencyAlert[] = alertsData?.alerts || [];

  // Mutation para criar novo alerta
  const createAlertMutation = useMutation({
    mutationFn: async (alertData: typeof alertForm) => {
      return apiRequest('/api/emergency-alerts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(alertData),
      });
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/emergency-alerts'] });
      toast({
        title: 'Aviso enviado!',
        description: `Aviso emergencial enviado para ${data.sentToUsers} usuários`,
      });
      setShowCreateDialog(false);
      setAlertForm({ title: '', message: '', urgency: 'medium' });
    },
    onError: (error: any) => {
      toast({
        title: 'Erro',
        description: error.message || 'Erro ao enviar aviso',
        variant: 'destructive',
      });
    },
  });

  // Mutation para alternar status ativo/inativo
  const toggleAlertMutation = useMutation({
    mutationFn: async (alertId: number) => {
      return apiRequest(`/api/emergency-alerts/${alertId}/toggle`, {
        method: 'PUT',
      });
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/emergency-alerts'] });
      toast({
        title: 'Status alterado',
        description: data.message,
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Erro',
        description: error.message || 'Erro ao alterar status do alerta',
        variant: 'destructive',
      });
    },
  });

  // Mutation para excluir alerta
  const deleteAlertMutation = useMutation({
    mutationFn: async (alertId: number) => {
      return apiRequest(`/api/emergency-alerts/${alertId}`, {
        method: 'DELETE',
      });
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/emergency-alerts'] });
      toast({
        title: 'Alerta excluído',
        description: data.message,
      });
      setSelectedAlert(null);
      setShowDeleteDialog(false);
    },
    onError: (error: any) => {
      toast({
        title: 'Erro',
        description: error.message || 'Erro ao excluir alerta',
        variant: 'destructive',
      });
    },
  });

  // Mutation para reenviar alerta
  const resendAlertMutation = useMutation({
    mutationFn: async (alertId: number) => {
      return apiRequest(`/api/emergency-alerts/${alertId}/resend`, {
        method: 'POST',
      });
    },
    onSuccess: (data) => {
      toast({
        title: 'Alerta reenviado',
        description: `${data.message}. Enviado para ${data.sentToUsers} usuários.`,
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Erro',
        description: error.message || 'Erro ao reenviar alerta',
        variant: 'destructive',
      });
    },
  });

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'high': return 'bg-red-100 text-red-700 border-red-300';
      case 'medium': return 'bg-yellow-100 text-yellow-700 border-yellow-300';
      case 'low': return 'bg-blue-100 text-blue-700 border-blue-300';
      default: return 'bg-gray-100 text-gray-700 border-gray-300';
    }
  };

  const getUrgencyIcon = (urgency: string) => {
    switch (urgency) {
      case 'high': return <AlertTriangle className="h-4 w-4" />;
      case 'medium': return <Siren className="h-4 w-4" />;
      case 'low': return <Megaphone className="h-4 w-4" />;
      default: return <Megaphone className="h-4 w-4" />;
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center border-b pb-4">
          <div>
            <h2 className="text-2xl font-bold">Avisos Emergenciais</h2>
            <p className="text-slate-600 dark:text-slate-400">Carregando...</p>
          </div>
        </div>
        <Card>
          <CardContent className="p-6">
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
          <p className="text-slate-600 dark:text-slate-400">
            Envie notificações importantes para todos os usuários
          </p>
        </div>
        <Button 
          onClick={() => setShowCreateDialog(true)}
          className="bg-red-600 hover:bg-red-700 text-white flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          Novo Aviso
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Megaphone className="h-5 w-5" />
            Histórico de Avisos ({alerts.length})
          </CardTitle>
          <CardDescription>
            Gerencie todos os avisos emergenciais enviados
          </CardDescription>
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
              {alerts.map((alert) => (
                <Card key={alert.id} className={`border-l-4 ${
                  alert.urgency === 'high' ? 'border-l-red-500' : 
                  alert.urgency === 'medium' ? 'border-l-yellow-500' : 
                  'border-l-blue-500'
                }`}>
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start">
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-semibold text-lg">{alert.title}</h3>
                          <Badge variant={alert.isActive ? "default" : "secondary"}>
                            {alert.isActive ? "Ativo" : "Inativo"}
                          </Badge>
                          <Badge className={getUrgencyColor(alert.urgency)}>
                            {getUrgencyIcon(alert.urgency)}
                            {alert.urgency.toUpperCase()}
                          </Badge>
                        </div>
                        <p className="text-slate-600 dark:text-slate-400">{alert.message}</p>
                        <div className="flex flex-wrap gap-4 text-sm text-slate-500">
                          <span className="flex items-center gap-1">
                            <Eye className="h-3 w-3" />
                            {alert.viewCount || 0} visualizações
                          </span>
                          <span>👤 Por: {alert.senderName || 'Admin'}</span>
                          <span>📅 {new Date(alert.sentAt).toLocaleString('pt-BR')}</span>
                        </div>
                      </div>
                      <div className="flex gap-2 items-center ml-4">
                        <div className="flex items-center gap-2">
                          <label className="text-xs text-slate-500">Ativo:</label>
                          <Switch 
                            checked={alert.isActive} 
                            onCheckedChange={() => toggleAlertMutation.mutate(alert.id)}
                            disabled={toggleAlertMutation.isPending}
                          />
                        </div>
                        <Button 
                          size="sm" 
                          variant="outline" 
                          onClick={() => resendAlertMutation.mutate(alert.id)}
                          disabled={resendAlertMutation.isPending}
                          title="Reenviar alerta"
                          className="text-blue-600 hover:text-blue-700"
                        >
                          <Send className="h-4 w-4" />
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline" 
                          onClick={() => {
                            setSelectedAlert(alert);
                            setShowDeleteDialog(true);
                          }}
                          className="text-red-500 hover:text-red-700"
                          title="Excluir alerta"
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
              onClick={() => {
                if (!alertForm.title.trim() || !alertForm.message.trim()) {
                  toast({
                    title: "Campos obrigatórios",
                    description: "Título e mensagem são obrigatórios",
                    variant: "destructive",
                  });
                  return;
                }
                createAlertMutation.mutate(alertForm);
              }}
              disabled={createAlertMutation.isPending}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {createAlertMutation.isPending ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Enviando...
                </>
              ) : (
                <>
                  <Siren className="h-4 w-4 mr-2" />
                  Enviar Aviso
                </>
              )}
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
}