import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from './use-toast';
import { getAuthHeaders } from '@/lib/auth-api';

export const useInterestList = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const addToInterestList = useMutation({
    mutationFn: async (productData: {
      productModel: string;
      productBrand: string;
      productStorage: string;
      productColor: string;
      productCategory?: string;
      productCapacity?: string;
      productRegion?: string;
      supplierName: string;
      supplierPrice: number;
      quantity?: number;
      dateAdded: string;
    }) => {
      console.log('🎯 [INTEREST-LIST] Starting add to interest list:', productData);

      try {
        const headers = await getAuthHeaders();
        console.log('🔑 [INTEREST-LIST] Headers obtained, making request');

        const response = await fetch('/api/interest-list', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...headers,
          },
          credentials: 'include',
          body: JSON.stringify(productData),
        });

        console.log('📡 [INTEREST-LIST] Response status:', response.status);

        if (!response.ok) {
          const errorText = await response.text();
          console.error('❌ [INTEREST-LIST] Request failed:', {
            status: response.status,
            statusText: response.statusText,
            errorText
          });

          let errorMessage = 'Erro ao adicionar à lista';
          try {
            const error = JSON.parse(errorText);
            errorMessage = error.message || errorMessage;
          } catch (parseError) {
            console.warn('Failed to parse error response:', parseError);
            errorMessage = errorText || errorMessage;
          }

          throw new Error(errorMessage);
        }

        const result = await response.json();
        console.log('✅ [INTEREST-LIST] Product added successfully:', result);
        return result;
      } catch (error) {
        console.error('❌ [INTEREST-LIST] Error in addToInterestList:', error);
        throw error;
      }

      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Produto adicionado",
        description: "Produto adicionado à lista de interesses com sucesso",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/interest-list'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const removeFromInterestList = useMutation({
    mutationFn: async (productId: number) => {
      const headers = await getAuthHeaders();
      const response = await fetch(`/api/interest-list/${productId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          ...headers,
        },
        credentials: 'include',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Erro ao remover da lista');
      }

      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Produto removido",
        description: "Produto removido da lista de interesses",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/interest-list'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const clearInterestList = useMutation({
    mutationFn: async () => {
      const headers = await getAuthHeaders();
      const response = await fetch('/api/interest-list', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          ...headers,
        },
        credentials: 'include',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Erro ao limpar lista');
      }

      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Lista limpa",
        description: "Todos os produtos foram removidos da lista",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/interest-list'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateQuantity = useMutation({
    mutationFn: async ({ itemId, quantity }: { itemId: number; quantity: number }) => {
      const headers = await getAuthHeaders();
      const response = await fetch(`/api/interest-list/${itemId}/quantity`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...headers,
        },
        credentials: 'include',
        body: JSON.stringify({ quantity }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Erro ao atualizar quantidade');
      }

      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Quantidade atualizada",
        description: "Quantidade do produto atualizada com sucesso",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/interest-list'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return {
    addToInterestList,
    removeFromInterestList,
    clearInterestList,
    updateQuantity,
  };
};