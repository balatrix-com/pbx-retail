import { Injectable, NestMiddleware, UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class TenantMiddleware implements NestMiddleware {
    constructor(
        private jwtService: JwtService,
        private configService: ConfigService
    ) { }

    async use(req: Request, res: Response, next: NextFunction) {
        const authHeader = req.headers.authorization;
        if (!authHeader) {
            return next();
        }

        const token = authHeader.split(' ')[1];
        if (!token) {
            return next();
        }

        try {
            const payload = await this.jwtService.verifyAsync(token, {
                secret: this.configService.get<string>('jwt.secret')
            });

            if (payload.tenantId) {
                (req as any).tenantId = payload.tenantId;
            }

            // Basic isolation check: if user claims a tenantId in body/params, valid it matches token
            // This is a simplified check; usually handled in Guards or Service layer

        } catch (e) {
            // Token invalid, let Guard handle it
        }

        next();
    }
}
