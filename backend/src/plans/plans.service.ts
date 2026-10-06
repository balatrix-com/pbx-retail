import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { PrismaService } from '../prisma/prisma.service';
import { BillingCycle, Tier } from '@prisma/client';

@Injectable()
export class PlansService implements OnModuleInit {
    private readonly logger = new Logger(PlansService.name);
    private subBillingUrl: string;

    constructor(
        private prisma: PrismaService,
        private httpService: HttpService,
        private configService: ConfigService
    ) {
        this.subBillingUrl = this.configService.get<string>('SUB_BILLING_API_URL') || 'http://localhost:5005/api';
    }

    async onModuleInit() {
        await this.seedPlans();
    }

    async seedPlans() {
        const plans = [
            { name: 'Standard Monthly', billingCycle: BillingCycle.MONTHLY, tier: Tier.STANDARD, price: 9.99, freeMinutes: 100 },
            { name: 'Standard Yearly', billingCycle: BillingCycle.YEARLY, tier: Tier.STANDARD, price: 99.99, freeMinutes: 100 },
            { name: 'Premium Monthly', billingCycle: BillingCycle.MONTHLY, tier: Tier.PREMIUM, price: 19.99, freeMinutes: 500 },
            { name: 'Premium Yearly', billingCycle: BillingCycle.YEARLY, tier: Tier.PREMIUM, price: 199.99, freeMinutes: 500 },
            { name: 'Enterprise Monthly', billingCycle: BillingCycle.MONTHLY, tier: Tier.ENTERPRISE, price: 49.99, freeMinutes: 1000 },
            { name: 'Enterprise Yearly', billingCycle: BillingCycle.YEARLY, tier: Tier.ENTERPRISE, price: 499.99, freeMinutes: 1000 },
        ];

        for (const plan of plans) {
            const exists = await this.prisma.plan.findFirst({
                where: { name: plan.name, billingCycle: plan.billingCycle, tier: plan.tier },
            });

            if (!exists) {
                await this.prisma.plan.create({ data: plan });
                console.log(`Seeded plan: ${plan.name}`);
            }
        }
    }

    async findAll(userId?: string) {
        try {
            this.logger.log(`Fetching plans from sub-billing: ${this.subBillingUrl}/plans`);
            const response = await firstValueFrom(
                this.httpService.get(`${this.subBillingUrl}/plans`)
            );
            const data = response.data?.data || response.data;
            if (Array.isArray(data) && data.length > 0) {
                return data;
            }
        } catch (error) {
            this.logger.warn(`Failed to fetch plans from sub-billing: ${error.message}, falling back to local DB`);
        }

        return this.prisma.plan.findMany({
            where: {
                OR: [
                    { isCustom: false },
                    userId ? { isCustom: true, createdBy: userId } : undefined
                ].filter(Boolean) as any
            },
            orderBy: [
                { isCustom: 'asc' }, // Standard first
                { tier: 'asc' },
                { billingCycle: 'asc' }
            ]
        });
    }

    async createCustom(data: any, userId: string) {
        let subBillingResult = null;
        try {
            const response = await firstValueFrom(
                this.httpService.post(`${this.subBillingUrl}/v1/plans`, {
                    ...data,
                    plan_id: data.plan_id || data.name?.toLowerCase().replace(/[^a-z0-9]/g, '_')
                })
            );
            subBillingResult = response.data;
        } catch (error) {
            this.logger.warn(`Failed to push custom plan to sub-billing: ${error.message}`);
        }

        const localPlan = await this.prisma.plan.create({
            data: {
                name: data.name,
                price: Number(data.price ?? data.amount ?? 0),
                freeMinutes: Number(data.freeMinutes ?? data.free_mins ?? 0),
                isCustom: true,
                createdBy: userId,
                tier: data.tier || Tier.BASIC,
                billingCycle: data.billingCycle || BillingCycle.MONTHLY,
                maxDIDs: Number(data.maxDIDs ?? data.dids ?? 0),
                maxTFNs: Number(data.maxTFNs ?? data.tfns ?? 0),
                maxExtensions: Number(data.maxExtensions ?? data.extensions ?? 0),
                maxRingGroups: Number(data.maxRingGroups ?? 0),
                maxIVRs: Number(data.maxIVRs ?? 0),
                maxDIDForwards: Number(data.maxDIDForwards ?? 0),
                allowSchedules: data.allowSchedules ?? false,
                allowDIDForwards: data.allowDIDForwards ?? false,
                allowCallRecording: data.allowCallRecording ?? false,
                allowVoicemail: data.allowVoicemail ?? true,
                initialCredit: Number(data.initialCredit ?? 0)
            }
        });

        return subBillingResult || localPlan;
    }

    async deletePlan(planId: string) {
        // 1. Check local PBX plan and active subscriptions
        const localPlan = await this.prisma.plan.findFirst({
            where: {
                OR: [
                    { id: planId },
                    { name: planId }
                ]
            }
        });

        if (localPlan) {
            const activeSubs = await this.prisma.subscription.count({
                where: { planId: localPlan.id, status: 'ACTIVE' }
            });

            if (activeSubs > 0) {
                const { BadRequestException } = await import('@nestjs/common');
                throw new BadRequestException(
                    `Cannot delete plan "${localPlan.name}": ${activeSubs} active tenant subscription(s) are currently using this plan.`
                );
            }
        }

        // 2. Call sub-billing engine deletion
        try {
            this.logger.log(`Deleting plan from sub-billing: ${this.subBillingUrl}/plans/${planId}`);
            const response = await firstValueFrom(
                this.httpService.delete(`${this.subBillingUrl}/plans/${planId}`)
            );
        } catch (error) {
            const status = error.response?.status;
            const message = error.response?.data?.message || error.message;
            if (status === 409) {
                const { BadRequestException } = await import('@nestjs/common');
                throw new BadRequestException(`Cannot delete plan: ${message}`);
            }
            this.logger.warn(`Sub-billing delete call for plan "${planId}" result: ${message}`);
        }

        // 3. Delete local PBX plan record
        if (localPlan) {
            try {
                await this.prisma.plan.delete({
                    where: { id: localPlan.id }
                });
            } catch (err) {
                this.logger.warn(`Local plan deletion skipped or failed: ${err.message}`);
            }
        }

        return {
            success: true,
            message: `Plan "${planId}" deleted successfully`
        };
    }
}
