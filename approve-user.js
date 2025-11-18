#!/usr/bin/env node

/**
 * Script para aprovar usuário diretamente no banco
 * Uso: node approve-user.js <email>
 */

import 'dotenv/config';
import { db } from './server/db.js';
import { users } from './shared/schema.js';
import { eq } from 'drizzle-orm';

const email = process.argv[2];

if (!email) {
  console.error('❌ Erro: Email é obrigatório');
  console.log('Uso: node approve-user.js <email>');
  process.exit(1);
}

async function approveUser() {
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

    console.log('\n📊 Status atual:');
    console.log(`  Email: ${user.email}`);
    console.log(`  Nome: ${user.name}`);
    console.log(`  isApproved: ${user.isApproved}`);
    console.log(`  status: ${user.status}`);
    console.log(`  role: ${user.role}`);
    console.log();

    if (user.isApproved) {
      console.log('✅ Usuário já está aprovado!');
      process.exit(0);
    }

    // Aprovar usuário
    console.log('🔄 Aprovando usuário como PRO...');

    const [updatedUser] = await db.update(users)
      .set({
        isApproved: true,
        status: 'approved',
        role: 'pro',
        subscriptionPlan: 'pro',
        isSubscriptionActive: true,
        approvedAt: new Date(),
        updatedAt: new Date()
      })
      .where(eq(users.id, user.id))
      .returning();

    console.log('\n✅ Usuário aprovado com sucesso!');
    console.log('\n📊 Status atualizado:');
    console.log(`  isApproved: ${updatedUser.isApproved}`);
    console.log(`  status: ${updatedUser.status}`);
    console.log(`  role: ${updatedUser.role}`);
    console.log(`  subscriptionPlan: ${updatedUser.subscriptionPlan}`);
    console.log();
    console.log('🔄 Agora faça:');
    console.log('  1. Recarregue a página /pending-approval no navegador');
    console.log('  2. Ou aguarde 30s para o polling detectar');
    console.log('  3. Ou force refresh do token Firebase');
    console.log();

    process.exit(0);
  } catch (error) {
    console.error('❌ Erro ao aprovar usuário:', error.message);
    process.exit(1);
  }
}

approveUser();
