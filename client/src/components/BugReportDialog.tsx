import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Bug, Loader2, Send, User, Clock } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/api-client';
import { useAuth } from '@/hooks/use-auth';

interface BugReportDialogProps {
  children?: React.ReactNode;
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function BugReportDialog({ children, trigger, open: controlledOpen, onOpenChange }: BugReportDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const setOpen = onOpenChange || setInternalOpen;
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  // Form state simplificado
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    severity: '',
  });

  const handleInputChange = (field: string, value: string) => {
    let sanitizedValue = value;
    if (field === 'title') sanitizedValue = value.slice(0, 100);
    if (field === 'description') sanitizedValue = value.slice(0, 500);

    setFormData(prev => ({ ...prev, [field]: sanitizedValue }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title || !formData.description || !formData.severity) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha título, descrição e severidade",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const payload = {
        title: formData.title,
        description: formData.description,
        severity: formData.severity,
        category: 'outro', // categoria padrão para simplificar
        steps: '',
        expected: '',
        actual: '',
        browserInfo: navigator.userAgent.split(') ')[0] + ')',
        url: window.location.href,
      };

      const response = await apiRequest('/api/bug-report/submit', 'POST', payload);

      if (response.ok) {
        const result = await response.json();

        toast({
          title: "Bug reportado com sucesso!",
          description: `ID: ${result.reportId}`,
        });

        // Limpar e fechar
        setFormData({
          title: '',
          description: '',
          severity: '',
        });
        setOpen(false);
      } else {
        const errorData = await response.json().catch(() => ({ message: 'Erro desconhecido' }));
        throw new Error(errorData.message || `Erro ${response.status}`);
      }
    } catch (error) {
      console.error('Erro ao enviar bug report:', error);
      toast({
        title: "Erro ao enviar",
        description: error instanceof Error ? error.message : "Tente novamente",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getSeverityColor = (severity: string) => {
    const colors = {
      'baixa': 'text-green-600',
      'media': 'text-yellow-600', 
      'alta': 'text-orange-600',
      'critica': 'text-red-600'
    };
    return colors[severity as keyof typeof colors] || 'text-gray-600';
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || children}
      </DialogTrigger>

      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bug className="h-5 w-5 text-red-500" />
            Reportar Bug
          </DialogTitle>
          <DialogDescription>
            Descreva o problema encontrado. Seu reporte será enviado para nossa equipe.
          </DialogDescription>
        </DialogHeader>

        {/* Informações do usuário */}
        <div className="bg-muted/50 p-3 rounded-lg space-y-2 text-sm">
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">{user?.name || user?.email}</span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span>{new Date().toLocaleString('pt-BR')}</span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Título */}
          <div className="space-y-2">
            <Label htmlFor="title">Título do Problema *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => handleInputChange('title', e.target.value)}
              placeholder="Ex: Botão não funciona na página X"
              maxLength={100}
              required
            />
            <p className="text-xs text-muted-foreground">
              {formData.title.length}/100 caracteres
            </p>
          </div>

          {/* Severidade */}
          <div className="space-y-2">
            <Label htmlFor="severity">Severidade *</Label>
            <Select value={formData.severity} onValueChange={(value) => handleInputChange('severity', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione a gravidade" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="baixa">
                  <span className="text-green-600">🟢 Baixa</span>
                </SelectItem>
                <SelectItem value="media">
                  <span className="text-yellow-600">🟡 Média</span>
                </SelectItem>
                <SelectItem value="alta">
                  <span className="text-orange-600">🟠 Alta</span>
                </SelectItem>
                <SelectItem value="critica">
                  <span className="text-red-600">🔴 Crítica</span>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Descrição */}
          <div className="space-y-2">
            <Label htmlFor="description">Descrição do Problema *</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              placeholder="Descreva o que aconteceu, onde aconteceu e como reproduzir o problema..."
              rows={4}
              maxLength={500}
              required
            />
            <p className="text-xs text-muted-foreground">
              {formData.description.length}/500 caracteres
            </p>
          </div>

          {/* Preview da severidade */}
          {formData.severity && (
            <div className="text-sm">
              <span className="text-muted-foreground">Severidade: </span>
              <span className={getSeverityColor(formData.severity)}>
                {formData.severity.toUpperCase()}
              </span>
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => setOpen(false)}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button 
              type="submit" 
              disabled={isSubmitting || !formData.title || !formData.description || !formData.severity}
              className="gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Enviando...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  Enviar
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}