import { useEffect, useState } from 'react';
import { useLocation, Link } from 'wouter';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, ArrowRight, Crown, AlertCircle, Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { apiRequest } from '@/lib/api-client';

export default function PaymentSuccess() {
  const [, setLocation] = useLocation();
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [verificationStatus, setVerificationStatus] = useState<'loading' | 'success' | 'pending' | 'error'>('loading');
  const [statusMessage, setStatusMessage] = useState('');
  const { user, refetchUser } = useAuth();

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const sessionIdParam = urlParams.get('session_id');
    setSessionId(sessionIdParam);

    // Verificar status do pagamento
    if (sessionIdParam) {
      verifyPaymentStatus(sessionIdParam);
    }
  }, []);

  const verifyPaymentStatus = async (sessionId: string) => {
    try {
      setVerificationStatus('loading');
      setStatusMessage('Verificando status do pagamento...');

      // Aguardar um pouco para o webhook processar
      await new Promise(resolve => setTimeout(resolve, 3000));

      // Atualizar dados do usuário
      await refetchUser();

      // Verificar se a assinatura foi ativada
      const response = await apiRequest('/api/user/profile');
      const userData = await response.json();

      if (userData.isSubscriptionActive) {
        setVerificationStatus('success');
        setStatusMessage('Assinatura ativada com sucesso!');
      } else {
        setVerificationStatus('pending');
        setStatusMessage('Pagamento confirmado. Ativação em processamento...');

        // Tentar novamente em alguns segundos
        setTimeout(() => verifyPaymentStatus(sessionId), 5000);
      }
    } catch (error) {
      console.error('Erro verificando status:', error);
      setVerificationStatus('error');
      setStatusMessage('Erro ao verificar status. Entre em contato conosco.');
    }
  };

  const getStatusIcon = () => {
    switch (verificationStatus) {
      case 'loading':
        return <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />;
      case 'success':
        return <CheckCircle className="w-8 h-8 text-green-600" />;
      case 'pending':
        return <AlertCircle className="w-8 h-8 text-yellow-600" />;
      case 'error':
        return <AlertCircle className="w-8 h-8 text-red-600" />;
      default:
        return <CheckCircle className="w-8 h-8 text-green-600" />;
    }
  };

  const getStatusColor = () => {
    switch (verificationStatus) {
      case 'loading':
        return 'from-blue-50 to-gray-50';
      case 'success':
        return 'from-green-50 to-blue-50';
      case 'pending':
        return 'from-yellow-50 to-orange-50';
      case 'error':
        return 'from-red-50 to-pink-50';
      default:
        return 'from-green-50 to-blue-50';
    }
  };

  return (
    <div className={`min-h-screen bg-gradient-to-br ${getStatusColor()} flex items-center justify-center p-4`}>
      <Card className="max-w-md w-full shadow-xl border-0">
        <CardHeader className="text-center pb-4">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
              {getStatusIcon()}
            </div>
          </div>
          <CardTitle className="text-2xl font-bold text-gray-800">
            {verificationStatus === 'success' && 'Pagamento Realizado!'}
            {verificationStatus === 'loading' && 'Processando...'}
            {verificationStatus === 'pending' && 'Aguarde um momento'}
            {verificationStatus === 'error' && 'Ops! Algo deu errado'}
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-6">
          <div className="space-y-2">
            <p className="text-gray-600">
              {statusMessage}
            </p>
            {verificationStatus === 'success' && (
              <p className="text-sm text-gray-500">
                Agora você tem acesso completo ao sistema de preços.
              </p>
            )}
            {verificationStatus === 'pending' && (
              <p className="text-sm text-gray-500">
                Seu pagamento foi confirmado. A ativação pode levar alguns minutos.
              </p>
            )}
          </div>

          {sessionId && (
            <div className="bg-gray-50 p-3 rounded-lg">
              <p className="text-xs text-gray-500">
                ID da sessão: {sessionId.slice(0, 20)}...
              </p>
            </div>
          )}

          <div className="space-y-3">
            {verificationStatus === 'success' && (
              <>
                <Link to="/dashboard">
                  <Button className="w-full gap-2 bg-blue-600 hover:bg-blue-700">
                    <Crown className="w-4 h-4" />
                    Acessar Dashboard
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </Link>
                <Link to="/profile">
                  <Button variant="outline" className="w-full">
                    Ver Meu Perfil
                  </Button>
                </Link>
              </>
            )}

            {verificationStatus === 'pending' && (
              <Button 
                onClick={() => verifyPaymentStatus(sessionId!)} 
                className="w-full"
                disabled={verificationStatus === 'loading'}
              >
                {verificationStatus === 'loading' ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : null}
                Verificar Novamente
              </Button>
            )}

            {verificationStatus === 'error' && (
              <div className="space-y-2">
                <Button 
                  onClick={() => verifyPaymentStatus(sessionId!)} 
                  className="w-full"
                >
                  Tentar Novamente
                </Button>
                <Link to="/dashboard">
                  <Button variant="outline" className="w-full">
                    Ir para Dashboard
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}