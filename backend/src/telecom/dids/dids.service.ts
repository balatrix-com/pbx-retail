import {
    Injectable,
    NotFoundException,
    BadRequestException,
    Logger,
} from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { lastValueFrom } from 'rxjs';
import { PrismaService } from '../../prisma/prisma.service';
import { FreeSwitchSyncService } from '../../freeswitch/freeswitch-sync.service';
import { CreateDIDDto, UpdateDIDDto } from './dto';
import { LookupRedisService } from '../../redis/lookup-redis.module';

@Injectable()
export class DIDsService {
    private readonly logger = new Logger(DIDsService.name);

    constructor(
        private prisma: PrismaService,
        private freeswitchSync: FreeSwitchSyncService,
        private lookupRedis: LookupRedisService,
        private readonly httpService: HttpService,
        private readonly configService: ConfigService,
    ) { }

    private async syncAssetsToSubBilling(tenantId: string, assets: { tfns?: string[], dids?: string[] }) {
        try {
            const subscription = await this.prisma.subscription.findFirst({
                where: { tenantId },
                orderBy: { createdAt: 'desc' }
            });

            const targetId = subscription?.subBillingSubscriptionId || tenantId;
            const subBilling = this.configService.get<any>('subBilling');
            const apiUrl = subBilling?.apiUrl || process.env.SUB_BILLING_API_URL;
            if (!apiUrl) return;

            const endpoint = `${apiUrl}/pbx/sync-assets/${targetId}`;
            await lastValueFrom(this.httpService.post(endpoint, assets));
            this.logger.log(`Successfully synced DID assets for tenant ${tenantId} to sub-billing`);
        } catch (error: any) {
            this.logger.error(`Failed to sync DID assets to sub-billing for tenant ${tenantId}: ${error.message}`);
        }
    }

    /**
     * Find all DIDs for a tenant
     */
    async findAll(tenantId: string) {
        return this.prisma.dID.findMany({
            where: { tenantId },
            orderBy: { createdAt: 'desc' },
        });
    }

    /**
     * Find one DID by ID
     */
    async findOne(tenantId: string, id: string) {
        const did = await this.prisma.dID.findFirst({
            where: { id, tenantId },
        });

        if (!did) {
            throw new NotFoundException('DID not found');
        }

        return did;
    }

    /**
     * Find all available DIDs
     */
    async findAvailable() {
        return this.prisma.dID.findMany({
            where: { tenantId: null },
            orderBy: { createdAt: 'desc' }
        });
    }

    /**
     * Assign an available DID to a tenant
     */
    async assign(id: string, tenantId: string) {
        const updated = await this.prisma.dID.update({
            where: { id },
            data: { tenantId }
        });

        // Update Redis Lookup DB
        await this.lookupRedis.updateNumberLookup(updated.number, tenantId);

        // Sync to Sub-Billing
        await this.syncAssetsToSubBilling(tenantId, { dids: [updated.number] });

        return updated;
    }

    /**
     * Create a new DID
     * Includes routing validation
     */
    async create(tenantId: string, dto: CreateDIDDto) {
        // Enforce system limits
        const limitStr = process.env.SYSTEM_LIMIT_DIDS;
        if (limitStr) {
            const limit = parseInt(limitStr, 10);
            if (!isNaN(limit)) {
                const count = await this.prisma.dID.count({ where: { NOT: { tenantId: null } } });
                if (count >= limit) {
                    throw new BadRequestException(`Maximum DID limit of ${limit} has been reached.`);
                }
            }
        }

        // Check if DID number already exists
        const existing = await this.prisma.dID.findUnique({
            where: { number: dto.didNumber },
        });

        if (existing) {
            throw new BadRequestException('DID number already exists');
        }

        // Validate route destination exists if routeType is provided and not forward
        if (dto.routeType && dto.routeType !== 'forward') {
            await this.validateRouteDestination(tenantId, dto.routeType, dto.routeDestinationId);
        }

        // Validate forward number is provided for forward type
        if (dto.routeType === 'forward' && !dto.forwardNumber) {
            throw new BadRequestException('Forward number is required for forward route type');
        }

        // Create DID
        const last = await this.prisma.dID.findFirst({
            where: { tenantId },
            orderBy: { sequenceId: 'desc' }
        });
        const sequenceId = (last?.sequenceId || 0) + 1;

        const did = await this.prisma.dID.create({
            data: {
                tenantId,
                sequenceId,
                number: dto.didNumber,
                routeType: dto.routeType,
                routeTargetId: dto.routeDestinationId,
                forwardNumber: dto.forwardNumber,
            },
        });

        // Trigger FreeSWITCH sync
        try {
            await this.freeswitchSync.syncDID(did.id);
        } catch (error: any) {
            this.logger.error(`FreeSWITCH sync failed for DID ${did.id}: ${error.message}`);
            // Don't fail DID creation if sync fails
        }

        // Update Redis Lookup DB
        await this.lookupRedis.updateNumberLookup(did.number, tenantId);

        // Sync to Sub-Billing
        await this.syncAssetsToSubBilling(tenantId, { dids: [did.number] });

        return did;
    }

    /**
     * Update DID routing
     */
    async update(tenantId: string, id: string, dto: UpdateDIDDto) {
        // Verify ownership
        const existing = await this.prisma.dID.findFirst({
            where: { id, tenantId },
        });

        if (!existing) {
            throw new NotFoundException('DID not found');
        }

        // If changing route type or destination, validate
        if (dto.routeType && dto.routeType !== 'forward') {
            const destinationId = dto.routeDestinationId || existing.routeTargetId || undefined;
            await this.validateRouteDestination(tenantId, dto.routeType, destinationId);
        }

        // Validate forward number for forward type
        if (dto.routeType === 'forward' && !dto.forwardNumber && !existing.forwardNumber) {
            throw new BadRequestException('Forward number is required for forward route type');
        }

        // If the number is being changed, handle Redis lookup cleanup
        if (dto.didNumber && dto.didNumber !== existing.number) {
            await this.lookupRedis.deleteNumberLookup(existing.number);
        }

        // Update
        const updated = await this.prisma.dID.update({
            where: { id },
            data: {
                number: dto.didNumber,
                routeType: dto.routeType,
                routeTargetId: dto.routeDestinationId,
                forwardNumber: dto.forwardNumber,
            },
        });

        this.logger.log(`Updated DID ${updated.number}`);

        // Trigger FreeSWITCH sync
        try {
            await this.freeswitchSync.syncDID(updated.id);
        } catch (error: any) {
            this.logger.error(`FreeSWITCH sync failed for DID ${updated.id}: ${error.message}`);
        }

        // Update Redis Lookup DB
        await this.lookupRedis.updateNumberLookup(updated.number, tenantId);

        return updated;
    }

    /**
     * Delete DID
     */
    async remove(tenantId: string, id: string) {
        // Verify ownership
        const did = await this.prisma.dID.findFirst({
            where: { id, tenantId },
        });

        if (!did) {
            throw new NotFoundException('DID not found');
        }

        // Delete
        await this.prisma.dID.delete({ where: { id } });

        this.logger.log(`Deleted DID ${did.number} for tenant ${tenantId}`);

        // Trigger FreeSWITCH cleanup
        try {
            await this.freeswitchSync.deleteDID(did);
        } catch (error: any) {
            this.logger.error(`FreeSWITCH cleanup failed for DID ${did.number}: ${error.message}`);
            // Don't fail DID deletion if cleanup fails
        }

        // Update Redis Lookup DB
        await this.lookupRedis.deleteNumberLookup(did.number);

        return { message: 'DID deleted successfully' };
    }

    /**
     * Validate that the route destination exists for the tenant
     */
    private async validateRouteDestination(
        tenantId: string,
        routeType: string,
        destinationId?: string,
    ): Promise<void> {
        if (!destinationId) {
            throw new BadRequestException(`Destination ID is required for ${routeType} route type`);
        }

        if (routeType === 'extension') {
            const extension = await this.prisma.extension.findFirst({
                where: { id: destinationId, tenantId },
            });
            if (!extension) {
                throw new BadRequestException('Extension not found');
            }
        } else if (routeType === 'ring_group') {
            const ringGroup = await this.prisma.ringGroup.findFirst({
                where: { id: destinationId, tenantId },
            });
            if (!ringGroup) {
                throw new BadRequestException('Ring group not found');
            }
        } else if (routeType === 'ivr') {
            const ivr = await this.prisma.iVR.findFirst({
                where: { id: destinationId, tenantId },
            });
            if (!ivr) {
                throw new BadRequestException('IVR not found');
            }
        } else if (routeType === 'did_forward') {
            const forward = await this.prisma.dIDForward.findFirst({
                where: { id: destinationId, tenantId },
            });
            if (!forward) {
                throw new BadRequestException('DID Forward not found');
            }
        }
    }
}
