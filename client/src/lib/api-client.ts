import { auth } from './firebase';

interface ApiResponse<T = any> {
  data: T;
  status: number;
  headers: Headers;
}

// Placeholder for ApiError class if not defined elsewhere
class ApiError extends Error {
  status: number;
  code: string;

  constructor(message: string, status: number, code: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }
}

/**
 * ✅ Função para obter token Firebase - SEM LOOPS
 */
async function getFreshFirebaseToken(): Promise<string | null> {
  try {
    const user = auth.currentUser;

    if (!user) {
      localStorage.removeItem('firebaseToken');
      return null;
    }

    // Tentar token cached primeiro
    const cachedToken = localStorage.getItem('firebaseToken');
    if (cachedToken) {
      return cachedToken;
    }

    // Se não há cached, buscar novo
    const freshToken = await user.getIdToken(false);
    if (freshToken) {
      localStorage.setItem('firebaseToken', freshToken);
      return freshToken;
    }

    return null;
  } catch (error) {
    console.error('❌ Firebase token error:', error);
    localStorage.removeItem('firebaseToken');
    return null;
  }
}

/**
 * ✅ Cliente API Simplificado
 */
class ApiClient {
  private retryCount = 0;
  private readonly MAX_RETRIES = 3; // Maximum number of retries for 503 errors

  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
    isRetry = false // Flag to indicate if this is a retry attempt
  ): Promise<ApiResponse<T>> {
    const token = await getFreshFirebaseToken();

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...options.headers as Record<string, string>,
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const url = new URL(endpoint, window.location.origin);

    try {
      const response = await fetch(url.toString(), {
        ...options,
        headers,
        credentials: 'include',
      });

      // Handle 401 - Redirect to login
      if (response.status === 401) {
        console.log('🚪 401 detected - redirecting to login');
        localStorage.removeItem('firebaseToken');

        // Avoid infinite redirects
        if (!window.location.pathname.includes('/login')) {
          window.location.href = '/login?reason=session-expired';
        }
        throw new ApiError('Authentication required', 401, 'AUTHENTICATION_REQUIRED');
      }

      // Handle 402 - Payment required
      if (response.status === 402) {
        if (!window.location.pathname.includes('/pending-payment')) {
          window.location.href = '/pending-payment';
        }
        throw new ApiError('Payment required', 402, 'PAYMENT_REQUIRED');
      }

      // Handle 503 Service Unavailable (database connection issues) with retries
      if (response.status === 503) {
        if (!isRetry && this.retryCount < this.MAX_RETRIES) {
          this.retryCount++;
          console.log(`🔄 Service temporarily unavailable (Attempt ${this.retryCount}/${this.MAX_RETRIES}), retrying...`);
          await new Promise(resolve => setTimeout(resolve, 1000 * this.retryCount)); // Exponential backoff
          return this.request<T>(endpoint, options, true); // Retry the request
        } else {
          // Max retries reached or already a retry, throw the error
          const errorData = await response.json().catch(() => ({ message: 'Serviço temporariamente indisponível' }));
          console.error('❌ Max retries reached or service still unavailable:', errorData.message);
          throw new ApiError(
            errorData.message || 'Serviço temporariamente indisponível',
            503,
            'SERVICE_UNAVAILABLE'
          );
        }
      }

      // Handle 500 Internal Server Error
      if (response.status === 500) {
        const errorData = await response.json().catch(() => ({ message: 'Internal server error' }));
        console.error('❌ Internal server error:', errorData.message);
        throw new ApiError(
          errorData.message || 'Erro interno do servidor',
          500,
          'INTERNAL_SERVER_ERROR'
        );
      }

      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = `HTTP ${response.status}`;

        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.message || errorMessage;
        } catch {
          // Use raw text if not JSON
          errorMessage = errorText || errorMessage;
        }

        throw new ApiError(errorMessage, response.status, 'API_ERROR');
      }

      const data = await response.json();
      this.retryCount = 0; // Reset retry count on successful request
      return { data, status: response.status, headers: response.headers };
    } catch (error) {
      // If the error is not an ApiError and it's a network error or similar,
      // and we have retries left for 503, attempt retry.
      if (error instanceof TypeError && !isRetry && this.retryCount < this.MAX_RETRIES) {
        this.retryCount++;
        console.log(`🔄 Network error (Attempt ${this.retryCount}/${this.MAX_RETRIES}), retrying...`);
        await new Promise(resolve => setTimeout(resolve, 1000 * this.retryCount));
        return this.request<T>(endpoint, options, true);
      }

      // If it's an ApiError with status 503 and we've exhausted retries, re-throw.
      // Or if it's any other error, re-throw.
      if (error instanceof ApiError && error.status === 503 && this.retryCount >= this.MAX_RETRIES) {
        throw error; // Re-throw the 503 error after retries
      } else if (error instanceof ApiError) {
        throw error; // Re-throw other ApiErrors
      } else {
        // Wrap other errors in ApiError for consistency
        throw new ApiError(error.message || 'An unexpected error occurred', 500, 'UNEXPECTED_ERROR');
      }
    }
  }

  async get<T>(endpoint: string, params?: Record<string, any>): Promise<T> {
    const url = new URL(endpoint, window.location.origin);

    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          url.searchParams.append(key, String(value));
        }
      });
    }

    const response = await this.request<T>(url.pathname + url.search);
    return response.data;
  }

  async post<T>(endpoint: string, data?: any): Promise<T> {
    const response = await this.request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
    return response.data;
  }

  async put<T>(endpoint: string, data?: any): Promise<T> {
    const response = await this.request<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
    return response.data;
  }

  async delete<T>(endpoint: string): Promise<T> {
    const response = await this.request<T>(endpoint, {
      method: 'DELETE',
    });
    return response.data;
  }
}

const apiClient = new ApiClient();

export { apiClient };
export default apiClient;

// Legacy compatibility
export const apiRequest = async (endpoint: string, options: RequestInit = {}) => {
  const method = options.method || 'GET';

  switch (method.toUpperCase()) {
    case 'GET':
      return await apiClient.get(endpoint);
    case 'POST':
      return await apiClient.post(endpoint, options.body ? JSON.parse(options.body as string) : undefined);
    case 'PUT':
      return await apiClient.put(endpoint, options.body ? JSON.parse(options.body as string) : undefined);
    case 'DELETE':
      return await apiClient.delete(endpoint);
    default:
      throw new Error(`Unsupported method: ${method}`);
  }
};

// ✅ CENTRAL API ERROR HANDLER - with improved token refresh and retry logic
const handleApiError = async (error: any, requestConfig?: any): Promise<any> => {
  console.log('🚪 Status', error.status, 'detectado. Verificando se é invalidação de sessão...');

  // ✅ CRITICAL: Check for session invalidation response
  if (error.status === 401) {
    try {
      const responseText = await error.text();
      console.log('📥 Raw response text:', responseText);

      let errorData: any = {};
      try {
        errorData = JSON.parse(responseText);
      } catch (parseError) {
        console.warn('⚠️ Could not parse error response as JSON');
      }

      // ✅ Check for specific session invalidation codes
      if (errorData.code === 'SESSION_TERMINATED' ||
          errorData.code === 'SESSION_INVALIDATED' ||
          errorData.code === 'NEW_LOGIN_DETECTED' ||
          errorData.message?.includes('session') ||
          errorData.message?.includes('logout')) {

        console.log('🚨 Session invalidation detected - processing logout');

        // Emit session termination event with details
        window.dispatchEvent(new CustomEvent('sessionTerminated', {
          detail: {
            reason: errorData.reason || 'session_invalidated',
            message: errorData.message || 'Sua sessão foi encerrada.',
            title: errorData.title || 'Sessão Encerrada'
          }
        }));

        return Promise.reject(new AuthError('Session terminated'));
      }

      // ✅ Handle token refresh for Firebase token errors
      if (errorData.code === 'FIREBASE_TOKEN_REQUIRED' ||
          errorData.code === 'INVALID_TOKEN' ||
          errorData.message?.includes('Firebase token required')) {

        console.log('🔄 Firebase token refresh needed - attempting...');

        try {
          const { auth } = await import('./firebase');
          if (auth.currentUser) {
            // Force a fresh token
            const freshToken = await auth.currentUser.getIdToken(true);
            localStorage.setItem('firebaseToken', freshToken);
            console.log('✅ Firebase token refreshed successfully');

            // Retry the original request if config is available
            if (requestConfig && !requestConfig._retried) {
              console.log('🔄 Retrying original request with fresh Firebase token...');
              const retryHeaders = {
                ...requestConfig.headers,
                'X-Firebase-Token': freshToken
              };

              // Mark as retried to prevent infinite loops
              return fetch(requestConfig.url, {
                ...requestConfig,
                headers: retryHeaders,
                _retried: true
              });
            }

            return Promise.resolve(null);
          } else {
            console.error('❌ No Firebase user available for token refresh');
            // Redirect to login if no user
            window.location.href = '/';
            return Promise.reject(new AuthError('No user available'));
          }
        } catch (refreshError) {
          console.error('❌ Firebase token refresh failed:', refreshError);
          // If refresh fails, redirect to login
          window.location.href = '/';
          return Promise.reject(new AuthError('Token refresh failed'));
        }
      }
    } catch (textError) {
      console.error('❌ Error reading response text:', textError);
    }
  }

  throw error;
};

// Placeholder for AuthError class if not defined elsewhere
class AuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AuthError';
  }
}