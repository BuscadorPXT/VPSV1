import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { RefreshCw, Clock, Zap, Activity, Wifi, WifiOff } from 'lucide-react';
import { useUnifiedWebSocket } from '@/hooks/use-unified-websocket';
import { useRealtimeNotifications } from '@/hooks/use-realtime-notifications';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface RealtimeSyncStatus {
  isRunning: boolean;
  isBusinessHours: boolean;
  lastSync: string | null;
  syncInterval: number;
  currentPollFrequency: number;
  businessHoursConfig: {
    start: number;
    end: number;
  };
  stats: {
    totalSyncs: number;
    lastSyncDuration: number;
    averageSyncTime: number;
  };
}

interface WebSocketStatus {
  connected: boolean;
  connectionCount: number;
  lastMessage: string | null;
  uptime: number;
}

export default function RealtimeMonitoringPage() {
  const [lastTestMessage, setLastTestMessage] = useState<string | null>(null);
  const [testMessageTime, setTestMessageTime] = useState<Date | null>(null);

  // Use real-time hooks
  const { socket, isConnected } = useUnifiedWebSocket((toastData) => {
    if (toastData?.title?.includes('Teste')) {
      setLastTestMessage(toastData.description || 'Mensagem de teste recebida');
      setTestMessageTime(new Date());
    }
  });

  const { isConnected: notificationsConnected } = useRealtimeNotifications();

  // Queries para status dos serviços
  // Otimizado: removido polling agressivo, usa apenas WebSocket
  const { data: syncStatus, refetch: refetchSyncStatus } = useQuery<RealtimeSyncStatus>({
    queryKey: ['/api/realtime-admin/status'],
    staleTime: 5 * 60 * 1000, // 5 minutos
    refetchInterval: false, // Desabilitado - economia de compute units
  });

  const { data: wsStatus, refetch: refetchWsStatus } = useQuery<WebSocketStatus>({
    queryKey: ['/api/realtime-admin/websocket-status'],
    staleTime: 5 * 60 * 1000, // 5 minutos
    refetchInterval: false, // Desabilitado - economia de compute units
  });

  // Test functions
  const sendTestNotification = async () => {
    try {
      const response = await fetch('/api/realtime-admin/test-notification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'TEST_MESSAGE',
          title: 'Teste de Notificação',
          description: `Mensagem enviada às ${new Date().toLocaleTimeString()}`
        })
      });

      if (response.ok) {
        console.log('✅ Test notification sent successfully');
      }
    } catch (error) {
      console.error('❌ Error sending test notification:', error);
    }
  };

  const forceSync = async () => {
    try {
      const response = await fetch('/api/realtime-admin/force-sync', {
        method: 'POST'
      });

      if (response.ok) {
        console.log('✅ Force sync triggered');
        // Refresh status after 2 seconds
        setTimeout(() => {
          refetchSyncStatus();
        }, 2000);
      }
    } catch (error) {
      console.error('❌ Error forcing sync:', error);
    }
  };

  // Status indicators
  const getSyncStatusBadge = () => {
    if (!syncStatus) return <Badge variant="outline">Carregando...</Badge>;
    
    if (syncStatus.isRunning) {
      return (
        <Badge variant="default" className="bg-green-500">
          <Activity className="w-3 h-3 mr-1" />
          Ativo
        </Badge>
      );
    }
    
    return (
      <Badge variant="destructive">
        <Clock className="w-3 h-3 mr-1" />
        Inativo
      </Badge>
    );
  };

  const getBusinessHoursBadge = () => {
    if (!syncStatus) return <Badge variant="outline">Carregando...</Badge>;
    
    if (syncStatus.isBusinessHours) {
      return (
        <Badge variant="default" className="bg-orange-500">
          <Zap className="w-3 h-3 mr-1" />
          Horário Comercial
        </Badge>
      );
    }
    
    return (
      <Badge variant="secondary">
        <Clock className="w-3 h-3 mr-1" />
        Fora do Horário
      </Badge>
    );
  };

  const getWebSocketBadge = () => {
    if (isConnected && notificationsConnected) {
      return (
        <Badge variant="default" className="bg-green-500">
          <Wifi className="w-3 h-3 mr-1" />
          Conectado
        </Badge>
      );
    }
    
    return (
      <Badge variant="destructive">
        <WifiOff className="w-3 h-3 mr-1" />
        Desconectado
      </Badge>
    );
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Monitoramento em Tempo Real</h1>
          <p className="text-muted-foreground">
            Status dos serviços de sincronização e notificações
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => {
            refetchSyncStatus();
            refetchWsStatus();
          }} variant="outline" size="sm">
            <RefreshCw className="w-4 h-4 mr-2" />
            Atualizar
          </Button>
        </div>
      </div>

      {/* Real-time Sync Status */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div>
            <CardTitle className="text-lg">Serviço de Sincronização</CardTitle>
            <CardDescription>
              Status do RealtimeSyncService para Google Sheets
            </CardDescription>
          </div>
          <div className="flex gap-2">
            {getSyncStatusBadge()}
            {getBusinessHoursBadge()}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <p className="text-sm font-medium">Frequência Atual</p>
              <p className="text-2xl font-bold text-primary">
                {syncStatus?.currentPollFrequency || '--'}s
              </p>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium">Total de Syncs</p>
              <p className="text-2xl font-bold text-blue-600">
                {syncStatus?.stats.totalSyncs || 0}
              </p>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium">Último Sync</p>
              <p className="text-sm text-muted-foreground">
                {syncStatus?.lastSync 
                  ? formatDistanceToNow(new Date(syncStatus.lastSync), { 
                      addSuffix: true, 
                      locale: ptBR 
                    })
                  : 'Nunca'
                }
              </p>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium">Tempo Médio</p>
              <p className="text-xl font-bold text-green-600">
                {syncStatus?.stats.averageSyncTime || '--'}ms
              </p>
            </div>
          </div>
          
          <div className="border-t pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Horário Comercial</p>
                <p className="text-sm text-muted-foreground">
                  {syncStatus?.businessHoursConfig.start}h às {syncStatus?.businessHoursConfig.end}h
                </p>
              </div>
              <Button onClick={forceSync} variant="outline" size="sm">
                <Zap className="w-4 h-4 mr-2" />
                Forçar Sync
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* WebSocket Status */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div>
            <CardTitle className="text-lg">WebSocket</CardTitle>
            <CardDescription>
              Status das conexões e notificações em tempo real
            </CardDescription>
          </div>
          {getWebSocketBadge()}
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <p className="text-sm font-medium">Status da Conexão</p>
              <p className="text-lg font-semibold">
                {isConnected ? (
                  <span className="text-green-600">✓ Conectado</span>
                ) : (
                  <span className="text-red-600">✗ Desconectado</span>
                )}
              </p>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium">Notificações</p>
              <p className="text-lg font-semibold">
                {notificationsConnected ? (
                  <span className="text-green-600">✓ Ativas</span>
                ) : (
                  <span className="text-red-600">✗ Inativas</span>
                )}
              </p>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium">Conexões Ativas</p>
              <p className="text-2xl font-bold text-blue-600">
                {wsStatus?.connectionCount || 0}
              </p>
            </div>
          </div>

          {lastTestMessage && (
            <div className="border-t pt-4">
              <p className="text-sm font-medium mb-2">Última Mensagem de Teste</p>
              <div className="bg-muted p-3 rounded-lg">
                <p className="text-sm">{lastTestMessage}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {testMessageTime?.toLocaleTimeString()}
                </p>
              </div>
            </div>
          )}

          <div className="border-t pt-4">
            <Button onClick={sendTestNotification} variant="outline" size="sm">
              <Zap className="w-4 h-4 mr-2" />
              Enviar Teste
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Instructions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Como Testar</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-2">
            <h4 className="font-medium">1. Teste de Notificações WebSocket</h4>
            <p className="text-sm text-muted-foreground">
              Clique em "Enviar Teste" para enviar uma notificação via WebSocket e verificar se ela aparece em tempo real.
            </p>
          </div>
          <div className="space-y-2">
            <h4 className="font-medium">2. Teste de Sincronização</h4>
            <p className="text-sm text-muted-foreground">
              Clique em "Forçar Sync" para acionar uma sincronização manual com Google Sheets.
            </p>
          </div>
          <div className="space-y-2">
            <h4 className="font-medium">3. Horário Comercial</h4>
            <p className="text-sm text-muted-foreground">
              Durante o horário comercial (8h-16h), a frequência de polling é reduzida para 10 segundos.
              Fora do horário, é de 2 minutos para economia de recursos.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}