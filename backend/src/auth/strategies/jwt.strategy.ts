import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { assertTenantServiceAccess } from '../tenant-service-access';
import { Role } from '@prisma/client';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
    constructor(configService: ConfigService, private prisma: PrismaService) {
        super({
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            ignoreExpiration: false,
            secretOrKey: configService.get<string>('jwt.secret') || 'secret',
        });
    }

    async validate(payload: any) {
        const account = await this.prisma.user.findUnique({
            where: { id: payload.sub },
            include: {
                supportProfile: {
                    select: { adminUser: { select: { role: true, status: true, tenantId: true } } },
                },
            },
        });
        if (!account || account.status !== 'ACTIVE') throw new UnauthorizedException('Access denied');
        await assertTenantServiceAccess(this.prisma, account);
        return {
            id: payload.sub,
            email: payload.email,
            role: account.role,
            tenantId: account.tenantId,
            platformSupport: account.role === Role.SUPPORT && account.tenantId === null &&
                account.supportProfile?.adminUser.role === Role.SUPER_ADMIN &&
                account.supportProfile.adminUser.status === 'ACTIVE' &&
                account.supportProfile.adminUser.tenantId === null,
            monitoringEnabled: account.monitoringEnabled,
            impersonation: payload.impersonation,
        };
    }
}
