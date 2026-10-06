import { Injectable, Logger } from '@nestjs/common';
import { Client } from 'pg';

/**
 * FreeSWITCH Database Service
 * 
 * Manages connection to remote FreeSWITCH PostgreSQL database (localhost).
 * Uses on-demand Client connections to avoid slot exhaustion.
 */
@Injectable()
export class FreeSwitchDBService {
    private readonly logger = new Logger(FreeSwitchDBService.name);

    private getClient(): Client {
        return new Client({
            host: process.env.FS_DB_HOST,
            port: parseInt(process.env.FS_DB_PORT || '5432', 10),
            database: process.env.FS_DB_NAME,
            user: process.env.FS_DB_USER,
            password: process.env.FS_DB_PASSWORD,
            connectionTimeoutMillis: 5000,
        });
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
     * Helper to execute a query and return rows (if needed)
     */
    private async executeQueryWithResult(text: string, params: any[] = []): Promise<any> {
        const client = this.getClient();
        try {
            await client.connect();
            return await client.query(text, params);
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
   * Sync dialplan XML to FreeSWITCH DB
   * Upserts into dialplan_xml table
   */
    async syncDialplan(dialplanId: string, xmlContent: string): Promise<void> {
        const query = `
      INSERT INTO dialplan_xml (dialplan_id, xml_content, updated_at)
      VALUES ($1, $2, NOW())
      ON CONFLICT (dialplan_id)
      DO UPDATE SET 
        xml_content = EXCLUDED.xml_content,
        updated_at = NOW()
    `;

        try {
            await this.executeQuery(query, [dialplanId, xmlContent]);
            this.logger.log(`Synced dialplan XML for: ${dialplanId}`);
        } catch (error) {
            this.logger.error(`Failed to sync dialplan for ${dialplanId}:`, error);
            throw error;
        }
    }

    /**
     * Sync DID routing info to FreeSWITCH DB
     * Upserts into did_routes table for fast lookup
     */
    async syncDIDRoute(
        didNumber: string,
        customerId: string,
        targetKey: string,
    ): Promise<void> {
        const query = `
      INSERT INTO did_routes (did, customer_id, target_key, updated_at)
      VALUES ($1, $2, $3, NOW())
      ON CONFLICT (did)
      DO UPDATE SET
        customer_id = EXCLUDED.customer_id,
        target_key = EXCLUDED.target_key,
        updated_at = NOW()
    `;

        try {
            await this.executeQuery(query, [didNumber, customerId, targetKey]);
            this.logger.log(`Synced DID route for ${didNumber}: customer ${customerId} -> ${targetKey}`);
        } catch (error) {
            this.logger.error(`Error checking FreeSWITCH DB (did_routes): ${error.message}`);
            throw error;
        }
    }

    /**
     * Upsert dialplan XML to FreeSWITCH database
     */
    async upsertDialplan(dialplanId: string, dialplanXML: string): Promise<void> {
        try {
            const query = `
                INSERT INTO dialplan_xml (dialplan_id, xml_content, updated_at)
                VALUES ($1, $2, NOW())
                ON CONFLICT (dialplan_id)
                DO UPDATE SET
                    xml_content = EXCLUDED.xml_content,
                    updated_at = NOW()
            `;

            await this.executeQuery(query, [dialplanId, dialplanXML]);
            this.logger.log(`Upserted dialplan for: ${dialplanId}`);
        } catch (error) {
            this.logger.error(`Failed to upsert dialplan: ${error.message}`);
            throw error;
        }
    }

    /**
     * Delete dialplan from FreeSWITCH database  
     */
    async deleteDialplan(didNumber: string): Promise<void> {
        try {
            const query = 'DELETE FROM dialplan_xml WHERE dialplan_id = $1';
            await this.executeQuery(query, [didNumber]);
            this.logger.log(`Deleted dialplan for DID: ${didNumber}`);
        } catch (error) {
            this.logger.error(`Failed to delete dialplan: ${error.message}`);
            throw error;
        }
    }

    /**
     * Delete dialplan by pattern (e.g. for IVR and its submenus)
     */
    async deleteDialplanPattern(pattern: string): Promise<void> {
        try {
            const query = 'DELETE FROM dialplan_xml WHERE dialplan_id LIKE $1';
            await this.executeQuery(query, [`${pattern}%`]);
            this.logger.log(`Deleted dialplans matching pattern: ${pattern}%`);
        } catch (error) {
            this.logger.error(`Failed to delete dialplan pattern ${pattern}: ${error.message}`);
            throw error;
        }
    }

    /**
   * Remove DID from FreeSWITCH DB
   * Deletes from both dialplan_xml and did_routes tables
   */
    async removeDID(dialplanId: string, didNumber: string): Promise<void> {
        try {
            const client = this.getClient();
            try {
                await client.connect();
                await client.query('DELETE FROM dialplan_xml WHERE dialplan_id = $1', [dialplanId]);
                await client.query('DELETE FROM did_routes WHERE did = $1', [didNumber]);
            } finally {
                await client.end();
            }
            this.logger.log(`Removed DID ${didNumber} (${dialplanId}) from FreeSWITCH DB`);
        } catch (error) {
            this.logger.error(`Failed to remove DID ${didNumber} (${dialplanId}):`, error);
            throw error;
        }
    }

    /**
     * Delete all routes for a specific customer
     */
    async deleteRoutesByCustomer(customerId: string): Promise<void> {
        try {
            const query = 'DELETE FROM did_routes WHERE customer_id = $1';
            await this.executeQuery(query, [customerId]);
            this.logger.log(`Deleted all routes for customer: ${customerId}`);
        } catch (error) {
            this.logger.error(`Failed to delete routes for customer ${customerId}:`, error.message);
            throw error;
        }
    }

    /**
     * Delete all dialplans for a specific customer code using pattern matching
     * Matches patterns: %_{customerCode}
     */
    async deleteDialplansByCustomer(customerCode: string): Promise<void> {
        try {
            const query = 'DELETE FROM dialplan_xml WHERE dialplan_id LIKE $1';
            const pattern = `%_${customerCode}`;
            await this.executeQuery(query, [pattern]);
            this.logger.log(`Deleted all dialplan XMLs for customer code: ${customerCode}`);
        } catch (error) {
            this.logger.error(`Failed to delete dialplans for customer code ${customerCode}:`, error.message);
            throw error;
        }
    }

    /**
     * Test database connectivity
     * Returns true if connection successful
     */
    async testConnection(): Promise<boolean> {
        try {
            await this.executeQuery('SELECT NOW()');
            this.logger.log('FreeSWITCH DB connection test successful');
            return true;
        } catch (error) {
            this.logger.error('FreeSWITCH DB connection test failed:', error);
            return false;
        }
    }

    /**
     * Generate dialplan_id for FreeSWITCH DB
     * Format matches existing pattern: <route_type><customer_id>_<target>
     * 
     * Examples:
     *  - ivr1_1001 (IVR for customer 1, DID 1001)
     *  - ext3_1002 (Extension for customer 3, DID 1002)
     *  - ring2_5001 (Ring group for customer 2, DID 5001)
     */
    generateDialplanId(routeType: string, customerId: string, target: string): string {
        // Route type prefixes: ivr, ext, ring, fwd, sched
        const prefix = routeType.substring(0, Math.min(routeType.length, 4));
        return `${prefix}${customerId}_${target}`;
    }
}
