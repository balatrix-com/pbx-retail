const { PrismaClient } = require('@prisma/client');
const { Pool } = require('pg');
const prisma = new PrismaClient();
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function check() {
    console.log('--- Checking Extensions ---');
    const exts = await prisma.extension.findMany({ select: { extensionNumber: true, recordingEnabled: true }, take: 5 });
    console.log(exts);
    
    console.log('\n--- Checking Dialplan XML ---');
    const res = await pool.query("SELECT dialplan_id, xml FROM dialplan_xml WHERE xml LIKE '%record_session%' LIMIT 2");
    if (res.rows.length > 0) {
        console.log(`Found ${res.rows.length} dialplans with recording enabled! Example ID: ${res.rows[0].dialplan_id}`);
        console.log(res.rows[0].xml);
    } else {
        console.log('No dialplans found with recording enabled yet.');
    }
    
    process.exit(0);
}
check();
