const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { Pool } = require('pg');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '../.env') });

async function runMigrations() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error('DATABASE_URL is not set in .env');
    process.exit(1);
  }

  const pool = new Pool({ connectionString });
  const client = await pool.connect();

  try {
    const isStatusOnly = process.argv.includes('--status') || process.argv.includes('--check');

    // 1. Ensure _prisma_migrations table exists
    await client.query(`
      CREATE TABLE IF NOT EXISTS _prisma_migrations (
        id VARCHAR(36) PRIMARY KEY,
        checksum VARCHAR(64) NOT NULL,
        finished_at TIMESTAMPTZ,
        migration_name VARCHAR(255) NOT NULL,
        logs TEXT,
        rolled_back_at TIMESTAMPTZ,
        started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        applied_steps_count INTEGER NOT NULL DEFAULT 0
      );
    `);

    // 2. Fetch applied migrations
    const appliedRes = await client.query(`
      SELECT migration_name, finished_at, started_at 
      FROM _prisma_migrations 
      WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL
      ORDER BY started_at ASC;
    `);
    const appliedMap = new Map(appliedRes.rows.map(r => [r.migration_name, r]));

    // 3. Discover local migrations
    const migrationsDir = path.join(__dirname, '../prisma/migrations');
    const entries = fs.readdirSync(migrationsDir, { withFileTypes: true });
    const localMigrations = entries
      .filter(e => e.isDirectory() && fs.existsSync(path.join(migrationsDir, e.name, 'migration.sql')))
      .map(e => e.name)
      .sort();

    const pendingMigrations = localMigrations.filter(m => !appliedMap.has(m));
    const appliedCount = localMigrations.length - pendingMigrations.length;

    // Resolve host/db from connection string
    let host = 'localhost', dbName = 'subtest';
    try {
      const parsedUrl = new URL(connectionString.replace('postgresql://', 'http://'));
      host = parsedUrl.hostname;
      dbName = parsedUrl.pathname.replace('/', '').split('?')[0];
    } catch (_) {}

    console.log('================================================================');
    console.log('DATABASE MIGRATION RUNNER (PBX Retail)');
    console.log(`Target Database: ${dbName} @ ${host}`);
    console.log(`Total Local Migrations Discovered: ${localMigrations.length}`);
    console.log(`Total Already Applied:             ${appliedCount}`);
    console.log(`Pending Migrations Left:           ${pendingMigrations.length}`);
    console.log('================================================================');

    if (isStatusOnly) {
      console.log('\nMIGRATION STATUS:');
      localMigrations.forEach(m => {
        if (appliedMap.has(m)) {
          const info = appliedMap.get(m);
          const dateStr = info.finished_at ? new Date(info.finished_at).toISOString() : 'previously';
          console.log(`  [APPLIED]  ${m.padEnd(55)} (applied ${dateStr})`);
        } else {
          console.log(`  [PENDING]  ${m.padEnd(55)} ⚠️ Needs migration`);
        }
      });

      console.log('----------------------------------------------------------------');
      if (pendingMigrations.length === 0) {
        console.log('✓ All migrations are up to date. No pending migrations left.\n');
      } else {
        console.log(`⚠️ ${pendingMigrations.length} migration(s) left which need to be migrated.\n`);
      }
      return;
    }

    if (pendingMigrations.length === 0) {
      console.log('\n✓ Database schema is up to date. No pending migrations left to apply.\n');
      return;
    }

    console.log(`\n⚠️ Found ${pendingMigrations.length} migration(s) left that need to be migrated:`);
    pendingMigrations.forEach((m, idx) => {
      console.log(`  ${idx + 1}. ${m}`);
    });
    console.log('\nStarting migration application...\n');

    let newlyAppliedCount = 0;

    for (const migration of pendingMigrations) {
      console.log(`[APPLYING] ${migration}...`);
      const sqlFile = path.join(migrationsDir, migration, 'migration.sql');
      const sql = fs.readFileSync(sqlFile, 'utf8');
      const checksum = crypto.createHash('sha256').update(sql).digest('hex');
      const migrationId = crypto.randomUUID();
      const startTime = new Date();

      await client.query('BEGIN');
      try {
        await client.query(sql);

        await client.query(`
          INSERT INTO _prisma_migrations (id, checksum, finished_at, migration_name, started_at, applied_steps_count)
          VALUES ($1, $2, now(), $3, $4, 1);
        `, [migrationId, checksum, migration, startTime]);

        await client.query('COMMIT');
        console.log(`[SUCCESS]  ${migration}`);
        newlyAppliedCount++;
      } catch (err) {
        await client.query('ROLLBACK');
        console.error(`\n[FAILED]   Migration ${migration} failed with error:\n${err.message}`);
        console.error('Transaction was rolled back. Halting migrations.\n');
        throw err;
      }
    }

    console.log('================================================================');
    console.log(`✓ Migration run complete!`);
    console.log(`  Newly applied: ${newlyAppliedCount}`);
    console.log(`  Total up to date: ${localMigrations.length} / ${localMigrations.length}`);
    console.log('================================================================\n');

  } catch (err) {
    console.error('Migration process aborted:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

runMigrations();

