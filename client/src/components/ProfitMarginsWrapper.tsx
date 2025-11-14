import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Calculator, 
  TrendingUp, 
  DollarSign, 
  Settings,
  Eye,
  EyeOff,
  Download,
  RefreshCw
} from 'lucide-react';
import { ProfitMarginsConfig } from './ProfitMarginsConfig';
import { useProfitMargins } from '@/hooks/useProfitMargins';
import { useToast } from '@/hooks/use-toast';
import { ProductWithSalePrice } from '@/types/profit-margins';

interface ProfitMarginsWrapperProps {
  userId: string;
  products: any[];
  children: React.ReactNode;
  className?: string;
}

export function ProfitMarginsWrapper({ 
  userId, 
  products, 
  children, 
  className = "" 
}: ProfitMarginsWrapperProps) {
  // Sistema de margens bloqueado - em desenvolvimento
  const isSystemAvailable = false; // Sempre bloqueado para usuários finais
  
  if (!isSystemAvailable) {
    return <div className={className}>{children}</div>;
  }
  const { toast } = useToast();
  const [showProfitView, setShowProfitView] = useState(false);
  const [calculatedProducts, setCalculatedProducts] = useState<ProductWithSalePrice[]>([]);
  const [showConfig, setShowConfig] = useState(false);

  const {
    allMargins,
    calculatePrices,
    isCalculating,
    calculateResult,
    calculateError
  } = useProfitMargins(userId);

  // Calcular estatísticas dos produtos com margem
  const profitStats = useMemo(() => {
    if (!calculatedProducts || !calculatedProducts.length) return null;

    const totalProducts = calculatedProducts.length;
    const totalCostValue = calculatedProducts.reduce((sum, product) => {
      const basePrice = typeof product.supplierPrice === 'number' ? product.supplierPrice :
                       typeof product.supplierprice === 'number' ? product.supplierprice :
                       typeof product.price === 'number' ? product.price :
                       typeof product.preco === 'number' ? product.preco : 0;
      return sum + basePrice;
    }, 0);
    
    const totalSaleValue = calculatedProducts.reduce((sum, product) => sum + (product.salePrice || 0), 0);
    const totalProfit = totalSaleValue - totalCostValue;
    const averageMargin = calculatedProducts.reduce((sum, product) => sum + (product.marginApplied || 0), 0) / totalProducts;

    return {
      totalProducts,
      totalCostValue,
      totalSaleValue,
      totalProfit,
      averageMargin,
      profitPercentage: totalCostValue > 0 ? (totalProfit / totalCostValue) * 100 : 0
    };
  }, [calculatedProducts]);

  const handleCalculateProfits = async () => {
    if (!products.length) {
      toast({
        title: "Aviso",
        description: "Nenhum produto disponível para cálculo",
        variant: "destructive"
      });
      return;
    }

    if (!allMargins || (allMargins.global === 0 && allMargins.categories.length === 0 && allMargins.products.length === 0)) {
      toast({
        title: "Configuração Necessária",
        description: "Configure pelo menos uma margem antes de calcular os preços",
        variant: "destructive"
      });
      setShowConfig(true);
      return;
    }

    calculatePrices({ products }, {
      onSuccess: (result) => {
        setCalculatedProducts(result.data);
        setShowProfitView(true);
        toast({
          title: "Sucesso",
          description: `${result.summary.totalCalculated} preços calculados com margem de lucro`
        });
      },
      onError: (error) => {
        toast({
          title: "Erro",
          description: `Erro ao calcular margens: ${error.message}`,
          variant: "destructive"
        });
      }
    });
  };

  const exportProfitData = () => {
    if (!calculatedProducts.length) return;

    const csvData = [
      ['Produto', 'Marca', 'Armazenamento', 'Fornecedor', 'Preço Custo', 'Margem %', 'Preço Venda', 'Lucro', 'Fonte Margem'],
      ...calculatedProducts.map(product => [
        product.model || '',
        product.brand || '',
        product.storage || '',
        product.suppliername || '',
        `R$ ${(typeof product.supplierPrice === 'number' ? product.supplierPrice : 
               typeof product.supplierprice === 'number' ? product.supplierprice :
               typeof product.price === 'number' ? product.price :
               typeof product.preco === 'number' ? product.preco : 0).toFixed(2)}`,
        `${product.marginApplied || 0}%`,
        `R$ ${(product.salePrice || 0).toFixed(2)}`,
        `R$ ${((product.salePrice || 0) - (typeof product.supplierPrice === 'number' ? product.supplierPrice : 
               typeof product.supplierprice === 'number' ? product.supplierprice :
               typeof product.price === 'number' ? product.price :
               typeof product.preco === 'number' ? product.preco : 0)).toFixed(2)}`,
        product.marginSource === 'product' ? 'Produto' :
        product.marginSource === 'category' ? 'Categoria' : 'Global'
      ])
    ];

    const csvContent = csvData.map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `precos_com_margem_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Barra de Controle de Margem de Lucro */}
      <Card className="border-l-4 border-l-green-500">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calculator className="h-5 w-5 text-green-600" />
              <CardTitle className="text-lg">Sistema de Margem de Lucro</CardTitle>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowConfig(!showConfig)}
                className="flex items-center gap-2"
              >
                <Settings className="h-4 w-4" />
                {showConfig ? "Ocultar Config" : "Configurar"}
              </Button>
              <Button
                size="sm"
                onClick={handleCalculateProfits}
                disabled={isCalculating || !products.length}
                className="flex items-center gap-2"
              >
                {isCalculating ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <Calculator className="h-4 w-4" />
                )}
                {isCalculating ? "Calculando..." : "Calcular Margens"}
              </Button>
            </div>
          </div>
          
          {profitStats && (
            <div className="flex items-center gap-4 pt-2">
              <Badge variant="secondary" className="flex items-center gap-1">
                <TrendingUp className="h-3 w-3" />
                Margem Média: {profitStats.averageMargin.toFixed(1)}%
              </Badge>
              <Badge variant="outline" className="flex items-center gap-1">
                <DollarSign className="h-3 w-3" />
                Lucro Total: R$ {profitStats.totalProfit.toFixed(2)}
              </Badge>
              <span className="text-sm text-muted-foreground">
                {profitStats.totalProducts} produtos calculados
              </span>
            </div>
          )}
        </CardHeader>
        
        {profitStats && (
          <CardContent className="pt-0">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <div className="text-center p-3 bg-blue-50 dark:bg-blue-950 rounded-lg">
                <p className="text-sm text-muted-foreground">Valor de Custo</p>
                <p className="text-lg font-bold text-blue-600">R$ {profitStats.totalCostValue.toFixed(2)}</p>
              </div>
              <div className="text-center p-3 bg-green-50 dark:bg-green-950 rounded-lg">
                <p className="text-sm text-muted-foreground">Valor de Venda</p>
                <p className="text-lg font-bold text-green-600">R$ {profitStats.totalSaleValue.toFixed(2)}</p>
              </div>
              <div className="text-center p-3 bg-purple-50 dark:bg-purple-950 rounded-lg">
                <p className="text-sm text-muted-foreground">Lucro Total</p>
                <p className="text-lg font-bold text-purple-600">R$ {profitStats.totalProfit.toFixed(2)}</p>
              </div>
              <div className="text-center p-3 bg-orange-50 dark:bg-orange-950 rounded-lg">
                <p className="text-sm text-muted-foreground">Margem %</p>
                <p className="text-lg font-bold text-orange-600">{profitStats.profitPercentage.toFixed(1)}%</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowProfitView(!showProfitView)}
                className="flex items-center gap-2"
              >
                {showProfitView ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                {showProfitView ? "Ocultar" : "Mostrar"} Preços com Margem
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={exportProfitData}
                className="flex items-center gap-2"
              >
                <Download className="h-4 w-4" />
                Exportar CSV
              </Button>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Painel de Configuração */}
      {showConfig && (
        <ProfitMarginsConfig 
          userId={userId} 
          products={products}
        />
      )}

      {/* Alerta de Erro */}
      {calculateError && (
        <Alert variant="destructive">
          <AlertDescription>
            Erro ao calcular margens: {calculateError.message}
          </AlertDescription>
        </Alert>
      )}

      {/* Conteúdo Principal - Lista de Preços */}
      {showProfitView && calculatedProducts.length > 0 ? (
        <Tabs defaultValue="original" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="original">Lista Original</TabsTrigger>
            <TabsTrigger value="profit">Com Margem de Lucro</TabsTrigger>
          </TabsList>
          
          <TabsContent value="original">
            {children}
          </TabsContent>
          
          <TabsContent value="profit">
            <Card>
              <CardHeader>
                <CardTitle>Preços com Margem de Lucro</CardTitle>
                <CardDescription>
                  Produtos com preços de venda calculados conforme suas configurações de margem
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {calculatedProducts.map((product, index) => {
                    const basePrice = typeof product.supplierPrice === 'number' ? product.supplierPrice :
                                     typeof product.supplierprice === 'number' ? product.supplierprice :
                                     typeof product.price === 'number' ? product.price :
                                     typeof product.preco === 'number' ? product.preco : 0;
                    
                    const profit = (product.salePrice || 0) - basePrice;
                    
                    return (
                      <div key={index} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-medium">
                              {product.model} {product.brand} {product.storage}
                            </h4>
                            <Badge variant="outline" className="text-xs">
                              {product.marginSource === 'product' ? 'Produto' :
                               product.marginSource === 'category' ? 'Categoria' : 'Global'}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {product.suppliername} • {product.category || product.categoria}
                          </p>
                        </div>
                        
                        <div className="flex items-center gap-6 text-right">
                          <div>
                            <p className="text-sm text-muted-foreground">Custo</p>
                            <p className="font-medium">R$ {basePrice.toFixed(2)}</p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Margem</p>
                            <p className="font-medium text-blue-600">{product.marginApplied}%</p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Venda</p>
                            <p className="font-bold text-green-600">R$ {(product.salePrice || 0).toFixed(2)}</p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Lucro</p>
                            <p className="font-bold text-purple-600">R$ {profit.toFixed(2)}</p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      ) : (
        children
      )}
    </div>
  );
}