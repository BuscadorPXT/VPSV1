// Rotas públicas - endpoints não autenticados para busca e estatísticas
import { Router } from 'express';
import { Request, Response } from 'express';
import exchangeRatesRouter from './public-exchange.routes';
import { storage } from '../storage';
import { parseGoogleSheetWithDate, calculateLowestPrices } from '../services/google-sheets-parser';
import { processAISearch } from '../aiSearch';
import { rateLimit } from '../middleware/input-validation';

const router = Router();

// Mount exchange rates proxy
router.use('/', exchangeRatesRouter);

// === NOVOS ENDPOINTS DA API PÚBLICA (PRIORITÁRIOS) ===

// GET /api/public/products - Lista produtos com filtros (novo endpoint direto ao PostgreSQL)
router.get('/products', 
  rateLimit('public-products', 60, 1), // 60 req/min por IP
  async (req: Request, res: Response) => {
    try {
      const { model, capacity, color, region, limit = '50', offset = '0' } = req.query;

      // Validar parâmetros
      const limitNum = Math.min(parseInt(limit as string) || 50, 100);
      const offsetNum = parseInt(offset as string) || 0;

      console.log(`📊 API Pública - Produtos: limit=${limitNum}, offset=${offsetNum}`);

      // Query direto na base PostgreSQL
      const { db } = await import('../db');
      const { products, suppliers } = await import('../../shared/schema');
      const { eq, and, ilike, asc } = await import('drizzle-orm');

      // Construir condições base
      const conditions = [
        eq(products.available, true),
        eq(suppliers.active, true)
      ];

      // Aplicar filtros
      if (model && typeof model === 'string') {
        conditions.push(ilike(products.model, `%${model}%`));
      }
      if (capacity && typeof capacity === 'string') {
        conditions.push(ilike(products.storage, `%${capacity}%`));
      }
      if (color && typeof color === 'string') {
        conditions.push(ilike(products.color, `%${color}%`));
      }
      if (region && typeof region === 'string') {
        conditions.push(ilike(products.region, `%${region}%`));
      }

      // Executar query
      const productResults = await db
        .select({
          id: products.id,
          modelo: products.model,
          capacidade: products.storage,
          cor: products.color,
          regiao: products.region,
          menorPreco: products.price,
          fornecedor: suppliers.name,
          atualizadoEm: products.updatedAt,
          disponivel: products.available
        })
        .from(products)
        .leftJoin(suppliers, eq(products.supplierId, suppliers.id))
        .where(and(...conditions))
        .orderBy(asc(products.price))
        .limit(limitNum)
        .offset(offsetNum);

      console.log(`📊 API Pública - Encontrados ${productResults.length} produtos`);

      return res.json({
        success: true,
        data: {
          products: productResults.map(p => ({
            id: p.id,
            modelo: p.modelo,
            capacidade: p.capacidade,
            cor: p.cor,
            regiao: p.regiao,
            menorPreco: parseFloat(p.menorPreco?.toString() || '0'),
            fornecedor: p.fornecedor,
            atualizadoEm: p.atualizadoEm?.toISOString(),
            disponivel: p.disponivel
          })),
          pagination: {
            limit: limitNum,
            offset: offsetNum,
            total: productResults.length
          },
          filters: { model, capacity, color, region }
        },
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Error in public products API:', error);
      return res.status(500).json({
        success: false,
        data: null,
        message: 'Erro interno do servidor',
        timestamp: new Date().toISOString()
      });
    }
  }
);

// GET /api/public/stats - Estatísticas resumidas (novo endpoint direto ao PostgreSQL)
router.get('/stats',
  rateLimit('public-stats', 60, 1), // 60 req/min por IP
  async (req: Request, res: Response) => {
    try {
      console.log('📊 API Pública - Estatísticas');

      // Query direto na base PostgreSQL
      const { db } = await import('../db');
      const { products, suppliers, syncLogs } = await import('../../shared/schema');
      const { eq, and, desc, sql } = await import('drizzle-orm');

      // Obter estatísticas em paralelo
      const [productStats, supplierStats, priceStats, lastSync] = await Promise.all([
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
          )),

        // Última sincronização
        db.select({ 
          createdAt: syncLogs.createdAt,
          status: syncLogs.status
        })
          .from(syncLogs)
          .where(eq(syncLogs.status, 'success'))
          .orderBy(desc(syncLogs.createdAt))
          .limit(1)
      ]);

      const stats = {
        totalProdutos: productStats[0]?.count || 0,
        fornecedoresAtivos: supplierStats[0]?.count || 0,
        precoMedio: Math.round((priceStats[0]?.avg || 0) * 100) / 100,
        menorPreco: priceStats[0]?.min || 0,
        maiorPreco: priceStats[0]?.max || 0,
        ultimaSincronizacao: lastSync[0]?.createdAt?.toISOString() || null,
        statusUltimaSincronizacao: lastSync[0]?.status || null
      };

      console.log(`📊 API Pública - Stats: ${stats.totalProdutos} produtos, ${stats.fornecedoresAtivos} fornecedores`);

      return res.json({
        success: true,
        data: stats,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Error in public stats API:', error);
      return res.status(500).json({
        success: false,
        data: null,
        message: 'Erro interno do servidor',
        timestamp: new Date().toISOString()
      });
    }
  }
);

// === ENDPOINTS ANTIGOS (compatibilidade) ===

// Função auxiliar para pegar a data mais recente
async function getLatestDate(): Promise<string | null> {
  try {
    const dates = await storage.getDates();
    if (dates.length === 0) return null;
    // Ordena as datas e retorna a mais recente
    return dates.sort().pop() || null;
  } catch (error) {
    console.error('Error getting latest date:', error);
    return null;
  }
}

// Sugestões de busca públicas (autocomplete)
router.get('/suggestions', async (req: Request, res: Response) => {
  try {
    const { q: searchTerm } = req.query;

    if (!searchTerm || typeof searchTerm !== 'string' || searchTerm.trim().length < 1) {
      return res.json({ suggestions: [] });
    }

    console.log(`🔍 Public suggestions search for: "${searchTerm}"`);

    // Get the latest date
    const latestDate = await getLatestDate();
    if (!latestDate) {
      console.log('❌ No latest date found for suggestions');
      return res.json({ suggestions: [] });
    }

    console.log(`📊 Using latest date for suggestions: ${latestDate}`);

    // Use parseGoogleSheetWithDate for current data
    let allProducts: any[] = [];
    try {
      const sheetsData = await parseGoogleSheetWithDate(latestDate);
      allProducts = Array.isArray(sheetsData) ? sheetsData : [];
    } catch (error) {
      console.error(`❌ Error fetching suggestions data:`, error);
      return res.json({ suggestions: [] });
    }

    if (allProducts.length === 0) {
      console.log('📊 No products found for suggestions');
      return res.json({ suggestions: [] });
    }

    // Filter and create suggestions
    const searchTermLower = searchTerm.trim().toLowerCase();
    const suggestions = new Set<string>();

    allProducts.forEach(product => {
      // Adicionar modelo se corresponder
      if (product.model?.toLowerCase().includes(searchTermLower)) {
        suggestions.add(product.model);
      }

      // Adicionar combinação modelo + storage se corresponder
      if (product.model && product.storage) {
        const combination = `${product.model} ${product.storage}`;
        if (combination.toLowerCase().includes(searchTermLower)) {
          suggestions.add(combination);
        }
      }

      // Adicionar cores se corresponder
      if (product.color?.toLowerCase().includes(searchTermLower)) {
        suggestions.add(product.color);
      }

      // Adicionar categorias se corresponder
      if (product.category?.toLowerCase().includes(searchTermLower)) {
        suggestions.add(product.category);
      }
    });

    // Convert to array and limit results
    const suggestionsArray = Array.from(suggestions).slice(0, 10);

    console.log(`🔍 Found ${suggestionsArray.length} suggestions for "${searchTerm}"`);

    res.json({
      suggestions: suggestionsArray,
      query: searchTerm.trim()
    });

  } catch (error) {
    console.error('Error in public suggestions:', error);
    res.status(500).json({ 
      suggestions: [],
      error: 'Erro interno do servidor'
    });
  }
});

// Busca pública de produtos
router.get('/search', async (req: Request, res: Response) => {
  try {
    const { q: searchTerm, limit = '20' } = req.query;

    if (!searchTerm || typeof searchTerm !== 'string' || searchTerm.trim().length < 2) {
      return res.status(400).json({ 
        message: 'Termo de busca deve ter pelo menos 2 caracteres',
        products: []
      });
    }

    const limitNum = parseInt(limit as string) || 20;
    console.log(`🔍 Public search for: "${searchTerm}"`);

    // Get the latest date
    const latestDate = await getLatestDate();
    if (!latestDate) {
      return res.status(404).json({ 
        message: 'Nenhuma data disponível',
        products: []
      });
    }

    // Search products
    let allProducts: any[] = [];
    try {
      const sheetsData = await parseGoogleSheetWithDate(latestDate);
      allProducts = Array.isArray(sheetsData) ? sheetsData : [];
    } catch (error) {
      console.error(`❌ Error fetching search data:`, error);
      return res.status(500).json({ 
        message: 'Erro ao buscar produtos',
        products: []
      });
    }

    // Filter products by search term
    const searchTermLower = searchTerm.trim().toLowerCase();
    const filteredProducts = allProducts.filter(product => 
      product.model?.toLowerCase().includes(searchTermLower) ||
      product.storage?.toLowerCase().includes(searchTermLower) ||
      product.color?.toLowerCase().includes(searchTermLower) ||
      product.category?.toLowerCase().includes(searchTermLower) ||
      product.supplier?.name?.toLowerCase().includes(searchTermLower)
    );

    // Sort by price (lowest first)
    filteredProducts.sort((a, b) => {
      const priceA = parseFloat(a.price?.toString().replace(/[^\d,]/g, '').replace(',', '.') || '0');
      const priceB = parseFloat(b.price?.toString().replace(/[^\d,]/g, '').replace(',', '.') || '0');
      return priceA - priceB;
    });

    // Limit results
    const limitedProducts = filteredProducts.slice(0, limitNum);

    console.log(`🔍 Found ${filteredProducts.length} products, returning ${limitedProducts.length}`);

    res.json({
      products: limitedProducts,
      totalFound: filteredProducts.length,
      query: searchTerm.trim(),
      dateFilter: latestDate
    });

  } catch (error) {
    console.error('Error in public search:', error);
    res.status(500).json({ 
      message: 'Erro interno do servidor',
      products: []
    });
  }
});

// Estatísticas públicas (ANTIGO - comentado para evitar conflito)
/*
router.get('/stats', async (req: Request, res: Response) => {
  try {
    console.log('📊 Public stats request');

    // Get the latest date
    const latestDate = await getLatestDate();
    if (!latestDate) {
      return res.status(404).json({ 
        message: 'Nenhuma data disponível',
        stats: null
      });
    }

    // Get products data
    let allProducts: any[] = [];
    try {
      const sheetsData = await parseGoogleSheetWithDate(latestDate);
      allProducts = Array.isArray(sheetsData) ? sheetsData : [];
    } catch (error) {
      console.error(`❌ Error fetching stats data:`, error);
      return res.status(500).json({ 
        message: 'Erro ao carregar estatísticas',
        stats: null
      });
    }

    // Calculate statistics
    const stats = {
      totalProducts: allProducts.length,
      totalSuppliers: new Set(allProducts.map(p => p.supplier?.name).filter(Boolean)).size,
      totalCategories: new Set(allProducts.map(p => p.category).filter(Boolean)).size,
      averagePrice: 0,
      lowestPrice: 0,
      highestPrice: 0,
      lastUpdated: latestDate
    };

    if (allProducts.length > 0) {
      const prices = allProducts
        .map(p => parseFloat(p.price?.toString().replace(/[^\d,]/g, '').replace(',', '.') || '0'))
        .filter(price => price > 0);

      if (prices.length > 0) {
        stats.averagePrice = prices.reduce((sum, price) => sum + price, 0) / prices.length;
        stats.lowestPrice = Math.min(...prices);
        stats.highestPrice = Math.max(...prices);
      }
    }

    console.log(`📊 Stats: ${stats.totalProducts} products, ${stats.totalSuppliers} suppliers`);

    res.json({
      stats,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error fetching public stats:', error);
    res.status(500).json({ 
      message: 'Erro interno do servidor',
      stats: null
    });
  }
});
*/

// Produtos públicos (limitados) (ANTIGO - comentado para evitar conflito)
/*
router.get('/products', async (req: Request, res: Response) => {
  try {
    const { limit = '50', category } = req.query;
    const limitNum = parseInt(limit as string) || 50;

    console.log(`📊 Public products request - Limit: ${limitNum}, Category: ${category}`);

    // Get the latest date
    const latestDate = await getLatestDate();
    if (!latestDate) {
      return res.status(404).json({ 
        message: 'Nenhuma data disponível',
        products: []
      });
    }

    // Get products data
    let allProducts: any[] = [];
    try {
      const sheetsData = await parseGoogleSheetWithDate(latestDate);
      allProducts = Array.isArray(sheetsData) ? sheetsData : [];
    } catch (error) {
      console.error(`❌ Error fetching public products:`, error);
      return res.status(500).json({ 
        message: 'Erro ao carregar produtos',
        products: []
      });
    }

    // Filter by category if specified
    let filteredProducts = allProducts;
    if (category && typeof category === 'string') {
      filteredProducts = allProducts.filter(product => 
        product.category?.toLowerCase() === category.toLowerCase()
      );
    }

    // Sort by price (lowest first)
    filteredProducts.sort((a, b) => {
      const priceA = parseFloat(a.price?.toString().replace(/[^\d,]/g, '').replace(',', '.') || '0');
      const priceB = parseFloat(b.price?.toString().replace(/[^\d,]/g, '').replace(',', '.') || '0');
      return priceA - priceB;
    });

    // Limit results and remove sensitive data
    const publicProducts = filteredProducts.slice(0, limitNum).map(product => ({
      model: product.model,
      storage: product.storage,
      color: product.color,
      category: product.category,
      price: product.price,
      supplier: product.supplier?.name,
      region: product.region
    }));

    console.log(`📊 Returning ${publicProducts.length} public products`);

    res.json({
      products: publicProducts,
      totalAvailable: filteredProducts.length,
      dateFilter: latestDate,
      category: category || null
    });

  } catch (error) {
    console.error('Error fetching public products:', error);
    res.status(500).json({ 
      message: 'Erro interno do servidor',
      products: []
    });
  }
});
*/

export { router as publicRoutes };