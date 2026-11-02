import { InternalServerErrorException, UnauthorizedException } from '@nestjs/common';
import { OnboardingController } from './onboarding.controller';

describe('OnboardingController provisionTenant authentication', () => {
    const originalToken = process.env.PBX_SYNC_TOKEN;
    const token = 'a'.repeat(32);
    const data = { customerEmail: 'admin@example.test' } as any;
    const onboardingService = {
        provisionTenantFromSubBilling: jest.fn(),
    };
    const freeSwitchSync = { syncExtension: jest.fn() };
    const controller = new OnboardingController(onboardingService as any, freeSwitchSync as any);

    beforeEach(() => {
        jest.clearAllMocks();
    });

    afterAll(() => {
        if (originalToken === undefined) delete process.env.PBX_SYNC_TOKEN;
        else process.env.PBX_SYNC_TOKEN = originalToken;
    });

    it('fails closed when the sync token is missing or too short', async () => {
        for (const configured of [undefined, '', 'short', ' '.repeat(32)]) {
            if (configured === undefined) delete process.env.PBX_SYNC_TOKEN;
            else process.env.PBX_SYNC_TOKEN = configured;

            await expect(controller.provisionTenant(data, { headers: { 'x-sync-token': token } }))
                .rejects.toBeInstanceOf(InternalServerErrorException);
        }
        expect(onboardingService.provisionTenantFromSubBilling).not.toHaveBeenCalled();
    });

    it('rejects missing, malformed, and incorrect supplied tokens', async () => {
        process.env.PBX_SYNC_TOKEN = token;
        for (const supplied of [undefined, ['duplicate', token], 'b'.repeat(32)]) {
            await expect(controller.provisionTenant(data, { headers: { 'x-sync-token': supplied } }))
                .rejects.toBeInstanceOf(UnauthorizedException);
        }
        expect(onboardingService.provisionTenantFromSubBilling).not.toHaveBeenCalled();
    });

    it('preserves provisioning and extension sync for a valid token', async () => {
        process.env.PBX_SYNC_TOKEN = token;
        onboardingService.provisionTenantFromSubBilling.mockResolvedValue({
            tenant: { id: 'tenant-a' },
            user: { id: 'user-a' },
            subscription: { id: 'subscription-a' },
            extensionIdsToSync: ['extension-a'],
        });

        await expect(controller.provisionTenant(data, { headers: { 'x-sync-token': token } }))
            .resolves.toEqual({
                message: 'Tenant provisioned successfully',
                tenantId: 'tenant-a',
                userId: 'user-a',
                subscriptionId: 'subscription-a',
            });
        expect(onboardingService.provisionTenantFromSubBilling).toHaveBeenCalledWith(data);
        expect(freeSwitchSync.syncExtension).toHaveBeenCalledWith('extension-a');
    });
});
