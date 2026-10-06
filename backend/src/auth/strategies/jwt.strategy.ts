import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
    constructor(configService: ConfigService) {
        super({
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            ignoreExpiration: false,
            secretOrKey: configService.get<string>('jwt.secret') || 'secret',
        });
    }

    async validate(payload: any) {
        return {
            id: payload.sub,
            email: payload.email,
            role: payload.role,
            tenantId: payload.tenantId,
            monitoringEnabled: payload.monitoringEnabled,
            impersonation: payload.impersonation,
        };
    }
}
