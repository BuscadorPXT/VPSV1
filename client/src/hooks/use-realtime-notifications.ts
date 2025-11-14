import { useEffect, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from './use-toast';
import { useUnifiedWebSocket } from './use-unified-websocket';
import { formatPrice } from '@/lib/formatters';

interface RealtimePriceDrop {
  type: 'REALTIME_PRICE_DROP';
  data: {
    productId: string | number;
    model: string;
    storage: string;
    color: string;
    supplier: string;
    oldPrice: number;
    newPrice: number;
    priceDrop: number;
    dropPercentage: number;
    isRealtime: boolean;
    businessHours: boolean;
  };
  timestamp: string;
}

interface NewProductAvailable {
  type: 'NEW_PRODUCT_AVAILABLE';
  data: {
    product: any;
    isRealtime: boolean;
    businessHours: boolean;
  };
  timestamp: string;
}

interface SupplierUpdate {
  type: 'SUPPLIER_UPDATE';
  data: {
    product: any;
    oldSupplier: string;
    newSupplier: string;
    isRealtime: boolean;
    businessHours: boolean;
  };
  timestamp: string;
}

type RealtimeMessage = RealtimePriceDrop | NewProductAvailable | SupplierUpdate;

export const useRealtimeNotifications = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Conectar ao WebSocket
  const { socket, isConnected } = useUnifiedWebSocket((toastData) => {
    if (toastData) {
      toast(toastData);
    }
  });

  const handleRealtimePriceDrop = useCallback((data: RealtimePriceDrop['data']) => {
    console.log('📉 [Realtime] Price drop detected:', data);

    // Invalidar cache para atualizar dados
    queryClient.invalidateQueries({ queryKey: ['/api/products'] });
    queryClient.invalidateQueries({ queryKey: ['/api/sheets'] });

    // Mostrar notificação
    const isBusinessHours = data.businessHours;
    const urgencyIcon = isBusinessHours ? '⚡' : '📉';
    const urgencyText = isBusinessHours ? 'TEMPO REAL' : 'Atualização';

    toast({
      title: `${urgencyIcon} ${urgencyText} - Queda de Preço!`,
      description: `${data.model} ${data.storage} ${data.color} - ${data.supplier}\nDe ${formatPrice(data.oldPrice)} para ${formatPrice(data.newPrice)}\nEconomia: ${formatPrice(data.priceDrop)} (${data.dropPercentage}%)`,
      duration: isBusinessHours ? 8000 : 5000, // Mais tempo durante horário comercial
    });

    // Analytics - track price drop notification
    if (typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('event', 'realtime_price_drop', {
        'product_model': data.model,
        'price_drop_amount': data.priceDrop,
        'drop_percentage': data.dropPercentage,
        'business_hours': data.businessHours,
        'supplier': data.supplier
      });
    }
  }, [toast, queryClient]);

  const handleNewProduct = useCallback((data: NewProductAvailable['data']) => {
    console.log('🆕 [Realtime] New product available:', data);

    // Invalidar cache
    queryClient.invalidateQueries({ queryKey: ['/api/products'] });

    // Notificação apenas durante horário comercial para evitar spam
    if (data.businessHours) {
      toast({
        title: '🆕 Novo Produto Disponível!',
        description: `${data.product.model} ${data.product.storage} ${data.product.color} - ${formatPrice(data.product.price)}`,
        duration: 6000,
      });
    }
  }, [toast, queryClient]);

  const handleSupplierUpdate = useCallback((data: SupplierUpdate['data']) => {
    console.log('🏪 [Realtime] Supplier change:', data);

    // Invalidar cache
    queryClient.invalidateQueries({ queryKey: ['/api/products'] });
    queryClient.invalidateQueries({ queryKey: ['/api/suppliers'] });

    // Notificação apenas durante horário comercial
    if (data.businessHours) {
      toast({
        title: '🏪 Fornecedor Atualizado',
        description: `${data.product.model}: ${data.oldSupplier} → ${data.newSupplier}`,
        duration: 4000,
      });
    }
  }, [toast, queryClient]);

  // Listener para mensagens WebSocket
  useEffect(() => {
    if (!socket || !isConnected) return;

    const handleMessage = (event: MessageEvent) => {
      try {
        const message: RealtimeMessage = JSON.parse(event.data);
        
        console.log('🔔 [Realtime] WebSocket message received:', message.type);

        switch (message.type) {
          case 'REALTIME_PRICE_DROP':
            handleRealtimePriceDrop(message.data);
            break;
          
          case 'NEW_PRODUCT_AVAILABLE':
            handleNewProduct(message.data);
            break;
          
          case 'SUPPLIER_UPDATE':
            handleSupplierUpdate(message.data);
            break;
          
          default:
            console.log('📝 [Realtime] Unknown message type:', message.type);
        }
      } catch (error) {
        console.error('❌ [Realtime] Error parsing WebSocket message:', error);
      }
    };

    socket.addEventListener('message', handleMessage);

    return () => {
      socket.removeEventListener('message', handleMessage);
    };
  }, [socket, isConnected, handleRealtimePriceDrop, handleNewProduct, handleSupplierUpdate]);

  // Listener personalizado para eventos globais (compatibilidade)
  useEffect(() => {
    const handleGlobalRealtimeEvent = (event: CustomEvent) => {
      console.log('🌐 [Realtime] Global event received:', event.detail);
      
      if (event.detail && event.detail.type) {
        switch (event.detail.type) {
          case 'REALTIME_PRICE_DROP':
            handleRealtimePriceDrop(event.detail.data);
            break;
          
          case 'NEW_PRODUCT_AVAILABLE':
            handleNewProduct(event.detail.data);
            break;
          
          case 'SUPPLIER_UPDATE':
            handleSupplierUpdate(event.detail.data);
            break;
        }
      }
    };

    // Listeners para eventos customizados
    window.addEventListener('realtimePriceDrop', handleGlobalRealtimeEvent as EventListener);
    window.addEventListener('newProductAvailable', handleGlobalRealtimeEvent as EventListener);
    window.addEventListener('supplierUpdate', handleGlobalRealtimeEvent as EventListener);

    return () => {
      window.removeEventListener('realtimePriceDrop', handleGlobalRealtimeEvent as EventListener);
      window.removeEventListener('newProductAvailable', handleGlobalRealtimeEvent as EventListener);
      window.removeEventListener('supplierUpdate', handleGlobalRealtimeEvent as EventListener);
    };
  }, [handleRealtimePriceDrop, handleNewProduct, handleSupplierUpdate]);

  return {
    isConnected,
    socket
  };
};