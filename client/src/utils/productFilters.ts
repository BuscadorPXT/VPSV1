import { Product, FilterState } from '../types/productTypes';

export function filteredProducts(products: Product[], filters: FilterState): Product[] {
  if (!products || products.length === 0) return [];

  return products.filter((product) => {
    // Search filter
    if (filters.search && filters.search.trim()) {
      const searchTerm = filters.search.toLowerCase().trim();
      const searchableFields = [
        product.model,
        product.brand,
        product.color,
        product.storage,
        product.category,
        product.capacity,
        product.region,
        typeof product.supplier === 'string' ? product.supplier : product.supplier?.name || '',
        product.supplierName
      ].filter(Boolean);

      const matchesSearch = searchableFields.some(field => 
        field && field.toString().toLowerCase().includes(searchTerm)
      );

      if (!matchesSearch) return false;
    }

    // Date filter
    if (filters.date && filters.date !== 'all' && product.date) {
      if (product.date !== filters.date) return false;
    }

    // Suppliers filter
    if (filters.suppliers && filters.suppliers.length > 0) {
      const productSupplier = typeof product.supplier === 'string' ? product.supplier : 
        product.supplier?.name || product.supplierName || '';
      if (!filters.suppliers.includes(productSupplier)) return false;
    }

    // Categories filter
    if (filters.categories && filters.categories.length > 0) {
      if (!product.category || !filters.categories.includes(product.category)) return false;
    }

    // Colors filter
    if (filters.colors && filters.colors.length > 0) {
      if (!product.color || !filters.colors.includes(product.color)) return false;
    }

    // Storage filter
    if (filters.storages && filters.storages.length > 0) {
      if (!product.storage || !filters.storages.includes(product.storage)) return false;
    }

    // Regions filter
    if (filters.regions && filters.regions.length > 0) {
      if (!product.region || !filters.regions.includes(product.region)) return false;
    }

    // Capacity filter
    if (filters.capacity && filters.capacity.length > 0) {
      if (!product.capacity || !filters.capacity.includes(product.capacity)) return false;
    }

    // Supplier ID filter
    if (filters.supplierId && filters.supplierId !== 'all') {
      const productSupplier = typeof product.supplier === 'string' ? product.supplier : 
        product.supplier?.name || product.supplierName || '';
      if (productSupplier !== filters.supplierId) return false;
    }

    // Supplier IDs filter
    if (filters.supplierIds && filters.supplierIds.length > 0) {
      const productSupplierId = typeof product.supplier === 'object' && product.supplier?.id ?
        product.supplier.id : null;
      if (!productSupplierId || !filters.supplierIds.includes(productSupplierId)) return false;
    }

    // Brand category filter
    if (filters.brandCategory && filters.brandCategory !== 'all') {
      if (product.brand !== filters.brandCategory) return false;
    }

    return true;
  });
}