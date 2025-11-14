// Profit Margins Routes
import { Router } from 'express';
import { z } from 'zod';
import { simplifiedProfitMarginsService } from '../services/profit-margins-simplified.service';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth';
import { 
  insertUserProfitMarginsCategorySchema, 
  insertUserProfitMarginsProductSchema 
} from '../../shared/schema';
import { developmentOnly } from '../middleware/development-only'; // Importar o middleware de desenvolvimento

const router = Router();

// Apply development-only middleware to all routes
router.use(developmentOnly);

// Middleware para autenticação em todas as rotas
router.use(authenticateToken);

// GET /categories/:firebaseUid - Buscar margens de categoria do usuário
router.get('/categories/:firebaseUid', async (req: AuthenticatedRequest, res) => {
  try {
    console.log('📋 Requested category margins for user:', req.params.firebaseUid);

    if (!req.userId) {
      return res.status(401).json({ success: false, message: 'Usuário não autenticado' });
    }

    const margins = await simplifiedProfitMarginsService.getUserMargins(req.userId);

    console.log('✅ Category margins found:', margins.categories);
    res.json({ 
      margins: margins.categories || [],
      success: true 
    });
  } catch (error) {
    console.error('❌ Error fetching category margins:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erro ao buscar margens de categoria' 
    });
  }
});

// GET /products/:firebaseUid - Buscar margens de produto do usuário
router.get('/products/:firebaseUid', async (req: AuthenticatedRequest, res) => {
  try {
    console.log('📋 Requested product margins for user:', req.params.firebaseUid);

    if (!req.userId) {
      return res.status(401).json({ success: false, message: 'Usuário não autenticado' });
    }

    const margins = await simplifiedProfitMarginsService.getUserMargins(req.userId);

    console.log('✅ Product margins found:', margins.products);
    res.json({ 
      margins: margins.products || [],
      success: true 
    });
  } catch (error) {
    console.error('❌ Error fetching product margins:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erro ao buscar margens de produto' 
    });
  }
});

// GET /global/:firebaseUid - Buscar margem global do usuário (placeholder)
router.get('/global/:firebaseUid', async (req: AuthenticatedRequest, res) => {
  try {
    console.log('📋 Requested global margin for user:', req.params.firebaseUid);

    if (!req.userId) {
      return res.status(401).json({ success: false, message: 'Usuário não autenticado' });
    }

    const margins = await simplifiedProfitMarginsService.getUserMargins(req.userId);

    res.json({ 
      globalMargin: 0, // Placeholder - margem global não implementada ainda
      success: true 
    });
  } catch (error) {
    console.error('❌ Error fetching global margin:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erro ao buscar margem global' 
    });
  }
});

// POST /category - Criar/atualizar margem por categoria
router.post('/category', async (req: AuthenticatedRequest, res) => {
  try {
    console.log('📋 Create category margin request:', req.body);

    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Usuário não autenticado' });
    }

    // Converter formato do frontend para formato do banco
    const requestData = {
      userId,
      categoryName: req.body.categoryName,
      marginPercentage: String(req.body.marginPercentage || req.body.marginValue)
    };

    console.log('📤 Sending data to service:', requestData);

    const categoryMargin = await simplifiedProfitMarginsService.createCategoryMargin(requestData);

    console.log('✅ Category margin created/updated:', categoryMargin);
    res.json({ 
      success: true, 
      margin: categoryMargin 
    });
  } catch (error) {
    console.error('❌ Error setting category margin:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erro ao configurar margem de categoria',
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
});

// POST /product - Criar/atualizar margem por produto
router.post('/product', async (req: AuthenticatedRequest, res) => {
  try {
    console.log('📋 Create product margin request:', req.body);

    const userId = req.userId;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Usuário não autenticado' });
    }

    // Converter formato do frontend para formato do banco
    const requestData = {
      userId,
      productId: req.body.productId,
      marginPercentage: String(req.body.marginPercentage || req.body.marginValue)
    };

    console.log('📤 Sending data to service:', requestData);

    const productMargin = await simplifiedProfitMarginsService.createProductMargin(requestData);

    console.log('✅ Product margin created/updated:', productMargin);
    res.json({ 
      success: true, 
      margin: productMargin 
    });
  } catch (error) {
    console.error('❌ Error setting product margin:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erro ao configurar margem de produto',
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
});

// GET /available-categories - Buscar categorias disponíveis
router.get('/available-categories', async (req: AuthenticatedRequest, res) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ success: false, message: 'Usuário não autenticado' });
    }

    const categories = simplifiedProfitMarginsService.getAvailableCategories();

    res.json({ 
      categories,
      success: true 
    });
  } catch (error) {
    console.error('❌ Error fetching available categories:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erro ao buscar categorias disponíveis' 
    });
  }
});

// GET /available-products - Buscar produtos disponíveis
router.get('/available-products', async (req: AuthenticatedRequest, res) => {
  try {
    if (!req.userId) {
      return res.status(401).json({ success: false, message: 'Usuário não autenticado' });
    }

    const products = simplifiedProfitMarginsService.getAvailableProducts();

    res.json({ 
      products,
      success: true 
    });
  } catch (error) {
    console.error('❌ Error fetching available products:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erro ao buscar produtos disponíveis' 
    });
  }
});

// POST /calculate-prices - Calcular preços com margens aplicadas
router.post('/calculate-prices', async (req: AuthenticatedRequest, res) => {
  try {
    console.log('📋 Calculate prices request:', req.body);

    if (!req.userId) {
      return res.status(401).json({ success: false, message: 'Usuário não autenticado' });
    }

    const { products } = req.body;

    if (!products || !Array.isArray(products)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Lista de produtos é obrigatória' 
      });
    }

    // Buscar margens do usuário
    const margins = await simplifiedProfitMarginsService.getUserMargins(req.userId);

    // Calcular preços com margens aplicadas
    const productsWithMargins = products.map(product => {
      const basePrice = parseFloat(product.price || product.preco || 0);
      const productId = product.id || product.sku || `${product.name || product.nome}_${product.model || product.modelo}`;
      const productCategory = product.category || product.categoria || '';

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
        marginApplied: margins.global || 0,
        marginSource: 'global'
      };
    });

    console.log('✅ Prices calculated with margins:', productsWithMargins.length);

    // Calcular estatísticas
    const summary = {
      totalCalculated: productsWithMargins.length,
      totalOriginalPrice: productsWithMargins.reduce((sum, p) => sum + parseFloat(p.price || p.preco || 0), 0),
      totalSalePrice: productsWithMargins.reduce((sum, p) => sum + (p.salePrice || 0), 0),
      averageMargin: productsWithMargins.length > 0 
        ? productsWithMargins.reduce((sum, p) => sum + (p.marginApplied || 0), 0) / productsWithMargins.length 
        : 0
    };

    res.json({ 
      success: true, 
      products: productsWithMargins,
      summary 
    });
  } catch (error) {
    console.error('❌ Error calculating prices:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erro ao calcular preços com margens',
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
});

// POST /extract-categories - Extrair categorias de uma lista de produtos
router.post('/extract-categories', async (req: AuthenticatedRequest, res) => {
  try {
    console.log('📋 Extract categories request');

    if (!req.userId) {
      return res.status(401).json({ success: false, message: 'Usuário não autenticado' });
    }

    const { products } = req.body;

    if (!products || !Array.isArray(products)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Lista de produtos é obrigatória' 
      });
    }

    // Extrair categorias únicas dos produtos
    const categories = new Set<string>();
    products.forEach(product => {
      const category = product.category || product.categoria || '';
      if (category && category.trim()) {
        categories.add(category.trim());
      }
    });

    const uniqueCategories = Array.from(categories).sort();

    console.log('✅ Categories extracted:', uniqueCategories.length);
    res.json({ 
      success: true, 
      categories: uniqueCategories 
    });
  } catch (error) {
    console.error('❌ Error extracting categories:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erro ao extrair categorias',
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
});

// POST /extract-products - Extrair produtos de uma lista
router.post('/extract-products', async (req: AuthenticatedRequest, res) => {
  try {
    console.log('📋 Extract products request');

    if (!req.userId) {
      return res.status(401).json({ success: false, message: 'Usuário não autenticado' });
    }

    const { products } = req.body;

    if (!products || !Array.isArray(products)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Lista de produtos é obrigatória' 
      });
    }

    // Extrair produtos únicos com suas informações básicas
    const uniqueProducts = products.map(product => {
      const productId = product.id || product.sku || `${product.name || product.nome}_${product.model || product.modelo}`;
      return {
        id: productId,
        name: product.name || product.nome || '',
        model: product.model || product.modelo || '',
        category: product.category || product.categoria || '',
        brand: product.brand || product.marca || '',
        storage: product.storage || product.armazenamento || product.capacity || '',
        color: product.color || product.cor || '',
        region: product.region || product.regiao || ''
      };
    });

    console.log('✅ Products extracted:', uniqueProducts.length);
    res.json({ 
      success: true, 
      products: uniqueProducts 
    });
  } catch (error) {
    console.error('❌ Error extracting products:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erro ao extrair produtos',
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
});

export default router;