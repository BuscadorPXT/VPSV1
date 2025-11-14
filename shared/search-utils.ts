
export interface IPhoneMatch {
  number: string;
  variant?: string;
  pro?: string;
  size?: string;
}

export function parseIPhoneSearch(searchTerm: string): IPhoneMatch | null {
  const searchLower = searchTerm.toLowerCase().trim();
  const iphoneMatch = searchLower.match(/^iphone\s*(\d+)([a-z]*)?(\s+pro)?(\s+max|\s+plus|\s+mini)?$/i);
  
  if (!iphoneMatch) return null;
  
  return {
    number: iphoneMatch[1],
    variant: iphoneMatch[2] || '',
    pro: iphoneMatch[3] || '',
    size: iphoneMatch[4] || ''
  };
}

export function buildExactIPhonePattern(match: IPhoneMatch): string {
  let exactPattern = `^iphone\\s*${match.number}`;
  
  if (match.variant) exactPattern += match.variant;
  if (match.pro) exactPattern += '\\s*pro';
  
  if (match.size) {
    const sizeNormalized = match.size.trim().toLowerCase();
    if (sizeNormalized.includes('plus')) {
      exactPattern += '\\s*plus';
    } else if (sizeNormalized.includes('max')) {
      exactPattern += '\\s*max';
    } else if (sizeNormalized.includes('mini')) {
      exactPattern += '\\s*mini';
    }
  }
  
  // Add negative lookahead to prevent matching longer variants
  // For example: searching "iphone 15" should not match "iphone 15 pro"
  if (!match.pro && !match.size) {
    exactPattern += '(?!\\s*(pro|max|plus|mini))';
  } else if (match.pro && !match.size) {
    exactPattern += '(?!\\s*(max|plus))';
  }
  
  exactPattern += '(?:\\s|$)';
  return exactPattern;
}

export function matchesExactIPhonePattern(productModel: string, searchTerm: string): boolean {
  const iphoneMatch = parseIPhoneSearch(searchTerm);
  if (!iphoneMatch) return false;
  
  const pattern = buildExactIPhonePattern(iphoneMatch);
  const regex = new RegExp(pattern, 'i');
  
  return regex.test(productModel.toLowerCase());
}

export function isExactProductMatch(product: any, searchTerm: string): boolean {
  const productModel = (product.model || '').toLowerCase();
  const productBrand = (product.brand || '').toLowerCase();
  const productCategory = (product.category || '').toLowerCase();
  const supplierName = typeof product.supplier === 'string' ? 
    product.supplier.toLowerCase() : 
    (product.supplier?.name || product.supplierName || '').toLowerCase();

  const searchLower = searchTerm.toLowerCase().trim();

  // Check if it's an iPhone search
  const iphoneMatch = parseIPhoneSearch(searchTerm);
  if (iphoneMatch) {
    // Must be iPhone category
    if (product.category !== 'IPH' && !productModel.includes('iphone')) {
      return false;
    }

    return matchesExactIPhonePattern(product.model, searchTerm);
  }

  // Basic text search across key fields for other products
  return productModel.includes(searchLower) || 
         productBrand.includes(searchLower) || 
         productCategory.includes(searchLower) ||
         supplierName.includes(searchLower) ||
         (product.color && product.color.toLowerCase().includes(searchLower)) ||
         (product.storage && product.storage.toLowerCase().includes(searchLower));
}
