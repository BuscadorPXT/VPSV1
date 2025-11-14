
import cron from 'node-cron';
import { testerService } from './tester.service';
import { emailNotificationService } from './email-notification.service';
import { logger } from '../utils/logger';

export class TesterCronService {
  private cronJob: cron.ScheduledTask | null = null;

  /**
   * Inicia o agendamento automático de expiração de testers
   */
  start() {
    if (this.cronJob) {
      logger.warn('Tester cron job already running');
      return;
    }

    // Executa diariamente às 00:00 UTC
    this.cronJob = cron.schedule('0 0 * * *', async () => {
      try {
        logger.info('🔄 Starting automated tester expiration process...');
        console.log('⏰ CRON JOB: Processing expired testers...');
        
        const expiredCount = await testerService.processExpiredTesters();
        
        logger.info(`✅ Automated tester expiration completed. Processed: ${expiredCount} testers`);
        console.log(`✅ CRON JOB: Processed ${expiredCount} expired testers`);
        
        // Também processar testers próximos ao vencimento para alertas
        await this.processExpiringTesters();
        
      } catch (error) {
        logger.error('❌ Error in automated tester expiration:', error);
        console.error('❌ CRON JOB ERROR:', error);
      }
    }, {
      scheduled: true,
      timezone: 'UTC'
    });

    logger.info('🚀 Tester cron job started - runs daily at 00:00 UTC');
    console.log('🚀 Tester expiration cron job started');
  }

  /**
   * Para o agendamento
   */
  stop() {
    if (this.cronJob) {
      this.cronJob.stop();
      this.cronJob = null;
      logger.info('🛑 Tester cron job stopped');
      console.log('🛑 Tester cron job stopped');
    }
  }

  /**
   * Processa testers que estão próximos ao vencimento e envia notificações
   */
  private async processExpiringTesters() {
    try {
      // Testers expirando em 3 dias (aviso inicial)
      const expiring3Days = await testerService.findExpiringTesters(3);
      for (const tester of expiring3Days) {
        const daysRemaining = await testerService.getTesterDaysRemaining(tester.id);
        if (daysRemaining === 3) {
          logger.info(`⚠️ Sending 3-day warning to ${tester.email}`);
          await emailNotificationService.sendExpirationWarning(tester.email!, daysRemaining);
        }
      }

      // Testers expirando em 1 dia (aviso crítico)
      const expiring1Day = await testerService.findExpiringTesters(1);
      for (const tester of expiring1Day) {
        const daysRemaining = await testerService.getTesterDaysRemaining(tester.id);
        if (daysRemaining === 1) {
          logger.info(`🚨 Sending critical warning to ${tester.email}`);
          await emailNotificationService.sendCriticalWarning(tester.email!);
        }
      }

      // Testers que expiraram hoje
      const expiredToday = await testerService.findExpiredTesters();
      for (const tester of expiredToday) {
        logger.info(`❌ Sending expiration notification to ${tester.email}`);
        await emailNotificationService.sendExpirationNotification(tester.email!);
      }
      
      logger.info(`📊 Processed notifications: ${expiring3Days.length + expiring1Day.length + expiredToday.length} testers`);
    } catch (error) {
      logger.error('Error processing expiring testers:', error);
    }
  }

  /**
   * Força execução manual do processo
   */
  async runManual() {
    try {
      logger.info('🔄 Manual tester expiration process started...');
      console.log('🔄 MANUAL: Processing expired testers...');
      
      const expiredCount = await testerService.processExpiredTesters();
      
      logger.info(`✅ Manual tester expiration completed. Processed: ${expiredCount} testers`);
      console.log(`✅ MANUAL: Processed ${expiredCount} expired testers`);
      
      return expiredCount;
    } catch (error) {
      logger.error('❌ Error in manual tester expiration:', error);
      throw error;
    }
  }
}

export const testerCronService = new TesterCronService();
