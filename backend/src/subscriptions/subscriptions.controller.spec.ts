import { Role } from '@prisma/client';
import { SubscriptionsController } from './subscriptions.controller';

describe('SubscriptionsController legacy onboarding compatibility', () => {
  const service = { activate: jest.fn() };
  const controller = new SubscriptionsController(service as any);

  beforeEach(() => service.activate.mockReset());

  it('adds a stable key only to the old Super Admin wallet activation request', () => {
    const body = { tenantId: 'U1049', plan_id: 'Starter', payment_mode: 'wallet' };
    controller.activate({ role: Role.SUPER_ADMIN, id: 'admin-1' }, body);
    expect(service.activate).toHaveBeenCalledWith('U1049', {
      ...body,
      auto_renew: false,
      operation_key: 'wallet-activation:U1049:Starter',
    }, 'admin-1');
    expect(body).not.toHaveProperty('operation_key');
  });

  it('does not invent a key for ordinary activations', () => {
    const body = { tenantId: 'U1049', plan_id: 'Starter', payment_mode: 'wallet', duration_count: 1 };
    controller.activate({ role: Role.SUPER_ADMIN, id: 'admin-1' }, body);
    expect(service.activate).toHaveBeenCalledWith('U1049', body, 'admin-1');
  });
});
