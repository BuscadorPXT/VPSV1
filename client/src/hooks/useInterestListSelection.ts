
import { useState, useMemo, useCallback } from 'react';

interface Product {
  id: number;
  supplierPrice?: number;
  createdAt: string;
  supplierName: string;
}

interface UseInterestListSelectionProps {
  products: Product[];
}

export const useInterestListSelection = ({ products }: UseInterestListSelectionProps) => {
  const [selectedProducts, setSelectedProducts] = useState<Set<number>>(new Set());

  // Estatísticas da seleção
  const selectionStats = useMemo(() => {
    const selectedItems = products.filter(product => selectedProducts.has(product.id));
    const totalValue = selectedItems.reduce((sum, item) => sum + (item.supplierPrice || 0), 0);
    const supplierCount = new Set(selectedItems.map(item => item.supplierName)).size;

    return {
      count: selectedItems.length,
      totalValue,
      supplierCount,
      averagePrice: selectedItems.length > 0 ? totalValue / selectedItems.length : 0
    };
  }, [selectedProducts, products]);

  // Verificar se todos os produtos estão selecionados
  const allSelected = useMemo(() => {
    return products.length > 0 && selectedProducts.size === products.length;
  }, [selectedProducts.size, products.length]);

  // Funções de seleção
  const selectProduct = useCallback((productId: number, selected: boolean) => {
    setSelectedProducts(prev => {
      const newSet = new Set(prev);
      if (selected) {
        newSet.add(productId);
      } else {
        newSet.delete(productId);
      }
      return newSet;
    });
  }, []);

  const selectAllProducts = useCallback((selected: boolean) => {
    if (selected) {
      setSelectedProducts(new Set(products.map(p => p.id)));
    } else {
      setSelectedProducts(new Set());
    }
  }, [products]);

  const selectSupplierProducts = useCallback((supplierProducts: Product[], selected: boolean) => {
    setSelectedProducts(prev => {
      const newSet = new Set(prev);
      supplierProducts.forEach(product => {
        if (selected) {
          newSet.add(product.id);
        } else {
          newSet.delete(product.id);
        }
      });
      return newSet;
    });
  }, []);

  const selectByCriteria = useCallback((criteria: 'cheapest' | 'expensive' | 'recent', limit = 5) => {
    let productsToSelect: number[] = [];
    
    switch (criteria) {
      case 'cheapest':
        productsToSelect = products
          .sort((a, b) => (a.supplierPrice || 0) - (b.supplierPrice || 0))
          .slice(0, limit)
          .map(item => item.id);
        break;
      case 'expensive':
        productsToSelect = products
          .sort((a, b) => (b.supplierPrice || 0) - (a.supplierPrice || 0))
          .slice(0, limit)
          .map(item => item.id);
        break;
      case 'recent':
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        productsToSelect = products
          .filter(item => new Date(item.createdAt) > weekAgo)
          .map(item => item.id);
        break;
    }
    
    setSelectedProducts(new Set(productsToSelect));
  }, [products]);

  const clearSelection = useCallback(() => {
    setSelectedProducts(new Set());
  }, []);

  const isProductSelected = useCallback((productId: number) => {
    return selectedProducts.has(productId);
  }, [selectedProducts]);

  const getSelectedProducts = useCallback(() => {
    return products.filter(product => selectedProducts.has(product.id));
  }, [products, selectedProducts]);

  return {
    selectedProducts,
    selectionStats,
    allSelected,
    selectProduct,
    selectAllProducts,
    selectSupplierProducts,
    selectByCriteria,
    clearSelection,
    isProductSelected,
    getSelectedProducts
  };
};
