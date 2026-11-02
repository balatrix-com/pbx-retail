const assert = require('node:assert/strict');
const { randomUUID } = require('crypto');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const { Client } = require('pg');
const { createClient } = require('redis');
const { LookupRedisService } = require('../dist/src/redis/lookup-redis.module');
const client = new Client({ connectionString: process.env.DATABASE_URL, connectionTimeoutMillis: 10000 });
const redis = createClient({ url: `redis://${process.env.REDIS_HOST || 'localhost'}:${process.env.REDIS_PORT || 6379}`,
    password: process.env.REDIS_PASSWORD, database: 2, socket: { connectTimeout: 5000, reconnectStrategy: false } });
redis.on('error', () => {});
let fixtureKey;

(async () => {
    await client.connect();
    await client.query('BEGIN');
    const id = randomUUID();
    const code = `TEST-${id}`;
    fixtureKey = `tenant:service-state:${code}`;
    await redis.connect();
    const lookup = new LookupRedisService(redis, {
        $executeRawUnsafe: (sql, ...params) => client.query(sql, params),
    });
    await client.query('INSERT INTO tenants(id,name,"customerCode","updatedAt") VALUES($1,$2,$3,now())', [id, 'Rollback service-state test', code]);
    const latest = async () => (await client.query('SELECT * FROM tenant_service_state_events WHERE customer_code=$1 ORDER BY version DESC LIMIT 1', [code])).rows[0];
    const active = await latest();
    assert.equal(active.state, 'ACTIVE');
    await lookup.deliverServiceState(active);
    assert.equal(JSON.parse(await redis.get(fixtureKey)).state, 'ACTIVE');
    assert((await redis.ttl(fixtureKey)) > 0);
    await client.query('UPDATE tenants SET "serviceBlocked"=true WHERE id=$1', [id]);
    const blocked = await latest();
    assert.equal(blocked.state, 'BLOCKED');
    assert(BigInt(blocked.version) > BigInt(active.version));
    await lookup.deliverServiceState(blocked);
    assert.equal(JSON.parse(await redis.get(fixtureKey)).state, 'BLOCKED');
    assert.equal(await redis.ttl(fixtureKey), -1);
    await lookup.deliverServiceState(active);
    assert.equal(JSON.parse(await redis.get(fixtureKey)).state, 'BLOCKED');
    await client.query('SAVEPOINT failed_change');
    await client.query('UPDATE tenants SET "serviceBlocked"=false WHERE id=$1', [id]);
    await client.query('ROLLBACK TO SAVEPOINT failed_change');
    assert.equal((await latest()).state, 'BLOCKED');
    await client.query('UPDATE tenants SET "serviceBlocked"=false WHERE id=$1', [id]);
    assert.equal((await latest()).state, 'ACTIVE');
    await lookup.deliverServiceState(await latest());
    assert.equal(JSON.parse(await redis.get(fixtureKey)).state, 'ACTIVE');
    await client.query('DELETE FROM tenants WHERE id=$1', [id]);
    assert.equal((await latest()).state, 'ARCHIVED');
    await lookup.deliverServiceState(await latest());
    assert.equal(JSON.parse(await redis.get(fixtureKey)).state, 'ARCHIVED');
    console.log('PASS: durable insert/block/unblock/delete events, increasing versions, atomic rollback, actual Redis TTL and stale-event rejection. Fixtures rolled back.');
})().catch(error => { console.error(error.message); process.exitCode = 1; }).finally(async () => {
    try { await client.query('ROLLBACK'); } finally {
        if (redis.isReady && fixtureKey?.startsWith('tenant:service-state:TEST-')) await redis.del(fixtureKey);
        if (redis.isOpen) await redis.quit();
        await client.end();
    }
});
