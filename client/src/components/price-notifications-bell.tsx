import { useState, useEffect } from 'react';
import { Bell, X, TrendingDown, Clock, DollarSign } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { formatPrice } from '@/lib/formatters';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';

interface PriceDropNotification {
  id: number;
  productId: number;
  model: string;
  storage?: string;
  color?: string;
  supplier: string;
  oldPrice: number;
  newPrice: number;
  dropPercentage: number;
  createdAt: string;
  isRead: boolean;
}

export function PriceNotificationsBell() {
  const [isOpen, setIsOpen] = useState(false);
  const queryClient = useQueryClient();

  // Query for unread count
  const { data: unreadCount = 0 } = useQuery({
    queryKey: ['/api/notifications/unread-count'],
    enabled: true,
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  // Query for recent notifications from database
  const { data: notificationsData, isLoading } = useQuery({
    queryKey: ['/api/notifications/price-drops'],
    enabled: isOpen,
    staleTime: 30000, // 30 seconds
    cacheTime: 60000, // 1 minute
  });

  // Alternative: Direct Firestore fetch (if needed)
  // useEffect(() => {
  //   if (isOpen) {
  //     const fetchNotificationsFromFirestore = async () => {
  //       try {
  //         const db = getFirestore();
  //         const notifs = await getDocs(collection(db, "price_drop_notifications"));
  //         const notifications = notifs.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  //         console.log('Direct Firestore notifications:', notifications);
  //       } catch (error) {
  //         console.error('Error fetching from Firestore:', error);
  //       }
  //     };
  //     fetchNotificationsFromFirestore();
  //   }
  // }, [isOpen]);

  const notifications = notificationsData?.notifications || [];

  // Mutation to mark notification as read
  const markAsReadMutation = useMutation({
    mutationFn: (id: number) => 
      apiRequest(`/api/notifications/price-drops/${id}/read`, {
        method: 'PATCH',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/notifications/unread-count'] });
      queryClient.invalidateQueries({ queryKey: ['/api/notifications/price-drops'] });
    },
  });

  // Listen for WebSocket notifications
  useEffect(() => {
    const handlePriceDropNotifications = (event: CustomEvent) => {
      const { count } = event.detail;
      if (count > 0) {
        // Invalidate queries to refetch latest data
        queryClient.invalidateQueries({ queryKey: ['/api/notifications/unread-count'] });
        queryClient.invalidateQueries({ queryKey: ['/api/notifications/price-drops'] });
      }
    };

    window.addEventListener('priceDropNotifications', handlePriceDropNotifications as EventListener);

    return () => {
      window.removeEventListener('priceDropNotifications', handlePriceDropNotifications as EventListener);
    };
  }, [queryClient]);

  const clearNotifications = () => {
    // This would be implemented with an API call to clear all notifications
    queryClient.invalidateQueries({ queryKey: ['/api/notifications/unread-count'] });
    queryClient.invalidateQueries({ queryKey: ['/api/notifications/price-drops'] });
  };

  const markAsRead = () => {
    // Mark all as read when opening the popover
    if (unreadCount > 0) {
      notifications.forEach((notification: PriceDropNotification) => {
        if (!notification.isRead) {
          markAsReadMutation.mutate(notification.id);
        }
      });
    }
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('pt-BR', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const calculateSavings = (oldPrice: number, newPrice: number) => {
    return oldPrice - newPrice;
  };

  const totalSavings = notifications.reduce((total: number, notification: PriceDropNotification) => 
    total + calculateSavings(notification.oldPrice, notification.newPrice), 0
  );

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="relative p-2 hover:bg-gray-100 dark:hover:bg-gray-800"
          onClick={markAsRead}
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

      <PopoverContent 
        className="w-96 p-0 shadow-xl border-2 border-gray-200 dark:border-gray-700" 
        align="end"
        sideOffset={8}
      >
        <Card className="border-0 shadow-none">
          <CardHeader className="pb-3 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <TrendingDown className="h-5 w-5 text-green-600 dark:text-green-400" />
                <CardTitle className="text-lg text-green-800 dark:text-green-200">
                  Quedas de Preço - Hoje
                </CardTitle>
              </div>
              <div className="flex items-center space-x-2">
                {notifications.length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearNotifications}
                    className="text-gray-500 hover:text-red-600"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>

            {notifications.length > 0 && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-green-700 dark:text-green-300">
                  {notifications.length} produto{notifications.length !== 1 ? 's' : ''} com queda
                </span>
                <span className="text-green-800 dark:text-green-200 font-medium">
                  Economia: {formatPrice(totalSavings)}
                </span>
              </div>
            )}
          </CardHeader>

          <CardContent className="p-0">
            {notifications.length === 0 ? (
              <div className="p-6 text-center">
                <Bell className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                <h3 className="text-lg font-medium text-gray-600 dark:text-gray-400 mb-2">
                  Nenhuma queda hoje
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-500">
                  Quando um preço baixar na planilha, você será notificado aqui.
                </p>
              </div>
            ) : (
              <ScrollArea className="h-96">
                <div className="p-3 space-y-3">
                  {notifications.map((notification: PriceDropNotification, index: number) => (
                    <div key={notification.id}>
                      <div className="bg-gradient-to-r from-green-50/50 to-emerald-50/50 dark:from-green-900/10 dark:to-emerald-900/10 p-3 rounded-lg border border-green-200/50 dark:border-green-700/50 hover:shadow-sm transition-all">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center space-x-2 flex-1 min-w-0">
                            {notification.model.toLowerCase().includes('iphone') ? (
                              <span className="text-lg">📱</span>
                            ) : (
                              <DollarSign className="h-4 w-4 text-green-600 dark:text-green-400 flex-shrink-0" />
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                                {notification.model}
                              </p>
                              {(notification.storage || notification.color) && (
                                <p className="text-xs text-gray-600 dark:text-gray-400">
                                  {[notification.storage, notification.color].filter(Boolean).join(' • ')}
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="text-right flex-shrink-0 ml-2">
                            <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center">
                              <Clock className="h-3 w-3 mr-1" />
                              {formatTime(notification.createdAt)}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center justify-between">
                          <div className="text-xs text-gray-600 dark:text-gray-400">
                            {notification.supplier}
                          </div>
                          <div className="text-right">
                            <div className="text-sm text-gray-500 dark:text-gray-400 line-through">
                              {formatPrice(notification.oldPrice)}
                            </div>
                            <div className="text-lg font-bold text-green-600 dark:text-green-400">
                              {formatPrice(notification.newPrice)}
                            </div>
                          </div>
                        </div>

                        <div className="mt-2 flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                              -{notification.dropPercentage.toFixed(1)}%
                            </Badge>
                            <span className="text-sm font-medium text-green-600 dark:text-green-400">
                              Economia: {formatPrice(calculateSavings(notification.oldPrice, notification.newPrice))}
                            </span>
                          </div>
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