import { QueryClient, QueryFunction } from "@tanstack/react-query";
import { auth } from './firebase';

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

async function getAuthToken(): Promise<string | null> {
  // First try to get session token for admin requests
  const sessionToken = localStorage.getItem('sessionToken');
  if (sessionToken) {
    return sessionToken;
  }

  // Fallback to Firebase token for regular requests
  const user = auth.currentUser;
  if (!user) return null;

  try {
    return await user.getIdToken(true);
  } catch (error) {
    console.warn('Failed to get auth token:', error);
    return null;
  }
}

async function apiRequest(url: string, options: RequestInit = {}) {
  const token = await getAuthToken();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...options.headers as Record<string, string>,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  // ✅ Handle timeout errors gracefully
  if (!response.ok && response.status === 0) {
    console.warn('🌐 Network or timeout error detected in queryClient');
    throw new Error('Network error or timeout');
  }

  // ✅ NOVO: Tratamento específico para sessão invalidada (sem ler o response body ainda)
  if (response.status === 401) {
    console.log('🚪 Status 401 detectado. Verificando se é invalidação de sessão...');

    // Para evitar ler o response body duas vezes, vamos primeiro clonar a response
    const responseClone = response.clone();

    try {
      const responseText = await responseClone.text();
      let errorData;

      try {
        errorData = JSON.parse(responseText);
      } catch {
        errorData = { message: responseText };
      }

      // Se a sessão foi invalidada pelo servidor, força logout
      if (errorData.message?.includes('Invalid or expired session') ||
          errorData.message?.includes('session')) {
        console.log('🚪 Sessão invalidada detectada no queryClient. Forçando logout...');

        try {
          await auth.signOut();
          localStorage.removeItem('firebaseToken');
          window.location.href = '/login?reason=session-invalidated';
        } catch (signOutError) {
          console.error('Erro durante logout forçado:', signOutError);
          window.location.href = '/login?reason=session-invalidated';
        }

        throw new Error('Session invalidated');
      }
    } catch (cloneError) {
      console.warn('Erro ao processar clone da resposta 401:', cloneError);
    }
  }

  // Read the response text only once
  const responseText = await response.text();
  console.log('📥 Raw response text:', responseText);

  if (!response.ok) {
    let errorMessage = `HTTP ${response.status}`;

    try {
      const jsonError = JSON.parse(responseText);
      errorMessage = jsonError.message || jsonError.error || errorMessage;
    } catch {
      errorMessage = responseText || errorMessage;
    }

    throw new Error(errorMessage);
  }

  if (!responseText) {
    return {};
  }

  try {
    const parsed = JSON.parse(responseText);
    console.log('✅ Parsed JSON response:', parsed);
    return parsed;
  } catch (error) {
    console.error('❌ Failed to parse JSON response:', responseText);
    console.error('❌ Parse error:', error);
    console.error('❌ Response headers:', Object.fromEntries(response.headers.entries()));
    console.error('❌ Response status:', response.status);
    console.error('❌ Response URL:', response.url);

    // Check if response is JSON
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      console.error('❌ Response is not JSON:', contentType);

      if (responseText.includes('<!DOCTYPE html>')) {
        throw new Error('Servidor retornou uma página HTML ao invés de dados JSON. Verifique se a rota está correta.');
      }

      throw new Error('Resposta do servidor não está no formato JSON esperado');
    }

    throw new Error(`Resposta inválida do servidor: ${responseText.substring(0, 100)}...`);
  }
}

type UnauthorizedBehavior = "returnNull" | "throw";

export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    try {
      return await apiRequest(queryKey[0] as string);
    } catch (error: any) {
      if (unauthorizedBehavior === "returnNull" && error.message.includes('401')) {
        return null;
      }
      throw error;
    }
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // ✅ OTIMIZAÇÃO: Cache mais agressivo e menos refetches
      retry: 1,
      retryDelay: 2000,
      staleTime: 30 * 60 * 1000, // ✅ 30 minutos (era 10min)
      gcTime: 60 * 60 * 1000, // ✅ 1 hora (era 15min)
      refetchOnWindowFocus: false,
      refetchOnMount: false,
      refetchOnReconnect: false,
      refetchInterval: false, // ✅ Desabilitar polling por padrão
      // ✅ Dedupe de requests simultâneas
      networkMode: 'online',
      // ✅ Performance: desabilitar structural sharing para dados grandes
      structuralSharing: (oldData: unknown, newData: unknown) => {
        // Desabilitar para arrays grandes (produtos)
        if (Array.isArray(newData) && newData.length > 100) {
          return newData;
        }
        return newData === oldData ? oldData : newData;
      },
    },
    mutations: {
      retry: 0,
      retryDelay: 3000,
    },
  },
});

// Export para uso global
if (typeof window !== 'undefined') {
  (window as any).queryClient = queryClient;
}

export { apiRequest };