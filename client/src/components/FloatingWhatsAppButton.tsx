
import React, { useState } from 'react';
import { MessageCircle, X } from 'lucide-react';
import { useLocation } from 'wouter';

interface FloatingWhatsAppButtonProps {
  phoneNumber: string;
}

export function FloatingWhatsAppButton({ phoneNumber }: FloatingWhatsAppButtonProps) {
  const [location] = useLocation();
  const [isHovered, setIsHovered] = useState(false);

  // Não mostrar o botão nas páginas de admin
  if (location.startsWith('/admin')) {
    return null;
  }

  const handleWhatsAppClick = () => {
    const message = encodeURIComponent('Olá! Vim através do Buscador PXT e gostaria de mais informações.');
    const whatsappUrl = `https://wa.me/${phoneNumber.replace(/[^\d]/g, '')}?text=${message}`;
    window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="fixed bottom-6 right-6 z-50">
      <button
        onClick={handleWhatsAppClick}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className="group relative bg-green-500 hover:bg-green-600 text-white rounded-full w-14 h-14 flex items-center justify-center shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-110"
        title="Fale conosco no WhatsApp"
      >
        <MessageCircle className="h-6 w-6" />
        
        {/* Efeito de pulso */}
        <div className="absolute inset-0 rounded-full bg-green-500 animate-ping opacity-30"></div>
        
        {/* Tooltip */}
        {isHovered && (
          <div className="absolute bottom-full right-0 mb-2 px-3 py-2 bg-black text-white text-sm rounded-lg whitespace-nowrap opacity-90">
            Fale conosco no WhatsApp
            <div className="absolute top-full right-3 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-black"></div>
          </div>
        )}
      </button>
    </div>
  );
}
