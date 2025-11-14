import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import FeedbackAlertsAdmin from '@/components/FeedbackAlertsAdmin';
import { AdminRatingsPanel } from '@/components/AdminRatingsPanel';
import { UsersManagementSection } from '@/components/admin/UsersManagementSection';
import { LoginSharingSection } from '@/components/admin/LoginSharingSection';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Star, CheckCircle, XCircle, MessageSquare, User, Calendar, Clock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

export default function AdminDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedRating, setSelectedRating] = useState<any>(null);
  const [showApprovalDialog, setShowApprovalDialog] = useState(false);
  const [showRejectionDialog, setShowRejectionDialog] = useState(false);

  // Check if user is admin
  if (!user?.isAdmin) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-center text-red-600">Acesso Negado</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-center text-gray-600">
              Você não tem permissão para acessar esta página.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Fetch pending ratings
  const { data: pendingRatings, isLoading, refetch } = useQuery({
    queryKey: ['pending-ratings'],
    queryFn: () => apiRequest('/api/admin/ratings/pending'),
    refetchInterval: 30000, // Check every 30 seconds
    staleTime: 10000, // Consider data fresh for 10 seconds
  });

  // Approve rating mutation
  const approveRatingMutation = useMutation({
    mutationFn: async (ratingId: number) => {
      return apiRequest(`/api/admin/ratings/${ratingId}/approve`, {
        method: 'POST',
      });
    },
    onSuccess: () => {
      toast({
        title: "Avaliação Aprovada",
        description: "A avaliação foi aprovada e está agora visível publicamente",
      });

      // Invalidate cache to refresh the list
      queryClient.invalidateQueries({ queryKey: ['pending-ratings'] });
      queryClient.invalidateQueries({ queryKey: ['supplier-ratings'] });
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });

      refetch();
      setShowApprovalDialog(false);
      setSelectedRating(null);
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Erro ao aprovar avaliação",
        variant: "destructive",
      });
    }
  });

  // Reject rating mutation
  const rejectRatingMutation = useMutation({
    mutationFn: async (ratingId: number) => {
      return apiRequest(`/api/admin/ratings/${ratingId}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: 'Rejeitada pelo administrador' }),
      });
    },
    onSuccess: () => {
      toast({
        title: "Avaliação Rejeitada",
        description: "A avaliação foi rejeitada e removida do sistema",
      });

      // Invalidate cache to refresh the list
      queryClient.invalidateQueries({ queryKey: ['pending-ratings'] });
      queryClient.invalidateQueries({ queryKey: ['supplier-ratings'] });
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });

      refetch();
      setShowRejectionDialog(false);
      setSelectedRating(null);
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Erro ao rejeitar avaliação",
        variant: "destructive",
      });
    }
  });

  const handleApprove = (rating: any) => {
    setSelectedRating(rating);
    setShowApprovalDialog(true);
  };

  const handleReject = (rating: any) => {
    setSelectedRating(rating);
    setShowRejectionDialog(true);
  };

  const confirmApproval = () => {
    if (selectedRating) {
      approveRatingMutation.mutate(selectedRating.id);
    }
  };

  const confirmRejection = () => {
    if (selectedRating) {
      rejectRatingMutation.mutate(selectedRating.id);
    }
  };

  const renderStars = (rating: number) => {
    return (
      <div className="flex items-center gap-1">
        {[...Array(5)].map((_, index) => (
          <Star
            key={index}
            className={`h-4 w-4 ${
              index < rating 
                ? 'text-yellow-500 fill-yellow-500' 
                : 'text-gray-300'
            }`}
          />
        ))}
        <span className="ml-1 text-sm text-gray-600">{rating}/5</span>
      </div>
    );
  };

  const ratings = pendingRatings?.data?.ratings || [];
  const totalPending = pendingRatings?.data?.pagination?.total || 0;

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Dashboard Administrativo</h1>
          <p className="text-gray-600">Gerencie avaliações pendentes de fornecedores</p>
        </div>
        <Badge variant="secondary" className="text-lg px-4 py-2">
          {totalPending} avaliações pendentes
        </Badge>
      </div>

      <div>
        <Tabs defaultValue="users" className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="users">Usuários</TabsTrigger>
            <TabsTrigger value="sessions">Sessões</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
            <TabsTrigger value="alerts">Alertas</TabsTrigger>
            <TabsTrigger value="ratings">Avaliações</TabsTrigger>
          </TabsList>
          <TabsContent value="users" className="space-y-4">
            <UsersManagementSection />
          </TabsContent>
          <TabsContent value="sessions" className="space-y-4">
            <LoginSharingSection />
          </TabsContent>
          <TabsContent value="analytics" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Analytics</CardTitle>
                <CardDescription>Métricas e estatísticas do sistema.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-700 mb-2">
                    Analytics do Sistema
                  </h3>
                  <p className="text-gray-600 mb-4">
                    Funcionalidade em desenvolvimento. Em breve você terá acesso a métricas avançadas.
                  </p>
                  <Button variant="outline" onClick={() => window.open('/admin', '_blank')}>
                    Acessar Painel Completo
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="alerts" className="space-y-4">
            <FeedbackAlertsAdmin />
          </TabsContent>

          <TabsContent value="ratings" className="space-y-4">
            <AdminRatingsPanel />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}