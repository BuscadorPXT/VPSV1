import { useEffect } from 'react';
import { auth } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';

interface AuthRecoveryManagerProps {
  onAuthRecovered: (user: any) => void;
}

export const AuthRecoveryManager = ({ onAuthRecovered }: AuthRecoveryManagerProps) => {
  useEffect(() => {
    console.log('🔄 [Auth Recovery] Initializing auth recovery manager...');
    
    // Check backend session first
    const checkBackendSession = async () => {
      try {
        const response = await fetch('/api/user/profile', {
          method: 'GET',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' }
        });

        if (response.ok) {
          const data = await response.json();
          console.log('✅ [Auth Recovery] Backend session active for:', data.profile?.email);
          
          // Force Firebase to check auth state
          return new Promise<void>((resolve) => {
            const unsubscribe = onAuthStateChanged(auth, (user) => {
              unsubscribe();
              if (user) {
                console.log('✅ [Auth Recovery] Firebase user synchronized:', user.email);
                onAuthRecovered(user);
              } else {
                console.log('⚠️ [Auth Recovery] Backend session exists but Firebase user not found');
                // Force page reload to recover Firebase auth
                setTimeout(() => {
                  console.log('🔄 [Auth Recovery] Forcing page reload to recover auth...');
                  window.location.reload();
                }, 1000);
              }
              resolve();
            });
          });
        } else {
          console.log('🚪 [Auth Recovery] No backend session found');
        }
      } catch (error) {
        console.error('❌ [Auth Recovery] Backend session check failed:', error);
      }
    };

    // Run recovery check after component mounts
    const timer = setTimeout(checkBackendSession, 500);

    return () => clearTimeout(timer);
  }, [onAuthRecovered]);

  return null; // This is a logic-only component
};