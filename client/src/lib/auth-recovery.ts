import { auth } from './firebase';
import { onAuthStateChanged, User } from 'firebase/auth';

// Force Firebase auth recovery for logged-in users
export const forceAuthRecovery = async (): Promise<boolean> => {
  console.log('🔄 [Auth Recovery] Starting Firebase auth recovery...');
  
  return new Promise((resolve) => {
    // Short timeout to check current auth state
    const timeoutId = setTimeout(() => {
      console.log('⏰ [Auth Recovery] Timeout - no auth state detected');
      resolve(false);
    }, 3000);

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      clearTimeout(timeoutId);
      unsubscribe();
      
      if (user) {
        console.log('✅ [Auth Recovery] Firebase user found:', user.email);
        try {
          // Force token refresh
          const token = await user.getIdToken(true);
          localStorage.setItem('firebaseToken', token);
          console.log('✅ [Auth Recovery] Token refreshed and stored');
          resolve(true);
        } catch (error) {
          console.error('❌ [Auth Recovery] Token refresh failed:', error);
          resolve(false);
        }
      } else {
        console.log('🚪 [Auth Recovery] No Firebase user found');
        resolve(false);
      }
    });
  });
};

// Check if user should be logged in based on backend authentication
export const checkBackendAuth = async (): Promise<boolean> => {
  try {
    console.log('🔍 [Backend Auth Check] Checking backend authentication...');
    
    const response = await fetch('/api/user/profile', {
      method: 'GET',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (response.ok) {
      const data = await response.json();
      console.log('✅ [Backend Auth Check] Backend user authenticated:', data.profile?.email);
      return true;
    } else {
      console.log('🚫 [Backend Auth Check] Backend authentication failed:', response.status);
      return false;
    }
  } catch (error) {
    console.error('❌ [Backend Auth Check] Error:', error);
    return false;
  }
};