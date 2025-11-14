import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';

// Input sanitization to prevent XSS
function sanitizeString(input: string): string {
  if (typeof input !== 'string') return '';

  return input
    .replace(/[<>\"']/g, '') // Remove basic XSS characters
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+=/gi, '') // Remove event handlers
    .trim()
    .slice(0, 1000); // Limit length
}

function sanitizeObject(obj: any): any {
  if (obj === null || obj === undefined) return obj;

  if (typeof obj === 'string') {
    return sanitizeString(obj);
  }

  if (Array.isArray(obj)) {
    return obj.map(sanitizeObject);
  }

  if (typeof obj === 'object') {
    const sanitized: any = {};
    for (const [key, value] of Object.entries(obj)) {
      const sanitizedKey = sanitizeString(key);
      sanitized[sanitizedKey] = sanitizeObject(value);
    }
    return sanitized;
  }

  return obj;
}

// Validation schemas for common operations
export const userUpdateSchema = z.union([
  // Direct format: { userId: X, role: Y, ... }
  z.object({
    userId: z.number().int().positive(),
    name: z.string().min(1).max(100).optional(),
    email: z.string().email().max(255).optional(),
    company: z.string().max(100).optional(),
    role: z.enum(['user', 'admin', 'superadmin']).optional(),
    subscriptionPlan: z.enum(['free', 'pro', 'business', 'admin']).optional(),
    isAdmin: z.boolean().optional()
  }),
  // Nested format: { userId: X, updates: { role: Y, ... } }
  z.object({
    userId: z.number().int().positive(),
    updates: z.object({
      name: z.string().min(1).max(100).optional(),
      email: z.string().email().max(255).optional(),
      company: z.string().max(100).optional(),
      role: z.enum(['user', 'admin', 'superadmin']).optional(),
      subscriptionPlan: z.enum(['free', 'pro', 'business', 'admin']).optional(),
      isAdmin: z.boolean().optional(),
      isSubscriptionActive: z.boolean().optional()
    })
  })
]);

export const roleChangeSchema = z.object({
  userId: z.number().int().positive(),
  newRole: z.enum(['user', 'admin', 'superadmin']),
  reason: z.string().min(1).max(500)
});

export const priceAlertSchema = z.object({
  model: z.string().min(1).max(100),
  thresholdPrice: z.number().positive().max(999999),
  brand: z.string().max(50).optional(),
  capacity: z.string().max(20).optional(),
  color: z.string().max(30).optional(),
  region: z.string().max(100).optional(),
  emailNotification: z.boolean().optional(),
  webPushNotification: z.boolean().optional()
});

export const userNoteSchema = z.object({
  userId: z.number().int().positive(),
  note: z.string().min(1).max(1000)
});

export const announcementSchema = z.object({
  title: z.string().min(1).max(200),
  message: z.string().min(1).max(2000),
  type: z.enum(['info', 'warning', 'success', 'error']),
  targetAudience: z.array(z.enum(['all', 'free', 'pro', 'business', 'admin'])),
  isPermanent: z.boolean().optional()
});

// Generic validation middleware
export function validateInput(schema: z.ZodSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    const requestId = Math.random().toString(36).substr(2, 9);

    try {
      console.log(`🔍 [${requestId}] Input validation starting for ${req.method} ${req.path}`);
      console.log(`🔍 [${requestId}] Raw request body:`, req.body);
      console.log(`🔍 [${requestId}] Request content-type:`, req.headers['content-type']);

      const validatedData = schema.parse(req.body);

      console.log(`✅ [${requestId}] Validation successful. Validated data:`, validatedData);

      req.body = validatedData;
      next();
    } catch (error) {
      console.error(`❌ [${requestId}] Validation failed:`, {
        error: error?.message,
        originalBody: req.body,
        path: req.path,
        method: req.method
      });

      if (error instanceof z.ZodError) {
        console.error(`❌ [${requestId}] Zod validation errors:`, error.errors);

        return res.status(400).json({
          success: false,
          message: 'Dados de entrada inválidos',
          errors: error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message,
            received: err.received
          }))
        });
      }

      console.error(`❌ [${requestId}] Non-Zod validation error:`, error);

      return res.status(400).json({
        success: false,
        message: 'Erro de validação',
        debug: process.env.NODE_ENV === 'development' ? {
          error: error?.message,
          type: error?.constructor?.name
        } : undefined
      });
    }
  };
}

// SQL injection prevention for search queries
export function sanitizeSearchQuery(query: string): string {
  if (typeof query !== 'string') return '';

  return query
    .replace(/['"\\;]/g, '') // Remove SQL injection characters
    .replace(/(\b(union|select|insert|update|delete|drop|create|alter|exec|execute)\b)/gi, '') // Remove SQL keywords
    .trim()
    .slice(0, 100);
}

// Rate limiting for specific operations
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

// Get rate limit config from environment
const getRateLimitConfig = () => ({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutes
  maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),
  skipSuccessfulRequests: process.env.NODE_ENV === 'development'
});

export function rateLimit(operation: string, maxRequests?: number, windowMinutes?: number) {
  const config = getRateLimitConfig();
  const finalMaxRequests = maxRequests || config.maxRequests;
  const finalWindowMs = windowMinutes ? windowMinutes * 60 * 1000 : config.windowMs;

  return (req: Request, res: Response, next: NextFunction) => {
    const clientId = req.ip || 'unknown';
    const key = `${operation}:${clientId}`;

    const now = Date.now();
    const limit = rateLimitStore.get(key);

    if (!limit || now > limit.resetTime) {
      rateLimitStore.set(key, { count: 1, resetTime: now + finalWindowMs });
      return next();
    }

    if (limit.count >= finalMaxRequests) {
      return res.status(429).json({
        message: 'Muitas requisições. Tente novamente mais tarde.',
        code: 'RATE_LIMITED'
      });
    }

    limit.count++;
    rateLimitStore.set(key, { ...limit, count: limit.count });
    next();
  };
}

// CSRF protection for state-changing operations
export function csrfProtection(req: Request, res: Response, next: NextFunction) {
  if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method)) {
    const origin = req.headers.origin;
    const referer = req.headers.referer;
    const host = req.headers.host;

    // Get allowed origins dynamically
    const allowedOrigins = [
      process.env.FRONTEND_URL,
      process.env.REPLIT_DOMAIN,
      host ? `https://${host}` : null,
      host ? `http://${host}` : null,
      'https://' + process.env.REPL_SLUG + '.' + process.env.REPL_OWNER + '.repl.co',
      'https://' + process.env.REPL_ID + '.replit.app'
    ].filter(Boolean);

    // Add common Replit patterns
    if (host && host.includes('replit.dev')) {
      allowedOrigins.push(`https://${host}`, `http://${host}`);
    }

    // For development, be more permissive
    if (process.env.NODE_ENV === 'development') {
      allowedOrigins.push('http://localhost:3000', 'http://localhost:5000', 'http://127.0.0.1:5000');
    }

    // Check origin validation only if origin is present
    if (origin) {
      const isOriginAllowed = allowedOrigins.some(allowed => 
        allowed && (origin === allowed || origin.startsWith(allowed))
      );

      if (!isOriginAllowed) {
        console.warn('CSRF protection: Origin not allowed:', {
          origin,
          referer,
          host,
          allowedOrigins: allowedOrigins.slice(0, 3) // Log first 3 for debugging
        });

        return res.status(403).json({
          message: 'Origem não autorizada',
          code: 'INVALID_ORIGIN'
        });
      }
    }
  }

  next();
}