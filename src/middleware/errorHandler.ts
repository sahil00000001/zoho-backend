import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { sendError } from '../utils/response';

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction): void {
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
    sendError({ res, code: err.code, message: err.message, statusCode: err.statusCode });
    return;
  }

  // Generic fallback — expose details temporarily for debugging
  const errMsg = err instanceof Error ? err.message : String(err);
  console.error('[UnhandledError]', err);
  sendError({
    res,
    code: 'INTERNAL_SERVER_ERROR',
    message: `DEBUG: ${errMsg}`,
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
