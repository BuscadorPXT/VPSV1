import React, { useState } from 'react';
import { Clock, CheckCircle, AlertTriangle, MessageCircle, X } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useTesterStatus } from '@/hooks/useTesterStatus';

export function TesterStatusCard() {
  const { testerStatus, loading } = useTesterStatus();
  const [isVisible, setIsVisible] = useState(true);

  if (loading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Carregando status...
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse">
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-2"></div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!testerStatus.isTester || !isVisible) {
    return null;
  }

  const handleUpgradeClick = () => {
    const whatsappNumber = '5511963232465';
    const message = encodeURIComponent('Olá! Sou usuário Tester e gostaria de ativar o plano Pro para continuar acessando os fornecedores.');
    const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${message}`;
    window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <Card className="w-full border-l-4 border-l-orange-500">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <Clock className="h-4 w-4 text-orange-500" />
            Status do Período de Teste
            {testerStatus.isActive ? (
              <Badge variant="default" className="bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200">
                Ativo
              </Badge>
            ) : (
              <Badge variant="destructive">
                Expirado
              </Badge>
            )}
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsVisible(false)}
            className="h-6 w-6 p-0 hover:bg-gray-100 dark:hover:bg-gray-800"
            title="Fechar aviso"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        <CardDescription>
          {testerStatus.isActive 
            ? 'Você está testando nossa plataforma' 
            : 'Seu período de teste acabou'
          }
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {testerStatus.isActive ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span className="font-medium">
                  Seu período de teste termina em {testerStatus.daysRemaining} dia{testerStatus.daysRemaining > 1 ? 's' : ''}
                </span>
              </div>
              
              {/* Barra de progresso visual */}
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div 
                  className={`h-2 rounded-full transition-all duration-300 ${
                    testerStatus.daysRemaining <= 2 ? 'bg-red-500' : 
                    testerStatus.daysRemaining <= 4 ? 'bg-orange-500' : 'bg-green-500'
                  }`}
                  style={{ width: `${Math.max(10, (testerStatus.daysRemaining / 7) * 100)}%` }}
                />
              </div>
              
              {/* Alerta crítico para últimos 2 dias */}
              {testerStatus.daysRemaining <= 2 && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 mt-2">
                  <div className="flex items-center gap-2 text-red-700 dark:text-red-300">
                    <AlertTriangle className="h-4 w-4" />
                    <span className="font-medium text-sm">
                      ⚠️ Seu acesso expira em breve! Ative o plano Pro para continuar.
                    </span>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2 text-sm">
              <AlertTriangle className="h-4 w-4 text-red-500" />
              <span className="font-medium text-red-700">
                Período de teste expirado
              </span>
            </div>
          )}
          
          <div className="text-xs text-gray-600">
            {testerStatus.isActive ? (
              <>
                <p>• Acesso limitado aos fornecedores</p>
                <p>• Links do WhatsApp bloqueados</p>
                <p>• Visualização completa dos preços</p>
                <p>• Período de teste de 7 dias</p>
              </>
            ) : (
              <>
                <p>• Acesso aos fornecedores suspenso</p>
                <p>• Links do WhatsApp bloqueados</p>
                <p>• Reative para continuar vendendo</p>
              </>
            )}
          </div>

          {/* CTA para ativar Pro quando ativo mas próximo ao fim */}
          {testerStatus.isActive && testerStatus.daysRemaining <= 4 && (
            <Button 
              onClick={handleUpgradeClick}
              className="w-full mt-3 bg-orange-500 hover:bg-orange-600"
              size="sm"
            >
              <MessageCircle className="h-4 w-4 mr-2" />
              Ativar Pro Antes que Expire
            </Button>
          )}

          {!testerStatus.isActive && (
            <Button 
              onClick={handleUpgradeClick}
              className="w-full mt-3"
              size="sm"
            >
              <MessageCircle className="h-4 w-4 mr-2" />
              Ativar Plano Pro
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}