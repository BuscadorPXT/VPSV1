import { Router } from 'express';
import { authenticateToken } from '../middleware/auth';
// Updated import to use default import
import googleSheetsService from '../services/google-sheets';

const router = Router();

// Get all categories
router.get('/categories', authenticateToken, async (req, res) => {
  try {
    // Import Google Sheets parser dynamically
    const { parseGoogleSheetWithDate } = await import('../services/google-sheets-parser');
    const sheetsData = await parseGoogleSheetWithDate('all');
    const products = sheetsData.products || [];

    const categories = [...new Set(
      products
        .map(p => p.category)
        .filter(category => category && category.trim())
        .sort()
    )];

    console.log(`📋 Categories endpoint: Found ${categories.length} unique categories`);
    res.json(categories);
  } catch (error) {
    console.error('❌ Error fetching categories:', error);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

// Get all capacities
router.get('/capacities', authenticateToken, async (req, res) => {
  try {
    // Import Google Sheets parser dynamically
    const { parseGoogleSheetWithDate } = await import('../services/google-sheets-parser');
    const sheetsData = await parseGoogleSheetWithDate('all');
    const products = sheetsData.products || [];

    const capacities = [...new Set(
      products
        .map(p => p.capacity)
        .filter(capacity => capacity && capacity.trim())
        .sort()
    )];

    console.log(`🔋 Capacities endpoint: Found ${capacities.length} unique capacities`);
    res.json(capacities);
  } catch (error) {
    console.error('❌ Error fetching capacities:', error);
    res.status(500).json({ error: 'Failed to fetch capacities' });
  }
});

// Get all regions
router.get('/regions', authenticateToken, async (req, res) => {
  try {
    // Import Google Sheets parser dynamically
    const { parseGoogleSheetWithDate } = await import('../services/google-sheets-parser');
    const sheetsData = await parseGoogleSheetWithDate('all');
    const products = sheetsData.products || [];

    const regions = [...new Set(
      products
        .map(p => p.region)
        .filter(region => region && region.trim())
        .sort()
    )];

    console.log(`🌎 Regions endpoint: Found ${regions.length} unique regions`);
    res.json(regions);
  } catch (error) {
    console.error('❌ Error fetching regions:', error);
    res.status(500).json({ error: 'Failed to fetch regions' });
  }
});

// Get all colors
router.get('/colors', authenticateToken, async (req, res) => {
  try {
    // Import Google Sheets parser dynamically
    const { parseGoogleSheetWithDate } = await import('../services/google-sheets-parser');
    const sheetsData = await parseGoogleSheetWithDate('all');
    const products = sheetsData.products || [];

    const colors = [...new Set(
      products
        .map(p => p.color)
        .filter(color => color && color.trim())
        .sort()
    )];

    console.log(`🎨 Colors endpoint: Found ${colors.length} unique colors`);
    res.json(colors);
  } catch (error) {
    console.error('❌ Error fetching colors:', error);
    res.status(500).json({ error: 'Failed to fetch colors' });
  }
});

// Get dynamic filters based on search and current products
router.get('/dynamic', authenticateToken, async (req, res) => {
  try {
    const { search, date, category, supplier } = req.query;

    console.log('🔍 Dynamic filters request:', { search, date, category, supplier });

    // Import Google Sheets parser
    const { parseGoogleSheetWithDate } = await import('../services/google-sheets-parser');

    // Get products from Google Sheets
    const sheetsData = await parseGoogleSheetWithDate(date as string || 'all');
    let products = sheetsData.products || [];

    console.log('📊 Total products from sheets:', products.length);

    // Apply precise search filter if provided (same logic as frontend)
    if (search && typeof search === 'string' && search.trim()) {
      const searchTerm = search.toLowerCase().trim();

      // Exact iPhone pattern matching to prevent cross-contamination
      const iphoneMatch = searchTerm.match(/^iphone\s*(\d+)([a-z]*)?(\s+pro)?(\s+max|\s+plus|\s+mini)?$/i);

      products = products.filter((product: any) => {
        const productModel = (product.model || '').toLowerCase();
        const productBrand = (product.brand || '').toLowerCase();
        const productCategory = (product.category || '').toLowerCase();
        const supplierName = typeof product.supplier === 'string' ? 
          product.supplier.toLowerCase() : 
          (product.supplier?.name || product.supplierName || '').toLowerCase();

        if (iphoneMatch) {
          const number = iphoneMatch[1];
          const variant = iphoneMatch[2] || '';
          const pro = iphoneMatch[3] || '';
          const size = iphoneMatch[4] || '';

          // Must be iPhone category
          if (product.category !== 'IPH' && !productModel.includes('iphone')) {
            return false;
          }

          // Build exact pattern for iPhone search with strict matching
          let exactPattern = `^iphone\\s*${number}`;
          if (variant) exactPattern += variant;
          if (pro) exactPattern += '\\s*pro';
          if (size) {
            const sizeNormalized = size.trim().toLowerCase();
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
          if (!pro && !size) {
            exactPattern += '(?!\\s*(pro|max|plus|mini))';
          } else if (pro && !size) {
            exactPattern += '(?!\\s*(max|plus))';
          }

          exactPattern += '(?:\\s|$)';
          const exactRegex = new RegExp(exactPattern, 'i');

          console.log(`🔍 iPhone pattern matching for "${searchTerm}":`, {
            productModel,
            pattern: exactPattern,
            matches: exactRegex.test(productModel)
          });

          return exactRegex.test(productModel);
        }

        // Basic text search across key fields for other products
        return productModel.includes(searchTerm) || 
               productBrand.includes(searchTerm) || 
               productCategory.includes(searchTerm) ||
               supplierName.includes(searchTerm) ||
               (product.color && product.color.toLowerCase().includes(searchTerm)) ||
               (product.storage && product.storage.toLowerCase().includes(searchTerm));
      });
    }

    console.log('📊 Products after precise search filter:', products.length);

    // Apply other filters if provided (category, supplier)
    if (category && typeof category === 'string' && category.trim()) {
      const filterCategory = category.trim();
      console.log(`🔧 Applying category filter: "${filterCategory}"`);
      products = products.filter(product => 
        product.category && product.category.toLowerCase() === filterCategory.toLowerCase()
      );
    }

    if (supplier && typeof supplier === 'string' && supplier.trim()) {
      const filterSupplier = supplier.trim();
      console.log(`🔧 Applying supplier filter: "${filterSupplier}"`);
      products = products.filter((product: any) => {
        const supplierName = typeof product.supplier === 'string' ? 
          product.supplier : 
          (product.supplier?.name || product.supplierName || '');
        return supplierName.toLowerCase() === filterSupplier.toLowerCase();
      });
    }


    // Gerar contadores para cada tipo de filtro
    const categories = new Map<string, number>();
    const brands = new Map<string, number>();
    const colors = new Map<string, number>();
    const storages = new Map<string, number>();
    const regions = new Map<string, number>();

    products.forEach(product => {
      if (product.category?.trim()) {
        categories.set(product.category, (categories.get(product.category) || 0) + 1);
      }
      if (product.brand?.trim()) {
        brands.set(product.brand, (brands.get(product.brand) || 0) + 1);
      }
      if (product.color?.trim()) {
        colors.set(product.color, (colors.get(product.color) || 0) + 1);
      }
      const storage = product.storage || product.capacity;
      if (storage?.trim()) {
        storages.set(storage, (storages.get(storage) || 0) + 1);
      }
      if (product.region?.trim()) {
        regions.set(product.region, (regions.get(product.region) || 0) + 1);
      }
    });

    // Converter para array ordenado por contagem
    const toSortedArray = (map: Map<string, number>) => 
      Array.from(map.entries())
        .map(([value, count]) => ({ value, label: value, count }))
        .sort((a, b) => b.count - a.count);

    const result = {
      categories: toSortedArray(categories),
      brands: toSortedArray(brands),
      colors: toSortedArray(colors),
      storages: toSortedArray(storages),
      regions: toSortedArray(regions),
      totalProducts: products.length,
      searchTerm: search || null
    };

    console.log(`🔍 Dynamic filters for "${search || 'all'}": ${result.totalProducts} products, ${result.categories.length} categories, ${result.brands.length} brands`);

    if (search && result.totalProducts === 0) {
      console.log(`⚠️ No products found for search term: "${search}"`);
    }

    res.json(result);
  } catch (error) {
    console.error('❌ Error fetching dynamic filters:', error);
    res.status(500).json({ error: 'Failed to fetch dynamic filters' });
  }
});

export default router;