const { Client } = require('ssh2');
const conn = new Client();
conn.on('ready', () => {
  conn.exec('chown -R freeswitch:freeswitch /opt/ivr_audio/U0053 && chmod -R 777 /opt/ivr_audio/U0053', (err, stream) => {
    if (err) throw err;
    stream.on('close', () => conn.end()).on('data', (d) => console.log('STDOUT: ' + d)).stderr.on('data', (d) => console.log('STDERR: ' + d));
  });
}).connect({ host: 'localhost', port: 22, username: 'root', password: 'OnidaMaruti1)' });
