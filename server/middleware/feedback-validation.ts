import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { AdminRequest } from './admin-auth';

// Rate limiting em memória (para desenvolvimento)
const rateLimitStore = new Map<string, { count: number, resetTime: number }>();

export const validateCreateAlert = (req: AdminRequest, res: Response, next: NextFunction) => {
  const { title, message, feedbackType, startDate, endDate } = req.body;

  // Validação de campos obrigatórios
  if (!title || typeof title !== 'string' || title.trim().length === 0) {
    return res.status(400).json({
      success: false,
      message: 'Título é obrigatório',
      code: 'TITLE_REQUIRED'
    });
  }

  if (!message || typeof message !== 'string' || message.trim().length === 0) {
    return res.status(400).json({
      success: false,
      message: 'Mensagem é obrigatória',
      code: 'MESSAGE_REQUIRED'
    });
  }

  if (!feedbackType || !['emoji', 'text', 'both', 'rating'].includes(feedbackType)) {
    return res.status(400).json({
      success: false,
      message: 'Tipo de feedback inválido',
      code: 'INVALID_FEEDBACK_TYPE'
    });
  }

  if (!startDate || !endDate) {
    return res.status(400).json({
      success: false,
      message: 'Datas de início e fim são obrigatórias',
      code: 'DATES_REQUIRED'
    });
  }

  // Validação de datas
  const start = new Date(startDate);
  const end = new Date(endDate);

  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    return res.status(400).json({
      success: false,
      message: 'Formato de data inválido',
      code: 'INVALID_DATE_FORMAT'
    });
  }

  if (start >= end) {
    return res.status(400).json({
      success: false,
      message: 'Data de início deve ser anterior à data de fim',
      code: 'INVALID_DATE_RANGE'
    });
  }

  // Validação de tamanho
  if (title.length > 200) {
    return res.status(400).json({
      success: false,
      message: 'Título muito longo (máximo 200 caracteres)',
      code: 'TITLE_TOO_LONG'
    });
  }

  if (message.length > 1000) {
    return res.status(400).json({
      success: false,
      message: 'Mensagem muito longa (máximo 1000 caracteres)',
      code: 'MESSAGE_TOO_LONG'
    });
  }

  next();
};

export const validateSubmitResponse = (req: AdminRequest, res: Response, next: NextFunction) => {
  const { alertId, emojiResponse, textResponse } = req.body;

  if (!alertId || typeof alertId !== 'number') {
    return res.status(400).json({
      success: false,
      message: 'ID do alerta é obrigatório',
      code: 'ALERT_ID_REQUIRED'
    });
  }

  // Pelo menos uma resposta deve ser fornecida
  if (!emojiResponse && !textResponse) {
    return res.status(400).json({
      success: false,
      message: 'Pelo menos uma resposta deve ser fornecida',
      code: 'RESPONSE_REQUIRED'
    });
  }

  // Validar emoji se fornecido
  if (emojiResponse && typeof emojiResponse !== 'string') {
    return res.status(400).json({
      success: false,
      message: 'Resposta emoji inválida',
      code: 'INVALID_EMOJI_RESPONSE'
    });
  }

  // Validar texto se fornecido
  if (textResponse) {
    if (typeof textResponse !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Resposta de texto inválida',
        code: 'INVALID_TEXT_RESPONSE'
      });
    }

    if (textResponse.length > 500) {
      return res.status(400).json({
        success: false,
        message: 'Resposta de texto muito longa (máximo 500 caracteres)',
        code: 'TEXT_RESPONSE_TOO_LONG'
      });
    }
  }

  next();
};

export const validateFeedbackRateLimit = (req: AdminRequest, res: Response, next: NextFunction) => {
  const userId = req.user?.id;
  if (!userId) {
    return res.status(401).json({
      success: false,
      message: 'Usuário não autenticado',
      code: 'USER_NOT_AUTHENTICATED'
    });
  }

  const key = `feedback_rate_limit_${userId}`;
  const now = Date.now();
  const windowMs = 60000; // 1 minuto
  const maxRequests = 10; // máximo 10 respostas por minuto

  const userLimit = rateLimitStore.get(key);

  if (!userLimit || now > userLimit.resetTime) {
    // Primeira requisição ou janela expirou
    rateLimitStore.set(key, { count: 1, resetTime: now + windowMs });
    next();
  } else if (userLimit.count < maxRequests) {
    // Dentro do limite
    userLimit.count++;
    next();
  } else {
    // Limite excedido
    return res.status(429).json({
      success: false,
      message: 'Muitas respostas enviadas. Tente novamente em 1 minuto.',
      code: 'RATE_LIMIT_EXCEEDED'
    });
  }
};

export const validateMessageSecurity = (req: AdminRequest, res: Response, next: NextFunction) => {
  const { title, message } = req.body;

  // Lista de patterns suspeitos
  const suspiciousPatterns = [
    /<script[^>]*>.*?<\/script>/gi,
    /<iframe[^>]*>.*?<\/iframe>/gi,
    /javascript:/gi,
    /on\w+\s*=/gi,
    /<img[^>]*src\s*=\s*["']?javascript:/gi
  ];

  // Verificar título
  if (title) {
    for (const pattern of suspiciousPatterns) {
      if (pattern.test(title)) {
        return res.status(400).json({
          success: false,
          message: 'Título contém conteúdo suspeito',
          code: 'SUSPICIOUS_TITLE_CONTENT'
        });
      }
    }
  }

  // Verificar mensagem
  if (message) {
    for (const pattern of suspiciousPatterns) {
      if (pattern.test(message)) {
        return res.status(400).json({
          success: false,
          message: 'Mensagem contém conteúdo suspeito',
          code: 'SUSPICIOUS_MESSAGE_CONTENT'
        });
      }
    }
  }

  next();
};

// ✅ VALIDATION SCHEMAS FOR FEEDBACK SYSTEM
export const createFeedbackAlertSchema = z.object({
  title: z.string().min(1, 'Título é obrigatório').max(100, 'Título deve ter no máximo 100 caracteres'),
  message: z.string().min(1, 'Mensagem é obrigatória').max(500, 'Mensagem deve ter no máximo 500 caracteres'),
  feedbackType: z.enum(['emoji', 'text', 'both'], { message: 'Tipo de feedback inválido' }),
  isRequired: z.boolean(),
  startDate: z.string().datetime('Data de início inválida'),
  endDate: z.string().datetime('Data de fim inválida'),
  targetAudience: z.enum(['all', 'pro', 'business', 'admin'], { message: 'Público-alvo inválido' }).default('all'),
  delaySeconds: z.number().min(0, 'Delay deve ser positivo').max(300, 'Delay máximo é 5 minutos').default(0)
}).refine(
  (data) => new Date(data.startDate) < new Date(data.endDate),
  { message: 'Data de início deve ser anterior à data de fim', path: ['endDate'] }
);

export const submitFeedbackResponseSchema = z.object({
  alertId: z.number().int().positive('ID do alerta deve ser um número positivo'),
  emojiResponse: z.string().optional(),
  textResponse: z.string().max(1000, 'Resposta deve ter no máximo 1000 caracteres').optional()
}).refine(
  (data) => data.emojiResponse || data.textResponse,
  { message: 'Pelo menos um tipo de resposta é obrigatório', path: ['textResponse'] }
);

// ✅ MIDDLEWARE DE VALIDAÇÃO PARA CRIAÇÃO DE ALERTAS
// export const validateCreateAlert = (req: Request, res: Response, next: NextFunction) => {
//   try {
//     console.log('🔍 [VALIDATION] Validating create alert request:', req.body);

//     const validatedData = createFeedbackAlertSchema.parse(req.body);
//     req.body = validatedData; // Replace with validated data

//     console.log('✅ [VALIDATION] Create alert validation passed');
//     next();
//   } catch (error) {
//     if (error instanceof z.ZodError) {
//       console.error('❌ [VALIDATION] Create alert validation failed:', error.errors);
//       return res.status(400).json({
//         success: false,
//         message: 'Dados inválidos',
//         errors: error.errors.map(err => ({
//           field: err.path.join('.'),
//           message: err.message
//         }))
//       });
//     }

//     console.error('❌ [VALIDATION] Unexpected validation error:', error);
//     return res.status(500).json({
//       success: false,
//       message: 'Erro interno de validação'
//     });
//   }
// };

// ✅ MIDDLEWARE DE VALIDAÇÃO PARA SUBMISSÃO DE RESPOSTA
// export const validateSubmitResponse = (req: Request, res: Response, next: NextFunction) => {
//   try {
//     console.log('🔍 [VALIDATION] Validating submit response request:', req.body);

//     const validatedData = submitFeedbackResponseSchema.parse(req.body);
//     req.body = validatedData; // Replace with validated data

//     console.log('✅ [VALIDATION] Submit response validation passed');
//     next();
//   } catch (error) {
//     if (error instanceof z.ZodError) {
//       console.error('❌ [VALIDATION] Submit response validation failed:', error.errors);
//       return res.status(400).json({
//         success: false,
//         message: 'Dados de resposta inválidos',
//         errors: error.errors.map(err => ({
//           field: err.path.join('.'),
//           message: err.message
//         }))
//       });
//     }

//     console.error('❌ [VALIDATION] Unexpected validation error:', error);
//     return res.status(500).json({
//       success: false,
//       message: 'Erro interno de validação'
//     });
//   }
// };

// ✅ SANITIZAÇÃO DE DADOS DE ENTRADA
export const sanitizeAlertInput = (data: any) => {
  return {
    ...data,
    title: data.title?.trim(),
    message: data.message?.trim(),
    textResponse: data.textResponse?.trim()
  };
};

// ✅ VALIDADOR DE RATE LIMITING PARA FEEDBACK
// export const validateFeedbackRateLimit = (req: Request, res: Response, next: NextFunction) => {
//   const userSubmissions = (req as any).userSubmissions || {};
//   const userId = (req as any).user?.id;
//   const now = Date.now();
//   const windowMs = 60 * 1000; // 1 minuto
//   const maxSubmissions = 5; // Máximo 5 submissões por minuto

//   if (!userId) {
//     return next();
//   }

//   if (!userSubmissions[userId]) {
//     userSubmissions[userId] = [];
//   }

//   // Limpar submissões antigas
//   userSubmissions[userId] = userSubmissions[userId].filter(
//     (timestamp: number) => now - timestamp < windowMs
//   );

//   if (userSubmissions[userId].length >= maxSubmissions) {
//     console.warn(`⚠️ [RATE-LIMIT] User ${userId} exceeded feedback submission rate limit`);
//     return res.status(429).json({
//       success: false,
//       message: 'Muitas submissões. Tente novamente em alguns segundos.',
//       code: 'RATE_LIMIT_EXCEEDED'
//     });
//   }

//   userSubmissions[userId].push(now);
//   (req as any).userSubmissions = userSubmissions;

//   next();
// };

// ✅ VALIDAÇÃO DE TAMANHO DE MENSAGEM CONTRA XSS
// export const validateMessageSecurity = (req: Request, res: Response, next: NextFunction) => {
//   const { message, textResponse } = req.body;

//   // Verificar tags HTML potencialmente perigosas
//   const dangerousPatterns = [
//     /<script/i,
//     /<iframe/i,
//     /<object/i,
//     /<embed/i,
//     /javascript:/i,
//     /onload=/i,
//     /onerror=/i,
//     /onclick=/i
//   ];

//   const textToCheck = [message, textResponse].filter(Boolean);

//   for (const text of textToCheck) {
//     for (const pattern of dangerousPatterns) {
//       if (pattern.test(text)) {
//         console.warn(`⚠️ [SECURITY] Potential XSS attempt detected from user ${(req as any).user?.id}`);
//         return res.status(400).json({
//           success: false,
//           message: 'Conteúdo não permitido detectado',
//           code: 'SECURITY_VIOLATION'
//         });
//       }
//     }
//   }

//   next();
// };