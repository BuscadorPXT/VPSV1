import { Router } from 'express';
import type { Response } from 'express';
import { authenticateToken, type AuthenticatedRequest } from '../middleware/auth';
import { parseGoogleSheetWithDate } from '../services/google-sheets-parser';
import { storage } from '../storage';
import { db } from '../db';
import { suppliers } from '../../shared/schema';
import { eq, asc } from 'drizzle-orm';

const router = Router();

// Debug function to verify supplier ID consistency
const logSupplierDebugInfo = (suppliers: any[], targetDate: string) => {
  console.log(`🔍 SUPPLIER DEBUG INFO for date ${targetDate}:`);
  console.log(`📊 Total suppliers found: ${suppliers.length}`);

  suppliers.slice(0, 5).forEach((supplier, index) => {
    console.log(`   ${index + 1}. ID: ${supplier.id}, Name: "${supplier.name}", Products: ${supplier.productCount}`);
  });

  // Check for duplicate IDs
  const idCounts = new Map();
  suppliers.forEach(supplier => {
    const count = idCounts.get(supplier.id) || 0;
    idCounts.set(supplier.id, count + 1);
  });

  const duplicates = Array.from(idCounts.entries()).filter(([id, count]) => count > 1);
  if (duplicates.length > 0) {
    console.warn(`⚠️ Duplicate supplier IDs found:`, duplicates);
  } else {
    console.log(`✅ All supplier IDs are unique`);
  }
};

// Função auxiliar para pegar a data mais recente
async function getLatestDate(): Promise<string | null> {
  try {
    const dates = await storage.getDates();
    if (dates.length === 0) return null;
    return dates.sort().pop() || null;
  } catch (error) {
    console.error('Error getting latest date:', error);
    return null;
  }
}

// Listar fornecedores
router.get('/', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { dateFilter } = req.query;

    console.log(`🏪 Suppliers request - Date: ${dateFilter}`);

    // Determinar a data a usar
    let targetDate = dateFilter as string;
    if (!targetDate || targetDate === 'all') {
      targetDate = await getLatestDate();
      if (!targetDate) {
        // Fallback para a data mais recente conhecida
        targetDate = '24-06';
      }
    }

    console.log(`🏪 Final target date for suppliers: ${targetDate}`);

    console.log(`🏪 Using date for suppliers: ${targetDate}`);

    // Buscar produtos para extrair fornecedores
    let allProducts: any[] = [];
    try {
      const sheetId = process.env.GOOGLE_SHEET_ID;
      if (!sheetId) {
        throw new Error('GOOGLE_SHEET_ID não configurado');
      }

      const sheetData = await parseGoogleSheetWithDate(sheetId, targetDate);
      allProducts = sheetData.products;
      console.log(`🏪 Processing ${allProducts.length} products for suppliers extraction`);
    } catch (error) {
      console.error(`❌ Error getting suppliers for date ${targetDate}:`, error);

      // Fallback para a data mais recente
      const fallbackDate = await getLatestDate();
      if (fallbackDate && fallbackDate !== targetDate) {
        try {
          const sheetId = process.env.GOOGLE_SHEET_ID;
          if (!sheetId) {
            throw new Error('GOOGLE_SHEET_ID não configurado');
          }

          const fallbackSheetData = await parseGoogleSheetWithDate(sheetId, fallbackDate);
          allProducts = fallbackSheetData.products;
          targetDate = fallbackDate;
          console.log(`🏪 Fallback: Processing ${allProducts.length} products for suppliers`);
        } catch (fallbackError) {
          console.error('❌ Supplier fallback failed:', fallbackError);
          return res.json({ 
            suppliers: [],
            totalCount: 0,
            dateFilter: targetDate
          });
        }
      } else {
        return res.json({ 
          suppliers: [],
          totalCount: 0,
          dateFilter: targetDate
        });
      }
    }

    // Extrair fornecedores únicos
    const suppliersMap = new Map<string, any>();

    // Create a stable hash function for supplier IDs
    const generateSupplierId = (name: string): number => {
      let hash = 0;
      for (let i = 0; i < name.length; i++) {
        const char = name.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32bit integer
      }
      return Math.abs(hash);
    };

    allProducts.forEach((product, index) => {
      // Verificar se o produto tem fornecedor válido
      const supplierName = product.supplier?.name || product.supplierName || product.brand;

      if (supplierName && supplierName.trim()) {
        const cleanSupplierName = supplierName.trim();

        if (!suppliersMap.has(cleanSupplierName)) {
          suppliersMap.set(cleanSupplierName, {
            id: generateSupplierId(cleanSupplierName), // ID consistente baseado no nome
            name: cleanSupplierName,
            productCount: 0,
            categories: new Set<string>(),
            regions: new Set<string>(),
            active: true,
            createdAt: new Date().toISOString()
          });
        }

        const supplier = suppliersMap.get(cleanSupplierName)!;
        supplier.productCount++;

        if (product.category && product.category.trim()) {
          supplier.categories.add(product.category.trim());
        }
        if (product.region && product.region.trim()) {
          supplier.regions.add(product.region.trim());
        }
      }
    });

    // Converter para array e ordenar
    const suppliers = Array.from(suppliersMap.values())
      .map(supplier => ({
        ...supplier,
        categories: Array.from(supplier.categories),
        regions: Array.from(supplier.regions)
      }))
      .sort((a, b) => b.productCount - a.productCount);

    console.log(`🏪 Found ${suppliers.length} unique suppliers with total ${suppliers.reduce((sum, s) => sum + s.productCount, 0)} products`);

    // Add debug logging
    logSupplierDebugInfo(suppliers, targetDate);

    res.json({
      suppliers,
      dateFilter: targetDate,
      totalCount: suppliers.length
    });

  } catch (error) {
    console.error('Error fetching suppliers:', error);
    res.setHeader('Content-Type', 'application/json');
    res.status(500).json({ 
      success: false,
      message: 'Erro interno do servidor',
      suppliers: [],
      totalCount: 0
    });
  }
});

// Produtos por fornecedor
router.get('/:supplierId/products', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { supplierId } = req.params;
    const { dateFilter, page = '1', limit = '50' } = req.query;

    const pageNum = parseInt(page as string) || 1;
    const limitNum = parseInt(limit as string) || 50;
    const offset = (pageNum - 1) * limitNum;

    console.log(`🏪📦 Supplier products request - Supplier: ${supplierId}, Date: ${dateFilter}`);

    // Determinar a data a usar
    let targetDate = dateFilter as string;
    if (!targetDate || targetDate === 'all') {
      targetDate = await getLatestDate();
      if (!targetDate) {
        // Fallback para a data mais recente conhecida
        targetDate = '24-06';
      }
    }

    console.log(`🏪📦 Final target date for supplier products: ${targetDate}`);

    // Buscar produtos
    let allProducts: any[] = [];
    try {
      const sheetId = process.env.GOOGLE_SHEET_ID;
      if (!sheetId) {
        throw new Error('GOOGLE_SHEET_ID não configurado');
      }

      const sheetData = await parseGoogleSheetWithDate(sheetId, targetDate);
      allProducts = sheetData.products;
    } catch (error) {
      console.error(`❌ Error getting supplier products:`, error);
      return res.status(500).json({ 
        message: 'Carregando produtos...',
        products: [],
        supplier: null
      });
    }

    // Create a stable hash function for supplier IDs (same as above)
    const generateSupplierId = (name: string): number => {
      let hash = 0;
      for (let i = 0; i < name.length; i++) {
        const char = name.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32bit integer
      }
      return Math.abs(hash);
    };

    // Filtrar produtos por fornecedor usando ID ou nome
    const supplierProducts = allProducts.filter(product => {
      const supplierName = product.supplier?.name || product.supplierName || product.brand;
      if (!supplierName) return false;

      const cleanSupplierName = supplierName.trim();
      const supplierNumericId = generateSupplierId(cleanSupplierName);
      const normalizedSupplierName = cleanSupplierName.toLowerCase();
      const normalizedSupplierId = supplierId.toLowerCase().trim();

      // Try to match by numeric ID first, then by name
      const supplierIdAsNumber = parseInt(supplierId);
      if (!isNaN(supplierIdAsNumber) && supplierIdAsNumber === supplierNumericId) {
        return true;
      }

      // Fallback to name matching
      return (
        normalizedSupplierName === normalizedSupplierId ||
        normalizedSupplierName.replace(/\s+/g, '-') === normalizedSupplierId ||
        normalizedSupplierName.replace(/\s+/g, '') === normalizedSupplierId.replace(/\s+/g, '') ||
        cleanSupplierName === supplierId // Exact match
      );
    });

    console.log(`🏪📦 Filtered ${supplierProducts.length} products for supplier "${supplierId}" from ${allProducts.length} total products on date ${targetDate}`);

    // Encontrar informações do fornecedor
    const supplierInfo = supplierProducts.length > 0 ? {
      id: supplierId,
      name: supplierProducts[0].supplier?.name || supplierProducts[0].supplierName || supplierProducts[0].brand || supplierId,
      productCount: supplierProducts.length
    } : null;

    // Aplicar paginação
    const totalCount = supplierProducts.length;
    const totalPages = Math.ceil(totalCount / limitNum);
    const paginatedProducts = supplierProducts.slice(offset, offset + limitNum);

    console.log(`🏪📦 Found ${supplierProducts.length} products for supplier ${supplierId}`);

    res.json({
      products: paginatedProducts,
      supplier: supplierInfo,
      totalCount,
      currentPage: pageNum,
      totalPages,
      dateFilter: targetDate
    });

  } catch (error) {
    console.error('Error fetching supplier products:', error);
    res.setHeader('Content-Type', 'application/json');
    res.status(500).json({ 
      success: false,
      message: 'Erro interno do servidor',
      products: [],
      supplier: null
    });
  }
});

// Get supplier contacts
router.get('/contacts', authenticateToken, async (req, res) => {
  try {
    const SHEET_ID = process.env.GOOGLE_SHEET_ID;
    if (!SHEET_ID) {
      return res.status(500).json({ error: 'Google Sheet ID not configured' });
    }

    // Get current date
    const now = new Date();
    const currentDate = [
      String(now.getDate()).padStart(2, '0'),
      String(now.getMonth() + 1).padStart(2, '0')
    ].join('-');

    let sheetsData;
    try {
      sheetsData = await parseGoogleSheetWithDate(SHEET_ID, currentDate);
    } catch (error) {
      // Fallback to 'all' if current date fails
      sheetsData = await parseGoogleSheetWithDate(SHEET_ID, 'all');
    }

    const contacts = sheetsData?.supplierContacts || {};

    console.log('📞 Supplier contacts API called - returning:', {
      totalContacts: Object.keys(contacts).length,
      sampleContacts: Object.entries(contacts).slice(0, 3)
    });

    res.json({
      success: true,
      contacts
    });
  } catch (error) {
    console.error('Error fetching supplier contacts:', error);
    res.status(500).json({ error: 'Failed to fetch supplier contacts' });
  }
});

// Get suppliers from database (for ratings)
router.get('/database', authenticateToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    // Get suppliers from database
    const suppliersResult = await db
      .select()
      .from(suppliers)
      .where(eq(suppliers.active, true))
      .orderBy(asc(suppliers.name));

    console.log(`📦 Database suppliers API called - returning ${suppliersResult.length} suppliers`);

    res.json({
      success: true,
      suppliers: suppliersResult
    });
  } catch (error) {
    console.error('Error fetching suppliers from database:', error);
    res.status(500).json({ error: 'Failed to fetch suppliers from database' });
  }
});

export default router;