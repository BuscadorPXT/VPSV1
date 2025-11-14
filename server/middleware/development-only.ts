
import { Request, Response, NextFunction } from 'express';

/**
 * Middleware to restrict access to development-only routes
 * This prevents access to certain features in production environment
 */
export function developmentOnly(req: Request, res: Response, next: NextFunction) {
  // Sistema de margens bloqueado para todos os usuários
  // Funcionalidade em desenvolvimento - não disponível
  return res.status(403).json({
    success: false,
    message: 'Sistema de Margens de Lucro em desenvolvimento. Funcionalidade não disponível para uso.',
    code: 'FEATURE_UNDER_DEVELOPMENT',
    details: {
      status: 'Em desenvolvimento',
      available: false,
      reason: 'Funcionalidade sendo construída pela equipe de desenvolvimento'
    }
  });
}
