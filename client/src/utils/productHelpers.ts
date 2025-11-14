import { Product } from '../types/productTypes';

export function buildFilterOptions(products: Product[], field: keyof Product): Array<{ value: string; label: string }> {
  if (!products || products.length === 0) return [];

  const values = new Set<string>();
  
  products.forEach((product) => {
    let value = product[field];
    
    // Handle special cases for different field types
    if (field === 'supplier') {
      if (typeof value === 'string') {
        values.add(value);
      } else if (typeof value === 'object' && value?.name) {
        values.add(value.name);
      }
    } else if (value && typeof value === 'string') {
      values.add(value);
    } else if (value && typeof value !== 'object') {
      values.add(String(value));
    }
  });

  return Array.from(values)
    .filter(Boolean)
    .sort()
    .map(value => ({ value, label: value }));
}

export function getStorageBadgeColor(storage: string): string {
  const normalized = storage.toLowerCase();
  
  if (normalized.includes('128')) return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
  if (normalized.includes('256')) return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
  if (normalized.includes('512')) return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
  if (normalized.includes('1tb') || normalized.includes('1000')) return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300';
  if (normalized.includes('2tb') || normalized.includes('2000')) return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
  
  return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
}

export function formatPrice(price: number | string): string {
  const numPrice = typeof price === 'number' ? price : parseFloat(String(price).replace(/[^\d.-]/g, ''));
  
  if (isNaN(numPrice)) return 'R$ 0,00';
  
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(numPrice);
}

export function formatDate(date: string | Date): string {
  if (!date) return '';
  
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  if (isNaN(dateObj.getTime())) return '';
  
  return new Intl.DateTimeFormat('pt-BR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  }).format(dateObj);
}

export function parsePrice(price: string | number): number {
  if (typeof price === 'number') return price;
  
  const cleaned = String(price)
    .replace(/[^\d,.-]/g, '') // Remove everything except digits, comma, dot, minus
    .replace(',', '.'); // Replace comma with dot for decimal
  
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : parsed;
}

export function calculateLowestPricesInProducts<T extends { price: string | number; isLowestPrice?: boolean }>(products: T[]): T[] {
  if (!products || products.length === 0) {
    console.log('🏷️ calculateLowestPrices: No products provided');
    return products;
  }

  // Find the minimum price among all products
  const prices = products.map(product => {
    const priceValue = typeof product.price === 'number' 
      ? product.price 
      : parseFloat(String(product.price).replace(/[^\d.,]/g, '').replace(',', '.'));
    return isNaN(priceValue) ? Infinity : priceValue;
  });
  
  const minPrice = Math.min(...prices);
  console.log('🏷️ calculateLowestPrices:', {
    totalProducts: products.length,
    minPrice: minPrice,
    allPrices: prices.slice(0, 5) // Show first 5 prices
  });

  // Update isLowestPrice property for all products
  const result = products.map((product, index) => {
    const priceValue = typeof product.price === 'number' 
      ? product.price 
      : parseFloat(String(product.price).replace(/[^\d.,]/g, '').replace(',', '.'));
    
    const isLowest = !isNaN(priceValue) && Math.abs(priceValue - minPrice) < 0.01;
    
    return {
      ...product,
      isLowestPrice: isLowest
    };
  });

  const lowestCount = result.filter(p => p.isLowestPrice).length;
  console.log('🏷️ calculateLowestPrices result:', {
    productsWithLowestPrice: lowestCount
  });

  return result;
}

export function getProductKey(product: Product): string {
  return `${product.model}-${product.brand}-${product.storage}-${product.color}`.toLowerCase().trim();
}

export function isValidProduct(product: Product): boolean {
  return !!(
    product &&
    product.model &&
    product.brand &&
    product.price !== undefined &&
    product.price !== null
  );
}