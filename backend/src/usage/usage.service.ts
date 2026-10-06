import { Injectable, BadRequestException, ForbiddenException, NotFoundException, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { PrismaService } from '../prisma/prisma.service';
import { WalletService } from '../wallet/wallet.service';
import { TransactionType, Role } from '@prisma/client';
import { EnforcementService, ServiceState } from '../enforcement/enforcement.service';

@Injectable()
export class UsageService {
    private readonly logger = new Logger(UsageService.name);
    constructor(
        private prisma: PrismaService,
        private walletService: WalletService,
        private enforcementService: EnforcementService,
        private httpService: HttpService
    ) { }

    async reportUsage(tenantId: string, minutes: number) {
        if (minutes <= 0) throw new BadRequestException('Minutes must be positive');

        // Enforcement Check (Read-only, outside transaction for perf)
        const state = await this.enforcementService.getServiceState(tenantId);
        if (state === ServiceState.PLAN_EXPIRED) throw new ForbiddenException('Plan expired');
        if (state === ServiceState.WALLET_ZERO || state === ServiceState.WALLET_NEGATIVE) {
            throw new ForbiddenException(`Outbound calls disabled: ${state}`);
        }

        return this.prisma.$transaction(async (tx) => {
            // Fetch Tenant
            const tenant = await tx.tenant.findUnique({
                where: { id: tenantId }
            });

            if (!tenant) throw new NotFoundException('Tenant not found');
            if (tenant.serviceBlocked) throw new ForbiddenException('Service blocked due to insufficient funds');

            // Charge for all minutes
            const overageRate = 0.10; // Default flat rate
            const cost = minutes * overageRate;

            try {
                // Debit Wallet (Pass transaction client)
                await this.walletService.adjustBalance(tenantId, cost, TransactionType.DEBIT, `Usage: ${minutes} mins`, `USAGE-${Date.now()}`, tx);

                // Record Paid Usage (Atomic with wallet debit)
                await tx.usageRecord.create({
                    data: {
                        tenantId,
                        minutes: minutes,
                        cost: cost
                    }
                });

            } catch (err) {
                // Wallet Failed (Insufficient Funds likely)
                console.error(`Usage charge failed for Tenant ${tenantId}: ${err.message}`);

                // Block Tenant (within same transaction)
                await tx.tenant.update({
                    where: { id: tenantId },
                    data: { serviceBlocked: true }
                });

                throw new ForbiddenException('Insufficient funds for usage. Service blocked.');
            }

            return {
                totalReported: minutes,
                chargedMinutes: minutes,
                freeConsumed: 0
            };
        });
    }

    async getSummary(tenantId: string) {
        const records = await this.prisma.usageRecord.findMany({ where: { tenantId } });
        const totalMinutes = records.reduce((acc: number, r) => acc + r.minutes, 0);
        const totalCost = records.reduce((acc: number, r) => acc + Number(r.cost), 0);
        return { totalMinutes, totalCost };
    }

    async getCDRs(
        tenantId: string | null,
        filters: { startDate?: string; endDate?: string; limit?: string; offset?: string; customerId?: string } = {},
        userRole?: string
    ) {
        try {
            const { customerId: filterCustomerId, ...queryParams } = filters;
            let targetUrl: string;

            if (userRole === Role.SUPER_ADMIN) {
                if (filterCustomerId && filterCustomerId !== 'ALL' && filterCustomerId !== 'all') {
                    targetUrl = `${this.walletService.subBillingUrl}/pbx/cdrs/${filterCustomerId}`;
                } else {
                    targetUrl = `${this.walletService.subBillingUrl}/pbx/cdrs`;
                }
            } else {
                if (!tenantId) return { data: [], total: 0 };
                const customerId = await this.walletService.getSubBillingCustomerId(tenantId);
                targetUrl = `${this.walletService.subBillingUrl}/pbx/cdrs/${customerId}`;
            }

            const response = await firstValueFrom(
                this.httpService.get(targetUrl, {
                    params: queryParams
                })
            );
            return response.data;
        } catch (error) {
            this.logger.error(`Failed to fetch CDRs from Sub Billing: ${error.message}`);
            return { data: [], total: 0 };
        }
    }
}
