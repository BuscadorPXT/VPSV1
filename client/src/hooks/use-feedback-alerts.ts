import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from './use-auth';
import { auth } from '@/lib/firebase';

// ✅ Helper para obter Firebase token
const getFirebaseToken = async (): Promise<string | null> => {
  try {
    const user = auth.currentUser;
    if (!user) return null;
    return await user.getIdToken();
  } catch (error) {
    console.error('Erro ao obter Firebase token:', error);
    return null;
  }
};

interface FeedbackAlert {
  id: number;
  title: string;
  message: string;
  feedbackType: 'emoji' | 'text' | 'both';
  isRequired: boolean;
  hasResponded: boolean;
  delaySeconds: number;
}

export function useFeedbackAlerts() {
  const { user, isAuthReady, authInitialized } = useAuth();
  const [alerts, setAlerts] = useState<FeedbackAlert[]>([]);
  const [currentAlert, setCurrentAlert] = useState<FeedbackAlert | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  // 🔧 FIX: Use useRef to avoid re-render loops
  const delayTimersRef = useRef<Map<number, NodeJS.Timeout>>(new Map());
  const lastFetchTimeRef = useRef<number>(0);
  const isInitializedRef = useRef<boolean>(false);

  const fetchActiveAlerts = useCallback(async () => {
    if (!user?.email) {
      console.log('🚫 [FEEDBACK-ALERTS-HOOK] No user or email, skipping alerts fetch');
      return;
    }

    // Wait for authentication to be fully ready
    if (!isAuthReady || !authInitialized) {
      console.log('🕐 [FEEDBACK-ALERTS-HOOK] Auth not ready, waiting...');
      return;
    }

    console.log('🔍 [FEEDBACK-ALERTS-HOOK] Fetching alerts for user', user.email);

    try {
      setIsLoading(true);

      // ✅ CORREÇÃO: Obter Firebase token
      const firebaseToken = await getFirebaseToken();
      if (!firebaseToken) {
        console.log('🕐 [FEEDBACK-ALERTS-HOOK] No Firebase token found, waiting for token to be ready');
        return;
      }

      const response = await fetch('/api/feedback-alerts/active', {
        headers: {
          'Authorization': `Bearer ${firebaseToken}`,
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        console.log('📋 [FEEDBACK-ALERTS-HOOK] Received alerts:', data.alerts);

        setAlerts(data.alerts);

        // Filtrar avisos que devem ser exibidos
        const alertsToShow = data.alerts.filter((alert: FeedbackAlert) =>
          !alert.hasResponded || alert.isRequired
        );

        console.log('🎯 [FEEDBACK-ALERTS-HOOK] Alerts to show with delays:', alertsToShow);

        // Limpar timers anteriores
        delayTimersRef.current.forEach(timer => clearTimeout(timer));
        delayTimersRef.current.clear();

        // Configurar delays para cada aviso (apenas o primeiro será exibido imediatamente)
        alertsToShow.forEach((alert: FeedbackAlert, index: number) => {
          // Primeiro alerta: delay configurado
          // Alertas seguintes: aguardam conclusão do anterior
          const baseDelay = alert.delaySeconds * 1000;
          const delay = index === 0 ? baseDelay : baseDelay + (index * 2000); // 2s entre alertas subsequentes

          console.log(`⏱️ [FEEDBACK-ALERTS-HOOK] Setting timer for alert ${alert.id} with delay ${delay}ms (position ${index})`);

          const timer = setTimeout(() => {
            // Verificar se não há outro aviso sendo exibido
            setCurrentAlert(prev => {
              if (prev === null) {
                console.log(`🔔 [FEEDBACK-ALERTS-HOOK] Showing alert ${alert.id} after ${delay}ms delay`);
                return alert;
              } else {
                // Se há um alerta ativo, reagendar para mais tarde
                const retryTimer = setTimeout(() => {
                  setCurrentAlert(prevAgain => {
                    if (prevAgain === null) {
                      return alert;
                    }
                    return prevAgain;
                  });
                }, 5000); // Tentar novamente em 5s

                delayTimersRef.current.set(alert.id + 10000, retryTimer); // Add offset to avoid key collision
                return prev;
              }
            });
          }, delay);

          delayTimersRef.current.set(alert.id, timer);
        });

        // Timers now managed via ref - no state update needed
      } else if (response.status === 401) {
        console.warn('🔐 [FEEDBACK-ALERTS-HOOK] Auth required, will retry when session is ready');
        // Don't log this as an error, just wait for auth to be ready
      } else {
        console.error('❌ [FEEDBACK-ALERTS-HOOK] Error response:', response.status, response.statusText);
      }
    } catch (error) {
      console.error('❌ [FEEDBACK-ALERTS-HOOK] Network error:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user?.email, isAuthReady, authInitialized]); // 🔧 FIX: Removed delayTimers dependency

  const submitResponse = async (alertId: number, emojiResponse?: string, textResponse?: string) => {
    if (!user) {
      throw new Error('Usuário não autenticado');
    }

    try {
      // ✅ CORREÇÃO: Obter Firebase token
      const firebaseToken = await getFirebaseToken();
      if (!firebaseToken) {
        throw new Error('Token Firebase não encontrado');
      }

      const response = await fetch('/api/feedback-alerts/respond', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${firebaseToken}`
        },
        credentials: 'include',
        body: JSON.stringify({
          alertId,
          emojiResponse,
          textResponse
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ [FEEDBACK-ALERTS-HOOK] Response error:', response.status, errorText);
        throw new Error('Erro ao enviar resposta');
      }

      // Marcar como respondido e buscar próximo aviso
      setAlerts(prev => prev.map(alert =>
        alert.id === alertId ? { ...alert, hasResponded: true } : alert
      ));

      // Buscar próximo aviso não respondido
      const nextAlert = alerts.find(alert =>
        alert.id !== alertId && (!alert.hasResponded || alert.isRequired)
      );
      setCurrentAlert(nextAlert || null);
    } catch (error) {
      console.error('❌ [FEEDBACK-ALERTS-HOOK] Error submitting response:', error);
      throw error;
    }
  };

  const closeCurrentAlert = () => {
    if (currentAlert && !currentAlert.isRequired) {
      setCurrentAlert(null);

      // Procurar próximo aviso não respondido
      const nextAlert = alerts.find(alert =>
        alert.id !== currentAlert.id && (!alert.hasResponded || alert.isRequired)
      );

      if (nextAlert) {
        const delay = nextAlert.delaySeconds * 1000;
        console.log(`⏱️ [FEEDBACK-ALERTS-HOOK] Setting timer for next alert ${nextAlert.id} with delay ${nextAlert.delaySeconds}s`);

        setTimeout(() => {
          setCurrentAlert(nextAlert);
        }, delay);
      }
    }
  };

  const initializeFeedbackAlerts = useCallback(() => {
    if (user?.email && isAuthReady && authInitialized) {
      console.log('🎯 [FEEDBACK-ALERTS-HOOK] User authenticated and session ready, fetching alerts for:', user.email);
      
      // 🔧 FIX: Add throttling to prevent excessive requests
      const now = Date.now();
      const timeSinceLastFetch = now - lastFetchTimeRef.current;
      const minInterval = 30000; // 30 seconds minimum between fetches
      
      if (timeSinceLastFetch >= minInterval || !isInitializedRef.current) {
        lastFetchTimeRef.current = now;
        isInitializedRef.current = true;
        fetchActiveAlerts();
      } else {
        console.log(`⏳ [FEEDBACK-ALERTS-HOOK] Throttling: Next fetch allowed in ${Math.ceil((minInterval - timeSinceLastFetch) / 1000)}s`);
      }
    } else {
      console.log('🕐 [FEEDBACK-ALERTS-HOOK] Auth not ready or no user, skipping initial fetch.');
    }
  }, [user?.email, isAuthReady, authInitialized, fetchActiveAlerts]);

  // 🔧 FIX: Optimized initialization - run once when auth is ready
  // ⚡ DEFER: Aguardar 5 segundos após login antes de buscar feedback alerts (não-crítico)
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    let deferTimeoutId: NodeJS.Timeout;
    let hasInitialized = false;

    const pollForSessionToken = () => {
      // Skip if no user is authenticated or already initialized
      if (!user?.uid || hasInitialized) {
        return;
      }

      const token = localStorage.getItem('sessionToken') || localStorage.getItem('firebaseToken');
      if (!token) {
        console.log('🕐 [FEEDBACK-ALERTS-HOOK] Session token not ready yet, retrying in 10s');
        timeoutId = setTimeout(pollForSessionToken, 10000); // 🔧 Increased interval to 10s
      } else {
        console.log('✅ [FEEDBACK-ALERTS-HOOK] Session token found, deferring feedback alerts for 5s');
        hasInitialized = true;
        
        // ⚡ DEFER: Aguardar 5 segundos antes de inicializar (priorizar dados críticos)
        deferTimeoutId = setTimeout(() => {
          initializeFeedbackAlerts();
        }, 5000);
      }
    };

    // Reset initialization flag when user changes
    hasInitialized = false;
    pollForSessionToken();

    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      if (deferTimeoutId) {
        clearTimeout(deferTimeoutId);
      }
    };
  }, [user?.uid, isAuthReady, authInitialized, initializeFeedbackAlerts]); // 🔧 Added auth states to reset when they change


  // 📢 Listener para novos avisos via WebSocket
  useEffect(() => {
    const handleNewFeedbackAlert = (event: CustomEvent) => {
      const alertData = event.detail;
      console.log('📢 [FEEDBACK-ALERTS-HOOK] New feedback alert received via WebSocket:', alertData);

      if (!user || !alertData) return;

      // Verificar se o aviso é para este usuário
      const { targetAudience } = alertData;
      const userRole = user.role || 'user';
      const userPlan = user.subscriptionPlan || 'free';

      let shouldShowAlert = false;
      if (targetAudience === 'all') {
        shouldShowAlert = true;
      } else if (targetAudience === 'admin' && (userRole === 'admin' || userRole === 'superadmin')) {
        shouldShowAlert = true;
      } else if (targetAudience === 'business' && userPlan === 'business') {
        shouldShowAlert = true;
      } else if (targetAudience === 'pro' && userPlan === 'pro') {
        shouldShowAlert = true;
      }

      if (shouldShowAlert) {
        // Criar novo alerta
        const newAlert: FeedbackAlert = {
          id: alertData.alertId,
          title: alertData.title,
          message: alertData.message,
          feedbackType: alertData.feedbackType,
          isRequired: alertData.isRequired,
          hasResponded: false,
          delaySeconds: alertData.delaySeconds || 15
        };

        // Adicionar à lista de alertas
        setAlerts(prev => {
          // Verificar se já existe
          const exists = prev.find(alert => alert.id === newAlert.id);
          if (exists) return prev;
          return [...prev, newAlert];
        });

        // Se não há alerta atual, exibir este com delay
        setCurrentAlert(prev => {
          if (prev === null) {
            const delay = newAlert.delaySeconds * 1000;
            console.log(`⏱️ [FEEDBACK-ALERTS-HOOK] Setting timer for new WebSocket alert ${newAlert.id} with delay ${delay}ms`);

            setTimeout(() => {
              setCurrentAlert(newAlert);
            }, delay);
          }
          return prev;
        });
      }
    };

    window.addEventListener('newFeedbackAlert', handleNewFeedbackAlert as EventListener);

    return () => {
      window.removeEventListener('newFeedbackAlert', handleNewFeedbackAlert as EventListener);
    };
  }, [user]);

  // 🔧 FIX: Cleanup all timers on unmount or auth change
  useEffect(() => {
    return () => {
      delayTimersRef.current.forEach(timer => clearTimeout(timer));
      delayTimersRef.current.clear();
    };
  }, [user?.uid]); // Clear timers when user changes

  return {
    alerts,
    currentAlert,
    isLoading,
    submitResponse,
    closeCurrentAlert,
    refetch: fetchActiveAlerts
  };
}