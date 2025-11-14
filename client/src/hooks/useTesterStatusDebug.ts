
import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { useTesterStatus } from './useTesterStatus';

interface UserProfileDebug {
  id: number;
  email: string;
  role: string;
  subscriptionPlan: string;
  isAdmin: boolean;
  isTester: boolean;
  isActive: boolean;
  daysRemaining: number;
}

export function useTesterStatusDebug() {
  const { testerStatus, loading } = useTesterStatus();

  const { data: userProfile } = useQuery({
    queryKey: ['user-profile-debug'],
    queryFn: async (): Promise<UserProfileDebug> => {
      try {
        const response = await apiClient.get('/api/user/profile');
        const profile = response.data;

        const debugInfo = {
          id: profile.id,
          email: profile.email,
          role: profile.role,
          subscriptionPlan: profile.subscriptionPlan,
          isAdmin: profile.isAdmin || profile.role === 'admin' || profile.role === 'superadmin',
          isTester: profile.role === 'tester' || profile.subscriptionPlan === 'tester',
          isActive: true,
          daysRemaining: 999
        };

        console.log('🔍 USER DEBUG INFO:', {
          email: debugInfo.email,
          role: debugInfo.role,
          plan: debugInfo.subscriptionPlan,
          isAdmin: debugInfo.isAdmin,
          isTester: debugInfo.isTester,
          shouldHaveWhatsAppAccess: !debugInfo.isTester || debugInfo.isAdmin
        });

        return debugInfo;
      } catch (err) {
        console.warn('Failed to fetch user profile for debug:', err);
        return {
          id: 0,
          email: 'unknown',
          role: 'unknown',
          subscriptionPlan: 'unknown',
          isAdmin: false,
          isTester: true,
          isActive: false,
          daysRemaining: 0
        };
      }
    },
    staleTime: 10 * 1000,
    refetchInterval: 15000,
    refetchOnWindowFocus: true,
  });

  useEffect(() => {
    console.log('🔍 TESTER STATUS DEBUG:', {
      isTester: testerStatus.isTester,
      isActive: testerStatus.isActive,
      loading,
      daysRemaining: testerStatus.daysRemaining,
      shouldBlockWhatsApp: testerStatus.isTester,
      timestamp: new Date().toISOString()
    });
  }, [testerStatus, loading]);

  return { 
    testerStatus, 
    loading,
    userProfile 
  };
}
