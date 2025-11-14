import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { formatPrice } from '@/lib/formatters';
import { useAuth } from './use-auth';
import { wsManager } from '@/lib/websocket-manager';

interface PriceChange {
  model: string;
  storage: string;
  color: string;
  oldPrice: string;
  newPrice: string;
  change: number;
  changeType: 'increase' | 'decrease';
  changePercentage: string;
}

interface SessionInvalidationMessage {
  type: 'SESSION_INVALIDATED';
  message: string;
  timestamp: string;
}

interface WebSocketMessage {
  type: string;
  data?: any;
  message?: string;
  timestamp?: string;
}

interface WebSocketConfig {
  autoReconnect: boolean;
  maxReconnectAttempts: number;
  reconnectBackoff: boolean;
  baseDelay: number;
  maxDelay: number;
}

// ✅ CONFIGURAÇÃO COM BACKOFF EXPONENCIAL
const WEBSOCKET_CONFIG: WebSocketConfig = {
  autoReconnect: true,
  maxReconnectAttempts: 5,
  reconnectBackoff: true,
  baseDelay: 2000,    // 2 segundos inicial
  maxDelay: 60000     // 1 minuto máximo
};

// ⚡ SINGLETON: Variável global para garantir apenas 1 conexão WebSocket
let globalWebSocket: WebSocket | null = null;
let globalConnectionInProgress = false;

export const useUnifiedWebSocket = (onToast?: (toast: any) => void, options?: { enabled?: boolean }) => {
  const { enabled = true } = options || {};

  // ✅ SINGLETON: Usar gerenciador centralizado + compatibilidade com código existente
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const queryClient = useQueryClient();
  const { user, logout, isAuthReady } = useAuth();

  // ✅ CONTROLE DE RECONEXÃO (mantido para compatibilidade)
  const reconnectAttempts = useRef(0);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isConnectedRef = useRef(false);
  const shouldReconnect = useRef(true);
  const isConnecting = useRef(false);

  // ✅ Função para calcular delay com backoff exponencial
  const calculateReconnectDelay = useCallback((attempt: number): number => {
    if (!WEBSOCKET_CONFIG.reconnectBackoff) {
      return WEBSOCKET_CONFIG.baseDelay;
    }

    const delay = Math.min(
      WEBSOCKET_CONFIG.baseDelay * Math.pow(2, attempt),
      WEBSOCKET_CONFIG.maxDelay
    );

    // Adicionar jitter (±25%) para evitar thundering herd
    const jitter = delay * 0.25 * (Math.random() - 0.5);
    return Math.floor(delay + jitter);
  }, []);

  // ✅ COMPATIBILIDADE: Função para session termination (substitui use-session-monitor.ts)
  const handleSessionTermination = useCallback(async (data: any) => {
    console.log('🚨 [UnifiedWebSocket] Session termination:', data);

    try {
      // Fechar WebSocket imediatamente
      shouldReconnect.current = false;
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
        setSocket(null);
        setIsConnected(false);
        isConnectedRef.current = false;
      }

      // Fazer logout do Firebase
      const { auth } = await import('../lib/firebase');
      const { signOut } = await import('firebase/auth');
      await signOut(auth);

      // Limpar dados locais
      localStorage.removeItem('sessionToken');
      localStorage.removeItem('firebaseToken');
      localStorage.removeItem('userPreferences');
      sessionStorage.clear();

      // Emitir evento global para cleanup de auth
      window.dispatchEvent(new Event('auth-cleanup'));

      // Determinar mensagem baseada no tipo de terminação
      let message = 'Sua sessão foi encerrada.';
      let alertType = 'info';

      if (data?.reason) {
        switch (data.reason) {
          case 'new_login':
            message = data.message || 'Sua sessão foi encerrada porque você fez login em outro dispositivo.';
            alertType = 'warning';
            break;
          case 'manual':
            message = data.message || 'Sua sessão foi encerrada por um administrador.';
            alertType = 'error';
            break;
          case 'security':
            message = data.message || 'Sua sessão foi encerrada por motivos de segurança.';
            alertType = 'error';
            break;
          case 'expired':
            message = data.message || 'Sua sessão expirou.';
            alertType = 'warning';
            break;
          case 'user_logout':
            message = 'Logout realizado com sucesso.';
            alertType = 'success';
            break;
          default:
            message = data.message || 'Sua sessão foi encerrada.';
        }
      }

      // Toast notification se disponível
      if (onToast) {
        const title = data?.title || 'Sessão Encerrada';
        const toastVariant = alertType === 'error' ? 'destructive' : 'default';

        onToast({
          title,
          description: message,
          variant: toastVariant,
          duration: 8000,
        });
      }

      // Fallback em caso de erro
      alert(`${data?.title || 'Sessão Encerrada'}\n\n${message}`);


      // Redirecionar para login com parâmetro para mostrar mensagem
      const redirectUrl = new URL('/', window.location.origin);
      redirectUrl.searchParams.set('logoutReason', data?.reason || 'session-terminated');
      redirectUrl.searchParams.set('message', message);

      setTimeout(() => {
        window.location.href = redirectUrl.toString();
      }, onToast ? 2000 : 500); // Mais tempo se toast for mostrado

    } catch (error) {
      console.error('❌ Erro durante session termination:', error);

      // Fallback em caso de erro
      alert('Sua sessão foi encerrada. Você será redirecionado para o login.');
      setTimeout(() => {
        window.location.href = '/';
      }, 500);
    }
  }, [onToast]);

  // ✅ COMPATIBILIDADE: Função para price drops (substitui use-websocket.ts)
  const handlePriceDrop = useCallback((data: any) => {
    console.log('🔔 [UnifiedWebSocket] Price drop detected:', data);

    // Toast notification
    if (onToast) {
      onToast({
        title: "🎉 Preço Baixou!",
        description: `${data.model || data.produto?.nome || 'Produto'} - Novo preço: ${formatPrice(data.newPrice || data.produto?.preco || 0)}`,
        duration: 8000,
      });
    }

    // Browser notification
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('🎉 Preço Baixou!', {
        body: `${data.model || data.produto?.nome || 'Produto'} - Oportunidade de economia!`,
        icon: '/favicon.ico',
        tag: 'price-drop',
        requireInteraction: true
      });
    }

    // Custom event para notification bell
    window.dispatchEvent(new CustomEvent('priceDropNotification', {
      detail: data
    }));

    // Invalidar queries
    queryClient.invalidateQueries({ queryKey: ['/api/notifications/unread-count'] });
    queryClient.invalidateQueries({ queryKey: ['/api/notifications/price-drops'] });
    queryClient.invalidateQueries({ queryKey: ['/api/products'] });
  }, [onToast, queryClient]);

  // ✅ COMPATIBILIDADE: Função para notificações detalhadas (substitui use-websocket-notifications.ts)
  const handleDetailedPriceDrop = useCallback((notification: any) => {
    console.log('🔔 [UnifiedWebSocket] Detailed price drop:', notification);

    if (!notification.model) {
      console.error('❌ Invalid notification data:', notification);
      return;
    }

    const oldPrice = typeof notification.oldPrice === 'number' ? notification.oldPrice : parseFloat(notification.oldPrice || 0);
    const newPrice = typeof notification.newPrice === 'number' ? notification.newPrice : parseFloat(notification.newPrice || 0);
    const savings = oldPrice - newPrice;

    const isIPhone = notification.isIPhone || notification.model.toLowerCase().includes('iphone');
    const productEmoji = isIPhone ? '📱' : '💰';
    const title = isIPhone ? `${productEmoji} iPhone - Preço Baixou!` : `${productEmoji} Preço Baixou!`;

    if (onToast) {
      onToast({
        title: title,
        description: `${notification.model} ${notification.storage || ''} ${notification.color || ''} na ${notification.supplier} - Preço baixou de R$${oldPrice.toFixed(2).replace('.', ',')} para R$${newPrice.toFixed(2).replace('.', ',')} (economia: R$${savings.toFixed(2).replace('.', ',')}) - ${notification.dropPercentage} de desconto!`,
        duration: 12000,
      });
    }

    // Invalidar queries
    queryClient.invalidateQueries({ queryKey: ['/api/notifications/unread-count'] });
    queryClient.invalidateQueries({ queryKey: ['/api/notifications/price-drops'] });
    queryClient.invalidateQueries({ queryKey: ['/api/products'] });
  }, [onToast, queryClient]);

  // ✅ FUNÇÃO PRINCIPAL DE CONEXÃO (SINGLETON)
  const connectWebSocket = useCallback(async () => {
    console.log('🔄 [UnifiedWebSocket] Connection attempt started', {
      userEmail: user?.email,
      userId: user?.id || user?.uid,
      isAuthReady,
      windowLocation: window.location.href
    });

    // Verificar se ad blocker está forçando modo polling
    if (typeof window !== 'undefined' && (window as any).FORCE_POLLING_MODE) {
      console.log('🛡️ [UnifiedWebSocket] Ad blocker detected - skipping WebSocket, using polling mode');
      return;
    }

    // ✅ SINGLETON: Verificar se já está conectado via singleton
    if (wsManager.isConnected()) {
      console.log('🔗 [UnifiedWebSocket] Already connected via singleton');
      setIsConnected(true);
      return;
    }

    // Verificações de segurança
    if (!user || !user.email) {
      console.log('🔌 [UnifiedWebSocket] No authenticated user - cannot connect', {
        hasUser: !!user,
        hasEmail: !!user?.email,
        hasUID: !!user?.uid,
        isAuthReady
      });
      return;
    }

    console.log('✅ [UnifiedWebSocket] Authenticated user found - using singleton connection', {
      userId: user.id || user.uid,
      email: user.email || 'N/A',
      role: user.role
    });

    try {
      // ✅ SINGLETON: Conectar via gerenciador centralizado
      await wsManager.connect(user.email);
      setIsConnected(true);
      isConnectedRef.current = true;
      isConnecting.current = false;
      reconnectAttempts.current = 0;
      console.log('✅ [UnifiedWebSocket] Connected via singleton successfully');

      // Register message type handlers with wsManager
      // Price drops
      const unsubPriceDrop = wsManager.on('price-drop', (message) => {
        handlePriceDrop(message.data);
        queryClient.invalidateQueries({ queryKey: ['sheets-products'] });
      });

      const unsubPriceDrop2 = wsManager.on('price_drop', (message) => {
        handlePriceDrop(message.data);
        queryClient.invalidateQueries({ queryKey: ['sheets-products'] });
      });

      const unsubPriceDropNotif = wsManager.on('price_drop_notification', (message) => {
        handleDetailedPriceDrop(message.data);
        queryClient.invalidateQueries({ queryKey: ['sheets-products'] });
      });

      // Session management
      const unsubSessionTerminated = wsManager.on('session_terminated', (message) => {
        handleSessionTermination(message.data);
      });

      const unsubSessionInvalidated = wsManager.on('SESSION_INVALIDATED', (message) => {
        console.log('🚨 [UnifiedWebSocket] Session invalidated:', message.message);
        handleSessionTermination({ reason: 'session_invalidated', message: message.message });
      });

      // Connection events
      const unsubConnection = wsManager.on('connection', (message) => {
        console.log('✅ [UnifiedWebSocket] Connection confirmed:', message.type);
      });

      const unsubSessionRegistered = wsManager.on('session_registered', (message) => {
        console.log('✅ [UnifiedWebSocket] Connection confirmed:', message.type);
      });

      const unsubSessionRegistered2 = wsManager.on('SESSION_REGISTERED', (message) => {
        console.log('✅ [UnifiedWebSocket] Connection confirmed:', message.type);
      });

      const unsubConnEstablished = wsManager.on('CONNECTION_ESTABLISHED', (message) => {
        console.log('✅ [UnifiedWebSocket] Connection confirmed:', message.type);
      });

      // Auth errors
      const unsubAuthError = wsManager.on('AUTH_ERROR', (message) => {
        console.error('❌ [UnifiedWebSocket] Authentication failed:', message.data?.error);

        if (onToast) {
          onToast({
            title: "🔐 Falha na Autenticação WebSocket",
            description: "Tentando reconectar com token atualizado...",
            duration: 3000,
          });
        }

        setTimeout(async () => {
          try {
            const { auth } = await import('../lib/firebase');
            if (auth.currentUser) {
              const freshToken = await auth.currentUser.getIdToken(true);
              localStorage.setItem('firebaseToken', freshToken);
              console.log('🔄 [UnifiedWebSocket] Fresh token obtained for retry');

              if (wsRef.current) {
                wsRef.current.close();
              }

              setTimeout(() => {
                if (shouldReconnect.current) {
                  connectWebSocket();
                }
              }, 1000);
            }
          } catch (error) {
            console.error('❌ Failed to refresh authentication for WebSocket:', error);
            shouldReconnect.current = false;
            disconnect();
            setTimeout(() => {
              shouldReconnect.current = true;
              connectWebSocket();
            }, 5000);
          }
        }, 1000);
      });

      // Test events
      const unsubTestSuccess = wsManager.on('test_success', (message) => {
        if (onToast) {
          onToast({
            title: "✅ Teste Executado!",
            description: `${message.data?.message} (${message.data?.clientsNotified} clientes notificados)`,
            duration: 6000,
          });
        }
      });

      // Emergency alerts
      const unsubEmergencyAlert = wsManager.on('emergency_alert', (message) => {
        console.log('📢 Emergency alert:', message.data);
        window.dispatchEvent(new CustomEvent('emergencyAlert', {
          detail: message.data
        }));

        const urgencyEmoji = message.data?.urgency === 'high' ? '🚨' :
                           message.data?.urgency === 'medium' ? '⚠️' : 'ℹ️';
        if (onToast) {
          onToast({
            title: `${urgencyEmoji} ${message.data?.title}`,
            description: message.data?.message,
            duration: 10000,
          });
        }
      });

      // Feedback alerts
      const unsubFeedbackAlert = wsManager.on('new_feedback_alert', (message) => {
        console.log('📢 New feedback alert received:', message.data);
        window.dispatchEvent(new CustomEvent('newFeedbackAlert', {
          detail: message.data
        }));
      });

      // New session detection
      const unsubNewSession = wsManager.on('NEW_SESSION_DETECTED', (message) => {
        console.log('🔐 [UnifiedWebSocket] New session detected from different IP:', message.data);
        if (onToast) {
          const { ipAddress, city, country, deviceInfo } = message.data || {};
          const location = city && country ? `${city}, ${country}` : ipAddress || 'localização desconhecida';
          const device = deviceInfo || 'dispositivo desconhecido';
          
          onToast({
            title: "🔐 Novo Acesso Detectado",
            description: `Uma nova sessão foi iniciada em ${location} (${device}). Se não foi você, altere sua senha imediatamente.`,
            variant: 'default',
            duration: 10000,
          });
        }
        
        window.dispatchEvent(new CustomEvent('newSessionDetected', {
          detail: message.data
        }));
      });

      // Sheet updates
      const unsubSheetUpdate = wsManager.on('SHEET_UPDATE', (message) => {
        console.log('📊 Sheet update notification received:', message.data);
        
        if (onToast) {
          const { supplierName, productType } = message.data;
          onToast({
            title: "📦 Lista Atualizada",
            description: `${supplierName || 'Fornecedor'} enviou a lista${productType ? ` de ${productType}` : ''}`,
            duration: 6000,
          });
        }

        console.log('🔄 Invalidando cache de produtos para atualização imediata...');
        
        queryClient.invalidateQueries({ queryKey: ['sheets-products'] });
        queryClient.invalidateQueries({ queryKey: ['/api/products'] });
        queryClient.invalidateQueries({ queryKey: ['/api/products/dates'] });
        queryClient.invalidateQueries({ queryKey: ['/api/search'] });
        queryClient.invalidateQueries({ queryKey: ['products'] });
        queryClient.invalidateQueries({ queryKey: ['/api/products/stats'] });
        
        queryClient.refetchQueries({ queryKey: ['sheets-products'] });
        queryClient.refetchQueries({ queryKey: ['/api/products/stats'] });
        
        console.log('✅ Cache invalidado - dados serão atualizados automaticamente');
        
        window.dispatchEvent(new CustomEvent('sheetUpdate', {
          detail: message.data
        }));
      });

      // Price updates
      const unsubPriceUpdate = wsManager.on('price_update', (message) => {
        const products = (message.data as any)?.products || [];
        if (products.length > 0) {
          const decreases = products.filter((p: any) => p.isFalling);

          if (decreases.length > 0 && onToast) {
            onToast({
              title: "Preços em Queda",
              description: `${decreases.length} produtos com preços menores`,
              duration: 5000,
            });
          }

          queryClient.invalidateQueries({ queryKey: ['/api/products'] });
          queryClient.invalidateQueries({ queryKey: ['/api/stats'] });
        }
      });

      // Cache refresh
      const unsubCacheRefreshed = wsManager.on('CACHE_REFRESHED', (message) => {
        console.log('🔄 Cache refresh received, invalidating all queries...');

        queryClient.invalidateQueries({ queryKey: ['products'] });
        queryClient.invalidateQueries({ queryKey: ['suppliers'] });
        queryClient.invalidateQueries({ queryKey: ['categories'] });
        queryClient.invalidateQueries({ queryKey: ['colors'] });
        queryClient.invalidateQueries({ queryKey: ['dates'] });
        queryClient.invalidateQueries({ queryKey: ['storage-options'] });
        queryClient.invalidateQueries({ queryKey: ['interest-list'] });
        queryClient.invalidateQueries({ queryKey: ['favorites'] });
        queryClient.invalidateQueries({ queryKey: ['price-history'] });

        queryClient.refetchQueries({ queryKey: ['products'] });

        console.log('✅ All queries invalidated and main data refetched');

        if (onToast) {
          onToast({
            title: "🔄 Dados Atualizados",
            description: message.data?.message || "Planilha atualizada automaticamente!",
            duration: 4000,
          });
        }

        window.dispatchEvent(new CustomEvent('dataRefresh', {
          detail: message.data
        }));
      });

      const unsubCacheRefreshed2 = wsManager.on('cache_refreshed', (message) => {
        console.log('🔄 Cache refresh received, invalidating all queries...');

        queryClient.invalidateQueries({ queryKey: ['products'] });
        queryClient.invalidateQueries({ queryKey: ['suppliers'] });
        queryClient.invalidateQueries({ queryKey: ['categories'] });
        queryClient.invalidateQueries({ queryKey: ['colors'] });
        queryClient.invalidateQueries({ queryKey: ['dates'] });
        queryClient.invalidateQueries({ queryKey: ['storage-options'] });
        queryClient.invalidateQueries({ queryKey: ['interest-list'] });
        queryClient.invalidateQueries({ queryKey: ['favorites'] });
        queryClient.invalidateQueries({ queryKey: ['price-history'] });

        queryClient.refetchQueries({ queryKey: ['products'] });

        console.log('✅ All queries invalidated and main data refetched');

        if (onToast) {
          onToast({
            title: "🔄 Dados Atualizados",
            description: message.data?.message || "Planilha atualizada automaticamente!",
            duration: 4000,
          });
        }

        window.dispatchEvent(new CustomEvent('dataRefresh', {
          detail: message.data
        }));
      });

      // User approval/rejection
      const unsubUserApproved = wsManager.on('USER_APPROVED', (message) => {
        console.log('🎉 [UnifiedWebSocket] User approved:', message.data);
        
        if (onToast) {
          onToast({
            title: "🎉 Conta Aprovada!",
            description: message.data?.message || "Sua conta foi aprovada! Você já pode acessar todas as funcionalidades.",
            duration: 8000,
          });
        }

        window.dispatchEvent(new CustomEvent('userApproved', {
          detail: message.data
        }));

        queryClient.invalidateQueries({ queryKey: ['/api/user/profile'] });
        
        setTimeout(() => {
          window.location.href = '/buscador';
        }, 2000);
      });

      const unsubUserRejected = wsManager.on('USER_REJECTED', (message) => {
        console.log('❌ [UnifiedWebSocket] User rejected:', message.data);
        
        if (onToast) {
          onToast({
            title: "❌ Cadastro Rejeitado",
            description: message.data?.message || "Sua solicitação de cadastro foi rejeitada.",
            variant: "destructive",
            duration: 8000,
          });
        }

        window.dispatchEvent(new CustomEvent('userRejected', {
          detail: message.data
        }));

        queryClient.invalidateQueries({ queryKey: ['/api/user/profile'] });
      });

      // Store cleanup functions for later
      const cleanupListeners = () => {
        unsubPriceDrop();
        unsubPriceDrop2();
        unsubPriceDropNotif();
        unsubSessionTerminated();
        unsubSessionInvalidated();
        unsubConnection();
        unsubSessionRegistered();
        unsubSessionRegistered2();
        unsubConnEstablished();
        unsubAuthError();
        unsubTestSuccess();
        unsubEmergencyAlert();
        unsubFeedbackAlert();
        unsubNewSession();
        unsubSheetUpdate();
        unsubPriceUpdate();
        unsubCacheRefreshed();
        unsubCacheRefreshed2();
        unsubUserApproved();
        unsubUserRejected();
      };

      // Return cleanup function
      return cleanupListeners;

    } catch (error: unknown) {
      const err = error as Error;
      console.error('❌ [UnifiedWebSocket] Connection setup error:', {
        error: err?.message || 'Unknown error',
        userEmail: user?.email,
        authReady: isAuthReady
      });
      isConnecting.current = false;
      
      setIsConnected(false);
      isConnectedRef.current = false;
    }
  }, [user, handlePriceDrop, handleDetailedPriceDrop, handleSessionTermination, onToast, calculateReconnectDelay, queryClient, isAuthReady]);

  // ✅ Função para disconnect gracioso
  const disconnect = useCallback(() => {
    console.log('🔌 [UnifiedWebSocket] Disconnecting...');
    shouldReconnect.current = false;

    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (wsRef.current) {
      wsRef.current.close(1000, 'Manual disconnect');
      wsRef.current = null;
      setSocket(null);
      setIsConnected(false);
      isConnectedRef.current = false;
    }
  }, []);

  // ✅ Effect para auth cleanup
  useEffect(() => {
    const handleAuthCleanup = () => {
      console.log('🧹 [UnifiedWebSocket] Auth cleanup detected - disconnecting');
      disconnect();
    };

    window.addEventListener('auth-cleanup', handleAuthCleanup);
    return () => window.removeEventListener('auth-cleanup', handleAuthCleanup);
  }, [disconnect]);

  // ✅ CORREÇÃO DEFINITIVA: Effect principal que aguarda sessionToken estar disponível
  const userId = user?.id;
  const email = user?.email;
  const sessionToken = user?.sessionToken || localStorage.getItem('sessionToken');

  const shouldConnect = useMemo(() => {
    console.log('🔄 [UnifiedWebSocket] Auth state check:', {
      isAuthReady,
      hasUser: !!user,
      hasUID: !!user?.uid,
      hasEmail: !!user?.email,
      userRole: user?.role,
      userApproved: user?.isApproved
    });

    // ✅ CRITICAL FIX: Ensure auth is fully ready AND user is authenticated
    const canConnect = isAuthReady && user && user.email;

    if (canConnect) {
      console.log('✅ [UnifiedWebSocket] Auth complete - WebSocket connection allowed');
      return true;
    } else {
      console.log('🔌 [UnifiedWebSocket] Auth not ready or no user - connection not allowed', {
        isAuthReady,
        hasUser: !!user,
        hasEmail: !!user?.email,
        hasUID: !!user?.uid
      });
      return false;
    }
  }, [user, isAuthReady]);

  useEffect(() => {
    // Only proceed if enabled by the `options` prop
    if (!enabled) {
      console.log('🔌 [UnifiedWebSocket] Hook disabled by options - skipping connection');
      // Ensure disconnection if it was previously connected and now disabled
      if (isConnected || isConnecting.current) {
        disconnect();
      }
      return;
    }

    console.log('🔄 [UnifiedWebSocket] Connection effect triggered:', {
      shouldConnect,
      shouldReconnectFlag: shouldReconnect.current,
      isConnected,
      isConnecting: isConnecting.current,
      userEmail: user?.email
    });

    if (shouldConnect) {
      // Enable reconnection and connect
      shouldReconnect.current = true;

      if (!isConnected && !isConnecting.current) {
        console.log('✅ [UnifiedWebSocket] Starting WebSocket connection...');
        connectWebSocket();
      } else {
        console.log('🔌 [UnifiedWebSocket] Already connected or connecting - skipping');
      }
    } else {
      console.log('🔌 [UnifiedWebSocket] Should not connect - disconnecting...');
      shouldReconnect.current = false;
      disconnect();
    }
  }, [enabled, shouldConnect, connectWebSocket, disconnect, isConnected, user]);


  // ✅ Cleanup no unmount e em mudanças de dependência
  useEffect(() => {
    return () => {
      console.log('🧹 [UnifiedWebSocket] Component unmounting - cleanup');

      // ✅ CORREÇÃO: Limpar timeout de reconexão
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }

      // ✅ CORREÇÃO: Resetar flags de controle
      isConnecting.current = false;
      shouldReconnect.current = false;
      reconnectAttempts.current = 0;

      disconnect();
    };
  }, [disconnect]);

  // ✅ API COMPATÍVEL COM HOOKS ANTIGOS
  return {
    socket,
    isConnected,
    connect: connectWebSocket,
    disconnect,
    reconnectAttempts: reconnectAttempts.current,
    maxAttempts: WEBSOCKET_CONFIG.maxReconnectAttempts,
    // Compatibilidade com use-session-monitor
    reconnect: connectWebSocket
  };
};
