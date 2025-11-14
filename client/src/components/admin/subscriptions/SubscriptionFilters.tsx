import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Search, Filter, RotateCcw } from 'lucide-react';

interface Filters {
  search: string;
  status: string;
  plan: string;
  paymentMethod: string;
  daysWithoutPayment: string;
  page: number;
  limit: number;
  sortBy: 'name' | 'email' | 'paymentDate' | 'renewalDate' | 'daysWithoutPayment';
  sortOrder: 'asc' | 'desc';
}

interface SubscriptionFiltersProps {
  filters: Filters;
  onFilterChange: (key: keyof Filters, value: string | number) => void;
}

export const SubscriptionFilters = ({ filters, onFilterChange }: SubscriptionFiltersProps) => {
  const handleReset = () => {
    onFilterChange('search', '');
    onFilterChange('status', 'all');
    onFilterChange('plan', 'all');
    onFilterChange('paymentMethod', 'all');
    onFilterChange('daysWithoutPayment', 'all');
    onFilterChange('page', 1);
  };

  const hasActiveFilters = filters.search || 
    (filters.status && filters.status !== 'all') || 
    (filters.plan && filters.plan !== 'all') || 
    (filters.paymentMethod && filters.paymentMethod !== 'all') || 
    (filters.daysWithoutPayment && filters.daysWithoutPayment !== 'all');

  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center">
          <Filter className="h-5 w-5 mr-2" />
          Filtros Avançados
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-4">
          {/* Search */}
          <div className="space-y-2">
            <Label htmlFor="search">Buscar</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="search"
                placeholder="Nome, email, telefone..."
                value={filters.search}
                onChange={(e) => onFilterChange('search', e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Status */}
          <div className="space-y-2">
            <Label>Status</Label>
            <Select value={filters.status} onValueChange={(value) => onFilterChange('status', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Todos os status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os status</SelectItem>
                <SelectItem value="approved">Aprovado</SelectItem>
                <SelectItem value="pending_approval">Pendente</SelectItem>
                <SelectItem value="pending_payment">Pendente Pagamento</SelectItem>
                <SelectItem value="suspended">Suspenso</SelectItem>
                <SelectItem value="rejected">Rejeitado</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Plan */}
          <div className="space-y-2">
            <Label>Plano</Label>
            <Select value={filters.plan} onValueChange={(value) => onFilterChange('plan', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Todos os planos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os planos</SelectItem>
                <SelectItem value="free">Free</SelectItem>
                <SelectItem value="pro">Pro</SelectItem>
                <SelectItem value="business">Business</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="tester">Tester</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Payment Method */}
          <div className="space-y-2">
            <Label>Método de Pagamento</Label>
            <Select value={filters.paymentMethod} onValueChange={(value) => onFilterChange('paymentMethod', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Todos os métodos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os métodos</SelectItem>
                <SelectItem value="pix">PIX</SelectItem>
                <SelectItem value="credit_card">Cartão de Crédito</SelectItem>
                <SelectItem value="bank_transfer">Transferência</SelectItem>
                <SelectItem value="boleto">Boleto</SelectItem>
                <SelectItem value="other">Outro</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Days Without Payment */}
          <div className="space-y-2">
            <Label htmlFor="days-filter">Dias para Vencer</Label>
            <Select value={filters.daysWithoutPayment} onValueChange={(value) => onFilterChange('daysWithoutPayment', value)}>
              <SelectTrigger>
                <SelectValue placeholder="Qualquer período" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os períodos</SelectItem>
                <SelectItem value="7">Vencem em 7 dias ou menos</SelectItem>
                <SelectItem value="15">Vencem em 15 dias ou menos</SelectItem>
                <SelectItem value="30">Vencem em 30 dias ou menos</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Sort and Reset */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center space-x-4">
            {/* Sort By */}
            <div className="flex items-center space-x-2">
              <Label>Ordenar por:</Label>
              <Select value={filters.sortBy} onValueChange={(value) => onFilterChange('sortBy', value)}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="name">Nome</SelectItem>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="paymentDate">Data de Pagamento</SelectItem>
                  <SelectItem value="renewalDate">Data de Renovação</SelectItem>
                  <SelectItem value="daysWithoutPayment">Dias sem Pagamento</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Sort Order */}
            <div className="flex items-center space-x-2">
              <Label>Ordem:</Label>
              <Select value={filters.sortOrder} onValueChange={(value) => onFilterChange('sortOrder', value)}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="asc">Crescente</SelectItem>
                  <SelectItem value="desc">Decrescente</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Reset Button */}
          {hasActiveFilters && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleReset}
              className="flex items-center"
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Limpar Filtros
            </Button>
          )}
        </div>

        {/* Active Filters Summary */}
        {hasActiveFilters && (
          <div className="text-sm text-muted-foreground">
            <span className="font-medium">Filtros ativos:</span>
            {' '}
            {[
              filters.search && `busca: "${filters.search}"`,
              filters.status && `status: ${filters.status}`,
              filters.plan && `plano: ${filters.plan}`,
              filters.paymentMethod && `pagamento: ${filters.paymentMethod}`,
              filters.daysWithoutPayment && `dias: ${filters.daysWithoutPayment}`
            ].filter(Boolean).join(', ')}
          </div>
        )}
      </CardContent>
    </Card>
  );
};