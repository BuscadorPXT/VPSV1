import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, CheckCircle, User, Building } from "lucide-react";

export default function CompleteSignup() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState("");
  const [formData, setFormData] = useState({
    name: "",
    company: "",
    password: "",
    confirmPassword: ""
  });

  useEffect(() => {
    // Get session_id from URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    const sessionIdParam = urlParams.get('session_id');
    
    if (!sessionIdParam) {
      toast({
        title: "Erro de Sessão",
        description: "Sessão de pagamento não encontrada. Redirecionando...",
        variant: "destructive",
      });
      setTimeout(() => navigate('/'), 2000);
      return;
    }
    
    setSessionId(sessionIdParam);
  }, [navigate, toast]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.password || !formData.confirmPassword) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha nome, senha e confirmação de senha.",
        variant: "destructive",
      });
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      toast({
        title: "Senhas não coincidem",
        description: "A senha e confirmação devem ser iguais.",
        variant: "destructive",
      });
      return;
    }

    if (formData.password.length < 6) {
      toast({
        title: "Senha muito curta",
        description: "A senha deve ter pelo menos 6 caracteres.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      console.log('🚀 Completing signup with session:', sessionId);

      const response = await fetch('/api/complete-signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          name: formData.name,
          company: formData.company || null,
          password: formData.password
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Erro ao finalizar cadastro');
      }

      console.log('✅ Signup completed successfully');

      // Store session token for authentication
      if (result.token) {
        localStorage.setItem('authToken', result.token);
      }

      toast({
        title: "Cadastro Concluído!",
        description: "Sua conta foi criada com sucesso. Redirecionando para o sistema...",
      });

      // Redirect to dashboard after a brief delay
      setTimeout(() => {
        navigate('/buscador');
      }, 1500);

    } catch (error: any) {
      console.error('❌ Complete signup error:', error);
      toast({
        title: "Erro no Cadastro",
        description: error.message || "Ocorreu um erro inesperado. Tente novamente.",
        variant: "destructive",
      });
      setIsLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  if (!sessionId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Verificando sessão...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
            <CheckCircle className="h-6 w-6 text-green-600" />
          </div>
          <CardTitle className="text-2xl font-bold text-gray-900">
            Quase pronto!
          </CardTitle>
          <CardDescription className="text-gray-600">
            Complete seu cadastro para acessar o sistema
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name" className="flex items-center gap-2">
                <User className="h-4 w-4" />
                Nome completo *
              </Label>
              <Input
                id="name"
                type="text"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                placeholder="Seu nome completo"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="company" className="flex items-center gap-2">
                <Building className="h-4 w-4" />
                Empresa (opcional)
              </Label>
              <Input
                id="company"
                type="text"
                value={formData.company}
                onChange={(e) => handleInputChange('company', e.target.value)}
                placeholder="Nome da sua empresa"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Senha *</Label>
              <Input
                id="password"
                type="password"
                value={formData.password}
                onChange={(e) => handleInputChange('password', e.target.value)}
                placeholder="Mínimo 6 caracteres"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirmar senha *</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={formData.confirmPassword}
                onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                placeholder="Digite a senha novamente"
                required
              />
            </div>

            <div className="bg-blue-50 rounded-lg p-3 text-sm text-blue-700">
              <div className="font-medium mb-1">Seu teste gratuito começou!</div>
              <div className="text-xs">
                • 7 dias de acesso completo gratuito<br/>
                • Cobrança só após o período de teste<br/>
                • Cancele a qualquer momento
              </div>
            </div>

            <Button 
              type="submit" 
              className="w-full bg-blue-600 hover:bg-blue-700"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Finalizando cadastro...
                </>
              ) : (
                "Finalizar Cadastro"
              )}
            </Button>
          </form>

          <div className="mt-6 text-center text-xs text-gray-500">
            Ao finalizar o cadastro, você concorda com nossos{" "}
            <a href="#" className="text-blue-600 hover:underline">
              Termos de Uso
            </a>{" "}
            e{" "}
            <a href="#" className="text-blue-600 hover:underline">
              Política de Privacidade
            </a>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}