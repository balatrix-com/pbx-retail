import { Test, TestingModule } from '@nestjs/testing';
import { OnboardingService } from './onboarding.service';
import { PrismaService } from '../prisma/prisma.service';
import { BillingService } from '../billing/billing.service';
import { InvoiceService } from '../billing/invoice.service';
import { WalletService } from '../wallet/wallet.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { FreeSwitchSyncService } from '../freeswitch/freeswitch-sync.service';
import { StripeService } from '../payments/stripe.service';
import { NotificationsService } from '../notifications/notifications.service';
import { LookupRedisService } from '../redis/lookup-redis.module';
import { HttpService } from '@nestjs/axios';
import { MailService } from '../mail/mail.service';

describe('OnboardingService (Unit)', () => {
    let service: OnboardingService;
    let prisma: any;

    beforeEach(async () => {
        prisma = {
            tenant: {
                findUnique: jest.fn(),
                create: jest.fn().mockImplementation(({ data }) => Promise.resolve({ ...data, id: data.id || 'mock-id' })),
                update: jest.fn(),
                count: jest.fn().mockResolvedValue(0),
            },
            user: {
                findUnique: jest.fn(),
                create: jest.fn().mockImplementation(({ data }) => Promise.resolve({ ...data, id: 'user-id' })),
                update: jest.fn(),
            },
            plan: {
                findFirst: jest.fn().mockResolvedValue({ id: 'plan-id', name: 'Basic Plan', freeMinutes: 100 }),
            },
            subscription: {
                findUnique: jest.fn(),
                create: jest.fn().mockImplementation(({ data }) => Promise.resolve({ ...data, id: 'sub-id' })),
            },
            extension: {
                count: jest.fn().mockResolvedValue(0),
                create: jest.fn().mockImplementation(({ data }) => Promise.resolve({ ...data, id: 'ext-id' })),
            },
            tFN: {
                findUnique: jest.fn(),
                update: jest.fn(),
            },
            $transaction: jest.fn().mockImplementation((cb) => cb(prisma)),
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                OnboardingService,
                { provide: PrismaService, useValue: prisma },
                { provide: BillingService, useValue: {} },
                { provide: InvoiceService, useValue: {} },
                { provide: WalletService, useValue: {} },
                { provide: JwtService, useValue: {} },
                { provide: ConfigService, useValue: { get: jest.fn() } },
                { provide: FreeSwitchSyncService, useValue: { syncTFN: jest.fn().mockResolvedValue({}) } },
                { provide: StripeService, useValue: {} },
                { provide: NotificationsService, useValue: { createNotification: jest.fn() } },
                { provide: LookupRedisService, useValue: { updateExtensionLookup: jest.fn(), updateNumberLookup: jest.fn() } },
                { provide: HttpService, useValue: { get: jest.fn(), post: jest.fn() } },
                { provide: MailService, useValue: { sendOnboardingCompletionEmail: jest.fn() } },
            ],
        }).compile();

        service = module.get<OnboardingService>(OnboardingService);
    });

    it('should extract numeric company code from U0010 and use it for extensions', async () => {
        const data = {
            subBillingCustomerId: 'U0010',
            subBillingSubscriptionId: 'SUB-001',
            customerName: 'Test Customer',
            customerEmail: 'test@example.com',
            planName: 'Basic Plan',
            extensionCount: 2,
            freeMinutes: 100,
        };

        const result = await service.provisionTenantFromSubBilling(data as any);

        // Verify tenant creation
        expect(prisma.tenant.create).toHaveBeenCalledWith(expect.objectContaining({
            data: expect.objectContaining({
                id: 'U0010',
                subBillingCustomerId: 'U0010',
                customerCode: '0010', // THE CRITICAL CHECK
            }),
        }));

        // Verify extension creation using 0010 as prefix
        expect(prisma.extension.create).toHaveBeenCalledWith(expect.objectContaining({
            data: expect.objectContaining({
                extensionNumber: '001001', // Prefix + Suffix
                sipUsername: '001001_0010',
                sipPassword: '123456',
            }),
        }));

        expect(prisma.extension.create).toHaveBeenCalledWith(expect.objectContaining({
            data: expect.objectContaining({
                extensionNumber: '001002',
                sipUsername: '001002_0010',
                sipPassword: '123456',
            }),
        }));

        expect(result.tenant.customerCode).toBe('0010');
    });
});
