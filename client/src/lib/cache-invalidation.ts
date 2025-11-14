import { queryClient } from './queryClient';

/**
 * Utilitário para invalidação de cache relacionado a avaliações e fornecedores
 */
export class CacheInvalidation {

  /**
   * Invalida todos os caches relacionados a avaliações e fornecedores
   * Usado após aprovação/rejeição de avaliações pelo admin
   */
  static invalidateRatingsCache() {
    console.log('🔄 [CacheInvalidation] Invalidando cache completo de avaliações...');

    // Admin ratings
    queryClient.invalidateQueries({ queryKey: ['/api/admin/ratings'] });

    // Supplier data and ratings
    queryClient.invalidateQueries({ queryKey: ['/api/suppliers'] });
    queryClient.invalidateQueries({ queryKey: ['/api/products'] });
    queryClient.invalidateQueries({ queryKey: ['/api/search'] });

    // Specific supplier ratings (using predicate for pattern matching)
    queryClient.invalidateQueries({ 
      predicate: (query) => {
        const queryKey = query.queryKey[0] as string;
        return queryKey?.startsWith('/api/suppliers/') && 
               (queryKey.includes('/ratings') || queryKey.includes('/user-rating'));
      }
    });

    console.log('✅ [CacheInvalidation] Cache de avaliações invalidado com sucesso');
  }

  /**
   * Invalida cache para um fornecedor específico
   * Usado após envio de nova avaliação
   */
  static invalidateSupplierCache(supplierId: number) {
    console.log(`🔄 [CacheInvalidation] Invalidando cache do fornecedor ${supplierId}...`);

    // Admin ratings (pode ter nova avaliação pendente)
    queryClient.invalidateQueries({ queryKey: ['/api/admin/ratings'] });

    // Specific supplier
    queryClient.invalidateQueries({ queryKey: [`/api/suppliers/${supplierId}/ratings`] });
    queryClient.invalidateQueries({ queryKey: [`/api/suppliers/${supplierId}/user-rating`] });

    // General supplier lists (pode ter mudança de rating médio após aprovação)
    queryClient.invalidateQueries({ queryKey: ['/api/suppliers'] });
    queryClient.invalidateQueries({ queryKey: ['/api/products'] });

    console.log(`✅ [CacheInvalidation] Cache do fornecedor ${supplierId} invalidado`);
  }

  /**
   * Invalida apenas caches administrativos
   * Usado para atualizações que afetam apenas o painel admin
   */
  static invalidateAdminCache() {
    console.log('🔄 [CacheInvalidation] Invalidando cache administrativo...');

    queryClient.invalidateQueries({ queryKey: ['/api/admin/ratings'] });
    queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
    queryClient.invalidateQueries({ queryKey: ['/api/admin/pending-users'] });
    queryClient.invalidateQueries({ queryKey: ['/api/admin/stats'] });

    console.log('✅ [CacheInvalidation] Cache administrativo invalidado');
  }

  /**
   * Força refresh completo de todos os caches
   * Usado como último recurso ou após mudanças estruturais
   */
  static forceRefreshAll() {
    console.log('🔄 [CacheInvalidation] FORÇA REFRESH COMPLETO - Invalidando TODOS os caches...');

    queryClient.clear();

    console.log('✅ [CacheInvalidation] TODOS os caches foram limpos');
  }
}

// I'm inserting the invalidateSuppliers function here as it seems to be a related utility
export const invalidateSuppliers = (queryClient: any) => {
  // 🎯 CORREÇÃO: Invalidar a chave correta que busca os produtos com dados de fornecedores
  queryClient.invalidateQueries({ queryKey: ['/api/products'] });

  // Também invalidar outras queries relacionadas a fornecedores
  queryClient.invalidateQueries({ queryKey: ['suppliers'] });
  queryClient.invalidateQueries({ queryKey: ['supplier-contacts'] });
  queryClient.invalidateQueries({ queryKey: ['supplier-ratings'] });

  console.log('🔄 Cache invalidado para fornecedores - chave principal: ["/api/products"]');
};

export const invalidateSupplierRatings = (supplierId?: number) => {
  console.log('🔄 Invalidating supplier ratings cache...');

  // Invalidate all products data since ratings affect the product list
  queryClient.invalidateQueries({ 
    queryKey: ['products'],
    exact: false 
  });

  // Force refetch of all sheets data
  queryClient.invalidateQueries({ 
    queryKey: ['sheetsData'],
    exact: false 
  });

  // Invalidate supplier-specific data if supplierId provided
  if (supplierId) {
    queryClient.invalidateQueries({ 
      queryKey: ['supplier', supplierId],
      exact: false 
    });

    queryClient.invalidateQueries({ 
      queryKey: ['ratings', supplierId],
      exact: false 
    });
  }

  // Force refetch all supplier data
  queryClient.invalidateQueries({ 
    queryKey: ['suppliers'],
    exact: false 
  });

  // Force immediate refetch to ensure fresh data
  console.log('🔄 Force refetching products after rating update...');
  queryClient.refetchQueries({ 
    queryKey: ['products'],
    exact: false 
  });
  queryClient.refetchQueries({ 
    queryKey: ['sheetsData'],
    exact: false 
  });

  console.log('✅ Supplier ratings cache invalidated');
};