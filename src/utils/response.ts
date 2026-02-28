import { Response } from 'express';

interface SuccessPayload<T> {
  res: Response;
  data?: T;
  message?: string;
  statusCode?: number;
  meta?: Record<string, unknown> | null;
}

interface ErrorPayload {
  res: Response;
  code: string;
  message: string;
  statusCode?: number;
  details?: Record<string, unknown>;
}

export function sendSuccess<T>({
  res,
  data,
  message = 'Operation successful',
  statusCode = 200,
  meta = null,
}: SuccessPayload<T>) {
  return res.status(statusCode).json({
    success: true,
    data: data ?? null,
    message,
    meta,
  });
}

export function sendError({
  res,
  code,
  message,
  statusCode = 400,
  details,
}: ErrorPayload) {
  return res.status(statusCode).json({
    success: false,
    error: {
      code,
      message,
      ...(details ? { details } : {}),
    },
  });
}
