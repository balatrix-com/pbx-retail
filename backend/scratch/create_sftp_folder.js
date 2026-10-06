const SftpClient = require('ssh2-sftp-client');

async function create() {
    const sftp = new SftpClient();
    try {
        await sftp.connect({
            host: 'localhost',
            port: 22,
            username: 'soxuser',
            password: 'soxuser'
        });
        
        await sftp.mkdir('/opt/ivr_audio/U0002', true);
        await sftp.mkdir('/opt/ivr_audio/U0002/recordings', true);
        console.log('Created /opt/ivr_audio/U0002/recordings successfully!');
        
    } catch (err) {
        console.error('Error:', err.message);
    } finally {
        await sftp.end();
        process.exit(0);
    }
}
create();
