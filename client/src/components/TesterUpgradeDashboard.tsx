
import React from 'react';
import { Crown, Zap, Shield, CheckCircle, Clock, MessageCircle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface TesterUpgradeDashboardProps {
  daysRemaining: number;
  isExpired: boolean;
}

export function TesterUpgradeDashboard({ daysRemaining, isExpired }: TesterUpgradeDashboardProps) {
  const handleUpgradeClick = () => {
    const whatsappNumber = '5511963232465';
    const message = encodeURIComponent(
      isExpired 
        ? 'Meu teste expirou! Quero ativar o plano Pro imediatamente.' 
        : `Sou usuário Tester (${daysRemaining} dias restantes) e quero ativar o plano Pro agora!`
    );
    const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${message}`;
    window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="text-center space-y-4">
        <div className="flex items-center justify-center gap-3">
          <Crown className="h-8 w-8 text-yellow-500" />
          <h1 className="text-3xl font-bold">Upgrade para Pro</h1>
          <Crown className="h-8 w-8 text-yellow-500" />
        </div>
        
        {isExpired ? (
          <Badge variant="destructive" className="text-lg px-4 py-2">
            ❌ Período Expirado
          </Badge>
        ) : (
          <Badge className="text-lg px-4 py-2 bg-orange-100 text-orange-800">
            ⏰ {daysRemaining} dias restantes
          </Badge>
        )}
      </div>

      {/* Comparação de Planos */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Plano Tester */}
        <Card className="border-2 border-orange-200">
          <CardHeader className="text-center">
            <CardTitle className="flex items-center justify-center gap-2">
              <Clock className="h-5 w-5 text-orange-500" />
              Plano Tester
            </CardTitle>
            <CardDescription>Período de teste limitado</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span>Visualização de preços</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-red-600">
                <span className="text-red-500">❌</span>
                <span>Links do WhatsApp bloqueados</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-red-600">
                <span className="text-red-500">❌</span>
                <span>Contato com fornecedores limitado</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-red-600">
                <span className="text-red-500">⏰</span>
                <span>Expira em 7 dias</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Plano Pro */}
        <Card className="border-2 border-green-500 bg-gradient-to-br from-green-50 to-emerald-50">
          <CardHeader className="text-center">
            <CardTitle className="flex items-center justify-center gap-2 text-green-700">
              <Crown className="h-5 w-5 text-yellow-500" />
              Plano Pro
              <Badge className="bg-yellow-500 text-yellow-900">RECOMENDADO</Badge>
            </CardTitle>
            <CardDescription>Acesso completo e ilimitado</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span>Preços em tempo real</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span>Links diretos do WhatsApp</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span>Contato ilimitado com fornecedores</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span>Suporte prioritário</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Zap className="h-4 w-4 text-yellow-500" />
                <span>Sem limitações de tempo</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Benefícios Especiais */}
      <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-blue-700">
            <Shield className="h-5 w-5" />
            Benefícios Exclusivos para Ex-Testers
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-2xl mb-2">🎁</div>
              <h3 className="font-semibold">Desconto Especial</h3>
              <p className="text-sm text-gray-600">Preço especial para quem testou</p>
            </div>
            <div className="text-center">
              <div className="text-2xl mb-2">⚡</div>
              <h3 className="font-semibold">Ativação Imediata</h3>
              <p className="text-sm text-gray-600">Acesso liberado na hora</p>
            </div>
            <div className="text-center">
              <div className="text-2xl mb-2">🏆</div>
              <h3 className="font-semibold">Suporte VIP</h3>
              <p className="text-sm text-gray-600">Atendimento prioritário</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* CTA Principal */}
      <div className="text-center space-y-4">
        <Button 
          onClick={handleUpgradeClick}
          size="lg"
          className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white px-8 py-4 text-lg"
        >
          <MessageCircle className="h-5 w-5 mr-2" />
          {isExpired ? 'Reativar Agora no WhatsApp' : 'Ativar Pro Antes que Expire'}
        </Button>
        
        <p className="text-sm text-gray-600">
          📱 Conversa direta no WhatsApp • ⚡ Ativação em minutos • 🔒 Processo seguro
        </p>
      </div>

      {/* Urgência */}
      {!isExpired && daysRemaining <= 2 && (
        <Card className="bg-red-50 border-red-200">
          <CardContent className="text-center py-6">
            <h3 className="text-red-700 font-semibold text-lg">🚨 Últimos dias!</h3>
            <p className="text-red-600">
              Não perca acesso aos fornecedores. Ative agora e continue vendendo!
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
