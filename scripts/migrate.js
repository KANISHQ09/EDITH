const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const { Pool } = require('pg');

dotenv.config({ path: path.resolve(__dirname, '../.env') });

async function runMigration() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    console.error('❌ Error: DATABASE_URL is not set in .env');
    process.exit(1);
  }

  console.log('🔄 Connecting to Neon PostgreSQL database...');

  const pool = new Pool({
    connectionString: databaseUrl,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 10000,
  });

  try {
    const client = await pool.connect();
    console.log('✅ Connected to Neon PostgreSQL successfully!');

    // Read the init.sql schema file
    const sqlPath = path.resolve(__dirname, '../infrastructure/docker/postgres/init.sql');
    if (!fs.existsSync(sqlPath)) {
      throw new Error(`Cannot find schema file at ${sqlPath}`);
    }

    const initSql = fs.readFileSync(sqlPath, 'utf8');
    console.log('🔄 Running initial schema & creating 14 tables...');

    await client.query(initSql);

    console.log('🎉 Migrations executed successfully!');
    console.log('✅ 14 tables created and seeded with demo incident data.');

    const res = await client.query('SELECT count(*) FROM incidents');
    console.log(`📊 Verified: ${res.rows[0].count} incident(s) currently in the database.`);

    client.release();
    await pool.end();
  } catch (err) {
    console.error('❌ Migration failed:', err.message);
    await pool.end();
    process.exit(1);
  }
}

runMigration();
