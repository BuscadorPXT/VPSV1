import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from '@/components/ui/dialog';
import { 
  Trash2, 
  Plus, 
  Calculator, 
  Percent, 
  Package, 
  Tags, 
  Globe,
  AlertCircle,
  CheckCircle2
} from 'lucide-react';
import { useProfitMargins } from '@/hooks/useProfitMargins';
import { useToast } from '@/hooks/use-toast';

interface ProfitMarginsConfigProps {
  userId: string;
  products?: any[];
}

export function ProfitMarginsConfig({ userId, products = [] }: ProfitMarginsConfigProps) {
  // Sistema de margens bloqueado - funcionalidade em desenvolvimento
  const isSystemAvailable = false; // Sempre bloqueado
  
  if (!isSystemAvailable) {
    return (
      <Card className="border-2 border-orange-200 bg-orange-50 dark:bg-orange-950/20">
        <CardContent className="p-8 text-center">
          <div className="flex flex-col items-center gap-4">
            <div className="p-3 bg-orange-100 dark:bg-orange-900/50 rounded-full">
              <Calculator className="h-8 w-8 text-orange-600" />
            </div>
            <div className="space-y-2">
              <h3 className="text-lg font-semibold text-orange-800 dark:text-orange-200">
                Sistema de Margens de Lucro
              </h3>
              <p className="text-orange-700 dark:text-orange-300 max-w-md">
                Esta funcionalidade está em desenvolvimento e não está disponível para uso.
              </p>
              <div className="mt-4 p-3 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
                <p className="text-sm text-orange-600 dark:text-orange-400">
                  🚧 Status: Em Desenvolvimento
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }
  const { toast } = useToast();
  const [newMarginType, setNewMarginType] = useState<'global' | 'category' | 'product'>('global');
  const [newMarginValue, setNewMarginValue] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedProductId, setSelectedProductId] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const {
    globalMargin,
    categoryMargins,
    productMargins,
    isLoading,
    hasError,
    createMargin,
    removeCategoryMargin,
    removeProductMargin,
    calculatePrices,
    extractCategories,
    isCreating,
    isRemoving,
    isCalculating,
    calculateResult,
    extractCategoriesResult,
    createError,
    removeError,
    calculateError
  } = useProfitMargins(userId);

  // Extrair categorias únicas dos produtos
  const availableCategories = React.useMemo(() => {
    const categories = new Set<string>();
    products.forEach(product => {
      const category = product.category || product.categoria;
      if (category && typeof category === 'string' && category.trim()) {
        categories.add(category.trim());
      }
    });
    return Array.from(categories).sort();
  }, [products]);

  // Produtos únicos para seleção
  const availableProducts = React.useMemo(() => {
    const uniqueProducts = new Map();
    products.forEach(product => {
      const id = product.id || `${product.model}-${product.brand}-${product.storage}`;
      const key = `${product.model || 'Unknown'}-${product.brand || ''}-${product.storage || ''}`;
      
      if (!uniqueProducts.has(key)) {
        uniqueProducts.set(key, {
          id,
          model: product.model || 'Unknown',
          brand: product.brand || '',
          storage: product.storage || '',
          category: product.category || product.categoria || ''
        });
      }
    });
    return Array.from(uniqueProducts.values()).sort((a, b) => 
      `${a.model} ${a.brand} ${a.storage}`.localeCompare(`${b.model} ${b.brand} ${b.storage}`)
    );
  }, [products]);

  const handleCreateMargin = () => {
    if (!newMarginValue || isNaN(Number(newMarginValue))) {
      toast({
        title: "Erro",
        description: "Digite uma margem válida",
        variant: "destructive"
      });
      return;
    }

    const marginPercentage = Number(newMarginValue);
    if (marginPercentage < 0 || marginPercentage > 1000) {
      toast({
        title: "Erro", 
        description: "A margem deve estar entre 0% e 1000%",
        variant: "destructive"
      });
      return;
    }

    const requestData: any = {
      type: newMarginType,
      marginPercentage
    };

    if (newMarginType === 'category') {
      if (!selectedCategory) {
        toast({
          title: "Erro",
          description: "Selecione uma categoria",
          variant: "destructive"
        });
        return;
      }
      requestData.categoryName = selectedCategory;
    } else if (newMarginType === 'product') {
      if (!selectedProductId) {
        toast({
          title: "Erro", 
          description: "Selecione um produto",
          variant: "destructive"
        });
        return;
      }
      requestData.productId = selectedProductId;
    }

    createMargin(requestData, {
      onSuccess: () => {
        toast({
          title: "Sucesso",
          description: `Margem ${newMarginType === 'global' ? 'global' : 
                       newMarginType === 'category' ? 'da categoria' : 'do produto'} definida com sucesso`,
        });
        setNewMarginValue('');
        setSelectedCategory('');
        setSelectedProductId('');
        setIsDialogOpen(false);
      },
      onError: (error) => {
        toast({
          title: "Erro",
          description: `Erro ao definir margem: ${error.message}`,
          variant: "destructive"
        });
      }
    });
  };

  const handleRemoveMargin = (type: 'category' | 'product', identifier: string) => {
    if (type === 'category') {
      removeCategoryMargin(identifier, {
        onSuccess: () => {
          toast({
            title: "Sucesso",
            description: "Margem da categoria removida"
          });
        },
        onError: (error) => {
          toast({
            title: "Erro",
            description: `Erro ao remover margem: ${error.message}`,
            variant: "destructive"
          });
        }
      });
    } else {
      removeProductMargin(identifier, {
        onSuccess: () => {
          toast({
            title: "Sucesso", 
            description: "Margem do produto removida"
          });
        },
        onError: (error) => {
          toast({
            title: "Erro",
            description: `Erro ao remover margem: ${error.message}`,
            variant: "destructive"
          });
        }
      });
    }
  };

  const handleCalculatePrices = () => {
    if (!products.length) {
      toast({
        title: "Aviso",
        description: "Nenhum produto disponível para cálculo",
        variant: "destructive"
      });
      return;
    }

    calculatePrices({ products }, {
      onSuccess: (result) => {
        toast({
          title: "Sucesso",
          description: `${result.summary.totalCalculated} preços calculados com sucesso`
        });
      },
      onError: (error) => {
        toast({
          title: "Erro",
          description: `Erro ao calcular preços: ${error.message}`,
          variant: "destructive"
        });
      }
    });
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center space-x-2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
            <span>Carregando configurações de margem...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Mostrar interface mesmo se houver erro, mas com dados padrão
  const showWarning = hasError && !globalMargin && !categoryMargins?.length && !productMargins?.length;

  return (
    <div className="space-y-6">
      {showWarning && (
        <Alert className="bg-yellow-50 border-yellow-200">
          <AlertCircle className="h-4 w-4 text-yellow-600" />
          <AlertDescription className="text-yellow-800">
            Carregando configurações de margem... Alguns dados podem não estar disponíveis temporariamente.
          </AlertDescription>
        </Alert>
      )}
      
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            Configuração de Margens de Lucro
          </CardTitle>
          <CardDescription>
            Configure suas margens de lucro por categoria, produto específico ou margem global padrão
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button className="flex items-center gap-2">
                  <Plus className="h-4 w-4" />
                  Nova Margem
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Adicionar Nova Margem</DialogTitle>
                  <DialogDescription>
                    Configure uma nova margem de lucro
                  </DialogDescription>
                </DialogHeader>
                
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="marginType">Tipo de Margem</Label>
                    <Select value={newMarginType} onValueChange={(value: any) => setNewMarginType(value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o tipo" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="global">
                          <div className="flex items-center gap-2">
                            <Globe className="h-4 w-4" />
                            Margem Global (Padrão)
                          </div>
                        </SelectItem>
                        <SelectItem value="category">
                          <div className="flex items-center gap-2">
                            <Tags className="h-4 w-4" />
                            Por Categoria
                          </div>
                        </SelectItem>
                        <SelectItem value="product">
                          <div className="flex items-center gap-2">
                            <Package className="h-4 w-4" />
                            Produto Específico
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {newMarginType === 'category' && (
                    <div>
                      <Label htmlFor="category">Categoria</Label>
                      <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione uma categoria" />
                        </SelectTrigger>
                        <SelectContent>
                          {availableCategories.map(category => (
                            <SelectItem key={category} value={category}>
                              {category}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {newMarginType === 'product' && (
                    <div>
                      <Label htmlFor="product">Produto</Label>
                      <Select value={selectedProductId} onValueChange={setSelectedProductId}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione um produto" />
                        </SelectTrigger>
                        <SelectContent>
                          {availableProducts.map(product => (
                            <SelectItem key={product.id} value={product.id}>
                              {`${product.model} ${product.brand} ${product.storage}`}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  <div>
                    <Label htmlFor="marginValue">Margem de Lucro (%)</Label>
                    <div className="relative">
                      <Input
                        id="marginValue"
                        type="number"
                        step="0.1"
                        min="0"
                        max="1000"
                        value={newMarginValue}
                        onChange={(e) => setNewMarginValue(e.target.value)}
                        placeholder="Ex: 15.5"
                        className="pr-8"
                      />
                      <Percent className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    </div>
                  </div>
                </div>

                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button onClick={handleCreateMargin} disabled={isCreating}>
                    {isCreating ? "Salvando..." : "Salvar"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <Button 
              variant="outline" 
              onClick={handleCalculatePrices}
              disabled={isCalculating || !products.length}
              className="flex items-center gap-2"
            >
              <Calculator className="h-4 w-4" />
              {isCalculating ? "Calculando..." : "Calcular Preços"}
            </Button>
          </div>

          {calculateResult && (
            <Alert className="mt-4">
              <CheckCircle2 className="h-4 w-4" />
              <AlertDescription>
                <strong>Cálculo Concluído:</strong> {calculateResult.summary.totalCalculated} produtos calculados.
                Margem média: {calculateResult.summary.averageMargin.toFixed(1)}%
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      <Tabs defaultValue="global" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="global" className="flex items-center gap-2">
            <Globe className="h-4 w-4" />
            Global
          </TabsTrigger>
          <TabsTrigger value="categories" className="flex items-center gap-2">
            <Tags className="h-4 w-4" />
            Categorias ({categoryMargins.length})
          </TabsTrigger>
          <TabsTrigger value="products" className="flex items-center gap-2">
            <Package className="h-4 w-4" />
            Produtos ({productMargins.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="global">
          <Card>
            <CardHeader>
              <CardTitle>Margem Global Padrão</CardTitle>
              <CardDescription>
                Esta margem será aplicada a todos os produtos que não possuem configuração específica
              </CardDescription>
            </CardHeader>
            <CardContent>
              {globalMargin ? (
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <Globe className="h-5 w-5 text-primary" />
                    <div>
                      <p className="font-medium">Margem Global</p>
                      <p className="text-sm text-muted-foreground">
                        Aplicada a todos os produtos sem configuração específica
                      </p>
                    </div>
                  </div>
                  <Badge variant="secondary" className="text-lg font-bold">
                    {globalMargin.marginPercentage}%
                  </Badge>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Globe className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Nenhuma margem global configurada</p>
                  <p className="text-sm">Configure uma margem padrão para todos os produtos</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="categories">
          <Card>
            <CardHeader>
              <CardTitle>Margens por Categoria</CardTitle>
              <CardDescription>
                Configure margens específicas para cada categoria de produto
              </CardDescription>
            </CardHeader>
            <CardContent>
              {categoryMargins.length > 0 ? (
                <div className="space-y-2">
                  {categoryMargins.map((margin: any) => (
                    <div key={margin.categoryName} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <Tags className="h-5 w-5 text-primary" />
                        <div>
                          <p className="font-medium">{margin.categoryName}</p>
                          <p className="text-sm text-muted-foreground">Categoria</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge variant="secondary" className="text-lg font-bold">
                          {margin.marginPercentage}%
                        </Badge>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleRemoveMargin('category', margin.categoryName)}
                          disabled={isRemoving}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Tags className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Nenhuma margem por categoria configurada</p>
                  <p className="text-sm">Configure margens específicas para categorias de produtos</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="products">
          <Card>
            <CardHeader>
              <CardTitle>Margens por Produto</CardTitle>
              <CardDescription>
                Configure margens específicas para produtos individuais (maior prioridade)
              </CardDescription>
            </CardHeader>
            <CardContent>
              {productMargins.length > 0 ? (
                <div className="space-y-2">
                  {productMargins.map((margin: any) => {
                    const product = availableProducts.find(p => p.id === margin.productId);
                    return (
                      <div key={margin.productId} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex items-center gap-3">
                          <Package className="h-5 w-5 text-primary" />
                          <div>
                            <p className="font-medium">
                              {product ? `${product.model} ${product.brand} ${product.storage}` : margin.productId}
                            </p>
                            <p className="text-sm text-muted-foreground">Produto específico</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <Badge variant="secondary" className="text-lg font-bold">
                            {margin.marginPercentage}%
                          </Badge>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleRemoveMargin('product', margin.productId)}
                            disabled={isRemoving}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Nenhuma margem por produto configurada</p>
                  <p className="text-sm">Configure margens específicas para produtos individuais</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}