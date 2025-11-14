
import { useState, useEffect } from 'react';
import { useAuth } from './use-auth';

interface TermsAcceptanceState {
  hasAccepted: boolean;
  acceptanceDate: string | null;
  version: string;
}

const TERMS_VERSION = '2025-01-02';
const STORAGE_KEY = 'buscador_pxt_terms_acceptance';

export function useTermsAcceptance() {
  const { user } = useAuth();
  const [termsState, setTermsState] = useState<TermsAcceptanceState>({
    hasAccepted: false,
    acceptanceDate: null,
    version: TERMS_VERSION
  });
  const [showTermsModal, setShowTermsModal] = useState(false);

  useEffect(() => {
    if (user) {
      console.log(`[Terms] Checking terms acceptance for user: ${user.email || user.uid}`);
      
      // Detectar se é mobile
      const isMobile = window.innerWidth <= 768 || /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      
      if (isMobile) {
        console.log(`[Terms] Mobile device detected - skipping terms modal`);
        setShowTermsModal(false);
        // Marcar como aceito automaticamente no mobile
        setTermsState({
          hasAccepted: true,
          acceptanceDate: new Date().toISOString(),
          version: TERMS_VERSION
        });
        return;
      }
      
      const storedData = localStorage.getItem(STORAGE_KEY);
      console.log(`[Terms] Stored data found:`, !!storedData);
      
      if (storedData) {
        try {
          const parsedData = JSON.parse(storedData);
          const userKey = `user_${user.uid}`;
          console.log(`[Terms] Looking for user key: ${userKey}`);
          console.log(`[Terms] Available keys:`, Object.keys(parsedData));
          
          if (parsedData[userKey]) {
            const userTerms = parsedData[userKey];
            console.log(`[Terms] User terms found:`, userTerms);
            
            // Verificar se a versão dos termos está atualizada
            if (userTerms.version === TERMS_VERSION && userTerms.hasAccepted) {
              console.log(`[Terms] User has accepted current version - hiding modal`);
              setTermsState(userTerms);
              setShowTermsModal(false);
            } else {
              console.log(`[Terms] Version mismatch or not accepted - showing modal`);
              setShowTermsModal(true);
            }
          } else {
            console.log(`[Terms] No terms data for this user - showing modal`);
            setShowTermsModal(true);
          }
        } catch (error) {
          console.error('Erro ao carregar dados dos termos:', error);
          setShowTermsModal(true);
        }
      } else {
        console.log(`[Terms] No stored data found - showing modal`);
        setShowTermsModal(true);
      }
    } else {
      console.log(`[Terms] No user found - hiding modal`);
      setShowTermsModal(false);
    }
  }, [user]);

  const acceptTerms = async () => {
    if (!user) return;

    const acceptanceData: TermsAcceptanceState = {
      hasAccepted: true,
      acceptanceDate: new Date().toISOString(),
      version: TERMS_VERSION
    };

    try {
      // Salvar no localStorage
      const existingData = localStorage.getItem(STORAGE_KEY);
      const allData = existingData ? JSON.parse(existingData) : {};
      const userKey = `user_${user.uid}`;
      
      allData[userKey] = acceptanceData;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(allData));

      // Opcional: Enviar para o servidor
      try {
        await fetch('/api/auth/terms-acceptance', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userId: user.uid,
            acceptanceDate: acceptanceData.acceptanceDate,
            version: TERMS_VERSION
          })
        });
      } catch (serverError) {
        console.warn('Erro ao salvar aceitação no servidor:', serverError);
        // Continuamos mesmo se o servidor falhar
      }

      setTermsState(acceptanceData);
      setShowTermsModal(false);
    } catch (error) {
      console.error('Erro ao aceitar termos:', error);
    }
  };

  const declineTerms = () => {
    // Redirecionar para fora da plataforma ou mostrar mensagem
    window.location.href = 'https://google.com';
  };

  const checkTermsAcceptance = () => {
    return termsState.hasAccepted && termsState.version === TERMS_VERSION;
  };

  const clearTermsAcceptance = () => {
    if (!user) return;
    
    const storedData = localStorage.getItem(STORAGE_KEY);
    if (storedData) {
      try {
        const parsedData = JSON.parse(storedData);
        const userKey = `user_${user.uid}`;
        delete parsedData[userKey];
        localStorage.setItem(STORAGE_KEY, JSON.stringify(parsedData));
        console.log(`[Terms] Cleared terms acceptance for user: ${user.email || user.uid}`);
        setShowTermsModal(true);
      } catch (error) {
        console.error('Erro ao limpar dados dos termos:', error);
      }
    }
  };

  return {
    hasAcceptedTerms: checkTermsAcceptance(),
    showTermsModal,
    acceptanceDate: termsState.acceptanceDate,
    termsVersion: termsState.version,
    acceptTerms,
    declineTerms,
    clearTermsAcceptance,
    currentVersion: TERMS_VERSION
  };
}
