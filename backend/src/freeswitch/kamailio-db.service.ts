import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Client } from 'pg';
import * as crypto from 'crypto';

/**
 * Kamailio Database Service
 * 
 * Manages connection to Kamailio PostgreSQL database.
 * Uses on-demand Client connections to avoid slot exhaustion.
 */
@Injectable()
export class KamailioDBService {
    private readonly logger = new Logger(KamailioDBService.name);
    private readonly realm = process.env.SIP_REALM;

    constructor(private readonly configService?: ConfigService) {}

    private getClient(): Client {
        return new Client({
            host: process.env.FS_DB_HOST,
            port: parseInt(process.env.FS_DB_PORT || '5432', 10),
            database: process.env.KAMAILIO_DB_NAME || 'kamailio',
            user: process.env.FS_DB_USER,
            password: process.env.FS_DB_PASSWORD,
            connectionTimeoutMillis: 5000,
        });
    }

    private async callKamailioRpc(method: string, params: any[] = []): Promise<void> {
        const rpcUrl = this.configService?.get<string>('kamailio.rpcUrl') || process.env.KAMAILIO_RPC_URL || `http://${process.env.FS_DB_HOST || '10.30.0.61'}:8080/rpc`;
        try {
            const response = await fetch(rpcUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    jsonrpc: '2.0',
                    method,
                    id: 1,
                    params
                })
            });
            const data = await response.json();
            if (data.error) {
                this.logger.error(`Kamailio RPC Error [${method}]:`, data.error);
            } else {
                this.logger.log(`Kamailio RPC Success [${method}]`);
            }
        } catch (error) {
            this.logger.error(`Kamailio RPC Request Failed [${method}]:`, error);
        }
    }

    /**
     * Helper to execute a query with a short-lived connection
     */
    private async executeQuery(text: string, params: any[] = []): Promise<void> {
        const client = this.getClient();
        try {
            await client.connect();
            await client.query(text, params);
        } catch (error) {
            throw error;
        } finally {
            try {
                await client.end();
            } catch (e) {
                // Ignore end errors
            }
        }
    }

    /**
     * Helper to execute multiple queries in a transaction with a short-lived connection
     */
    private async executeQueries(queries: { text: string; params: any[] }[]): Promise<void> {
        const client = this.getClient();
        try {
            await client.connect();
            await client.query('BEGIN');
            for (const q of queries) {
                await client.query(q.text, q.params);
            }
            await client.query('COMMIT');
        } catch (error) {
            try {
                await client.query('ROLLBACK');
            } catch (rollbackError) {
                // Ignore rollback errors
            }
            throw error;
        } finally {
            try {
                await client.end();
            } catch (e) {
                // Ignore end errors
            }
        }
    }

    /**
     * Sync Subscriber to Kamailio
     * Calculates HA1/HA1B and upserts into subscriber table
     */
    async syncSubscriber(username: string, passwordPlain: string): Promise<void> {
        if (!this.realm) {
            this.logger.error('Cannot sync subscriber: SIP_REALM is not defined in environment variables.');
            return;
        }

        // Calculate HA1: MD5(username:realm:password)
        const ha1 = crypto.createHash('md5')
            .update(`${username}:${this.realm}:${passwordPlain}`)
            .digest('hex');

        // HA1B is typically same as HA1 for simple auth schemes
        const ha1b = ha1;

        const query = `
            INSERT INTO subscriber (username, domain, password, ha1, ha1b)
            VALUES ($1, $2, $3, $4, $5)
            ON CONFLICT (username, domain)
            DO UPDATE SET
                password = EXCLUDED.password,
                ha1 = EXCLUDED.ha1,
                ha1b = EXCLUDED.ha1b
        `;

        try {
            await this.executeQuery(query, [username, this.realm, passwordPlain, ha1, ha1b]);
            this.logger.log(`Synced Kamailio subscriber: ${username}@${this.realm}`);
        } catch (error) {
            this.logger.error(`Failed to sync Kamailio subscriber ${username}:`, error);
        }
    }

    /**
     * Delete Subscriber from Kamailio
     */
    async deleteSubscriber(username: string): Promise<void> {
        if (!this.realm) {
            this.logger.error('Cannot delete subscriber: SIP_REALM is not defined in environment variables.');
            return;
        }

        try {
            await this.executeQuery('DELETE FROM subscriber WHERE username = $1 AND domain = $2', [username, this.realm]);
            this.logger.log(`Deleted Kamailio subscriber: ${username}@${this.realm}`);
        } catch (error) {
            this.logger.error(`Failed to delete Kamailio subscriber ${username}:`, error);
        }
    }

    /**
     * Add Carrier IP to Kamailio address table
     */
    async addCarrierIP(ip: string, port: number, tag: string): Promise<void> {
        try {
            await this.executeQueries([
                { text: 'DELETE FROM address WHERE ip_addr = $1 AND port = $2', params: [ip, port] },
                { text: 'INSERT INTO address (grp, ip_addr, mask, port, tag) VALUES ($1, $2, $3, $4, $5)', params: [1, ip, 32, port, tag] }
            ]);
            this.logger.log(`Added Carrier IP to Kamailio: ${ip}:${port} (${tag})`);
            await this.callKamailioRpc('permissions.addressReload');
        } catch (error) {
            this.logger.error(`Failed to add Carrier IP ${ip}:${port}:`, error);
        }
    }

    /**
     * Remove Carrier IP from Kamailio address table
     */
    async removeCarrierIP(ip: string, port: number): Promise<void> {
        const query = `DELETE FROM address WHERE ip_addr = $1 AND port = $2`;
        try {
            await this.executeQuery(query, [ip, port]);
            this.logger.log(`Removed Carrier IP from Kamailio: ${ip}:${port}`);
            await this.callKamailioRpc('permissions.addressReload');
        } catch (error) {
            this.logger.error(`Failed to remove Carrier IP ${ip}:${port}:`, error);
        }
    }

    /**
     * Add Inbound Carrier IP to Kamailio address table
     */
    async addInboundIP(ip: string, port: number, tag: string): Promise<void> {
        try {
            await this.executeQueries([
                { text: 'DELETE FROM address WHERE ip_addr = $1 AND port = $2', params: [ip, port] },
                { text: 'INSERT INTO address (grp, ip_addr, mask, port, tag) VALUES ($1, $2, $3, $4, $5)', params: [1, ip, 32, port, tag] }
            ]);
            this.logger.log(`Added Inbound IP to Kamailio: ${ip}:${port} (${tag})`);
            await this.callKamailioRpc('permissions.addressReload');
        } catch (error) {
            this.logger.error(`Failed to add Inbound IP ${ip}:${port}:`, error);
        }
    }

    /**
     * Remove Inbound Carrier IP from Kamailio address table
     */
    async removeInboundIP(ip: string, port: number): Promise<void> {
        const query = `DELETE FROM address WHERE ip_addr = $1 AND port = $2`;
        try {
            await this.executeQuery(query, [ip, port]);
            this.logger.log(`Removed Inbound IP from Kamailio: ${ip}:${port}`);
            await this.callKamailioRpc('permissions.addressReload');
        } catch (error) {
            this.logger.error(`Failed to remove Inbound IP ${ip}:${port}:`, error);
        }
    }
}
