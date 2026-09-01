import winston from 'winston';

const isDev = process.env.NODE_ENV !== 'production';
const { combine, timestamp, json, errors, colorize, simple } = winston.format;

export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: combine(errors({ stack: true }), timestamp(), json()),
  defaultMeta: { service: 'vaic-ais' },
  transports: [
    new winston.transports.Console({
      format: isDev ? combine(colorize(), simple()) : combine(timestamp(), json()),
    }),
  ],
});
