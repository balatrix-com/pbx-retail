import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { assertTenantServiceAccess } from '../tenant-service-access';
import { Role } from '@prisma/client';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
    constructor(configService: ConfigService, private prisma: PrismaService) {
        super({
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            passReqToCallback: true,
            ignoreExpiration: false,
            secretOrKey: configService.get<string>('jwt.secret') || 'secret',
        });
    }

    async validate(reqOrPayload: any, payload?: any) {
        const req = payload !== undefined ? reqOrPayload : null;
        const actualPayload = payload !== undefined ? payload : reqOrPayload;
        const account = await this.prisma.user.findUnique({
            where: { id: actualPayload?.sub },
            include: {
                supportProfile: {
                    select: { adminUser: { select: { role: true, status: true, tenantId: true } } },
                },
            },
        });
        if (!account || account.status !== 'ACTIVE') throw new UnauthorizedException('Access denied');
        const requestPath = req?.originalUrl?.split('?')[0] || req?.url?.split('?')[0] || '';
        if (account.forcePasswordChange && ![
            '/api/auth/me', '/auth/me', '/api/auth/logout', '/auth/logout',
        ].includes(requestPath)) {
            throw new ForbiddenException('Password change is required before accessing PBX services');
        }
        await assertTenantServiceAccess(this.prisma, account);
        return {
            id: actualPayload.sub,
            email: actualPayload.email,
            role: account.role,
            tenantId: account.tenantId,
            platformSupport: account.role === Role.SUPPORT && account.tenantId === null &&
                account.supportProfile?.adminUser.role === Role.SUPER_ADMIN &&
                account.supportProfile.adminUser.status === 'ACTIVE' &&
                account.supportProfile.adminUser.tenantId === null,
            monitoringEnabled: account.monitoringEnabled,
            impersonation: actualPayload.impersonation,
        };
    }
}
