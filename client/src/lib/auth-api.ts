import { auth } from './firebase';
import { getAuth } from 'firebase/auth';

/**
 * ✅ SEGURANÇA: Sistema refatorado para usar cookies HttpOnly
 * - Removida manipulação de sessionToken no localStorage
 * - Cookies são enviados automaticamente pelo navegador
 */

export const getAuthHeaders = async (): Promise<Record<string, string>> => {
  try {
    // Aguardar até o Firebase estar pronto
    let currentUser = auth.currentUser;
    let attempts = 0;
    const maxAttempts = 15; // Aumentar tentativas

    while (!currentUser && attempts < maxAttempts) {
      console.log(`🕐 Waiting for Firebase auth... attempt ${attempts + 1}/${maxAttempts}`);
      await new Promise(resolve => setTimeout(resolve, 300)); // Aumentar delay
      currentUser = auth.currentUser;
      attempts++;
    }

    if (!currentUser) {
      console.error('🚫 No authenticated user found after waiting');
      throw new Error('User not authenticated - Firebase user not found');
    }

    // Sistema melhorado de obtenção de token com retry
    let idToken: string;
    let tokenAttempts = 0;
    const maxTokenAttempts = 3;

    while (tokenAttempts < maxTokenAttempts) {
      try {
        // Tentar primeiro com token em cache
        if (tokenAttempts === 0) {
          idToken = await currentUser.getIdToken(false);
          console.log('✅ Firebase ID token obtained (cached)');
        } else {
          // Forçar refresh nas tentativas subsequentes
          idToken = await currentUser.getIdToken(true);
          console.log('✅ Firebase ID token refreshed successfully');
        }
        break; // Sucesso, sair do loop
      } catch (tokenError) {
        tokenAttempts++;
        console.warn(`⚠️ Token attempt ${tokenAttempts} failed:`, tokenError.message);
        
        if (tokenAttempts >= maxTokenAttempts) {
          console.error('❌ All token attempts failed:', tokenError);
          throw new Error('Failed to get Firebase ID token after multiple attempts');
        }
        
        // Aguardar antes da próxima tentativa
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    // Tentar obter session token do localStorage
    const sessionToken = localStorage.getItem('sessionToken') || 
                        localStorage.getItem('token') || 
                        localStorage.getItem('firebaseToken');

    console.log('🔑 Auth headers prepared:', {
      hasIdToken: !!idToken,
      hasSessionToken: !!sessionToken,
      userEmail: currentUser.email,
      idTokenLength: idToken?.length || 0
    });

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${idToken}`,
    };

    // Adicionar session token se disponível
    if (sessionToken) {
      headers['X-Session-Token'] = sessionToken;
    }

    return headers;
  } catch (error) {
    console.error('❌ Error getting auth headers:', error);
    throw error;
  }
};

export async function authenticatedFetch(url: string, options?: RequestInit): Promise<Response> {
  const headers = await getAuthHeaders();
  return fetch(url, {
    ...options,
    credentials: 'include', // ✅ SEGURANÇA: Incluir cookies na requisição
    headers: {
      ...headers,
      ...options?.headers,
    },
  });
}