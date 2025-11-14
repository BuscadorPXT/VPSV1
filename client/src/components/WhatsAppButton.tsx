import React from 'react';
import { Button } from './ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';
import { MessageCircle, Lock } from 'lucide-react';
import { useAuth } from '../hooks/use-auth';
import { canUserAccessFeature, canTesterAccessWhatsApp } from '@shared/subscription';
import { TesterWhatsAppButton } from './TesterWhatsAppButton';
import { formatPrice } from '../lib/formatters';

interface WhatsAppButtonProps {
  whatsappNumber: string;
  supplierName: string;
  variant?: 'default' | 'outline' | 'ghost' | 'link' | 'text';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  productModel?: string;
  productBrand?: string;
  productColor?: string;
  productStorage?: string;
  productCategory?: string;
  productPrice?: number;
  productRegion?: string;
  // Novos props para múltiplos produtos
  multipleProducts?: Array<{
    model: string;
    brand?: string;
    color?: string;
    storage?: string;
    price?: number;
    region?: string;
    quantity?: number;
  }>;
  customMessage?: string;
  totalValue?: number;
}

export function WhatsAppButton({
  whatsappNumber,
  supplierName,
  variant = 'outline',
  size = 'sm',
  className = '',
  productModel,
  productBrand,
  productColor,
  productStorage,
  productCategory,
  productPrice,
  productRegion,
  multipleProducts,
  customMessage,
  totalValue
}: WhatsAppButtonProps) {
  const { user } = useAuth();

  // 🎯 LÓGICA CORRIGIDA: Verificar se é admin PRIMEIRO
  const isAdmin = user?.isAdmin === true || 
                  user?.role === 'admin' || 
                  user?.role === 'superadmin' ||
                  user?.role === 'super_admin';

  const isPro = user?.role === 'pro' || user?.subscriptionPlan === 'pro';
  const isBusiness = user?.role === 'business' || user?.subscriptionPlan === 'business';

  // Apenas usuários TESTER são bloqueados - ADMINS SEMPRE TÊM ACESSO
  const isTester = user?.role === 'tester' || user?.subscriptionPlan === 'tester';
  const isBlockedFromWhatsApp = isTester && !isAdmin; // Admin nunca é bloqueado
  const canAccessWhatsApp = !isBlockedFromWhatsApp;

  // Detectar se é mobile
  const isMobile = window.innerWidth <= 768 || /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

  // Se for usuário TESTER, usar o componente específico (bloqueado)
  if (isTester) {
    return (
      <TesterWhatsAppButton
        supplierName={supplierName}
        isTesterActive={false} // Testers sempre bloqueados
        daysRemaining={user?.trialDaysRemaining || 0}
        size={size}
        variant={variant}
        className={className}
      />
    );
  }

  // ✅ TODOS OS OUTROS USUÁRIOS (PRO, BUSINESS, ADMIN, etc.) TÊM ACESSO
  // Não há mais verificação adicional de hasWhatsAppAccess aqui


  // Função para rastrear clique e abrir WhatsApp
  const handleWhatsAppClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const isMobile = window.innerWidth <= 768 || /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

    try {
      // Obter token de sessão correto
      const sessionToken = localStorage.getItem('sessionToken') || 
                          localStorage.getItem('token') || 
                          localStorage.getItem('firebaseToken');

      // Registrar o clique para analytics
      await fetch('/api/whatsapp-tracking/click', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionToken}`,
          'X-Session-Token': sessionToken
        },
        body: JSON.stringify({
          productModel: productModel,
          productBrand: productBrand,
          productColor: productColor,
          productStorage: productStorage,
          productCategory: productCategory,
          productPrice: productPrice,
          productRegion: productRegion,
          supplierName: supplierName,
          whatsappNumber: whatsappNumber
        })
      });
    } catch (error) {
      // Silently continue if tracking fails
      if (!isMobile) {
        console.error('Erro ao registrar clique do WhatsApp:', error);
      }
    }

    // Limpar e validar número do WhatsApp
    const cleanWhatsAppNumber = whatsappNumber.replace(/[^\d]/g, '');

    if (!cleanWhatsAppNumber || cleanWhatsAppNumber.length < 10) {
      alert('Número do WhatsApp inválido. Entre em contato com o suporte.');
      return;
    }

    // Gerar mensagem baseada nos produtos (múltiplos ou único)
    let messageContent: string;

    if (customMessage) {
      messageContent = customMessage;
    } else if (multipleProducts && multipleProducts.length > 0) {
      // Mensagem para múltiplos produtos
      const productLines = multipleProducts.map(product => {
        const productInfo = [product.model, product.brand, product.color, product.storage, product.region]
          .filter(Boolean)
          .join(' ')
          .trim();

        const quantityInfo = product.quantity && product.quantity > 1 ? ` (${product.quantity}x)` : '';
        const priceInfo = product.price ? ` - ${formatPrice(product.price)}` : '';

        return `- ${productInfo}${quantityInfo}${priceInfo}`;
      });

      const totalInfo = totalValue ? `\n\nTotal: ${formatPrice(totalValue)}` : '';

      messageContent = `Olá! Vi estes produtos no Buscador PXT e gostaria de saber se tem disponível:\n\n${productLines.join('\n')}${totalInfo}`;
    } else {
      // Mensagem para produto único (comportamento atual)
      const productInfo = [
        productModel,
        productBrand,
        productColor,
        productStorage,
        productRegion
      ].filter(Boolean)
       .map(info => {
         if (!info) return '';

         let cleanInfo = info.toString().trim();

         // Remover apenas o nome exato do fornecedor, mantendo outras informações técnicas
         if (supplierName && supplierName.trim()) {
           const escapedSupplierName = supplierName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
           cleanInfo = cleanInfo.replace(new RegExp(`\\b${escapedSupplierName}\\b`, 'gi'), '');
         }

         // Limpeza básica apenas para remover espaços extras
         cleanInfo = cleanInfo
           .replace(/\s+/g, ' ')
           .trim();

         return cleanInfo;
       })
       .filter(info => info && info.length > 0)
       .join(' ')
       .trim();

      const priceInfo = productPrice ? ` - ${formatPrice(productPrice)}` : '';
      messageContent = `Olá! Vi este produto no Buscador PXT e gostaria de saber se tem disponível:\n\n- ${productInfo || 'Produto consultado'}${priceInfo}`;
    }

    const message = encodeURIComponent(messageContent);

    // Gerar URL do WhatsApp
    const whatsappUrl = `https://wa.me/${cleanWhatsAppNumber}?text=${message}`;

    // Estratégia específica para mobile
    if (isMobile) {
      // Tentar múltiplas estratégias para mobile
      try {
        // Estratégia 1: window.location para deep link
        window.location.href = whatsappUrl;

        // Estratégia 2: Fallback após delay
        setTimeout(() => {
          try {
            window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
          } catch (fallbackError) {
            // Estratégia 3: window.location como último recurso
            window.location.assign(whatsappUrl);
          }
        }, 500);

      } catch (mobileError) {
        // Último recurso: window.open tradicional
        window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
      }
    } else {
      // Desktop: usar window.open tradicional
      window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
    }
  };

  // Renderizar botão normal do WhatsApp
  if (variant === 'text' || variant === 'link') {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={handleWhatsAppClick}
              className={`text-sm font-medium text-green-600 hover:text-green-700 hover:underline transition-colors touch-manipulation select-none ${className}`}
            >
              {supplierName}
            </button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Entrar em contato com {supplierName} via WhatsApp</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant={variant}
            size={size}
            onClick={handleWhatsAppClick}
            className={`bg-green-50 hover:bg-green-100 dark:bg-green-900/50 dark:hover:bg-green-800/50 text-green-600 dark:text-green-400 border-green-300 dark:border-green-700 transition-colors touch-manipulation select-none ${className}`}
          >
            <MessageCircle className="h-4 w-4 mr-2" />
            WhatsApp
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Entrar em contato com {supplierName} via WhatsApp</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}