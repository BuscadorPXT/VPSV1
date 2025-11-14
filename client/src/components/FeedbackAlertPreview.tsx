
import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { Card } from './ui/card';
import { X, Send, Eye } from 'lucide-react';

interface FeedbackAlert {
  title: string;
  message: string;
  feedbackType: 'emoji' | 'text' | 'both';
  isRequired: boolean;
}

interface FeedbackAlertPreviewProps {
  alert: FeedbackAlert;
  isOpen: boolean;
  onClose: () => void;
}

const EMOJI_OPTIONS = [
  { emoji: '😍', label: 'Adorei' },
  { emoji: '😊', label: 'Gostei' },
  { emoji: '😐', label: 'Neutro' },
  { emoji: '😕', label: 'Não gostei' },
  { emoji: '😠', label: 'Odiei' }
];

export default function FeedbackAlertPreview({ alert, isOpen, onClose }: FeedbackAlertPreviewProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Eye className="h-5 w-5 text-blue-600" />
              <DialogTitle className="text-lg font-semibold text-slate-900">
                Preview do Aviso
              </DialogTitle>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose} className="h-8 w-8 p-0">
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        <div className="bg-slate-50 p-4 rounded-lg border-2 border-dashed border-slate-200">
          <div className="bg-white rounded-lg border shadow-sm">
            <div className="p-4 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-semibold text-slate-900">
                    {alert.title}
                  </h3>
                  {alert.isRequired && (
                    <div className="flex items-center gap-1 px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs font-medium">
                      <span className="w-2 h-2 bg-red-500 rounded-full"></span>
                      Obrigatório
                    </div>
                  )}
                </div>
                {!alert.isRequired && (
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0" disabled>
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>

              <p className="text-slate-600 text-sm">
                {alert.message}
              </p>

              {(alert.feedbackType === 'emoji' || alert.feedbackType === 'both') && (
                <Card className="p-4">
                  <h4 className="text-sm font-medium text-slate-700 mb-3">
                    Como você avalia isso?
                  </h4>
                  <div className="flex justify-between gap-2">
                    {EMOJI_OPTIONS.map(({ emoji, label }) => (
                      <Button
                        key={emoji}
                        variant="outline"
                        size="sm"
                        className="flex-1 flex flex-col items-center gap-1 h-auto py-3"
                        disabled
                      >
                        <span className="text-xl">{emoji}</span>
                        <span className="text-xs">{label}</span>
                      </Button>
                    ))}
                  </div>
                </Card>
              )}

              {(alert.feedbackType === 'text' || alert.feedbackType === 'both') && (
                <Card className="p-4">
                  <h4 className="text-sm font-medium text-slate-700 mb-3">
                    Deixe sua opinião ou sugestão:
                  </h4>
                  <Textarea
                    placeholder="Digite aqui sua opinião ou sugestão..."
                    className="min-h-[80px] resize-none"
                    disabled
                  />
                </Card>
              )}

              {alert.isRequired && (
                <div className="bg-red-50 dark:bg-red-900/20 border-l-4 border-red-400 dark:border-red-600 p-4 rounded-r-lg">
                  <div className="flex items-start gap-3">
                    <div className="w-5 h-5 bg-red-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-white text-xs font-bold">!</span>
                    </div>
                    <div>
                      <h4 className="text-red-800 dark:text-red-200 font-medium text-sm mb-1">
                        Feedback Obrigatório
                      </h4>
                      <p className="text-red-700 dark:text-red-300 text-xs leading-relaxed">
                        Para manter a qualidade da plataforma, precisamos da sua opinião sobre esta funcionalidade.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex gap-2 pt-2">
                {!alert.isRequired && (
                  <Button variant="outline" className="flex-1" disabled>
                    Pular
                  </Button>
                )}
                <Button className="flex-1 flex items-center gap-2" disabled>
                  <Send className="h-4 w-4" />
                  Enviar Feedback
                </Button>
              </div>
            </div>
          </div>
        </div>

        <div className="text-center">
          <p className="text-xs text-slate-500">
            👆 Este é o preview de como o aviso aparecerá para os usuários
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
