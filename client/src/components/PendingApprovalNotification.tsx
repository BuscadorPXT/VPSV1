import { useEffect, useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useLocation } from 'wouter';
import { Clock, Mail, CheckCircle2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface Props {
  userEmail: string;
  onComplete?: () => void;
}

export function PendingApprovalNotification({ userEmail, onComplete }: Props) {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [countdown, setCountdown] = useState(3);
  const [hasShownNotification, setHasShownNotification] = useState(false);

  useEffect(() => {
    if (!hasShownNotification) {
      // Mostrar toast de notificação
      toast({
        title: "⏳ Aguardando Aprovação",
        description: `Sua conta (${userEmail}) está sendo analisada por nossa equipe. Você será redirecionado em instantes...`,
        duration: 8000,
      });

      setHasShownNotification(true);
    }
  }, [hasShownNotification, userEmail, toast]);

  // Countdown para redirecionamento
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => {
        setCountdown(countdown - 1);
      }, 1000);

      return () => clearTimeout(timer);
    } else {
      // Redirecionar quando countdown chegar a 0
      console.log('🔄 Redirecting to /pending-approval page');
      setLocation('/pending-approval');

      if (onComplete) {
        onComplete();
      }
    }
  }, [countdown, setLocation, onComplete]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 flex items-center justify-center p-4">
      <Card className="w-full max-w-md bg-slate-900/90 border-slate-700/50 backdrop-blur-sm shadow-2xl">
        <CardHeader className="text-center pb-4">
          <div className="mx-auto w-16 h-16 bg-gradient-to-br from-amber-500/20 to-yellow-500/20 rounded-full flex items-center justify-center mb-4 border border-amber-500/30 animate-pulse">
            <Clock className="w-8 h-8 text-amber-400" />
          </div>
          <CardTitle className="text-2xl font-bold text-slate-100 mb-2">
            Aguardando Aprovação
          </CardTitle>
          <CardDescription className="text-slate-300 text-base">
            Sua conta está sendo analisada
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Email do usuário */}
          <div className="bg-slate-800/50 p-4 rounded-lg border border-slate-600/30">
            <div className="flex items-center gap-2 mb-2">
              <Mail className="w-4 h-4 text-blue-400" />
              <span className="text-sm font-medium text-slate-200">Conta registrada:</span>
            </div>
            <p className="text-sm text-slate-300 pl-6">
              {userEmail}
            </p>
          </div>

          {/* Status */}
          <div className="bg-blue-500/10 p-4 rounded-lg border border-blue-500/20">
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 bg-amber-400 rounded-full animate-pulse mt-1.5"></div>
                <div className="flex-1">
                  <h4 className="text-sm font-semibold text-slate-100 mb-1">Em Análise</h4>
                  <p className="text-xs text-slate-400">
                    Nossa equipe está verificando suas informações
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 opacity-50">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 mt-0.5" />
                <div className="flex-1">
                  <h4 className="text-sm font-semibold text-slate-100 mb-1">Aprovação</h4>
                  <p className="text-xs text-slate-400">
                    Você receberá notificação quando for aprovado
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Tempo estimado */}
          <div className="bg-slate-800/30 p-3 rounded-lg border border-slate-700/50 text-center">
            <p className="text-sm text-slate-300">
              <strong className="text-slate-200">Tempo estimado:</strong> Até 24h em dias úteis
            </p>
          </div>

          {/* Countdown */}
          <div className="text-center pt-2">
            <p className="text-xs text-slate-400">
              Redirecionando em <strong className="text-blue-400">{countdown}s</strong>...
            </p>
            <div className="w-full bg-slate-800 rounded-full h-1.5 mt-2">
              <div
                className="bg-blue-500 h-1.5 rounded-full transition-all duration-1000 ease-linear"
                style={{ width: `${((3 - countdown) / 3) * 100}%` }}
              ></div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
