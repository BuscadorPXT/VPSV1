import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Clock, CreditCard, Calendar, ArrowRight } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';

export default function TrialSuccessPage() {
  const [sessionData, setSessionData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [, setLocation] = useLocation();

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const sessionId = urlParams.get('session_id');

    if (sessionId) {
      fetchSessionData(sessionId);
    } else {
      setIsLoading(false);
    }
  }, []);

  const fetchSessionData = async (sessionId: string) => {
    try {
      const response = await apiRequest("GET", `/api/stripe/session/${sessionId}`);
      const data = await response.json();
      setSessionData(data);
    } catch (error) {
      console.error('Error fetching session data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const calculateTrialEndDate = () => {
    const today = new Date();
    const trialEnd = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
    return trialEnd.toLocaleDateString('pt-BR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Success Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-green-100 rounded-full mb-6">
            <CheckCircle className="h-10 w-10 text-green-600" />
          </div>
          <h1 className="text-4xl font-bold text-slate-900 mb-4">
            Teste Grátis Ativado com Sucesso!
          </h1>
          <p className="text-xl text-slate-600 max-w-2xl mx-auto">
            Parabéns! Você agora tem acesso completo a todos os recursos premium do Buscador PXT por 7 dias.
          </p>
        </div>

        {/* Trial Info Card */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 mb-8">
          <div className="grid md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="bg-green-100 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4">
                <Clock className="h-6 w-6 text-green-600" />
              </div>
              <h3 className="font-semibold text-slate-900 mb-2">Período de Teste</h3>
              <p className="text-slate-600">
                7 dias gratuitos
              </p>
              <Badge className="bg-green-100 text-green-800 mt-2">
                Ativo agora
              </Badge>
            </div>

            <div className="text-center">
              <div className="bg-blue-100 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4">
                <Calendar className="h-6 w-6 text-blue-600" />
              </div>
              <h3 className="font-semibold text-slate-900 mb-2">Teste termina em</h3>
              <p className="text-slate-600 text-sm">
                {calculateTrialEndDate()}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Após esta data, sua assinatura inicia
              </p>
            </div>

            <div className="text-center">
              <div className="bg-purple-100 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4">
                <CreditCard className="h-6 w-6 text-purple-600" />
              </div>
              <h3 className="font-semibold text-slate-900 mb-2">Método de Pagamento</h3>
              <p className="text-slate-600">
                Cartão validado
              </p>
              <p className="text-xs text-slate-500 mt-1">
                {sessionData?.customer_email || 'Email confirmado'}
              </p>
            </div>
          </div>
        </div>

        {/* What's Next */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 mb-8">
          <h2 className="text-2xl font-bold text-slate-900 mb-6 text-center">
            O que acontece agora?
          </h2>
          
          <div className="space-y-6">
            <div className="flex items-start gap-4">
              <div className="bg-blue-100 w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                <span className="text-blue-600 font-semibold text-sm">1</span>
              </div>
              <div>
                <h3 className="font-semibold text-slate-900 mb-2">
                  Explore todos os recursos premium
                </h3>
                <p className="text-slate-600">
                  Você tem acesso completo a todos os fornecedores, filtros avançados, alertas de preço e muito mais.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="bg-green-100 w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                <span className="text-green-600 font-semibold text-sm">2</span>
              </div>
              <div>
                <h3 className="font-semibold text-slate-900 mb-2">
                  Use por 7 dias sem custo
                </h3>
                <p className="text-slate-600">
                  Seu cartão não será cobrado durante o período de teste. Aproveite para testar todas as funcionalidades.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="bg-purple-100 w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                <span className="text-purple-600 font-semibold text-sm">3</span>
              </div>
              <div>
                <h3 className="font-semibold text-slate-900 mb-2">
                  Decida se quer continuar
                </h3>
                <p className="text-slate-600">
                  Se gostar, sua assinatura iniciará automaticamente após 7 dias. Caso contrário, cancele antes do fim do período.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Important Info */}
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 mb-8">
          <h3 className="font-semibold text-amber-900 mb-3">
            Informações importantes sobre seu teste
          </h3>
          <ul className="space-y-2 text-amber-800">
            <li className="flex items-start gap-2">
              <span className="text-amber-600 mt-1">•</span>
              <span>Seu teste de 7 dias começou agora e termina em {calculateTrialEndDate()}</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-amber-600 mt-1">•</span>
              <span>Não haverá cobrança durante o período de teste</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-amber-600 mt-1">•</span>
              <span>Você pode cancelar a qualquer momento antes do fim do período de teste</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-amber-600 mt-1">•</span>
              <span>Após o teste, sua assinatura iniciará automaticamente com o plano escolhido</span>
            </li>
          </ul>
        </div>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button 
            onClick={() => setLocation('/dashboard')}
            size="lg"
            className="h-12 px-8"
          >
            Começar a usar agora
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
          
          <Button 
            onClick={() => setLocation('/products')}
            variant="outline"
            size="lg"
            className="h-12 px-8"
          >
            Ver produtos disponíveis
          </Button>
        </div>

        {/* Support */}
        <div className="text-center mt-12">
          <p className="text-slate-600">
            Precisa de ajuda? Entre em contato com nosso suporte durante seu período de teste.
          </p>
        </div>
      </div>
    </div>
  );
}