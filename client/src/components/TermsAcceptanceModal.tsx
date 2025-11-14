
import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import { X, FileText, Check } from 'lucide-react';

interface TermsAcceptanceModalProps {
  isOpen: boolean;
  onAccept: () => void;
  onDecline: () => void;
}

export default function TermsAcceptanceModal({ isOpen, onAccept, onDecline }: TermsAcceptanceModalProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (isOpen) {
      // Pequeno delay para uma entrada suave
      setTimeout(() => {
        setIsVisible(true);
        setIsAnimating(true);
      }, 500);
    } else {
      setIsVisible(false);
      setIsAnimating(false);
    }
  }, [isOpen]);

  const handleAccept = () => {
    setIsAnimating(false);
    setTimeout(() => {
      onAccept();
    }, 300);
  };

  const handleDecline = () => {
    setIsAnimating(false);
    setTimeout(() => {
      onDecline();
    }, 300);
  };

  const handleClose = () => {
    setIsAnimating(false);
    setTimeout(() => {
      setIsVisible(false);
    }, 300);
  };

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-50 pointer-events-none">
      {/* Overlay sutil */}
      <div 
        className={`absolute inset-0 bg-black/10 transition-opacity duration-300 ${
          isAnimating ? 'opacity-100' : 'opacity-0'
        }`}
      />
      
      {/* Toast/Popup no canto inferior esquerdo */}
      <div className="absolute bottom-4 left-4 pointer-events-auto">
        <Card 
          className={`w-80 sm:w-96 shadow-2xl border-blue-200 bg-white transition-all duration-300 transform ${
            isAnimating 
              ? 'translate-y-0 opacity-100 scale-100' 
              : 'translate-y-4 opacity-0 scale-95'
          }`}
        >
          <CardContent className="p-4 space-y-3">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-blue-600" />
                <h3 className="font-semibold text-gray-900 text-sm">
                  Termos de Uso
                </h3>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClose}
                className="h-6 w-6 p-0 hover:bg-gray-100"
              >
                <X className="h-3 w-3" />
              </Button>
            </div>

            {/* Conteúdo resumido */}
            <div className="space-y-2">
              <p className="text-xs text-gray-600 leading-relaxed">
                Para usar o <strong>Buscador PXT</strong>, você precisa aceitar nossos termos de uso.
              </p>
              
              <div className="bg-blue-50 p-2 rounded text-xs text-blue-700 space-y-1">
                <p>• Plataforma de comparação de preços</p>
                <p>• Dados coletados de fornecedores externos</p>
                <p>• Uso responsável e informações verdadeiras</p>
              </div>
            </div>

            {/* Botões de ação */}
            <div className="flex gap-2 pt-1">
              <Button
                variant="outline"
                size="sm"
                onClick={handleDecline}
                className="flex-1 text-xs h-8 border-gray-300 text-gray-600 hover:bg-gray-50"
              >
                Recusar
              </Button>
              <Button
                onClick={handleAccept}
                size="sm"
                className="flex-1 text-xs h-8 bg-blue-600 hover:bg-blue-700 text-white"
              >
                <Check className="h-3 w-3 mr-1" />
                Aceitar
              </Button>
            </div>

            {/* Link para termos completos */}
            <p className="text-xs text-gray-400 text-center pt-1">
              Termos completos disponíveis após o login
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
