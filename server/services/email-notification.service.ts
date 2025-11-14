
import nodemailer from 'nodemailer';
import { logger } from '../utils/logger';

export class EmailNotificationService {
  private transporter: nodemailer.Transporter;

  constructor() {
    // Configurar transportador de email (usar variáveis de ambiente)
    this.transporter = nodemailer.createTransporter({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });
  }

  /**
   * Envia notificação de aviso de expiração (3 dias)
   */
  async sendExpirationWarning(userEmail: string, daysRemaining: number) {
    try {
      const subject = '⚠️ Seu período de teste expira em 3 dias - Ative o Plano Pro';
      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #f59e0b;">⚠️ Seu período de teste está acabando!</h2>
          
          <p>Olá,</p>
          
          <p>Seu período de teste no <strong>Buscador PXT</strong> expira em <strong>${daysRemaining} dias</strong>.</p>
          
          <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0;">
            <p><strong>O que acontece quando expirar:</strong></p>
            <ul>
              <li>🚫 Acesso aos links do WhatsApp será bloqueado</li>
              <li>📱 Não poderá mais contactar fornecedores</li>
              <li>💰 Perderá acesso aos melhores preços</li>
            </ul>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="https://wa.me/5511963232465?text=Olá! Sou usuário Tester e gostaria de ativar o plano Pro para continuar acessando os fornecedores." 
               style="background: #10b981; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">
              🚀 Ativar Plano Pro Agora
            </a>
          </div>
          
          <p><strong>Benefícios do Plano Pro:</strong></p>
          <ul>
            <li>✅ Acesso ilimitado aos fornecedores</li>
            <li>✅ Links diretos do WhatsApp</li>
            <li>✅ Preços atualizados em tempo real</li>
            <li>✅ Suporte prioritário</li>
          </ul>
          
          <p>Não perca tempo! Ative seu plano Pro hoje mesmo.</p>
          
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;">
          <p style="font-size: 12px; color: #6b7280;">
            Buscador PXT - Sua plataforma de preços de celulares<br>
            Este é um email automático, não responda.
          </p>
        </div>
      `;

      await this.transporter.sendMail({
        from: process.env.SMTP_FROM || '"Buscador PXT" <noreply@buscadorpxt.com>',
        to: userEmail,
        subject,
        html
      });

      logger.info(`Expiration warning email sent to ${userEmail}`);
    } catch (error) {
      logger.error('Error sending expiration warning email:', error);
    }
  }

  /**
   * Envia notificação crítica (1 dia)
   */
  async sendCriticalWarning(userEmail: string) {
    try {
      const subject = '🚨 ÚLTIMO DIA - Seu teste expira amanhã!';
      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #dc2626;">🚨 ÚLTIMO AVISO - Expira amanhã!</h2>
          
          <p>Olá,</p>
          
          <div style="background: #fef2f2; border: 2px solid #dc2626; border-radius: 8px; padding: 20px; margin: 20px 0;">
            <h3 style="color: #dc2626; margin-top: 0;">⏰ Seu teste expira em 24 horas!</h3>
            <p><strong>Amanhã você perderá acesso aos fornecedores.</strong></p>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="https://wa.me/5511963232465?text=URGENTE! Meu teste expira amanhã e preciso ativar o plano Pro agora!" 
               style="background: #dc2626; color: white; padding: 20px 40px; text-decoration: none; border-radius: 5px; font-weight: bold; font-size: 18px;">
              🚀 ATIVAR AGORA - ÚLTIMO DIA!
            </a>
          </div>
          
          <p><strong>⚡ Ative hoje e ganhe:</strong></p>
          <ul>
            <li>🎁 Desconto especial para ex-tester</li>
            <li>📱 Acesso imediato aos fornecedores</li>
            <li>💰 Melhores preços do mercado</li>
          </ul>
          
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;">
          <p style="font-size: 12px; color: #6b7280;">
            Buscador PXT - Não deixe para depois!
          </p>
        </div>
      `;

      await this.transporter.sendMail({
        from: process.env.SMTP_FROM || '"Buscador PXT" <noreply@buscadorpxt.com>',
        to: userEmail,
        subject,
        html
      });

      logger.info(`Critical warning email sent to ${userEmail}`);
    } catch (error) {
      logger.error('Error sending critical warning email:', error);
    }
  }

  /**
   * Envia notificação de expiração
   */
  async sendExpirationNotification(userEmail: string) {
    try {
      const subject = '❌ Seu período de teste expirou - Reative agora!';
      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #dc2626;">❌ Período de teste expirado</h2>
          
          <p>Olá,</p>
          
          <p>Seu período de teste no <strong>Buscador PXT</strong> expirou hoje.</p>
          
          <div style="background: #fef2f2; border-left: 4px solid #dc2626; padding: 15px; margin: 20px 0;">
            <p><strong>Acesso suspenso:</strong></p>
            <ul>
              <li>🚫 Links do WhatsApp bloqueados</li>
              <li>📱 Não é possível contactar fornecedores</li>
              <li>💔 Perdendo oportunidades de negócio</li>
            </ul>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="https://wa.me/5511963232465?text=Meu teste expirou! Quero reativar com o plano Pro imediatamente." 
               style="background: #10b981; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">
              🔄 Reativar Agora
            </a>
          </div>
          
          <p>💡 <strong>Reative hoje e ganhe acesso imediato!</strong></p>
          
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;">
          <p style="font-size: 12px; color: #6b7280;">
            Buscador PXT - Volte quando quiser!
          </p>
        </div>
      `;

      await this.transporter.sendMail({
        from: process.env.SMTP_FROM || '"Buscador PXT" <noreply@buscadorpxt.com>',
        to: userEmail,
        subject,
        html
      });

      logger.info(`Expiration notification sent to ${userEmail}`);
    } catch (error) {
      logger.error('Error sending expiration notification:', error);
    }
  }
}

export const emailNotificationService = new EmailNotificationService();
