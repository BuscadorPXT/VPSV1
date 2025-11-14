import { db } from "../db";
import { 
  userProfitMarginsCategories, 
  userProfitMarginsProducts,
  products as productsTable
} from "../../shared/schema";
import { eq, and, sql } from "drizzle-orm";
import type { 
  UserMargins, 
  UserProfitMarginCategory, 
  UserProfitMarginProduct,
  InsertUserProfitMarginCategory,
  InsertUserProfitMarginProduct 
} from "../../shared/schema";

// Interface para o produto (compatível com ExcelStylePriceList)
export interface Product {
  id?: string;
  name?: string;
  model?: string;
  supplier?: {
    id: number;
    name: string;
    rating?: number;
    totalRatings?: number;
  } | string;
  supplierName?: string;
  price?: number | string;
  priceFormatted?: string;
  color?: string;
  storage?: string;
  capacity?: string;
  region?: string;
  category?: string;
  brand?: string;
  date?: string;
  // Portuguese field names (fallbacks)
  modelo?: string;
  fornecedor?: string;
  preco?: number;
  cor?: string;
  armazenamento?: string;
  regiao?: string;
  categoria?: string;
  marca?: string;
  data?: string;
  isLowestPrice?: boolean;
  [key: string]: any;
}

// Interface para produto com preço de venda calculado
export interface ProductWithSalePrice extends Product {
  salePrice?: number;
  marginApplied?: number;
  marginSource?: 'product' | 'category' | 'default';
}

export class ProfitMarginsService {
  
  // Buscar todas as margens do usuário
  async getUserMargins(userId: number): Promise<UserMargins> {
    try {
      const [categories, products] = await Promise.all([
        db.select()
          .from(userProfitMarginsCategories)
          .where(eq(userProfitMarginsCategories.userId, userId)),
        db.select()
          .from(userProfitMarginsProducts)
          .where(eq(userProfitMarginsProducts.userId, userId))
      ]);

      return {
        categories,
        products
      };
    } catch (error) {
      console.error('❌ Error fetching user margins:', error);
      throw error;
    }
  }

  // Criar ou atualizar margem por categoria
  async setCategoryMargin(userId: number, categoryData: Omit<InsertUserProfitMarginCategory, 'userId'>): Promise<UserProfitMarginCategory> {
    try {
      const data = { ...categoryData, userId };
      
      // Upsert: inserir ou atualizar se já existir
      const result = await db
        .insert(userProfitMarginsCategories)
        .values(data)
        .onConflictDoUpdate({
          target: [userProfitMarginsCategories.userId, userProfitMarginsCategories.categoryName],
          set: {
            marginPercentage: data.marginPercentage,
            updatedAt: new Date(),
          },
        })
        .returning();

      return result[0];
    } catch (error) {
      console.error('❌ Error setting category margin:', error);
      throw error;
    }
  }

  // Criar ou atualizar margem por produto
  async setProductMargin(userId: number, productData: Omit<InsertUserProfitMarginProduct, 'userId'>): Promise<UserProfitMarginProduct> {
    try {
      const data = { ...productData, userId };
      
      // Upsert: inserir ou atualizar se já existir
      const result = await db
        .insert(userProfitMarginsProducts)
        .values(data)
        .onConflictDoUpdate({
          target: [userProfitMarginsProducts.userId, userProfitMarginsProducts.productId],
          set: {
            productName: data.productName,
            marginPercentage: data.marginPercentage,
            updatedAt: new Date(),
          },
        })
        .returning();

      return result[0];
    } catch (error) {
      console.error('❌ Error setting product margin:', error);
      throw error;
    }
  }

  // Remover margem de categoria
  async deleteCategoryMargin(userId: number, categoryName: string): Promise<boolean> {
    try {
      const result = await db
        .delete(userProfitMarginsCategories)
        .where(
          and(
            eq(userProfitMarginsCategories.userId, userId),
            eq(userProfitMarginsCategories.categoryName, categoryName)
          )
        );

      return result.length > 0;
    } catch (error) {
      console.error('❌ Error deleting category margin:', error);
      throw error;
    }
  }

  // Remover margem de produto
  async deleteProductMargin(userId: number, productId: string): Promise<boolean> {
    try {
      const result = await db
        .delete(userProfitMarginsProducts)
        .where(
          and(
            eq(userProfitMarginsProducts.userId, userId),
            eq(userProfitMarginsProducts.productId, productId)
          )
        );

      return result.length > 0;
    } catch (error) {
      console.error('❌ Error deleting product margin:', error);
      throw error;
    }
  }

  // Calcular preço de venda de um produto (lógica de prioridade)
  calculateSalePrice(product: Product, margins: UserMargins): ProductWithSalePrice {
    let basePrice = 0;
    
    // Extrair preço base com fallbacks
    if (product.price) {
      if (typeof product.price === 'number') {
        basePrice = product.price;
      } else {
        const priceString = product.price.toString().replace(/[^\d.,]/g, '').replace(',', '.');
        basePrice = parseFloat(priceString) || 0;
      }
    } else if (product.preco) {
      if (typeof product.preco === 'number') {
        basePrice = product.preco;
      } else {
        const priceString = String(product.preco).replace(/[^\d.,]/g, '').replace(',', '.');
        basePrice = parseFloat(priceString) || 0;
      }
    }

    if (basePrice <= 0) {
      return { ...product, salePrice: 0, marginApplied: 0, marginSource: 'default' };
    }

    // Gerar ID único do produto
    const productId = this.generateProductId(product);
    
    // Prioridade 1: Margem específica do produto
    const productMargin = margins.products.find(p => p.productId === productId);
    if (productMargin) {
      const marginValue = parseFloat(String(productMargin.marginPercentage));
      const salePrice = basePrice * (1 + marginValue / 100);
      return { 
        ...product, 
        salePrice: Math.round(salePrice * 100) / 100, 
        marginApplied: marginValue,
        marginSource: 'product'
      };
    }

    // Prioridade 2: Margem da categoria
    const productCategory = product.category || product.categoria || '';
    if (productCategory) {
      const categoryMargin = margins.categories.find(c => c.categoryName === productCategory);
      if (categoryMargin) {
        const marginValue = parseFloat(String(categoryMargin.marginPercentage));
        const salePrice = basePrice * (1 + marginValue / 100);
        return { 
          ...product, 
          salePrice: Math.round(salePrice * 100) / 100, 
          marginApplied: marginValue,
          marginSource: 'category'
        };
      }
    }

    // Prioridade 3: Margem padrão (0%)
    return { 
      ...product, 
      salePrice: basePrice, 
      marginApplied: 0,
      marginSource: 'default'
    };
  }

  // Calcular preços de venda em lote para uma lista de produtos
  calculatePricesWithMargins(products: Product[], margins: UserMargins): ProductWithSalePrice[] {
    return products.map(product => this.calculateSalePrice(product, margins));
  }

  // Gerar ID único do produto baseado em suas propriedades
  private generateProductId(product: Product): string {
    const model = product.model || product.name || product.modelo || '';
    const brand = product.brand || product.marca || '';
    const storage = product.storage || product.armazenamento || product.capacity || '';
    const color = product.color || product.cor || '';
    const region = product.region || product.regiao || '';
    
    // Criar um ID único baseado nas propriedades do produto
    return `${brand}_${model}_${storage}_${color}_${region}`.toLowerCase().replace(/\s+/g, '_');
  }

  // Extrair categorias únicas dos produtos
  extractCategoriesFromProducts(products: Product[]): string[] {
    const categories = new Set<string>();
    
    products.forEach(product => {
      const category = product.category || product.categoria;
      if (category && typeof category === 'string' && category.trim()) {
        categories.add(category.trim());
      }
    });

    return Array.from(categories).sort();
  }

  // Extrair produtos únicos para configuração de margens
  extractUniqueProductsFromList(products: Product[]): Array<{ id: string; name: string; category?: string }> {
    const uniqueProducts = new Map<string, { id: string; name: string; category?: string }>();

    products.forEach(product => {
      const productId = this.generateProductId(product);
      const productName = product.model || product.name || product.modelo || 'Produto sem nome';
      const productCategory = product.category || product.categoria;

      if (!uniqueProducts.has(productId)) {
        uniqueProducts.set(productId, {
          id: productId,
          name: productName,
          category: productCategory
        });
      }
    });

    return Array.from(uniqueProducts.values()).sort((a, b) => a.name.localeCompare(b.name));
  }
  // Buscar todas as categorias disponíveis no sistema
  async getAvailableCategories(): Promise<string[]> {
    try {
      // Buscar categorias únicas dos produtos do Google Sheets
      const products = await db.select({
        category: sql`DISTINCT category`
      }).from(productsTable)
      .where(sql`category IS NOT NULL AND category != ''`);

      const categories = products
        .map(p => p.category)
        .filter(Boolean)
        .sort();

      return categories;
    } catch (error) {
      console.error('❌ Error fetching available categories:', error);
      return [];
    }
  }

  // Buscar todos os produtos disponíveis no sistema
  async getAvailableProducts(): Promise<Array<{ id: string; name: string; category?: string }>> {
    try {
      // Buscar produtos únicos do Google Sheets
      const products = await db.select({
        model: productsTable.model,
        brand: productsTable.brand,
        storage: productsTable.storage,
        color: productsTable.color,
        category: productsTable.category,
        region: productsTable.region
      }).from(productsTable)
      .where(sql`model IS NOT NULL AND model != ''`)
      .limit(1000); // Limitar para performance

      const uniqueProducts = new Map<string, { id: string; name: string; category?: string }>();

      products.forEach(product => {
        const productId = this.generateProductId(product);
        const productName = `${product.brand || ''} ${product.model || ''}`.trim() || 'Produto sem nome';
        
        if (!uniqueProducts.has(productId)) {
          uniqueProducts.set(productId, {
            id: productId,
            name: productName,
            category: product.category || undefined
          });
        }
      });

      return Array.from(uniqueProducts.values()).sort((a, b) => a.name.localeCompare(b.name));
    } catch (error) {
      console.error('❌ Error fetching available products:', error);
      return [];
    }
  }
}

// Instância singleton do serviço

export const profitMarginsService = new ProfitMarginsService();