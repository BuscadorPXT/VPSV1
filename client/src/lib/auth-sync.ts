import { auth } from './firebase';
import { onAuthStateChanged } from 'firebase/auth';

// Force synchronization between frontend Firebase auth and backend session
export const syncAuthState = async (): Promise<boolean> => {
  console.log('🔄 [Auth Sync] Starting Firebase-Backend auth synchronization...');
  
  try {
    // Check backend session first
    const backendResponse = await fetch('/api/user/profile', {
      method: 'GET',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' }
    });

    if (backendResponse.ok) {
      const backendData = await backendResponse.json();
      console.log('✅ [Auth Sync] Backend session active for:', backendData.profile?.email);
      
      // Check Firebase auth state
      return new Promise((resolve) => {
        const timeoutId = setTimeout(() => {
          console.log('⏰ [Auth Sync] Firebase auth check timeout');
          resolve(false);
        }, 5000);

        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
          clearTimeout(timeoutId);
          unsubscribe();
          
          if (firebaseUser && firebaseUser.email === backendData.profile?.email) {
            console.log('✅ [Auth Sync] Firebase and backend sessions synchronized');
            
            // Ensure token is fresh
            try {
              const token = await firebaseUser.getIdToken(true);
              localStorage.setItem('firebaseToken', token);
              console.log('✅ [Auth Sync] Fresh token stored');
            } catch (tokenError) {
              console.error('❌ [Auth Sync] Token refresh failed:', tokenError);
            }
            
            resolve(true);
          } else if (!firebaseUser) {
            console.log('⚠️ [Auth Sync] Backend session exists but no Firebase user');
            // Force Firebase to re-authenticate
            window.location.reload();
            resolve(false);
          } else {
            console.log('⚠️ [Auth Sync] Email mismatch - Firebase:', firebaseUser.email, 'Backend:', backendData.profile?.email);
            resolve(false);
          }
        });
      });
    } else {
      console.log('🚪 [Auth Sync] No backend session found');
      return false;
    }
  } catch (error) {
    console.error('❌ [Auth Sync] Synchronization failed:', error);
    return false;
  }
};

// Apply auth sync to window for debugging
(window as any).syncAuthState = syncAuthState;