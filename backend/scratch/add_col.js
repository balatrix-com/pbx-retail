const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
    await prisma.$executeRawUnsafe('ALTER TABLE "tenant_features" ADD COLUMN IF NOT EXISTS "recordingEnabled" BOOLEAN NOT NULL DEFAULT false;');
    console.log("Column added successfully");
}
main().catch(console.error).finally(() => prisma.$disconnect());
