const redis = require('redis');

async function debug() {
    const client = redis.createClient({
        url: 'redis://:OnidaMaruti1)@localhost:6379'
    });

    client.on('error', (err) => console.log('Redis Client Error', err));

    await client.connect();
    console.log('Connected to Redis');

    const tenantId = 'fd1b7b44-b06f-475a-99df-9f4ef0bc1e17';
    const pattern = `*${tenantId}*`;

    console.log(`Searching for keys: ${pattern}`);
    const keys = await client.keys(pattern);
    console.log(`Found ${keys.length} keys`);

    let activeCount = 0;
    for (const key of keys) {
        const data = await client.hGetAll(key);
        const status = data.call_status;
        const hangupTs = data.hangup_ts;

        if (['new', 'ringing', 'answered'].includes(status) && !hangupTs) {
            console.log(`ACTIVE CALL FOUND: ${key}`);
            console.log('Tenant:', data.customer_id);
            console.log('Caller:', data.caller);
            console.log('Callee:', data.callee);
            console.log('Status:', status);
            console.log('---');
            activeCount++;
        }
    }
    console.log(`Total Active Calls: ${activeCount}`);

    // Also check active_calls set if used
    // const activeSet = await client.sMembers('active_calls');
    // console.log('Active Calls Set:', activeSet);

    // Subscribe
    const subscriber = client.duplicate();
    await subscriber.connect();

    console.log('Subscribing to calls_stream...');
    await subscriber.subscribe('calls_stream', (message) => {
        console.log('Received message:', message);
        /*
        try {
            const data = JSON.parse(message);
            console.log('Parsed Tenant ID:', data.customer_id);
            console.log('Matches target?', data.customer_id === tenantId);
        } catch (e) {
            console.error('Parse error', e);
        }
        */
    });
}

debug();
