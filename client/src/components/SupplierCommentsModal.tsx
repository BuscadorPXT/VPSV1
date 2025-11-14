import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Star, MessageCircle, User, Calendar, X } from 'lucide-react';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { StarRating } from './ui/star-rating';

interface SupplierCommentsModalProps {
  isOpen: boolean;
  onClose: () => void;
  supplier: {
    id: number;
    name: string;
    averageRating?: number;
    ratingCount?: number;
  };
}

interface RatingComment {
  id: number;
  rating: number;
  comment: string;
  createdAt: string;
  user: {
    id: number;
  };
}

export function SupplierCommentsModal({ isOpen, onClose, supplier }: SupplierCommentsModalProps) {
  const { data: commentsResponse, isLoading } = useQuery({
    queryKey: ['supplier-ratings', supplier.id],
    queryFn: async () => {
      const response = await fetch(`/api/suppliers/${supplier.id}/ratings?limit=50`);
      if (!response.ok) {
        throw new Error('Erro ao carregar comentários');
      }
      const data = await response.json();
      return data.data || { ratings: [], supplier: null };
    },
    enabled: isOpen && supplier.id > 0,
  });

  const comments = commentsResponse?.ratings || [];
  const supplierData = commentsResponse?.supplier || supplier;
  
  // Separar avaliações com e sem comentários
  const commentsWithText = comments.filter(comment => comment.comment && comment.comment.trim().length > 0);
  const ratingsOnly = comments.filter(comment => !comment.comment || comment.comment.trim().length === 0);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5 text-blue-600" />
            Avaliações e Comentários
          </DialogTitle>
          <DialogDescription>
            Confira o que outros usuários falam sobre <strong>{supplier.name}</strong>
          </DialogDescription>
        </DialogHeader>

        {/* Supplier Summary */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
          <div className="flex flex-col items-center space-y-3">
            <h3 className="font-semibold text-lg text-center">{supplierData.name}</h3>
            {supplierData.averageRating && supplierData.averageRating > 0 ? (
              <div className="flex flex-col items-center gap-2">
                <StarRating 
                  rating={parseFloat(supplierData.averageRating)} 
                  readonly 
                  size="lg" 
                  className="justify-center"
                />
                <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                  <span>{parseFloat(supplierData.averageRating).toFixed(1)} estrelas</span>
                  <span>•</span>
                  <span>{supplierData.ratingCount || comments.length} avaliações</span>
                </div>
              </div>
            ) : (
              <p className="text-gray-600 dark:text-gray-400">Sem avaliações ainda</p>
            )}
          </div>
        </div>

        {/* Comments and Ratings Sections */}
        <div className="space-y-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : comments.length === 0 ? (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              <MessageCircle className="h-16 w-16 mx-auto mb-4 text-gray-300 dark:text-gray-600" />
              <p className="text-lg font-medium mb-2">Nenhuma avaliação ainda</p>
              <p className="text-sm">Seja o primeiro a avaliar este fornecedor!</p>
            </div>
          ) : (
            <>
              {/* Comments with text */}
              {commentsWithText.length > 0 && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold text-lg flex items-center gap-2">
                      <MessageCircle className="h-5 w-5 text-blue-600" />
                      Comentários ({commentsWithText.length})
                    </h4>
                    <Badge variant="outline" className="text-xs">
                      Apenas comentários aprovados
                    </Badge>
                  </div>
                  
                  <div className="space-y-4">
                    {commentsWithText.map((comment) => (
                      <div key={comment.id} className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700 shadow-sm">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30">
                              <User className="h-5 w-5 text-blue-600" />
                            </div>
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-medium text-sm">Usuário #{comment.user.id}</span>
                                <StarRating 
                                  rating={comment.rating} 
                                  readonly 
                                  size="sm" 
                                />
                              </div>
                              <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                                <Calendar className="h-3 w-3" />
                                {format(new Date(comment.createdAt), 'dd/MM/yyyy', { locale: ptBR })}
                              </div>
                            </div>
                          </div>
                          <Badge variant="outline" className="text-xs">
                            {comment.rating} estrelas
                          </Badge>
                        </div>
                        
                        <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                          {comment.comment}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Ratings without comments */}
              {ratingsOnly.length > 0 && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold text-lg flex items-center gap-2">
                      <Star className="h-5 w-5 text-yellow-500" />
                      Outras Avaliações ({ratingsOnly.length})
                    </h4>
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {ratingsOnly.map((rating) => (
                      <div key={rating.id} className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
                        <div className="flex flex-col items-center space-y-2">
                          <StarRating 
                            rating={rating.rating} 
                            readonly 
                            size="sm" 
                            className="justify-center"
                          />
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            {format(new Date(rating.createdAt), 'dd/MM', { locale: ptBR })}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Close Button */}
        <div className="flex justify-end mt-6">
          <Button variant="outline" onClick={onClose} className="flex items-center gap-2">
            <X className="h-4 w-4" />
            Fechar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}