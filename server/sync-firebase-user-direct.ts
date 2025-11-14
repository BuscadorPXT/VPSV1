/**
 * Script direto para sincronizar usuário específico do Firebase para o banco local
 * Uso: tsx server/sync-firebase-user-direct.ts adilsonfox2016@gmail.com
 */

import { db } from './db';
import { users } from '../shared/schema';
import { eq } from 'drizzle-orm';

async function syncFirebaseUserDirect(email: string) {
  try {
    console.log(`🔄 Iniciando sincronização do usuário Firebase: ${email}`);

    // Import Firebase admin
    const { admin } = await import('./services/firebase-admin');

    try {
      // Buscar usuário no Firebase
      const firebaseUser = await admin.auth().getUserByEmail(email);
      
      console.log(`✅ Usuário encontrado no Firebase: ${firebaseUser.email} (UID: ${firebaseUser.uid.substring(0, 10)}...)`);

      // Verificar se usuário já existe no banco local
      const existingUser = await db.select()
        .from(users)
        .where(eq(users.email, email))
        .limit(1);

      if (existingUser.length > 0) {
        console.log(`⚠️ Usuário já existe no banco de dados local:`, existingUser[0]);
        return { success: false, message: 'Usuário já existe no banco de dados local', user: existingUser[0] };
      }

      // Criar usuário no banco local
      const newUser = {
        firebaseUid: firebaseUser.uid,
        email: firebaseUser.email || email,
        name: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'Usuário',
        company: null,
        whatsapp: null,
        phone: null,
        isApproved: false, // Sempre false para usuários recém-sincronizados
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
        status: newUser.status
      });

      const [createdUser] = await db.insert(users)
        .values(newUser)
        .returning();

      console.log(`✅ Usuário sincronizado com sucesso! ID: ${createdUser.id}`);
      console.log(`📋 Detalhes do usuário criado:`, {
        id: createdUser.id,
        email: createdUser.email,
        name: createdUser.name,
        status: createdUser.status,
        isApproved: createdUser.isApproved,
        role: createdUser.role,
        createdAt: createdUser.createdAt
      });

      return { success: true, message: 'Usuário sincronizado com sucesso', user: createdUser };

    } catch (firebaseError: any) {
      console.error('❌ Erro no Firebase:', firebaseError);
      
      if (firebaseError.code === 'auth/user-not-found') {
        return { success: false, message: 'Usuário não encontrado no Firebase' };
      }

      throw firebaseError;
    }

  } catch (error: any) {
    console.error('❌ Erro ao sincronizar usuário:', error);
    return { success: false, error: error.message };
  }
}

// Executar se chamado diretamente
if (import.meta.url === `file://${process.argv[1]}`) {
  const email = process.argv[2];
  
  if (!email) {
    console.error('❌ Uso: tsx sync-firebase-user-direct.ts <email>');
    process.exit(1);
  }
  
  syncFirebaseUserDirect(email)
    .then((result) => {
      console.log('\n🏁 Resultado da sincronização:', result);
      process.exit(result.success ? 0 : 1);
    })
    .catch((error) => {
      console.error('❌ Erro fatal:', error);
      process.exit(1);
    });
}

export { syncFirebaseUserDirect };