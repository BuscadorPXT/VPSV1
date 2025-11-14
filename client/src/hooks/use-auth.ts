import { useState, useEffect, useRef, useCallback } from 'react';
import { onAuthStateChanged, User as FirebaseUser,signOut } from 'firebase/auth';
import { useLocation } from 'wouter';
import { auth } from '@/lib/firebase';
import { authApi } from '@/lib/api'; // Assumindo que authApi tenha getProfile

interface AuthUser {
  uid: string;
  email: string;
  name?: string;
  company?: string;
  id?: number;
  sessionToken?: string;
  isAdmin?: boolean;
  role?: string;
  subscriptionPlan?: string;
  isApproved?: boolean;
  needsApproval?: boolean;
  createdAt?: string;
  rejectedAt?: string;
  rejectionReason?: string;
  status?: string;
  isPendingPayment?: boolean;
  needsPayment?: boolean;
}

interface UserState extends AuthUser {
  firebaseToken?: string; // Adicionado para armazenar o token Firebase
}

export function useAuth() {
  // ✅ OTIMIZAÇÃO: Inicialização única com flag de controle
  const initializationRef = useRef(false);

  const [authInitialized, setAuthInitialized] = useState(false);
  const [user, setUser] = useState<UserState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [isPollingDisabled, setIsPollingDisabled] = useState(true); // Desabilitar polling por padrão
  const [, setLocation] = useLocation();

  const isMounted = useRef(true);
  const isProcessing = useRef(false);
  const unsubscribeRef = useRef<(() => void) | null>(null);

  // ✅ PERFORMANCE: Aumentar intervalo de polling drasticamente
  const PROFILE_POLL_INTERVAL = 300000; // 5 minutos para reduzir carga

  // ✅ OTIMIZAÇÃO: Inicialização única e eficiente
  useEffect(() => {
    if (initializationRef.current) {
      return;
    }
    initializationRef.current = true;

    const initAuth = async () => {

      try {
        console.log('🔄 Starting auth initialization...');

        // Wait for Firebase auth state to be ready
        console.log('⏳ Waiting for Firebase auth state to be ready...');
        await auth.authStateReady();
        console.log('✅ Firebase auth state is ready');

        let initializationComplete = false; // Variável local para controlar a conclusão

        unsubscribeRef.current = onAuthStateChanged(auth, async (firebaseUser) => {
          if (isProcessing.current || !isMounted.current) return;

          isProcessing.current = true;
          setError(null);

          try {
            // ✅ SAFARI FIX: Verificar se localStorage está disponível (definir no início)
            const isLocalStorageAvailable = (() => {
              try {
                const test = '__localStorage_test__';
                localStorage.setItem(test, test);
                localStorage.removeItem(test);
                return true;
              } catch (e) {
                return false;
              }
            })();
            
            if (!firebaseUser) {
              setUser(null);
              // ✅ SAFARI FIX: Verificar localStorage antes de tentar remover
              if (isLocalStorageAvailable) {
                localStorage.removeItem('firebaseToken');
              }
              setIsAuthReady(true);
              setLoading(false);
            } else {
              // ✅ PERFORMANCE: Cache token e reutilizar se válido
              const cachedToken = isLocalStorageAvailable ? localStorage.getItem('firebaseToken') : null;
              let freshToken = cachedToken;

              if (!cachedToken) {
                try {
                  freshToken = await firebaseUser.getIdToken(false); // Não forçar refresh
                  if (isLocalStorageAvailable) {
                    localStorage.setItem('firebaseToken', freshToken);
                  } else {
                    console.warn('⚠️ [Safari] localStorage not available, token will not be cached');
                  }
                } catch (error) {
                  console.error('❌ Failed to get Firebase token:', error);
                  setUser({
                    uid: firebaseUser.uid,
                    email: firebaseUser.email || '',
                    isApproved: false,
                    needsApproval: true,
                    role: 'user',
                  });
                  setIsAuthReady(true);
                  setLoading(false);
                  return;
                }
              }

              // Fetch user profile from backend
              try {
                if (!freshToken) {
                  throw new Error('No Firebase token available');
                }

                const response = await fetch('/api/user/profile', {
                  headers: {
                    'Authorization': `Bearer ${freshToken}`,
                    'Content-Type': 'application/json',
                  },
                  credentials: 'include',
                });

                if (response.ok) {
                  const data = await response.json();
                  const profile = data.profile || data;

                  // Check if mobile device
                  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

                  // Return user data with profile merged
                  const userData = {
                    ...user,
                    ...profile.profile,
                    // Ensure critical flags are set correctly
                    isApproved: profile.profile?.isApproved === true ||
                               profile.profile?.role === 'admin' ||
                               profile.profile?.role === 'superadmin' ||
                               profile.profile?.isAdmin === true,
                    needsApproval: profile.profile?.needsApproval === true,
                    isMobile: isMobile
                  };

                  console.log('🔍 [useAuth] User data processed:', {
                    email: userData.email,
                    isApproved: userData.isApproved,
                    role: userData.role,
                    status: userData.status,
                    isMobile: isMobile
                  });

                  setUser({
                    uid: firebaseUser.uid,
                    email: firebaseUser.email || '',
                    name: profile.name,
                    company: profile.company,
                    id: profile.id,
                    isAdmin: profile.isAdmin || false,
                    role: profile.role || 'user',
                    subscriptionPlan: profile.subscriptionPlan || 'free',
                    isApproved: profile.isApproved === true,
                    needsApproval: profile.isApproved !== true,
                    status: profile.status,
                    firebaseToken: freshToken,
                  });

                  console.log('✅ User profile loaded:', profile.email);
                } else {
                  // ✅ CRITICAL FIX: Retry on 401 instead of immediately setting as unapproved
                  if (response.status === 401) {
                    console.warn('⚠️ 401 Unauthorized - token may not be ready yet, retrying in 500ms...');
                    
                    // Wait a bit for token to propagate
                    await new Promise(resolve => setTimeout(resolve, 500));
                    
                    // Get fresh token and retry
                    const retryToken = await firebaseUser.getIdToken(true);
                    const retryResponse = await fetch('/api/user/profile', {
                      headers: {
                        'Authorization': `Bearer ${retryToken}`,
                        'Content-Type': 'application/json',
                      },
                      credentials: 'include',
                    });
                    
                    if (retryResponse.ok) {
                      const retryData = await retryResponse.json();
                      const retryProfile = retryData.profile || retryData;
                      
                      setUser({
                        uid: firebaseUser.uid,
                        email: firebaseUser.email || '',
                        name: retryProfile.name,
                        company: retryProfile.company,
                        id: retryProfile.id,
                        isAdmin: retryProfile.isAdmin || false,
                        role: retryProfile.role || 'user',
                        subscriptionPlan: retryProfile.subscriptionPlan || 'free',
                        isApproved: retryProfile.isApproved === true,
                        needsApproval: retryProfile.isApproved !== true,
                        status: retryProfile.status,
                        firebaseToken: retryToken,
                      });
                      console.log('✅ User profile loaded on retry:', retryProfile.email);
                    } else {
                      console.error('❌ Profile fetch failed even after retry - status:', retryResponse.status);
                      // Keep in loading state instead of setting as unapproved
                      return;
                    }
                  } else {
                    console.error('❌ Failed to load user profile - status:', response.status);
                    // Keep in loading state instead of setting as unapproved
                    return;
                  }
                }
              } catch (profileError) {
                console.error('Error fetching profile:', profileError);
                // ✅ CRITICAL FIX: Don't set user as unapproved on error
                // This prevents false redirects to pending-approval page
                // Keep in loading state instead
                return;
              }
            }
          } catch (error: any) {
            console.error('Auth state change error:', error);
            setError(error.message);
            setUser(null);
          } finally {
            isProcessing.current = false;
            setLoading(false);
            setIsAuthReady(true);
          }
        });

        console.log('✅ Auth initialization completed');

      } catch (error: any) {
        console.error('Auth initialization error:', error);
        setError('Failed to initialize authentication');
        setLoading(false);
        setIsAuthReady(true);
      }
    };

    initAuth();

    return () => {
      isMounted.current = false;
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
    };
  }, []);

  

  // ✅ Login function - SIMPLIFICADO
  const login = useCallback(async (email: string, password: string) => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
        credentials: 'include',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Login failed');
      }

      // Após login bem-sucedido, é crucial tentar obter o token Firebase imediatamente
      const currentUser = auth.currentUser;
      if (currentUser) {
        try {
          const token = await currentUser.getIdToken(true);
          localStorage.setItem('firebaseToken', token);
          console.log('🎫 Firebase token obtained after login.');
          // O listener onAuthStateChanged irá atualizar o estado do usuário
        } catch (error) {
          console.error('❌ Failed to get Firebase token after login:', error);
        }
      }

      return { success: true, data };
    } catch (error: any) {
      console.error('Login error:', error);
      setError(error.message);
      return { success: false, message: error.message };
    } finally {
      setLoading(false);
    }
  }, []);

  // ✅ Logout function - SIMPLIFICADO
  const logout = useCallback(async () => {
    try {
      setLoading(true);

      // Server logout
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      }).catch(console.warn);

      // Firebase logout
      await signOut(auth);

      // Clear local data
      setUser(null);
      localStorage.removeItem('firebaseToken');

    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // ✅ Token getter function
  const getSessionToken = useCallback(async () => {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) return null;

      // Forçar refresh para garantir que o token usado para WebSocket seja válido
      return await currentUser.getIdToken(true);
    } catch (error) {
      console.error('Failed to get token:', error);
      return null;
    }
  }, []);


  // ✅ FUNÇÃO PARA REFRESH DO PERFIL
  const refreshUser = useCallback(async () => {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) return null;

      // Force refresh do token Firebase
      const freshToken = await currentUser.getIdToken(true);
      localStorage.setItem('firebaseToken', freshToken);

      // Buscar perfil atualizado do backend
      const response = await fetch('/api/user/profile', {
        headers: {
          'Authorization': `Bearer ${freshToken}`,
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        const profile = data.profile || data;

        setUser(prev => prev ? {
          ...prev,
          ...profile,
          isApproved: profile.isApproved === true ||
                     profile.role === 'admin' ||
                     profile.role === 'superadmin' ||
                     profile.isAdmin === true,
          firebaseToken: freshToken,
        } : null);

        console.log('🔄 User profile refreshed successfully:', profile.email);
        return profile;
      }
    } catch (error) {
      console.error('❌ Failed to refresh user profile:', error);
      return null;
    }
  }, []);

  // ✅ PERFORMANCE: Polling desabilitado por padrão - apenas manual quando necessário
  useEffect(() => {
    // Polling completamente desabilitado para melhor performance
    // Será ativado apenas em casos específicos ou por demanda do usuário
    return;
  }, []);

  return {
    user,
    loading,
    error,
    login,
    logout,
    refreshUser,
    isAuthReady,
    getSessionToken,
    // Legacy compatibility
    register: login, // Placeholder
    isRefreshing: loading,
    authInitialized: isAuthReady,
    isSessionInitialized: isAuthReady,
  };
}