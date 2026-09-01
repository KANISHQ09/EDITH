import { Request, Response, NextFunction } from 'express';
import { logger } from '../lib/logger';
import { v4 as uuidv4 } from 'uuid';

/**
 * Request logging middleware.
 * Attaches a correlation ID to each request and logs method, path, status, and duration.
 */
export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  const correlationId = (req.headers['x-correlation-id'] as string) || uuidv4();
  const startMs = Date.now();

  // Attach correlation ID to response headers for client tracing
  res.setHeader('x-correlation-id', correlationId);
  (req as any).correlationId = correlationId;

  res.on('finish', () => {
    logger.info({
      message: 'HTTP request',
      method: req.method,
      path: req.path,
      status: res.statusCode,
      durationMs: Date.now() - startMs,
      correlationId,
      service: 'api',
    });
  });

  next();
}
