import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, CheckCircle, Info, AlertCircle } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';

interface EmergencyAlert {
  id: number;
  title: string;
  message: string;
  urgency: 'low' | 'medium' | 'high';
  sentAt: string;
}

export function EmergencyAlertDialog() {
  const [currentAlertIndex, setCurrentAlertIndex] = useState(0);
  const [showDialog, setShowDialog] = useState(false);
  const [deferredQueryEnabled, setDeferredQueryEnabled] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { isAuthReady, user } = useAuth();

  // ⚡ DEFER: Aguardar 4 segundos após login antes de buscar alertas (não-crítico)
  useEffect(() => {
    if (isAuthReady && user?.uid) {
      const timer = setTimeout(() => {
        setDeferredQueryEnabled(true);
      }, 4000);
      return () => clearTimeout(timer);
    } else {
      setDeferredQueryEnabled(false);
    }
  }, [isAuthReady, user?.uid]);

  // Buscar alertas pendentes apenas quando auth está pronta E usuário está logado
  // ✅ OTIMIZAÇÃO: Removido polling - usa apenas WebSocket para tempo real
  const { data: alertsData, isLoading } = useQuery({
    queryKey: ['/api/emergency-alerts/pending'],
    queryFn: async () => {
      return await apiRequest('/api/emergency-alerts/pending');
    },
    refetchInterval: false, // ✅ Desabilitado - usa WebSocket
    staleTime: 5 * 60 * 1000, // 5 minutos
    enabled: deferredQueryEnabled, // ⚡ Carrega após 4 segundos
    retry: false,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });

  const alerts: EmergencyAlert[] = alertsData?.alerts || [];

  // Mutation para marcar como lido
  const markAsReadMutation = useMutation({
    mutationFn: async (alertId: number) => {
      return apiRequest(`/api/emergency-alerts/${alertId}/mark-read`, {
        method: 'POST',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/emergency-alerts/pending'] });
    },
  });

  // Mostrar diálogo quando há alertas
  useEffect(() => {
    if (alerts.length > 0 && !showDialog) {
      setShowDialog(true);
      setCurrentAlertIndex(0);
    }
  }, [alerts.length, showDialog]);

  // Listen para alertas em tempo real via WebSocket
  useEffect(() => {
    console.log('🎧 [Emergency Alert] Setting up WebSocket listeners...');

    const handleEmergencyAlert = (event: CustomEvent) => {
      const alertData = event.detail;
      console.log('🚨 [Emergency Alert] Received WebSocket event:', alertData);

      if (alertData) {
        // Mostrar toast de notificação imediata
        toast({
          title: `🚨 ${alertData.title}`,
          description: alertData.message,
          duration: 8000,
        });

        // Invalidar queries para buscar novos alertas e forçar o modal
        queryClient.invalidateQueries({ queryKey: ['/api/emergency-alerts/pending'] });

        // Forçar a abertura do modal se não estiver aberto
        setTimeout(() => {
          setShowDialog(true);
        }, 500);
      }
    };

    // Função para capturar mensagens WebSocket do window global
    const handleGlobalWebSocketMessage = (event: any) => {
      console.log('🌐 [Emergency Alert] Global WebSocket listener triggered');
      
      if (event.detail && event.detail.type === 'emergency_alert') {
        console.log('🚨 [Emergency Alert] Emergency alert detected via global listener:', event.detail.data);
        
        const customEvent = new CustomEvent('emergencyAlert', { detail: event.detail.data });
        window.dispatchEvent(customEvent);
      }
    };

    // Função mais robusta para detectar mensagens WebSocket
    const interceptWebSocketMessages = () => {
      // Interceptar o WebSocket global se existir
      if (window.WebSocket) {
        const originalSend = WebSocket.prototype.send;
        const originalOnMessage = WebSocket.prototype.addEventListener;

        // Override do addEventListener para capturar mensagens
        WebSocket.prototype.addEventListener = function(type: string, listener: any, options?: any) {
          if (type === 'message') {
            const wrappedListener = (event: Event) => {
              const msgEvent = event as MessageEvent;
              try {
                const data = JSON.parse(msgEvent.data);
                console.log('🌐 [Emergency Alert] Intercepted WebSocket message:', data);
                
                if (data.type === 'emergency_alert') {
                  console.log('🚨 [Emergency Alert] Emergency alert intercepted:', data.data);
                  const customEvent = new CustomEvent('emergencyAlert', { detail: data.data });
                  window.dispatchEvent(customEvent);
                }
              } catch (error) {
                console.log('📨 [Emergency Alert] Non-JSON message:', msgEvent.data);
              }
              
              // Chamar o listener original
              if (typeof listener === 'function') {
                listener(event);
              }
            };
            
            return originalOnMessage.call(this, type, wrappedListener, options);
          }
          
          return originalOnMessage.call(this, type, listener, options);
        };
      }
    };

    // Listen para eventos customizados
    window.addEventListener('emergencyAlert', handleEmergencyAlert as EventListener);
    
    // Listen para eventos globais de WebSocket
    window.addEventListener('websocket-message', handleGlobalWebSocketMessage);
    
    // Interceptar mensagens WebSocket
    interceptWebSocketMessages();

    console.log('🎧 [Emergency Alert] WebSocket listeners configured');

    return () => {
      window.removeEventListener('emergencyAlert', handleEmergencyAlert as EventListener);
      window.removeEventListener('websocket-message', handleGlobalWebSocketMessage);
    };
  }, [queryClient, toast]);

  const currentAlert = alerts[currentAlertIndex];

  const getUrgencyConfig = (urgency: string) => {
    switch (urgency) {
      case 'high':
        return {
          icon: AlertTriangle,
          color: 'text-red-600',
          bgColor: 'bg-red-50 dark:bg-red-900/20',
          borderColor: 'border-red-200 dark:border-red-700',
          badgeClass: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
          label: 'URGENTE'
        };
      case 'medium':
        return {
          icon: AlertCircle,
          color: 'text-orange-600',
          bgColor: 'bg-orange-50 dark:bg-orange-900/20',
          borderColor: 'border-orange-200 dark:border-orange-700',
          badgeClass: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
          label: 'IMPORTANTE'
        };
      case 'low':
        return {
          icon: Info,
          color: 'text-blue-600',
          bgColor: 'bg-blue-50 dark:bg-blue-900/20',
          borderColor: 'border-blue-200 dark:border-blue-700',
          badgeClass: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
          label: 'INFORMATIVO'
        };
      default:
        return {
          icon: Info,
          color: 'text-gray-600',
          bgColor: 'bg-gray-50 dark:bg-gray-900/20',
          borderColor: 'border-gray-200 dark:border-gray-700',
          badgeClass: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200',
          label: 'INFORMATIVO'
        };
    }
  };

  const handleMarkAsRead = async () => {
    if (currentAlert) {
      await markAsReadMutation.mutateAsync(currentAlert.id);

      // Se há mais alertas, mostrar o próximo
      if (currentAlertIndex < alerts.length - 1) {
        setCurrentAlertIndex(prev => prev + 1);
      } else {
        // Não há mais alertas, fechar diálogo
        setShowDialog(false);
        setCurrentAlertIndex(0);
      }
    }
  };

  const handleSkipToNext = () => {
    if (currentAlertIndex < alerts.length - 1) {
      setCurrentAlertIndex(prev => prev + 1);
    } else {
      setShowDialog(false);
      setCurrentAlertIndex(0);
    }
  };

  if (isLoading || !currentAlert || !showDialog) {
    return null;
  }

  const urgencyConfig = getUrgencyConfig(currentAlert.urgency);
  const IconComponent = urgencyConfig.icon;

  const handleDialogClose = (open: boolean) => {
    if (!open && currentAlert && !currentAlert.urgency.includes('high')) {
      // Permitir fechar apenas se não for urgência alta
      setShowDialog(false);
    }
  };

  return (
    <Dialog open={showDialog} onOpenChange={handleDialogClose}>
      <DialogContent 
        className="max-w-md" 
        onPointerDownOutside={(e) => {
          // Permitir fechar clicando fora apenas se não for urgência alta
          if (currentAlert?.urgency === 'high') {
            e.preventDefault();
          }
        }}
      >
        <DialogHeader>
          <DialogTitle className={`flex items-center gap-2 ${urgencyConfig.color}`}>
            <IconComponent className="h-5 w-5" />
            Aviso da Administração
          </DialogTitle>
          <div className="flex items-center justify-between">
            <Badge className={urgencyConfig.badgeClass}>
              {urgencyConfig.label}
            </Badge>
            {alerts.length > 1 && (
              <span className="text-xs text-gray-500">
                {currentAlertIndex + 1} de {alerts.length}
              </span>
            )}
          </div>
        </DialogHeader>

        <div className={`p-4 rounded-lg border ${urgencyConfig.bgColor} ${urgencyConfig.borderColor}`}>
          <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">
            {currentAlert.title}
          </h3>
          <p className="text-gray-700 dark:text-gray-300 text-sm leading-relaxed">
            {currentAlert.message}
          </p>
          <p className="text-xs text-gray-500 mt-3">
            Enviado em: {new Date(currentAlert.sentAt).toLocaleString('pt-BR')}
          </p>
        </div>

        <DialogFooter className="flex gap-2">
          {currentAlert?.urgency !== 'high' && (
            <Button 
              variant="ghost" 
              onClick={() => setShowDialog(false)}
              size="sm"
            >
              Fechar
            </Button>
          )}

          {alerts.length > 1 && currentAlertIndex < alerts.length - 1 && (
            <Button 
              variant="outline" 
              onClick={handleSkipToNext}
              size="sm"
            >
              Próximo
            </Button>
          )}

          <Button 
            onClick={handleMarkAsRead}
            disabled={markAsReadMutation.isPending}
            className="flex items-center gap-2"
            size="sm"
          >
            <CheckCircle className="h-4 w-4" />
            {markAsReadMutation.isPending ? 'Marcando...' : 'Entendi'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default EmergencyAlertDialog;