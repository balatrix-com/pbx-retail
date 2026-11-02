import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { Role } from '@prisma/client';

export interface TenantPrincipal {
    role: Role;
    tenantId?: string | null;
    // Set by JwtStrategy from the current database relationship, never request input.
    platformSupport?: boolean;
}

export function resolveTenantScope(
    user: TenantPrincipal,
    requestedTenantId?: string,
    allowPlatformSupport = false,
): string {
    if (requestedTenantId !== undefined &&
        (typeof requestedTenantId !== 'string' || !requestedTenantId.trim())) {
        throw new BadRequestException('A non-empty tenantId is required');
    }
    const canSelectTenant = user.role === Role.SUPER_ADMIN ||
        (allowPlatformSupport && user.role === Role.SUPPORT &&
            user.tenantId === null && user.platformSupport === true);

    if (requestedTenantId && !canSelectTenant && requestedTenantId !== user.tenantId) {
        throw new ForbiddenException('Cannot access another tenant');
    }
    const tenantId = canSelectTenant ? requestedTenantId ?? user.tenantId : user.tenantId;
    if (typeof tenantId !== 'string' || !tenantId.trim()) {
        throw new ForbiddenException('An authorized tenant is required');
    }
    return tenantId;
}
