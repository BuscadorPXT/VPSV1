
const { db } = require('./db.ts');
const { sql } = require('drizzle-orm');

async function validateInterestList() {
  console.log('🔍 Validando sistema de Lista de Interesses...\n');
  
  try {
    // 1. Verificar estrutura da tabela
    console.log('1. Verificando estrutura da tabela...');
    const tableStructure = await db.execute(sql`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'interest_list'
      ORDER BY ordinal_position;
    `);
    
    console.log('📊 Colunas da tabela interest_list:');
    tableStructure.forEach(col => {
      console.log(`   - ${col.column_name}: ${col.data_type} (${col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'})`);
    });
    
    // 2. Verificar dados existentes
    console.log('\n2. Verificando dados existentes...');
    const totalItems = await db.execute(sql`SELECT COUNT(*) as count FROM interest_list`);
    console.log(`📋 Total de itens na lista: ${totalItems[0].count}`);
    
    // 3. Verificar usuários com itens
    const usersWithItems = await db.execute(sql`
      SELECT user_id, COUNT(*) as items_count 
      FROM interest_list 
      GROUP BY user_id 
      ORDER BY items_count DESC 
      LIMIT 5
    `);
    
    console.log('\n📊 Top 5 usuários com mais itens:');
    usersWithItems.forEach(user => {
      console.log(`   - User ${user.user_id}: ${user.items_count} itens`);
    });
    
    // 4. Verificar preços válidos
    const priceValidation = await db.execute(sql`
      SELECT 
        COUNT(*) as total_items,
        COUNT(CASE WHEN supplier_price IS NULL THEN 1 END) as null_prices,
        COUNT(CASE WHEN supplier_price = 0 THEN 1 END) as zero_prices,
        COUNT(CASE WHEN supplier_price > 0 THEN 1 END) as valid_prices,
        AVG(CAST(supplier_price AS DECIMAL)) as avg_price
      FROM interest_list
    `);
    
    console.log('\n💰 Análise de preços:');
    const prices = priceValidation[0];
    console.log(`   - Total de itens: ${prices.total_items}`);
    console.log(`   - Preços nulos: ${prices.null_prices}`);
    console.log(`   - Preços zerados: ${prices.zero_prices}`);
    console.log(`   - Preços válidos: ${prices.valid_prices}`);
    console.log(`   - Preço médio: R$ ${parseFloat(prices.avg_price || 0).toFixed(2)}`);
    
    // 5. Verificar fornecedores
    const supplierStats = await db.execute(sql`
      SELECT 
        supplier_name,
        COUNT(*) as items_count,
        AVG(CAST(supplier_price AS DECIMAL)) as avg_price
      FROM interest_list 
      WHERE supplier_name IS NOT NULL
      GROUP BY supplier_name 
      ORDER BY items_count DESC 
      LIMIT 10
    `);
    
    console.log('\n🏪 Top 10 fornecedores:');
    supplierStats.forEach(supplier => {
      console.log(`   - ${supplier.supplier_name}: ${supplier.items_count} itens (Avg: R$ ${parseFloat(supplier.avg_price || 0).toFixed(2)})`);
    });
    
    // 6. Verificar dados recentes
    const recentItems = await db.execute(sql`
      SELECT 
        product_model,
        supplier_name,
        supplier_price,
        created_at
      FROM interest_list 
      ORDER BY created_at DESC 
      LIMIT 5
    `);
    
    console.log('\n📅 Últimos 5 itens adicionados:');
    recentItems.forEach(item => {
      console.log(`   - ${item.product_model} (${item.supplier_name}) - R$ ${item.supplier_price} - ${item.created_at}`);
    });
    
    // 7. Teste de funcionalidade completa
    console.log('\n🧪 Teste de funcionalidade...');
    const testUserId = usersWithItems[0]?.user_id;
    
    if (testUserId) {
      const userItems = await db.execute(sql`
        SELECT 
          id,
          product_model,
          supplier_name,
          CAST(supplier_price AS DECIMAL(10,2)) as price,
          quantity,
          (CAST(supplier_price AS DECIMAL(10,2)) * quantity) as subtotal
        FROM interest_list 
        WHERE user_id = ${testUserId}
        ORDER BY supplier_name
      `);
      
      console.log(`✅ Teste com usuário ${testUserId}:`);
      console.log(`   - ${userItems.length} itens encontrados`);
      
      const total = userItems.reduce((sum, item) => sum + parseFloat(item.subtotal || 0), 0);
      console.log(`   - Total calculado: R$ ${total.toFixed(2)}`);
      
      // Agrupar por fornecedor
      const grouped = userItems.reduce((acc, item) => {
        const supplier = item.supplier_name || 'Desconhecido';
        if (!acc[supplier]) acc[supplier] = [];
        acc[supplier].push(item);
        return acc;
      }, {});
      
      console.log(`   - ${Object.keys(grouped).length} fornecedores distintos`);
    }
    
    console.log('\n✅ Validação concluída com sucesso!');
    
  } catch (error) {
    console.error('❌ Erro durante validação:', error);
  } finally {
    process.exit(0);
  }
}

validateInterestList();
