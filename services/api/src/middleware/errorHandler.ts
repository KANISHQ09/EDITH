import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { logger } from '../lib/logger';

interface AppError extends Error {
  status?: number;
  code?: string;
}

/**
 * Central error handler middleware.
 * Normalizes errors into a consistent JSON response shape.
 */
export function errorHandler(
  err: AppError | ZodError,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  const correlationId = (req as any).correlationId;

  // Handle Zod validation errors (400)
  if (err instanceof ZodError) {
    logger.warn({
      message: 'Request validation failed',
      errors: err.errors,
      path: req.path,
      correlationId,
      service: 'api',
    });
    res.status(400).json({
      error: 'VALIDATION_ERROR',
      message: 'Request validation failed',
      details: err.errors.map((e) => ({
        path: e.path.join('.'),
        message: e.message,
      })),
      correlationId,
    });
    return;
  }

  // Handle known operational errors
  const status = (err as AppError).status || 500;
  const code = (err as AppError).code || 'INTERNAL_SERVER_ERROR';

  if (status >= 500) {
    logger.error({
      message: 'Unhandled server error',
      error: err.message,
      stack: err.stack,
      path: req.path,
      method: req.method,
      correlationId,
      service: 'api',
    });
  }

  res.status(status).json({
    error: code,
    message: status >= 500 ? 'An internal server error occurred' : err.message,
    correlationId,
  });
}

/**
 * Create a typed application error.
 */
export function createError(message: string, status: number, code: string): AppError {
  const err = new Error(message) as AppError;
  err.status = status;
  err.code = code;
  return err;
}

export const NotFoundError = (msg: string) => createError(msg, 404, 'NOT_FOUND');
export const ForbiddenError = (msg: string) => createError(msg, 403, 'FORBIDDEN');
export const ConflictError = (msg: string) => createError(msg, 409, 'CONFLICT');
export const BadRequestError = (msg: string) => createError(msg, 400, 'BAD_REQUEST');
