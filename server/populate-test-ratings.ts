
import { db } from './db';
import { suppliers, supplierRatings, users } from '../shared/schema';
import { eq } from 'drizzle-orm';

async function populateTestRatings() {
  console.log('🌟 Populando dados de teste para avaliações de fornecedores...');

  try {
    // Primeiro, vamos buscar alguns fornecedores existentes
    const existingSuppliers = await db.select().from(suppliers).limit(10);
    console.log(`📋 Encontrados ${existingSuppliers.length} fornecedores`);

    if (existingSuppliers.length === 0) {
      console.log('❌ Nenhum fornecedor encontrado. Criando alguns fornecedores de teste...');
      
      // Criar alguns fornecedores de teste se não existirem
      const testSuppliers = [
        'ARMANDO 8723',
        'ATACADO SHOP 3014', 
        'AZ SHOP 1138',
        'MEGA CENTER 3821',
        'HEREZ 6940'
      ];

      for (const supplierName of testSuppliers) {
        await db.insert(suppliers).values({
          name: supplierName,
          active: true,
          averageRating: 0.00,
          ratingCount: 0
        }).onConflictDoNothing();
      }

      // Buscar novamente após inserir
      const newSuppliers = await db.select().from(suppliers).limit(10);
      console.log(`📋 Fornecedores após inserção: ${newSuppliers.length}`);
    }

    // Buscar usuários existentes para criar avaliações
    const existingUsers = await db.select().from(users).limit(5);
    
    if (existingUsers.length === 0) {
      console.log('❌ Nenhum usuário encontrado para criar avaliações de teste');
      return;
    }

    console.log(`👥 Encontrados ${existingUsers.length} usuários`);

    // Buscar fornecedores atualizados
    const suppliersToRate = await db.select().from(suppliers).limit(5);

    // Criar algumas avaliações de teste
    const testRatings = [
      { rating: 5, comment: 'Excelente fornecedor, muito confiável!' },
      { rating: 4, comment: 'Bom atendimento e produtos de qualidade' },
      { rating: 5, comment: 'Sempre entrega no prazo, recomendo' },
      { rating: 3, comment: 'Produto ok, mas demora um pouco para responder' },
      { rating: 4, comment: 'Preços competitivos e boa variedade' },
      { rating: 5, comment: 'Fornecedor top! Muito satisfeito' },
      { rating: 4, comment: 'Entrega rápida, produtos conforme descrição' },
      { rating: 3, comment: 'Razoável, mas pode melhorar o atendimento' }
    ];

    let ratingsCreated = 0;

    for (let i = 0; i < suppliersToRate.length; i++) {
      const supplier = suppliersToRate[i];
      
      // Criar 2-3 avaliações por fornecedor
      const numRatings = Math.floor(Math.random() * 2) + 2; // 2-3 avaliações
      
      for (let j = 0; j < numRatings && j < existingUsers.length; j++) {
        const user = existingUsers[j];
        const testRating = testRatings[ratingsCreated % testRatings.length];
        
        try {
          await db.insert(supplierRatings).values({
            userId: user.id,
            supplierId: supplier.id,
            rating: testRating.rating,
            comment: testRating.comment
          }).onConflictDoNothing();
          
          ratingsCreated++;
          console.log(`⭐ Avaliação criada: ${supplier.name} - ${testRating.rating} estrelas`);
        } catch (error) {
          console.log(`⚠️ Avaliação já existe: ${supplier.name} - User ${user.id}`);
        }
      }
    }

    console.log(`✅ ${ratingsCreated} avaliações de teste criadas`);

    // Verificar os dados após popular
    console.log('\n🔍 Verificando dados após popular...');
    
    const suppliersWithRatings = await db.execute(`
      SELECT 
        s.id,
        s.name,
        s.average_rating,
        s.rating_count,
        COUNT(sr.id) as actual_rating_count,
        ROUND(AVG(sr.rating)::numeric, 2) as calculated_avg
      FROM suppliers s
      LEFT JOIN supplier_ratings sr ON s.id = sr.supplier_id
      GROUP BY s.id, s.name, s.average_rating, s.rating_count
      HAVING COUNT(sr.id) > 0
      ORDER BY s.average_rating DESC NULLS LAST
      LIMIT 10;
    `);
    
    console.log('📊 Fornecedores com avaliações:');
    suppliersWithRatings.forEach((supplier: any) => {
      console.log(`   ${supplier.name}: ${supplier.average_rating || 'N/A'} (${supplier.rating_count || 0} avaliações)`);
      console.log(`   Calculado: ${supplier.calculated_avg} (${supplier.actual_rating_count} reais)`);
      console.log('   ---');
    });

  } catch (error) {
    console.error('❌ Erro ao popular avaliações de teste:', error);
    throw error;
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  populateTestRatings()
    .then(() => {
      console.log('🎉 População de dados de teste concluída!');
      process.exit(0);
    })
    .catch(error => {
      console.error('💥 Falha ao popular dados de teste:', error);
      process.exit(1);
    });
}

export { populateTestRatings };
