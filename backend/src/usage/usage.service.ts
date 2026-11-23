import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { PrismaService } from '../prisma/prisma.service';
import { WalletService } from '../wallet/wallet.service';
import { Role } from '@prisma/client';

@Injectable()
export class UsageService {
    private readonly logger = new Logger(UsageService.name);
    constructor(
        private prisma: PrismaService,
        private walletService: WalletService,
        private httpService: HttpService
    ) { }

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
