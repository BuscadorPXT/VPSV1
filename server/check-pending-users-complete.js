
import { db } from './db.js';

async function checkPendingUsersComplete() {
  try {
    console.log('🔍 ANÁLISE COMPLETA DE USUÁRIOS PENDENTES');
    console.log('='.repeat(60));

    // 1. Verificar estrutura da tabela
    console.log('\n1️⃣ Verificando estrutura da tabela users...');
    const tableInfo = await db.execute(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'users' 
      AND table_schema = 'public'
      ORDER BY ordinal_position
    `);

    console.log('📋 Estrutura da tabela:');
    tableInfo.rows.forEach(col => {
      console.log(`   - ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`);
    });

    // 2. Contar usuários por status
    console.log('\n2️⃣ Contagem de usuários por diferentes critérios...');
    const counts = await db.execute(`
      SELECT 
        COUNT(*) as total_users,
        COUNT(CASE WHEN is_approved = false THEN 1 END) as not_approved,
        COUNT(CASE WHEN is_approved = true THEN 1 END) as approved,
        COUNT(CASE WHEN is_admin = true THEN 1 END) as admins,
        COUNT(CASE WHEN is_admin = false THEN 1 END) as non_admins,
        COUNT(CASE WHEN role = 'user' OR role IS NULL THEN 1 END) as regular_users,
        COUNT(CASE WHEN role IN ('admin', 'superadmin') THEN 1 END) as admin_roles,
        COUNT(CASE WHEN role = 'pro' THEN 1 END) as pro_users,
        COUNT(CASE WHEN status = 'pending_approval' THEN 1 END) as pending_status,
        COUNT(CASE WHEN status = 'approved' THEN 1 END) as approved_status
      FROM users
    `);

    const stats = counts.rows[0];
    console.log('📊 Estatísticas gerais:');
    console.log(`   - Total de usuários: ${stats.total_users}`);
    console.log(`   - Não aprovados (is_approved = false): ${stats.not_approved}`);
    console.log(`   - Aprovados (is_approved = true): ${stats.approved}`);
    console.log(`   - Administradores (is_admin = true): ${stats.admins}`);
    console.log(`   - Não administradores (is_admin = false): ${stats.non_admins}`);
    console.log(`   - Usuários regulares (role = 'user' ou NULL): ${stats.regular_users}`);
    console.log(`   - Roles admin/superadmin: ${stats.admin_roles}`);
    console.log(`   - Usuários PRO: ${stats.pro_users}`);
    console.log(`   - Status pending_approval: ${stats.pending_status}`);
    console.log(`   - Status approved: ${stats.approved_status}`);

    // 3. Listar TODOS os usuários não aprovados
    console.log('\n3️⃣ Listando TODOS os usuários não aprovados...');
    const allNonApproved = await db.execute(`
      SELECT id, email, name, company, is_approved, is_admin, role, status, created_at, subscription_plan
      FROM users 
      WHERE is_approved = false
      ORDER BY created_at DESC
    `);

    console.log(`📋 Encontrados ${allNonApproved.rows?.length || 0} usuários não aprovados:`);
    if (allNonApproved.rows && allNonApproved.rows.length > 0) {
      allNonApproved.rows.forEach((user, index) => {
        console.log(`\n${index + 1}. ${user.email} (ID: ${user.id})`);
        console.log(`   Nome: ${user.name || 'N/A'}`);
        console.log(`   Empresa: ${user.company || 'N/A'}`);
        console.log(`   Aprovado: ${user.is_approved}`);
        console.log(`   Admin: ${user.is_admin}`);
        console.log(`   Role: ${user.role || 'NULL'}`);
        console.log(`   Status: ${user.status || 'NULL'}`);
        console.log(`   Plano: ${user.subscription_plan || 'NULL'}`);
        console.log(`   Criado em: ${user.created_at}`);
      });
    }

    // 4. Testar a query exata do backend
    console.log('\n4️⃣ Testando a query EXATA do backend...');
    const backendQuery = await db.execute(`
      SELECT id, email, name, company, phone, whatsapp, status, is_approved, role, is_admin, created_at, subscription_plan
      FROM users 
      WHERE is_approved = false 
        AND is_admin = false
        AND (role IS NULL OR role = 'user' OR role = 'free')
      ORDER BY created_at DESC
    `);

    console.log(`🔍 Query do backend retornou: ${backendQuery.rows?.length || 0} usuários`);
    if (backendQuery.rows && backendQuery.rows.length > 0) {
      console.log('\n📋 Usuários que DEVERIAM aparecer na aba de aprovações:');
      backendQuery.rows.forEach((user, index) => {
        console.log(`${index + 1}. ${user.email} (ID: ${user.id})`);
        console.log(`   Status: ${user.status}, Role: ${user.role}, Admin: ${user.is_admin}`);
      });
    } else {
      console.log('\n❌ PROBLEMA IDENTIFICADO: A query do backend não retorna nenhum usuário!');
    }

    // 5. Verificar se há usuários que estão sendo filtrados incorretamente
    console.log('\n5️⃣ Verificando usuários filtrados incorretamente...');
    const filteredOut = await db.execute(`
      SELECT id, email, is_approved, is_admin, role, status,
        CASE 
          WHEN is_approved = true THEN 'Já aprovado'
          WHEN is_admin = true THEN 'É administrador'
          WHEN role NOT IN ('user', 'free') AND role IS NOT NULL THEN 'Role não permitida: ' || role
          ELSE 'Deveria aparecer'
        END as motivo_filtro
      FROM users 
      WHERE is_approved = false
    `);

    console.log('\n🔍 Análise de filtros:');
    if (filteredOut.rows && filteredOut.rows.length > 0) {
      filteredOut.rows.forEach((user, index) => {
        console.log(`${index + 1}. ${user.email}`);
        console.log(`   Motivo: ${user.motivo_filtro}`);
        console.log(`   is_approved: ${user.is_approved}, is_admin: ${user.is_admin}, role: ${user.role}`);
        console.log('   ---');
      });
    }

    // 6. Mostrar últimos 5 usuários criados
    console.log('\n6️⃣ Últimos 5 usuários criados...');
    const recentUsers = await db.execute(`
      SELECT id, email, name, is_approved, is_admin, role, status, created_at
      FROM users 
      ORDER BY created_at DESC
      LIMIT 5
    `);

    if (recentUsers.rows && recentUsers.rows.length > 0) {
      console.log('\n📋 Usuários mais recentes:');
      recentUsers.rows.forEach((user, index) => {
        console.log(`${index + 1}. ${user.email} (ID: ${user.id})`);
        console.log(`   Criado: ${user.created_at}`);
        console.log(`   Aprovado: ${user.is_approved}, Admin: ${user.is_admin}, Role: ${user.role}`);
        console.log('   ---');
      });
    }

    // 7. Verificar se há problemas na API
    console.log('\n7️⃣ Testando endpoint de pending users...');
    try {
      const { userService } = await import('./services/user.service.js');
      const pendingFromService = await userService.getPendingUsers();
      console.log(`📊 UserService.getPendingUsers() retornou: ${pendingFromService.length} usuários`);
      
      if (pendingFromService.length > 0) {
        console.log('\n✅ Usuários retornados pelo service:');
        pendingFromService.forEach((user, index) => {
          console.log(`${index + 1}. ${user.email} (ID: ${user.id})`);
        });
      }
    } catch (serviceError) {
      console.error('❌ Erro ao testar UserService:', serviceError.message);
    }

    console.log('\n🎯 RESUMO DA ANÁLISE:');
    console.log(`- Usuários não aprovados no banco: ${stats.not_approved}`);
    console.log(`- Usuários que passam pelo filtro do backend: ${backendQuery.rows?.length || 0}`);
    console.log(`- Possível problema: ${backendQuery.rows?.length === 0 ? 'Filtros muito restritivos' : 'Problema na API ou frontend'}`);

  } catch (error) {
    console.error('❌ Erro na análise:', error);
    console.error('Stack:', error.stack);
  }
}

checkPendingUsersComplete().then(() => {
  console.log('\n🏁 Análise completa finalizada');
}).catch(console.error);
