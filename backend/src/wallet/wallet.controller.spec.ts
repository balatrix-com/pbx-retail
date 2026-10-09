import { WalletController } from './wallet.controller';
import { Role } from '@prisma/client';

describe('Wallet subscription activation scope', () => {
    const service = { switchSubscriptionPlan: jest.fn().mockResolvedValue({ success: true }) };
    const controller = new WalletController(service as any);
    beforeEach(() => jest.clearAllMocks());
    it('allows super admin onboarding and records the actor', async () => {
        await controller.switchSubscription({ id: 'super', role: Role.SUPER_ADMIN } as any, 'U1004', 'Starter', true);
        expect(service.switchSubscriptionPlan).toHaveBeenCalledWith('U1004', 'Starter', true, 'super');
    });
    it('allows an admin to activate only their own tenant', async () => {
        await controller.switchSubscription({ id: 'admin', role: Role.ADMIN, tenantId: 'U1004' } as any, 'U1004', 'Starter', true);
        expect(() => controller.switchSubscription({ id: 'admin', role: Role.ADMIN, tenantId: 'U1004' } as any, 'U1005', 'Starter', true)).toThrow('Cannot activate another tenant');
    });
});
