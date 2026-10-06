import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { AuditService } from './audit.service';
import { AUDIT_KEY } from './audit.decorator';

@Injectable()
export class AuditInterceptor implements NestInterceptor {
    constructor(private reflector: Reflector, private auditService: AuditService) {}

    intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
        return next.handle().pipe(
            tap(async (result) => {
                const meta = this.reflector.get<{ action: string, category: any }>(AUDIT_KEY, context.getHandler());
                if (!meta) return;

                const req = context.switchToHttp().getRequest();
                const user = req.user;
                
                const rawTarget = result?.data?.id ?? 
                                  result?.id ?? 
                                  req.params?.id ?? 
                                  req.params?.endpointId ?? 
                                  req.params?.carrierId ?? 
                                  req.params?.planId ?? 
                                  req.params?.customerId ?? 
                                  req.body?.id;
                const targetId = rawTarget !== undefined && rawTarget !== null ? String(rawTarget) : undefined;
                
                await this.auditService.log({
                    action: meta.action,
                    category: meta.category,
                    actorId: user?.id !== undefined && user?.id !== null ? String(user.id) : undefined,
                    actorEmail: user?.email,
                    actorType: 'USER',
                    targetId,
                    targetType: meta.category,
                    ipAddress: req.ip,
                    userAgent: req.headers['user-agent'],
                    metadata: { 
                        body: req.body, 
                        params: req.params,
                        query: req.query 
                    }
                });
            })
        );
    }
}
