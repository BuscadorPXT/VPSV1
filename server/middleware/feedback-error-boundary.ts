import { Request, Response, NextFunction } from 'express';

/**
 * ✅ ENHANCED ERROR BOUNDARY FOR FEEDBACK SYSTEM
 * 
 * Provides comprehensive error handling and user-friendly error responses
 */

export interface FeedbackError extends Error {
  code?: string;
  statusCode?: number;
  details?: any;
}

export const feedbackErrorHandler = (
  error: FeedbackError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  console.error('🚨 [FEEDBACK-ERROR] Unhandled error:', {
    message: error.message,
    code: error.code,
    statusCode: error.statusCode,
    path: req.path,
    method: req.method,
    userId: (req as any).user?.id,
    stack: error.stack
  });

  // Determinar status code apropriado
  const statusCode = error.statusCode || 500;

  // Determinar mensagem de erro adequada
  let userMessage = 'Erro interno do servidor';
  let errorCode = error.code || 'INTERNAL_ERROR';

  switch (error.code) {
    case 'VALIDATION_ERROR':
      userMessage = 'Dados fornecidos são inválidos';
      break;
    case 'AUTHENTICATION_ERROR':
      userMessage = 'Falha na autenticação';
      break;
    case 'AUTHORIZATION_ERROR':
      userMessage = 'Acesso negado';
      break;
    case 'RATE_LIMIT_EXCEEDED':
      userMessage = 'Muitas tentativas. Tente novamente em alguns segundos';
      break;
    case 'RESOURCE_NOT_FOUND':
      userMessage = 'Recurso não encontrado';
      break;
    case 'DUPLICATE_RESOURCE':
      userMessage = 'Recurso já existe';
      break;
    case 'DATABASE_ERROR':
      userMessage = 'Erro no banco de dados';
      errorCode = 'DATABASE_ERROR';
      break;
    default:
      if (error.message.includes('duplicate key')) {
        userMessage = 'Dados duplicados detectados';
        errorCode = 'DUPLICATE_ERROR';
      } else if (error.message.includes('foreign key')) {
        userMessage = 'Referência inválida detectada';
        errorCode = 'REFERENCE_ERROR';
      } else if (error.message.includes('timeout')) {
        userMessage = 'Operação expirou. Tente novamente';
        errorCode = 'TIMEOUT_ERROR';
      }
  }

  // Resposta padronizada de erro
  const errorResponse = {
    success: false,
    message: userMessage,
    code: errorCode,
    timestamp: new Date().toISOString(),
    path: req.path
  };

  // Em desenvolvimento, incluir detalhes adicionais
  if (process.env.NODE_ENV === 'development') {
    (errorResponse as any).debug = {
      originalMessage: error.message,
      stack: error.stack,
      details: error.details
    };
  }

  res.status(statusCode).json(errorResponse);
};

/**
 * Wrapper para controllers que automaticamente captura erros
 */
export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * Middleware para capturar erros 404 em rotas de feedback
 */
export const feedbackNotFoundHandler = (req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    message: 'Endpoint de feedback não encontrado',
    code: 'ENDPOINT_NOT_FOUND',
    availableEndpoints: [
      'GET /api/feedback-alerts/active',
      'POST /api/feedback-alerts/respond',
      'GET /api/feedback-alerts/admin/list',
      'POST /api/feedback-alerts/admin/create',
      'GET /api/feedback-alerts/admin/:alertId/responses',
      'DELETE /api/feedback-alerts/admin/:alertId',
      'PATCH /api/feedback-alerts/admin/:alertId/toggle'
    ]
  });
};