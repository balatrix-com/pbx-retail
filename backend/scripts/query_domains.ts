import { Client } from 'pg';
import * as fs from 'fs';
import * as path from 'path';

// Parse .env manually to avoid extra dependencies
function loadEnv() {
    const envPath = path.resolve(__dirname, '../.env');
    if (fs.existsSync(envPath)) {
        const content = fs.readFileSync(envPath, 'utf-8');
        content.split('\n').forEach(line => {
            const trimmed = line.trim();
            if (trimmed && !trimmed.startsWith('#')) {
                const parts = trimmed.split('=');
                const key = parts[0].trim();
                let value = parts.slice(1).join('=').trim();
                // strip quotes if present
                if (value.startsWith('"') && value.endsWith('"')) {
                    value = value.substring(1, value.length - 1);
                } else if (value.startsWith("'") && value.endsWith("'")) {
                    value = value.substring(1, value.length - 1);
                }
                process.env[key] = value;
            }
        });
    }
}

async function main() {
    loadEnv();
    
    const client = new Client({
        host: process.env.FS_DB_HOST || '10.30.0.61',
        port: parseInt(process.env.FS_DB_PORT || '5432', 10),
        database: process.env.KAMAILIO_DB_NAME || 'kamailio',
        user: process.env.FS_DB_USER || 'freeswitch',
        password: process.env.FS_DB_PASSWORD || 'OnidaMaruti1)',
        connectionTimeoutMillis: 5000,
    });

    try {
        await client.connect();
        
        const res = await client.query('SELECT DISTINCT domain FROM subscriber');
        console.log('--- UNIQUE DOMAINS IN SUBSCRIBER TABLE ---');
        console.log(res.rows);
        
        const countRes = await client.query('SELECT domain, COUNT(*) FROM subscriber GROUP BY domain');
        console.log('\n--- DOMAIN COUNTS ---');
        console.log(countRes.rows);

        const sampleRes = await client.query('SELECT username, domain FROM subscriber LIMIT 20');
        console.log('\n--- SAMPLE SUBSCRIBERS (UP TO 20) ---');
        console.log(sampleRes.rows);
    } catch (err) {
        console.error('Error executing query:', err);
    } finally {
        await client.end();
    }
}

main().catch(console.error);
