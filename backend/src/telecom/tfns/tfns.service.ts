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
import { CreateTFNDto, UpdateTFNDto } from './dto';
import { LookupRedisService } from '../../redis/lookup-redis.module';

@Injectable()
export class TFNsService {
    private readonly logger = new Logger(TFNsService.name);

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
            this.logger.log(`Successfully synced TFN assets for tenant ${tenantId} to sub-billing`);
        } catch (error: any) {
            this.logger.error(`Failed to sync TFN assets to sub-billing for tenant ${tenantId}: ${error.message}`);
        }
    }

    /**
     * Find all TFNs for a tenant
     */
    async findAll(tenantId: string) {
        return this.prisma.tFN.findMany({
            where: { tenantId },
            orderBy: { createdAt: 'desc' },
        });
    }

    /**
     * Find one TFN by ID
     */
    async findOne(tenantId: string, id: string) {
        const tfn = await this.prisma.tFN.findFirst({
            where: { id, tenantId },
        });

        if (!tfn) {
            throw new NotFoundException('TFN not found');
        }

        return tfn;
    }

    /**
     * Create a new TFN
     */
    async create(tenantId: string, dto: CreateTFNDto) {
        // Enforce system limits
        const limitStr = process.env.SYSTEM_LIMIT_TFNS;
        if (limitStr) {
            const limit = parseInt(limitStr, 10);
            if (!isNaN(limit)) {
                const count = await this.prisma.tFN.count({ where: { NOT: { tenantId: null } } });
                if (count >= limit) {
                    throw new BadRequestException(`Maximum Toll-Free Number limit of ${limit} has been reached.`);
                }
            }
        }

        // Check if TFN number already exists
        const existing = await this.prisma.tFN.findUnique({
            where: { number: dto.tfnNumber },
        });

        if (existing) {
            throw new BadRequestException('TFN number already exists');
        }

        // Validate route destination exists
        if (dto.routeType && dto.routeType !== 'forward') {
            await this.validateRouteDestination(tenantId, dto.routeType, dto.routeDestinationId);
        }

        // Validate forward number is provided for forward type
        if (dto.routeType === 'forward' && !dto.forwardNumber) {
            throw new BadRequestException('Forward number is required for forward route type');
        }

        // Create TFN
        const tfn = await this.prisma.tFN.create({
            data: {
                tenantId,
                number: dto.tfnNumber,
                routeType: dto.routeType,
                routeTargetId: dto.routeDestinationId,
                forwardEnabled: dto.routeType === 'forward',
                forwardNumber: dto.forwardNumber,
                status: 'ASSIGNED',
            },
        });

        this.logger.log(`Created TFN ${tfn.number} for tenant ${tenantId}`);
        await this.freeswitchSync.syncTFN(tfn.id);
        
        // Update Redis Lookup DB
        await this.lookupRedis.updateNumberLookup(tfn.number, tenantId);

        // Sync to Sub-Billing
        await this.syncAssetsToSubBilling(tenantId, { tfns: [tfn.number] });
        
        return tfn;
    }

    /**
     * Update TFN
     */
    async update(tenantId: string, id: string, dto: UpdateTFNDto) {
        // Verify ownership
        const existing = await this.prisma.tFN.findFirst({
            where: { id, tenantId },
        });

        if (!existing) {
            throw new NotFoundException('TFN not found');
        }

        // Validate route destination if changing
        if (dto.routeType && dto.routeType !== 'forward') {
            await this.validateRouteDestination(tenantId, dto.routeType, dto.routeDestinationId);
        }

        if (dto.routeType === 'forward' && !dto.forwardNumber && !existing.forwardNumber) {
            throw new BadRequestException('Forward number is required for forward route type');
        }

        // If the number is being changed, handle Redis lookup cleanup
        if (dto.tfnNumber && dto.tfnNumber !== existing.number) {
            await this.lookupRedis.deleteNumberLookup(existing.number);
        }

        // Update
        const updated = await this.prisma.tFN.update({
            where: { id },
            data: {
                ...(dto.tfnNumber && { number: dto.tfnNumber }),
                ...(dto.routeType && { routeType: dto.routeType }),
                ...(dto.routeDestinationId !== undefined && { routeTargetId: dto.routeDestinationId }),
                ...(dto.forwardNumber !== undefined && { forwardNumber: dto.forwardNumber }),
                ...(dto.routeType === 'forward' ? { forwardEnabled: true } : { forwardEnabled: false }),
            },
        });

        this.logger.log(`Updated TFN ${updated.number}`);
        await this.freeswitchSync.syncTFN(updated.id);
        
        // Update Redis Lookup DB
        if (updated.tenantId) {
            await this.lookupRedis.updateNumberLookup(updated.number, updated.tenantId);
        }

        return updated;
    }

    /**
     * Delete TFN
     */
    async remove(tenantId: string, id: string) {
        // Verify ownership
        const tfn = await this.prisma.tFN.findFirst({
            where: { id, tenantId },
            include: { tenant: true },
        });

        if (!tfn) {
            throw new NotFoundException('TFN not found');
        }

        // Sync: Delete from FreeSwitch
        await this.freeswitchSync.deleteTFN(tfn);

        await this.prisma.tFN.delete({ where: { id } });

        this.logger.log(`Deleted TFN ${tfn.number} for tenant ${tenantId}`);
        
        // Update Redis Lookup DB
        await this.lookupRedis.deleteNumberLookup(tfn.number);

        return { message: 'TFN deleted successfully' };
    }

    /**
    * Validate that route target exists
    */
    private async validateRouteDestination(
        tenantId: string,
        routeType: string,
        targetId?: string,
    ): Promise<void> {
        if (!targetId) {
            throw new BadRequestException(`${routeType} route requires a target ID`);
        }

        if (routeType === 'extension') {
            const extension = await this.prisma.extension.findFirst({
                where: { id: targetId, tenantId },
            });
            if (!extension) {
                throw new BadRequestException('Extension not found');
            }
        } else if (routeType === 'ring_group') {
            const ringGroup = await this.prisma.ringGroup.findFirst({
                where: { id: targetId, tenantId },
            });
            if (!ringGroup) {
                throw new BadRequestException('Ring group not found');
            }
        } else if (routeType === 'ivr') {
            const ivr = await this.prisma.iVR.findFirst({
                where: { id: targetId, tenantId },
            });
            if (!ivr) {
                throw new BadRequestException('IVR not found');
            }
        } else if (routeType === 'schedule') {
            const schedule = await this.prisma.operationalSchedule.findFirst({
                where: { id: targetId, tenantId },
            });
            if (!schedule) {
                throw new BadRequestException('Schedule not found');
            }
        } else {
            throw new BadRequestException(`Unknown route type: ${routeType}`);
        }
    }

    /**
     * Find available TFNs (not assigned to any tenant)
     */
    async findAvailable() {
        return this.prisma.tFN.findMany({
            where: {
                tenantId: null,
                status: 'AVAILABLE'
            },
            orderBy: { number: 'asc' }
        });
    }

    /**
     * Assign TFN to a tenant
     */
    async assign(id: string, tenantId: string) {
        const tfn = await this.prisma.tFN.findUnique({
            where: { id }
        });

        if (!tfn) throw new NotFoundException('TFN not found');
        if (tfn.tenantId) throw new BadRequestException('TFN already assigned');

        // Enforce system limits
        const limitStr = process.env.SYSTEM_LIMIT_TFNS;
        if (limitStr) {
            const limit = parseInt(limitStr, 10);
            if (!isNaN(limit)) {
                const count = await this.prisma.tFN.count({ where: { NOT: { tenantId: null } } });
                if (count >= limit) {
                    throw new BadRequestException(`Maximum Toll-Free Number limit of ${limit} has been reached.`);
                }
            }
        }

        const updated = await this.prisma.tFN.update({
            where: { id },
            data: {
                tenantId,
                status: 'ASSIGNED'
            }
        });

        this.logger.log(`Assigned TFN ${updated.number} to tenant ${tenantId}`);
        await this.freeswitchSync.syncTFN(updated.id);
        
        // Update Redis Lookup DB
        await this.lookupRedis.updateNumberLookup(updated.number, tenantId);

        // Sync to Sub-Billing
        await this.syncAssetsToSubBilling(tenantId, { tfns: [updated.number] });

        return updated;
    }
}
