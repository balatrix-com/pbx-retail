// All mutations use this single connection and outer transaction. No workers run.
const { Client } = require('pg');
const { randomUUID } = require('crypto');
const assert = require('node:assert/strict');
require('dotenv').config({path:require('path').join(__dirname,'..','.env')});
const client = new Client({connectionString:process.env.DATABASE_URL,connectionTimeoutMillis:10000});
(async()=>{
  await client.connect();
  await client.query('BEGIN');
  const id=`TEST-${randomUUID()}`,user=randomUUID(),email=`${randomUUID()}@example.invalid`,code=`TEST-${randomUUID()}`;
  await client.query('INSERT INTO tenants(id,name,"customerCode","updatedAt") VALUES($1,$2,$3,now())',[id,'Rollback archive storage',code]);
  await client.query('INSERT INTO users(id,email,password,role,status,"tenantId","updatedAt") VALUES($1,$2,$3,\'ADMIN\',\'ACTIVE\',$4,now())',[user,email,'fixture-only',id]);
  await client.query('INSERT INTO usage_records(id,"tenantId",minutes,cost) VALUES($1,$2,10,1)',[randomUUID(),id]);
  await client.query('INSERT INTO tenant_archive_jobs(tenant_id,actor_id) VALUES($1,$2)',[id,'test']);
  await client.query('UPDATE tenants SET "serviceBlocked"=true,status=\'SUSPENDED\' WHERE id=$1',[id]);
  // A stale unblock must not bypass a pending archive.
  await client.query('UPDATE tenants SET "serviceBlocked"=false WHERE id=$1',[id]);
  assert.equal((await client.query('SELECT "serviceBlocked" FROM tenants WHERE id=$1',[id])).rows[0].serviceBlocked,true);
  await client.query('UPDATE users SET email=$2,password=NULL,"refreshToken"=NULL,status=\'DELETED\' WHERE id=$1',[user,`archived-${user}@archived.invalid`]);
  await client.query('UPDATE tenants SET status=\'ARCHIVED\',"serviceBlocked"=true WHERE id=$1',[id]);
  const tenant=(await client.query('SELECT status,"customerCode" FROM tenants WHERE id=$1',[id])).rows[0];
  assert.equal(tenant.status,'ARCHIVED');assert.equal(tenant.customerCode,code);
  assert.equal((await client.query('SELECT count(*)::int AS n FROM usage_records WHERE "tenantId"=$1',[id])).rows[0].n,1);
  await client.query('INSERT INTO users(id,email,role,status,"updatedAt") VALUES($1,$2,\'ADMIN\',\'ACTIVE\',now())',[randomUUID(),email]);
  const state=(await client.query('SELECT state FROM tenant_service_state_events WHERE customer_code=$1 ORDER BY version DESC LIMIT 1',[code])).rows[0];
  assert.equal(state.state,'ARCHIVED');
  await client.query('SAVEPOINT invalid_restore');
  await assert.rejects(client.query('UPDATE tenants SET status=\'ACTIVE\',"serviceBlocked"=false WHERE id=$1',[id]),/cannot be restored/);
  await client.query('ROLLBACK TO SAVEPOINT invalid_restore');
  await client.query('SAVEPOINT invalid_identity');
  await assert.rejects(client.query('UPDATE tenants SET "customerCode"=NULL WHERE id=$1',[id]),/immutable/);
  await client.query('ROLLBACK TO SAVEPOINT invalid_identity');
  console.log('PASS: archive storage retains identity/usage, releases login email, emits ARCHIVED state, blocks stale unblock and identity changes. One connection; all fixtures rolled back.');
})().catch(error=>{console.error(error.message);process.exitCode=1;}).finally(async()=>{
  try{await client.query('ROLLBACK');}finally{await client.end();}
});
