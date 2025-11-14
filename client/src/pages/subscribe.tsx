import { useState, useEffect } from 'react';
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Check, CreditCard } from 'lucide-react';

export default function Subscribe() {
  const [plan, setPlan] = useState("monthly");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  // Get plan from URL params on component mount
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const planParam = urlParams.get('plan');
    if (planParam && (planParam === 'monthly' || planParam === 'annual')) {
      setPlan(planParam);
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      console.log('🚀 Starting checkout for plan:', plan);
      
      const response = await apiRequest("POST", "/api/checkout-session", {
        plan: plan
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao criar sessão de pagamento');
      }

      const { url } = await response.json();
      
      if (url) {
        console.log('✅ Redirecting to Stripe Checkout:', url);
        window.location.href = url;
      } else {
        throw new Error('URL de checkout não recebida');
      }
    } catch (err: any) {
      console.error('❌ Checkout error:', err);
      toast({
        title: "Erro no Pagamento",
        description: err.message || "Ocorreu um erro inesperado. Tente novamente.",
        variant: "destructive",
      });
      setIsLoading(false);
    }
  };

  const planDetails = {
    monthly: {
      name: 'Plano Mensal',
      price: 'R$ 289,90',
      period: 'por mês',
      features: [
        'Acesso completo a todos os fornecedores',
        'Preços atualizados em tempo real',
        'Dashboard inteligente',
        'Alertas de preço personalizados',
        'Suporte por email'
      ]
    },
    annual: {
      name: 'Plano Anual',
      price: 'R$ 265,74',
      period: 'por mês (R$ 3.188,88/ano)',
      features: [
        'Todos os benefícios do plano mensal',
        'Economia de R$ 289,00 no ano',
        'Suporte prioritário',
        'Relatórios avançados',
        'API para integração'
      ]
    }
  };

  const currentPlan = planDetails[plan as keyof typeof planDetails];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 py-12">
      <div className="max-w-4xl mx-auto px-6">
        <div className="mb-8">
          <Button 
            variant="ghost" 
            onClick={() => setLocation('/')}
            className="text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar para página inicial
          </Button>

          <div className="text-center">
            <h1 className="text-3xl font-bold text-gray-900 mb-4">
              Finalizar Assinatura
            </h1>
            <p className="text-gray-600">
              Complete seu pagamento e comece a usar o Buscador PXT agora mesmo
            </p>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Plan Summary */}
          <Card className="bg-white shadow-lg">
            <CardHeader>
              <CardTitle className="text-xl text-gray-900">Resumo do Plano</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="border-b pb-4">
                  <h3 className="font-semibold text-gray-900">{currentPlan.name}</h3>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-bold text-blue-600">{currentPlan.price}</span>
                    <span className="text-gray-500 text-sm">{currentPlan.period}</span>
                  </div>
                </div>

                <div className="space-y-3">
                  <h4 className="font-medium text-gray-900">Incluído:</h4>
                  {currentPlan.features.map((feature, index) => (
                    <div key={index} className="flex items-center gap-3">
                      <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                      <span className="text-sm text-gray-700">{feature}</span>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Payment Form */}
          <Card className="bg-white shadow-lg">
            <CardHeader>
              <CardTitle className="text-xl text-gray-900 flex items-center gap-2">
                <CreditCard className="w-5 h-5" />
                Informações de Pagamento
              </CardTitle>
              <CardDescription>
                Seus dados estão protegidos com criptografia SSL
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="p-4 border rounded-lg bg-gray-50">
                  <div className="text-center py-4">
                    <CreditCard className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                    <p className="text-sm text-gray-600">
                      Você será redirecionado para o checkout seguro do Stripe
                    </p>
                  </div>
                </div>

                <Button 
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-semibold text-lg"
                >
                  {isLoading ? 'Redirecionando...' : `Confirmar Pagamento - ${currentPlan.price}`}
                </Button>

                <p className="text-xs text-gray-500 text-center">
                  Ao confirmar o pagamento, você concorda com nossos termos de serviço.
                  Você pode cancelar sua assinatura a qualquer momento.
                </p>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}