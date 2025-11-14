
import React from 'react';
import { AlertTriangle, MessageCircle, ArrowLeft } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Alert, AlertDescription } from '../components/ui/alert';

const PendingPaymentPage: React.FC = () => {
  const handleWhatsAppContact = () => {
    const whatsappNumber = "5511963232465"; // Mesmo número da landing page
    const message = encodeURIComponent("Olá! Gostaria de regularizar meu pagamento da assinatura PRO do Buscador PXT.");
    const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${message}`;
    window.open(whatsappUrl, '_blank');
  };

  const handleLogout = () => {
    // Redirecionar para logout
    window.location.href = '/login';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-lg border-red-200">
        <CardHeader className="text-center pb-4">
          <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
            <AlertTriangle className="h-8 w-8 text-red-600" />
          </div>
          <CardTitle className="text-2xl font-bold text-red-800">
            Assinatura Pendente
          </CardTitle>
        </CardHeader>
        
        <CardContent className="space-y-6">
          <Alert className="border-red-200 bg-red-50">
            <AlertTriangle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800">
              Sua assinatura PRO está <strong>pendente de pagamento</strong>. 
              Para liberar seu acesso completo ao sistema, é necessário regularizar o pagamento.
            </AlertDescription>
          </Alert>

          <div className="text-center space-y-4">
            <p className="text-gray-600">
              Entre em contato conosco para regularizar sua situação e voltar a aproveitar todos os recursos PRO.
            </p>

            <Button 
              onClick={handleWhatsAppContact}
              className="w-full bg-green-600 hover:bg-green-700 text-white"
              size="lg"
            >
              <MessageCircle className="mr-2 h-5 w-5" />
              Entrar em Contato via WhatsApp
            </Button>

            <div className="pt-4 border-t border-gray-200">
              <Button 
                onClick={handleLogout}
                variant="outline"
                className="w-full"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Fazer Logout
              </Button>
            </div>
          </div>

          <div className="text-xs text-gray-500 text-center">
            <p>Após a regularização do pagamento, seu acesso será liberado automaticamente.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PendingPaymentPage;
