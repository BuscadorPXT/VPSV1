import React, { useState } from 'react';
import { Plus, MessageSquare, BarChart3, Users, Calendar, Settings, Eye, Trash2, ToggleLeft, ToggleRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

interface FeedbackAlert {
  id: number;
  title: string;
  message: string;
  feedbackType: 'emoji' | 'text' | 'both';
  isRequired: boolean;
  startDate: string;
  endDate: string;
  targetAudience: 'all' | 'pro' | 'business' | 'admin';
  isActive: boolean;
  createdAt: string;
  responseCount?: number;
  delaySeconds: number;
}

interface FeedbackResponse {
  id: number;
  alertId: number;
  userId: number;
  userEmail: string;
  emojiResponse?: string;
  textResponse?: string;
  respondedAt: string;
}

const EMOJI_LABELS = {
  '😍': 'Adorei',
  '😊': 'Gostei',
  '😐': 'Neutro',
  '😕': 'Não gostei',
  '😠': 'Odiei'
};

export default function AdminFeedbackAlertsPage() {
  const [selectedAlert, setSelectedAlert] = useState<FeedbackAlert | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isResponsesDialogOpen, setIsResponsesDialogOpen] = useState(false);

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch alerts
  const { data: alertsResponse, isLoading, error } = useQuery<{ alerts: FeedbackAlert[] }>({
    queryKey: ['/api/feedback-alerts/admin/list'],
  });

  const alerts = alertsResponse?.alerts || [];

  // Fetch responses for selected alert
  const { data: responses = [] } = useQuery<FeedbackResponse[]>({
    queryKey: ['/api/feedback-alerts/admin', selectedAlert?.id, 'responses'],
    enabled: !!selectedAlert,
  });

  // Create alert mutation
  const createAlertMutation = useMutation({
    mutationFn: async (alertData: any) => {
      return apiRequest('/api/feedback-alerts/admin/create', {
        method: 'POST',
        body: JSON.stringify(alertData),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/feedback-alerts/admin/list'] });
      setIsCreateDialogOpen(false);
      toast({
        title: "Sucesso",
        description: "Aviso criado com sucesso!"
      });
    },
  });

  // Toggle alert status mutation
  const toggleAlertMutation = useMutation({
    mutationFn: async (alertId: number) => {
      return apiRequest(`/api/feedback-alerts/admin/${alertId}/toggle`, {
        method: 'PATCH',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/feedback-alerts/admin/list'] });
      toast({
        title: "Sucesso",
        description: "Status do aviso atualizado!"
      });
    },
  });

  // Delete alert mutation
  const deleteAlertMutation = useMutation({
    mutationFn: async (alertId: number) => {
      return apiRequest(`/api/feedback-alerts/admin/${alertId}`, {
        method: 'DELETE',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/feedback-alerts/admin/list'] });
      toast({
        title: "Sucesso",
        description: "Aviso removido com sucesso!"
      });
    },
  });

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusBadge = (alert: FeedbackAlert) => {
    const now = new Date();
    const startDate = new Date(alert.startDate);
    const endDate = new Date(alert.endDate);

    if (!alert.isActive) {
      return <Badge variant="secondary">Inativo</Badge>;
    }
    if (now < startDate) {
      return <Badge variant="outline">Agendado</Badge>;
    }
    if (now > endDate) {
      return <Badge variant="destructive">Expirado</Badge>;
    }
    return <Badge className="bg-green-500">Ativo</Badge>;
  };

  const getEmojiStats = (responses: FeedbackResponse[]) => {
    const emojiCounts = responses.reduce((acc, response) => {
      if (response.emojiResponse) {
        acc[response.emojiResponse] = (acc[response.emojiResponse] || 0) + 1;
      }
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(emojiCounts).map(([emoji, count]) => ({
      emoji,
      label: EMOJI_LABELS[emoji as keyof typeof EMOJI_LABELS] || emoji,
      count
    }));
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Feedback/Login Avisos</h1>
          <p className="text-slate-600">Gerencie avisos personalizados com feedback dos usuários</p>
        </div>
        <Button onClick={() => setIsCreateDialogOpen(true)} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Criar Novo Aviso
        </Button>
      </div>

      <Tabs defaultValue="alerts" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="alerts">Avisos</TabsTrigger>
          <TabsTrigger value="analytics">Estatísticas</TabsTrigger>
        </TabsList>

        <TabsContent value="alerts" className="space-y-4">
          {isLoading ? (
            <div className="text-center py-8">Carregando avisos...</div>
          ) : error ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <MessageSquare className="h-12 w-12 text-red-400 mb-4" />
                <h3 className="text-lg font-medium text-slate-900 mb-2">Erro ao carregar avisos</h3>
                <p className="text-slate-600 mb-4">Ocorreu um erro ao buscar os avisos. Tente novamente.</p>
              </CardContent>
            </Card>
          ) : !Array.isArray(alerts) || alerts.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <MessageSquare className="h-12 w-12 text-slate-400 mb-4" />
                <h3 className="text-lg font-medium text-slate-900 mb-2">Nenhum aviso criado</h3>
                <p className="text-slate-600 mb-4">Crie seu primeiro aviso para coletar feedback dos usuários</p>
                <Button onClick={() => setIsCreateDialogOpen(true)}>
                  Criar Primeiro Aviso
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {(Array.isArray(alerts) ? alerts : []).map((alert) => (
                <Card key={alert.id} className="hover:shadow-md transition-shadow">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <CardTitle className="text-lg">{alert.title}</CardTitle>
                        <div className="flex items-center gap-2">
                          {getStatusBadge(alert)}
                          <Badge variant="outline">
                            {alert.feedbackType === 'emoji' && '😊 Emoji'}
                            {alert.feedbackType === 'text' && '✍️ Texto'}
                            {alert.feedbackType === 'both' && '😊 + ✍️ Ambos'}
                          </Badge>
                          {alert.isRequired && (
                            <Badge variant="destructive">Obrigatório</Badge>
                          )}
                          <Badge variant="secondary">
                            {alert.targetAudience === 'all' && 'Todos'}
                            {alert.targetAudience === 'pro' && 'PRO'}
                            {alert.targetAudience === 'business' && 'Business'}
                            {alert.targetAudience === 'admin' && 'Admin'}
                          </Badge>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleAlertMutation.mutate(alert.id)}
                          disabled={toggleAlertMutation.isPending}
                        >
                          {alert.isActive ? (
                            <ToggleRight className="h-4 w-4 text-green-600" />
                          ) : (
                            <ToggleLeft className="h-4 w-4 text-gray-400" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedAlert(alert);
                            setIsResponsesDialogOpen(true);
                          }}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteAlertMutation.mutate(alert.id)}
                          disabled={deleteAlertMutation.isPending}
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-slate-600 mb-4">{alert.message}</p>
                    <div className="flex items-center justify-between text-sm text-slate-500">
                      <span>Período: {formatDate(alert.startDate)} - {formatDate(alert.endDate)}</span>
                      <span>{alert.responseCount || 0} respostas</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total de Avisos</CardTitle>
                <MessageSquare className="h-4 w-4 text-slate-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{Array.isArray(alerts) ? alerts.length : 0}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Avisos Ativos</CardTitle>
                <BarChart3 className="h-4 w-4 text-slate-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {Array.isArray(alerts) ? alerts.filter(alert => {
                    const now = new Date();
                    const startDate = new Date(alert.startDate);
                    const endDate = new Date(alert.endDate);
                    return alert.isActive && now >= startDate && now <= endDate;
                  }).length : 0}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total de Respostas</CardTitle>
                <Users className="h-4 w-4 text-slate-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {Array.isArray(alerts) ? alerts.reduce((sum, alert) => sum + (alert.responseCount || 0), 0) : 0}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Create Alert Dialog */}
      <CreateAlertDialog
        isOpen={isCreateDialogOpen}
        onClose={() => setIsCreateDialogOpen(false)}
        onSubmit={(data) => createAlertMutation.mutate(data)}
        isLoading={createAlertMutation.isPending}
      />

      {/* View Responses Dialog */}
      <ViewResponsesDialog
        alert={selectedAlert}
        responses={responses}
        isOpen={isResponsesDialogOpen}
        onClose={() => {
          setIsResponsesDialogOpen(false);
          setSelectedAlert(null);
        }}
      />
    </div>
  );
}

// Create Alert Dialog Component
function CreateAlertDialog({ 
  isOpen, 
  onClose, 
  onSubmit, 
  isLoading 
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  onSubmit: (data: any) => void;
  isLoading: boolean;
}) {
  const [formData, setFormData] = useState({
    title: '',
    message: '',
    feedbackType: 'both' as 'emoji' | 'text' | 'both',
    isRequired: false,
    startDate: '',
    endDate: '',
    targetAudience: 'all' as 'all' | 'pro' | 'business' | 'admin',
    delaySeconds: 15,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const resetForm = () => {
    setFormData({
      title: '',
      message: '',
      feedbackType: 'both',
      isRequired: false,
      startDate: '',
      endDate: '',
      targetAudience: 'all',
      delaySeconds: 15,
    });
  };

  React.useEffect(() => {
    if (!isOpen) {
      resetForm();
    }
  }, [isOpen]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Criar Novo Aviso</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Título do Aviso</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              placeholder="Ex: Nova atualização da plataforma"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="message">Mensagem</Label>
            <Textarea
              id="message"
              value={formData.message}
              onChange={(e) => setFormData(prev => ({ ...prev, message: e.target.value }))}
              placeholder="Ex: Estamos aprimorando o sistema, nos diga o que achou da nova interface!"
              required
            />
          </div>

          <div className="space-y-2">
            <Label>Tipo de Feedback</Label>
            <Select
              value={formData.feedbackType}
              onValueChange={(value: 'emoji' | 'text' | 'both') => 
                setFormData(prev => ({ ...prev, feedbackType: value }))
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="emoji">🔘 Enquete com emojis</SelectItem>
                <SelectItem value="text">✍️ Campo de sugestão aberta</SelectItem>
                <SelectItem value="both">✅ Ambos</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Público-alvo</Label>
            <Select
              value={formData.targetAudience}
              onValueChange={(value: 'all' | 'pro' | 'business' | 'admin') => 
                setFormData(prev => ({ ...prev, targetAudience: value }))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione o público" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os usuários</SelectItem>
                <SelectItem value="pro">Usuários PRO</SelectItem>
                <SelectItem value="business">Usuários Business</SelectItem>
                <SelectItem value="admin">Administradores</SelectItem>
              </SelectContent>
            </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="delaySeconds">⏱️ Delay para Exibição</Label>
                    <Select 
                      value={formData.delaySeconds.toString()} 
                      onValueChange={(value) => setFormData({...formData, delaySeconds: parseInt(value)})}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o tempo de delay" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="5">5 segundos</SelectItem>
                        <SelectItem value="10">10 segundos</SelectItem>
                        <SelectItem value="15">15 segundos (padrão)</SelectItem>
                        <SelectItem value="30">30 segundos</SelectItem>
                        <SelectItem value="60">1 minuto</SelectItem>
                        <SelectItem value="120">2 minutos</SelectItem>
                        <SelectItem value="300">5 minutos</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      Tempo que o sistema aguarda após o login do usuário antes de exibir o feedback
                    </p>
                  </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="isRequired"
              checked={formData.isRequired}
              onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isRequired: checked }))}
            />
            <Label htmlFor="isRequired">Feedback obrigatório</Label>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startDate">Data de Início</Label>
              <Input
                id="startDate"
                type="datetime-local"
                value={formData.startDate}
                onChange={(e) => setFormData(prev => ({ ...prev, startDate: e.target.value }))}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endDate">Data de Expiração</Label>
              <Input
                id="endDate"
                type="datetime-local"
                value={formData.endDate}
                onChange={(e) => setFormData(prev => ({ ...prev, endDate: e.target.value }))}
                required
              />
            </div>
          </div>

          <div className="flex gap-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading} className="flex-1">
              {isLoading ? 'Criando...' : 'Criar Aviso'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// View Responses Dialog Component
function ViewResponsesDialog({ 
  alert, 
  responses, 
  isOpen, 
  onClose 
}: { 
  alert: FeedbackAlert | null; 
  responses: FeedbackResponse[]; 
  isOpen: boolean; 
  onClose: () => void; 
}) {
  if (!alert) return null;

  const getEmojiStats = (responses: FeedbackResponse[]) => {
    const emojiCounts = responses.reduce((acc, response) => {
      if (response.emojiResponse) {
        acc[response.emojiResponse] = (acc[response.emojiResponse] || 0) + 1;
      }
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(emojiCounts).map(([emoji, count]) => ({
      emoji,
      label: EMOJI_LABELS[emoji as keyof typeof EMOJI_LABELS] || emoji,
      count
    }));
  };

  const emojiStats = responses.length > 0 ? getEmojiStats(responses) : [];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Respostas: {alert.title}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Statistics */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Total de Respostas</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{responses.length}</div>
              </CardContent>
            </Card>

            {emojiStats.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Distribuição de Emojis</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {emojiStats.map(({ emoji, label, count }) => (
                      <div key={emoji} className="flex items-center justify-between">
                        <span className="flex items-center gap-2">
                          <span className="text-lg">{emoji}</span>
                          <span className="text-sm">{label}</span>
                        </span>
                        <Badge variant="secondary">{count}</Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Responses List */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Todas as Respostas</h3>
            {responses.length === 0 ? (
              <p className="text-slate-600 text-center py-8">Nenhuma resposta ainda</p>
            ) : (
              <div className="space-y-3">
                {responses.map((response) => (
                  <Card key={response.id}>
                    <CardContent className="pt-4">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">{response.userEmail}</span>
                          {response.emojiResponse && (
                            <Badge variant="outline" className="flex items-center gap-1">
                              <span>{response.emojiResponse}</span>
                              <span className="text-xs">
                                {EMOJI_LABELS[response.emojiResponse as keyof typeof EMOJI_LABELS]}
                              </span>
                            </Badge>
                          )}
                        </div>
                        <span className="text-xs text-slate-500">
                          {new Date(response.respondedAt).toLocaleDateString('pt-BR', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </span>
                      </div>
                      {response.textResponse && (
                        <div className="bg-gray-50 rounded-lg p-3 mt-2">
                          <p className="text-sm text-gray-700">{response.textResponse}</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}