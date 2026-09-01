import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { Pool } from 'pg';

// Load root .env
dotenv.config({ path: path.resolve(__dirname, '../../../../.env') });

async function runMigration() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    console.error('❌ Error: DATABASE_URL is not set in .env');
    process.exit(1);
  }

  console.log('🔄 Connecting to PostgreSQL database...');

  const isSsl = !databaseUrl.includes('localhost') && !databaseUrl.includes('127.0.0.1');

  const pool = new Pool({
    connectionString: databaseUrl,
    ssl: isSsl ? { rejectUnauthorized: false } : undefined,
  });

  try {
    const client = await pool.connect();
    console.log('✅ Connected to PostgreSQL successfully!');

    // Read the init.sql schema file
    const sqlPath = path.resolve(__dirname, '../../../../infrastructure/docker/postgres/init.sql');
    if (!fs.existsSync(sqlPath)) {
      throw new Error(`Cannot find schema file at ${sqlPath}`);
    }

    const initSql = fs.readFileSync(sqlPath, 'utf8');
    console.log('🔄 Running migrations & creating 14 tables...');

    await client.query(initSql);

    console.log('🎉 Migrations executed successfully! All tables and seed data are ready.');
    client.release();
    await pool.end();
  } catch (err: any) {
    console.error('❌ Migration failed:', err.message);
    await pool.end();
    process.exit(1);
  }
}

runMigration();
