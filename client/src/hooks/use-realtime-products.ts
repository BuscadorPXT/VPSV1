import { useState, useEffect, useCallback, useRef } from 'react';
import { useUnifiedWebSocket } from './use-unified-websocket';
import { useToast } from './use-toast';

export interface RealtimeProduct {
  id: number;
  model: string;
  storage: string;
  color: string;
  price: number;
  supplier: string;
  lastUpdated: string;
}

interface RealtimeUpdate {
  type: 'CACHE_REFRESHED' | 'SHEETS_UPDATED' | 'DATA_REFRESH' | 'NEW_LOW_PRICE' | 'PRICE_UPDATE';
  data: any;
  timestamp: string;
}

export function useRealtimeProducts() {
  const [products, setProducts] = useState<RealtimeProduct[]>([]);
  const [lastUpdateTime, setLastUpdateTime] = useState<string | null>(null);
  const [updateCount, setUpdateCount] = useState(0);
  const { toast } = useToast();
  const onRefreshCallbackRef = useRef<(() => void) | null>(null);

  // Handler for real-time messages
  const handleRealtimeMessage = useCallback((message: any) => {
    console.log('🔔 Real-time update received:', message.type, message.data);

    const update: RealtimeUpdate = message;

    switch (update.type) {
      case 'CACHE_REFRESHED':
      case 'SHEETS_UPDATED':
      case 'DATA_REFRESH':
        console.log('📊 Data refresh triggered by WebSocket');
        setLastUpdateTime(update.timestamp);
        setUpdateCount(prev => prev + 1);

        // Show toast notification
        toast({
          title: "Dados Atualizados",
          description: `Planilha ${update.data?.sheetName || 'Google Sheets'} foi atualizada em tempo real!`,
          duration: 3000,
        });

        // Trigger page refresh callback if available
        if (onRefreshCallbackRef.current) {
          console.log('🔄 Triggering refresh callback');
          onRefreshCallbackRef.current();
        } else {
          // Fallback: trigger a custom event that components can listen to
          console.log('🔄 Dispatching refresh event');
          window.dispatchEvent(new CustomEvent('realtimeDataUpdate', {
            detail: {
              type: update.type,
              timestamp: update.timestamp,
              sheetName: update.data?.sheetName,
              productCount: update.data?.productCount
            }
          }));
        }
        break;

      case 'NEW_LOW_PRICE':
        console.log('💰 New low price detected:', update.data);
        toast({
          title: "Novo Menor Preço!",
          description: `${update.data?.model} ${update.data?.storage} ${update.data?.color} por R$${update.data?.price?.toFixed(2)} na ${update.data?.supplier}`,
          duration: 5000,
        });
        break;

      case 'PRICE_UPDATE':
        console.log('📈 Price update:', update.data);
        setLastUpdateTime(update.timestamp);
        setUpdateCount(prev => prev + 1);
        break;

      default:
        console.log('📨 Unknown real-time message type:', update.type);
    }
  }, [toast]);

  // WebSocket connection
  const { isConnected, connectionState } = useUnifiedWebSocket({
    onMessage: handleRealtimeMessage,
    onConnect: () => {
      console.log('🔌 Real-time products WebSocket connected');
      toast({
        title: "Conectado",
        description: "Atualizações em tempo real ativadas!",
        duration: 2000,
      });
    },
    onDisconnect: () => {
      console.log('🔌 Real-time products WebSocket disconnected');
    },
    reconnectInterval: 5000,
    maxReconnectAttempts: 20
  });

  // Method to register refresh callback
  const registerRefreshCallback = useCallback((callback: () => void) => {
    console.log('📝 Registering refresh callback for real-time updates');
    onRefreshCallbackRef.current = callback;
  }, []);

  // Method to unregister refresh callback
  const unregisterRefreshCallback = useCallback(() => {
    console.log('📝 Unregistering refresh callback');
    onRefreshCallbackRef.current = null;
  }, []);

  // Method to manually trigger refresh
  const triggerRefresh = useCallback(() => {
    console.log('🔄 Manually triggering refresh');
    if (onRefreshCallbackRef.current) {
      onRefreshCallbackRef.current();
    }
    setUpdateCount(prev => prev + 1);
    setLastUpdateTime(new Date().toISOString());
  }, []);

  return {
    products,
    isConnected,
    connectionState,
    lastUpdateTime,
    updateCount,
    registerRefreshCallback,
    unregisterRefreshCallback,
    triggerRefresh
  };
}