import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { PrismaService } from '../prisma/prisma.service';
import { mirrorSubBillingPlan } from './plan-mirror';

@Injectable()
export class PlansService {
    private readonly logger = new Logger(PlansService.name);
    private subBillingUrl: string;

    constructor(
        private prisma: PrismaService,
        private httpService: HttpService,
        private configService: ConfigService
    ) {
        this.subBillingUrl = this.configService.get<string>('SUB_BILLING_API_URL') || 'http://localhost:5005/api';
    }

    async findAll(userId?: string) {
        let data: any;
        try {
            this.logger.log(`Fetching plans from sub-billing: ${this.subBillingUrl}/plans`);
            const response = await firstValueFrom(
                this.httpService.get(`${this.subBillingUrl}/plans`)
            );
            data = response.data?.data || response.data;
        } catch (error) {
            this.logger.warn(`Failed to fetch plans from sub-billing: ${error.message}, falling back to local DB`);
            return this.prisma.plan.findMany({
                where: { isCustom: true, ...(userId ? { createdBy: userId } : {}) },
                orderBy: [{ isCustom: 'asc' }, { tier: 'asc' }, { billingCycle: 'asc' }],
            });
        }
        if (!Array.isArray(data)) throw new BadRequestException('Invalid plan list returned by sub-billing');
        for (const plan of data) await mirrorSubBillingPlan(this.prisma, plan);
        return data;
    }

    async createCustom(data: any, userId: string) {
        let subBillingResult: any;
        const planId = data.plan_id || data.name?.toLowerCase().replace(/[^a-z0-9]/g, '_');
        try {
            const response = await firstValueFrom(
                this.httpService.post(`${this.subBillingUrl}/v1/plans`, {
                    ...data,
                    plan_id: planId
                })
            );
            subBillingResult = response.data;
        } catch (error) {
            throw new BadRequestException(`Failed to create plan in sub-billing: ${error.response?.data?.message || error.message}`);
        }
        if (subBillingResult?.success === false) throw new BadRequestException(subBillingResult.message || 'Sub-billing rejected the plan');
        const remotePlan = subBillingResult?.data || { ...data, plan_id: planId };
        await mirrorSubBillingPlan(this.prisma, remotePlan);
        return subBillingResult;
    }

    async deletePlan(planId: string) {
        // 1. Check local PBX plan and active subscriptions
        const localPlan = await this.prisma.plan.findFirst({
            where: { OR: [{ subBillingPlanId: planId }, { id: planId }] }
        });
        const remoteId = localPlan?.subBillingPlanId || planId;

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
                this.httpService.delete(`${this.subBillingUrl}/plans/${encodeURIComponent(remoteId)}`)
            );
            if (response.data?.success === false) {
                throw new BadRequestException(response.data.message || 'Sub-billing rejected plan deletion');
            }
        } catch (error) {
            if (error instanceof BadRequestException) throw error;
            const status = error.response?.status;
            const message = error.response?.data?.message || error.message;
            throw new BadRequestException(`Cannot delete plan in sub-billing${status ? ` (${status})` : ''}: ${message}`);
        }

        // 3. Delete local PBX plan record
        if (localPlan) {
            await this.prisma.plan.delete({ where: { id: localPlan.id } });
        }

        return {
            success: true,
            message: `Plan "${planId}" deleted successfully`
        };
    }
}
