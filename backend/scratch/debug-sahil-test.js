const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const email = 'sahil@test.com';
  console.log(`=== Debugging user ${email} ===`);
  
  const user = await prisma.user.findUnique({
    where: { email },
    include: {
      tenant: {
        include: {
          wallet: true,
          subscriptions: {
            include: { plan: true }
          },
          extensions: true,
          tfns: true,
          dids: true
        }
      }
    }
  });

  if (!user) {
    console.log(`User ${email} not found.`);
    return;
  }

  console.log('User:', {
    id: user.id,
    email: user.email,
    role: user.role,
    status: user.status,
    tenantId: user.tenantId
  });

  if (user.tenant) {
    console.log('Tenant:', {
      id: user.tenant.id,
      name: user.tenant.name,
      customerCode: user.tenant.customerCode,
      subBillingCustomerId: user.tenant.subBillingCustomerId,
      serviceBlocked: user.tenant.serviceBlocked
    });

    console.log('Wallet:', user.tenant.wallet);
    console.log('Subscriptions:', user.tenant.subscriptions.map(s => ({
      id: s.id,
      subBillingSubscriptionId: s.subBillingSubscriptionId,
      status: s.status,
      planName: s.plan?.name,
      remainingFreeMinutes: s.remainingFreeMinutes
    })));
    console.log('Extensions count:', user.tenant.extensions.length, user.tenant.extensions.map(e => e.extensionNumber));
    console.log('TFNs count:', user.tenant.tfns.length, user.tenant.tfns.map(t => t.number));
    console.log('DIDs count:', user.tenant.dids.length, user.tenant.dids.map(d => d.number));
  } else {
    console.log('No tenant associated with user.');
  }
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
