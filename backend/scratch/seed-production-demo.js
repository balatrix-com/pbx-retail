const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function seedProductionDemo() {
  console.log('🚀 Starting Production Demo Seeding...');

  const TOTAL_SLOTS = 50;

  // 1. Seed Demo Tenants (T0001 - T0050)
  console.log(`Creating ${TOTAL_SLOTS} Demo Tenant Slots...`);
  for (let i = 1; i <= TOTAL_SLOTS; i++) {
    const customerCode = `T${i.toString().padStart(4, '0')}`;
    
    await prisma.tenant.upsert({
      where: { customerCode },
      update: {
        serviceBlocked: true, // Initially blocked/available
        name: `Demo Slot ${customerCode}`
      },
      create: {
        id: customerCode, // Using customerCode as ID for predictable indexing in demo dash
        name: `Demo Slot ${customerCode}`,
        customerCode: customerCode,
        subBillingCustomerId: customerCode,
        serviceBlocked: true
      }
    });

    // Ensure each slot has a wallet
    await prisma.wallet.upsert({
      where: { tenantId: customerCode },
      update: {},
      create: {
        tenantId: customerCode,
        balance: 0.00,
        currency: 'USD'
      }
    });

    // Ensure each slot has monitoring enabled
    await prisma.monitoringAddOn.upsert({
      where: { tenantId: customerCode },
      update: {},
      create: {
        tenantId: customerCode,
        isActive: true,
        price: 0
      }
    });
  }

  // 2. Seed Demo TFNs
  console.log(`Seeding 50 Demo Toll-Free Numbers...`);
  for (let i = 1; i <= TOTAL_SLOTS; i++) {
    const num = `+1800600${i.toString().padStart(4, '0')}`;
    await prisma.tFN.upsert({
      where: { number: num },
      update: { isDemo: true, status: 'AVAILABLE' },
      create: {
        number: num,
        status: 'AVAILABLE',
        price: 0,
        isDemo: true
      }
    });
  }

  console.log('✅ Seeding Complete!');
  console.log(`- Created ${TOTAL_SLOTS} Tenants (T0001-T0050)`);
  console.log(`- Created ${TOTAL_SLOTS} TFNs (+18006000001 onwards)`);
  console.log('- Wallets and Monitoring Add-ons initialized.');
}

seedProductionDemo()
  .catch((e) => {
    console.error('❌ Seeding Failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
