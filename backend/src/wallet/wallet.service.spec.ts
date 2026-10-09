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
import { SubscriptionsService } from '../subscriptions/subscriptions.service';

describe('WalletService (switchSubscriptionPlan & Kamailio Sync)', () => {
    let service: WalletService;
    let prisma: any;
    let freeSwitchSync: any;
    let lookupRedis: any;
    let httpService: any;
    let subscriptions: any;

    beforeEach(async () => {
        subscriptions = { activate: jest.fn().mockResolvedValue({ id: 'sub-uuid-1', duration_unit: 'days', duration_count: 15 }) };
        prisma = {
            tenant: {
                findUnique: jest.fn().mockResolvedValue({ id: 'U1010', customerCode: '1010', subBillingCustomerId: 'U1010' }),
            },
            plan: {
                findUnique: jest.fn().mockResolvedValue({
                    id: 'plan-starter-uuid', name: 'Starter', subBillingPlanId: 'tier_1_starter',
                    maxNumbers: 2, maxMonitoringExtensions: 1,
                }),
                update: jest.fn().mockImplementation(({ data }) => Promise.resolve({
                    id: 'plan-starter-uuid', maxExtensions: 5, ...data,
                })),
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
            tFN: { count: jest.fn().mockResolvedValue(0) },
            dID: { count: jest.fn().mockResolvedValue(0) },
            user: { count: jest.fn().mockResolvedValue(0) },
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
                            free_minutes: 0
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
                            name: 'Starter',
                            numbers: 2,
                            monitoring_extensions: 1,
                            amount: 20,
                            validity_months: 1,
                            duration_unit: 'days',
                            duration_count: 15,
                            extensions: 5,
                            free_minutes: 0
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
                { provide: SubscriptionsService, useValue: subscriptions },
            ],
        }).compile();

        service = module.get<WalletService>(WalletService);
    });

    describe('switchSubscriptionPlan', () => {
        it('activates through lifecycle ownership and uses catalog duration without legacy provisioning', async () => {
            const res = await service.switchSubscriptionPlan('U1010', 'tier_1_starter', true);

            expect(res.success).toBe(true);

            expect(subscriptions.activate).toHaveBeenCalledWith('U1010', {
                plan_id: 'tier_1_starter', payment_mode: 'wallet', auto_renew: false,
                operation_key: 'wallet-activation:U1010:tier_1_starter',
            }, 'onboarding');
            expect(httpService.post).not.toHaveBeenCalled();
            expect(prisma.extension.create).not.toHaveBeenCalled();
            expect(prisma.subscription.create).not.toHaveBeenCalled();
            expect(res.data.duration_count).toBe(15);
        });
        it('reuses the activation key after a reconciliation error', async () => {
            subscriptions.activate.mockRejectedValueOnce(new Error('Projection failed'));
            await expect(service.switchSubscriptionPlan('U1010', 'tier_1_starter')).rejects.toThrow('Projection failed');
            await service.switchSubscriptionPlan('U1010', 'tier_1_starter');
            expect(subscriptions.activate.mock.calls[0][1].operation_key).toBe(subscriptions.activate.mock.calls[1][1].operation_key);
        });
        it('rejects retired scheduled switches before contacting billing', async () => {
            await expect(service.switchSubscriptionPlan('U1010', 'tier_1_starter', false)).rejects.toThrow('Scheduled plan switching is retired');
            expect(subscriptions.activate).not.toHaveBeenCalled();
            expect(httpService.get).not.toHaveBeenCalled();
        });
        it('propagates insufficient funds rather than creating a local subscription', async () => {
            subscriptions.activate.mockRejectedValueOnce(new Error('Insufficient funds'));
            await expect(service.switchSubscriptionPlan('U1010', 'tier_1_starter')).rejects.toThrow('Insufficient funds');
            expect(prisma.subscription.create).not.toHaveBeenCalled();
        });
    });
});
