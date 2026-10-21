import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { assertTenantServiceAccess } from '../tenant-service-access';

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
        const account = await this.prisma.user.findUnique({ where: { id: payload.sub } });
        if (!account || account.status !== 'ACTIVE') throw new UnauthorizedException('Access denied');
        await assertTenantServiceAccess(this.prisma, account);
        return {
            id: payload.sub,
            email: payload.email,
            role: account.role,
            tenantId: account.tenantId,
            monitoringEnabled: account.monitoringEnabled,
            impersonation: payload.impersonation,
        };
    }
}
