/**
 * Script para criar usuário manualmente no banco local
 * Uso: tsx server/create-user-manual.ts adilsonfox2016@gmail.com "Nome do Usuario" "firebase-uid-opcional"
 */

import { db } from './db';
import { users } from '../shared/schema';
import { eq } from 'drizzle-orm';
import { nanoid } from 'nanoid';

async function createUserManual(email: string, name?: string, firebaseUid?: string) {
  try {
    console.log(`🔄 Criando usuário manualmente: ${email}`);

    // Verificar se usuário já existe no banco local
    const existingUser = await db.select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (existingUser.length > 0) {
      console.log(`⚠️ Usuário já existe no banco de dados local:`, existingUser[0]);
      return { success: false, message: 'Usuário já existe no banco de dados local', user: existingUser[0] };
    }

    // Gerar um UID se não fornecido (simular formato Firebase)
    const generatedUid = firebaseUid || `manual_${nanoid(20)}`;
    const userName = name || email.split('@')[0];

    // Criar usuário no banco local
    const newUser = {
      firebaseUid: generatedUid,
      email: email,
      name: userName,
      company: null,
      whatsapp: null,
      phone: null,
      isApproved: false, // Sempre false para que apareça no painel de aprovação
      status: 'pending_approval' as const,
      subscriptionPlan: 'free' as const,
      role: 'user' as const,
      isAdmin: false,
      isSubscriptionActive: false,
      createdAt: new Date(),
      lastActiveAt: new Date()
    };

    console.log(`📝 Criando usuário no banco de dados local:`, {
      email: newUser.email,
      name: newUser.name,
      isApproved: newUser.isApproved,
      status: newUser.status,
      firebaseUid: newUser.firebaseUid
    });

    const [createdUser] = await db.insert(users)
      .values(newUser)
      .returning();

    console.log(`✅ Usuário criado com sucesso! ID: ${createdUser.id}`);
    console.log(`📋 Detalhes do usuário criado:`, {
      id: createdUser.id,
      email: createdUser.email,
      name: createdUser.name,
      status: createdUser.status,
      isApproved: createdUser.isApproved,
      role: createdUser.role,
      firebaseUid: createdUser.firebaseUid,
      createdAt: createdUser.createdAt
    });

    return { success: true, message: 'Usuário criado com sucesso', user: createdUser };

  } catch (error: any) {
    console.error('❌ Erro ao criar usuário:', error);
    return { success: false, error: error.message };
  }
}

// Executar se chamado diretamente
if (import.meta.url === `file://${process.argv[1]}`) {
  const email = process.argv[2];
  const name = process.argv[3];
  const firebaseUid = process.argv[4];
  
  if (!email) {
    console.error('❌ Uso: tsx create-user-manual.ts <email> [nome] [firebase-uid]');
    process.exit(1);
  }
  
  createUserManual(email, name, firebaseUid)
    .then((result) => {
      console.log('\n🏁 Resultado da criação:', result);
      process.exit(result.success ? 0 : 1);
    })
    .catch((error) => {
      console.error('❌ Erro fatal:', error);
      process.exit(1);
    });
}

export { createUserManual };