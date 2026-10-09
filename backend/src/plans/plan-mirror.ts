import { BadRequestException } from '@nestjs/common';
import { BillingCycle, Tier } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

function entitlement(value: unknown, field: string): number {
    const number = Number(value ?? 0);
    if (!Number.isInteger(number) || number < 0) {
        throw new BadRequestException(`Invalid ${field} entitlement in sub-billing plan`);
    }
    return number;
}

export async function mirrorSubBillingPlan(prisma: PrismaService, remote: any) {
    const planId = String(remote?.plan_id || '').trim();
    const name = String(remote?.name || '').trim();
    if (!planId || !name) throw new BadRequestException('Sub-billing plan must include plan_id and name');

    const numbers = entitlement(remote.numbers, 'numbers');
    const monitoring = entitlement(remote.monitoring_extensions, 'monitoring_extensions');
    const extensions = entitlement(remote.extensions, 'extensions');
    const price = Number(remote.amount ?? 0);
    if (!Number.isFinite(price) || price < 0) throw new BadRequestException('Invalid plan amount');
    const billingCycle = Number(remote.validity_months) >= 12 ? BillingCycle.YEARLY : BillingCycle.MONTHLY;
    const common = {
        name,
        price,
        billingCycle,
        maxNumbers: numbers,
        maxMonitoringExtensions: monitoring,
        maxExtensions: extensions,
    };

    let local = await prisma.plan.findUnique({ where: { subBillingPlanId: planId } });
    if (!local) {
        // Link one legacy local plan by exact name; never fall back to an unrelated plan.
        const candidates = await prisma.plan.findMany({
            where: { name: { equals: name, mode: 'insensitive' }, subBillingPlanId: null },
            take: 2,
        });
        if (candidates.length > 1) throw new BadRequestException(`Multiple local plans match ${name}; link the plan explicitly`);
        local = candidates[0] || null;
    }

    if (local) {
        if (numbers < local.maxNumbers || monitoring < local.maxMonitoringExtensions) {
            const subscribers = await prisma.subscription.findMany({
                where: { planId: local.id, status: 'ACTIVE' }, select: { tenantId: true },
            });
            for (const { tenantId } of subscribers) {
                const [tfns, dids, seats] = await Promise.all([
                    prisma.tFN.count({ where: { tenantId } }),
                    prisma.dID.count({ where: { tenantId } }),
                    prisma.user.count({ where: { tenantId, monitoringEnabled: true } }),
                ]);
                if (tfns + dids > numbers || seats > monitoring) {
                    throw new BadRequestException(`Plan ${name} cannot be reduced below assigned resources for tenant ${tenantId}`);
                }
            }
        }
        return prisma.plan.update({
            where: { id: local.id },
            data: { ...common, subBillingPlanId: planId },
        });
    }
    return prisma.plan.create({
        data: {
            ...common,
            subBillingPlanId: planId,
            freeMinutes: 0,
            tier: Tier.BASIC,
            isCustom: true,
            maxDIDs: 0,
            maxTFNs: 0,
        },
    });
}
