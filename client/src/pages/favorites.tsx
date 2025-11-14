import { useState } from "react";
import { useFavorites, useToggleFavorite, type Favorite } from "@/hooks/useFavorites";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Heart, Search, Trash2, Package, Building2, Filter, ArrowLeft, ShoppingCart, Eye } from "lucide-react";
import { useTheme } from "@/components/theme-provider";
import { useLocation } from "wouter";
import watermarkPattern from "@/assets/watermark-pattern.png";
import watermarkPatternDark from "@/assets/watermark-pattern-dark.png";

export default function FavoritesPage() {
  const { data: favoritesData, isLoading, error } = useFavorites();
  const { removeFavorite } = useToggleFavorite();
  const { theme } = useTheme();
  const [, setLocation] = useLocation();
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("all");

  // Ensure favorites is always an array
  const favorites: Favorite[] = Array.isArray(favoritesData) ? favoritesData : [];

  const filteredFavorites = favorites.filter((fav) => {
    const metadata = fav.metadata ? JSON.parse(fav.metadata) : {};
    const searchText = `${metadata.model || ''} ${metadata.name || ''}`.toLowerCase();
    const matchesSearch = searchText.includes(searchTerm.toLowerCase());
    const matchesTab = 
      activeTab === "all" || 
      (activeTab === "products" && fav.type === "product") ||
      (activeTab === "suppliers" && fav.type === "supplier");

    return matchesSearch && matchesTab;
  });

  const productFavorites = filteredFavorites.filter(fav => fav.type === "product");
  const supplierFavorites = filteredFavorites.filter(fav => fav.type === "supplier");

  const handleRemoveFavorite = (favorite: Favorite) => {
    removeFavorite.mutate({ type: favorite.type, itemId: favorite.itemId });
  };

  const handleGoToDashboard = () => {
    setLocation('/buscador');
  };

  const handleViewProduct = (productId: string) => {
    // Navigate back to dashboard with search for this product
    setLocation(`/buscador?search=${encodeURIComponent(productId)}`);
  };

  const FavoriteCard = ({ favorite }: { favorite: Favorite }) => {
    const metadata = favorite.metadata ? JSON.parse(favorite.metadata) : {};
    const isProduct = favorite.type === "product";

    return (
      <Card className="hover:shadow-md transition-shadow duration-200">
        <CardContent className="p-4">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3 flex-1">
              <div className="p-2 rounded-lg bg-muted">
                {isProduct ? (
                  <Package className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-sm mb-1 truncate">
                  {isProduct ? metadata.model : metadata.name}
                </h3>
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="outline" className="text-xs">
                    {isProduct ? "Produto" : "Fornecedor"}
                  </Badge>
                  {isProduct && metadata.supplier && (
                    <span className="text-xs text-muted-foreground">
                      {metadata.supplier}
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  Salvo em {new Date(favorite.createdAt).toLocaleDateString('pt-BR')}
                </p>
              </div>
            </div>
            {/* Actions */}
            <div className="flex items-center gap-2">
              {isProduct && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleViewProduct(metadata.model || favorite.itemId)}
                  className="h-8 w-8 text-muted-foreground hover:text-blue-500"
                  title="Ver produto no dashboard"
                >
                  <Eye className="h-4 w-4" />
                </Button>
              )}

              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-red-500"
                    title="Remover dos favoritos"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Remover dos favoritos</AlertDialogTitle>
                    <AlertDialogDescription>
                      Tem certeza que deseja remover "{metadata.model || metadata.name || 'este item'}" dos seus favoritos?
                      Esta ação não pode ser desfeita.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => handleRemoveFavorite(favorite)}
                      className="bg-red-600 hover:bg-red-700"
                    >
                      Remover
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="p-6 text-center">
            <div className="text-red-500 mb-2">
              <Heart className="h-12 w-12 mx-auto" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Erro ao carregar favoritos</h3>
            <p className="text-muted-foreground">
              Não foi possível carregar seus favoritos. Tente novamente.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="dashboard-container watermark-pattern-main min-h-screen bg-background relative">
      <div className="container mx-auto p-6 relative z-10">
        <div className="mb-6">
          {/* Header with navigation */}
          <div className="flex items-center justify-between mb-6">
            <Button 
              variant="ghost" 
              size="sm"
              onClick={handleGoToDashboard}
              className="text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar ao Dashboard
            </Button>
            <Button 
              onClick={handleGoToDashboard}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <ShoppingCart className="h-4 w-4 mr-2" />
              Ver Produtos
            </Button>
          </div>

          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-lg bg-red-100 dark:bg-red-900">
              <Heart className="h-6 w-6 text-red-500" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Meus Favoritos</h1>
              <p className="text-muted-foreground">
                Gerencie seus produtos e fornecedores favoritos
              </p>
            </div>
          </div>

          {/* Search and Filter */}
          <div className="flex flex-col sm:flex-row gap-4 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar nos favoritos..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                {filteredFavorites.length} de {favorites.length} favoritos
              </span>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total</p>
                    <p className="text-2xl font-bold">{favorites.length}</p>
                  </div>
                  <Heart className="h-8 w-8 text-red-500" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Produtos</p>
                    <p className="text-2xl font-bold text-blue-600">
                      {favorites.filter(f => f.type === "product").length}
                    </p>
                  </div>
                  <Package className="h-8 w-8 text-blue-500" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Fornecedores</p>
                    <p className="text-2xl font-bold text-green-600">
                      {favorites.filter(f => f.type === "supplier").length}
                    </p>
                  </div>
                  <Building2 className="h-8 w-8 text-green-500" />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3 mb-6">
            <TabsTrigger value="all">
              Todos ({favorites.length})
            </TabsTrigger>
            <TabsTrigger value="products">
              Produtos ({favorites.filter(f => f.type === "product").length})
            </TabsTrigger>
            <TabsTrigger value="suppliers">
              Fornecedores ({favorites.filter(f => f.type === "supplier").length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="all">
            {isLoading ? (
              <div className="grid gap-4">
                {[...Array(6)].map((_, i) => (
                  <Card key={i}>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <Skeleton className="h-10 w-10 rounded-lg" />
                        <div className="flex-1">
                          <Skeleton className="h-4 w-3/4 mb-2" />
                          <Skeleton className="h-3 w-1/2" />
                        </div>
                        <Skeleton className="h-8 w-8" />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : filteredFavorites.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <Heart className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">
                    {searchTerm ? "Nenhum resultado encontrado" : "Nenhum favorito ainda"}
                  </h3>
                  <p className="text-muted-foreground mb-4">
                    {searchTerm 
                      ? "Tente ajustar sua busca ou filtros."
                      : "Comece a favoritar produtos e fornecedores para vê-los aqui."
                    }
                  </p>
                  {!searchTerm && (
                    <Button onClick={handleGoToDashboard}>
                      Explorar Produtos
                    </Button>
                  )}
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {filteredFavorites.map((favorite) => (
                  <FavoriteCard key={favorite.id} favorite={favorite} />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="products">
            {productFavorites.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <Package className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Nenhum produto favoritado</h3>
                  <p className="text-muted-foreground">
                    Favorite alguns produtos para vê-los aqui.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {productFavorites.map((favorite) => (
                  <FavoriteCard key={favorite.id} favorite={favorite} />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="suppliers">
            {supplierFavorites.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <Building2 className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Nenhum fornecedor favoritado</h3>
                  <p className="text-muted-foreground">
                    Favorite alguns fornecedores para vê-los aqui.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {supplierFavorites.map((favorite) => (
                  <FavoriteCard key={favorite.id} favorite={favorite} />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}