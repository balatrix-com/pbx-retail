const { Client } = require('ssh2');

const conn = new Client();
conn.on('ready', () => {
  conn.exec('mkdir -p /opt/ivr_audio/U0053/recordings && ls -la /opt/ivr_audio/U0053/recordings', (err, stream) => {
    if (err) throw err;
    stream.on('close', (code, signal) => {
      conn.end();
    }).on('data', (data) => {
      console.log('STDOUT: ' + data);
    }).stderr.on('data', (data) => {
      console.log('STDERR: ' + data);
    });
  });
}).connect({
  host: 'localhost',
  port: 22,
  username: 'root',
  password: 'OnidaMaruti1)'
});
