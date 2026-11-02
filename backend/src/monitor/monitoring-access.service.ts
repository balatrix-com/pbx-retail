import { ForbiddenException, Injectable } from '@nestjs/common';
import { Role, UserStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class MonitoringAccessService {
    constructor(private readonly prisma: PrismaService) { }

    async getAssignedExtension(user: { sub?: string; id?: string; role?: Role; tenantId?: string | null }): Promise<string | null> {
        if (user.role === Role.SUPER_ADMIN) return null;
        if (!user.tenantId || (!user.sub && !user.id) || (user.role !== Role.ADMIN && user.role !== Role.SUPPORT)) {
            throw new ForbiddenException('Monitoring seat required');
        }
        const [account, features, subscription] = await Promise.all([
            this.prisma.user.findUnique({
                where: { id: (user.sub || user.id)! },
                select: { tenantId: true, status: true, monitoringEnabled: true, monitoringExtension: true },
            }),
            this.prisma.tenantFeature.findUnique({ where: { tenantId: user.tenantId }, select: { monitorEnabled: true } }),
            this.prisma.subscription.findFirst({
                where: { tenantId: user.tenantId, status: 'ACTIVE' },
                include: { plan: { select: { maxMonitoringExtensions: true } } },
                orderBy: { createdAt: 'desc' },
            }),
        ]);
        if (account?.tenantId !== user.tenantId || account.status !== UserStatus.ACTIVE ||
            !account.monitoringEnabled || !account.monitoringExtension || features?.monitorEnabled === false ||
            !subscription || subscription.plan.maxMonitoringExtensions < 1) {
            throw new ForbiddenException('Monitoring seat required');
        }
        return account.monitoringExtension;
    }
}
