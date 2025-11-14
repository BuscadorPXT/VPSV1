import React, { useState, useEffect } from 'react';
import { Bell, X, Check, Info, AlertTriangle, CheckCircle, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Separator } from '@/components/ui/separator';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { useUnifiedWebSocket } from '@/hooks/use-unified-websocket';

interface SystemNotification {
  id: number;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'success' | 'error' | 'news' | 'update';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  showAsPopup: boolean;
  showAsBanner: boolean;
  createdAt: string;
  isRead: boolean;
}

interface NotificationsResponse {
  notifications: SystemNotification[];
  unreadCount: number;
  totalCount: number;
}

export default function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch notifications
  const { data: notificationsData, isLoading } = useQuery<NotificationsResponse>({
    queryKey: ['/api/notifications'],
    // ⚡ PERFORMANCE: Aumentado de 30s para 3min - notificações mudam raramente
    refetchInterval: 3 * 60 * 1000, // 3 minutos
    staleTime: 2 * 60 * 1000, // 2 minutos
    refetchOnWindowFocus: false, // Desabilitado para economizar recursos
  });

  // Mark as read mutation
  const markAsReadMutation = useMutation({
    mutationFn: async (notificationId: number) => {
      return apiRequest(`/api/notifications/${notificationId}/read`, {
        method: 'POST',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
    },
  });

  // Mark all as read mutation
  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      return apiRequest('/api/notifications/mark-all-read', {
        method: 'POST',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
      toast({
        title: 'Sucesso',
        description: 'Todas as notificações foram marcadas como lidas',
      });
    },
  });

  // Estado local para notificações de atualização de dados
  const [localNotifications, setLocalNotifications] = useState<SystemNotification[]>([]);

  // Escutar eventos de atualização de dados via WebSocket
  useEffect(() => {
    const handleSheetUpdate = (event: CustomEvent) => {
      const { supplierName, productType, dataReferencia } = event.detail || {};
      const supplier = supplierName || 'Fornecedor';
      const now = new Date().toISOString();
      
      setLocalNotifications(prev => {
        // Verificar se já existe uma notificação recente (últimos 5 minutos) do mesmo fornecedor
        const recentNotificationIndex = prev.findIndex(n => {
          const timeDiff = new Date().getTime() - new Date(n.createdAt).getTime();
          const isSameSupplier = n.message.includes(supplier);
          return isSameSupplier && timeDiff < 5 * 60 * 1000; // 5 minutos
        });

        if (recentNotificationIndex !== -1) {
          // Atualizar notificação existente
          const updated = [...prev];
          const existing = updated[recentNotificationIndex];
          const currentCount = parseInt(existing.message.match(/\((\d+) atualizações\)/)?.[1] || '1');
          const newCount = currentCount + 1;
          
          updated[recentNotificationIndex] = {
            ...existing,
            message: `${supplier} atualizou a lista (${newCount} atualizações)`,
            createdAt: now, // Atualizar timestamp
          };
          
          return updated;
        } else {
          // Criar nova notificação
          const notification: SystemNotification = {
            id: Date.now(),
            title: '📦 Lista Atualizada',
            message: `${supplier} atualizou a lista`,
            type: 'update',
            priority: 'normal',
            showAsPopup: true,
            showAsBanner: false,
            createdAt: now,
            isRead: false
          };

          return [notification, ...prev].slice(0, 20);
        }
      });
      
      // Invalidar cache de stats para atualizar header
      queryClient.invalidateQueries({ queryKey: ['/api/products/stats'] });
      queryClient.refetchQueries({ queryKey: ['/api/products/stats'] });
    };

    window.addEventListener('sheetUpdate', handleSheetUpdate as EventListener);
    return () => window.removeEventListener('sheetUpdate', handleSheetUpdate as EventListener);
  }, [queryClient]);

  // Combinar notificações da API com notificações locais
  const notifications = [...localNotifications, ...(notificationsData?.notifications || [])];
  const unreadCount = (notificationsData?.unreadCount || 0) + localNotifications.filter(n => !n.isRead).length;

  const handleMarkAsRead = (notificationId: number) => {
    // Marcar notificação local como lida
    setLocalNotifications(prev =>
      prev.map(n => n.id === notificationId ? { ...n, isRead: true } : n)
    );
    
    // Marcar notificação da API como lida
    if (notificationsData?.notifications.some(n => n.id === notificationId)) {
      markAsReadMutation.mutate(notificationId);
    }
  };

  const handleMarkAllAsRead = () => {
    markAllAsReadMutation.mutate();
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      case 'news':
        return <Info className="h-4 w-4 text-blue-500" />;
      case 'update':
        return <Info className="h-4 w-4 text-purple-500" />;
      default:
        return <Info className="h-4 w-4 text-gray-500" />;
    }
  };

  const getNotificationColor = (type: string, priority: string) => {
    if (priority === 'urgent') return 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20';
    if (priority === 'high') return 'border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-900/20';

    switch (type) {
      case 'success':
        return 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/20';
      case 'warning':
        return 'border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-900/20';
      case 'error':
        return 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20';
      default:
        return 'border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-900/20';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return 'Agora mesmo';
    if (diffMins < 60) return `${diffMins}m atrás`;
    if (diffHours < 24) return `${diffHours}h atrás`;
    if (diffDays < 7) return `${diffDays}d atrás`;
    return date.toLocaleDateString('pt-BR');
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="relative p-2 hover:bg-gray-100 dark:hover:bg-gray-800"
        >
          <Bell className="h-5 w-5 text-gray-600 dark:text-gray-400" />
          {unreadCount > 0 && (
            <Badge 
              className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center bg-red-500 text-white text-xs animate-pulse"
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>

      <PopoverContent className="w-96 p-0" align="end">
        <Card className="border-0 shadow-lg">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Notificações</CardTitle>
              <div className="flex items-center space-x-2">
                {unreadCount > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleMarkAllAsRead}
                    className="text-xs"
                  >
                    <Check className="h-3 w-3 mr-1" />
                    Marcar todas como lidas
                  </Button>
                )}
                <Badge variant="secondary">
                  {unreadCount} não lidas
                </Badge>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-0">
            {!notifications || notifications.length === 0 ? (
              <div className="p-6 text-center">
                <Bell className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                <h3 className="text-lg font-medium text-gray-600 dark:text-gray-400 mb-2">
                  Nenhuma notificação
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-500">
                  Você está em dia! Novas notificações aparecerão aqui.
                </p>
              </div>
            ) : (
              <ScrollArea className="h-96">
                <div className="p-3 space-y-3">
                  {notifications && notifications.map((notification, index) => (
                    <div key={notification.id}>
                      <div 
                        className={`p-3 rounded-lg border transition-all hover:shadow-sm cursor-pointer ${getNotificationColor(notification.type, notification.priority)} ${
                          !notification.isRead ? 'ring-2 ring-blue-200 dark:ring-blue-800' : ''
                        }`}
                        onClick={() => !notification.isRead && handleMarkAsRead(notification.id)}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-start space-x-3 flex-1 min-w-0">
                            <div className="flex-shrink-0 mt-1">
                              {getNotificationIcon(notification.type)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center space-x-2 mb-1">
                                <h4 className="font-medium text-gray-900 dark:text-gray-100 truncate">
                                  {notification.title}
                                </h4>
                                {!notification.isRead && (
                                  <Badge variant="destructive" className="text-xs">
                                    Nova
                                  </Badge>
                                )}
                                {notification.priority === 'urgent' && (
                                  <Badge variant="destructive" className="text-xs">
                                    Urgente
                                  </Badge>
                                )}
                                {notification.priority === 'high' && (
                                  <Badge variant="secondary" className="text-xs bg-orange-100 text-orange-800">
                                    Alta
                                  </Badge>
                                )}
                              </div>
                              <p className="text-gray-700 dark:text-gray-300 text-sm mb-2">
                                {notification.message}
                              </p>
                              <div className="flex items-center justify-between">
                                <span className="text-xs text-gray-500 dark:text-gray-400">
                                  {formatDate(notification.createdAt)}
                                </span>
                                <Badge 
                                  variant="outline" 
                                  className={`text-xs ${
                                    notification.type === 'success' ? 'border-green-300 text-green-700' :
                                    notification.type === 'warning' ? 'border-yellow-300 text-yellow-700' :
                                    notification.type === 'error' ? 'border-red-300 text-red-700' :
                                    notification.type === 'news' ? 'border-blue-300 text-blue-700' :
                                    'border-purple-300 text-purple-700'
                                  }`}
                                >
                                  {notification.type === 'news' ? 'Notícia' :
                                   notification.type === 'update' ? 'Atualização' :
                                   notification.type === 'success' ? 'Sucesso' :
                                   notification.type === 'warning' ? 'Aviso' :
                                   notification.type === 'error' ? 'Erro' : 'Info'}
                                </Badge>
                              </div>
                            </div>
                          </div>

                          {!notification.isRead && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleMarkAsRead(notification.id);
                              }}
                              className="flex-shrink-0 ml-2"
                            >
                              <Check className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                      {index < notifications.length - 1 && <Separator className="my-2" />}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </PopoverContent>
    </Popover>
  );
}