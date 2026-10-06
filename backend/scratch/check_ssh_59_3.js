const { Client } = require('ssh2');
const conn = new Client();
conn.on('ready', () => {
  conn.exec('ls -la /opt/ivr_audio/U0053/recordings', (err, stream) => {
    if (err) throw err;
    stream.on('close', () => conn.end()).on('data', (d) => console.log('STDOUT: ' + d));
  });
}).connect({ host: 'localhost', port: 22, username: 'root', password: 'OnidaMaruti1)' });
