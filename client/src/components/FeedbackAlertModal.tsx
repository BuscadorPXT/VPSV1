import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { Card } from './ui/card';
import { useToast } from '@/hooks/use-toast';
import { X, Send } from 'lucide-react';

interface FeedbackAlert {
  id: number;
  title: string;
  message: string;
  feedbackType: 'emoji' | 'text' | 'both';
  isRequired: boolean;
}

interface FeedbackAlertModalProps {
  alert: FeedbackAlert | null;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (alertId: number, emojiResponse?: string, textResponse?: string) => Promise<void>;
}

const EMOJI_OPTIONS = [
  { emoji: '😍', label: 'Adorei' },
  { emoji: '😊', label: 'Gostei' },
  { emoji: '😐', label: 'Neutro' },
  { emoji: '😕', label: 'Não gostei' },
  { emoji: '😠', label: 'Odiei' }
];

import FeedbackErrorBoundary from './FeedbackErrorBoundary';

export default function FeedbackAlertModal({ alert, isOpen, onClose, onSubmit }: FeedbackAlertModalProps) {
  const [selectedEmoji, setSelectedEmoji] = useState<string>('');
  const [textResponse, setTextResponse] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  if (!alert) return null;

  const handleSubmit = async () => {
    if (alert.isRequired) {
      if (alert.feedbackType === 'emoji' && !selectedEmoji) {
        toast({
            title: "Erro",
            description: "Por favor, selecione uma reação",
            variant: "destructive"
          });
        return;
      }
      if (alert.feedbackType === 'text' && !textResponse.trim()) {
        toast({
            title: "Erro",
            description: "Por favor, digite sua opinião",
            variant: "destructive"
          });
        return;
      }
      if (alert.feedbackType === 'both' && !selectedEmoji && !textResponse.trim()) {
        toast({
            title: "Erro",
            description: "Por favor, forneça pelo menos uma resposta",
            variant: "destructive"
          });
        return;
      }
    }

    setIsSubmitting(true);
    try {
      await onSubmit(alert.id, selectedEmoji, textResponse);
      setSelectedEmoji('');
      setTextResponse('');
      onClose();
      toast({
        title: "Sucesso",
        description: "Obrigado pelo seu feedback!"
      });
    } catch (error) {
      toast({
            title: "Erro",
            description: "Erro ao enviar feedback",
            variant: "destructive"
          });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (alert.isRequired) {
      toast({
        title: "Aviso",
        description: "Este feedback é obrigatório para continuar",
        variant: "destructive"
      });
      return;
    }
    onClose();
  };

  return (
    <FeedbackErrorBoundary>
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <DialogTitle className="text-lg font-semibold text-slate-900">
                {alert.title}
              </DialogTitle>
              {alert.isRequired && (
                <div className="flex items-center gap-1 px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs font-medium">
                  <span className="w-2 h-2 bg-red-500 rounded-full"></span>
                  Obrigatório
                </div>
              )}
            </div>
            {!alert.isRequired && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClose}
                className="h-8 w-8 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </DialogHeader>

        <div className="space-y-4">
          <p className="text-slate-600 text-sm">
            {alert.message}
          </p>

          {/* Seleção de Emoji */}
          {(alert.feedbackType === 'emoji' || alert.feedbackType === 'both') && (
            <Card className="p-4">
              <h4 className="text-sm font-medium text-slate-700 mb-3">
                Como você avalia isso?
              </h4>
              <div className="flex justify-between gap-2">
                {EMOJI_OPTIONS.map(({ emoji, label }) => (
                  <Button
                    key={emoji}
                    variant={selectedEmoji === emoji ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedEmoji(emoji)}
                    className="flex-1 flex flex-col items-center gap-1 h-auto py-3"
                  >
                    <span className="text-xl">{emoji}</span>
                    <span className="text-xs">{label}</span>
                  </Button>
                ))}
              </div>
            </Card>
          )}

          {/* Campo de Texto */}
          {(alert.feedbackType === 'text' || alert.feedbackType === 'both') && (
            <Card className="p-4">
              <h4 className="text-sm font-medium text-slate-700 mb-3">
                Deixe sua opinião ou sugestão:
              </h4>
              <Textarea
                value={textResponse}
                onChange={(e) => setTextResponse(e.target.value)}
                placeholder="Digite aqui sua opinião ou sugestão..."
                className="min-h-[80px] resize-none"
                maxLength={500}
              />
              <div className="text-xs text-slate-500 text-right mt-1">
                {textResponse.length}/500
              </div>
            </Card>
          )}

          {alert.isRequired && (
            <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded-r-lg">
              <div className="flex items-start gap-3">
                <div className="w-5 h-5 bg-red-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-white text-xs font-bold">!</span>
                </div>
                <div>
                  <h4 className="text-red-800 font-medium text-sm mb-1">
                    Feedback Obrigatório
                  </h4>
                  <p className="text-red-700 text-xs leading-relaxed">
                    Para manter a qualidade da plataforma, precisamos da sua opinião sobre esta funcionalidade. 
                    Não é possível pular este feedback.
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="flex gap-2 pt-2">
            {!alert.isRequired && (
              <Button
                variant="outline"
                onClick={handleClose}
                className="flex-1"
              >
                Pular
              </Button>
            )}
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="flex-1 flex items-center gap-2"
            >
              <Send className="h-4 w-4" />
              {isSubmitting ? 'Enviando...' : 'Enviar Feedback'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
    </FeedbackErrorBoundary>
  );
}