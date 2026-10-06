import { Injectable, Logger, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { FreeSwitchSyncService } from '../../freeswitch/freeswitch-sync.service';
import { CreateDIDForwardDto, UpdateDIDForwardDto } from './dto';

@Injectable()
export class DIDForwardsService {
    private readonly logger = new Logger(DIDForwardsService.name);

    constructor(
        private prisma: PrismaService,
        private readonly freeSwitchSync: FreeSwitchSyncService,
    ) { }

    async findAll(tenantId: string) {
        return this.prisma.dIDForward.findMany({
            where: { tenantId },
            orderBy: { createdAt: 'desc' },
        });
    }

    async findOne(tenantId: string, id: string) {
        const forward = await this.prisma.dIDForward.findFirst({
            where: { id, tenantId },
        });

        if (!forward) {
            throw new NotFoundException('DID Forward not found');
        }

        return forward;
    }

    async create(tenantId: string, dto: CreateDIDForwardDto) {
        // Enforce system limits
        const limitStr = process.env.SYSTEM_LIMIT_DID_FORWARDS;
        if (limitStr) {
            const limit = parseInt(limitStr, 10);
            if (!isNaN(limit)) {
                const count = await this.prisma.dIDForward.count();
                if (count >= limit) {
                    throw new BadRequestException(`Maximum DID Forward limit of ${limit} has been reached.`);
                }
            }
        }

        // Check feature limit
        const features = await this.prisma.tenantFeature.findUnique({
            where: { tenantId }
        });
        if (features) {
            const count = await this.prisma.dIDForward.count({ where: { tenantId } });
            if (count >= features.didForwardLimit) {
                throw new ForbiddenException(`Limit reached. You can only create up to ${features.didForwardLimit} DID Forwards.`);
            }
        }

        // Generate sequence ID
        const last = await this.prisma.dIDForward.findFirst({
            where: { tenantId },
            orderBy: { sequenceId: 'desc' },
        });
        const sequenceId = (last?.sequenceId || 0) + 1;

        const forward = await this.prisma.dIDForward.create({
            data: {
                tenantId,
                sequenceId,
                name: dto.name,
                destinationNumber: dto.destinationNumber,
            },
        });

        this.logger.log(`Created DID Forward "${forward.name}" for tenant ${tenantId}`);
        await this.freeSwitchSync.syncDIDForward(forward.id);

        return forward;
    }

    async update(tenantId: string, id: string, dto: UpdateDIDForwardDto) {
        const existing = await this.prisma.dIDForward.findFirst({
            where: { id, tenantId },
        });

        if (!existing) {
            throw new NotFoundException('DID Forward not found');
        }

        const updated = await this.prisma.dIDForward.update({
            where: { id },
            data: {
                name: dto.name,
                destinationNumber: dto.destinationNumber,
            },
        });

        this.logger.log(`Updated DID Forward "${updated.name}"`);
        await this.freeSwitchSync.syncDIDForward(updated.id);

        return updated;
    }

    async remove(tenantId: string, id: string) {
        const forward = await this.prisma.dIDForward.findFirst({
            where: { id, tenantId },
            include: { tenant: true },
        });

        if (!forward) {
            throw new NotFoundException('DID Forward not found');
        }

        // Delete from FreeSWITCH
        await this.freeSwitchSync.deleteDIDForward(forward);

        await this.prisma.dIDForward.delete({ where: { id } });

        this.logger.log(`Deleted DID Forward "${forward.name}"`);
        return { message: 'DID Forward deleted successfully' };
    }
}
