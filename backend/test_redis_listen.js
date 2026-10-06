const { createClient } = require('redis');

async function main() {
  const client = createClient({
    url: 'redis://localhost:6379',
    password: 'OnidaMaruti1)'
  });
  
  await client.connect();
  
  console.log('Listening to calls_stream...');
  
  const sub = client.duplicate();
  await sub.connect();
  
  await sub.subscribe('calls_stream', (message) => {
    console.log('Received payload:', message);
  });
  
  // Keep alive for 15s to catch any calls
  setTimeout(async () => {
    console.log('Done listening');
    await sub.disconnect();
    await client.disconnect();
  }, 15000);
}

main().catch(console.error);
