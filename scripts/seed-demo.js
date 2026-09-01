const path = require('path');
const dotenv = require('dotenv');
const { Pool } = require('pg');

dotenv.config({ path: path.resolve(__dirname, '../.env') });

async function seed() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  const client = await pool.connect();
  try {
    console.log('🌱 Seeding demo incident data...');

    const orgId = '00000000-0000-0000-0000-000000000001';
    const incidentId = '00000000-0000-0000-0000-000000000010';

    // Insert Incident
    await client.query(`
      INSERT INTO incidents (id, org_id, title, severity, status, start_ts, conference_url, affected_systems)
      VALUES ($1, $2, $3, 'P1', 'ACTIVE', NOW() - INTERVAL '30 minutes', 'https://meet.agora.io/vaic-incident-demo', ARRAY['checkout-api', 'payment-gateway', 'stripe-webhook'])
      ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title;
    `, [incidentId, orgId, 'P1 - Checkout API Latency Spike & Payment Gateway Failure']);

    // Insert Facts
    await client.query(`
      INSERT INTO facts (id, incident_id, content, status)
      VALUES 
        ('00000000-0000-0000-0000-000000000101', $1, 'Payment gateway P99 latency spiked to 8.4s at 14:32 UTC, baseline is 180ms.', 'CONFIRMED'),
        ('00000000-0000-0000-0000-000000000102', $1, 'Stripe webhook queue depth is at 14,200 — 47x above normal threshold.', 'CONFIRMED'),
        ('00000000-0000-0000-0000-000000000103', $1, 'Deployment of checkout-api v2.4.1 completed at 14:28 UTC (4 mins prior to spike).', 'CONFIRMED')
      ON CONFLICT (id) DO NOTHING;
    `, [incidentId]);

    // Insert Hypotheses
    await client.query(`
      INSERT INTO hypotheses (id, incident_id, content, status)
      VALUES 
        ('00000000-0000-0000-0000-000000000201', $1, 'The v2.4.1 release added a synchronous Stripe webhook signature check that is blocking the Express event loop.', 'PENDING'),
        ('00000000-0000-0000-0000-000000000202', $1, 'Database connection pool exhaustion in checkout-api due to unclosed PostgreSQL client connections.', 'PENDING')
      ON CONFLICT (id) DO NOTHING;
    `, [incidentId]);

    // Insert Decisions
    await client.query(`
      INSERT INTO decisions (id, incident_id, content)
      VALUES 
        ('00000000-0000-0000-0000-000000000301', $1, 'Roll back checkout-api to v2.3.9 immediately across all production pods.')
      ON CONFLICT (id) DO NOTHING;
    `, [incidentId]);

    // Insert Action Items
    await client.query(`
      INSERT INTO action_items (id, incident_id, content, status)
      VALUES 
        ('00000000-0000-0000-0000-000000000401', $1, 'Trigger production rollback pipeline to checkout-api v2.3.9', 'IN_PROGRESS'),
        ('00000000-0000-0000-0000-000000000402', $1, 'Take thread dump from failing checkout-api pods before termination', 'PENDING'),
        ('00000000-0000-0000-0000-000000000403', $1, 'Notify Support and post customer update on status page', 'PENDING')
      ON CONFLICT (id) DO NOTHING;
    `, [incidentId]);

    // Insert Questions
    await client.query(`
      INSERT INTO questions (id, incident_id, content, status)
      VALUES
        ('00000000-0000-0000-0000-000000000501', $1, 'Were the DB connection pool settings changed in v2.4.1?', 'PENDING'),
        ('00000000-0000-0000-0000-000000000502', $1, 'Is the Stripe rate limit being hit or is this internal queue depth?', 'PENDING')
      ON CONFLICT (id) DO NOTHING;
    `, [incidentId]);

    console.log('✅ Seed completed successfully! Demo Incident ID: ' + incidentId);
  } catch (err) {
    console.error('❌ Seed error:', err);
  } finally {
    client.release();
    await pool.end();
  }
}

seed();
