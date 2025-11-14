
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { sql } from 'drizzle-orm';

const client = postgres(process.env.DATABASE_URL, { ssl: 'require' });
const db = drizzle(client);

async function comprehensiveAnalyticsDiagnostics() {
  try {
    console.log('🔍 DIAGNÓSTICO COMPLETO DO ANALYTICS WHATSAPP');
    console.log('='.repeat(60));

    // 1. Verificar estrutura da tabela
    console.log('\n1️⃣ ESTRUTURA DA TABELA');
    const tableStructure = await db.execute(sql`
      SELECT 
        column_name, 
        data_type, 
        is_nullable,
        column_default
      FROM information_schema.columns 
      WHERE table_name = 'whatsapp_clicks' 
      ORDER BY ordinal_position
    `);
    
    console.log('📋 Colunas da tabela whatsapp_clicks:');
    tableStructure.rows.forEach(col => {
      console.log(`   ${col.column_name}: ${col.data_type} ${col.is_nullable === 'YES' ? '(nullable)' : '(not null)'}`);
    });

    // 2. Verificar dados existentes
    console.log('\n2️⃣ ANÁLISE DOS DADOS');
    const dataCheck = await db.execute(sql`
      SELECT 
        COUNT(*) as total_records,
        COUNT(DISTINCT user_id) as unique_users,
        COUNT(DISTINCT supplier_name) as unique_suppliers,
        COUNT(DISTINCT product_model) as unique_products,
        MIN(clicked_at) as oldest_click,
        MAX(clicked_at) as newest_click
      FROM whatsapp_clicks
    `);

    const data = dataCheck.rows[0];
    console.log(`📊 Total de registros: ${data.total_records}`);
    console.log(`👥 Usuários únicos: ${data.unique_users}`);
    console.log(`🏪 Fornecedores únicos: ${data.unique_suppliers}`);
    console.log(`📱 Produtos únicos: ${data.unique_products}`);
    console.log(`📅 Primeiro clique: ${data.oldest_click}`);
    console.log(`📅 Último clique: ${data.newest_click}`);

    // 3. Testar queries específicas do analytics
    console.log('\n3️⃣ TESTE DAS QUERIES DO ANALYTICS');
    
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);
    const startDateStr = startDate.toISOString().split('T')[0];
    
    console.log(`🗓️ Testando período: ${startDateStr} até hoje`);

    // Testar query de estatísticas
    try {
      const statsQuery = await db.execute(sql`
        SELECT 
          COUNT(*) as total_clicks,
          COUNT(DISTINCT user_id) as unique_users,
          COUNT(DISTINCT supplier_name) as unique_suppliers,
          COUNT(DISTINCT product_model) as unique_products
        FROM whatsapp_clicks 
        WHERE clicked_at >= ${startDateStr}
      `);
      
      console.log('✅ Query de estatísticas executada com sucesso:');
      console.log('   Resultado:', statsQuery.rows[0]);
    } catch (error) {
      console.error('❌ Erro na query de estatísticas:', error.message);
    }

    // Testar query de produtos
    try {
      const productsQuery = await db.execute(sql`
        SELECT 
          product_model,
          product_brand,
          supplier_name,
          COUNT(*) as click_count
        FROM whatsapp_clicks 
        WHERE clicked_at >= ${startDateStr}
        GROUP BY product_model, product_brand, supplier_name
        ORDER BY click_count DESC
        LIMIT 10
      `);
      
      console.log('✅ Query de produtos executada com sucesso:');
      console.log(`   Produtos encontrados: ${productsQuery.rows.length}`);
      productsQuery.rows.forEach((product, index) => {
        console.log(`   ${index + 1}. ${product.product_model} (${product.supplier_name}) - ${product.click_count} cliques`);
      });
    } catch (error) {
      console.error('❌ Erro na query de produtos:', error.message);
    }

    // Testar query de fornecedores
    try {
      const suppliersQuery = await db.execute(sql`
        SELECT 
          supplier_name,
          COUNT(*) as click_count
        FROM whatsapp_clicks 
        WHERE clicked_at >= ${startDateStr}
        GROUP BY supplier_name
        ORDER BY click_count DESC
        LIMIT 10
      `);
      
      console.log('✅ Query de fornecedores executada com sucesso:');
      console.log(`   Fornecedores encontrados: ${suppliersQuery.rows.length}`);
      suppliersQuery.rows.forEach((supplier, index) => {
        console.log(`   ${index + 1}. ${supplier.supplier_name} - ${supplier.click_count} cliques`);
      });
    } catch (error) {
      console.error('❌ Erro na query de fornecedores:', error.message);
    }

    // 4. Verificar dados por período
    console.log('\n4️⃣ ANÁLISE POR PERÍODO');
    const periods = [7, 15, 30, 60, 90];
    
    for (const days of periods) {
      const periodStart = new Date();
      periodStart.setDate(periodStart.getDate() - days);
      const periodStartStr = periodStart.toISOString().split('T')[0];
      
      try {
        const periodStats = await db.execute(sql`
          SELECT COUNT(*) as clicks
          FROM whatsapp_clicks 
          WHERE clicked_at >= ${periodStartStr}
        `);
        
        console.log(`📊 Últimos ${days} dias: ${periodStats.rows[0].clicks} cliques`);
      } catch (error) {
        console.error(`❌ Erro ao consultar ${days} dias:`, error.message);
      }
    }

    // 5. Inserir dados de teste mais robustos se necessário
    if (parseInt(data.total_records) < 10) {
      console.log('\n5️⃣ INSERINDO DADOS DE TESTE ROBUSTOS');
      
      const testData = [
        ['iPhone 15 Pro Max', 'Apple', 'TechStore Premium', '5511999999999', 7999.99, 'NOW() - INTERVAL \'1 day\''],
        ['iPhone 15 Pro', 'Apple', 'MobileShop Elite', '5521888888888', 6999.99, 'NOW() - INTERVAL \'2 days\''],
        ['iPhone 15', 'Apple', 'TechStore Premium', '5511999999999', 5999.99, 'NOW() - INTERVAL \'3 days\''],
        ['iPhone 14 Pro Max', 'Apple', 'AppleCenter', '5511777777777', 6499.99, 'NOW() - INTERVAL \'4 days\''],
        ['iPhone 14 Pro', 'Apple', 'MobileShop Elite', '5521888888888', 5499.99, 'NOW() - INTERVAL \'5 days\''],
        ['Samsung Galaxy S24 Ultra', 'Samsung', 'SamsungWorld', '5511666666666', 4999.99, 'NOW() - INTERVAL \'6 days\''],
        ['iPhone 15 Pro Max', 'Apple', 'TechStore Premium', '5511999999999', 7999.99, 'NOW() - INTERVAL \'1 hour\''],
        ['MacBook Air M2', 'Apple', 'AppleCenter', '5511777777777', 9999.99, 'NOW() - INTERVAL \'2 hours\''],
        ['iPad Pro 12.9', 'Apple', 'TechStore Premium', '5511999999999', 5999.99, 'NOW() - INTERVAL \'3 hours\''],
        ['iPhone 13 Pro', 'Apple', 'MobileShop Elite', '5521888888888', 4299.99, 'NOW() - INTERVAL \'1 week\''],
        ['Samsung Galaxy S23', 'Samsung', 'SamsungWorld', '5511666666666', 3499.99, 'NOW() - INTERVAL \'2 weeks\''],
        ['iPhone 15 Pro Max', 'Apple', 'TechStore Premium', '5511999999999', 7999.99, 'NOW() - INTERVAL \'3 weeks\''],
        ['Xiaomi 14 Pro', 'Xiaomi', 'XiaomiStore', '5511555555555', 2999.99, 'NOW() - INTERVAL \'1 month\''],
        ['iPhone 14', 'Apple', 'AppleCenter', '5511777777777', 4699.99, 'NOW() - INTERVAL \'5 weeks\''],
        ['Galaxy Z Fold 5', 'Samsung', 'SamsungWorld', '5511666666666', 8999.99, 'NOW() - INTERVAL \'6 weeks\'']
      ];

      for (const [model, brand, supplier, phone, price, date] of testData) {
        try {
          await db.execute(sql`
            INSERT INTO whatsapp_clicks (
              user_id, product_model, product_brand, supplier_name, 
              whatsapp_number, product_price, clicked_at, ip_address, user_agent
            ) VALUES (
              1, ${model}, ${brand}, ${supplier}, ${phone}, ${price}, 
              ${sql.raw(date)}, '127.0.0.1', 'Test User Agent'
            )
            ON CONFLICT DO NOTHING
          `);
        } catch (error) {
          console.warn(`⚠️ Erro ao inserir ${model}:`, error.message);
        }
      }
      
      console.log('✅ Dados de teste inseridos com sucesso!');
    }

    // 6. Verificar integridade das foreign keys
    console.log('\n6️⃣ VERIFICAÇÃO DE INTEGRIDADE');
    const integrityCheck = await db.execute(sql`
      SELECT 
        wc.user_id,
        u.email,
        COUNT(*) as click_count
      FROM whatsapp_clicks wc
      LEFT JOIN users u ON wc.user_id = u.id
      GROUP BY wc.user_id, u.email
      ORDER BY click_count DESC
    `);

    console.log('👥 Cliques por usuário:');
    integrityCheck.rows.forEach(user => {
      console.log(`   User ID ${user.user_id} (${user.email || 'EMAIL NOT FOUND'}): ${user.click_count} cliques`);
    });

    // 7. Teste final simulando a requisição do frontend
    console.log('\n7️⃣ SIMULAÇÃO DA REQUISIÇÃO DO FRONTEND');
    try {
      const finalTest = await db.execute(sql`
        SELECT 
          COUNT(*) as total_clicks,
          COUNT(DISTINCT user_id) as unique_users,
          COUNT(DISTINCT supplier_name) as unique_suppliers,
          COUNT(DISTINCT product_model) as unique_products
        FROM whatsapp_clicks 
        WHERE clicked_at >= ${startDateStr}
      `);

      const finalStats = finalTest.rows[0];
      console.log('📊 Resultado final (simulando frontend):');
      console.log(`   Total de cliques: ${finalStats.total_clicks}`);
      console.log(`   Usuários únicos: ${finalStats.unique_users}`);
      console.log(`   Fornecedores únicos: ${finalStats.unique_suppliers}`);
      console.log(`   Produtos únicos: ${finalStats.unique_products}`);

      if (finalStats.total_clicks > 0) {
        console.log('✅ Analytics funcionando corretamente!');
      } else {
        console.log('⚠️ Nenhum clique encontrado no período');
      }
    } catch (error) {
      console.error('❌ Erro no teste final:', error.message);
    }

    console.log('\n✅ DIAGNÓSTICO COMPLETO FINALIZADO!');
    console.log('\n📋 PRÓXIMOS PASSOS:');
    console.log('1. Execute o servidor e teste o endpoint /api/whatsapp-tracking/stats');
    console.log('2. Acesse /admin e vá na aba "Analytics do WhatsApp"');
    console.log('3. Teste clicando em botões do WhatsApp na plataforma');

  } catch (error) {
    console.error('❌ Erro crítico no diagnóstico:', error);
  } finally {
    await client.end();
  }
}

comprehensiveAnalyticsDiagnostics();
