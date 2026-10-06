import { Injectable, Inject, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { PrismaService } from '../../prisma/prisma.service';
import { WalletService } from '../../wallet/wallet.service';
import { REDIS_CLIENT } from '../../redis/redis.module';
import type { RedisClientType } from 'redis';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class AnalyticsService {
    private readonly logger = new Logger(AnalyticsService.name);

    constructor(
        private readonly prisma: PrismaService,
        private readonly httpService: HttpService,
        private readonly walletService: WalletService,
        private readonly configService: ConfigService,
        @Inject(REDIS_CLIENT) private readonly redisClient: RedisClientType,
    ) { }

    // ---------------------------------------------------------------------------
    // Internal helpers
    // ---------------------------------------------------------------------------

    private async fetchCDRs(tenantId: string, filters: Record<string, string> = {}): Promise<any[]> {
        try {
            const customerId = await this.walletService.getSubBillingCustomerId(tenantId);
            const response = await firstValueFrom(
                this.httpService.get(`${this.walletService.subBillingUrl}/pbx/cdrs/${customerId}`, {
                    params: { ...filters, limit: '9999' },
                    timeout: 8000,
                })
            );
            return response.data?.data || response.data || [];
        } catch (err) {
            this.logger.warn(`Sub-Billing CDR fetch failed for tenant ${tenantId}: ${err.message}`);
            return [];
        }
    }

    // ---------------------------------------------------------------------------
    // Public methods
    // ---------------------------------------------------------------------------

    /**
     * Summary KPIs — total calls, answered, missed, avg duration, answer rate
     */
    async getCallSummary(tenantId: string, startDate?: string, endDate?: string) {
        const filters: Record<string, string> = {};
        if (startDate) filters.startDate = startDate;
        if (endDate) filters.endDate = endDate;

        const cdrs = await this.fetchCDRs(tenantId, filters);

        if (cdrs.length === 0) {
            // Fallback: derive totals from UsageRecord table
            const records = await this.prisma.usageRecord.findMany({ where: { tenantId } });
            const totalMinutes = records.reduce((s, r) => s + r.minutes, 0);
            const totalCost = records.reduce((s, r) => s + Number(r.cost), 0);
            return {
                totalCalls: records.length,
                answeredCalls: records.length,
                missedCalls: 0,
                totalDuration: totalMinutes * 60,
                averageDuration: records.length > 0 ? Math.round((totalMinutes * 60) / records.length) : 0,
                totalCost: totalCost.toFixed(2),
                answerRate: '100.0',
            };
        }

        const totalCalls = cdrs.length;
        const answeredCdrs = cdrs.filter(c => (c.billsec ?? c.duration ?? 0) > 0);
        const answeredCalls = answeredCdrs.length;
        const missedCalls = totalCalls - answeredCalls;
        const totalDuration = answeredCdrs.reduce((s, c) => s + (c.billsec ?? 0), 0);
        const averageDuration = answeredCalls > 0 ? Math.round(totalDuration / answeredCalls) : 0;
        const answerRate = totalCalls > 0 ? ((answeredCalls / totalCalls) * 100).toFixed(1) : '0.0';

        return {
            totalCalls,
            answeredCalls,
            missedCalls,
            totalDuration,
            averageDuration,
            totalCost: '0.00', // Cost is tracked via UsageRecord / wallet
            answerRate,
        };
    }

    /**
     * Daily call volume — inbound + outbound grouped by date
     */
    async getDailyCallVolume(tenantId: string, days: number = 30) {
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(endDate.getDate() - (days - 1));

        const filters = {
            startDate: startDate.toISOString().split('T')[0] + ' 00:00:00',
            endDate: endDate.toISOString().split('T')[0] + ' 23:59:59',
        };

        const cdrs = await this.fetchCDRs(tenantId, filters);

        // Build a date-keyed map
        const map: Record<string, { inbound: number; outbound: number; duration: number }> = {};

        // Initialize all days with zeros
        for (let i = 0; i < days; i++) {
            const d = new Date(startDate);
            d.setDate(startDate.getDate() + i);
            const key = d.toISOString().split('T')[0];
            map[key] = { inbound: 0, outbound: 0, duration: 0 };
        }

        for (const cdr of cdrs) {
            const rawDate = cdr.created_at || cdr.start_time || cdr.timestamp;
            if (!rawDate) continue;
            const key = new Date(rawDate).toISOString().split('T')[0];
            if (!map[key]) continue;
            const isInbound = (cdr.call_type || cdr.direction || '').toLowerCase() === 'inbound';
            if (isInbound) {
                map[key].inbound++;
            } else {
                map[key].outbound++;
            }
            map[key].duration += cdr.billsec ?? 0;
        }

        return Object.entries(map).map(([date, v]) => ({
            date,
            inbound: v.inbound,
            outbound: v.outbound,
            total: v.inbound + v.outbound,
            duration: v.duration,
        }));
    }

    /**
     * Calls grouped by DID/phone number
     */
    async getCallsByDID(tenantId: string, startDate?: string, endDate?: string) {
        const filters: Record<string, string> = {};
        if (startDate) filters.startDate = startDate;
        if (endDate) filters.endDate = endDate;

        const [cdrs, dids] = await Promise.all([
            this.fetchCDRs(tenantId, filters),
            this.prisma.dID.findMany({ where: { tenantId }, select: { number: true } }),
        ]);

        const didSet = new Set(dids.map(d => d.number));
        const map: Record<string, { callCount: number; totalDuration: number }> = {};

        for (const cdr of cdrs) {
            // The callee (destination) is the DID for inbound calls
            const didNumber = cdr.callee || cdr.destination || cdr.to_number || '';
            if (!didNumber) continue;
            if (!map[didNumber]) map[didNumber] = { callCount: 0, totalDuration: 0 };
            map[didNumber].callCount++;
            map[didNumber].totalDuration += cdr.billsec ?? 0;
        }

        // If no CDR data, use real DIDs with zeroed metrics
        if (Object.keys(map).length === 0 && dids.length > 0) {
            return dids.map(d => ({
                didNumber: d.number,
                callCount: 0,
                totalDuration: 0,
                averageDuration: 0,
            }));
        }

        return Object.entries(map)
            .sort((a, b) => b[1].callCount - a[1].callCount)
            .slice(0, 10)
            .map(([didNumber, v]) => ({
                didNumber,
                callCount: v.callCount,
                totalDuration: v.totalDuration,
                averageDuration: v.callCount > 0 ? Math.round(v.totalDuration / v.callCount) : 0,
            }));
    }

    /**
     * Calls grouped by hour of day (0–23)
     */
    async getCallsByHour(tenantId: string, startDate?: string, endDate?: string) {
        const filters: Record<string, string> = {};
        if (startDate) filters.startDate = startDate;
        if (endDate) filters.endDate = endDate;

        const cdrs = await this.fetchCDRs(tenantId, filters);
        const hourCounts = new Array(24).fill(0);

        for (const cdr of cdrs) {
            const rawDate = cdr.created_at || cdr.start_time || cdr.timestamp;
            if (!rawDate) continue;
            const hour = new Date(rawDate).getHours();
            hourCounts[hour]++;
        }

        return hourCounts.map((calls, hour) => ({ hour, calls }));
    }

    /**
     * Cost breakdown from UsageRecord + real DID count
     */
    async getCostBreakdown(tenantId: string, month?: string) {
        const [records, didCount] = await Promise.all([
            this.prisma.usageRecord.findMany({ where: { tenantId } }),
            this.prisma.dID.count({ where: { tenantId } }),
        ]);

        const totalMinutes = records.reduce((s, r) => s + r.minutes, 0);
        const totalCallCost = records.reduce((s, r) => s + Number(r.cost), 0);
        const didFees = didCount * 2.0; // $2/DID/month

        // Estimate in/out split: 60/40
        const inboundMinutes = Math.round(totalMinutes * 0.6);
        const outboundMinutes = totalMinutes - inboundMinutes;
        const inboundCost = inboundMinutes * 0.005;
        const outboundCost = outboundMinutes * 0.01;
        const totalCost = totalCallCost > 0 ? totalCallCost : (inboundCost + outboundCost + didFees);

        const pct = (v: number) => totalCost > 0 ? `${((v / totalCost) * 100).toFixed(0)}%` : '0%';

        return {
            didFees: didFees.toFixed(2),
            callCosts: totalCallCost.toFixed(2),
            totalCost: totalCost.toFixed(2),
            breakdown: [
                { category: 'DID Monthly Fees', amount: didFees.toFixed(2), percentage: pct(didFees) },
                { category: 'Inbound Minutes', amount: inboundCost.toFixed(2), percentage: pct(inboundCost) },
                { category: 'Outbound Minutes', amount: outboundCost.toFixed(2), percentage: pct(outboundCost) },
            ],
            minutes: {
                inbound: inboundMinutes,
                outbound: outboundMinutes,
                total: totalMinutes,
            },
        };
    }

    /**
     * Top extensions by call volume
     */
    async getTopExtensions(tenantId: string, limit: number = 10) {
        const filters: Record<string, string> = {};
        const [cdrs, extensions] = await Promise.all([
            this.fetchCDRs(tenantId, filters),
            this.prisma.extension.findMany({
                where: { tenantId },
                select: { extensionNumber: true, name: true },
                take: limit,
            }),
        ]);

        const extMap: Record<string, { callCount: number; duration: number }> = {};

        for (const cdr of cdrs) {
            const ext = cdr.caller || cdr.from_user || '';
            if (!ext) continue;
            if (!extMap[ext]) extMap[ext] = { callCount: 0, duration: 0 };
            extMap[ext].callCount++;
            extMap[ext].duration += cdr.billsec ?? 0;
        }

        return extensions.map(ext => ({
            extensionNumber: ext.extensionNumber,
            name: ext.name || `Extension ${ext.extensionNumber}`,
            callCount: extMap[ext.extensionNumber]?.callCount ?? 0,
            duration: extMap[ext.extensionNumber]?.duration ?? 0,
        })).sort((a, b) => b.callCount - a.callCount);
    }

    /**
     * Live call stats — reads Redis directly for real-time counts
     */
    async getLiveStats(tenantId: string) {
        try {
            const pattern = `customer:${tenantId}:call:*`;
            const keys = await this.redisClient.keys(pattern);

            let ringing = 0;
            let answered = 0;
            let inbound = 0;
            let outbound = 0;

            for (const key of keys) {
                const data = await this.redisClient.hGetAll(key);
                const status = data.call_status || '';
                const direction = (data.direction || '').toLowerCase();

                if (status === 'ringing' || status === 'new') ringing++;
                if (status === 'answered') answered++;
                if (direction === 'inbound') inbound++;
                else outbound++;
            }

            return {
                activeCalls: keys.length,
                ringing,
                answered,
                inbound,
                outbound,
                timestamp: Date.now(),
            };
        } catch (err) {
            this.logger.warn(`getLiveStats failed for ${tenantId}: ${err.message}`);
            return { activeCalls: 0, ringing: 0, answered: 0, inbound: 0, outbound: 0, timestamp: Date.now() };
        }
    }

    /**
     * Proxy Dashboard — Fetches from internal analytics service (port 8001)
     */
    async getProxyDashboard(tenantId: string, range: string) {
        try {
            const tenant = await this.prisma.tenant.findUnique({
                where: { id: tenantId },
                select: { customerCode: true }
            });

            if (!tenant || !tenant.customerCode) {
                this.logger.warn(`Tenant ${tenantId} has no customerCode, cannot fetch analytics`);
                return null;
            }

            const analyticsUrl = this.configService.get('ANALYTICS_ENGINE_URL') || 'http://localhost:8001';
            const response = await firstValueFrom(
                this.httpService.get(`${analyticsUrl}/analytics/dashboard`, {
                    params: { customer_id: tenant.customerCode, range },
                    timeout: 5000,
                })
            );
            return response.data;
        } catch (err) {
            this.logger.error(`Failed to proxy analytics dashboard for tenant ${tenantId}: ${err.message}`);
            throw err;
        }
    }
    /**
     * Global Dashboard — Fetches system-wide analytics for Super Admin (with optional tenant filter)
     */
    async getGlobalDashboard(range: string, customerId?: string) {
        try {
            const analyticsUrl = this.configService.get('ANALYTICS_ENGINE_URL') || 'http://localhost:8001';
            const params: any = { range };
            if (customerId && customerId !== 'all') {
                params.customer_id = customerId;
            }
            const response = await firstValueFrom(
                this.httpService.get(`${analyticsUrl}/analytics/dashboard`, {
                    params,
                    timeout: 8000,
                })
            );
            return response.data;
        } catch (err: any) {
            this.logger.error(`Failed to fetch global analytics dashboard: ${err.message}`);
            throw err;
        }
    }
}
