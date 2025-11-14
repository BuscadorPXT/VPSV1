// Tipos para o sistema de margem de lucro - Frontend
export interface ProfitMarginConfig {
  id: number;
  userId: string;
  type: 'category' | 'product' | 'global';
  categoryName?: string;
  productId?: string;
  marginPercentage: number;
  createdAt: string;
  updatedAt: string;
}

export interface ProfitMarginCalculation {
  id: number;
  userId: string;
  productId: string;
  basePrice: number;
  marginPercentage: number;
  salePrice: number;
  marginSource: 'product' | 'category' | 'global';
  calculationDate: string;
}

export interface ProfitMarginHistory {
  id: number;
  userId: string;
  productId: string;
  oldMarginPercentage?: number;
  newMarginPercentage: number;
  oldSalePrice?: number;
  newSalePrice: number;
  changeReason?: string;
  changeDate: string;
}

export interface ProductWithSalePrice {
  // Propriedades base do produto
  id?: string;
  model?: string;
  brand?: string;
  storage?: string;
  color?: string;
  category?: string;
  categoria?: string;
  capacity?: string;
  region?: string;
  suppliername?: string;
  supplierPrice?: number | string;
  supplierprice?: number | string;
  price?: number | string;
  preco?: number | string;
  quantity?: number;
  dateAdded?: string;
  
  // Propriedades calculadas do sistema de margem
  salePrice: number;
  marginApplied: number;
  marginSource: 'product' | 'category' | 'global';
}

export interface UserMargins {
  global: number;
  categories: Array<{
    categoryName: string;
    marginPercentage: number;
  }>;
  products: Array<{
    productId: string;
    marginPercentage: number;
  }>;
}

export interface CreateMarginRequest {
  type: 'category' | 'product' | 'global';
  categoryName?: string;
  productId?: string;
  marginPercentage: number;
}

export interface CalculatePricesRequest {
  products: Array<{
    id: string;
    model?: string;
    brand?: string;
    category?: string;
    categoria?: string;
    price?: number | string;
    preco?: number | string;
    supplierPrice?: number | string;
    supplierprice?: number | string;
  }>;
}

export interface CalculatePricesResponse {
  success: boolean;
  data: ProductWithSalePrice[];
  summary: {
    totalProducts: number;
    totalCalculated: number;
    averageMargin: number;
    totalValueWithMargin: number;
  };
}

export interface ExtractCategoriesResponse {
  success: boolean;
  categories: string[];
  totalProducts: number;
}

export interface ExtractProductsResponse {
  success: boolean;
  products: Array<{
    id: string;
    model: string;
    brand?: string;
    category?: string;
  }>;
  totalProducts: number;
}