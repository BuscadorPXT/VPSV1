import { Request, Response, NextFunction } from 'express';
import { logger } from './logger';

export interface AppError extends Error {
  statusCode?: number;
  isOperational?: boolean;
}

export class ApiError extends Error implements AppError {
  public statusCode: number;
  public isOperational: boolean;

  constructor(message: string, statusCode: number = 500, isOperational: boolean = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;

    Error.captureStackTrace(this, this.constructor);
  }
}

export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  logger.error('Error handler:', err);

  // Garantir que sempre retorna JSON
  res.setHeader('Content-Type', 'application/json');

  // Set default error
  let error = { ...err };
  error.message = err.message;

  // Log to console for dev
  if (process.env.NODE_ENV === 'development') {
    console.error(err);
  }

  let statusCode = res.statusCode === 200 ? 500 : res.statusCode;
  let message = error.message || 'Erro interno do servidor';

  // Mongoose bad ObjectId
  if (err.name === 'CastError') {
    message = 'Recurso não encontrado';
    statusCode = 404;
  }

  // Mongoose duplicate key
  if ((err as any).code === 11000) {
    message = 'Valor duplicado detectado';
    statusCode = 400;
  }

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    message = Object.values((err as any).errors).map((val: any) => val.message).join(', ');
    statusCode = 400;
  }

  // Database connection errors
  if (err.message && err.message.includes('CONNECTION_CLOSED')) {
    message = 'Serviço temporariamente indisponível';
    statusCode = 503;
  }

  // Authentication errors
  if (err.message && (err.message.includes('TOKEN_EXPIRED') || err.message.includes('Unauthorized'))) {
    message = 'Token inválido ou expirado';
    statusCode = 401;
  }

  res.status(statusCode).json({
    success: false,
    error: message,
    code: err.name || 'INTERNAL_ERROR',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
};

export const notFoundHandler = (req: Request, res: Response) => {
  res.setHeader('Content-Type', 'application/json');
  res.status(404).json({
    success: false,
    error: `Route ${req.originalUrl} not found`
  });
};

export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};