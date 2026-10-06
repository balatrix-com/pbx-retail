const { createClient } = require('redis');

async function checkRedisStream() {
  const client = createClient({
    url: 'redis://localhost:6379',
    password: 'OnidaMaruti1)'
  });
  
  await client.connect();
  
  console.log('Reading all messages from calls_stream...');
  const messages = await client.xRange('calls_stream', '-', '+');
  
  const uuidToFind = '510b8f80-70b5-4a71-b8e3-c816459bd21b';
  let found = false;
  
  for (const msg of messages) {
    const dataStr = msg.message.data;
    if (dataStr && dataStr.includes(uuidToFind)) {
      console.log('Found message!', dataStr);
      found = true;
    }
  }
  
  if (!found) {
    console.log('Message not found in stream. Total messages checked:', messages.length);
  }
  
  await client.disconnect();
}

checkRedisStream().catch(console.error);
