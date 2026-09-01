import { Pool, PoolClient } from 'pg';
import { logger } from '../lib/logger';

let pool: Pool;

export function getPool(): Pool {
  if (!pool) {
    const connectionString = process.env.DATABASE_URL || 'postgresql://vaic:vaic_local_dev_password@localhost:5432/vaic';
    const isSsl = !connectionString.includes('localhost') && !connectionString.includes('127.0.0.1');

    pool = new Pool({
      connectionString,
      ssl: isSsl ? { rejectUnauthorized: false } : undefined,
      max: 20,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 30_000,
    });
    pool.on('error', (err) => logger.error({ message: 'PostgreSQL pool error', error: err.message }));
  }
  return pool;
}

export async function query<T = Record<string, unknown>>(sql: string, params?: unknown[]): Promise<T[]> {
  const client = await getPool().connect();
  try {
    const result = await client.query(sql, params);
    return result.rows as T[];
  } finally {
    client.release();
  }
}

export async function withTransaction<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
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
