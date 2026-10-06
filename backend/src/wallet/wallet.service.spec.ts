import { Test, TestingModule } from '@nestjs/testing';
import { WalletService } from './wallet.service';
import { PrismaService } from '../prisma/prisma.service';
import { BillingService } from '../billing/billing.service';
import { NotificationsService } from '../notifications/notifications.service';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { FreeSwitchSyncService } from '../freeswitch/freeswitch-sync.service';
import { LookupRedisService } from '../redis/lookup-redis.module';
import { of } from 'rxjs';

describe('WalletService (switchSubscriptionPlan & Kamailio Sync)', () => {
    let service: WalletService;
    let prisma: any;
    let freeSwitchSync: any;
    let lookupRedis: any;
    let httpService: any;

    beforeEach(async () => {
        prisma = {
            tenant: {
                findUnique: jest.fn().mockResolvedValue({ id: 'U1010', customerCode: '1010', subBillingCustomerId: 'U1010' }),
            },
            plan: {
                findFirst: jest.fn().mockResolvedValue({ id: 'plan-starter-uuid', name: 'Starter' }),
            },
            subscription: {
                findFirst: jest.fn().mockResolvedValue(null),
                create: jest.fn().mockResolvedValue({ id: 'sub-local-1' }),
            },
            extension: {
                count: jest.fn().mockResolvedValue(0),
                findUnique: jest.fn().mockResolvedValue(null),
                create: jest.fn().mockImplementation(({ data }) => Promise.resolve({ id: `ext-uuid-${data.extensionNumber}`, ...data })),
            },
        };

        freeSwitchSync = {
            syncExtension: jest.fn().mockResolvedValue(undefined),
        };

        lookupRedis = {
            updateExtensionLookup: jest.fn().mockResolvedValue(undefined),
        };

        httpService = {
            post: jest.fn().mockReturnValue(
                of({
                    data: {
                        success: true,
                        data: {
                            subscription_id: 'sub-uuid-1',
                            plan_id: 'tier_1_starter',
                            extensions: 5,
                            free_minutes: 100
                        }
                    }
                })
            ),
            get: jest.fn().mockReturnValue(
                of({
                    data: {
                        success: true,
                        data: {
                            plan_id: 'tier_1_starter',
                            extensions: 5,
                            free_minutes: 100
                        }
                    }
                })
            )
        };

        const configService = {
            get: jest.fn().mockReturnValue('http://localhost:5005/api'),
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                WalletService,
                { provide: PrismaService, useValue: prisma },
                { provide: BillingService, useValue: {} },
                { provide: NotificationsService, useValue: {} },
                { provide: HttpService, useValue: httpService },
                { provide: ConfigService, useValue: configService },
                { provide: FreeSwitchSyncService, useValue: freeSwitchSync },
                { provide: LookupRedisService, useValue: lookupRedis },
            ],
        }).compile();

        service = module.get<WalletService>(WalletService);
    });

    describe('switchSubscriptionPlan', () => {
        it('should auto-provision plan extensions and immediately sync FreeSWITCH and Kamailio subscribers', async () => {
            const res = await service.switchSubscriptionPlan('U1010', 'tier_1_starter', true);

            expect(res.success).toBe(true);

            // Should have created 5 extensions
            expect(prisma.extension.create).toHaveBeenCalledTimes(5);
            expect(prisma.extension.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    data: expect.objectContaining({
                        tenantId: 'U1010',
                        extensionNumber: '101001'
                    })
                })
            );

            // FreeSWITCH and Kamailio sync MUST be triggered for every newly created extension!
            expect(freeSwitchSync.syncExtension).toHaveBeenCalledTimes(5);
            expect(freeSwitchSync.syncExtension).toHaveBeenCalledWith('ext-uuid-101001');

            // Redis Lookup MUST be updated
            expect(lookupRedis.updateExtensionLookup).toHaveBeenCalledWith('U1010');
        });
    });
});
