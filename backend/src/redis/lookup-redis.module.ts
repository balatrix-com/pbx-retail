import { Module, Global, Injectable, Inject, Logger } from '@nestjs/common';
import { createClient } from 'redis';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Injection Token for the Lookup Redis Client
 */
export const LOOKUP_REDIS_CLIENT = 'LOOKUP_REDIS_CLIENT';

@Injectable()
export class LookupRedisService {
    private readonly logger = new Logger(LookupRedisService.name);

    constructor(
        @Inject(LOOKUP_REDIS_CLIENT) private readonly redisClient: any,
        private prisma: PrismaService,
    ) { }

    /**
     * Normalize phone numbers (DIDs/TFNs) to exclude country code.
     * Examples: +18885551212 -> 8885551212, +918888123456 -> 8888123456
     */
    normalizeNumber(num: string): string {
        if (!num) return '';
        let cleaned = num.replace(/\D/g, ''); // Digits only

        // Remove US (1) prefix if length is 11
        if (cleaned.startsWith('1') && cleaned.length === 11) {
            cleaned = cleaned.substring(1);
        }
        // Remove India (91) prefix if length is 12
        else if (cleaned.startsWith('91') && cleaned.length === 12) {
            cleaned = cleaned.substring(2);
        }
        
        return cleaned;
    }

    /**
     * Normalize extensions: digits-only string, keep leading zeros.
     */
    normalizeExtension(ext: string): string {
        if (!ext) return '';
        return ext.replace(/\D/g, '');
    }

    async updateNumberLookup(number: string, tenantId: string) {
        const normalized = this.normalizeNumber(number);
        if (!normalized) return;

        try {
            const tenant = await this.prisma.tenant.findUnique({
                where: { id: tenantId },
                select: { customerCode: true }
            });
            const code = tenant?.customerCode;
            if (!code) return;

            const key = `lookup:v1:number:${normalized}`;
            await this.redisClient.set(key, code);
            this.logger.log(`Updated number lookup: ${key} -> ${code}`);
        } catch (err) {
            this.logger.error(`Failed to update number lookup for ${number}: ${err.message}`);
        }
    }

    async deleteNumberLookup(number: string) {
        const normalized = this.normalizeNumber(number);
        if (!normalized) return;

        const key = `lookup:v1:number:${normalized}`;
        try {
            await this.redisClient.del(key);
            this.logger.log(`Deleted number lookup: ${key}`);
        } catch (err) {
            this.logger.error(`Failed to delete number lookup for ${number}: ${err.message}`);
        }
    }

    /**
     * Update/Create prefix mapping for a tenant's extensions.
     * key: lookup:v1:ext:<customerCode> -> value: <customerCode>
     */
    async updateExtensionLookup(tenantId: string, customerCode?: string) {
        try {
            let code = customerCode;
            if (!code) {
                const tenant = await this.prisma.tenant.findUnique({
                    where: { id: tenantId },
                    select: { customerCode: true }
                });
                code = tenant?.customerCode ?? undefined;
            }

            if (code) {
                const key = `lookup:v1:ext:${code}`;
                await this.redisClient.set(key, code);
                this.logger.log(`Updated extension prefix lookup: ${key} -> ${code}`);
            }
        } catch (err) {
            this.logger.error(`Failed to update extension prefix for tenant ${tenantId}: ${err.message}`);
        }
    }

    async deleteExtensionLookup(extension: string) {
        // Individual extension deletion no longer removes the prefix mapping
        // since multiple extensions share the same prefix.
        // Prefix is only removed when the tenant is deleted.
        this.logger.log(`Extension ${extension} deleted. Prefix lookup maintained.`);
    }

    async deletePrefixLookup(customerCode: string) {
        const key = `lookup:v1:ext:${customerCode}`;
        try {
            await this.redisClient.del(key);
            this.logger.log(`Deleted extension prefix lookup: ${key}`);
        } catch (err) {
            this.logger.error(`Failed to delete extension prefix lookup for ${customerCode}: ${err.message}`);
        }
    }

    async deleteTenantLookups(tenantId: string) {
        try {
            const tenant = await this.prisma.tenant.findUnique({
                where: { id: tenantId },
                include: { dids: true, tfns: true }
            });

            if (!tenant) return;

            const pipeline = this.redisClient.multi();

            for (const did of tenant.dids) {
                const normalized = this.normalizeNumber(did.number);
                if (normalized) pipeline.del(`lookup:v1:number:${normalized}`);
            }

            for (const tfn of tenant.tfns) {
                const normalized = this.normalizeNumber(tfn.number);
                if (normalized) pipeline.del(`lookup:v1:number:${normalized}`);
            }

            if (tenant.customerCode) {
                pipeline.del(`lookup:v1:ext:${tenant.customerCode}`);
            }

            await pipeline.exec();
            this.logger.log(`Deleted all lookups for tenant ${tenantId} (${tenant.customerCode})`);
        } catch (err) {
            this.logger.error(`Failed to delete lookups for tenant ${tenantId}: ${err.message}`);
        }
    }

    /**
     * Bulk synchronization of all Numbers and Extension Prefixes from Postgres to Redis DB 2
     */
    async syncAll() {
        this.logger.log('Starting bulk sync for Redis Lookup DB...');

        const [dids, tfns, tenantsWithExtensions] = await Promise.all([
            this.prisma.dID.findMany({ select: { number: true, tenant: { select: { customerCode: true } } } }),
            this.prisma.tFN.findMany({ select: { number: true, tenant: { select: { customerCode: true } } }, where: { tenantId: { not: null } } }),
            this.prisma.tenant.findMany({
                where: { 
                    extensions: { some: {} },
                    customerCode: { not: null }
                },
                select: { id: true, customerCode: true }
            }),
        ]);

        const pipeline = this.redisClient.multi();

        // 1. Sync DIDs (Number -> CustomerCode)
        for (const did of dids) {
            const normalized = this.normalizeNumber(did.number);
            const code = did.tenant?.customerCode;
            if (normalized && code) {
                pipeline.set(`lookup:v1:number:${normalized}`, code);
            }
        }

        // 2. Sync TFNs (Number -> CustomerCode)
        for (const tfn of tfns) {
            const normalized = this.normalizeNumber(tfn.number);
            const code = tfn.tenant?.customerCode;
            if (normalized && code) {
                pipeline.set(`lookup:v1:number:${normalized}`, code);
            }
        }

        // 3. Sync Extension Prefixes (CustomerCode -> CustomerCode)
        for (const tenant of tenantsWithExtensions) {
            if (tenant.customerCode) {
                pipeline.set(`lookup:v1:ext:${tenant.customerCode}`, tenant.customerCode);
            }
        }

        try {
            await pipeline.exec();
            this.logger.log(`Bulk sync completed: ${dids.length} DIDs, ${tfns.length} TFNs, ${tenantsWithExtensions.length} extension prefixes synced.`);
            return {
                dids: dids.length,
                tfns: tfns.length,
                extensions: tenantsWithExtensions.length // Now represents prefix count
            };
        } catch (err) {
            this.logger.error(`Bulk sync failed: ${err.message}`);
            throw err;
        }
    }
}

@Global()
@Module({
    providers: [
        {
            provide: LOOKUP_REDIS_CLIENT,
            useFactory: async () => {
                const host = process.env.REDIS_HOST || 'localhost';
                const port = process.env.REDIS_PORT || 6379;
                const password = process.env.REDIS_PASSWORD;
                const db = 2;

                const client = createClient({
                    url: `redis://${host}:${port}`,
                    password: password,
                    database: db,
                    socket: {
                        connectTimeout: 10000,
                        reconnectStrategy: (retries) => {
                            if (retries > 20) return new Error('Lookup Redis connection failed');
                            return Math.min(retries * 200, 3000);
                        }
                    }
                });

                client.on('error', (err) => {
                    if (err?.message?.includes('Connection timeout')) {
                        console.warn('Lookup Redis Client connection timed out, reconnecting...');
                    } else {
                        console.error('Lookup Redis Client Error:', err?.message || err);
                    }
                });

                try {
                    await client.connect();
                    console.log(`Connected to Lookup Redis at ${host}:${port} DB ${db}`);
                } catch (e) {
                    console.warn('Lookup Redis Client could not connect. Using mock mode.', e.message);
                    return {
                        on: () => { },
                        get: async () => null,
                        set: async () => 'OK',
                        del: async () => 1,
                        publish: async () => 0,
                        subscribe: async () => { },
                        unsubscribe: async () => { },
                        quit: async () => { },
                        isOpen: false,
                        hGetAll: async () => ({}),
                        keys: async () => [],
                        multi: () => ({
                            set: function() { return this; },
                            del: function() { return this; },
                            exec: async () => []
                        })
                    };
                }
                return client;
            },
        },
        LookupRedisService,
    ],
    exports: [LOOKUP_REDIS_CLIENT, LookupRedisService],
})
export class LookupRedisModule { }
