import { ForbiddenException } from '@nestjs/common';
import { Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export async function assertTenantServiceAccess(prisma: PrismaService, user: { role?: string; tenantId?: string | null }) {
    if (user.role === Role.SUPER_ADMIN || !user.tenantId) return;
    const tenant = await prisma.tenant.findUnique({ where: { id: user.tenantId }, select: { serviceBlocked: true, status: true } });
    if (!tenant || tenant.serviceBlocked || tenant.status === 'ARCHIVED') throw new ForbiddenException('Your organization account is suspended. Contact support.');
}
