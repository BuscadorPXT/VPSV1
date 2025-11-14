import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { Star, Trophy, Users, TrendingUp, Medal, Award, Crown, Eye } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { SupplierRatingModal } from '@/components/SupplierRatingModal';
import { useAuth } from '@/hooks/use-auth';

interface RankingSupplier {
  position: number;
  id: number;
  name: string;
  averageRating: number;
  totalRatings: number;
  createdAt: string;
}

interface RankingStats {
  totalActiveSuppliers: number;
  minRatingsRequired: number;
  topRating: number;
  averageRating: number;
}

interface RankingResponse {
  success: boolean;
  data: {
    ranking: RankingSupplier[];
    stats: RankingStats;
    generatedAt: string;
  };
}

const fetchRanking = async (minRatings: number = 3, limit: number = 50): Promise<RankingResponse> => {
  const response = await fetch(`/api/ranking/suppliers?minRatings=${minRatings}&limit=${limit}`);
  if (!response.ok) {
    throw new Error('Erro ao carregar ranking');
  }
  return response.json();
};

const RankingPage: React.FC = () => {
  const { user, loading } = useAuth();
  const [location, setLocation] = useLocation();
  const [minRatings, setMinRatings] = useState(3);
  const [limit, setLimit] = useState(50);
  const [selectedSupplier, setSelectedSupplier] = useState<any>(null);
  const [isRatingModalOpen, setIsRatingModalOpen] = useState(false);

  // Always call useQuery - hooks must be called in the same order every render
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['ranking', minRatings, limit],
    queryFn: () => fetchRanking(minRatings, limit),
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: 10 * 60 * 1000, // Auto-refresh every 10 minutes
    enabled: !!user, // Only run query when user is authenticated
  });

  // Redirect to login if not authenticated
  React.useEffect(() => {
    if (!loading && !user) {
      setLocation('/login');
    }
  }, [user, loading, setLocation]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Verificando autenticação...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const getRankingIcon = (position: number) => {
    switch (position) {
      case 1:
        return <Crown className="w-6 h-6 text-yellow-500" />;
      case 2:
        return <Medal className="w-6 h-6 text-gray-400" />;
      case 3:
        return <Award className="w-6 h-6 text-amber-600" />;
      default:
        return <Trophy className="w-5 h-5 text-gray-500" />;
    }
  };

  const getRankingBadge = (position: number) => {
    switch (position) {
      case 1:
        return <Badge className="bg-yellow-500 text-white">1º Lugar</Badge>;
      case 2:
        return <Badge className="bg-gray-400 text-white">2º Lugar</Badge>;
      case 3:
        return <Badge className="bg-amber-600 text-white">3º Lugar</Badge>;
      default:
        return <Badge variant="outline">#{position}</Badge>;
    }
  };

  const renderStars = (rating: number) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 !== 0;

    for (let i = 0; i < fullStars; i++) {
      stars.push(<Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />);
    }

    if (hasHalfStar) {
      stars.push(<Star key="half" className="w-4 h-4 fill-yellow-400/50 text-yellow-400" />);
    }

    const emptyStars = 5 - Math.ceil(rating);
    for (let i = 0; i < emptyStars; i++) {
      stars.push(<Star key={`empty-${i}`} className="w-4 h-4 text-gray-300" />);
    }

    return stars;
  };

  const handleSupplierClick = (supplier: RankingSupplier) => {
    const supplierForModal = {
      id: supplier.id,
      name: supplier.name,
      averageRating: supplier.averageRating.toString(),
      ratingCount: supplier.totalRatings
    };
    setSelectedSupplier(supplierForModal);
    setIsRatingModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8 relative">
          {/* Back to Dashboard Button */}
          <div className="absolute left-0 top-0">
            <Button 
              onClick={() => setLocation('/dashboard')}
              variant="outline"
              className="flex items-center gap-2 hover:bg-blue-50 dark:hover:bg-blue-900/20"
            >
              <svg 
                className="w-4 h-4" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2} 
                  d="M10 19l-7-7m0 0l7-7m-7 7h18" 
                />
              </svg>
              Voltar ao Dashboard
            </Button>
          </div>
          
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
            🏆 Ranking de Fornecedores
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
            Descubra os fornecedores mais bem avaliados pela nossa comunidade. 
            Ranking baseado em avaliações reais de usuários verificados.
          </p>
        </div>

        {/* Stats Cards */}
        {data && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-yellow-500" />
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Fornecedores Ranqueados</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                      {data.data.stats.totalActiveSuppliers}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <Star className="w-5 h-5 text-yellow-500 fill-yellow-500" />
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Melhor Avaliação</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                      {data.data.stats.topRating.toFixed(1)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-green-500" />
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Média Geral</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                      {data.data.stats.averageRating.toFixed(1)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-blue-500" />
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Mín. Avaliações</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                      {data.data.stats.minRatingsRequired}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Mínimo de avaliações:
            </span>
            <Select value={minRatings.toString()} onValueChange={(value) => setMinRatings(parseInt(value))}>
              <SelectTrigger className="w-20">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">1+</SelectItem>
                <SelectItem value="3">3+</SelectItem>
                <SelectItem value="5">5+</SelectItem>
                <SelectItem value="10">10+</SelectItem>
                <SelectItem value="20">20+</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Mostrar:
            </span>
            <Select value={limit.toString()} onValueChange={(value) => setLimit(parseInt(value))}>
              <SelectTrigger className="w-20">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10</SelectItem>
                <SelectItem value="25">25</SelectItem>
                <SelectItem value="50">50</SelectItem>
                <SelectItem value="100">100</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button 
            onClick={() => refetch()} 
            variant="outline" 
            className="ml-auto"
            disabled={isLoading}
          >
            {isLoading ? 'Carregando...' : 'Atualizar'}
          </Button>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <Card key={i}>
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <Skeleton className="w-12 h-12 rounded-full" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-48" />
                      <Skeleton className="h-4 w-32" />
                    </div>
                    <Skeleton className="h-8 w-20" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Error State */}
        {error && (
          <Card className="border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-800">
            <CardContent className="p-6">
              <div className="text-center">
                <p className="text-red-600 dark:text-red-400 mb-4">
                  {error instanceof Error ? error.message : 'Erro ao carregar ranking'}
                </p>
                <Button onClick={() => refetch()} variant="outline">
                  Tentar novamente
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Ranking List */}
        {data && data.data.ranking.length > 0 && (
          <div className="space-y-4">
            {data.data.ranking.map((supplier) => (
              <Card 
                key={supplier.id} 
                className={`${supplier.position <= 3 ? 'border-2 border-yellow-200 bg-yellow-50 dark:bg-yellow-900/20 dark:border-yellow-800' : ''} cursor-pointer hover:shadow-lg transition-shadow`}
                onClick={() => handleSupplierClick(supplier)}
              >
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    {/* Position Icon */}
                    <div className="flex items-center justify-center w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-700">
                      {getRankingIcon(supplier.position)}
                    </div>

                    {/* Supplier Info */}
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                          {supplier.name}
                        </h3>
                        {getRankingBadge(supplier.position)}
                      </div>
                      
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-1">
                          {renderStars(supplier.averageRating)}
                          <span className="ml-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                            {supplier.averageRating.toFixed(1)}
                          </span>
                        </div>
                        
                        <div className="flex items-center gap-1 text-sm text-gray-600 dark:text-gray-400">
                          <Users className="w-4 h-4" />
                          <span>{supplier.totalRatings} avaliações</span>
                        </div>
                      </div>
                      
                      <div className="mt-2">
                        <span className="text-xs text-blue-600 dark:text-blue-400 flex items-center gap-1">
                          <Eye className="w-3 h-3" />
                          Clique para ver todas as avaliações
                        </span>
                      </div>
                    </div>

                    {/* Position Number */}
                    <div className="text-right">
                      <div className="text-3xl font-bold text-gray-400 dark:text-gray-600">
                        #{supplier.position}
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-2"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSupplierClick(supplier);
                        }}
                      >
                        <Eye className="w-4 h-4 mr-1" />
                        Ver Avaliações
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Empty State */}
        {data && data.data.ranking.length === 0 && (
          <Card>
            <CardContent className="p-12 text-center">
              <Trophy className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Nenhum fornecedor encontrado
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                Não há fornecedores com {minRatings}+ avaliações no momento.
              </p>
              <Button onClick={() => setMinRatings(1)} variant="outline">
                Reduzir filtro mínimo
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Footer Info */}
        {data && (
          <div className="mt-8 text-center text-sm text-gray-500 dark:text-gray-400">
            <p>
              Ranking atualizado em {new Date(data.data.generatedAt).toLocaleString('pt-BR')}
            </p>
            <p className="mt-1">
              Apenas fornecedores ativos com avaliações aprovadas são considerados
            </p>
          </div>
        )}
      </div>

      {/* Supplier Rating Modal */}
      {selectedSupplier && (
        <SupplierRatingModal
          isOpen={isRatingModalOpen}
          onClose={() => {
            setIsRatingModalOpen(false);
            setSelectedSupplier(null);
          }}
          supplier={selectedSupplier}
        />
      )}
    </div>
  );
};

export default RankingPage;