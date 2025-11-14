
export const authDebug = {
  logAuthState: (user: any, loading: boolean, isAuthReady: boolean) => {
    console.log('🔍 [Auth Debug] Current state:', {
      hasUser: !!user,
      userEmail: user?.email,
      isApproved: user?.isApproved,
      role: user?.role,
      loading,
      isAuthReady,
      timestamp: new Date().toISOString()
    });
  },

  checkAuthFlow: () => {
    const hasFirebaseToken = !!localStorage.getItem('firebaseToken');
    const hasSessionCookie = document.cookie.includes('sessionToken');
    
    console.log('🔍 [Auth Debug] Auth tokens:', {
      hasFirebaseToken,
      hasSessionCookie,
      currentPath: window.location.pathname
    });
    
    return { hasFirebaseToken, hasSessionCookie };
  }
};
