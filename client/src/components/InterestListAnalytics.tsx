
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  TrendingDown, 
  TrendingUp, 
  Calendar, 
  Package, 
  DollarSign,
  Users,
  Download,
  BarChart3
} from 'lucide-react';
import { formatPrice } from '@/lib/formatters';

interface AnalyticsProps {
  products: Array<{
    id: number;
    model: string;
    supplierPrice?: number;
    supplierName: string;
    createdAt: string;
    category?: string;
  }>;
  selectedProducts: Set<number>;
}

export const InterestListAnalytics: React.FC<AnalyticsProps> = ({ 
  products, 
  selectedProducts 
}) => {
  // Calcular estatísticas
  const stats = React.useMemo(() => {
    const selected = products.filter(p => selectedProducts.has(p.id));
    const all = products;

    // Estatísticas gerais
    const totalValue = all.reduce((sum, p) => sum + (p.supplierPrice || 0), 0);
    const selectedValue = selected.reduce((sum, p) => sum + (p.supplierPrice || 0), 0);
    const avgPrice = all.length > 0 ? totalValue / all.length : 0;

    // Fornecedores
    const supplierStats = all.reduce((acc, product) => {
      const supplier = product.supplierName;
      if (!acc[supplier]) {
        acc[supplier] = { count: 0, value: 0 };
      }
      acc[supplier].count++;
      acc[supplier].value += product.supplierPrice || 0;
      return acc;
    }, {} as Record<string, { count: number; value: number }>);

    const topSupplier = Object.entries(supplierStats)
      .sort(([,a], [,b]) => b.count - a.count)[0];

    // Categorias
    const categoryStats = all.reduce((acc, product) => {
      const category = product.category || 'Outros';
      acc[category] = (acc[category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const topCategory = Object.entries(categoryStats)
      .sort(([,a], [,b]) => b - a)[0];

    // Produtos mais caros e baratos
    const sortedByPrice = all.filter(p => p.supplierPrice).sort((a, b) => (b.supplierPrice || 0) - (a.supplierPrice || 0));
    const mostExpensive = sortedByPrice[0];
    const cheapest = sortedByPrice[sortedByPrice.length - 1];

    // Produtos recentes (últimos 7 dias)
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const recentProducts = all.filter(p => new Date(p.createdAt) > weekAgo);

    return {
      total: {
        count: all.length,
        value: totalValue,
        avgPrice
      },
      selected: {
        count: selected.length,
        value: selectedValue
      },
      suppliers: {
        total: Object.keys(supplierStats).length,
        top: topSupplier
      },
      categories: {
        total: Object.keys(categoryStats).length,
        top: topCategory
      },
      prices: {
        highest: mostExpensive,
        lowest: cheapest
      },
      recent: recentProducts.length
    };
  }, [products, selectedProducts]);

  // Função para exportar dados
  const handleExport = () => {
    const selected = products.filter(p => selectedProducts.has(p.id));
    const dataToExport = selected.length > 0 ? selected : products;
    
    const csvContent = [
      ['Produto', 'Marca', 'Fornecedor', 'Preço', 'Data de Adição'].join(','),
      ...dataToExport.map(product => [
        product.model,
        '', // brand - assumindo que não está na interface
        product.supplierName,
        product.supplierPrice || 0,
        new Date(product.createdAt).toLocaleDateString('pt-BR')
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `lista-interesses-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (products.length === 0) {
    return null;
  }

  return (
    <Card className="mb-6">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Análise da Lista
          </CardTitle>
          <Button onClick={handleExport} variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Exportar CSV
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Estatísticas Gerais */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium text-gray-600 dark:text-gray-400">
              <Package className="h-4 w-4" />
              Total de Produtos
            </div>
            <div className="text-2xl font-bold">{stats.total.count}</div>
            <div className="text-sm text-gray-500">
              Valor: {formatPrice(stats.total.value)}
            </div>
          </div>

          {/* Seleção Atual */}
          {selectedProducts.size > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium text-green-600 dark:text-green-400">
                <Package className="h-4 w-4" />
                Selecionados
              </div>
              <div className="text-2xl font-bold text-green-600">{stats.selected.count}</div>
              <div className="text-sm text-green-500">
                Valor: {formatPrice(stats.selected.value)}
              </div>
            </div>
          )}

          {/* Fornecedores */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium text-blue-600 dark:text-blue-400">
              <Users className="h-4 w-4" />
              Fornecedores
            </div>
            <div className="text-2xl font-bold">{stats.suppliers.total}</div>
            {stats.suppliers.top && (
              <div className="text-sm text-gray-500">
                Top: {stats.suppliers.top[0]} ({stats.suppliers.top[1].count})
              </div>
            )}
          </div>

          {/* Preços */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium text-purple-600 dark:text-purple-400">
              <DollarSign className="h-4 w-4" />
              Preço Médio
            </div>
            <div className="text-2xl font-bold">{formatPrice(stats.total.avgPrice)}</div>
            <div className="flex gap-1">
              {stats.prices.highest && (
                <Badge variant="destructive" className="text-xs">
                  <TrendingUp className="h-3 w-3 mr-1" />
                  {formatPrice(stats.prices.highest.supplierPrice || 0)}
                </Badge>
              )}
              {stats.prices.lowest && (
                <Badge variant="secondary" className="text-xs">
                  <TrendingDown className="h-3 w-3 mr-1" />
                  {formatPrice(stats.prices.lowest.supplierPrice || 0)}
                </Badge>
              )}
            </div>
          </div>
        </div>

        {/* Informações Adicionais */}
        <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
          <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                {stats.recent} produtos recentes (7 dias)
              </span>
              {stats.categories.top && (
                <span>
                  Categoria principal: <strong>{stats.categories.top[0]}</strong> ({stats.categories.top[1]} produtos)
                </span>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
