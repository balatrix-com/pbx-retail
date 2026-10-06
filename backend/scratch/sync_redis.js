const { PrismaClient } = require('@prisma/client');
const { createClient } = require('redis');

async function syncAll() {
    const prisma = new PrismaClient();
    const redisClient = createClient({
        url: 'redis://localhost:6379',
        password: 'OnidaMaruti1)',
        database: 2
    });

    await redisClient.connect();
    console.log('Connected to Redis');

    const [dids, tfns, tenantsWithExtensions] = await Promise.all([
        prisma.dID.findMany({ select: { number: true, tenantId: true } }),
        prisma.tFN.findMany({ select: { number: true, tenantId: true }, where: { tenantId: { not: null } } }),
        prisma.tenant.findMany({
            where: { 
                extensions: { some: {} },
                customerCode: { not: null }
            },
            select: { id: true, customerCode: true }
        }),
    ]);

    const pipeline = redisClient.multi();

    // 1. Sync DIDs (Number -> TenantID)
    for (const did of dids) {
        const normalized = did.number.replace(/\D/g, ''); // Simple normalization
        if (normalized) {
            pipeline.set(`lookup:v1:number:${normalized}`, did.tenantId);
        }
    }

    // 2. Sync TFNs (Number -> TenantID)
    for (const tfn of tfns) {
        if (tfn.tenantId) {
            const normalized = tfn.number.replace(/\D/g, '');
            if (normalized) {
                pipeline.set(`lookup:v1:number:${normalized}`, tfn.tenantId);
            }
        }
    }

    // 3. Sync Extension Prefixes (CustomerCode -> TenantID)
    for (const tenant of tenantsWithExtensions) {
        if (tenant.customerCode) {
            pipeline.set(`lookup:v1:ext:${tenant.customerCode}`, tenant.id);
        }
    }

    await pipeline.exec();
    console.log(`Synced ${dids.length} DIDs, ${tfns.length} TFNs, ${tenantsWithExtensions.length} prefixes.`);
    
    await prisma.$disconnect();
    await redisClient.quit();
}

syncAll().catch(console.error);
