import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { sendError } from '../utils/response';
import { logError } from '../services/audit.service';

export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction): void {
  // Zod validation error
  if (err instanceof ZodError) {
    const details = err.flatten().fieldErrors;
    sendError({
      res,
      code: 'VALIDATION_ERROR',
      message: 'Request validation failed',
      statusCode: 422,
      details: details as Record<string, unknown>,
    });
    return;
  }

  // Known application errors
  if (err instanceof AppError) {
    logError({
      message: err.message,
      stack: err.stack,
      endpoint: req.path,
      method: req.method,
      userId: (req as any).user?.userId,
      statusCode: err.statusCode,
    }).catch(() => {});
    sendError({ res, code: err.code, message: err.message, statusCode: err.statusCode });
    return;
  }

  // Generic fallback
  console.error('[UnhandledError]', err);
  const errObj = err instanceof Error ? err : new Error(String(err));
  logError({
    message: errObj.message,
    stack: errObj.stack,
    endpoint: req.path,
    method: req.method,
    userId: (req as any).user?.userId,
    statusCode: 500,
  }).catch(() => {});
  sendError({
    res,
    code: 'INTERNAL_SERVER_ERROR',
    message: 'An unexpected error occurred',
    statusCode: 500,
  });
}

export class AppError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly statusCode = 400,
  ) {
    super(message);
    this.name = 'AppError';
  }
}
