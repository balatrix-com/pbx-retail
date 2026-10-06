import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AuditService {
    constructor(private prisma: PrismaService) { }

    async log(params: {
        tenantId?: string;
        userId?: string;
        action: string;
        resource: string;
        metadata?: any;
        ipAddress?: string;
    }) {
        // Fire and forget or await? Safer to await but non-blocking critical path ideally.
        // For now await to ensure consistency for tests.
        try {
            await this.prisma.auditLog.create({
                data: {
                    action: params.action,
                    category: 'SYSTEM', // Default for legacy calls
                    actorId: params.userId,
                    actorType: 'USER',
                    targetId: params.resource, // Use resource as target
                    targetType: 'LEGACY_RESOURCE',
                    metadata: {
                        ...params.metadata,
                        tenantId: params.tenantId,
                        originalResource: params.resource
                    },
                    ipAddress: params.ipAddress
                }
            });
        } catch (e) {
            console.error('Audit Log Failed:', e);
        }
    }
}
