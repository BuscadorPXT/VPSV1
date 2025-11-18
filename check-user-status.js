// Script rápido para verificar status do usuário no banco
import { db } from './server/db.js';
import { users } from './shared/schema.js';
import { eq } from 'drizzle-orm';

const email = process.argv[2] || 'testepxt2025@gmail.com';

console.log(`🔍 Verificando usuário: ${email}\n`);

try {
  const [user] = await db.select({
    id: users.id,
    email: users.email,
    name: users.name,
    isApproved: users.isApproved,
    status: users.status,
    role: users.role,
    subscriptionPlan: users.subscriptionPlan,
    createdAt: users.createdAt,
    approvedAt: users.approvedAt,
  })
  .from(users)
  .where(eq(users.email, email))
  .limit(1);

  if (!user) {
    console.log('❌ Usuário não encontrado no banco de dados');
    process.exit(1);
  }

  console.log('📊 Status do usuário:');
  console.log('═'.repeat(50));
  console.log(`ID:               ${user.id}`);
  console.log(`Email:            ${user.email}`);
  console.log(`Nome:             ${user.name}`);
  console.log(`isApproved:       ${user.isApproved}`);
  console.log(`status:           ${user.status}`);
  console.log(`role:             ${user.role}`);
  console.log(`subscriptionPlan: ${user.subscriptionPlan}`);
  console.log(`createdAt:        ${user.createdAt}`);
  console.log(`approvedAt:       ${user.approvedAt || 'null'}`);
  console.log('═'.repeat(50));
  console.log();

  if (user.isApproved) {
    console.log('✅ Usuário ESTÁ APROVADO');
  } else {
    console.log('⏳ Usuário PENDENTE DE APROVAÇÃO');
  }

  process.exit(0);
} catch (error) {
  console.error('❌ Erro ao verificar usuário:', error.message);
  process.exit(1);
}
