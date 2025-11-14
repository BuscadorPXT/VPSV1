
import React, { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CheckCircle, Gift, ArrowRight, Star, Shield, Clock } from "lucide-react";

export default function TesteGratis() {
  const [, setLocation] = useLocation();
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Redirect to trial success page
      setLocation('/trial-success');
    } catch (error) {
      console.error('Error submitting trial request:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const benefits = [
    {
      icon: <Gift className="h-6 w-6 text-blue-600" />,
      title: "Acesso Completo",
      description: "7 dias com todos os recursos premium"
    },
    {
      icon: <Shield className="h-6 w-6 text-green-600" />,
      title: "Sem Compromisso",
      description: "Cancele a qualquer momento"
    },
    {
      icon: <Clock className="h-6 w-6 text-purple-600" />,
      title: "Ativação Imediata",
      description: "Comece a usar agora mesmo"
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-blue-100 rounded-full mb-6">
            <Gift className="h-10 w-10 text-blue-600" />
          </div>
          <h1 className="text-4xl font-bold text-slate-900 mb-4">
            Teste Grátis por 7 Dias
          </h1>
          <p className="text-xl text-slate-600 max-w-2xl mx-auto">
            Experimente todos os recursos premium do Buscador PXT sem compromisso. 
            Acesso completo por uma semana!
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-12 items-start">
          {/* Benefits Section */}
          <div className="space-y-8">
            <div>
              <h2 className="text-2xl font-bold text-slate-900 mb-6">
                O que você terá acesso:
              </h2>
              
              <div className="space-y-4">
                {benefits.map((benefit, index) => (
                  <div key={index} className="flex items-start space-x-4 p-4 bg-white rounded-lg shadow-sm">
                    <div className="flex-shrink-0">
                      {benefit.icon}
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-900 mb-1">
                        {benefit.title}
                      </h3>
                      <p className="text-slate-600">
                        {benefit.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Features List */}
            <div className="bg-white p-6 rounded-lg shadow-sm">
              <h3 className="font-semibold text-slate-900 mb-4">Recursos inclusos:</h3>
              <ul className="space-y-3">
                {[
                  "Busca avançada de produtos Apple",
                  "Filtros inteligentes por categoria",
                  "Comparação de preços em tempo real",
                  "Alertas de mudança de preços",
                  "Informações de contato dos fornecedores",
                  "Exportação de dados",
                  "Suporte prioritário"
                ].map((feature, index) => (
                  <li key={index} className="flex items-center space-x-3">
                    <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
                    <span className="text-slate-700">{feature}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Sign Up Form */}
          <div className="lg:sticky lg:top-6">
            <Card className="shadow-lg">
              <CardHeader className="text-center">
                <CardTitle className="text-2xl text-slate-900">
                  Comece seu teste grátis
                </CardTitle>
                <CardDescription>
                  Preencha os dados abaixo para ativar seu acesso
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Nome completo</Label>
                    <Input
                      id="name"
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Seu nome"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">E-mail</Label>
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="seu@email.com"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone">WhatsApp (opcional)</Label>
                    <Input
                      id="phone"
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="(11) 99999-9999"
                    />
                  </div>

                  <Button 
                    type="submit" 
                    className="w-full h-12 text-lg"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <div className="flex items-center space-x-2">
                        <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                        <span>Ativando...</span>
                      </div>
                    ) : (
                      <>
                        Ativar teste grátis
                        <ArrowRight className="h-5 w-5 ml-2" />
                      </>
                    )}
                  </Button>

                  <p className="text-xs text-slate-500 text-center mt-4">
                    Ao clicar em "Ativar teste grátis", você concorda com nossos{" "}
                    <span 
                      className="text-blue-600 hover:underline cursor-pointer"
                      onClick={() => setLocation('/terms-of-use')}
                    >
                      Termos de Uso
                    </span>
                  </p>
                </form>
              </CardContent>
            </Card>

            {/* Trust Indicators */}
            <div className="mt-6 text-center">
              <div className="flex items-center justify-center space-x-1 mb-2">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                ))}
              </div>
              <p className="text-sm text-slate-600">
                Mais de 1000 profissionais confiam no Buscador PXT
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
