import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Bell, Check, AlertCircle, TrendingDown, Clock, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import watermarkPattern from "@/assets/watermark-pattern.png";
import watermarkPatternDark from "@/assets/watermark-pattern-dark.png";
import { useTheme } from "@/components/theme-provider";
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { formatPrice } from '@/lib/formatters';
import { useLocation } from "wouter";

interface Notification {
  id: number;
  alertId?: number;
  type: string;
  title: string;
  message: string;
  data?: string;
  channel: string;
  status: string;
  readAt?: string;
  createdAt: string;
}

interface PriceAlert {
  id: number;
  model: string;
  thresholdPrice: string;
  brand?: string;
  capacity?: string;
  color?: string;
  region?: string;
  isActive: boolean;
  emailNotification: boolean;
  webPushNotification: boolean;
  triggerCount: number;
  maxTriggers: number;
  lastTriggeredAt?: string;
  createdAt: string;
}

export default function NotificationsPage() {
  const { toast } = useToast();
  const { theme } = useTheme();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();

  // Fetch notifications
  const { data: notificationsData, isLoading: notificationsLoading } = useQuery({
    queryKey: ['/api/notifications'],
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Fetch active alerts
  const { data: activeAlerts, isLoading: alertsLoading } = useQuery<PriceAlert[]>({
    queryKey: ['/api/alerts/active'],
  });

  // Mark notification as read mutation
  const markAsReadMutation = useMutation({
    mutationFn: async (notificationId: number) => {
      return apiRequest(`/api/notifications/${notificationId}/read`, {
        method: 'PATCH',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
    },
  });

  const [selectedFilter, setSelectedFilter] = useState<string>('all');

  const notifications: Notification[] = notificationsData?.notifications || [];
  const unreadCount = notificationsData?.unreadCount || 0;

  const filteredNotifications = notifications.filter(notification => {
    if (selectedFilter === 'all') return true;
    if (selectedFilter === 'unread') return notification.status !== 'read';
    if (selectedFilter === 'price_alerts') return notification.type === 'price_alert';
    return true;
  });

  const handleMarkAsRead = (notificationId: number) => {
    markAsReadMutation.mutate(notificationId);
  };

;

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

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'price_alert':
        return <TrendingDown className="h-4 w-4 text-green-500" />;
      case 'sync_complete':
        return <Check className="h-4 w-4 text-blue-500" />;
      default:
        return <AlertCircle className="h-4 w-4 text-gray-500" />;
    }
  };

  if (notificationsLoading || alertsLoading) {
    return (
      <div className="min-h-screen bg-[#24223A] text-white">
        <div className="container mx-auto px-4 py-8">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-700 rounded w-1/3"></div>
            <div className="h-32 bg-gray-700 rounded"></div>
            <div className="h-32 bg-gray-700 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#24223A] text-white relative">
      {/* Full coverage watermark pattern */}
      <div className="watermark-pattern-main" />

      {/* Content Layer */}
      <div className="dashboard-container watermark-pattern-main relative z-10 container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-3">
            <Bell className="h-8 w-8 text-[#7B61FF]" />
            <div>
              <h1 className="text-3xl font-bold">Central de Notificações</h1>
              <p className="text-gray-400">
                Gerencie seus alertas de preço e notificações
              </p>
            </div>
          </div>
          {unreadCount > 0 && (
            <Badge variant="destructive" className="text-lg px-3 py-1">
              {unreadCount} não lidas
            </Badge>
          )}
        </div>

        <Tabs defaultValue="notifications" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 bg-gray-800">
            <TabsTrigger value="notifications" className="data-[state=active]:bg-[#7B61FF]">
              Notificações
            </TabsTrigger>
            <TabsTrigger value="alerts" className="data-[state=active]:bg-[#7B61FF]">
              Alertas Ativos
            </TabsTrigger>
          </TabsList>

          <TabsContent value="notifications" className="space-y-4">
            {/* Notification Filters */}
            <div className="flex space-x-2 mb-4">
              <Button
                variant={selectedFilter === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedFilter('all')}
                className={selectedFilter === 'all' ? 'bg-[#7B61FF]' : ''}
              >
                Todas
              </Button>
              <Button
                variant={selectedFilter === 'unread' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedFilter('unread')}
                className={selectedFilter === 'unread' ? 'bg-[#7B61FF]' : ''}
              >
                Não Lidas
              </Button>
              <Button
                variant={selectedFilter === 'price_alerts' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedFilter('price_alerts')}
                className={selectedFilter === 'price_alerts' ? 'bg-[#7B61FF]' : ''}
              >
                Alertas de Preço
              </Button>
            </div>

            {/* Notifications List */}
            <div className="space-y-3">
              {filteredNotifications.length === 0 ? (
                <Card className="bg-gray-800 border-gray-700">
                  <CardContent className="py-8 text-center">
                    <Bell className="h-12 w-12 text-gray-500 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-300 mb-2">
                      Nenhuma notificação encontrada
                    </h3>
                    <p className="text-gray-500">
                      Configure alertas de preço para receber notificações personalizadas.
                    </p>
                  </CardContent>
                </Card>
              ) : (
                filteredNotifications.map((notification) => {
                  const isUnread = notification.status !== 'read';
                  let parsedData = null;

                  try {
                    parsedData = notification.data ? JSON.parse(notification.data) : null;
                  } catch (e) {
                    // Ignore parsing errors
                  }

                  return (
                    <Card 
                      key={notification.id}
                      className={`bg-gray-800 border-gray-700 transition-all hover:bg-gray-750 ${
                        isUnread ? 'border-[#7B61FF]/50 bg-[#7B61FF]/5' : ''
                      }`}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex items-start space-x-3 flex-1">
                            <div className="flex-shrink-0 mt-1">
                              {getNotificationIcon(notification.type)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center space-x-2 mb-1">
                                <h4 className="font-medium text-white truncate">
                                  {notification.title}
                                </h4>
                                {isUnread && (
                                  <Badge variant="secondary" className="text-xs">
                                    Nova
                                  </Badge>
                                )}
                              </div>
                              <p className="text-gray-300 text-sm mb-2">
                                {notification.message}
                              </p>

                              {/* Additional details for price alerts */}
                              {parsedData && notification.type === 'price_alert' && (
                                <div className="bg-gray-900 rounded-lg p-3 mt-2">
                                  <div className="grid grid-cols-2 gap-2 text-xs">
                                    <div>
                                      <span className="text-gray-400">Preço Atual:</span>
                                      <span className="text-green-400 font-medium ml-1">
                                        {formatPrice(parsedData.currentPrice)}
                                      </span>
                                    </div>
                                    <div>
                                      <span className="text-gray-400">Meta:</span>
                                      <span className="text-gray-300 ml-1">
                                        {formatPrice(parsedData.thresholdPrice)}
                                      </span>
                                    </div>
                                    {parsedData.savings > 0 && (
                                      <div className="col-span-2">
                                        <span className="text-gray-400">Economia:</span>
                                        <span className="text-green-400 font-medium ml-1">
                                          {formatPrice(parsedData.savings)}
                                        </span>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )}

                              <div className="flex items-center space-x-2 mt-2 text-xs text-gray-500">
                                <Clock className="h-3 w-3" />
                                <span>{formatDate(notification.createdAt)}</span>
                                <Badge variant="outline" className="text-xs">
                                  {notification.channel}
                                </Badge>
                              </div>
                            </div>
                          </div>

                          {isUnread && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleMarkAsRead(notification.id)}
                              className="flex-shrink-0 ml-2"
                            >
                              <Check className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })
              )}
            </div>
          </TabsContent>

          <TabsContent value="alerts" className="space-y-4">
            {/* Active Alerts */}
            <div className="space-y-3">
              {!activeAlerts || activeAlerts.length === 0 ? (
                <Card className="bg-gray-800 border-gray-700">
                  <CardContent className="py-8 text-center">
                    <AlertCircle className="h-12 w-12 text-gray-500 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-300 mb-2">
                      Nenhum alerta ativo
                    </h3>
                    <p className="text-gray-500">
                      Crie alertas de preço para monitorar produtos de seu interesse.
                    </p>
                  </CardContent>
                </Card>
              ) : (
                activeAlerts.map((alert) => (
                  <Card key={alert.id} className="bg-gray-800 border-gray-700">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg">{alert.model}</CardTitle>
                        <Badge 
                          variant={alert.isActive ? "default" : "secondary"}
                          className={alert.isActive ? "bg-green-600" : ""}
                        >
                          {alert.isActive ? 'Ativo' : 'Inativo'}
                        </Badge>
                      </div>
                      <CardDescription>
                        Meta de preço: {formatPrice(alert.thresholdPrice)}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        {alert.brand && (
                          <div>
                            <span className="text-gray-400">Marca:</span>
                            <span className="text-white ml-1">{alert.brand}</span>
                          </div>
                        )}
                        {alert.capacity && (
                          <div>
                            <span className="text-gray-400">Capacidade:</span>
                            <span className="text-white ml-1">{alert.capacity}</span>
                          </div>
                        )}
                        {alert.color && (
                          <div>
                            <span className="text-gray-400">Cor:</span>
                            <span className="text-white ml-1">{alert.color}</span>
                          </div>
                        )}
                        {alert.region && (
                          <div>
                            <span className="text-gray-400">Região:</span>
                            <span className="text-white ml-1">{alert.region}</span>
                          </div>
                        )}
                        <div>
                          <span className="text-gray-400">Disparos:</span>
                          <span className="text-white ml-1">
                            {alert.triggerCount}/{alert.maxTriggers}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-400">Criado:</span>
                          <span className="text-white ml-1">
                            {formatDate(alert.createdAt)}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center space-x-4 mt-4 pt-4 border-t border-gray-700">
                        <div className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            checked={alert.emailNotification}
                            readOnly
                            className="rounded"
                          />
                          <span className="text-sm text-gray-300">Email</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            checked={alert.webPushNotification}
                            readOnly
                            className="rounded"
                          />
                          <span className="text-sm text-gray-300">Web Push</span>
                        </div>
                      </div>

                      {alert.lastTriggeredAt && (
                        <div className="mt-2 text-xs text-gray-500">
                          Último disparo: {formatDate(alert.lastTriggeredAt)}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}