import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { Role } from '@prisma/client';
import { resolveTenantScope } from './tenant-scope';

describe('Tenant scope', () => {
    it.each([Role.ADMIN, Role.SUPPORT])('confines %s to its own tenant', role => {
        const user = { role, tenantId: 'tenant-a', platformSupport: true };
        expect(resolveTenantScope(user, undefined, true)).toBe('tenant-a');
        expect(resolveTenantScope(user, 'tenant-a', true)).toBe('tenant-a');
        expect(() => resolveTenantScope(user, 'tenant-b', true)).toThrow(ForbiddenException);
    });

    it('allows an explicitly verified platform support principal only on opted-in routes', () => {
        const user = { role: Role.SUPPORT, tenantId: null, platformSupport: true };
        expect(resolveTenantScope(user, 'tenant-b', true)).toBe('tenant-b');
        expect(() => resolveTenantScope(user, 'tenant-b')).toThrow(ForbiddenException);
        expect(() => resolveTenantScope({ ...user, platformSupport: false }, 'tenant-b', true))
            .toThrow(ForbiddenException);
    });

    it('allows SUPER_ADMIN to select a tenant', () => {
        expect(resolveTenantScope({ role: Role.SUPER_ADMIN, tenantId: null }, 'tenant-b')).toBe('tenant-b');
    });

    it.each([null, undefined, ''])('rejects missing tenant context (%s) before querying data', tenantId => {
        expect(() => resolveTenantScope({ role: Role.ADMIN, tenantId })).toThrow(ForbiddenException);
    });

    it.each(['', ' ', ['tenant-b'], { tenantId: 'tenant-b' }])('rejects malformed selectors: %s', tenantId => {
        expect(() => resolveTenantScope({ role: Role.SUPER_ADMIN }, tenantId as any)).toThrow(BadRequestException);
    });
});
