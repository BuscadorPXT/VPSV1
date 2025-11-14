import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { AlertCircle, RefreshCw } from 'lucide-react';

export default function AuthRecovery() {
  const [isRecovering, setIsRecovering] = useState(false);
  const [recoveryStatus, setRecoveryStatus] = useState<string>('');

  useEffect(() => {
    // Auto-start recovery when page loads
    handleRecovery();
  }, []);

  const handleRecovery = async () => {
    setIsRecovering(true);
    setRecoveryStatus('Verificando sessões de autenticação...');

    try {
      // Clear any stale data
      localStorage.removeItem('firebaseToken');
      
      setRecoveryStatus('Redirecionando para login...');
      
      // Force redirect to login page
      setTimeout(() => {
        window.location.href = '/login';
      }, 2000);
      
    } catch (error) {
      console.error('Recovery error:', error);
      setRecoveryStatus('Erro durante recuperação. Redirecionando...');
      setTimeout(() => {
        window.location.href = '/login';
      }, 3000);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
            <AlertCircle className="w-6 h-6 text-orange-600" />
          </div>
          <CardTitle className="text-xl font-semibold">
            Recuperando Autenticação
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center text-muted-foreground">
            <p className="mb-4">
              Detectamos um problema com sua sessão de autenticação. 
              Vamos recuperar seu acesso automaticamente.
            </p>
            
            {isRecovering && (
              <div className="flex items-center justify-center space-x-2 text-sm">
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>{recoveryStatus}</span>
              </div>
            )}
          </div>

          <div className="flex justify-center">
            <Button 
              onClick={() => window.location.href = '/login'}
              variant="outline"
              className="w-full"
            >
              Ir para Login Agora
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}