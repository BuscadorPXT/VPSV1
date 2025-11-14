import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { 
  MoreHorizontal,
  Eye,
  Edit,
  CheckCircle,
  XCircle,
  Clock,
  Ban,
  Play,
  Calendar,
  CreditCard,
  AlertTriangle,
  User,
  Mail,
  ChevronLeft,
  ChevronRight,
  ChevronFirst,
  ChevronLast
} from 'lucide-react';

interface SubscriptionData {
  userId: number;
  name: string;
  email: string;
  phone?: string;
  subscriptionPlan: string;
  isSubscriptionActive: boolean;
  status: string;
  subscriptionNickname?: string;
  paymentDate?: string;
  renewalDate?: string;
  daysWithoutPayment: number;
  notes?: string;
  paymentMethod?: string;
  paymentAmount?: number;
  paymentStatus: string;
  createdAt: string;
  lastLoginAt?: string;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

interface SubscriptionTableProps {
  subscriptions: SubscriptionData[];
  isLoading: boolean;
  pagination?: Pagination;
  onPageChange: (page: number) => void;
  onAction: (userId: number, action: string, data?: any) => void;
  isActionLoading: boolean;
}

interface EditModalData {
  paymentDate?: string;
  renewalDate?: string;
  notes?: string;
  nickname?: string;
  paymentMethod?: string;
  paymentAmount?: number;
  paymentStatus?: string;
}

const getStatusColor = (status: string) => {
  switch (status) {
    case 'approved': return 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300';
    case 'pending_approval': return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300';
    case 'pending_payment': return 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300';
    case 'suspended': return 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300';
    case 'rejected': return 'bg-gray-100 text-gray-700 dark:bg-gray-900 dark:text-gray-300';
    default: return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300';
  }
};

const getPaymentStatusColor = (status: string) => {
  switch (status) {
    case 'ativo': return 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300';
    case 'pendente': return 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300';
    case 'suspenso': return 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300';
    case 'cancelado': return 'bg-gray-100 text-gray-700 dark:bg-gray-900 dark:text-gray-300';
    default: return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300';
  }
};

const getPlanColor = (plan: string) => {
  switch (plan.toLowerCase()) {
    case 'free': return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300';
    case 'pro': return 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300';
    case 'business': return 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300';
    case 'admin': return 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300';
    case 'tester': return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300';
    default: return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300';
  }
};

const getDaysColor = (days: number) => {
  if (days <= 7) return 'text-green-600';
  if (days <= 30) return 'text-yellow-600';
  if (days <= 60) return 'text-orange-600';
  return 'text-red-600';
};

const formatDate = (dateString?: string) => {
  if (!dateString) return '-';
  return new Date(dateString).toLocaleDateString('pt-BR');
};

const formatCurrency = (value?: number) => {
  if (!value) return '-';
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

export const SubscriptionTable = ({ 
  subscriptions, 
  isLoading, 
  pagination, 
  onPageChange, 
  onAction, 
  isActionLoading 
}: SubscriptionTableProps) => {
  const [selectedUser, setSelectedUser] = useState<SubscriptionData | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showActionDialog, setShowActionDialog] = useState(false);
  const [pendingAction, setPendingAction] = useState<{ action: string; user: SubscriptionData } | null>(null);
  const [editData, setEditData] = useState<EditModalData>({});

  const handleAction = (action: string, user: SubscriptionData) => {
    if (['activate', 'suspend', 'mark-pending'].includes(action)) {
      setPendingAction({ action, user });
      setShowActionDialog(true);
    } else {
      onAction(user.userId, action);
    }
  };

  const confirmAction = () => {
    if (pendingAction) {
      onAction(pendingAction.user.userId, pendingAction.action);
      setPendingAction(null);
      setShowActionDialog(false);
    }
  };

  const handleEdit = (user: SubscriptionData) => {
    setSelectedUser(user);
    setEditData({
      paymentDate: user.paymentDate?.substring(0, 10) || '',
      renewalDate: user.renewalDate?.substring(0, 10) || '',
      notes: user.notes || '',
      nickname: user.subscriptionNickname || user.name,
      paymentMethod: user.paymentMethod || '',
      paymentAmount: user.paymentAmount || 0,
      paymentStatus: user.paymentStatus || 'ativo',
    });
    setShowEditModal(true);
  };

  const handleSaveEdit = () => {
    if (selectedUser) {
      onAction(selectedUser.userId, 'update', editData);
      setShowEditModal(false);
      setSelectedUser(null);
    }
  };

  const getActionText = (action: string) => {
    switch (action) {
      case 'activate': return 'ativar esta assinatura';
      case 'suspend': return 'suspender esta assinatura';
      case 'mark-pending': return 'marcar como pendente de pagamento';
      default: return 'executar esta ação';
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="animate-pulse">
          <div className="h-10 bg-muted rounded w-full mb-4"></div>
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-16 bg-muted rounded mb-2"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Usuário</TableHead>
              <TableHead>Telefone</TableHead>
              <TableHead>Plano</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Pagamento</TableHead>
              <TableHead>Última Atividade</TableHead>
              <TableHead>Dias para Vencer</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {subscriptions.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                  Nenhuma assinatura encontrada
                </TableCell>
              </TableRow>
            ) : (
              subscriptions.map((subscription) => (
                <TableRow key={subscription.userId}>
                  <TableCell>
                    <div className="flex items-center space-x-3">
                      <div className="flex-shrink-0">
                        <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-sm font-medium">
                          {subscription.name.charAt(0).toUpperCase()}
                        </div>
                      </div>
                      <div>
                        <div className="font-medium text-sm">
                          {subscription.subscriptionNickname || subscription.name}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {subscription.email}
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      {subscription.phone || '-'}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className={getPlanColor(subscription.subscriptionPlan)}>
                      {subscription.subscriptionPlan.toUpperCase()}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <Badge className={getStatusColor(subscription.status)}>
                        {subscription.status}
                      </Badge>
                      {subscription.paymentStatus && (
                        <div>
                          <Badge variant="outline" className={getPaymentStatusColor(subscription.paymentStatus)}>
                            {subscription.paymentStatus}
                          </Badge>
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      <div>Método: {subscription.paymentMethod || '-'}</div>
                      <div>Valor: {formatCurrency(subscription.paymentAmount)}</div>
                      <div className="text-xs text-muted-foreground">
                        Última: {formatDate(subscription.paymentDate)}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      <div>Login: {formatDate(subscription.lastLoginAt)}</div>
                      <div className="text-xs text-muted-foreground">
                        Renovação: {formatDate(subscription.renewalDate)}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className={`font-medium ${getDaysColor(subscription.daysWithoutPayment)}`}>
                      {subscription.daysWithoutPayment} dias
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => {
                          setSelectedUser(subscription);
                          setShowDetailModal(true);
                        }}>
                          <Eye className="h-4 w-4 mr-2" />
                          Ver Detalhes
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleEdit(subscription)}>
                          <Edit className="h-4 w-4 mr-2" />
                          Editar
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        {subscription.status !== 'approved' && (
                          <DropdownMenuItem onClick={() => handleAction('activate', subscription)}>
                            <CheckCircle className="h-4 w-4 mr-2 text-green-600" />
                            Ativar
                          </DropdownMenuItem>
                        )}
                        {subscription.status !== 'pending_payment' && (
                          <DropdownMenuItem onClick={() => handleAction('mark-pending', subscription)}>
                            <Clock className="h-4 w-4 mr-2 text-orange-600" />
                            Marcar Pendente
                          </DropdownMenuItem>
                        )}
                        {subscription.status !== 'suspended' && (
                          <DropdownMenuItem onClick={() => handleAction('suspend', subscription)}>
                            <Ban className="h-4 w-4 mr-2 text-red-600" />
                            Suspender
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => handleAction('extend-trial', subscription)}>
                          <Calendar className="h-4 w-4 mr-2 text-blue-600" />
                          Estender Trial
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {pagination && pagination.pages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            Mostrando {((pagination.page - 1) * pagination.limit) + 1} a {Math.min(pagination.page * pagination.limit, pagination.total)} de {pagination.total} resultados
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(1)}
              disabled={pagination.page === 1}
            >
              <ChevronFirst className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(pagination.page - 1)}
              disabled={pagination.page === 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm font-medium">
              Página {pagination.page} de {pagination.pages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(pagination.page + 1)}
              disabled={pagination.page === pagination.pages}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(pagination.pages)}
              disabled={pagination.page === pagination.pages}
            >
              <ChevronLast className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      <Dialog open={showDetailModal} onOpenChange={setShowDetailModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Detalhes da Assinatura</DialogTitle>
            <DialogDescription>
              Informações completas sobre a assinatura do usuário
            </DialogDescription>
          </DialogHeader>
          {selectedUser && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-4">
                <div>
                  <Label className="text-sm font-medium">Usuário</Label>
                  <div className="mt-1 text-sm">
                    <div className="font-medium">{selectedUser.name}</div>
                    <div className="text-muted-foreground">{selectedUser.email}</div>
                  </div>
                </div>
                <div>
                  <Label className="text-sm font-medium">Telefone</Label>
                  <div className="mt-1 text-sm">{selectedUser.phone || '-'}</div>
                </div>
                <div>
                  <Label className="text-sm font-medium">Status</Label>
                  <div className="mt-1">
                    <Badge className={getStatusColor(selectedUser.status)}>
                      {selectedUser.status}
                    </Badge>
                  </div>
                </div>
                <div>
                  <Label className="text-sm font-medium">Plano</Label>
                  <div className="mt-1">
                    <Badge className={getPlanColor(selectedUser.subscriptionPlan)}>
                      {selectedUser.subscriptionPlan.toUpperCase()}
                    </Badge>
                  </div>
                </div>
              </div>
              <div className="space-y-4">
                <div>
                  <Label className="text-sm font-medium">Último Pagamento</Label>
                  <div className="mt-1 text-sm">{formatDate(selectedUser.paymentDate)}</div>
                </div>
                <div>
                  <Label className="text-sm font-medium">Próxima Renovação</Label>
                  <div className="mt-1 text-sm">{formatDate(selectedUser.renewalDate)}</div>
                </div>
                <div>
                  <Label className="text-sm font-medium">Dias para Vencer</Label>
                  <div className={`mt-1 text-sm font-medium ${getDaysColor(selectedUser.daysWithoutPayment)}`}>
                    {selectedUser.daysWithoutPayment} dias
                  </div>
                </div>
              </div>
              {selectedUser.notes && (
                <div className="col-span-2">
                  <Label className="text-sm font-medium">Observações</Label>
                  <div className="mt-1 text-sm text-muted-foreground">
                    {selectedUser.notes}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Modal */}
      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Editar Assinatura</DialogTitle>
            <DialogDescription>
              Atualize os dados da assinatura do usuário
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="paymentDate">Data do Pagamento</Label>
              <Input
                id="paymentDate"
                type="date"
                value={editData.paymentDate}
                onChange={(e) => setEditData(prev => ({ ...prev, paymentDate: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="renewalDate">Data de Renovação</Label>
              <Input
                id="renewalDate"
                type="date"
                value={editData.renewalDate}
                onChange={(e) => setEditData(prev => ({ ...prev, renewalDate: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="paymentMethod">Método de Pagamento</Label>
              <Select value={editData.paymentMethod} onValueChange={(value) => setEditData(prev => ({ ...prev, paymentMethod: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pix">PIX</SelectItem>
                  <SelectItem value="credit_card">Cartão de Crédito</SelectItem>
                  <SelectItem value="bank_transfer">Transferência</SelectItem>
                  <SelectItem value="boleto">Boleto</SelectItem>
                  <SelectItem value="other">Outro</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="paymentAmount">Valor Pago</Label>
              <Input
                id="paymentAmount"
                type="number"
                step="0.01"
                min="0"
                value={editData.paymentAmount}
                onChange={(e) => setEditData(prev => ({ ...prev, paymentAmount: parseFloat(e.target.value) || 0 }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="paymentStatus">Status do Pagamento</Label>
              <Select value={editData.paymentStatus} onValueChange={(value) => setEditData(prev => ({ ...prev, paymentStatus: value }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ativo">Ativo</SelectItem>
                  <SelectItem value="pendente">Pendente</SelectItem>
                  <SelectItem value="suspenso">Suspenso</SelectItem>
                  <SelectItem value="cancelado">Cancelado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="nickname">Apelido</Label>
              <Input
                id="nickname"
                value={editData.nickname}
                onChange={(e) => setEditData(prev => ({ ...prev, nickname: e.target.value }))}
                placeholder="Apelido para identificação"
              />
            </div>
            <div className="col-span-2 space-y-2">
              <Label htmlFor="notes">Observações</Label>
              <Textarea
                id="notes"
                value={editData.notes}
                onChange={(e) => setEditData(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Observações sobre a assinatura..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditModal(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveEdit} disabled={isActionLoading}>
              Salvar Alterações
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Action Confirmation Dialog */}
      <AlertDialog open={showActionDialog} onOpenChange={setShowActionDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Ação</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja {pendingAction && getActionText(pendingAction.action)}?
              {pendingAction && (
                <div className="mt-2 p-2 bg-muted rounded text-sm">
                  <strong>Usuário:</strong> {pendingAction.user.name} ({pendingAction.user.email})
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmAction} disabled={isActionLoading}>
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};