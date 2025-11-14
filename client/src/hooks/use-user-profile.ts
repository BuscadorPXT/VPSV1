import { useQuery } from '@tanstack/react-query';
import { useAuth } from './use-auth';

interface UserProfile {
  id: number;
  firebaseUid: string;
  email: string;
  name?: string;
  company?: string;
  isAdmin: boolean;
  role: string;
  subscriptionPlan: string;
  isApproved: boolean;
  status: string;
  createdAt: string;
  needsApproval: boolean;
}

export function useUserProfile() {
  const { user, isAuthReady } = useAuth();

  const query = useQuery<UserProfile>({
    queryKey: ['/api/user/profile', user?.uid],
    enabled: !!user && !!user.uid && isAuthReady,
    retry: 1,
    // ⚡ PERFORMANCE: Cache agressivo - dados do usuário raramente mudam
    staleTime: 30 * 60 * 1000, // 30 minutos
    gcTime: 60 * 60 * 1000, // 1 hora
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
  });

  return query;
}
