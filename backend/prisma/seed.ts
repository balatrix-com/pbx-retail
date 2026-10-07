import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { seedRateCards } from './rate_card';
const prisma = new PrismaClient();

async function main() {
    console.log('Seeding data...');

    // 1. Seek Plans
    await prisma.plan.upsert({
        where: { id: 'price_basic_monthly' },
        update: {},
        create: {
            id: 'price_basic_monthly',
            name: 'Basic Plan',
            description: 'Starter plan for small businesses',
            stripePriceId: 'price_mock_basic',
            billingCycle: 'MONTHLY',
            tier: 'BASIC',
            price: 10.00,
            freeMinutes: 0,
            overagePrice: 0,
            maxNumbers: 2,
            maxMonitoringExtensions: 1
        }
    });

    await prisma.plan.upsert({
        where: { id: 'price_standard_monthly' },
        update: {},
        create: {
            id: 'price_standard_monthly',
            name: 'Standard Plan',
            description: 'Growth plan',
            stripePriceId: 'price_mock_standard',
            billingCycle: 'MONTHLY',
            tier: 'STANDARD',
            price: 30.00,
            freeMinutes: 0,
            overagePrice: 0,
            maxNumbers: 10,
            maxMonitoringExtensions: 3
        }
    });

    // 2. Seed TFNs
    const tfnCount = await prisma.tFN.count();
    if (tfnCount === 0) {
        await prisma.tFN.createMany({
            data: [
                { number: '+18005550100', price: 2.00 },
                { number: '+18005550101', price: 2.00 },
                { number: '+18005550102', price: 2.00 },
                { number: '+18005550103', price: 5.00 },
            ]
        });
        console.log('Seeded TFNs');
    }

    // 3. Seed Super Admin
    const superAdminEmail = 'superadmin@balatrix.com';
    const superAdminPassword = process.env.SUPER_ADMIN_PASSWORD || 'OnidaMaruti1)';
    const hashedPassword = await bcrypt.hash(superAdminPassword, 10);

    await prisma.$transaction(async (tx) => {
        const existingSuperAdmin =
            await tx.user.findUnique({ where: { email: superAdminEmail } })
            || await tx.user.findUnique({ where: { email: 'superadmin@example.com' } })
            || await tx.user.findFirst({ where: { role: 'SUPER_ADMIN' }, orderBy: { createdAt: 'asc' } });

        const data = {
            email: superAdminEmail,
            password: hashedPassword,
            role: 'SUPER_ADMIN' as const,
            status: 'ACTIVE' as const,
            name: 'Super Admin',
            tenantId: null,
            forcePasswordChange: false,
            monitoringEnabled: true,
            monitoringExtension: '999001',
            monitoringSecret: 'SuperSecret123!'
        };

        if (existingSuperAdmin) {
            await tx.user.update({ where: { id: existingSuperAdmin.id }, data });
        } else {
            await tx.user.create({ data });
        }
    });
    console.log(`Seeded/Updated Super Admin ${superAdminEmail} with monitoring extension 999001`);

    // Sync Super Admin monitoring extension to Kamailio subscriber database
    await syncKamailioSubscriber('999001', 'SuperSecret123!');

    // 4. Seed Rate Cards (Standard & Recording Rate Cards: 7, 15, 30 days)
    await seedRateCards();

    console.log('Seeding complete.');
}

async function syncKamailioSubscriber(username: string, passwordPlain: string) {
    const { Client } = require('pg');
    const crypto = require('crypto');
    
    const realm = process.env.SIP_REALM || 'wlabel.balatrix.com';
    const client = new Client({
        host: process.env.FS_DB_HOST || '10.30.0.60',
        port: parseInt(process.env.FS_DB_PORT || '5432', 10),
        database: process.env.KAMAILIO_DB_NAME || 'kamailio',
        user: process.env.FS_DB_USER || 'freeswitch',
        password: process.env.FS_DB_PASSWORD || 'OnidaMaruti1)',
    });

    try {
        await client.connect();
        const ha1 = crypto.createHash('md5')
            .update(`${username}:${realm}:${passwordPlain}`)
            .digest('hex');
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
        await client.query(query, [username, realm, passwordPlain, ha1, ha1b]);
        console.log(`Synced Kamailio subscriber: ${username}@${realm}`);
    } catch (err) {
        console.error(`Failed to sync Kamailio subscriber ${username}:`, err.message);
    } finally {
        await client.end();
    }
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
