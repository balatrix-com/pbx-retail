import { Injectable, Logger, HttpException, HttpStatus, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { lastValueFrom } from 'rxjs';
import { FreeSwitchSyncService } from '../freeswitch/freeswitch-sync.service';
import { LookupRedisService } from '../redis/lookup-redis.module';
import { mirrorSubBillingPlan } from '../plans/plan-mirror';

@Injectable()
export class AdminService {
    private readonly logger = new Logger(AdminService.name);

    constructor(
        private prisma: PrismaService,
        private readonly httpService: HttpService,
        private readonly configService: ConfigService,
        private readonly freeswitchSync: FreeSwitchSyncService,
        private readonly lookupRedis: LookupRedisService,
    ) { }

    private get subBillingUrl() {
        return this.configService.get<string>('subBilling.apiUrl');
    }

    private get cacheRefreshUrl() {
        return this.configService.get<string>('billingCacheRefresh.url');
    }

    private get cacheRefreshToken() {
        return this.configService.get<string>('billingCacheRefresh.token');
    }

    /**
     * Trigger the billing system cache refresh API
     */
    async triggerCacheRefresh(): Promise<void> {
        if (!this.cacheRefreshUrl || !this.cacheRefreshToken) {
            this.logger.warn('Cache refresh config missing. Skipping trigger.');
            return;
        }

        try {
            await lastValueFrom(
                this.httpService.post(this.cacheRefreshUrl, {}, {
                    headers: { 'X-Auth-Token': this.cacheRefreshToken }
                })
            );
            this.logger.log('Billing system cache refresh triggered successfully.');
        } catch (error: any) {
            this.logger.error(`Failed to trigger billing cache refresh: ${error.message}`, error.response?.data);
        }
    }

    private handleProxyError(error: any, context: string) {
        if (error instanceof HttpException) throw error;
        const status = error.response?.status || HttpStatus.INTERNAL_SERVER_ERROR;
        const message = error.response?.data?.message || error.message;
        this.logger.error(`[${context}] Billing proxy error: ${message}`, error.response?.data);
        throw new HttpException(message, status);
    }

    /**
     * Whitelabel Packages/Plans CRUD Proxy
     */
    async getAllPackages() {
        try {
            const response = await lastValueFrom(this.httpService.get(`${this.subBillingUrl}/plans`));
            const plans = response.data?.data;
            if (Array.isArray(plans)) {
                for (const plan of plans) await mirrorSubBillingPlan(this.prisma, plan);
            }
            return response.data;
        } catch (error: any) {
            this.handleProxyError(error, 'getAllPackages');
        }
    }

    async getPackage(id: string) {
        try {
            const response = await lastValueFrom(this.httpService.get(`${this.subBillingUrl}/plans/${id}`));
            if (response.data?.data) await mirrorSubBillingPlan(this.prisma, response.data.data);
            return response.data;
        } catch (error: any) {
            this.handleProxyError(error, 'getPackage');
        }
    }

    async createPackage(data: any) {
        try {
            const response = await lastValueFrom(this.httpService.post(`${this.subBillingUrl}/plans`, data));
            if (response.data.success) {
                await mirrorSubBillingPlan(this.prisma, response.data.data);
                await this.triggerCacheRefresh();
            }
            return response.data;
        } catch (error: any) {
            this.handleProxyError(error, 'createPackage');
        }
    }

    async updatePackage(id: string, data: any) {
        try {
            const local = await this.prisma.plan.findUnique({ where: { subBillingPlanId: id } });
            if (local && (data.numbers !== undefined || data.monitoring_extensions !== undefined)) {
                const subscribers = await this.prisma.subscription.findMany({
                    where: { planId: local.id, status: 'ACTIVE' }, select: { tenantId: true },
                });
                for (const { tenantId } of subscribers) {
                    const [tfns, dids, seats] = await Promise.all([
                        this.prisma.tFN.count({ where: { tenantId } }),
                        this.prisma.dID.count({ where: { tenantId } }),
                        this.prisma.user.count({ where: { tenantId, monitoringEnabled: true } }),
                    ]);
                    if (tfns + dids > Number(data.numbers ?? local.maxNumbers) ||
                        seats > Number(data.monitoring_extensions ?? local.maxMonitoringExtensions)) {
                        throw new HttpException('Remove excess assigned numbers or monitoring seats before lowering this plan limit', HttpStatus.BAD_REQUEST);
                    }
                }
            }
            const response = await lastValueFrom(this.httpService.put(`${this.subBillingUrl}/plans/${id}`, data));
            if (response.data.success) {
                await mirrorSubBillingPlan(this.prisma, response.data.data);
                await this.triggerCacheRefresh();
            }
            return response.data;
        } catch (error: any) {
            this.handleProxyError(error, 'updatePackage');
        }
    }

    async deletePackage(id: string) {
        try {
            const local = await this.prisma.plan.findUnique({ where: { subBillingPlanId: id } });
            if (local) {
                const active = await this.prisma.subscription.count({ where: { planId: local.id, status: 'ACTIVE' } });
                if (active > 0) throw new HttpException('Cannot delete a plan with active PBX subscriptions', HttpStatus.CONFLICT);
            }
            const response = await lastValueFrom(this.httpService.delete(`${this.subBillingUrl}/plans/${id}`));
            if (response.data.success) {
                if (local) await this.prisma.plan.delete({ where: { id: local.id } });
                await this.triggerCacheRefresh();
            }
            return response.data;
        } catch (error: any) {
            this.handleProxyError(error, 'deletePackage');
        }
    }

    /**
     * Fetch real-time wallet balances from billing system
     */
    async getRealTimeBalances() {
        try {
            const response = await lastValueFrom(this.httpService.get(`${this.subBillingUrl}/pbx/all`));
            return response.data || [];
        } catch (error: any) {
            this.logger.error(`Failed to fetch real-time balances: ${error.message}`);
            return [];
        }
    }

    async getBillingTotalBalance() {
        const balances = await this.getRealTimeBalances();
        return balances.reduce((sum: number, b: any) => sum + (parseFloat(b.balance) || 0), 0);
    }

    /**
     * Recording Rate Cards CRUD Proxy
     */
    async getAllRecRateCards() {
        try {
            const response = await lastValueFrom(this.httpService.get(`${this.subBillingUrl}/rec-rate-cards`));
            return response.data;
        } catch (error: any) {
            this.handleProxyError(error, 'getAllRecRateCards');
        }
    }

    async getCustomerRecRateCardMappings() {
        try {
            const response = await lastValueFrom(this.httpService.get(`${this.subBillingUrl}/rec-rate-cards/mappings`));
            return response.data;
        } catch (error: any) {
            this.handleProxyError(error, 'getCustomerRecRateCardMappings');
        }
    }

    async updateRecRateCard(id: string, data: any) {
        try {
            const response = await lastValueFrom(this.httpService.put(`${this.subBillingUrl}/rec-rate-cards/${id}`, data));
            return response.data;
        } catch (error: any) {
            this.handleProxyError(error, 'updateRecRateCard');
        }
    }

    async getCustomerRecRateCard(customerId: string) {
        try {
            const response = await lastValueFrom(this.httpService.get(`${this.subBillingUrl}/rec-rate-cards/customer/${customerId}`));
            return response.data;
        } catch (error: any) {
            this.handleProxyError(error, 'getCustomerRecRateCard');
        }
    }

    async updateCustomerRecRateCardMapping(customerId: string, data: { rec_rc_id: number }) {
        try {
            const response = await lastValueFrom(this.httpService.put(`${this.subBillingUrl}/rec-rate-cards/customer/${customerId}`, data));
            return response.data;
        } catch (error: any) {
            this.handleProxyError(error, 'updateCustomerRecRateCardMapping');
        }
    }

    /**
     * Existing stats methods...
     */
    async getPlatformStats() {
        // Get basic tenant stats
        const totalTenants = await this.prisma.tenant.count();
        const totalUsers = await this.prisma.user.count();



        // Get telecom stats
        const telecomStats = await this.getTelecomStats();

        // Get wallet stats (now from billing source of truth)
        const walletStats = await this.getWalletStats();

        return {
            tenants: {
                total: totalTenants,
            },
            users: {
                total: totalUsers,
            },
            telecom: telecomStats,
            wallet: walletStats,
        };
    }

    /**
     * Get aggregated telecom statistics across all tenants
     */
    async getTelecomStats() {
        const [
            totalDIDs,
            totalTFNs,
            totalExtensions,
            totalRingGroups,
            totalIVRs,
            totalSchedules,
        ] = await Promise.all([
            this.prisma.dID.count(),
            this.prisma.tFN.count(),
            this.prisma.extension.count(),
            this.prisma.ringGroup.count(),
            this.prisma.iVR.count(),
            this.prisma.operationalSchedule.count(),
        ]);

        // Get active tenants (tenants with at least one DID or TFN)
        const [tenantsWithDIDs, tenantsWithTFNs] = await Promise.all([
            this.prisma.dID.groupBy({
                by: ['tenantId'],
            }),
            this.prisma.tFN.groupBy({
                by: ['tenantId'],
                where: { tenantId: { not: null } }
            }),
        ]);

        const activeTenantIds = new Set([
            ...tenantsWithDIDs.map(t => t.tenantId).filter(Boolean),
            ...tenantsWithTFNs.map(t => t.tenantId).filter(Boolean),
        ]);
        const activeTenants = activeTenantIds.size;

        // Calculate monthly revenue from DIDs and assigned TFNs
        const [didsWithFees, tfnsWithFees] = await Promise.all([
            this.prisma.dID.findMany({
                select: { monthlyFee: true },
            }),
            this.prisma.tFN.findMany({
                where: { tenantId: { not: null } },
                select: { price: true },
            }),
        ]);

        const monthlyRevenue =
            didsWithFees.reduce(
                (sum, did) => sum + (did.monthlyFee ? parseFloat(did.monthlyFee.toString()) : 0),
                0,
            ) +
            tfnsWithFees.reduce(
                (sum, tfn) => sum + (tfn.price ? parseFloat(tfn.price.toString()) : 0),
                0,
            );

        const limitStr = process.env.SYSTEM_LIMIT_EXTENSIONS;
        const limit = limitStr ? parseInt(limitStr, 10) : 500;
        const availableExtensions = Math.max(0, limit - totalExtensions);

        return {
            totalDIDs,
            totalTFNs,
            totalExtensions,
            availableExtensions,
            limitExtensions: limit,
            totalRingGroups,
            totalIVRs,
            totalSchedules,
            activeTenants, // Tenants with telecom services
            monthlyRevenue: monthlyRevenue.toFixed(2),
        };
    }

    /**
     * Get wallet/billing statistics
     */
    async getWalletStats() {
        // Get total balance across all wallets from billing system (source of truth)
        const totalBalance = await this.getBillingTotalBalance();

        // Get transaction count from PBX (local)
        const totalTransactions = await this.prisma.walletTransaction.count();

        return {
            totalBalance: totalBalance.toFixed(2),
            totalTransactions,
        };
    }

    /**
     * Get tenant-specific telecom stats (for detailed view)
     */
    async getTenantTelecomStats(tenantId: string) {
        const [dids, tfns, extensions, ringGroups, ivrs, schedules] = await Promise.all([
            this.prisma.dID.count({ where: { tenantId } }),
            this.prisma.tFN.count({ where: { tenantId } }),
            this.prisma.extension.count({ where: { tenantId } }),
            this.prisma.ringGroup.count({ where: { tenantId } }),
            this.prisma.iVR.count({ where: { tenantId } }),
            this.prisma.operationalSchedule.count({ where: { tenantId } }),
        ]);

        // Calculate DID + TFN monthly fees for this tenant
        const [tenantDIDs, tenantTFNs] = await Promise.all([
            this.prisma.dID.findMany({
                where: { tenantId },
                select: { monthlyFee: true },
            }),
            this.prisma.tFN.findMany({
                where: { tenantId },
                select: { price: true },
            }),
        ]);

        const monthlyFee =
            tenantDIDs.reduce(
                (sum, did) => sum + (did.monthlyFee ? parseFloat(did.monthlyFee.toString()) : 0),
                0,
            ) +
            tenantTFNs.reduce(
                (sum, tfn) => sum + (tfn.price ? parseFloat(tfn.price.toString()) : 0),
                0,
            );

        return {
            dids,
            tfns,
            extensions,
            ringGroups,
            ivrs,
            schedules,
            monthlyFee: monthlyFee.toFixed(2),
        };
    }
    async getSupportStats() {
        const [totalTenants, totalDIDs, recentLogs] = await Promise.all([
            this.prisma.tenant.count(),
            this.prisma.dID.count(),
            this.prisma.auditLog.findMany({
                take: 10,
                orderBy: { createdAt: 'desc' }
            })
        ]);

        // Simple health check
        let systemStatus = 'Healthy';
        try {
            await this.prisma.$queryRaw`SELECT 1`;
        } catch (e) {
            systemStatus = 'Issues Detected';
        }

        return {
            stats: [
                { label: 'Active Tenants', value: totalTenants.toString() },
                { label: 'Total Phone Numbers', value: totalDIDs.toString() },
                { label: 'System Status', value: systemStatus },
                { label: 'Platform Role', value: 'Support' }
            ],
            recentActivity: recentLogs.map(log => ({
                id: log.id,
                type: log.category,
                tenant: log.actorEmail || 'System',
                subject: log.action,
                time: this.formatRelativeTime(log.createdAt),
                status: this.mapCategoryToStatus(log.category)
            }))
        };
    }

    private formatRelativeTime(date: Date): string {
        const now = new Date();
        const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

        if (diffInSeconds < 60) return 'just now';
        if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} mins ago`;
        if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`;
        return `${Math.floor(diffInSeconds / 86400)} days ago`;
    }

    private mapCategoryToStatus(category: string): string {
        switch (category) {
            case 'SYSTEM': return 'warning';
            case 'AUTH': return 'info';
            case 'BILLING': return 'success';
            default: return 'info';
        }
    }

    /**
     * White-label Branding Methods
     */
    async getCurrentBranding() {
        const partner = await this.prisma.partner.findFirst();
        if (!partner) {
            return {
                name: 'Cloud PBX',
                primaryColor: '#3d52a0',
                accentColor: '#ed8f55',
                supportEmail: 'support@telecom-platform.com',
                supportPhone: '+1-800-555-0199',
            };
        }
        return partner;
    }

    async updateCurrentBranding(data: any) {
        const partner = await this.prisma.partner.findFirst();
        const smtpPortVal = data.smtpPort !== undefined && data.smtpPort !== null && data.smtpPort !== '' ? Number(data.smtpPort) : null;
        if (partner) {
            return this.prisma.partner.update({
                where: { id: partner.id },
                data: {
                    domain: data.domain !== undefined ? data.domain : partner.domain,
                    name: data.name,
                    primaryColor: data.primaryColor,
                    accentColor: data.accentColor,
                    logoMain: data.logoMain,
                    logoSidebar: data.logoSidebar,
                    favicon: data.favicon,
                    supportEmail: data.supportEmail,
                    supportPhone: data.supportPhone,
                    smtpHost: data.smtpHost,
                    smtpPort: smtpPortVal,
                    smtpSecure: data.smtpSecure,
                    smtpUser: data.smtpUser,
                    smtpPass: data.smtpPass,
                    smtpFromName: data.smtpFromName,
                    smtpFromEmail: data.smtpFromEmail,
                }
            });
        } else {
            return this.prisma.partner.create({
                data: {
                    domain: 'global',
                    name: data.name || 'Cloud PBX',
                    primaryColor: data.primaryColor || '#3d52a0',
                    accentColor: data.accentColor || '#ed8f55',
                    logoMain: data.logoMain,
                    logoSidebar: data.logoSidebar,
                    favicon: data.favicon,
                    supportEmail: data.supportEmail || 'support@telecom-platform.com',
                    supportPhone: data.supportPhone || '+1-800-555-0199',
                    smtpHost: data.smtpHost,
                    smtpPort: smtpPortVal,
                    smtpSecure: data.smtpSecure,
                    smtpUser: data.smtpUser,
                    smtpPass: data.smtpPass,
                    smtpFromName: data.smtpFromName,
                    smtpFromEmail: data.smtpFromEmail,
                }
            });
        }
    }

    /**
     * Get all active registered extensions from Kamailio
     */
    async getAllActiveExtensionsStatus() {
        const kamailioHost = this.configService.get<string>('KAMAILIO_RPC_URL') || 'http://127.0.0.1:8080/rpc';

        try {
            const response = await lastValueFrom(
                this.httpService.post(kamailioHost, {
                    jsonrpc: "2.0",
                    method: "ul.dump",
                    id: 1
                })
            );

            const result = response.data?.result;
            if (!result || !result.Domains) {
                return { online_count: 0, extensions: [] };
            }

            const activeExtensions = [];

            for (const domainObj of result.Domains) {
                const aors = domainObj.Domain?.AoRs || [];
                for (const aorObj of aors) {
                    const info = aorObj.Info;
                    if (!info || !info.AoR) continue;

                    const sipUsername = info.AoR.split('@')[0];
                    // Extract customer code (e.g. U1003 from U100304). 
                    // Usually the first letter and 4 digits.
                    // Fallback to substring.
                    let customerCode = sipUsername.substring(0, 5).toUpperCase();
                    
                    const contacts = info.Contacts || [];
                    const devices = contacts.map((c: any) => ({
                        address: c.Contact?.Address,
                        expires_in: c.Contact?.Expires,
                        user_agent: c.Contact?.['User-Agent'],
                        received_from: c.Contact?.Received,
                        transport_socket: c.Contact?.Socket,
                        state: c.Contact?.State
                    }));

                    activeExtensions.push({
                        customerCode,
                        extension: sipUsername,
                        domain: info.AoR.split('@')[1],
                        aor: info.AoR,
                        devices
                    });
                }
            }

            return {
                online_count: activeExtensions.length,
                extensions: activeExtensions
            };
        } catch (error) {
            this.logger.error(`Failed to fetch global Kamailio extension status: ${error.message}`);
            return { online_count: 0, extensions: [] };
        }
    }
}
