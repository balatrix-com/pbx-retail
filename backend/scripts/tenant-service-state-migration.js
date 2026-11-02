const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL, connectionTimeoutMillis: 10000 });

(async () => {
    if (!process.argv.includes('--apply')) {
        const r = await pool.query('SELECT count(*)::int AS tenants FROM tenants WHERE "customerCode" IS NOT NULL');
        console.log(`Preflight: ${r.rows[0].tenants} tenants will receive service-state snapshots. Use --apply to install.`);
        return;
    }
    await pool.query(fs.readFileSync(path.join(__dirname, '..', 'prisma', 'tenant_service_state.sql'), 'utf8'));
    console.log('Tenant service state table, triggers and initial snapshots installed.');
})().catch(error => { console.error(error.message); process.exitCode = 1; }).finally(() => pool.end());
