
import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

export class SupplierRecommendationController {
  async createRecommendation(req: Request, res: Response, next: NextFunction) {
    try {
      const { supplierName, contact, comment } = req.body;
      const user = req.user;

      if (!supplierName || !supplierName.trim()) {
        return res.status(400).json({
          success: false,
          message: 'Nome do fornecedor é obrigatório'
        });
      }

      // Prepare Discord webhook payload
      const discordPayload = {
        embeds: [
          {
            title: "🏪 Nova Indicação de Fornecedor",
            color: 0x3B82F6, // Blue color
            fields: [
              {
                name: "👤 Usuário",
                value: `${user.name || 'N/A'} (${user.email})`,
                inline: true
              },
              {
                name: "🏢 Fornecedor Indicado",
                value: supplierName.trim(),
                inline: true
              },
              {
                name: "📞 Contato",
                value: contact && contact.trim() ? contact.trim() : "Não informado",
                inline: false
              },
              {
                name: "💬 Comentário",
                value: comment && comment.trim() ? comment.trim() : "Nenhum comentário",
                inline: false
              }
            ],
            timestamp: new Date().toISOString(),
            footer: {
              text: "Sistema de Indicação de Fornecedores"
            }
          }
        ]
      };

      // Send to Discord webhook
      const webhookUrl = "https://discord.com/api/webhooks/1387916808090026074/qFEtwFENuzG4quFIOgrSJtl3pEXMIyvUstIYhjRZmWyP4N-S5Xz2Bxf_wWYVS546CFei";
      
      const discordResponse = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(discordPayload)
      });

      if (!discordResponse.ok) {
        logger.error('Failed to send Discord webhook:', {
          status: discordResponse.status,
          statusText: discordResponse.statusText
        });
        throw new Error('Failed to send notification to Discord');
      }

      logger.info('Supplier recommendation submitted:', {
        user: user.email,
        supplierName: supplierName.trim(),
        hasContact: !!contact,
        hasComment: !!comment
      });

      res.json({
        success: true,
        message: 'Indicação enviada com sucesso'
      });

    } catch (error) {
      logger.error('Error creating supplier recommendation:', error);
      next(error);
    }
  }
}

export const supplierRecommendationController = new SupplierRecommendationController();
