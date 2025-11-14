
import { db } from './db.js';

async function createTestUser() {
  try {
    console.log('🔍 Verificando se há usuários pendentes...');
    
    // Verificar se há usuários não aprovados
    const existingPending = await db.execute(`
      SELECT COUNT(*) as count FROM users WHERE is_approved = false
    `);
    
    const pendingCount = existingPending.rows[0]?.count || 0;
    console.log(`📊 Usuários não aprovados existentes: ${pendingCount}`);
    
    if (pendingCount > 0) {
      console.log('✅ Já existem usuários pendentes, não é necessário criar um teste');
      
      // Mostrar os usuários existentes
      const pending = await db.execute(`
        SELECT id, email, name, is_approved, is_admin, role, status, created_at
        FROM users 
        WHERE is_approved = false
        ORDER BY created_at DESC
      `);
      
      console.log('\n📋 Usuários pendentes existentes:');
      pending.rows.forEach((user, index) => {
        console.log(`${index + 1}. ${user.email} (ID: ${user.id})`);
        console.log(`   Aprovado: ${user.is_approved}, Admin: ${user.is_admin}, Role: ${user.role}`);
        console.log(`   Status: ${user.status}, Criado: ${user.created_at}`);
        console.log('   ---');
      });
      
      return;
    }
    
    console.log('\n🔧 Criando usuário de teste para aprovação...');
    
    const testUserData = {
      firebaseUid: `test-uid-${Date.now()}`,
      email: `teste.aprovacao.${Date.now()}@exemplo.com`,
      name: 'Usuário Teste Aprovação',
      company: 'Empresa Teste',
      phone: '(11) 99999-9999',
      isApproved: false,
      status: 'pending_approval',
      role: 'user',
      isAdmin: false,
      subscriptionPlan: 'free',
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    const result = await db.execute(`
      INSERT INTO users (
        firebase_uid, email, name, company, phone, 
        is_approved, status, role, is_admin, subscription_plan,
        created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12
      ) RETURNING id, email, name
    `, [
      testUserData.firebaseUid,
      testUserData.email,
      testUserData.name,
      testUserData.company,
      testUserData.phone,
      testUserData.isApproved,
      testUserData.status,
      testUserData.role,
      testUserData.isAdmin,
      testUserData.subscriptionPlan,
      testUserData.createdAt,
      testUserData.updatedAt
    ]);
    
    console.log('✅ Usuário de teste criado com sucesso:');
    console.log(`   ID: ${result.rows[0].id}`);
    console.log(`   Email: ${result.rows[0].email}`);
    console.log(`   Nome: ${result.rows[0].name}`);
    console.log('\n🎯 Este usuário deve aparecer na aba de aprovações!');
    
  } catch (error) {
    console.error('❌ Erro ao criar usuário de teste:', error);
    console.error('Stack:', error.stack);
  }
}

createTestUser().then(() => {
  console.log('\n🏁 Verificação concluída');
}).catch(console.error);
