import { Injectable, Inject, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { REDIS_CLIENT } from '../redis/redis.module';
import type { RedisClientType } from 'redis';
import { firstValueFrom } from 'rxjs';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class MonitorService {
    private readonly logger = new Logger(MonitorService.name);

    constructor(
        @Inject(REDIS_CLIENT) private readonly redisClient: RedisClientType,
        private readonly httpService: HttpService,
        private readonly prisma: PrismaService,
    ) { }

    /**
     * Get all active calls for a specific tenant (or all tenants)
     */
    async getActiveCalls(tenantId?: string) {
        try {
            const patterns = new Set<string>();

            if (!tenantId || tenantId === 'all') {
                patterns.add('customer:*:call:*');
            } else {
                const tenant = await this.prisma.tenant.findUnique({
                    where: { id: tenantId },
                    select: { customerCode: true, subBillingCustomerId: true }
                });

                const candidateCodes = new Set<string>();
                candidateCodes.add(tenantId);
                if (tenantId.startsWith('U')) {
                    candidateCodes.add(tenantId.slice(1));
                } else {
                    candidateCodes.add(`U${tenantId}`);
                }

                if (tenant?.customerCode) {
                    candidateCodes.add(tenant.customerCode);
                    if (tenant.customerCode.startsWith('U')) {
                        candidateCodes.add(tenant.customerCode.slice(1));
                    } else {
                        candidateCodes.add(`U${tenant.customerCode}`);
                    }
                }
                if (tenant?.subBillingCustomerId) {
                    candidateCodes.add(tenant.subBillingCustomerId);
                    if (tenant.subBillingCustomerId.startsWith('U')) {
                        candidateCodes.add(tenant.subBillingCustomerId.slice(1));
                    } else {
                        candidateCodes.add(`U${tenant.subBillingCustomerId}`);
                    }
                }

                for (const code of candidateCodes) {
                    patterns.add(`customer:${code}:call:*`);
                }
            }

            const keys = new Set<string>();
            for (const pattern of patterns) {
                for await (const chunk of this.redisClient.scanIterator({
                    MATCH: pattern,
                    COUNT: 100
                })) {
                    for (const key of chunk) {
                        keys.add(key);
                    }
                }
            }

            const calls = [];
            const activeStatuses = ['new', 'ringing', 'answered', 'connected'];

            for (const key of keys) {
                const callData = await this.redisClient.hGetAll(key);
                const rawStatus = (callData.call_status || '').toLowerCase().trim();

                // Filter only active calls (new, ringing, answered, connected)
                if (activeStatuses.includes(rawStatus)) {
                    const normalizedStatus = rawStatus === 'connected' ? 'answered' : rawStatus;
                    calls.push({
                        uuid: callData.uuid,
                        bUuid: callData.b_uuid || '',
                        caller: callData.caller || '',
                        callee: callData.callee || '',
                        status: normalizedStatus,
                        destType: callData.dest_type || '',
                        destValue: callData.dest_value || '',
                        direction: callData.direction || '',
                        startTime: callData.start_ts || null,
                        answerTime: callData.answer_ts || null,
                        duration: callData.duration ? parseInt(callData.duration) : 0,
                        tenantId: callData.customer_id || key.split(':')[1] || tenantId || null,
                    });
                }
            }

            // Sort by start time desc
            return calls.sort((a, b) => {
                const timeA = a.startTime ? parseInt(a.startTime.toString()) : 0;
                const timeB = b.startTime ? parseInt(b.startTime.toString()) : 0;
                return timeB - timeA;
            });

        } catch (error) {
            this.logger.error(`Failed to get active calls for tenant ${tenantId}`, error);
            return [];
        }
    }

    /**
     * Verify if a call belongs to a specific tenant in Redis
     */
    async verifyCallTenant(uuid: string, tenantId: string): Promise<boolean> {
        try {
            if (!tenantId || tenantId === 'all') return true;

            const tenant = await this.prisma.tenant.findUnique({
                where: { id: tenantId },
                select: { customerCode: true, subBillingCustomerId: true }
            });

            const candidateCodes = new Set<string>();
            candidateCodes.add(tenantId);
            if (tenantId.startsWith('U')) {
                candidateCodes.add(tenantId.slice(1));
            } else {
                candidateCodes.add(`U${tenantId}`);
            }

            if (tenant?.customerCode) {
                candidateCodes.add(tenant.customerCode);
                if (tenant.customerCode.startsWith('U')) {
                    candidateCodes.add(tenant.customerCode.slice(1));
                } else {
                    candidateCodes.add(`U${tenant.customerCode}`);
                }
            }
            if (tenant?.subBillingCustomerId) {
                candidateCodes.add(tenant.subBillingCustomerId);
                if (tenant.subBillingCustomerId.startsWith('U')) {
                    candidateCodes.add(tenant.subBillingCustomerId.slice(1));
                } else {
                    candidateCodes.add(`U${tenant.subBillingCustomerId}`);
                }
            }

            for (const code of candidateCodes) {
                const key = `customer:${code}:call:${uuid}`;
                if (await this.redisClient.exists(key) === 1) {
                    return true;
                }
            }
            return false;
        } catch (error) {
            this.logger.error(`Failed to verify call tenant ownership for ${uuid}: ${error.message}`);
            return false;
        }
    }

    /**
     * Initiate Barge / Whisper / Listen
     */
    async initiateBarge(
        uuid_in: string,
        uuid_out: string,
        adminExtension: string,
        mode: 'barge' | 'listen' | 'whisper'
    ) {
        const url = process.env.BARGE_API_URL || 'http://localhost:8003';
        const apiKey = process.env.BARGE_API_KEY;

        this.logger.log(`Initiating ${mode} on call ${uuid_in} for admin ${adminExtension}`);

        try {
            const response = await firstValueFrom(
                this.httpService.post(
                    `${url}/barge`,
                    {
                        uuid_in,
                        uuid_out,
                        admin_extension: adminExtension,
                        mode,
                    },
                    {
                        headers: {
                            'Content-Type': 'application/json',
                            'X-API-Key': apiKey,
                        },
                    },
                ),
            );
            return response.data;
        } catch (error) {
            this.logger.error(`Barge API failed: ${error.message}`, error.response?.data);
            throw new Error(error.response?.data?.detail || 'Failed to initiate barge');
        }
    }
}
