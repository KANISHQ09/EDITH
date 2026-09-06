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

    // Check if database tables are already initialized
    try {
      const checkRes = await client.query(
        "SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'incidents'"
      );
      if (checkRes.rowCount && checkRes.rowCount > 0) {
        console.log('✅ Database schema already initialized (incidents table detected). Skipping init.');
        client.release();
        await pool.end();
        return;
      }
    } catch {
      // Continue to full init if check query fails
    }

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
    if (err.message && (err.message.includes('already exists') || err.code === '42710' || err.code === '42P07')) {
      console.log('⚠️ Notice: Schema elements already present, skipping gracefully:', err.message);
      await pool.end();
      process.exit(0);
    }
    console.error('❌ Migration failed:', err.message);
    await pool.end();
    process.exit(1);
  }
}

runMigration();
