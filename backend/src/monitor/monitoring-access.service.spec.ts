import { ForbiddenException } from '@nestjs/common';
import { Role, UserStatus } from '@prisma/client';
import { MonitoringAccessService } from './monitoring-access.service';

describe('MonitoringAccessService', () => {
    const prisma = {
        user: { findUnique: jest.fn() },
        tenantFeature: { findUnique: jest.fn() },
        subscription: { findFirst: jest.fn() },
    };
    const service = new MonitoringAccessService(prisma as any);
    const admin = { sub: 'admin-1', role: Role.ADMIN, tenantId: 'tenant-1' };

    beforeEach(() => {
        jest.clearAllMocks();
        prisma.user.findUnique.mockResolvedValue({
            tenantId: 'tenant-1', status: UserStatus.ACTIVE,
            monitoringEnabled: true, monitoringExtension: '5001',
        });
        prisma.tenantFeature.findUnique.mockResolvedValue({ monitorEnabled: true });
        prisma.subscription.findFirst.mockResolvedValue({ plan: { maxMonitoringExtensions: 1 } });
    });

    it('allows an Admin with an active assigned plan seat', async () => {
        await expect(service.getAssignedExtension(admin)).resolves.toBe('5001');
    });

    it('rejects an Admin whose monitoring seat was revoked after token issue', async () => {
        prisma.user.findUnique.mockResolvedValue({
            tenantId: 'tenant-1', status: UserStatus.ACTIVE,
            monitoringEnabled: false, monitoringExtension: null,
        });
        await expect(service.getAssignedExtension(admin)).rejects.toThrow(ForbiddenException);
    });

    it('rejects a seat when the plan no longer includes monitoring', async () => {
        prisma.subscription.findFirst.mockResolvedValue({ plan: { maxMonitoringExtensions: 0 } });
        await expect(service.getAssignedExtension(admin)).rejects.toThrow(ForbiddenException);
    });

    it('allows Super Admin platform monitoring', async () => {
        await expect(service.getAssignedExtension({ role: Role.SUPER_ADMIN })).resolves.toBeNull();
        expect(prisma.user.findUnique).not.toHaveBeenCalled();
    });
});
