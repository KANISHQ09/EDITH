import { Pool, PoolClient } from 'pg';
import { logger } from '../lib/logger';

let pool: Pool;

export function getPool(): Pool {
  if (!pool) {
    const connectionString = process.env.DATABASE_URL;
    const isSsl = connectionString && !connectionString.includes('localhost') && !connectionString.includes('127.0.0.1');

    pool = new Pool({
      connectionString,
      ssl: isSsl ? { rejectUnauthorized: false } : undefined,
      max: 20,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 30_000,
    });

    pool.on('error', (err) => {
      logger.error({ message: 'Unexpected PostgreSQL pool error', error: err.message, service: 'api' });
    });

    pool.on('connect', () => {
      logger.debug({ message: 'New PostgreSQL connection established', service: 'api' });
    });
  }
  return pool;
}

/**
 * Execute a query with automatic connection management.
 */
export async function query<T = Record<string, unknown>>(
  sql: string,
  params?: unknown[]
): Promise<T[]> {
  const client = await getPool().connect();
  try {
    const result = await client.query(sql, params);
    return result.rows as T[];
  } finally {
    client.release();
  }
}

/**
 * Execute multiple queries in a transaction.
 */
export async function withTransaction<T>(
  fn: (client: PoolClient) => Promise<T>
): Promise<T> {
  const client = await getPool().connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Health check — verifies DB connectivity.
 */
export async function checkDbHealth(): Promise<boolean> {
  try {
    await query('SELECT 1');
    return true;
  } catch {
    return false;
  }
}
