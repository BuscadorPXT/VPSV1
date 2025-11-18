#!/usr/bin/env node

/**
 * Script para limpar cache de um usuário específico
 * Uso: node clear-user-cache.js <email>
 */

import 'dotenv/config';
import { db } from './server/db.js';
import { users } from './shared/schema.js';
import { eq } from 'drizzle-orm';
import cacheService from './server/services/cache-service.js';

const email = process.argv[2];

if (!email) {
  console.error('❌ Erro: Email é obrigatório');
  console.log('Uso: node clear-user-cache.js <email>');
  process.exit(1);
}

async function clearUserCache() {
  try {
    console.log(`🔍 Buscando usuário: ${email}...`);

    // Buscar usuário
    const [user] = await db.select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (!user) {
      console.error(`❌ Usuário não encontrado: ${email}`);
      process.exit(1);
    }

    console.log('\n📊 Informações do usuário:');
    console.log(`  Email: ${user.email}`);
    console.log(`  Nome: ${user.name}`);
    console.log(`  Firebase UID: ${user.firebaseUid}`);
    console.log(`  isApproved: ${user.isApproved}`);
    console.log(`  status: ${user.status}`);
    console.log(`  role: ${user.role}`);
    console.log();

    if (!user.firebaseUid) {
      console.error('❌ Usuário não tem Firebase UID associado');
      process.exit(1);
    }

    // Limpar cache
    const cacheKey = `user:firebase:${user.firebaseUid}`;
    console.log(`🗑️ Limpando cache: ${cacheKey}...`);

    await cacheService.del(cacheKey);

    console.log();
    console.log('✅ Cache limpo com sucesso!');
    console.log();
    console.log('🔄 Agora o usuário pode fazer login novamente e o sistema');
    console.log('   buscará as informações atualizadas do banco de dados.');
    console.log();

    process.exit(0);
  } catch (error) {
    console.error('❌ Erro ao limpar cache:', error.message);
    process.exit(1);
  }
}

clearUserCache();
