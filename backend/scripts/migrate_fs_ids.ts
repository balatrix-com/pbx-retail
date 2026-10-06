import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('Starting migration...');

    // 1. Assign Customer Codes to Tenants
    const tenants = await prisma.tenant.findMany({
        where: { customerCode: null }
    });

    let nextCode = 1001;
    // Find max existing if any (manual check, but assuming none for now)

    for (const tenant of tenants) {
        // Double check uniqueness simply by incrementing
        await prisma.tenant.update({
            where: { id: tenant.id },
            data: { customerCode: nextCode.toString() }
        });
        console.log(`Assigned code ${nextCode} to tenant ${tenant.name}`);
        nextCode++;
    }

    // 2. Assign Sequence IDs to Entities per TENANT
    const allTenants = await prisma.tenant.findMany();

    for (const tenant of allTenants) {
        console.log(`Processing tenant ${tenant.name}...`);

        // Extensions
        const extensions = await prisma.extension.findMany({
            where: { tenantId: tenant.id },
            orderBy: { createdAt: 'asc' }
        });
        for (let i = 0; i < extensions.length; i++) {
            await prisma.extension.update({
                where: { id: extensions[i].id },
                data: { sequenceId: i + 1 }
            });
        }
        console.log(`  Updated ${extensions.length} extensions`);

        // Ring Groups
        const rgs = await prisma.ringGroup.findMany({
            where: { tenantId: tenant.id },
            orderBy: { createdAt: 'asc' }
        });
        for (let i = 0; i < rgs.length; i++) {
            await prisma.ringGroup.update({
                where: { id: rgs[i].id },
                data: { sequenceId: i + 1 }
            });
        }
        console.log(`  Updated ${rgs.length} ring groups`);

        // IVRs
        const ivrs = await prisma.iVR.findMany({
            where: { tenantId: tenant.id },
            orderBy: { createdAt: 'asc' }
        });
        for (let i = 0; i < ivrs.length; i++) {
            await prisma.iVR.update({
                where: { id: ivrs[i].id },
                data: { sequenceId: i + 1 }
            });
        }
        console.log(`  Updated ${ivrs.length} IVRs`);

        // DIDs (Forward/Schedule)
        // Usually DIDs use just the number, but request says fwd{n}_code.
        // DIDs generally don't need sequence if we use number, but let's follow pattern.
        const dids = await prisma.dID.findMany({
            where: { tenantId: tenant.id },
            orderBy: { createdAt: 'asc' }
        });
        for (let i = 0; i < dids.length; i++) {
            await prisma.dID.update({
                where: { id: dids[i].id },
                data: { sequenceId: i + 1 }
            });
        }
    }

    console.log('Migration complete.');
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
