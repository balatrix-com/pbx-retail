import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const adminId = '0642ada2-79bf-4d26-a2fa-7d2b3313cb4f';
  const targetUserId = '0642ada2-79bf-4d26-a2fa-7d2b3313cb4f';
  
  const admin = await prisma.user.findUnique({
      where: { id: adminId },
  });

  console.log("admin role", admin?.role);
  console.log("admin tenantId", admin?.tenantId);
  const target = await prisma.user.findUnique({
      where: { id: targetUserId },
      select: { tenantId: true }
  });
  console.log("target tenantId", target?.tenantId);
  
  const canManage = admin?.role === 'ADMIN' && target?.tenantId === admin?.tenantId;
  console.log("Can manage:", canManage);
}
main();
