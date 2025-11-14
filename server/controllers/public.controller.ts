import { Request, Response } from 'express';
import { db } from '../db';
import { products, suppliers, syncLogs } from '../../shared/schema';
import { eq, desc, like, and, or, asc, sql, ilike } from 'drizzle-orm';
import { z } from 'zod';

// Schemas de validação
const ProductFiltersSchema = z.object({
  model: z.string().optional(),
  capacity: z.string().optional(),
  color: z.string().optional(),
  region: z.string().optional(),
  limit: z.coerce.number().min(1).max(100).default(50),
  offset: z.coerce.number().min(0).default(0)
});

// Formatar resposta padronizada da API
function formatApiResponse(success: boolean, data?: any, message?: string) {
  return {
    success,
    data,
    message,
    timestamp: new Date().toISOString()
  };
}

export const publicController = {
  // GET /api/public/products
  async getProducts(req: Request, res: Response) {
    try {
      // Validar parâmetros
      const validation = ProductFiltersSchema.safeParse(req.query);
      if (!validation.success) {
        return res.status(400).json(
          formatApiResponse(false, null, 'Parâmetros inválidos fornecidos')
        );
      }

      const { model, capacity, color, region, limit, offset } = validation.data;

      // Construir query base
      let query = db
        .select({
          id: products.id,
          model: products.model,
          storage: products.storage,
          color: products.color,
          capacity: products.capacity,
          region: products.region,
          price: products.price,
          supplier: suppliers.name,
          lastUpdated: products.updatedAt,
          available: products.available
        })
        .from(products)
        .leftJoin(suppliers, eq(products.supplierId, suppliers.id));

      // Construir condições de filtro
      const conditions = [
        eq(products.available, true),
        eq(suppliers.active, true)
      ];

      // Aplicar filtros específicos
      if (model) {
        conditions.push(ilike(products.model, `%${model}%`));
      }
      if (capacity) {
        conditions.push(
          sql`(${products.capacity} ILIKE ${'%' + capacity + '%'} OR ${products.storage} ILIKE ${'%' + capacity + '%'})`
        );
      }
      if (color) {
        conditions.push(ilike(products.color, `%${color}%`));
      }
      if (region && products.region) {
        conditions.push(ilike(products.region, `%${region}%`));
      }

      // Aplicar filtros
      const productResults = await query
        .where(and(...conditions))
        .orderBy(asc(products.price))
        .limit(limit)
        .offset(offset);

      // Formatar dados para resposta
      const formattedProducts = productResults.map(product => ({
        id: product.id,
        modelo: product.model,
        capacidade: product.capacity || product.storage,
        cor: product.color,
        regiao: product.region,
        menorPreco: parseFloat(product.price?.toString() || '0'),
        fornecedor: product.supplier,
        atualizadoEm: product.lastUpdated?.toISOString(),
        disponivel: product.available
      }));

      return res.json(
        formatApiResponse(true, {
          products: formattedProducts,
          pagination: {
            limit,
            offset,
            total: formattedProducts.length
          },
          filters: {
            model,
            capacity,
            color,
            region
          }
        })
      );

    } catch (error) {
      console.error('Error in getProducts:', error);
      return res.status(500).json(
        formatApiResponse(false, null, 'Erro interno do servidor')
      );
    }
  },

  // GET /api/public/stats
  async getStats(req: Request, res: Response) {
    try {
      console.log('📊 Public API stats request');

      // Obter estatísticas da base de dados
      const [productStats, supplierStats, priceStats] = await Promise.all([
        // Contagem de produtos ativos
        db.select({ 
          count: sql`count(*)`.mapWith(Number),
        }).from(products)
          .leftJoin(suppliers, eq(products.supplierId, suppliers.id))
          .where(and(
            eq(products.available, true),
            eq(suppliers.active, true)
          )),

        // Contagem de fornecedores ativos
        db.select({ 
          count: sql`count(*)`.mapWith(Number),
        }).from(suppliers)
          .where(eq(suppliers.active, true)),

        // Estatísticas de preços
        db.select({
          avg: sql`avg(${products.price})`.mapWith(Number),
          min: sql`min(${products.price})`.mapWith(Number),
          max: sql`max(${products.price})`.mapWith(Number),
        }).from(products)
          .leftJoin(suppliers, eq(products.supplierId, suppliers.id))
          .where(and(
            eq(products.available, true),
            eq(suppliers.active, true)
          ))
      ]);

      // Obter última sincronização
      const lastSync = await db.select({ 
        createdAt: syncLogs.createdAt,
        status: syncLogs.status
      })
        .from(syncLogs)
        .where(eq(syncLogs.status, 'success'))
        .orderBy(desc(syncLogs.createdAt))
        .limit(1);

      const stats = {
        totalProdutos: productStats[0]?.count || 0,
        fornecedoresAtivos: supplierStats[0]?.count || 0,
        precoMedio: Math.round((priceStats[0]?.avg || 0) * 100) / 100,
        menorPreco: priceStats[0]?.min || 0,
        maiorPreco: priceStats[0]?.max || 0,
        ultimaSincronizacao: lastSync[0]?.createdAt?.toISOString() || null,
        statusUltimaSincronizacao: lastSync[0]?.status || null
      };

      console.log(`📊 Stats: ${stats.totalProdutos} produtos, ${stats.fornecedoresAtivos} fornecedores`);

      return res.json(
        formatApiResponse(true, stats)
      );

    } catch (error) {
      console.error('Error in getStats:', error);
      return res.status(500).json(
        formatApiResponse(false, null, 'Erro interno do servidor')
      );
    }
  }
};