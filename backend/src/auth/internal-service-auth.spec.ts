import { UnauthorizedException } from '@nestjs/common';
import { signInternalRequest, verifyInternalRequest } from './internal-service-auth';

describe('internal service request signature', () => {
    const previous = process.env.PBX_SUB_BILLING_SERVICE_SECRET;
    beforeAll(() => { process.env.PBX_SUB_BILLING_SERVICE_SECRET = 'test-only-service-secret-with-at-least-32-bytes'; });
    afterAll(() => {
        if (previous === undefined) delete process.env.PBX_SUB_BILLING_SERVICE_SECRET;
        else process.env.PBX_SUB_BILLING_SERVICE_SECRET = previous;
    });

    function request(body: string) {
        const headers = signInternalRequest('POST', 'http://127.0.0.1:3000/api/internal/extensions/sync-from-billing', body);
        return { method: 'POST', originalUrl: '/api/internal/extensions/sync-from-billing', headers, rawBody: Buffer.from(body) };
    }

    it('accepts a signed raw body and rejects tampering', () => {
        const req = request('{"subscriptionId":"SUB-A"}');
        expect(verifyInternalRequest(req)).toBe(req.headers['x-pbx-service-nonce']);
        req.rawBody = Buffer.from('{"subscriptionId":"SUB-B"}');
        expect(() => verifyInternalRequest(req)).toThrow(UnauthorizedException);
    });

    it('rejects an expired timestamp and unsigned customer scope', () => {
        const req = request('{}');
        req.headers['x-pbx-service-time'] = String(Date.now() - 10 * 60 * 1000);
        expect(() => verifyInternalRequest(req)).toThrow(UnauthorizedException);
        const scoped = request('{}');
        scoped.headers['x-pbx-customer-id'] = 'another-customer';
        expect(() => verifyInternalRequest(scoped)).toThrow(UnauthorizedException);
    });
});
