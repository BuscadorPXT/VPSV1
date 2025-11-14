import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Switch } from './ui/switch';
import { Badge } from './ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Plus, Eye, BarChart3, Trash2, Power, PowerOff } from 'lucide-react';
import { useToast } from '../hooks/use-toast';
import { useAuth } from '../hooks/use-auth';
import { auth } from '../lib/firebase';

interface FeedbackAlert {
  id: number;
  title: string;
  message: string;
  feedbackType: string;
  isRequired: boolean;
  startDate: string;
  endDate: string;
  isActive: boolean;
  targetAudience: string;
  responseCount: number;
  createdAt: string;
}

interface FeedbackResponse {
  id: number;
  emojiResponse: string;
  textResponse: string;
  respondedAt: string;
  userEmail: string;
  userName: string;
}

export default function FeedbackAlertsAdmin() {
  const [alerts, setAlerts] = useState<FeedbackAlert[]>([]);
  const [responses, setResponses] = useState<FeedbackResponse[]>([]);
  const [emojiStats, setEmojiStats] = useState<any[]>([]);
  const [selectedAlert, setSelectedAlert] = useState<number | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showResponsesDialog, setShowResponsesDialog] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    message: '',
    feedbackType: 'both',
    isRequired: false,
    startDate: '',
    endDate: '',
    targetAudience: 'all'
  });

  const fetchAlerts = async () => {
    if (!user) return;

    try {
      // ✅ CORREÇÃO: Obter Firebase token
      const firebaseToken = await auth.currentUser?.getIdToken();
      if (!firebaseToken) {
        throw new Error('Token Firebase não encontrado');
      }

      const response = await fetch('/api/feedback-alerts/admin/list', {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${firebaseToken}`,
        },
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        setAlerts(data.alerts);
      }
    } catch (error) {
      console.error('Erro ao buscar avisos:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar avisos",
        variant: "destructive"
      });
    }
  };

  const createAlert = async () => {
    if (!user) {
      toast({
        title: "Erro",
        description: "Usuário não autenticado",
        variant: "destructive"
      });
      return;
    }

    // Validação dos campos obrigatórios
    if (!formData.title.trim()) {
      toast({
        title: "Erro",
        description: "Título é obrigatório",
        variant: "destructive"
      });
      return;
    }

    if (!formData.message.trim()) {
      toast({
        title: "Erro", 
        description: "Mensagem é obrigatória",
        variant: "destructive"
      });
      return;
    }

    if (!formData.startDate || !formData.endDate) {
      toast({
        title: "Erro",
        description: "Datas de início e fim são obrigatórias",
        variant: "destructive"
      });
      return;
    }

    // Validar se data de início é anterior à data de fim
    const startDate = new Date(formData.startDate);
    const endDate = new Date(formData.endDate);

    if (startDate >= endDate) {
      toast({
        title: "Erro",
        description: "Data de início deve ser anterior à data de fim",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    try {
      // ✅ CORREÇÃO: Obter Firebase token
      const firebaseToken = await auth.currentUser?.getIdToken();
      if (!firebaseToken) {
        throw new Error('Token Firebase não encontrado');
      }

      console.log('🔥 [FEEDBACK-ALERTS-ADMIN] Creating alert with data:', formData);

      const response = await fetch('/api/feedback-alerts/admin/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${firebaseToken}`,
        },
        credentials: 'include',
        body: JSON.stringify({
          ...formData,
          delaySeconds: 0 // Adicionar campo padrão
        })
      });

      if (response.ok) {
        toast({
          title: "Sucesso",
          description: "Aviso criado com sucesso!"
        });
        setShowCreateDialog(false);
        setFormData({
          title: '',
          message: '',
          feedbackType: 'both',
          isRequired: false,
          startDate: '',
          endDate: '',
          targetAudience: 'all'
        });
        fetchAlerts();
      } else {
        const errorData = await response.json();
        console.error('Erro ao criar aviso:', errorData);
        toast({
          title: "Erro",
          description: errorData.message || "Erro ao criar aviso",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Erro ao criar aviso:', error);
      toast({
        title: "Erro",
        description: "Erro ao criar aviso",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const toggleAlertStatus = async (alertId: number, isActive: boolean) => {
    if (!user) return;

    try {
      // ✅ CORREÇÃO: Obter Firebase token
      const firebaseToken = await auth.currentUser?.getIdToken();
      if (!firebaseToken) {
        throw new Error('Token Firebase não encontrado');
      }

      const response = await fetch(`/api/feedback-alerts/admin/${alertId}/toggle`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${firebaseToken}`,
          'Content-Type': 'application/json'
        },
        credentials: 'include',
      });

      if (response.ok) {
        toast({
          title: "Sucesso",
          description: isActive ? 'Aviso ativado' : 'Aviso desativado'
        });
        fetchAlerts();
      }
    } catch (error) {
      console.error('Erro ao alterar status:', error);
      toast({
        title: "Erro",
        description: "Erro ao alterar status",
        variant: "destructive"
      });
    }
  };

  const deleteAlert = async (alertId: number) => {
    if (!user || !confirm('Tem certeza que deseja deletar este aviso?')) return;

    try {
      // ✅ CORREÇÃO: Obter Firebase token
      const firebaseToken = await auth.currentUser?.getIdToken();
      if (!firebaseToken) {
        throw new Error('Token Firebase não encontrado');
      }

      const response = await fetch(`/api/feedback-alerts/admin/${alertId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${firebaseToken}`,
          'Content-Type': 'application/json'
        },
        credentials: 'include',
      });

      if (response.ok) {
        toast({
          title: "Sucesso", 
          description: "Aviso deletado com sucesso"
        });
        fetchAlerts();
      }
    } catch (error) {
      console.error('Erro ao deletar aviso:', error);
      toast({
        title: "Erro",
        description: "Erro ao deletar aviso",
        variant: "destructive"
      });
    }
  };

  const fetchResponses = async (alertId: number) => {
    if (!user) return;

    try {
      // ✅ CORREÇÃO: Obter Firebase token
      const firebaseToken = await auth.currentUser?.getIdToken();
      if (!firebaseToken) {
        throw new Error('Token Firebase não encontrado');
      }

      const response = await fetch(`/api/feedback-alerts/admin/${alertId}/responses`, {
        headers: {
          'Authorization': `Bearer ${firebaseToken}`,
          'Content-Type': 'application/json'
        },
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        setResponses(data.responses);
        setEmojiStats(data.emojiStats);
        setSelectedAlert(alertId);
        setShowResponsesDialog(true);
      }
    } catch (error) {
      console.error('Erro ao buscar respostas:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar respostas",
        variant: "destructive"
      });
    }
  };

  useEffect(() => {
    fetchAlerts();
  }, [user]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-slate-900">Feedback & Avisos de Login</h2>

        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Criar Aviso
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Criar Novo Aviso</DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-slate-700">Título</label>
                <Input
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Ex: Avaliação da nova interface"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-slate-700">Mensagem</label>
                <Textarea
                  value={formData.message}
                  onChange={(e) => setFormData(prev => ({ ...prev, message: e.target.value }))}
                  placeholder="Explique o que você gostaria de saber dos usuários..."
                  className="min-h-[80px]"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-slate-700">Tipo de Feedback</label>
                <Select
                  value={formData.feedbackType}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, feedbackType: value }))}
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

              <div>
                <label className="text-sm font-medium text-slate-700">Público-alvo</label>
                <Select
                  value={formData.targetAudience}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, targetAudience: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os usuários</SelectItem>
                    <SelectItem value="pro">Usuários PRO</SelectItem>
                    <SelectItem value="business">Usuários Business</SelectItem>
                    <SelectItem value="admin">Administradores</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-slate-700">Data de Início</label>
                  <Input
                    type="datetime-local"
                    value={formData.startDate}
                    onChange={(e) => setFormData(prev => ({ ...prev, startDate: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700">Data de Fim</label>
                  <Input
                    type="datetime-local"
                    value={formData.endDate}
                    onChange={(e) => setFormData(prev => ({ ...prev, endDate: e.target.value }))}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-slate-700">Feedback Obrigatório</label>
                <Switch
                  checked={formData.isRequired}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isRequired: checked }))}
                />
              </div>

              <div className="flex gap-2 pt-4">
                <Button variant="outline" onClick={() => setShowCreateDialog(false)} className="flex-1">
                  Cancelar
                </Button>
                <Button onClick={createAlert} disabled={isLoading} className="flex-1">
                  {isLoading ? 'Criando...' : 'Criar Aviso'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Avisos Criados</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Título</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Público</TableHead>
                <TableHead>Período</TableHead>
                <TableHead>Respostas</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {alerts.map((alert) => (
                <TableRow key={alert.id}>
                  <TableCell>
                    <div>
                      <div className="font-medium">{alert.title}</div>
                      {alert.isRequired && (
                        <Badge variant="destructive" className="text-xs mt-1">
                          Obrigatório
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {alert.feedbackType === 'emoji' && '🔘 Emojis'}
                      {alert.feedbackType === 'text' && '✍️ Texto'}
                      {alert.feedbackType === 'both' && '✅ Ambos'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">
                      {alert.targetAudience === 'all' && 'Todos'}
                      {alert.targetAudience === 'pro' && 'PRO'}
                      {alert.targetAudience === 'business' && 'Business'}
                      {alert.targetAudience === 'admin' && 'Admin'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm">
                    <div>{formatDate(alert.startDate)}</div>
                    <div className="text-slate-500">até {formatDate(alert.endDate)}</div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {alert.responseCount} respostas
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {alert.isActive ? (
                      <Badge className="bg-green-100 text-green-800">Ativo</Badge>
                    ) : (
                      <Badge variant="secondary">Inativo</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => fetchResponses(alert.id)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => toggleAlertStatus(alert.id, !alert.isActive)}
                      >
                        {alert.isActive ? (
                          <PowerOff className="h-4 w-4" />
                        ) : (
                          <Power className="h-4 w-4" />
                        )}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => deleteAlert(alert.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Dialog para ver respostas */}
      <Dialog open={showResponsesDialog} onOpenChange={setShowResponsesDialog}>
        <DialogContent className="sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle>Respostas do Aviso</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Estatísticas dos Emojis */}
            {emojiStats.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" />
                    Estatísticas dos Emojis
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-4">
                    {emojiStats.map((stat) => (
                      <div key={stat.emoji} className="text-center">
                        <div className="text-2xl">{stat.emoji}</div>
                        <div className="text-lg font-semibold">{stat.count}</div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Lista de Respostas */}
            <Card>
              <CardHeader>
                <CardTitle>Todas as Respostas</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Usuário</TableHead>
                      <TableHead>Emoji</TableHead>
                      <TableHead>Comentário</TableHead>
                      <TableHead>Data</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {responses.map((response) => (
                      <TableRow key={response.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{response.userName || 'Usuário'}</div>
                            <div className="text-sm text-slate-500">{response.userEmail}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {response.emojiResponse && (
                            <span className="text-2xl">{response.emojiResponse}</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {response.textResponse && (
                            <div className="max-w-xs truncate" title={response.textResponse}>
                              {response.textResponse}
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="text-sm">
                          {formatDate(response.respondedAt)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}