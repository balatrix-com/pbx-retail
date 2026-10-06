import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('Verifying FreeSwitch Naming Convention...');

    // Fetch a tenant
    const tenant = await prisma.tenant.findFirst({
        where: { customerCode: { not: null } }
    });

    if (!tenant) {
        console.error('No tenant with customerCode found');
        return;
    }
    console.log(`Using Tenant: ${tenant.name} (${tenant.customerCode})`);

    // Verify Extension
    const ext = await prisma.extension.findFirst({
        where: { tenantId: tenant.id },
        orderBy: { sequenceId: 'desc' }
    });
    if (ext) {
        console.log(`Extension: ${ext.extensionNumber} -> sequenceId: ${ext.sequenceId}`);
        console.log(`Expected Key: ext${ext.sequenceId}_${tenant.customerCode}`);
    } else {
        console.log('No extensions found');
    }

    // Verify Ring Group
    const rg = await prisma.ringGroup.findFirst({
        where: { tenantId: tenant.id },
        orderBy: { sequenceId: 'desc' }
    });
    if (rg) {
        console.log(`RingGroup: ${rg.name} -> sequenceId: ${rg.sequenceId}`);
        console.log(`Expected Key: rg${rg.sequenceId}_${tenant.customerCode}`);
    } else {
        console.log('No ring groups found');
    }

    // Verify IVR
    const ivr = await prisma.iVR.findFirst({
        where: { tenantId: tenant.id },
        orderBy: { sequenceId: 'desc' }
    });
    if (ivr) {
        console.log(`IVR: ${ivr.name} -> sequenceId: ${ivr.sequenceId}`);
        console.log(`Expected Key: ivr${ivr.sequenceId}_${tenant.customerCode}`);
    } else {
        console.log('No IVRs found');
    }

    // Verify Schedule
    const sched = await prisma.operationalSchedule.findFirst({
        where: { tenantId: tenant.id },
        orderBy: { sequenceId: 'desc' }
    });
    if (sched) {
        console.log(`Schedule: ${sched.name} -> sequenceId: ${sched.sequenceId}`);
        console.log(`Expected Key: sched${sched.sequenceId}_${tenant.customerCode}`);
    } else {
        console.log('No schedules found');
    }

    // Verify DID Forward
    const didFwd = await prisma.dID.findFirst({
        where: { tenantId: tenant.id, routeType: 'forward' },
        orderBy: { sequenceId: 'desc' }
    });
    if (didFwd) {
        console.log(`DID Fwd: ${didFwd.number} -> sequenceId: ${didFwd.sequenceId}`);
        console.log(`Expected Key: fwd${didFwd.sequenceId}_${tenant.customerCode}`);
    } else {
        console.log('No Forward DIDs found');
    }
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
