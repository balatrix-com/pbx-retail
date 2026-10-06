const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Cleaning up Partner table...');
  
  // Delete all existing partners
  const deleteCount = await prisma.partner.deleteMany();
  console.log(`Deleted ${deleteCount.count} existing partner records.`);

  // Create a single global partner record
  const globalPartner = await prisma.partner.create({
    data: {
      domain: 'global',
      name: 'NexaWorks',
      primaryColor: '#3c3e6d',
      accentColor: '#f9d7d7',
      supportEmail: 'support@telecom-platform.com',
      supportPhone: '+1-800-555-0199',
    }
  });
  console.log('Created global partner record:', globalPartner);
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
