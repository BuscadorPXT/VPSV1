import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Check, Clock, CreditCard, Shield, X } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

const signupSchema = z.object({
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  email: z.string().email('E-mail inválido'),
  whatsapp: z.string().min(10, 'WhatsApp deve ter pelo menos 10 dígitos'),
  company: z.string().min(2, 'Nome da empresa deve ter pelo menos 2 caracteres'),
  plan: z.enum(['monthly', 'annual']).default('monthly')
});

type SignupForm = z.infer<typeof signupSchema>;

interface TrialSignupModalProps {
  open: boolean;
  onClose: () => void;
}

export default function TrialSignupModal({ open, onClose }: TrialSignupModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'annual'>('monthly');
  const { toast } = useToast();

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch
  } = useForm<SignupForm>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      plan: 'monthly'
    }
  });

  const onSubmit = async (data: SignupForm) => {
    setIsLoading(true);
    
    try {
      console.log('🚀 Starting trial signup:', data);
      
      // 1. Create user account and auto-login
      const signupResponse = await apiRequest('/api/trial-signup', 'POST', {
        name: data.name,
        email: data.email,
        whatsapp: data.whatsapp,
        company: data.company,
        plan: data.plan
      });

      if (!signupResponse.ok) {
        const errorData = await signupResponse.json();
        throw new Error(errorData.error || 'Erro ao criar conta');
      }

      const { user, token } = await signupResponse.json();
      console.log('✅ User created and logged in:', user.email);

      // Store auth token (if using token-based auth)
      if (token) {
        localStorage.setItem('authToken', token);
      }

      // 2. Create Stripe checkout session using the session token
      const checkoutResponse = await fetch('/api/create-trial-checkout', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ plan: data.plan })
      });

      if (!checkoutResponse.ok) {
        const errorData = await checkoutResponse.json();
        throw new Error(errorData.error || 'Erro ao criar sessão de pagamento');
      }

      const { url } = await checkoutResponse.json();
      
      console.log('✅ Redirecting to Stripe Checkout:', url);
      
      // 3. Redirect to Stripe Checkout
      window.location.href = url;
      
    } catch (error: any) {
      console.error('❌ Trial signup error:', error);
      toast({
        title: "Erro no Cadastro",
        description: error.message || "Ocorreu um erro inesperado. Tente novamente.",
        variant: "destructive",
      });
      setIsLoading(false);
    }
  };

  const planPricing = {
    monthly: {
      amount: 'R$ 289,90',
      period: '/mês',
      savings: null
    },
    annual: {
      amount: 'R$ 265,74',
      period: '/mês',
      savings: 'Economize R$ 289,00/ano'
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-2xl font-bold">
              Comece seu teste grátis de 7 dias
            </DialogTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="h-8 w-8 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Trial Benefits */}
          <div className="bg-gradient-to-r from-green-50 to-blue-50 p-4 rounded-lg border border-green-200">
            <div className="flex items-center gap-2 mb-3">
              <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
                <Clock className="w-3 h-3 mr-1" />
                7 dias grátis
              </Badge>
              <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">
                <Shield className="w-3 h-3 mr-1" />
                Sem compromisso
              </Badge>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-green-600" />
                <span>Acesso completo por 7 dias</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-green-600" />
                <span>Todos os fornecedores</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-green-600" />
                <span>Alertas de preços</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-green-600" />
                <span>Cancele quando quiser</span>
              </div>
            </div>
          </div>

          {/* Plan Selection */}
          <div>
            <Label className="text-base font-semibold mb-3 block">
              Escolha seu plano (cobrança após 7 dias)
            </Label>
            <div className="grid grid-cols-2 gap-4">
              <Card 
                className={`cursor-pointer transition-all ${
                  selectedPlan === 'monthly' 
                    ? 'border-blue-500 bg-blue-50' 
                    : 'border-gray-200 hover:border-gray-300'
                }`}
                onClick={() => {
                  setSelectedPlan('monthly');
                  setValue('plan', 'monthly');
                }}
              >
                <CardContent className="p-4 text-center">
                  <h3 className="font-semibold text-lg">Mensal</h3>
                  <div className="text-2xl font-bold text-blue-600 my-2">
                    {planPricing.monthly.amount}
                    <span className="text-sm text-gray-500">{planPricing.monthly.period}</span>
                  </div>
                  <p className="text-sm text-gray-600">Flexibilidade total</p>
                </CardContent>
              </Card>

              <Card 
                className={`cursor-pointer transition-all relative ${
                  selectedPlan === 'annual' 
                    ? 'border-blue-500 bg-blue-50' 
                    : 'border-gray-200 hover:border-gray-300'
                }`}
                onClick={() => {
                  setSelectedPlan('annual');
                  setValue('plan', 'annual');
                }}
              >
                <div className="absolute -top-2 left-1/2 transform -translate-x-1/2">
                  <Badge className="bg-green-500 text-white">
                    Mais Popular
                  </Badge>
                </div>
                <CardContent className="p-4 text-center">
                  <h3 className="font-semibold text-lg">Anual</h3>
                  <div className="text-2xl font-bold text-blue-600 my-2">
                    {planPricing.annual.amount}
                    <span className="text-sm text-gray-500">{planPricing.annual.period}</span>
                  </div>
                  <p className="text-xs text-green-600 font-medium">
                    {planPricing.annual.savings}
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Signup Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name">Nome Completo *</Label>
                <Input
                  id="name"
                  {...register('name')}
                  placeholder="Seu nome completo"
                  disabled={isLoading}
                />
                {errors.name && (
                  <p className="text-sm text-red-600 mt-1">{errors.name.message}</p>
                )}
              </div>

              <div>
                <Label htmlFor="email">E-mail *</Label>
                <Input
                  id="email"
                  type="email"
                  {...register('email')}
                  placeholder="seu@email.com"
                  disabled={isLoading}
                />
                {errors.email && (
                  <p className="text-sm text-red-600 mt-1">{errors.email.message}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="whatsapp">WhatsApp *</Label>
                <Input
                  id="whatsapp"
                  {...register('whatsapp')}
                  placeholder="(11) 99999-9999"
                  disabled={isLoading}
                />
                {errors.whatsapp && (
                  <p className="text-sm text-red-600 mt-1">{errors.whatsapp.message}</p>
                )}
              </div>

              <div>
                <Label htmlFor="company">Empresa *</Label>
                <Input
                  id="company"
                  {...register('company')}
                  placeholder="Nome da sua empresa"
                  disabled={isLoading}
                />
                {errors.company && (
                  <p className="text-sm text-red-600 mt-1">{errors.company.message}</p>
                )}
              </div>
            </div>

            {/* Payment Method Notice */}
            <div className="bg-gray-50 p-4 rounded-lg border">
              <div className="flex items-start gap-3">
                <CreditCard className="w-5 h-5 text-gray-600 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    Cartão de crédito necessário
                  </p>
                  <p className="text-xs text-gray-600 mt-1">
                    Seu cartão será validado, mas não será cobrado durante os 7 dias de teste. 
                    A cobrança só acontecerá após o período gratuito.
                  </p>
                </div>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full h-12 bg-green-600 hover:bg-green-700 text-white font-semibold"
              disabled={isLoading}
            >
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                  Criando conta...
                </div>
              ) : (
                'Começar Teste Grátis de 7 Dias'
              )}
            </Button>

            <p className="text-xs text-gray-500 text-center mt-2">
              Ao continuar, você concorda com nossos termos de uso e política de privacidade.
            </p>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}