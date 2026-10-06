const { createClient } = require('redis');

async function main() {
  const client = createClient({
    url: 'redis://localhost:6379',
    password: 'OnidaMaruti1)'
  });
  
  await client.connect();
  
  const payload = {
    uuid: 'test-uuid-123',
    b_uuid: 'test-b-uuid-456',
    caller: '+18005551234',
    callee: '1001',
    call_status: 'ringing',
    dest_type: 'extension',
    dest_value: '1001',
    direction: 'inbound',
    start_ts: Date.now().toString(),
    customer_id: '1001'
  };
  
  await client.publish('calls_stream', JSON.stringify(payload));
  console.log('Published test message to calls_stream');
  
  await client.disconnect();
}

main().catch(console.error);
