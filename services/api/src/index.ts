import 'express-async-errors';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import path from 'path';
import dotenv from 'dotenv';
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
dotenv.config();

import { logger } from './lib/logger';
import { errorHandler } from './middleware/errorHandler';
import { requestLogger } from './middleware/requestLogger';

import incidentRoutes from './routes/incidents';
import webhookRoutes from './routes/webhooks';
import healthRoutes from './routes/health';

const app = express();
const PORT = process.env.PORT || process.env.API_PORT || 3001;

// ─── Security Middleware ─────────────────────────────────────
app.use(helmet());
const rawAllowed = process.env.ALLOWED_ORIGINS;
const allowedOrigins = rawAllowed ? rawAllowed.split(',').map((s) => s.trim()) : null;

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps, curl, or server-to-server)
    if (!origin || !allowedOrigins || allowedOrigins.includes('*') || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    // Automatically allow Vercel previews and deployments
    if (origin.endsWith('.vercel.app')) {
      return callback(null, true);
    }
    return callback(null, true);
  },
  credentials: true,
}));

// ─── Body Parsing ────────────────────────────────────────────
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

// ─── Logging ─────────────────────────────────────────────────
app.use(requestLogger);

// ─── Routes ──────────────────────────────────────────────────
app.use('/health', healthRoutes);
app.use('/api/v1/incidents', incidentRoutes);
app.use('/webhooks', webhookRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'NOT_FOUND',
    message: `Route ${req.method} ${req.path} not found`,
  });
});

// ─── Error Handler ───────────────────────────────────────────
app.use(errorHandler);

// ─── Start Server ────────────────────────────────────────────
app.listen(PORT, () => {
  logger.info({
    message: 'VAIC API Service started',
    port: PORT,
    environment: process.env.NODE_ENV || 'development',
    service: 'api',
  });
});

export default app;
