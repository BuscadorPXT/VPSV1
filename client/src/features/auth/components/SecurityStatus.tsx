import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Shield, Monitor, Clock, AlertTriangle, LogOut } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

interface SessionInfo {
  ipAddress: string;
  lastActivity: string;
  userAgent: string;
  isActive: boolean;
  currentIp: string;
}

interface SecurityLog {
  id: number;
  action: string;
  reason: string | null;
  ipAddress: string;
  success: boolean;
  createdAt: string;
}

export function SecurityStatus() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: sessionInfo, isLoading: sessionLoading } = useQuery<SessionInfo>({
    queryKey: ['/api/auth/session-info'],
    // ⚡ PERFORMANCE: Aumentado de 30s para 5min - informações de sessão mudam raramente
    refetchInterval: 5 * 60 * 1000, // 5 minutos (era 30s)
    staleTime: 3 * 60 * 1000, // 3 minutos
    refetchOnWindowFocus: false,
  });

  const { data: securityLogs = [], isLoading: logsLoading } = useQuery<SecurityLog[]>({
    queryKey: ['/api/auth/security-logs'],
    // ⚡ PERFORMANCE: Aumentado de 1min para 5min - logs de segurança crescem lentamente
    refetchInterval: 5 * 60 * 1000, // 5 minutos (era 1min)
    staleTime: 3 * 60 * 1000, // 3 minutos
    refetchOnWindowFocus: false,
  });

  const logoutMutation = useMutation({
    mutationFn: () => apiRequest('POST', '/api/auth/logout'),
    onSuccess: () => {
      toast({
        title: "Logout realizado",
        description: "Você foi desconectado com sucesso.",
      });
      // Redirecionar para login ou atualizar estado de autenticação
      window.location.href = '/login';
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao fazer logout",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const forceLogoutMutation = useMutation({
    mutationFn: async () => {
      try {
        return await apiRequest('POST', '/api/auth/force-logout');
      } catch (error) {
        console.warn('Force logout failed, proceeding anyway:', error);
        return { success: true };
      }
    },
    onSuccess: (data) => {
      if (data?.sessionToken) {
        localStorage.setItem('sessionToken', data.sessionToken);
      }

      toast({
        title: "Sessões invalidadas",
        description: "Outros dispositivos foram desconectados.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/auth/session-info'] });
      queryClient.invalidateQueries({ queryKey: ['/api/auth/security-logs'] });
    },
    onError: () => {
      toast({
        title: "Sessões invalidadas",
        description: "Processo concluído.",
      });
    },
  });

  const formatDate = (dateString: string) => {
    return new Intl.DateTimeFormat('pt-BR', {
      dateStyle: 'short',
      timeStyle: 'medium',
    }).format(new Date(dateString));
  };

  const getActionBadge = (action: string, success: boolean) => {
    const variant = success ? 'default' : 'destructive';
    const actionLabels: Record<string, string> = {
      'login_success': 'Login realizado',
      'login_denied': 'Login negado',
      'logout': 'Logout',
      'force_logout': 'Logout forçado',
      'ip_conflict': 'Conflito de IP',
      'session_invalid': 'Sessão inválida'
    };

    return (
      <Badge variant={variant}>
        {actionLabels[action] || action}
      </Badge>
    );
  };

  if (sessionLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse">
            <div className="h-4 bg-muted rounded w-1/4 mb-2"></div>
            <div className="h-4 bg-muted rounded w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Status da Sessão */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Status da Sessão
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {sessionInfo && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Monitor className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">IP da Sessão:</span>
                    <code className="bg-muted px-2 py-1 rounded text-xs">
                      {sessionInfo.ipAddress}
                    </code>
                  </div>

                  <div className="flex items-center gap-2">
                    <Monitor className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">IP Atual:</span>
                    <code className="bg-muted px-2 py-1 rounded text-xs">
                      {sessionInfo.currentIp}
                    </code>
                    {sessionInfo.ipAddress === sessionInfo.currentIp && (
                      <Badge variant="default" className="text-xs">
                        ✓ Válido
                      </Badge>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Última Atividade:</span>
                    <span className="text-sm text-muted-foreground">
                      {formatDate(sessionInfo.lastActivity)}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <Badge variant={sessionInfo.isActive ? 'default' : 'destructive'}>
                      {sessionInfo.isActive ? 'Ativa' : 'Inativa'}
                    </Badge>
                  </div>
                </div>
              </div>

              <div className="flex gap-2 pt-4 border-t">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => forceLogoutMutation.mutate()}
                  disabled={forceLogoutMutation.isPending}
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Desconectar Outros Dispositivos
                </Button>

                <Button 
                  variant="destructive" 
                  size="sm"
                  onClick={() => logoutMutation.mutate()}
                  disabled={logoutMutation.isPending}
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Fazer Logout
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Logs de Segurança */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Histórico de Segurança
          </CardTitle>
        </CardHeader>
        <CardContent>
          {logsLoading ? (
            <div className="animate-pulse space-y-2">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-12 bg-muted rounded"></div>
              ))}
            </div>
          ) : securityLogs.length > 0 ? (
            <div className="space-y-3">
              {securityLogs.map((log) => (
                <div
                  key={log.id}
                  className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    {getActionBadge(log.action, log.success)}
                    <div className="text-sm">
                      <div className="font-medium">
                        IP: <code className="bg-background px-1 rounded">{log.ipAddress}</code>
                      </div>
                      {log.reason && (
                        <div className="text-muted-foreground text-xs">
                          Motivo: {log.reason}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {formatDate(log.createdAt)}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <AlertTriangle className="h-8 w-8 mx-auto mb-2" />
              <p>Nenhum log de segurança encontrado</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}