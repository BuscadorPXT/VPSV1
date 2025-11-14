
import { db } from './db.js';
import { emergencyAlerts, users } from '../shared/schema.js';
import { desc, eq } from 'drizzle-orm';

async function checkEmergencyAlerts() {
  try {
    console.log('🔍 Verificando avisos emergenciais...');

    // Verificar usuário Jonathan
    const jonathan = await db.select()
      .from(users)
      .where(eq(users.email, 'jonathanpro@gmail.com'));

    console.log('👤 Usuário Jonathan:', {
      id: jonathan[0]?.id,
      email: jonathan[0]?.email,
      isAdmin: jonathan[0]?.isAdmin,
      role: jonathan[0]?.role
    });

    // Verificar avisos existentes
    const alerts = await db.select({
      id: emergencyAlerts.id,
      title: emergencyAlerts.title,
      message: emergencyAlerts.message,
      urgency: emergencyAlerts.urgency,
      isActive: emergencyAlerts.isActive,
      sentBy: emergencyAlerts.sentBy,
      sentAt: emergencyAlerts.sentAt,
      senderName: users.name,
      senderEmail: users.email
    })
    .from(emergencyAlerts)
    .leftJoin(users, eq(emergencyAlerts.sentBy, users.id))
    .orderBy(desc(emergencyAlerts.sentAt));

    console.log('📢 Avisos encontrados:', alerts.length);
    
    alerts.forEach((alert, index) => {
      console.log(`${index + 1}. ${alert.title}`);
      console.log(`   📝 Mensagem: ${alert.message}`);
      console.log(`   🔥 Urgência: ${alert.urgency}`);
      console.log(`   ✅ Ativo: ${alert.isActive}`);
      console.log(`   👤 Enviado por: ${alert.senderEmail} (ID: ${alert.sentBy})`);
      console.log(`   📅 Enviado em: ${alert.sentAt}`);
      console.log('');
    });

  } catch (error) {
    console.error('❌ Erro:', error);
  } finally {
    process.exit(0);
  }
}

checkEmergencyAlerts();
