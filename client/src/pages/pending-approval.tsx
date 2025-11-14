
import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useLocation } from 'wouter';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Clock, CheckCircle2, Mail, LogOut, MessageCircle, RefreshCw, Info, HelpCircle } from 'lucide-react';
import { signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { RainbowLoadingWave } from '../components/ui/rainbow-loading-wave';
import { useUnifiedWebSocket } from '@/hooks/use-unified-websocket';
import { useToast } from '@/hooks/use-toast';

export default function PendingApproval() {
  const { user, loading, refreshUser } = useAuth();
  const [, setLocation] = useLocation();
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const { toast } = useToast();
  
  // ✅ WEBSOCKET: Conectar para receber notificação de aprovação em tempo real
  const { isConnected } = useUnifiedWebSocket(toast);

  useEffect(() => {
    if (!loading && user) {
      // Enhanced approval logic - check multiple conditions
      const isUserApproved = user.isApproved === true || 
                            user.role === 'admin' || 
                            user.role === 'superadmin' || 
                            user.isAdmin === true ||
                            user.status === 'active';
      
      console.log('🔍 Pending Approval Page Check:', {
        email: user.email,
        role: user.role,
        subscriptionPlan: user.subscriptionPlan,
        isAdmin: user.isAdmin,
        isApproved: user.isApproved,
        status: user.status,
        needsApproval: user.needsApproval,
        backendSaysApproved: isUserApproved,
        userAgent: navigator.userAgent.includes('Mobile') ? 'Mobile' : 'Desktop',
        timestamp: new Date().toISOString()
      });

      // ✅ FORÇA REFRESH DO PERFIL SE USUÁRIO PARECE APROVADO
      if (isUserApproved) {
        console.log('🚀 USER APPROVED - redirect to dashboard');
        // Limpar possíveis caches problemáticos
        localStorage.removeItem('pendingApprovalCache');
        setLocation('/buscador');
        return;
      }

      // ✅ FORÇA REFRESH DO PERFIL EM CASOS DUVIDOSOS
      if (user.isApproved === undefined || user.status === undefined) {
        console.log('⚠️ Unclear approval status - forcing profile refresh...');
        const refreshUserProfile = async () => {
          try {
            const refreshedProfile = await refreshUser();
            if (refreshedProfile?.isApproved) {
              console.log('✅ Profile refreshed - user is approved!');
              setLocation('/buscador');
            }
          } catch (error) {
            console.log('❌ Profile refresh failed:', error);
          }
        };
        refreshUserProfile();
        return;
      }

      console.log('⏳ User not approved by backend - staying on pending approval page');
    }
  }, [user, loading, setLocation]);

  // ✅ LISTENER: Escutar evento customizado de aprovação via WebSocket
  useEffect(() => {
    const handleUserApproved = async (event: any) => {
      console.log('🎉 [PendingApproval] User approved event received:', event.detail);
      
      // Forçar atualização do perfil do usuário
      if (refreshUser) {
        await refreshUser();
      }
      
      // Redirecionar para o dashboard (o WebSocket já faz isso, mas é um fallback)
      setTimeout(() => {
        setLocation('/buscador');
      }, 1000);
    };

    const handleUserRejected = async (event: any) => {
      console.log('❌ [PendingApproval] User rejected event received:', event.detail);
      
      // Forçar atualização do perfil
      if (refreshUser) {
        await refreshUser();
      }
    };

    window.addEventListener('userApproved', handleUserApproved);
    window.addEventListener('userRejected', handleUserRejected);

    return () => {
      window.removeEventListener('userApproved', handleUserApproved);
      window.removeEventListener('userRejected', handleUserRejected);
    };
  }, [refreshUser, setLocation]);

  // ✅ POLLING INTELIGENTE: Verificar status a cada 30 segundos como fallback
  useEffect(() => {
    if (!loading && user && !user.isApproved) {
      console.log('🔄 [PendingApproval] Starting intelligent polling for approval status');
      
      const checkApprovalStatus = async () => {
        try {
          console.log('🔍 Checking approval status...');
          const updatedProfile = await refreshUser();
          
          if (updatedProfile?.isApproved) {
            console.log('✅ User approved via polling - redirecting...');
            toast({
              title: "🎉 Conta Aprovada!",
              description: "Sua conta foi aprovada! Redirecionando...",
              duration: 3000,
            });
            
            setTimeout(() => {
              setLocation('/buscador');
            }, 1000);
          }
        } catch (error) {
          console.log('⚠️ Approval status check failed:', error);
        }
      };

      // Primeira verificação imediata
      checkApprovalStatus();
      
      // Verificar a cada 30 segundos
      const interval = setInterval(checkApprovalStatus, 30000);
      
      return () => {
        console.log('🛑 [PendingApproval] Stopping polling');
        clearInterval(interval);
      };
    }
  }, [user, loading, refreshUser, toast, setLocation]);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      localStorage.removeItem('firebaseToken');
      setLocation('/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const handleWhatsAppClick = () => {
    const whatsappNumber = '5547974446115';
    const message = encodeURIComponent('Olá! Minha conta no Buscador PXT está aguardando aprovação. Poderia me ajudar?');
    const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${message}`;
    window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <RainbowLoadingWave text="Verificando status..." size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 flex items-center justify-center p-4">
      <Card className="w-full max-w-md bg-slate-900/90 border-slate-700/50 backdrop-blur-sm shadow-2xl">
        <CardHeader className="text-center pb-4">
          <div className="mx-auto w-12 h-12 bg-gradient-to-br from-amber-500/20 to-yellow-500/20 rounded-full flex items-center justify-center mb-4 border border-amber-500/30">
            <Clock className="w-6 h-6 text-amber-400" />
          </div>
          <CardTitle className="text-xl font-bold text-slate-100 mb-1">
            Aguardando Aprovação
          </CardTitle>
          <CardDescription className="text-slate-300 text-sm">
            Sua conta está sendo analisada pela nossa equipe
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Status compacto */}
          <div className="bg-slate-800/50 p-3 rounded-lg border border-slate-600/30">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-slate-200">Status:</span>
              <span className="text-sm text-amber-400 flex items-center gap-1">
                <div className="w-2 h-2 bg-amber-400 rounded-full animate-pulse"></div>
                Em análise
              </span>
            </div>
            <p className="text-xs text-slate-400">
              <strong>Email:</strong> {user?.email}
            </p>
            
            {/* Indicador de conexão WebSocket */}
            <div className="mt-2 pt-2 border-t border-slate-700/50">
              <div className="flex items-center gap-2 text-xs">
                <div className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-slate-500'}`}></div>
                <span className="text-slate-400">
                  {isConnected ? 'Monitoramento ativo' : 'Reconectando...'}
                </span>
              </div>
            </div>
          </div>

          {/* Tempo estimado */}
          <div className="bg-blue-500/10 p-3 rounded-lg border border-blue-500/20">
            <p className="text-sm text-blue-300">
              <strong className="text-blue-200">Tempo estimado:</strong> Até 24h em dias úteis
            </p>
          </div>

          {/* Botões principais */}
          <div className="space-y-3">
            <Button 
              onClick={handleWhatsAppClick}
              className="w-full bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white font-medium py-2.5 transition-all duration-200 shadow-lg hover:shadow-emerald-500/25"
            >
              <MessageCircle className="w-4 h-4 mr-2" />
              Falar no WhatsApp
            </Button>

            <Dialog open={showDetailsModal} onOpenChange={setShowDetailsModal}>
              <DialogTrigger asChild>
                <Button 
                  variant="outline" 
                  className="w-full border-slate-600 text-slate-300 hover:bg-slate-800 hover:text-slate-100 font-medium py-2.5 transition-all duration-200"
                >
                  <Info className="w-4 h-4 mr-2" />
                  Ver Detalhes do Processo
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md bg-slate-900 border-slate-700">
                <DialogHeader>
                  <DialogTitle className="text-slate-100 flex items-center gap-2">
                    <HelpCircle className="w-5 h-5 text-blue-400" />
                    Processo de Aprovação
                  </DialogTitle>
                  <DialogDescription className="text-slate-400">
                    Entenda como funciona a análise da sua conta
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-start space-x-3 p-2 bg-emerald-500/10 rounded border border-emerald-500/20">
                      <CheckCircle2 className="w-5 h-5 text-emerald-400 mt-0.5 flex-shrink-0" />
                      <div>
                        <h4 className="text-sm font-semibold text-slate-100">Conta Criada</h4>
                        <p className="text-xs text-slate-300">Cadastro realizado com sucesso</p>
                      </div>
                    </div>

                    <div className="flex items-start space-x-3 p-2 bg-amber-500/10 rounded border border-amber-500/20">
                      <Clock className="w-5 h-5 text-amber-400 mt-0.5 flex-shrink-0" />
                      <div>
                        <h4 className="text-sm font-semibold text-slate-100">Em Análise</h4>
                        <p className="text-xs text-slate-300">Equipe verificando suas informações</p>
                      </div>
                    </div>

                    <div className="flex items-start space-x-3 p-2 bg-blue-500/10 rounded border border-blue-500/20">
                      <Mail className="w-5 h-5 text-blue-400 mt-0.5 flex-shrink-0" />
                      <div>
                        <h4 className="text-sm font-semibold text-slate-100">Notificação</h4>
                        <p className="text-xs text-slate-300">Você será notificado por email</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-slate-800/50 p-3 rounded border border-slate-600/30">
                    <p className="text-xs text-slate-300">
                      Nossa equipe analisa cada solicitação manualmente para garantir a qualidade da plataforma. 
                      O processo é rápido e você receberá uma resposta em breve.
                    </p>
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            <Button 
              onClick={async () => {
                console.log('🧹 Clearing cache and refreshing...');
                // Limpar todos os caches possíveis
                localStorage.removeItem('firebaseToken');
                localStorage.removeItem('pendingApprovalCache');
                sessionStorage.clear();
                
                // Tentar refresh do perfil
                try {
                  await refreshUser();
                  window.location.reload();
                } catch (error) {
                  console.error('Cache clear failed:', error);
                  window.location.reload();
                }
              }}
              variant="secondary" 
              className="w-full bg-slate-700 hover:bg-slate-600 text-slate-100 border-slate-600 font-medium py-2.5 transition-all duration-200"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Atualizar Status
            </Button>

            <Button 
              onClick={handleLogout}
              variant="ghost" 
              className="w-full text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 font-medium py-2.5 transition-all duration-200"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Sair da Conta
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
