import { BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { mirrorSubBillingPlan } from './plan-mirror';

const remote = {
    plan_id: 'retail-plan-1', name: 'Retail Basic', amount: 25,
    validity_months: 1, numbers: 2, monitoring_extensions: 1, extensions: 5,
};

function database() {
    return {
        plan: {
            findUnique: jest.fn().mockResolvedValue(null),
            findMany: jest.fn().mockResolvedValue([]),
            create: jest.fn().mockImplementation(({ data }) => Promise.resolve({ id: 'local-1', ...data })),
            update: jest.fn().mockImplementation(({ data }) => Promise.resolve({ id: 'local-1', ...data })),
        },
        subscription: { findMany: jest.fn().mockResolvedValue([]) },
        tFN: { count: jest.fn().mockResolvedValue(0) },
        dID: { count: jest.fn().mockResolvedValue(0) },
        user: { count: jest.fn().mockResolvedValue(0) },
    };
}

describe('mirrorSubBillingPlan', () => {
    it('creates a local plan linked to the exact sub-billing plan ID', async () => {
        const prisma = database();
        const plan = await mirrorSubBillingPlan(prisma as unknown as PrismaService, remote);
        expect(plan.subBillingPlanId).toBe(remote.plan_id);
        expect(plan.maxNumbers).toBe(2);
        expect(plan.maxMonitoringExtensions).toBe(1);
        expect(prisma.plan.findMany).toHaveBeenCalledWith({
            where: { name: { equals: remote.name, mode: 'insensitive' }, subBillingPlanId: null }, take: 2,
        });
    });

    it('refuses to attach an ambiguous legacy plan', async () => {
        const prisma = database();
        prisma.plan.findMany.mockResolvedValueOnce([{ id: 'a' }, { id: 'b' }]);
        await expect(mirrorSubBillingPlan(prisma as unknown as PrismaService, remote))
            .rejects.toBeInstanceOf(BadRequestException);
        expect(prisma.plan.create).not.toHaveBeenCalled();
    });

    it('blocks a downgrade below assigned numbers or monitoring seats', async () => {
        const prisma = database();
        prisma.plan.findUnique.mockResolvedValueOnce({
            id: 'local-1', maxNumbers: 3, maxMonitoringExtensions: 2,
        });
        prisma.subscription.findMany.mockResolvedValueOnce([{ tenantId: 'tenant-1' }]);
        prisma.tFN.count.mockResolvedValueOnce(2);
        prisma.dID.count.mockResolvedValueOnce(1);
        await expect(mirrorSubBillingPlan(prisma as unknown as PrismaService, remote))
            .rejects.toBeInstanceOf(BadRequestException);
        expect(prisma.plan.update).not.toHaveBeenCalled();
    });
});
