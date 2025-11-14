import { useLocation } from "wouter";
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Settings, ArrowRight } from 'lucide-react';

export default function MaintenancePage() {
  const [, navigate] = useLocation();

  const handleLoginRedirect = () => {
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white flex items-center justify-center px-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardContent className="pt-8 pb-8 text-center">
          {/* Ícone de manutenção */}
          <div className="flex justify-center mb-6">
            <div className="p-4 bg-blue-100 rounded-full">
              <Settings className="h-12 w-12 text-blue-600 animate-spin" style={{ animationDuration: '3s' }} />
            </div>
          </div>

          {/* Mensagem principal */}
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            Estamos em manutenção!
          </h1>
          
          <p className="text-gray-600 mb-8 leading-relaxed">
            Em breve voltaremos com novidades.
          </p>

          {/* Botão de login */}
          <Button 
            onClick={handleLoginRedirect}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-6 rounded-lg transition-colors duration-200 flex items-center justify-center gap-2"
          >
            Já é usuário? Faça login
            <ArrowRight className="h-4 w-4" />
          </Button>

          {/* Informação adicional */}
          <p className="text-sm text-gray-500 mt-6">
            Usuários cadastrados podem continuar acessando o sistema
          </p>
        </CardContent>
      </Card>
    </div>
  );
}