import React from 'react';
import { Lock, Clock } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface TesterWhatsAppButtonProps {
  supplierName: string;
  isTesterActive: boolean;
  daysRemaining: number;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'icon' | 'text' | 'link';
  className?: string;
}

export function TesterWhatsAppButton({ 
  supplierName, 
  isTesterActive,
  daysRemaining,
  size = 'md',
  variant = 'icon',
  className
}: TesterWhatsAppButtonProps) {

  // 🚨 VALIDAÇÃO CRÍTICA: Garantir que supplierName existe
  const validSupplierName = supplierName?.toString().trim() || 'Fornecedor não identificado';

  console.log('🔍 TesterWhatsAppButton DEBUG:', {
    supplierName: validSupplierName,
    originalSupplierName: supplierName,
    isTesterActive,
    daysRemaining,
    variant
  });

  // Sempre permitir clique no cadeado para upgrade
  const handleUpgradeClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const whatsappNumber = '5511963232465';
    const message = encodeURIComponent('Olá! Sou usuário Tester e gostaria de fazer upgrade para o plano Pro para ter acesso completo aos fornecedores.');
    const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${message}`;
    window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
  };

  const blockTextSelection = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    return false;
  };

  const buttonSizes = {
    sm: 'h-6 w-6 text-xs',
    md: 'h-8 w-8 text-sm',
    lg: 'h-10 w-10 text-base'
  };

  if (variant === 'link') {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={cn("flex items-center gap-1.5", className)}>
            {/* Nome do fornecedor - SEMPRE VISÍVEL */}
            <span 
              className="text-sm font-medium text-gray-700 dark:text-gray-300"
              style={{ 
                pointerEvents: 'none',
                userSelect: 'text'
              }}
            >
              {validSupplierName}
            </span>

            {/* Ícone de cadeado CLICÁVEL para upgrade */}
            <button 
              className="cursor-pointer text-gray-400 hover:text-orange-500 transition-colors duration-200 p-1 rounded hover:bg-orange-50 dark:hover:bg-orange-900/20"
              onClick={handleUpgradeClick}
              onMouseDown={blockTextSelection}
              onContextMenu={blockTextSelection}
              title="Clique para fazer upgrade ao plano Pro"
            >
              <Lock className="w-4 h-4" />
            </button>

            {/* Indicador de dias restantes */}
            {daysRemaining > 0 && (
              <div className="flex items-center gap-1 text-orange-600">
                <Clock className="h-3 w-3" />
                <span className="text-xs">{daysRemaining}d</span>
              </div>
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p className="text-xs">
            🔓 Clique no cadeado para fazer upgrade ao plano Pro e ter acesso aos fornecedores
            {daysRemaining > 0 && ` (${daysRemaining} dias de teste restantes)`}
          </p>
        </TooltipContent>
      </Tooltip>
    );
  }

  if (variant === 'text') {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={cn("flex items-center gap-2", className)}>
            {/* Nome do fornecedor - SEMPRE VISÍVEL */}
            <span 
              className="text-sm font-medium text-gray-700 dark:text-gray-300"
              style={{ 
                pointerEvents: 'none',
                userSelect: 'text'
              }}
            >
              {validSupplierName}
            </span>

            {/* Ícone de cadeado CLICÁVEL para upgrade */}
            <button 
              className="cursor-pointer text-gray-400 hover:text-orange-500 transition-colors duration-200 p-1 rounded hover:bg-orange-50 dark:hover:bg-orange-900/20"
              onClick={handleUpgradeClick}
              onMouseDown={blockTextSelection}
              onContextMenu={blockTextSelection}
              title="Clique para fazer upgrade ao plano Pro"
            >
              <Lock className="w-4 h-4" />
            </button>

            {/* Indicador de dias restantes */}
            {daysRemaining > 0 && (
              <div className="flex items-center gap-1 text-orange-600">
                <Clock className="h-3 w-3" />
                <span className="text-xs">{daysRemaining}d</span>
              </div>
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p className="text-xs">
            🔓 Clique no cadeado para fazer upgrade ao plano Pro e ter acesso aos fornecedores
            {daysRemaining > 0 && ` (${daysRemaining} dias de teste restantes)`}
          </p>
        </TooltipContent>
      </Tooltip>
    );
  }

  // Default icon variant
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className={cn("flex items-center gap-1.5", className)}>
          {/* Nome do fornecedor - SEMPRE VISÍVEL */}
          <span 
            className="text-xs font-medium text-gray-700 dark:text-gray-300"
            style={{ 
              pointerEvents: 'none',
              userSelect: 'text'
            }}
          >
            {validSupplierName}
          </span>

          {/* Ícone de cadeado CLICÁVEL para upgrade */}
          <button 
            className={cn(
              buttonSizes[size],
              "cursor-pointer flex items-center justify-center text-gray-400 hover:text-orange-500 transition-colors duration-200 rounded hover:bg-orange-50 dark:hover:bg-orange-900/20"
            )}
            onClick={handleUpgradeClick}
            onMouseDown={blockTextSelection}
            onContextMenu={blockTextSelection}
            title="Clique para fazer upgrade ao plano Pro"
          >
            <Lock className="w-3 h-3" />
          </button>

          {/* Indicador de dias restantes */}
          {daysRemaining > 0 && (
            <div className="flex items-center gap-1 text-orange-600">
              <Clock className="h-2 w-2" />
              <span className="text-xs">{daysRemaining}d</span>
            </div>
          )}
        </div>
      </TooltipTrigger>
      <TooltipContent>
        <p className="text-xs">
          🔓 Clique no cadeado para fazer upgrade ao plano Pro e ter acesso aos fornecedores
          {daysRemaining > 0 && ` (${daysRemaining} dias de teste restantes)`}
        </p>
      </TooltipContent>
    </Tooltip>
  );
}