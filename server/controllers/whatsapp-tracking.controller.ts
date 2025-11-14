import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { db } from '../db';
import { sql } from 'drizzle-orm';
import { logger } from '../utils/logger';

export class WhatsAppTrackingController {
  async getStats(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      // Verificar se o usuário é admin usando a estrutura correta
      const user = req.user;
      const userData = user?.userData;

      if (!user || !userData || (!userData.isAdmin && userData.role !== 'admin' && userData.role !== 'superadmin')) {
        console.log(`❌ Admin access denied for user: ${user?.email}, isAdmin: ${userData?.isAdmin}, role: ${userData?.role}`);
        return res.status(403).json({
          success: false,
          message: 'Acesso negado. Permissões de administrador necessárias.'
        });
      }

      console.log(`✅ Admin access granted for user: ${userData.email} (${userData.role})`);

      const { days = 7, limit = 50 } = req.query;
      const daysNum = parseInt(days as string) || 7;
      const limitNum = parseInt(limit as string) || 50;

      console.log(`📊 WhatsApp stats request: ${daysNum} days, limit ${limitNum}`);

      // Calcular data de início
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - daysNum);
      const startDateStr = startDate.toISOString().split('T')[0]; // formato YYYY-MM-DD

      try {
        // Verificar se a tabela possui dados
        const tableCheck = await db.execute(sql`
          SELECT COUNT(*) as total_records FROM whatsapp_clicks
        `);

        console.log(`📊 Total records in whatsapp_clicks: ${tableCheck?.rows?.[0]?.total_records || 0}`);

        // Query para estatísticas gerais
        const statsQuery = await db.execute(sql`
          SELECT 
            COUNT(*) as total_clicks,
            COUNT(DISTINCT user_id) as unique_users,
            COUNT(DISTINCT supplier_name) as unique_suppliers,
            COUNT(DISTINCT product_model) as unique_products
          FROM whatsapp_clicks 
          WHERE clicked_at >= ${startDateStr}
        `);

        console.log(`📊 Stats query result:`, statsQuery?.rows?.[0]);

        // Query para top produtos
        const topProductsQuery = await db.execute(sql`
          SELECT 
            product_model,
            product_brand,
            supplier_name,
            COUNT(*) as click_count
          FROM whatsapp_clicks 
          WHERE clicked_at >= ${startDateStr}
          GROUP BY product_model, product_brand, supplier_name
          ORDER BY click_count DESC
          LIMIT ${limitNum}
        `);

        console.log(`📊 Top products found: ${topProductsQuery?.rows?.length || 0}`);

        // Query para top fornecedores
        const topSuppliersQuery = await db.execute(sql`
          SELECT 
            supplier_name,
            COUNT(*) as click_count
          FROM whatsapp_clicks 
          WHERE clicked_at >= ${startDateStr}
          GROUP BY supplier_name
          ORDER BY click_count DESC
          LIMIT ${limitNum}
        `);

        console.log(`📊 Top suppliers found: ${topSuppliersQuery?.rows?.length || 0}`);

        const stats = statsQuery.rows?.[0] || {
          total_clicks: 0,
          unique_users: 0,
          unique_suppliers: 0,
          unique_products: 0
        };

        // Estrutura de dados que o frontend espera
        const response = {
          success: true,
          data: {
            period: `${daysNum} days`,
            totalClicks: Number(stats.total_clicks),
            uniqueUsers: Number(stats.unique_users),
            uniqueSuppliers: Number(stats.unique_suppliers),
            uniqueProducts: Number(stats.unique_products),
            topProducts: (topProductsQuery?.rows || []).map(row => ({
              productModel: row?.product_model || 'Unknown',
              productBrand: row?.product_brand || null,
              supplierName: row?.supplier_name || 'Unknown',
              clickCount: Number(row?.click_count || 0)
            })),
            topSuppliers: (topSuppliersQuery?.rows || []).map(row => ({
              supplierName: row?.supplier_name || 'Unknown',
              clickCount: Number(row?.click_count || 0)
            })),
            dailyClicks: {} // Placeholder para dados diários
          }
        };

        console.log(`✅ WhatsApp stats generated: ${response.data.totalClicks} total clicks`);
        res.json(response);

      } catch (dbError) {
        console.error('❌ Database query error:', dbError);

        // Retornar dados vazios se houver erro na query
        res.json({
          success: true,
          data: {
            period: `${daysNum} days`,
            totalClicks: 0,
            uniqueUsers: 0,
            uniqueSuppliers: 0,
            uniqueProducts: 0,
            topProducts: [],
            topSuppliers: [],
            dailyClicks: {}
          }
        });
      }

    } catch (error) {
      console.error('❌ WhatsApp tracking stats error:', error);
      logger.error('WhatsApp tracking stats error:', error);

      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor ao buscar estatísticas',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  async recordClick(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userData = req.user?.userData;
      if (!userData) {
        return res.status(401).json({
          success: false,
          message: 'Usuário não autenticado'
        });
      }

      const {
        productModel,
        productBrand,
        productColor,
        productStorage,
        productCategory,
        supplierName,
        whatsappNumber,
        productPrice
      } = req.body;

      // Registrar o clique
      await db.execute(sql`
        INSERT INTO whatsapp_clicks (
          user_id, product_model, product_brand, product_color, 
          product_storage, product_category, supplier_name, 
          whatsapp_number, product_price, clicked_at, ip_address, user_agent
        ) VALUES (
          ${userData.id}, ${productModel}, ${productBrand}, ${productColor},
          ${productStorage}, ${productCategory}, ${supplierName},
          ${whatsappNumber}, ${productPrice}, NOW(), ${req.ip}, ${req.headers['user-agent']}
        )
      `);

      console.log(`📱 WhatsApp click recorded: ${productModel} by user ${userData.email}`);

      res.json({
        success: true,
        message: 'Clique registrado com sucesso'
      });

    } catch (error) {
      console.error('❌ WhatsApp click recording error:', error);
      logger.error('WhatsApp click recording error:', error);

      res.status(500).json({
        success: false,
        message: 'Erro ao registrar clique'
      });
    }
  }
}

export const whatsAppTrackingController = new WhatsAppTrackingController();

export const getWhatsAppStats = async (req: any, res: any) => {
  try {
    // Verificar se o usuário é admin
    const user = (req as any).user;
    if (!user?.isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Acesso negado. Apenas administradores podem acessar as estatísticas.'
      });
    }

    const { period = '30' } = req.query;
    const days = parseInt(period as string) || 30;

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    const startDateStr = startDate.toISOString().split('T')[0];

    console.log(`📊 Fetching WhatsApp stats for ${days} days from ${startDateStr}`);

    // Verificar se a tabela existe
    const tableExists = await db.execute(sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'whatsapp_clicks'
      )
    `);

    if (!tableExists.rows[0].exists) {
      console.log('⚠️ WhatsApp clicks table does not exist');
      return res.json({
        success: true,
        stats: {
          totalClicks: 0,
          uniqueUsers: 0,
          uniqueSuppliers: 0,
          uniqueProducts: 0,
          period: `Últimos ${days} dias`
        },
        dailyStats: [],
        topProducts: [],
        topSuppliers: []
      });
    }

    // Estatísticas gerais
    const statsQuery = await db.execute(sql`
      SELECT 
        COUNT(*) as total_clicks,
        COUNT(DISTINCT user_id) as unique_users,
        COUNT(DISTINCT supplier_name) as unique_suppliers,
        COUNT(DISTINCT product_model) as unique_products
      FROM whatsapp_clicks 
      WHERE clicked_at >= ${startDateStr}
    `);

    const stats = statsQuery.rows[0];

    // Estatísticas diárias
    const dailyStatsQuery = await db.execute(sql`
      SELECT 
        DATE(clicked_at) as date,
        COUNT(*) as clicks
      FROM whatsapp_clicks 
      WHERE clicked_at >= ${startDateStr}
      GROUP BY DATE(clicked_at)
      ORDER BY date DESC
    `);

    // Top produtos
    const topProductsQuery = await db.execute(sql`
      SELECT 
        product_model,
        product_brand,
        COUNT(*) as clicks
      FROM whatsapp_clicks 
      WHERE clicked_at >= ${startDateStr}
      GROUP BY product_model, product_brand
      ORDER BY clicks DESC
      LIMIT 10
    `);

    // Top fornecedores
    const topSuppliersQuery = await db.execute(sql`
      SELECT 
        supplier_name,
        COUNT(*) as clicks
      FROM whatsapp_clicks 
      WHERE clicked_at >= ${startDateStr}
      GROUP BY supplier_name
      ORDER BY clicks DESC
      LIMIT 10
    `);

    const response = {
      success: true,
      stats: {
        totalClicks: parseInt(stats.total_clicks) || 0,
        uniqueUsers: parseInt(stats.unique_users) || 0,
        uniqueSuppliers: parseInt(stats.unique_suppliers) || 0,
        uniqueProducts: parseInt(stats.unique_products) || 0,
        period: `Últimos ${days} dias`
      },
      dailyStats: dailyStatsQuery.rows.map(row => ({
        date: row.date,
        clicks: parseInt(row.clicks)
      })),
      topProducts: topProductsQuery.rows.map(row => ({
        productId: `${row.product_model}-${row.product_brand}`,
        productName: `${row.product_model} (${row.product_brand})`,
        clicks: parseInt(row.clicks)
      })),
      topSuppliers: topSuppliersQuery.rows.map(row => ({
        supplierId: row.supplier_name,
        supplierName: row.supplier_name,
        clicks: parseInt(row.clicks)
      }))
    };

    console.log('📊 WhatsApp stats response:', response);
    res.json(response);

  } catch (error) {
    console.error('❌ Error fetching WhatsApp stats:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: error.message
    });
  }
};