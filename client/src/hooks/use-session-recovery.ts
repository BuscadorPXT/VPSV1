import { useState, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { cacheManager } from '@/utils/cache-manager';

export interface SessionRecoveryOptions {
  autoRecovery?: boolean;
  showNotifications?: boolean;
}

export function useSessionRecovery(options: SessionRecoveryOptions = {}) {
  const [isRecovering, setIsRecovering] = useState(false);
  const { toast } = useToast();
  const { autoRecovery = true, showNotifications = true } = options;

  const forceCleanupSessions = useCallback(async () => {
    try {
      setIsRecovering(true);
      
      const firebaseToken = localStorage.getItem('firebaseToken');
      if (!firebaseToken) {
        throw new Error('Token de autenticação não encontrado');
      }

      const response = await fetch('/api/auth/force-cleanup-sessions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${firebaseToken}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Erro ao limpar sessões');
      }

      // Atualizar token de sessão
      if (data.sessionToken) {
        localStorage.setItem('sessionToken', data.sessionToken);
      }

      // Limpar cache completamente
      cacheManager.clearAll();

      if (showNotifications) {
        toast({
          title: "Sessão Recuperada",
          description: "Problemas de sessão foram resolvidos automaticamente.",
        });
      }

      console.log('🔧 Sessão recuperada com sucesso:', data);

      return data;
    } catch (error) {
      console.error('Erro na recuperação de sessão:', error);
      
      if (showNotifications) {
        toast({
          title: "Erro na Recuperação",
          description: "Não foi possível recuperar a sessão. Tente fazer login novamente.",
          variant: "destructive",
        });
      }
      
      throw error;
    } finally {
      setIsRecovering(false);
    }
  }, [showNotifications, toast]);

  const handleSessionError = useCallback(async (error: any) => {
    // Verificar se é um erro de sessão duplicada
    const isDuplicateSessionError = 
      error?.message?.includes('duplicate key') ||
      error?.message?.includes('sessão duplicada') ||
      error?.message?.includes('session already exists');

    if (isDuplicateSessionError && autoRecovery) {
      console.log('🔧 Detectado erro de sessão duplicada, iniciando recuperação automática...');
      try {
        await forceCleanupSessions();
        return true; // Indica que a recuperação foi bem-sucedida
      } catch (recoveryError) {
        console.error('Falha na recuperação automática:', recoveryError);
        return false;
      }
    }

    return false; // Não foi possível recuperar
  }, [autoRecovery, forceCleanupSessions]);

  const recoverAndReload = useCallback(async () => {
    try {
      await forceCleanupSessions();
      // Aguardar um momento antes de recarregar
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (error) {
      console.error('Erro ao recuperar e recarregar:', error);
    }
  }, [forceCleanupSessions]);

  return {
    isRecovering,
    forceCleanupSessions,
    handleSessionError,
    recoverAndReload
  };
}