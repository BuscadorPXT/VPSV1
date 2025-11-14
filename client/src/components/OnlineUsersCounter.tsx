
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Badge } from '@/components/ui/badge';
import { Users, Wifi } from 'lucide-react';

interface OnlineUsersData {
  totalOnline: number;
  timestamp: string;
}

export const OnlineUsersCounter: React.FC = () => {
  const { data: onlineData, isLoading } = useQuery<OnlineUsersData>({
    queryKey: ['/api/admin/users/online'],
    // ⚡ PERFORMANCE: Aumentado de 3min para 5min
    refetchInterval: 5 * 60 * 1000, // 5 minutos (era 3min)
    staleTime: 4 * 60 * 1000, // 4 minutos
    select: (data) => ({
      totalOnline: data?.totalOnline || 0,
      timestamp: data?.timestamp || new Date().toISOString()
    })
  });

  if (isLoading) {
    return (
      <Badge variant="outline" className="flex items-center gap-2">
        <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse" />
        <span>Carregando...</span>
      </Badge>
    );
  }

  const totalOnline = onlineData?.totalOnline || 0;

  return (
    <Badge 
      variant={totalOnline > 0 ? "default" : "outline"} 
      className={`flex items-center gap-2 ${totalOnline > 0 ? 'bg-green-600 hover:bg-green-700' : ''}`}
    >
      <div className={`w-2 h-2 rounded-full ${totalOnline > 0 ? 'bg-white animate-pulse' : 'bg-gray-400'}`} />
      <Users className="h-3 w-3" />
      <span>{totalOnline} Online</span>
    </Badge>
  );
};

export default OnlineUsersCounter;
