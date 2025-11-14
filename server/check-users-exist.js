
import { db } from './db.js';
import { users } from '../shared/schema.js';
import { eq, or } from 'drizzle-orm';

async function checkUsersExist() {
  try {
    console.log('🔍 Verificando se os usuários existem no sistema...');
    
    const emailsToCheck = [
      'parseo.concept@gmail.com',
      'thiagocbb@hotmail.com', 
      'sseletronicos9@gmail.com'
    ];

    const foundUsers = await db
      .select({
        id: users.id,
        email: users.email,
        name: users.name,
        role: users.role,
        subscriptionPlan: users.subscriptionPlan,
        isApproved: users.isApproved,
        status: users.status,
        createdAt: users.createdAt,
        lastLoginAt: users.lastLoginAt
      })
      .from(users)
      .where(
        or(
          eq(users.email, emailsToCheck[0]),
          eq(users.email, emailsToCheck[1]),
          eq(users.email, emailsToCheck[2])
        )
      );

    console.log('\n📊 RESULTADO DA VERIFICAÇÃO:');
    console.log('=' .repeat(60));

    if (foundUsers.length === 0) {
      console.log('❌ NENHUM dos usuários foi encontrado no sistema.');
      console.log('\nUsuários pesquisados:');
      emailsToCheck.forEach(email => {
        console.log(`   • ${email}`);
      });
    } else {
      console.log(`✅ Encontrados ${foundUsers.length} usuário(s) de ${emailsToCheck.length} pesquisados:\n`);
      
      foundUsers.forEach((user, index) => {
        console.log(`${index + 1}. 👤 ${user.email}`);
        console.log(`   📝 Nome: ${user.name || 'N/A'}`);
        console.log(`   🆔 ID: ${user.id}`);
        console.log(`   🎯 Role: ${user.role || 'N/A'}`);
        console.log(`   📦 Plano: ${user.subscriptionPlan || 'N/A'}`);
        console.log(`   ✅ Aprovado: ${user.isApproved ? 'Sim' : 'Não'}`);
        console.log(`   📊 Status: ${user.status || 'N/A'}`);
        console.log(`   📅 Criado em: ${user.createdAt ? new Date(user.createdAt).toLocaleString('pt-BR') : 'N/A'}`);
        console.log(`   🕐 Último login: ${user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString('pt-BR') : 'Nunca'}`);
        console.log('');
      });

      // Verificar quais NÃO foram encontrados
      const foundEmails = foundUsers.map(u => u.email.toLowerCase());
      const notFound = emailsToCheck.filter(email => 
        !foundEmails.includes(email.toLowerCase())
      );

      if (notFound.length > 0) {
        console.log('❌ Usuários NÃO encontrados:');
        notFound.forEach(email => {
          console.log(`   • ${email}`);
        });
      }
    }

    console.log('=' .repeat(60));

  } catch (error) {
    console.error('❌ Erro ao verificar usuários:', error);
    throw error;
  }
}

// Executar se chamado diretamente
if (import.meta.url === `file://${process.argv[1]}`) {
  checkUsersExist()
    .then(() => {
      console.log('✅ Verificação concluída!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Erro na verificação:', error);
      process.exit(1);
    });
}

export { checkUsersExist };
