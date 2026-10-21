const path = require('path');
require('dotenv').config({path:path.join(__dirname,'..','.env')});
const { Pool } = require('pg');
const assert = require('node:assert/strict');
const pool = new Pool({ connectionString:process.env.DATABASE_URL, max:20, connectionTimeoutMillis:10000 });
(async () => {
  const reserved = await Promise.all(Array.from({length:20}, async () => {
    const c = await pool.connect();
    try { await c.query('BEGIN'); return (await c.query("SELECT reserve_customer_identity('U') AS code")).rows[0].code; }
    finally { await c.query('ROLLBACK'); c.release(); }
  }));
  assert.equal(new Set(reserved).size,20);
  const c=await pool.connect();
  try {
    await c.query('BEGIN');
    const next=(await c.query("SELECT reserve_customer_identity('U') AS code")).rows[0].code;
    assert(Number(next.slice(1))>Math.max(...reserved.map(code=>Number(code.slice(1)))));
    const id=`ROLLBACK-${next}`;
    await c.query('INSERT INTO tenants(id,name,"customerCode","updatedAt") VALUES($1,$2,$3,now())',[id,'Rollback sequence deletion',next]);
    await c.query('DELETE FROM tenants WHERE id=$1',[id]);
    const after=(await c.query("SELECT reserve_customer_identity('U') AS code")).rows[0].code;
    assert(Number(after.slice(1))>Number(next.slice(1)));
    console.log('PASS: 20 concurrent unique IDs, rollback consumes sequence values, deletion never reuses an ID. Fixture rows rolled back; sequence advances intentionally.');
  } finally { await c.query('ROLLBACK'); c.release(); }
})().catch(error=>{console.error(error.message);process.exitCode=1;}).finally(()=>pool.end());
