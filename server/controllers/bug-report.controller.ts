
import { Request, Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { logger } from '../utils/logger';

interface BugReportData {
  title: string;
  description: string;
  steps: string;
  expected: string;
  actual: string;
  severity: 'baixa' | 'media' | 'alta' | 'critica';
  category: 'ui' | 'funcionalidade' | 'performance' | 'dados' | 'outro';
  browserInfo?: string;
  url?: string;
}

export class BugReportController {
  private readonly discordWebhookUrl = process.env.DISCORD_WEBHOOK_URL || '';

  async submitBugReport(req: AuthenticatedRequest, res: Response) {
    try {
      logger.info('🐛 Bug report submission started', { 
        user: req.user?.email 
      });

      // Sanitizar inputs para prevenir XSS
      const sanitizeInput = (input: string): string => {
        if (typeof input !== 'string') return '';
        return input
          .replace(/[<>\"']/g, '') // Remove caracteres XSS básicos
          .replace(/javascript:/gi, '') // Remove protocolo javascript:
          .replace(/on\w+=/gi, '') // Remove event handlers
          .trim();
      };

      const {
        title,
        description,
        steps,
        expected,
        actual,
        severity,
        category,
        browserInfo,
        url
      }: BugReportData = req.body;

      // Sanitizar todos os campos de texto
      const sanitizedData = {
        title: sanitizeInput(title).slice(0, 100),
        description: sanitizeInput(description).slice(0, 1000),
        steps: sanitizeInput(steps || '').slice(0, 500),
        expected: sanitizeInput(expected || '').slice(0, 300),
        actual: sanitizeInput(actual || '').slice(0, 300),
        severity,
        category,
        browserInfo: sanitizeInput(browserInfo || '').slice(0, 500), // Limitar browser info
        url: sanitizeInput(url || '').slice(0, 200)
      };

      // Validação dos campos obrigatórios
      if (!sanitizedData.title || !sanitizedData.description || !sanitizedData.severity || !sanitizedData.category) {
        logger.warn('❌ Missing required fields', { 
          title: !!sanitizedData.title, 
          description: !!sanitizedData.description, 
          severity: !!sanitizedData.severity, 
          category: !!sanitizedData.category 
        });
        return res.status(400).json({
          success: false,
          message: 'Campos obrigatórios: title, description, severity, category',
          details: {
            title: !sanitizedData.title ? 'Título é obrigatório' : null,
            description: !sanitizedData.description ? 'Descrição é obrigatória' : null,
            severity: !sanitizedData.severity ? 'Severidade é obrigatória' : null,
            category: !sanitizedData.category ? 'Categoria é obrigatória' : null
          }
        });
      }

      // Validação adicional dos valores
      const validSeverities = ['baixa', 'media', 'alta', 'critica'];
      const validCategories = ['ui', 'funcionalidade', 'performance', 'dados', 'outro'];
      
      if (!validSeverities.includes(sanitizedData.severity)) {
        return res.status(400).json({
          success: false,
          message: `Severidade inválida. Valores aceitos: ${validSeverities.join(', ')}`
        });
      }
      
      if (!validCategories.includes(sanitizedData.category)) {
        return res.status(400).json({
          success: false,
          message: `Categoria inválida. Valores aceitos: ${validCategories.join(', ')}`
        });
      }

      // Informações do usuário
      const user = req.user;
      const reportId = `BUG-${Date.now()}`;
      
      logger.info('📋 Processing bug report', { reportId, user: user?.email });

      // Validar se webhook URL está configurada
      if (!this.discordWebhookUrl) {
        logger.error('❌ Discord webhook URL not configured');
        return res.status(500).json({
          success: false,
          message: 'Sistema de notificação não configurado. Contate o suporte.'
        });
      }

      // Criar embed simplificado para Discord
      const reportTime = new Date().toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit', 
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });

      const discordEmbed = {
        embeds: [{
          title: `🐛 Bug Report - ${reportId}`,
          description: `**${sanitizedData.title}**\n\n${sanitizedData.description}`,
          color: this.getSeverityColor(sanitizedData.severity),
          fields: [
            {
              name: '👤 Usuário',
              value: user?.name || user?.email || 'Não identificado',
              inline: true
            },
            {
              name: '🕒 Horário',
              value: reportTime,
              inline: true
            },
            {
              name: '⚠️ Severidade',
              value: this.getSeverityEmoji(sanitizedData.severity) + ' ' + sanitizedData.severity.toUpperCase(),
              inline: true
            },
            ...(sanitizedData.url ? [{
              name: '🔗 Página',
              value: sanitizedData.url,
              inline: false
            }] : [])
          ],
          footer: {
            text: `Sistema de Bug Reports • ${reportTime}`,
            icon_url: 'https://cdn-icons-png.flaticon.com/512/1165/1165674.png'
          },
          timestamp: new Date().toISOString()
        }]
      };

      // Enviar para Discord
      logger.info('📤 Sending to Discord webhook...', { 
        url: this.discordWebhookUrl.substring(0, 50) + '...',
        embedTitle: discordEmbed.embeds[0].title,
        embedSize: JSON.stringify(discordEmbed).length
      });

      let response;
      try {
        response = await fetch(this.discordWebhookUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'Bug-Report-System/1.0'
          },
          body: JSON.stringify(discordEmbed)
        });
      } catch (fetchError) {
        logger.error('❌ Network error connecting to Discord', { error: fetchError });
        throw new Error(`Erro de conexão com Discord: ${fetchError instanceof Error ? fetchError.message : 'Unknown network error'}`);
      }

      logger.info('📡 Discord webhook response', { 
        status: response.status, 
        statusText: response.statusText,
        ok: response.ok 
      });

      if (!response.ok) {
        let errorText;
        try {
          errorText = await response.text();
        } catch (e) {
          errorText = 'Could not read response body';
        }
        
        logger.error('❌ Discord webhook failed', { 
          status: response.status, 
          statusText: response.statusText, 
          error: errorText 
        });
        
        // Diferentes mensagens de erro baseadas no status
        let errorMessage = 'Erro ao enviar para Discord';
        if (response.status === 429) {
          errorMessage = 'Rate limit atingido. Tente novamente em alguns segundos.';
        } else if (response.status >= 400 && response.status < 500) {
          errorMessage = 'Erro de configuração do webhook Discord.';
        } else if (response.status >= 500) {
          errorMessage = 'Discord está temporariamente indisponível.';
        }
        
        // Se Discord falhar, salvar em log local como fallback
        logger.error('📝 Discord failed, saving bug report to fallback log', {
          reportId,
          user: user?.email,
          title: sanitizedData.title,
          description: sanitizedData.description,
          severity: sanitizedData.severity,
          category: sanitizedData.category,
          timestamp: new Date().toISOString()
        });
        
        throw new Error(`${errorMessage} (${response.status}): ${errorText}`);
      }

      logger.info('✅ Discord webhook successful');

      // Log do bug report
      logger.info(`🐛 Bug report submitted: ${reportId}`, {
        reportId,
        user: user?.email,
        title: sanitizedData.title,
        severity: sanitizedData.severity,
        category: sanitizedData.category,
        timestamp: new Date().toISOString()
      });

      res.json({
        success: true,
        message: 'Bug reportado com sucesso!',
        reportId,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      logger.error('❌ Error submitting bug report:', error);
      res.status(500).json({
        success: false,
        message: 'Erro interno do servidor ao enviar relatório de bug',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  private getSeverityColor(severity: string): number {
    const colors = {
      'baixa': 0x28a745,    // Verde
      'media': 0xffc107,    // Amarelo
      'alta': 0xfd7e14,     // Laranja
      'critica': 0xdc3545   // Vermelho
    };
    return colors[severity as keyof typeof colors] || 0x6c757d;
  }

  private getSeverityEmoji(severity: string): string {
    const emojis = {
      'baixa': '🟢',
      'media': '🟡',
      'alta': '🟠',
      'critica': '🔴'
    };
    return emojis[severity as keyof typeof emojis] || '⚪';
  }

  private getCategoryEmoji(category: string): string {
    const emojis = {
      'ui': '🎨',
      'funcionalidade': '⚙️',
      'performance': '⚡',
      'dados': '📊',
      'outro': '❓'
    };
    return emojis[category as keyof typeof emojis] || '❓';
  }
}

export const bugReportController = new BugReportController();
