const { Client } = require('ssh2');

const conn = new Client();
conn.on('ready', () => {
  console.log('Client :: ready');
  conn.exec('ls -la /opt/ivr_audio/U0053/recordings', (err, stream) => {
    if (err) throw err;
    stream.on('close', (code, signal) => {
      console.log('Stream :: close :: code: ' + code + ', signal: ' + signal);
      conn.end();
    }).on('data', (data) => {
      console.log('STDOUT: ' + data);
    }).stderr.on('data', (data) => {
      console.log('STDERR: ' + data);
    });
  });
}).on('error', (err) => {
  console.log('Connection error:', err.message);
}).connect({
  host: 'localhost',
  port: 22,
  username: 'root', // Just guessing, or freeswitch
  password: 'OnidaMaruti1)' // Maybe same pass?
});
