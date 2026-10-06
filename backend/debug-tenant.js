const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkTenant() {
    const tenantId = 'fd1b7b44-b06f-475a-99df-9f4ef0bc1e17';
    console.log(`Checking Tenant: ${tenantId}`);

    const tenant = await prisma.tenant.findUnique({
        where: { id: tenantId },
        include: {
            dids: true
        }
    });

    if (!tenant) {
        console.log('Tenant NOT FOUND');
        return;
    }

    console.log('Tenant Name:', tenant.name);
    console.log('DIDs:', tenant.dids.map(d => d.number));

    const tfns = await prisma.tFN.findMany({
        where: { tenantId: tenantId }
    });
    console.log('TFNs:', tfns.map(t => ({
        number: t.number,
        routeType: t.routeType,
        routeTargetId: t.routeTargetId,
        forwardEnabled: t.forwardEnabled,
        forwardNumber: t.forwardNumber
    })));

    /*
    console.log('\nChecking Recent Calls (last 10)...');
    const recentCalls = await prisma.call.findMany({
        where: {
            tenantId: tenantId
        },
        orderBy: {
            startTime: 'desc'
        },
        take: 10
    });

    console.log(`Found ${recentCalls.length} recent calls`);
    recentCalls.forEach(c => {
        console.log(`[${c.startTime}] ${c.from} -> ${c.to} (${c.status})`);
    });
    */
}

checkTenant()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
