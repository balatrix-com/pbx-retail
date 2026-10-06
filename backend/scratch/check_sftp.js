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
        
        const path = '/opt/ivr_audio/U0002/recordings';
        console.log(`Checking path: ${path}...`);
        
        const exists = await sftp.exists(path);
        if (!exists) {
            console.log(`The directory ${path} does not exist yet.`);
            return;
        }

        const files = await sftp.list(path);
        console.log(`\nFound ${files.length} items in ${path}:`);
        
        // Print the most recent 5 files
        const sortedFiles = files.sort((a, b) => b.modifyTime - a.modifyTime).slice(0, 5);
        for (const file of sortedFiles) {
            console.log(`- ${file.name} (${(file.size / 1024).toFixed(2)} KB) - Modified: ${new Date(file.modifyTime).toLocaleString()}`);
        }
        
    } catch (err) {
        console.error('Error connecting to SFTP:', err.message);
    } finally {
        await sftp.end();
        process.exit(0);
    }
}

check();
