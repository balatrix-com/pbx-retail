const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.findUnique({
    where: { email: 'sahil@gmail.com' },
    include: { tenant: true }
  });
  console.log('User Tenant UUID:', user.tenant.id);
  console.log('User Tenant CustomerCode:', user.tenant.customerCode);
  
  const allTenants = await prisma.tenant.findMany({
    select: { id: true, customerCode: true }
  });
  console.log('All Tenant Mappings:');
  allTenants.forEach(t => console.log(`${t.customerCode} -> ${t.id}`));
}

main().catch(console.error).finally(() => prisma.$disconnect());
