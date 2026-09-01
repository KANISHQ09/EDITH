import winston from 'winston';

const { combine, timestamp, json, errors, colorize, simple } = winston.format;

const isDev = process.env.NODE_ENV !== 'production';

export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: combine(
    errors({ stack: true }),
    timestamp(),
    json()
  ),
  defaultMeta: {
    service: 'vaic-api',
  },
  transports: [
    new winston.transports.Console({
      format: isDev
        ? combine(colorize(), simple())
        : combine(timestamp(), json()),
    }),
  ],
});

/**
 * Create a child logger with additional context fields.
 * Used for per-request and per-incident logging.
 */
export const childLogger = (meta: Record<string, unknown>) =>
  logger.child(meta);
