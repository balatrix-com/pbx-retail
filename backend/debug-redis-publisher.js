const { createClient } = require('redis');

async function publishTestEvent() {
    const client = createClient({
        url: 'redis://:OnidaMaruti1)@localhost:6379'
    });

    await client.connect();
    console.log('Connected to Redis Publisher');

    const tenantId = 'fd1b7b44-b06f-475a-99df-9f4ef0bc1e17'; // User's tenant
    const uuid = 'test-call-' + Date.now();

    const event1 = {
        uuid: uuid,
        customer_id: tenantId,
        call_status: 'ringing',
        caller: 'Test Caller',
        callee: '1001',
        start_ts: Date.now() / 1000,
        direction: 'inbound'
    };

    const event2 = {
        ...event1,
        call_status: 'answered',
        answer_ts: Date.now() / 1000 + 2
    };

    const event3 = {
        ...event1,
        call_status: 'hangup',
        hangup_ts: Date.now() / 1000 + 10
    };

    console.log('Publishing RINGING event...');
    await client.publish('calls_stream', JSON.stringify(event1));

    setTimeout(async () => {
        console.log('Publishing ANSWERED event...');
        await client.publish('calls_stream', JSON.stringify(event2));
    }, 3000);

    setTimeout(async () => {
        console.log('Publishing HANGUP event...');
        await client.publish('calls_stream', JSON.stringify(event3));
        await client.disconnect();
        console.log('Done.');
    }, 8000);
}

publishTestEvent();
