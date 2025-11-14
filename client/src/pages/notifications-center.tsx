
import { useState } from 'react';
import { Bell, Filter, Check, CheckCircle, Info, AlertTriangle, AlertCircle, Calendar, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

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

export default function NotificationsCenterPage() {
  const [selectedFilter, setSelectedFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch notifications
  const { data: notificationsData, isLoading } = useQuery<NotificationsResponse>({
    queryKey: ['/api/notifications'],
    refetchInterval: 30000,
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
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
      toast({
        title: 'Sucesso',
        description: `${data.count} notificações marcadas como lidas`,
      });
    },
  });

  const notifications = notificationsData?.notifications || [];
  const unreadCount = notificationsData?.unreadCount || 0;

  const filteredNotifications = notifications.filter(notification => {
    // Filter by status
    if (selectedFilter === 'unread' && notification.isRead) return false;
    if (selectedFilter === 'read' && !notification.isRead) return false;
    if (selectedFilter !== 'all' && selectedFilter !== 'unread' && selectedFilter !== 'read') {
      if (notification.type !== selectedFilter) return false;
    }

    // Filter by search term
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      return (
        notification.title.toLowerCase().includes(searchLower) ||
        notification.message.toLowerCase().includes(searchLower)
      );
    }

    return true;
  });

  const handleMarkAsRead = (notificationId: number) => {
    markAsReadMutation.mutate(notificationId);
  };

  const handleMarkAllAsRead = () => {
    markAllAsReadMutation.mutate();
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'success':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      case 'error':
        return <AlertCircle className="h-5 w-5 text-red-500" />;
      case 'news':
        return <Info className="h-5 w-5 text-blue-500" />;
      case 'update':
        return <Info className="h-5 w-5 text-purple-500" />;
      default:
        return <Info className="h-5 w-5 text-gray-500" />;
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
      case 'news':
        return 'border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-900/20';
      default:
        return 'border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-900/20';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return {
      date: date.toLocaleDateString('pt-BR'),
      time: date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    };
  };

  const getTypeLabel = (type: string) => {
    const labels = {
      info: 'Informação',
      warning: 'Aviso',
      success: 'Sucesso',
      error: 'Erro',
      news: 'Notícia',
      update: 'Atualização'
    };
    return labels[type as keyof typeof labels] || type;
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return <Badge variant="destructive" className="text-xs">Urgente</Badge>;
      case 'high':
        return <Badge className="text-xs bg-orange-500">Alta</Badge>;
      case 'normal':
        return <Badge variant="secondary" className="text-xs">Normal</Badge>;
      case 'low':
        return <Badge variant="outline" className="text-xs">Baixa</Badge>;
      default:
        return null;
    }
  };

  if (isLoading) {
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
      <div className="watermark-pattern-main" />

      <div className="dashboard-container watermark-pattern-main relative z-10 container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-3">
            <Bell className="h-8 w-8 text-[#7B61FF]" />
            <div>
              <h1 className="text-3xl font-bold">Central de Notificações</h1>
              <p className="text-gray-400">
                Todas as suas notificações e avisos do sistema
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            {unreadCount > 0 && (
              <Button
                onClick={handleMarkAllAsRead}
                disabled={markAllAsReadMutation.isPending}
                className="bg-[#7B61FF] hover:bg-[#6B51E5]"
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Marcar todas como lidas ({unreadCount})
              </Button>
            )}
            <Badge variant="destructive" className="text-lg px-3 py-1">
              {unreadCount} não lidas
            </Badge>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="bg-gray-800 border-gray-700">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">Total</p>
                  <p className="text-2xl font-bold text-white">{notifications.length}</p>
                </div>
                <Bell className="h-8 w-8 text-[#7B61FF]" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gray-800 border-gray-700">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">Não Lidas</p>
                  <p className="text-2xl font-bold text-red-400">{unreadCount}</p>
                </div>
                <AlertCircle className="h-8 w-8 text-red-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gray-800 border-gray-700">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">Lidas</p>
                  <p className="text-2xl font-bold text-green-400">{notifications.length - unreadCount}</p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-400" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gray-800 border-gray-700">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">Esta Semana</p>
                  <p className="text-2xl font-bold text-blue-400">
                    {notifications.filter(n => {
                      const weekAgo = new Date();
                      weekAgo.setDate(weekAgo.getDate() - 7);
                      return new Date(n.createdAt) > weekAgo;
                    }).length}
                  </p>
                </div>
                <Calendar className="h-8 w-8 text-blue-400" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="bg-gray-800 border-gray-700 mb-6">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <Input
                  placeholder="Buscar notificações..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="bg-gray-900 border-gray-600"
                />
              </div>
              <Select value={selectedFilter} onValueChange={setSelectedFilter}>
                <SelectTrigger className="w-full md:w-48 bg-gray-900 border-gray-600">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  <SelectItem value="unread">Não lidas</SelectItem>
                  <SelectItem value="read">Lidas</SelectItem>
                  <SelectItem value="info">Informações</SelectItem>
                  <SelectItem value="news">Notícias</SelectItem>
                  <SelectItem value="update">Atualizações</SelectItem>
                  <SelectItem value="success">Sucesso</SelectItem>
                  <SelectItem value="warning">Avisos</SelectItem>
                  <SelectItem value="error">Erros</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Notifications List */}
        <div className="space-y-4">
          {filteredNotifications.length === 0 ? (
            <Card className="bg-gray-800 border-gray-700">
              <CardContent className="py-12 text-center">
                <Bell className="h-16 w-16 text-gray-500 mx-auto mb-4" />
                <h3 className="text-xl font-medium text-gray-300 mb-2">
                  Nenhuma notificação encontrada
                </h3>
                <p className="text-gray-500">
                  {searchTerm 
                    ? "Tente ajustar os filtros ou termo de busca."
                    : "Você está em dia! Novas notificações aparecerão aqui."}
                </p>
              </CardContent>
            </Card>
          ) : (
            filteredNotifications.map((notification) => {
              const { date, time } = formatDate(notification.createdAt);
              
              return (
                <Card 
                  key={notification.id}
                  className={`bg-gray-800 border-gray-700 transition-all hover:bg-gray-750 cursor-pointer ${
                    !notification.isRead ? 'ring-2 ring-[#7B61FF]/50 bg-[#7B61FF]/5' : ''
                  }`}
                  onClick={() => !notification.isRead && handleMarkAsRead(notification.id)}
                >
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-4 flex-1">
                        <div className="flex-shrink-0 mt-1">
                          {getNotificationIcon(notification.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-3 mb-2">
                            <h3 className="font-semibold text-white text-lg">
                              {notification.title}
                            </h3>
                            {!notification.isRead && (
                              <Badge variant="destructive" className="text-xs">
                                Nova
                              </Badge>
                            )}
                            {getPriorityBadge(notification.priority)}
                            <Badge variant="outline" className="text-xs">
                              {getTypeLabel(notification.type)}
                            </Badge>
                          </div>
                          
                          <p className="text-gray-300 mb-4 leading-relaxed">
                            {notification.message}
                          </p>
                          
                          <div className="flex items-center justify-between text-sm text-gray-500">
                            <div className="flex items-center space-x-4">
                              <div className="flex items-center space-x-1">
                                <Calendar className="h-4 w-4" />
                                <span>{date}</span>
                              </div>
                              <div className="flex items-center space-x-1">
                                <Clock className="h-4 w-4" />
                                <span>{time}</span>
                              </div>
                            </div>
                            {notification.isRead && (
                              <div className="flex items-center space-x-1 text-green-400">
                                <CheckCircle className="h-4 w-4" />
                                <span>Lida</span>
                              </div>
                            )}
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
                          className="flex-shrink-0 ml-4"
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
      </div>
    </div>
  );
}
