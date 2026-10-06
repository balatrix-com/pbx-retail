import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';

@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(Strategy, 'jwt-refresh') {
    constructor(configService: ConfigService) {
        super({
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            secretOrKey: configService.get<string>('jwt.refreshSecret') || 'refresh_secret',
            passReqToCallback: true,
        });
    }

    validate(req: Request, payload: any) {
        const refreshToken = req.get('Authorization')?.replace('Bearer', '').trim();
        if (!refreshToken) throw new Error('Refresh token malformed');
        return {
            ...payload,
            id: payload.sub,
            refreshToken
        };
    }
}
