const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const uuid = 'a4ca685c-77fa-4b6e-8706-16c621bcf837';
  
  const inUser = await prisma.user.findUnique({where: {id: uuid}});
  const inTenant = await prisma.tenant.findUnique({where: {id: uuid}});
  const inTfn = await prisma.tFN.findUnique({where: {id: uuid}});
  const inDid = await prisma.dID.findUnique({where: {id: uuid}});
  
  if (inUser) console.log('It is a User!');
  if (inTenant) console.log('It is a Tenant!');
  if (inTfn) console.log('It is a TFN!');
  if (inDid) console.log('It is a DID!');
  
  if (!inUser && !inTenant && !inTfn && !inDid) console.log('UUID not found in User, Tenant, TFN, DID.');
}

main().catch(console.error).finally(() => prisma.$disconnect());
