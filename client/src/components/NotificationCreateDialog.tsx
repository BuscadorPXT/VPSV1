
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { Bell, Send, Users, Clock, AlertTriangle } from 'lucide-react';

interface NotificationFormData {
  title: string;
  message: string;
  type: 'info' | 'warning' | 'success' | 'error' | 'news' | 'update';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  targetAudience: string[];
  showAsPopup: boolean;
  showAsBanner: boolean;
  expiresAt: string;
}

export default function NotificationCreateDialog() {
  const [isOpen, setIsOpen] = useState(false);
  const [formData, setFormData] = useState<NotificationFormData>({
    title: '',
    message: '',
    type: 'info',
    priority: 'normal',
    targetAudience: ['all'],
    showAsPopup: true,
    showAsBanner: false,
    expiresAt: '',
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const createNotificationMutation = useMutation({
    mutationFn: async (data: NotificationFormData) => {
      return apiRequest('/api/notifications', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      toast({
        title: 'Sucesso',
        description: 'Notificação criada e enviada para os usuários',
      });
      setIsOpen(false);
      setFormData({
        title: '',
        message: '',
        type: 'info',
        priority: 'normal',
        targetAudience: ['all'],
        showAsPopup: true,
        showAsBanner: false,
        expiresAt: '',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
    },
    onError: (error: any) => {
      toast({
        title: 'Erro',
        description: error.message || 'Erro ao criar notificação',
        variant: 'destructive',
      });
    },
  });

  const handleTargetAudienceChange = (value: string, checked: boolean) => {
    if (value === 'all') {
      setFormData(prev => ({
        ...prev,
        targetAudience: checked ? ['all'] : []
      }));
    } else {
      setFormData(prev => {
        let newAudience = [...prev.targetAudience];
        
        // Remove 'all' se selecionando algo específico
        if (checked && newAudience.includes('all')) {
          newAudience = newAudience.filter(a => a !== 'all');
        }
        
        if (checked) {
          newAudience.push(value);
        } else {
          newAudience = newAudience.filter(a => a !== value);
        }
        
        // Se nada selecionado, volta para 'all'
        if (newAudience.length === 0) {
          newAudience = ['all'];
        }
        
        return {
          ...prev,
          targetAudience: newAudience
        };
      });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title.trim() || !formData.message.trim()) {
      toast({
        title: 'Erro',
        description: 'Título e mensagem são obrigatórios',
        variant: 'destructive',
      });
      return;
    }

    createNotificationMutation.mutate(formData);
  };

  const getTypeLabel = (type: string) => {
    const labels = {
      info: 'Informação',
      warning: 'Aviso',
      success: 'Sucesso',
      error: 'Erro',
      news: 'Notícia',
      update: 'Atualização'
    };
    return labels[type as keyof typeof labels] || type;
  };

  const getPriorityLabel = (priority: string) => {
    const labels = {
      low: 'Baixa',
      normal: 'Normal',
      high: 'Alta',
      urgent: 'Urgente'
    };
    return labels[priority as keyof typeof labels] || priority;
  };

  const getAudienceLabel = (audience: string) => {
    const labels = {
      all: 'Todos os usuários',
      free: 'Usuários gratuitos',
      pro: 'Usuários Pro',
      business: 'Usuários Business',
      admin: 'Administradores'
    };
    return labels[audience as keyof typeof labels] || audience;
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button className="w-full bg-white text-blue-600 hover:bg-blue-50">
          <Bell className="h-4 w-4 mr-2" />
          Criar Notificação
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Bell className="h-5 w-5" />
            <span>Criar Nova Notificação</span>
          </DialogTitle>
          <DialogDescription>
            Crie notificações que serão enviadas para os usuários em tempo real
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Informações Básicas */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="title">Título *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Título da notificação..."
                required
              />
            </div>

            <div>
              <Label htmlFor="message">Mensagem *</Label>
              <Textarea
                id="message"
                value={formData.message}
                onChange={(e) => setFormData(prev => ({ ...prev, message: e.target.value }))}
                placeholder="Conteúdo da notificação..."
                rows={4}
                required
              />
            </div>
          </div>

          {/* Configurações de Tipo e Prioridade */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="type">Tipo</Label>
              <Select value={formData.type} onValueChange={(value: any) => setFormData(prev => ({ ...prev, type: value }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="info">📢 Informação</SelectItem>
                  <SelectItem value="news">📰 Notícia</SelectItem>
                  <SelectItem value="update">🔄 Atualização</SelectItem>
                  <SelectItem value="success">✅ Sucesso</SelectItem>
                  <SelectItem value="warning">⚠️ Aviso</SelectItem>
                  <SelectItem value="error">❌ Erro</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="priority">Prioridade</Label>
              <Select value={formData.priority} onValueChange={(value: any) => setFormData(prev => ({ ...prev, priority: value }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">🔵 Baixa</SelectItem>
                  <SelectItem value="normal">🟡 Normal</SelectItem>
                  <SelectItem value="high">🟠 Alta</SelectItem>
                  <SelectItem value="urgent">🔴 Urgente</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Público-Alvo */}
          <div>
            <Label className="flex items-center space-x-2 mb-3">
              <Users className="h-4 w-4" />
              <span>Público-Alvo</span>
            </Label>
            <div className="grid grid-cols-2 gap-3">
              {[
                { value: 'all', label: 'Todos os usuários' },
                { value: 'free', label: 'Usuários gratuitos' },
                { value: 'pro', label: 'Usuários Pro' },
                { value: 'business', label: 'Usuários Business' },
                { value: 'admin', label: 'Administradores' }
              ].map((option) => (
                <div key={option.value} className="flex items-center space-x-2">
                  <Checkbox
                    id={`audience-${option.value}`}
                    checked={formData.targetAudience.includes(option.value)}
                    onCheckedChange={(checked) => handleTargetAudienceChange(option.value, checked as boolean)}
                  />
                  <Label htmlFor={`audience-${option.value}`} className="text-sm">
                    {option.label}
                  </Label>
                </div>
              ))}
            </div>
            <div className="flex flex-wrap gap-2 mt-2">
              {formData.targetAudience.map(audience => (
                <Badge key={audience} variant="secondary">
                  {getAudienceLabel(audience)}
                </Badge>
              ))}
            </div>
          </div>

          {/* Configurações de Exibição */}
          <div>
            <Label className="mb-3 block">Configurações de Exibição</Label>
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="showAsPopup"
                  checked={formData.showAsPopup}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, showAsPopup: checked as boolean }))}
                />
                <Label htmlFor="showAsPopup">Exibir como pop-up (toast)</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="showAsBanner"
                  checked={formData.showAsBanner}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, showAsBanner: checked as boolean }))}
                />
                <Label htmlFor="showAsBanner">Exibir como banner</Label>
              </div>
            </div>
          </div>

          {/* Data de Expiração */}
          <div>
            <Label htmlFor="expiresAt" className="flex items-center space-x-2">
              <Clock className="h-4 w-4" />
              <span>Data de Expiração (opcional)</span>
            </Label>
            <Input
              id="expiresAt"
              type="datetime-local"
              value={formData.expiresAt}
              onChange={(e) => setFormData(prev => ({ ...prev, expiresAt: e.target.value }))}
            />
            <p className="text-sm text-gray-500 mt-1">
              Se não definida, a notificação não expira
            </p>
          </div>

          {/* Preview */}
          <Card className="bg-gray-50 dark:bg-gray-900">
            <CardContent className="p-4">
              <Label className="mb-2 block font-medium">Preview da Notificação:</Label>
              <div className="bg-white dark:bg-gray-800 p-3 rounded-lg border">
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0 mt-1">
                    <div className="w-4 h-4 rounded-full bg-blue-500"></div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 mb-1">
                      <h4 className="font-medium text-gray-900 dark:text-gray-100">
                        {formData.title || 'Título da notificação'}
                      </h4>
                      <Badge variant="secondary" className="text-xs">
                        {getTypeLabel(formData.type)}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {getPriorityLabel(formData.priority)}
                      </Badge>
                    </div>
                    <p className="text-gray-700 dark:text-gray-300 text-sm">
                      {formData.message || 'Conteúdo da notificação aparecerá aqui...'}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
              Cancelar
            </Button>
            <Button 
              type="submit" 
              disabled={createNotificationMutation.isPending}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {createNotificationMutation.isPending ? (
                'Enviando...'
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Criar e Enviar
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
