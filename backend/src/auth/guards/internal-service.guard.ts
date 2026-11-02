import { CanActivate, ExecutionContext, Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { REDIS_CLIENT } from '../../redis/redis.module';
import { verifyInternalRequest } from '../internal-service-auth';

@Injectable()
export class InternalServiceGuard implements CanActivate {
    constructor(@Inject(REDIS_CLIENT) private readonly redis: any) { }

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const nonce = verifyInternalRequest(context.switchToHttp().getRequest());
        if (!this.redis?.isOpen) throw new UnauthorizedException('Internal authentication unavailable');
        const accepted = await this.redis.set(`pbx:service-nonce:${nonce}`, '1', { NX: true, EX: 600 });
        if (accepted !== 'OK') throw new UnauthorizedException('Replayed internal request');
        return true;
    }
}
