import { UnauthorizedException } from '@nestjs/common';
import { signInternalRequest } from '../internal-service-auth';
import { InternalServiceGuard } from './internal-service.guard';

describe('Internal service replay boundary', () => {
    const previous = process.env.PBX_SUB_BILLING_SERVICE_SECRET;
    beforeAll(() => { process.env.PBX_SUB_BILLING_SERVICE_SECRET = 'test-only-service-secret-with-at-least-32-bytes'; });
    afterAll(() => {
        if (previous === undefined) delete process.env.PBX_SUB_BILLING_SERVICE_SECRET;
        else process.env.PBX_SUB_BILLING_SERVICE_SECRET = previous;
    });

    function context() {
        const url = 'http://localhost:3000/api/internal/subscriptions/events';
        const body = '{"event_id":"test"}';
        const request = {
            method: 'POST', originalUrl: '/api/internal/subscriptions/events',
            headers: signInternalRequest('POST', url, body), rawBody: Buffer.from(body),
        };
        return { switchToHttp: () => ({ getRequest: () => request }) } as any;
    }

    it('accepts one signed nonce and rejects replay', async () => {
        const redis = { isOpen: true, set: jest.fn().mockResolvedValueOnce('OK').mockResolvedValueOnce(null) };
        const guard = new InternalServiceGuard(redis);
        const request = context();
        await expect(guard.canActivate(request)).resolves.toBe(true);
        await expect(guard.canActivate(request)).rejects.toThrow(UnauthorizedException);
        expect(redis.set).toHaveBeenCalledTimes(2);
    });

    it('fails closed when nonce storage is unavailable', async () => {
        const guard = new InternalServiceGuard({ isOpen: false, set: jest.fn() });
        await expect(guard.canActivate(context())).rejects.toThrow(UnauthorizedException);
    });
});
