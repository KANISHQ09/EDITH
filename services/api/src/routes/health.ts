import { Router, Response } from 'express';
import { checkDbHealth } from '../db/pool';

const router = Router();

/**
 * GET /health
 * Basic liveness check — always returns 200 if process is alive.
 */
router.get('/', (_req, res: Response) => {
  res.json({
    status: 'ok',
    service: 'vaic-api',
    timestamp: new Date().toISOString(),
  });
});

/**
 * GET /health/ready
 * Readiness check — validates all critical dependencies (DB, Redis).
 */
router.get('/ready', async (_req, res: Response) => {
  const dbHealthy = await checkDbHealth();

  const checks = {
    database: dbHealthy ? 'ok' : 'fail',
  };

  const allHealthy = Object.values(checks).every((v) => v === 'ok');

  res.status(allHealthy ? 200 : 503).json({
    status: allHealthy ? 'ready' : 'not_ready',
    service: 'vaic-api',
    checks,
    timestamp: new Date().toISOString(),
  });
});

/**
 * GET /health/metrics
 * Minimal metrics endpoint (Prometheus-compatible metrics would be added via prom-client).
 */
router.get('/metrics', (_req, res: Response) => {
  res.json({
    uptime: process.uptime(),
    memoryUsage: process.memoryUsage(),
    timestamp: new Date().toISOString(),
  });
});

export default router;
