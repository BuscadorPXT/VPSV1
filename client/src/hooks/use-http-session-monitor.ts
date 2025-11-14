
import { useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/hooks/use-auth';

interface UseHttpSessionMonitorOptions {
  onSessionInvalidated?: (message: string) => void;
  onSessionTerminated?: (message: string) => void;
  pollInterval?: number; // in milliseconds
}

export const useHttpSessionMonitor = (options: UseHttpSessionMonitorOptions = {}) => {
  const { onSessionInvalidated, onSessionTerminated, pollInterval = 30000 } = options; // Default 30s
  const { user, logout } = useAuth();
  const pollTimeoutRef = useRef<NodeJS.Timeout>();
  const isPollingRef = useRef(false);

  const checkSessionStatus = useCallback(async () => {
    if (!user?.sessionToken || isPollingRef.current) {
      return;
    }

    isPollingRef.current = true;

    try {
      const response = await fetch('/api/auth/session-status', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${user.sessionToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        if (response.status === 401) {
          console.log('🚨 Session invalidated via HTTP polling');
          if (onSessionInvalidated) {
            onSessionInvalidated('Session expired or invalidated');
          }
          return;
        }
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      
      if (data.status === 'terminated') {
        console.log('🚨 Session terminated by another device (HTTP polling)');
        if (onSessionTerminated) {
          onSessionTerminated(data.message || 'Session terminated by another device');
        }
        
        // ✅ CORREÇÃO: Usar ref para timeout que pode ser limpo
        const logoutTimeoutId = setTimeout(logout, 3000);
        
        // ✅ CORREÇÃO: Armazenar timeout para cleanup posterior se necessário
        if (!pollTimeoutRef.current) {
          pollTimeoutRef.current = logoutTimeoutId;
        }
        return;
      }

      // ✅ CORREÇÃO: Verificar se ainda devemos fazer polling antes de agendar
      if (user?.sessionToken) {
        pollTimeoutRef.current = setTimeout(checkSessionStatus, pollInterval);
      }

    } catch (error) {
      console.error('❌ Session status check failed:', error);
      
      // ✅ CORREÇÃO: Verificar se ainda devemos fazer polling antes de agendar
      if (user?.sessionToken) {
        pollTimeoutRef.current = setTimeout(checkSessionStatus, pollInterval * 2);
      }
    } finally {
      isPollingRef.current = false;
    }
  }, [user?.sessionToken, onSessionInvalidated, onSessionTerminated, logout, pollInterval]);

  const startPolling = useCallback(() => {
    if (user?.sessionToken && !pollTimeoutRef.current) {
      console.log('🔄 Starting HTTP session monitoring (polling every 30s)');
      checkSessionStatus();
    }
  }, [user?.sessionToken, checkSessionStatus]);

  const stopPolling = useCallback(() => {
    if (pollTimeoutRef.current) {
      clearTimeout(pollTimeoutRef.current);
      pollTimeoutRef.current = undefined;
      isPollingRef.current = false;
      console.log('⏹️ Stopped HTTP session monitoring');
    }
  }, []);

  // Start/stop polling based on authentication status
  useEffect(() => {
    if (user?.sessionToken) {
      startPolling();
    } else {
      stopPolling();
    }

    return stopPolling;
  }, [user?.sessionToken, startPolling, stopPolling]);

  return {
    isActive: !!pollTimeoutRef.current,
    startPolling,
    stopPolling,
  };
};
