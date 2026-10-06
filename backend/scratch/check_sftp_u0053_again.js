const SftpClient = require('ssh2-sftp-client');

async function check() {
    const sftp = new SftpClient();
    try {
        await sftp.connect({
            host: 'localhost',
            port: 22,
            username: 'soxuser',
            password: 'soxuser'
        });
        
        const path = '/opt/ivr_audio/U0053/recordings';
        
        const files = await sftp.list(path);
        console.log(`Found ${files.length} items in ${path}.`);
        for(const f of files) {
            console.log(f.name, f.size);
        }
    } catch (err) {
        console.error('Error connecting to SFTP:', err.message);
    } finally {
        await sftp.end();
        process.exit(0);
    }
}
check();
