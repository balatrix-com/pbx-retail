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
        console.log(`Checking path: ${path}...`);
        
        const exists = await sftp.exists(path);
        if (!exists) {
            console.log(`The directory ${path} does not exist yet.`);
            return;
        }
        
        console.log(`The directory ${path} EXISTS!`);

        const files = await sftp.list(path);
        console.log(`Found ${files.length} items in ${path}.`);
        
    } catch (err) {
        console.error('Error connecting to SFTP:', err.message);
    } finally {
        await sftp.end();
        process.exit(0);
    }
}

check();
