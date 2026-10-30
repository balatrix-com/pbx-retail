import { createHash, createHmac, randomUUID, timingSafeEqual } from 'crypto';
import { UnauthorizedException } from '@nestjs/common';

const CLOCK_SKEW_MS = 5 * 60 * 1000;

function serviceSecret(): string {
    const secret = process.env.PBX_SUB_BILLING_SERVICE_SECRET;
    if (!secret || Buffer.byteLength(secret) < 32) {
        throw new UnauthorizedException('Internal service authentication is not configured');
    }
    return secret;
}

function signature(method: string, path: string, timestamp: string, nonce: string, body: Buffer, customerId = '', idempotencyKey = ''): string {
    const digest = createHash('sha256').update(body).digest('hex');
    return createHmac('sha256', serviceSecret())
        .update(`${method.toUpperCase()}\n${path}\n${timestamp}\n${nonce}\n${digest}\n${customerId}\n${idempotencyKey}`)
        .digest('hex');
}

export function signInternalRequest(method: string, url: string, body = '', customerId = '', idempotencyKey = ''): Record<string, string> {
    const timestamp = String(Date.now());
    const nonce = randomUUID();
    const parsed = new URL(url);
    const path = parsed.pathname + parsed.search;
    return {
        'x-pbx-service-time': timestamp,
        'x-pbx-service-nonce': nonce,
        'x-pbx-service-signature': signature(method, path, timestamp, nonce, Buffer.from(body), customerId, idempotencyKey),
    };
}

export function verifyInternalRequest(req: any): string {
    const timestamp = req.headers['x-pbx-service-time'];
    const nonce = req.headers['x-pbx-service-nonce'];
    const received = req.headers['x-pbx-service-signature'];
    if (typeof timestamp !== 'string' || !/^\d{13}$/.test(timestamp) ||
        Math.abs(Date.now() - Number(timestamp)) > CLOCK_SKEW_MS ||
        typeof nonce !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(nonce) ||
        typeof received !== 'string' || !/^[0-9a-f]{64}$/i.test(received)) {
        throw new UnauthorizedException('Invalid internal service request');
    }
    const customerId = typeof req.headers['x-pbx-customer-id'] === 'string' ? req.headers['x-pbx-customer-id'] : '';
    const idempotencyKey = typeof req.headers['idempotency-key'] === 'string' ? req.headers['idempotency-key'] : '';
    const expected = signature(req.method, req.originalUrl, timestamp, nonce, req.rawBody || Buffer.alloc(0), customerId, idempotencyKey);
    if (!timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(received, 'hex'))) {
        throw new UnauthorizedException('Invalid internal service request');
    }
    return nonce;
}
