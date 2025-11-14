import { Router } from 'express';
import { db } from '../db';
import { eq, and, desc, sql } from 'drizzle-orm';
import { authenticateToken } from '../middleware/auth';
import { z } from 'zod';

const router = Router();

// Interest list item schema for validation
const interestListItemSchema = z.object({
  productModel: z.string().min(1, 'Product model is required'),
  productBrand: z.string().min(1, 'Product brand is required'),
  productStorage: z.string().min(1, 'Product storage is required'),
  productColor: z.string().min(1, 'Product color is required'),
  productCategory: z.string().optional(),
  productCapacity: z.string().optional(),
  productRegion: z.string().optional(),
  supplierName: z.string().min(1, 'Supplier name is required'),
  supplierPrice: z.number().positive('Price must be positive'),
  quantity: z.number().positive('Quantity must be positive').default(1),
  dateAdded: z.string().min(1, 'Date added is required'),
  marginValue: z.number().optional(),
  marginType: z.enum(['percentage', 'fixed']).default('percentage'),
});

// Margin update schema for PATCH requests
const marginUpdateSchema = z.object({
  marginValue: z.number().nullable(),
  marginType: z.enum(['percentage', 'fixed']).default('percentage'),
});

// Get user's interest list
router.get('/', authenticateToken, async (req, res) => {
  try {
    console.log('🔐 Interest list GET - Auth check:', {
      hasUser: !!req.user,
      userId: req.user?.id,
      email: req.user?.email,
      role: req.user?.role,
      headers: {
        authorization: !!req.headers.authorization,
        'x-session-token': !!req.headers['x-session-token'],
        cookie: !!req.headers.cookie
      }
    });

    const userId = req.user?.id;
    if (!userId) {
      console.error('❌ Interest list GET - No user ID found in req.user:', req.user);
      return res.status(401).json({ 
        error: 'User not authenticated',
        message: 'Usuario nao autenticado'
      });
    }

    // Pagination parameters
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const offset = (page - 1) * limit;

    console.log('🔍 Fetching interest list for user:', userId, 'Page:', page, 'Limit:', limit);

    // Get total count for pagination
    const totalCountResult = await db.execute(sql`
      SELECT COUNT(*) as total FROM interest_list WHERE user_id = ${userId}
    `);
    const totalCount = parseInt(String(totalCountResult[0]?.total || '0'));

    // Get interest list items from database with pagination
    const interestListItems = await db.execute(sql`
      SELECT 
        id,
        user_id,
        product_model as model,
        product_brand as brand,
        product_storage as storage,
        product_color as color,
        product_category as category,
        product_capacity as capacity,
        product_region as region,
        supplier_name as supplierName,
        supplier_name as suppliername,
        supplier_price,
        CAST(supplier_price AS DECIMAL(10,2)) as supplierPrice,
        quantity,
        date_added,
        margin_value as marginValue,
        margin_type as marginType,
        sales_price as salesPrice,
        created_at,
        updated_at
      FROM interest_list 
      WHERE user_id = ${userId}
      ORDER BY supplier_name, created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `);

    console.log('📋 Interest list items found:', interestListItems.length);

    // Debug: log first few items to understand the data structure
    if (interestListItems.length > 0) {
      console.log('🔍 Raw query result structure:', {
        firstItem: interestListItems[0],
        allKeys: Object.keys(interestListItems[0] || {}),
        supplierPriceField: interestListItems[0]?.supplierprice,
        supplierPriceType: typeof interestListItems[0]?.supplierprice
      });

      console.log('🔍 First few items from database:', interestListItems.slice(0, 3).map(item => ({
        id: item.id,
        model: item.model,
        supplier_name: item.suppliername,
        supplier_price: item.supplierprice,
        supplier_price_type: typeof item.supplierprice,
        quantity: item.quantity,
        allItemKeys: Object.keys(item)
      })));
    }

    if (interestListItems.length === 0) {
      return res.json({
        success: true,
        data: {
          suppliers: [],
          totalValue: 0,
          itemCount: 0
        }
      });
    }

    // Usar preços salvos no banco para melhor performance
    console.log('💾 Using saved prices from database for better performance');

    // Dados vazios do Google Sheets já que vamos usar preços salvos
    const sheetsData = { products: [] };

    // Helper function to generate consistent supplier IDs
    function generateSupplierId(name: string): number {
      let hash = 0;
      for (let i = 0; i < name.length; i++) {
        const char = name.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
      }
      return Math.abs(hash);
    }

    // Função para encontrar preço atual - usando preço salvo como prioritário
    function findCurrentPrice(item: any): number {
      // Tentar múltiplas formas de acessar o preço
      let savedPrice = 0;

      // O campo retornado pela query SQL pode ter diferentes nomes
      if (item.supplierPrice) {
        savedPrice = parseFloat(item.supplierPrice);
      } else if (item.supplierprice) {
        savedPrice = parseFloat(item.supplierprice);
      } else if (item.supplier_price) {
        savedPrice = parseFloat(item.supplier_price);
      }

      // Se ainda estiver 0, tentar parsing mais robusto
      if (savedPrice === 0 && item.supplierPrice) {
        const priceString = item.supplierPrice.toString().replace(/[^\d.,]/g, '').replace(',', '.');
        savedPrice = parseFloat(priceString) || 0;
      }

      // Debug logging mais detalhado
      console.log(`🔍 Price debugging for ${item.model}:`, {
        supplierPrice: item.supplierPrice,
        supplierprice: item.supplierprice,
        supplier_price: item.supplier_price,
        parsedPrice: savedPrice,
        itemKeys: Object.keys(item)
      });

      return savedPrice;
    }

    // Function to format price
    function formatPrice(price: number): string {
      return `R$ ${price.toFixed(2).replace('.', ',')}`;
    }

    // Process items with proper price handling
    const processedItems = interestListItems.map((item: any) => {
      const productModel = item.model ? item.model.toString().trim() : '';
      const productBrand = item.brand ? item.brand.toString().trim() : '';
      const productStorage = item.storage ? item.storage.toString().trim() : '';
      const productColor = item.color ? item.color.toString().trim() : '';
      const supplierName = item.supplierName || item.suppliername || 'Fornecedor Desconhecido';
      const cleanSupplierName = supplierName.toString().trim();
      const quantity = parseInt(item.quantity) || 1;

      // Buscar preço atual
      const currentPrice = findCurrentPrice(item);

      // Handle date fields properly - prioritize createdAt as it's the date item was added to interest list
      const createdAtDate = item.createdAt || item.created_at;
      const dateAddedField = item.dateAdded || item.date_added;

      console.log(`📋 Processing item ${item.id}: ${productModel} - Supplier: ${cleanSupplierName} - Price: ${formatPrice(currentPrice)} - CreatedAt: ${createdAtDate}`);

      // Process margin data
      const marginValue = item.marginvalue || item.marginValue || null;
      const marginType = (item.margintype || item.marginType || 'percentage') as 'percentage' | 'fixed';
      let salesPrice = currentPrice;
      
      // Calculate sales price if margin exists
      if (marginValue && marginValue > 0 && currentPrice > 0) {
        if (marginType === 'percentage') {
          salesPrice = currentPrice * (1 + marginValue / 100);
        } else {
          salesPrice = currentPrice + marginValue;
        }
      } else if (item.salesprice && !isNaN(parseFloat(item.salesprice))) {
        // Use saved sales price if available
        salesPrice = parseFloat(item.salesprice);
      }

      return {
        id: item.id,
        productId: item.productId || item.product_id,
        userId: item.userId || item.user_id,
        model: productModel || 'Produto não identificado',
        brand: productBrand || 'Marca não informada',
        storage: productStorage || 'Não informado',
        color: productColor || 'Não informado',
        category: item.category || item.productCategory || 'Outros',
        capacity: item.capacity || item.productCapacity || '',
        region: item.region || item.productRegion || '',
        supplierName: cleanSupplierName,
        supplierId: item.supplierId || item.supplier_id,
        price: formatPrice(currentPrice),
        supplierPrice: currentPrice,
        quantity: quantity,
        createdAt: createdAtDate, // This is when the item was added to interest list
        dateAdded: dateAddedField,
        isRealTimePrice: false,
        // Add margin fields
        marginValue: marginValue,
        marginType: marginType,
        salesPrice: salesPrice
      };
    });

    // Group by supplier
    const groupedItems = processedItems.reduce((acc: any, item: any) => {
      const supplierName = item.supplierName;
      if (!acc[supplierName]) {
        acc[supplierName] = {
          supplier: supplierName,
          items: [],
          subtotal: 0
        };
      }

      acc[supplierName].items.push(item);
      acc[supplierName].subtotal += item.subtotal;

      return acc;
    }, {});

    // Calculate total
    const totalValue = Object.values(groupedItems).reduce((sum: number, group: any) => {
      return sum + group.subtotal;
    }, 0);

    const suppliersArray = Object.values(groupedItems);

    console.log('💰 Interest list processed with real-time prices:', {
      totalItems: processedItems.length,
      totalValue: `R$ ${totalValue.toFixed(2)}`,
      suppliersCount: suppliersArray.length,
      itemsWithPrices: processedItems.filter(item => item.supplierPrice > 0).length,
      itemsWithoutPrices: processedItems.filter(item => item.supplierPrice === 0).length,
      realTimePrices: processedItems.filter(item => item.isRealTimePrice).length
    });

    // Calculate pagination info
    const totalPages = Math.ceil(totalCount / limit);
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;

    // Send both grouped and flat data for frontend compatibility
    res.json({
      success: true,
      data: {
        suppliers: suppliersArray,
        items: processedItems, // Add flat items array for easier frontend access
        totalValue,
        itemCount: processedItems.length,
        isRealTime: sheetsData.products.length > 0,
        lastUpdate: new Date().toISOString(),
        pagination: {
          currentPage: page,
          totalPages: totalPages,
          totalItems: totalCount,
          itemsPerPage: limit,
          hasNextPage: hasNextPage,
          hasPrevPage: hasPrevPage
        }
      }
    });
  } catch (error) {
    console.error('❌ Error fetching interest list:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Add item to interest list
router.post('/', authenticateToken, async (req, res) => {
  try {
    console.log('🔐 Interest list POST - Auth check:', {
      hasUser: !!req.user,
      userId: req.user?.id,
      email: req.user?.email,
      role: req.user?.role,
      requestBody: req.body,
      headers: {
        authorization: !!req.headers.authorization,
        'x-session-token': !!req.headers['x-session-token'],
        cookie: !!req.headers.cookie,
        userAgent: req.headers['user-agent']?.substring(0, 50)
      }
    });

    const userId = req.user?.id;
    if (!userId) {
      console.error('❌ Interest list POST - No user ID found in req.user:', {
        user: req.user,
        authHeader: req.headers.authorization?.substring(0, 20) + '...',
        sessionToken: req.headers['x-session-token']?.substring(0, 20) + '...'
      });
      return res.status(401).json({ 
        error: 'User not authenticated',
        message: 'Usuario nao autenticado - sessao invalida'
      });
    }

    const validatedData = interestListItemSchema.parse(req.body);

    // Check if item already exists (same product + supplier combination)
    const existingResult = await db.execute(sql`
      SELECT id FROM interest_list 
      WHERE user_id = ${userId}
      AND product_model = ${validatedData.productModel}
      AND product_brand = ${validatedData.productBrand}
      AND product_storage = ${validatedData.productStorage}
      AND product_color = ${validatedData.productColor}
      AND supplier_name = ${validatedData.supplierName}
    `);

    if (existingResult.length > 0) {
      return res.status(400).json({ 
        error: 'Item already exists in your interest list',
        message: 'Este produto já está na sua lista de interesses'
      });
    }

    // Insert new item
    console.log('💾 Inserting product into interest list:', {
      userId,
      validatedData,
      originalRequestBody: req.body
    });

    const result = await db.execute(sql`
      INSERT INTO interest_list (
        user_id, product_model, product_brand, product_storage, 
        product_color, product_category, product_capacity,
        product_region, supplier_name, supplier_price, quantity,
        date_added
      ) VALUES (
        ${userId}, ${validatedData.productModel}, ${validatedData.productBrand}, 
        ${validatedData.productStorage}, ${validatedData.productColor}, 
        ${validatedData.productCategory || null}, ${validatedData.productCapacity || null},
        ${validatedData.productRegion || null}, ${validatedData.supplierName},
        ${validatedData.supplierPrice}, ${validatedData.quantity}, ${validatedData.dateAdded}
      )
      RETURNING id
    `);

    console.log('✅ Product inserted successfully:', result);

    res.status(201).json({
      success: true,
      message: 'Item added to interest list successfully',
      data: { id: result[0]?.id }
    });
  } catch (error) {
    console.error('❌ Error adding item to interest list:', error);

    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Validation error',
        details: error.errors
      });
    }

    res.status(500).json({ error: 'Internal server error' });
  }
});

// Remove item from interest list
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const userId = req.user?.id;
    const itemId = parseInt(req.params.id);

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    if (!itemId || isNaN(itemId)) {
      return res.status(400).json({ error: 'Invalid item ID' });
    }

    // Delete item (only if it belongs to the user)
    const deleteResult = await db.execute(sql`
      DELETE FROM interest_list WHERE id = ${itemId} AND user_id = ${userId}
    `);

    if (deleteResult.rowCount === 0) {
      return res.status(404).json({ error: 'Item not found or not owned by user' });
    }

    res.json({
      success: true,
      message: 'Item removed from interest list successfully'
    });
  } catch (error) {
    console.error('❌ Error removing item from interest list:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Clear entire interest list
router.delete('/', authenticateToken, async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    await db.execute(sql`
      DELETE FROM interest_list WHERE user_id = ${userId}
    `);

    res.json({
      success: true,
      message: 'Interest list cleared successfully'
    });
  } catch (error) {
    console.error('❌ Error clearing interest list:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update item quantity
router.patch('/:id/quantity', authenticateToken, async (req, res) => {
  try {
    const userId = req.user?.id;
    const itemId = parseInt(req.params.id);
    const { quantity } = req.body;

    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    if (!itemId || isNaN(itemId)) {
      return res.status(400).json({ error: 'Invalid item ID' });
    }

    if (!quantity || quantity < 1) {
      return res.status(400).json({ error: 'Quantity must be at least 1' });
    }

    // Update quantity
    const updateResult = await db.execute(sql`
      UPDATE interest_list 
      SET quantity = ${quantity}, updated_at = NOW() 
      WHERE id = ${itemId} AND user_id = ${userId}
    `);

    if (updateResult.rowCount === 0) {
      return res.status(404).json({ error: 'Item not found or not owned by user' });
    }

    res.json({
      success: true,
      message: 'Quantity updated successfully'
    });
  } catch (error) {
    console.error('❌ Error updating item quantity:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update margin for an interest list item
router.patch('/:id/margin', authenticateToken, async (req: any, res) => {
  try {
    const itemId = parseInt(req.params.id);
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ 
        error: 'User not authenticated',
        message: 'Usuario nao autenticado'
      });
    }

    // Validate request body
    const validation = marginUpdateSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        error: 'Invalid request data',
        details: validation.error.errors
      });
    }

    const { marginValue, marginType } = validation.data;

    // Get the item to verify ownership and calculate sales price
    const itemResult = await db.execute(sql`
      SELECT supplier_price, quantity FROM interest_list 
      WHERE id = ${itemId} AND user_id = ${userId}
    `);

    if (itemResult.length === 0) {
      return res.status(404).json({
        error: 'Item not found or not owned by user'
      });
    }

    const item = itemResult[0];
    
    // Better supplier price parsing with multiple fallbacks
    let supplierPrice = 0;
    if (item.supplier_price) {
      const priceStr = String(item.supplier_price).replace(/[^\d.,]/g, '').replace(',', '.');
      supplierPrice = parseFloat(priceStr);
      
      if (isNaN(supplierPrice) || supplierPrice <= 0) {
        console.warn(`⚠️ Invalid supplier price for item ${itemId}:`, item.supplier_price);
        supplierPrice = 0;
      }
    }
    
    console.log(`💰 [MARGIN-UPDATE] Item ${itemId} - Supplier Price: ${supplierPrice}, Margin: ${marginValue}% (${marginType})`);
    
    // Calculate sales price
    let salesPrice = supplierPrice;
    if (marginValue !== null && marginValue !== undefined && supplierPrice > 0) {
      if (marginType === 'percentage') {
        salesPrice = supplierPrice * (1 + marginValue / 100);
      } else {
        salesPrice = supplierPrice + marginValue;
      }
      
      // Validate the calculated sales price
      if (isNaN(salesPrice) || salesPrice <= 0) {
        console.error(`❌ [MARGIN-UPDATE] Invalid calculated sales price for item ${itemId}:`, salesPrice);
        salesPrice = supplierPrice; // Fallback to original price
      }
    }
    
    console.log(`💰 [MARGIN-UPDATE] Final Sales Price: ${salesPrice}`);

    // Update the item with proper sales price formatting
    const formattedSalesPrice = salesPrice.toFixed(2);
    
    await db.execute(sql`
      UPDATE interest_list 
      SET 
        margin_value = ${marginValue},
        margin_type = ${marginType},
        sales_price = ${formattedSalesPrice},
        updated_at = NOW()
      WHERE id = ${itemId} AND user_id = ${userId}
    `);

    console.log(`✅ Updated margin for item ${itemId}: ${marginValue} (${marginType}) -> Sales Price: ${salesPrice}`);

    res.json({
      success: true,
      data: {
        id: itemId,
        marginValue,
        marginType,
        salesPrice: parseFloat(salesPrice.toFixed(2))
      }
    });

  } catch (error) {
    console.error('❌ Error updating margin:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Erro interno do servidor'
    });
  }
});

export default router;