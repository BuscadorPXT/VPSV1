import { db } from "../db";
import { 
  userProfitMarginsCategories as userProfitMarginsCategoriesTable,
  userProfitMarginsProducts as userProfitMarginsProductsTable
} from "../../shared/schema";
import { eq, and } from "drizzle-orm";

// Interface simples para produto
export interface Product {
  id?: string;
  name?: string;
  model?: string;
  supplier?: any;
  price?: number | string;
  category?: string;
  [key: string]: any;
}

// Interface simples para margem
interface CreateCategoryMarginData {
  userId: number;
  categoryName: string;
  marginPercentage: string;
}

interface CreateProductMarginData {
  userId: number;
  productId: string;
  marginPercentage: string;
}

// Serviço simplificado de margens de lucro
class SimplifiedProfitMarginsService {
  
  // Criar margem por categoria
  async createCategoryMargin(data: CreateCategoryMarginData) {
    try {
      // Verificar se já existe
      const existing = await db.select()
        .from(userProfitMarginsCategoriesTable)
        .where(
          and(
            eq(userProfitMarginsCategoriesTable.userId, data.userId),
            eq(userProfitMarginsCategoriesTable.categoryName, data.categoryName)
          )
        )
        .limit(1);

      if (existing.length > 0) {
        // Atualizar
        const result = await db.update(userProfitMarginsCategoriesTable)
          .set({
            marginPercentage: data.marginPercentage,
            updatedAt: new Date()
          })
          .where(
            and(
              eq(userProfitMarginsCategoriesTable.userId, data.userId),
              eq(userProfitMarginsCategoriesTable.categoryName, data.categoryName)
            )
          )
          .returning();
        
        return result[0];
      } else {
        // Criar novo
        const result = await db.insert(userProfitMarginsCategoriesTable)
          .values({
            userId: data.userId,
            categoryName: data.categoryName,
            marginPercentage: data.marginPercentage,
            createdAt: new Date(),
            updatedAt: new Date()
          })
          .returning();
        
        return result[0];
      }
    } catch (error) {
      console.error('❌ Error creating category margin:', error);
      throw error;
    }
  }

  // Criar margem por produto
  async createProductMargin(data: CreateProductMarginData) {
    try {
      // Verificar se já existe
      const existing = await db.select()
        .from(userProfitMarginsProductsTable)
        .where(
          and(
            eq(userProfitMarginsProductsTable.userId, data.userId),
            eq(userProfitMarginsProductsTable.productId, data.productId)
          )
        )
        .limit(1);

      if (existing.length > 0) {
        // Atualizar
        const result = await db.update(userProfitMarginsProductsTable)
          .set({
            marginPercentage: data.marginPercentage,
            updatedAt: new Date()
          })
          .where(
            and(
              eq(userProfitMarginsProductsTable.userId, data.userId),
              eq(userProfitMarginsProductsTable.productId, data.productId)
            )
          )
          .returning();
        
        return result[0];
      } else {
        // Criar novo
        const result = await db.insert(userProfitMarginsProductsTable)
          .values({
            userId: data.userId,
            productId: data.productId,
            marginPercentage: data.marginPercentage,
            createdAt: new Date(),
            updatedAt: new Date()
          })
          .returning();
        
        return result[0];
      }
    } catch (error) {
      console.error('❌ Error creating product margin:', error);
      throw error;
    }
  }

  // Buscar margens do usuário
  async getUserMargins(userId: number) {
    try {
      const categoryMargins = await db.select()
        .from(userProfitMarginsCategoriesTable)
        .where(eq(userProfitMarginsCategoriesTable.userId, userId));
        
      const productMargins = await db.select()
        .from(userProfitMarginsProductsTable)
        .where(eq(userProfitMarginsProductsTable.userId, userId));

      return {
        categories: categoryMargins.map(margin => ({
          id: margin.id,
          categoryName: margin.categoryName,
          marginPercentage: parseFloat(margin.marginPercentage)
        })),
        products: productMargins.map(margin => ({
          id: margin.id,
          productId: margin.productId,
          marginPercentage: parseFloat(margin.marginPercentage)
        }))
      };
    } catch (error) {
      console.error('❌ Error fetching user margins:', error);
      throw error;
    }
  }

  // Aplicar margens aos produtos
  applyMarginsToProducts(products: Product[], margins: any) {
    return products.map(product => {
      let marginToApply = 0;
      
      // Verificar margem específica do produto
      if (product.id) {
        const productMargin = margins.products?.find((m: any) => m.productId === product.id);
        if (productMargin) {
          marginToApply = productMargin.marginPercentage;
        }
      }
      
      // Se não há margem específica, verificar margem da categoria
      if (marginToApply === 0 && product.category) {
        const categoryMargin = margins.categories?.find((m: any) => m.categoryName === product.category);
        if (categoryMargin) {
          marginToApply = categoryMargin.marginPercentage;
        }
      }
      
      // Aplicar margem se existir
      if (marginToApply > 0 && product.price) {
        const originalPrice = typeof product.price === 'string' ? parseFloat(product.price.replace(/[^0-9.,]/g, '').replace(',', '.')) : product.price;
        const newPrice = originalPrice * (1 + marginToApply / 100);
        
        return {
          ...product,
          originalPrice: originalPrice,
          marginApplied: marginToApply,
          price: newPrice,
          priceWithMargin: newPrice
        };
      }
      
      return product;
    });
  }

  // Categorias disponíveis (fixas para Apple)
  getAvailableCategories(): string[] {
    return ['iPhone', 'iPad', 'MacBook', 'iMac', 'Mac Mini', 'Apple TV', 'Apple Watch', 'AirPods', 'Accessories'];
  }

  // Produtos disponíveis (mock para teste)
  getAvailableProducts(): any[] {
    return [
      { id: 'iphone-15-pro', name: 'iPhone 15 Pro', category: 'iPhone' },
      { id: 'ipad-air', name: 'iPad Air', category: 'iPad' },
      { id: 'macbook-pro-14', name: 'MacBook Pro 14"', category: 'MacBook' }
    ];
  }
}

// Instância singleton do serviço
export const simplifiedProfitMarginsService = new SimplifiedProfitMarginsService();