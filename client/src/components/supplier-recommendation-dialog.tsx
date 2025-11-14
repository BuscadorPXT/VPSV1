
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { UserPlus, Send, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { getAuthHeaders } from '@/lib/auth-api';

interface SupplierRecommendationDialogProps {
  trigger?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function SupplierRecommendationDialog({ trigger, open: controlledOpen, onOpenChange }: SupplierRecommendationDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const setOpen = onOpenChange || setInternalOpen;
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    supplierName: '',
    contact: '',
    comment: ''
  });
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.supplierName.trim()) {
      toast({
        title: "Erro",
        description: "Por favor, informe o nome do fornecedor.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      const headers = await getAuthHeaders();
      const response = await fetch('/api/supplier-recommendations', {
        method: 'POST',
        headers: {
          ...headers,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        throw new Error('Falha ao enviar indicação');
      }

      toast({
        title: "Indicação enviada com sucesso!",
        description: "Obrigado pela sua indicação. Iremos avaliar o fornecedor e entrar em contato se necessário.",
      });

      // Reset form and close dialog
      setFormData({ supplierName: '', contact: '', comment: '' });
      setOpen(false);
    } catch (error) {
      toast({
        title: "Erro ao enviar indicação",
        description: "Tente novamente em alguns instantes.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger && (
        <DialogTrigger asChild>
          {trigger}
        </DialogTrigger>
      )}
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-blue-600" />
            Indicar Novo Fornecedor
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="supplierName">Nome do Fornecedor *</Label>
            <Input
              id="supplierName"
              placeholder="Ex: Loja XYZ, Distribuidora ABC..."
              value={formData.supplierName}
              onChange={(e) => handleInputChange('supplierName', e.target.value)}
              disabled={isLoading}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="contact">Contato (Opcional)</Label>
            <Input
              id="contact"
              placeholder="Telefone, WhatsApp, site ou como encontrar..."
              value={formData.contact}
              onChange={(e) => handleInputChange('contact', e.target.value)}
              disabled={isLoading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="comment">Comentário (Opcional)</Label>
            <Textarea
              id="comment"
              placeholder="Conte-nos por que você recomenda este fornecedor..."
              value={formData.comment}
              onChange={(e) => handleInputChange('comment', e.target.value)}
              disabled={isLoading}
              rows={3}
            />
          </div>

          <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg">
            <div className="flex items-start gap-2">
              <CheckCircle className="h-4 w-4 text-blue-600 mt-0.5" />
              <div className="text-sm text-blue-800 dark:text-blue-300">
                <p className="font-medium">Sua indicação será avaliada</p>
                <p>Nossa equipe irá analisar o fornecedor e entrar em contato se necessário.</p>
              </div>
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isLoading}
              className="flex-1"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={isLoading}
              className="flex-1 gap-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Enviando...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  Enviar Indicação
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
