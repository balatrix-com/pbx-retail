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
import { Prisma } from '@prisma/client';
import { SubscriptionsService } from '../../subscriptions/subscriptions.service';

@Injectable()
export class DIDsService {
    private readonly logger = new Logger(DIDsService.name);

    constructor(
        private prisma: PrismaService,
        private freeswitchSync: FreeSwitchSyncService,
        private lookupRedis: LookupRedisService,
        private readonly httpService: HttpService,
        private readonly configService: ConfigService,
        private readonly subscriptions: SubscriptionsService,
    ) { }

    private async assertNumberQuota(tenantId: string, db: PrismaService | Prisma.TransactionClient = this.prisma) {
        await this.subscriptions.capacity(tenantId, 'numbers');
    }

    private async syncAssetsToSubBilling(tenantId: string, assets: { tfns?: string[], dids?: string[] }, selected?: string) {
        try {
            const subscription = await this.subscriptions.capacity(tenantId, 'numbers', selected);
            const targetId = subscription.id;
            const subBilling = this.configService.get<any>('subBilling');
            const apiUrl = subBilling?.apiUrl || process.env.SUB_BILLING_API_URL;
            if (!apiUrl) throw new Error('Sub-billing API URL is not configured');

            const endpoint = `${apiUrl}/pbx/sync-assets/${encodeURIComponent(targetId)}`;
            const response = await lastValueFrom(this.httpService.post(endpoint, assets));
            if (response.data?.success === false) throw new Error(response.data?.error || 'Sub-billing rejected the number');
            this.logger.log(`Successfully synced DID assets for tenant ${tenantId} to sub-billing`);
        } catch (error: any) {
            this.logger.error(`Failed to sync DID assets to sub-billing for tenant ${tenantId}: ${error.message}`);
            throw new BadRequestException(error.response?.data?.error || error.message);
        }
    }

    private async unassignFromSubBilling(tenantId: string, number: string) {
        try {
            const subBilling = this.configService.get<any>('subBilling');
            const apiUrl = subBilling?.apiUrl || process.env.SUB_BILLING_API_URL;
            const owner = (await this.subscriptions.list(tenantId)).find(s => s.assets.some((a: any) => a.type === 'did' && a.value === number && a.status !== 'released'));
            if (!owner) throw new BadRequestException('Number has no subscription owner; reconcile before removing it');
            const targetId = owner.id;
            if (!apiUrl) throw new Error('Sub-billing API URL is not configured');
            const response = await lastValueFrom(this.httpService.post(`${apiUrl}/pbx/unassign-assets/${encodeURIComponent(targetId)}`, { dids: [number] }));
            if (response.data?.success === false) throw new Error(response.data?.error || 'Sub-billing rejected the unassignment');
        } catch (error: any) {
            this.logger.error(`Failed to unassign DID ${number} in sub-billing: ${error.message}`);
            throw new BadRequestException(error.response?.data?.error || error.message);
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
        const did = await this.prisma.dID.findUnique({ where: { id } });
        if (!did) throw new NotFoundException('DID not found');
        if (did.tenantId) throw new BadRequestException('DID already assigned');
        await this.assertNumberQuota(tenantId);
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
        await this.subscriptions.capacity(tenantId, 'numbers', dto.subscriptionId);
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

        // Validate route destination exists if routeType is provided and not forward
        if (dto.routeType && dto.routeType !== 'forward') {
            await this.validateRouteDestination(tenantId, dto.routeType, dto.routeDestinationId);
        }

        // Validate forward number is provided for forward type
        if (dto.routeType === 'forward' && !dto.forwardNumber) {
            throw new BadRequestException('Forward number is required for forward route type');
        }

        // Claim an unassigned inventory number or create a new one under the same quota lock.
        const { did, claimed } = await this.prisma.$transaction(async tx => {
            await tx.$queryRaw`SELECT 1 AS locked FROM pg_advisory_xact_lock(hashtext(${`number:${dto.didNumber}`}))`;
            await tx.$queryRaw`SELECT 1 AS locked FROM pg_advisory_xact_lock(hashtext(${`numbers:${tenantId}`}))`;
            if (await tx.tFN.findUnique({ where: { number: dto.didNumber } })) {
                throw new BadRequestException('Number already exists as a Toll-Free number');
            }
            const last = await tx.dID.findFirst({ where: { tenantId }, orderBy: { sequenceId: 'desc' } });
            const sequenceId = (last?.sequenceId || 0) + 1;
            const existing = await tx.dID.findUnique({ where: { number: dto.didNumber } });
            if (existing) {
                if (existing.tenantId) {
                    throw new BadRequestException('DID number is already assigned');
                }
                const did = await tx.dID.update({
                    where: { id: existing.id },
                    data: {
                        tenantId,
                        sequenceId,
                        routeType: dto.routeType,
                        routeTargetId: dto.routeDestinationId,
                        forwardEnabled: dto.routeType === 'forward',
                        forwardNumber: dto.forwardNumber,
                    },
                });
                return { did, claimed: true };
            }
            const did = await tx.dID.create({
                data: {
                    tenantId,
                    sequenceId,
                    number: dto.didNumber,
                    routeType: dto.routeType,
                    routeTargetId: dto.routeDestinationId,
                    forwardNumber: dto.forwardNumber,
                },
            });
            return { did, claimed: false };
        });

        // Mirror the assignment before publishing it to call routing.
        try {
            await this.syncAssetsToSubBilling(tenantId, { dids: [did.number] }, dto.subscriptionId);
        } catch (error) {
            if (claimed) {
                await this.prisma.dID.update({ where: { id: did.id }, data: {
                    tenantId: null, sequenceId: 0, routeType: null, routeTargetId: null,
                    forwardEnabled: false, forwardNumber: null,
                } });
            } else {
                await this.prisma.dID.delete({ where: { id: did.id } });
            }
            throw error;
        }

        // Trigger FreeSWITCH sync
        try {
            await this.freeswitchSync.syncDID(did.id);
        } catch (error: any) {
            this.logger.error(`FreeSWITCH sync failed for DID ${did.id}: ${error.message}`);
            // Don't fail DID creation if sync fails
        }

        // Update Redis Lookup DB
        await this.lookupRedis.updateNumberLookup(did.number, tenantId);

        return did;
    }

    /**
     * Update DID routing
     */
    async update(tenantId: string, id: string, dto: UpdateDIDDto) {
        await this.subscriptions.assertEditable('did', id);
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

        // A number is an assigned billing asset. Renaming it here would leave the
        // original assignment behind in sub-billing; use remove/create instead.
        if (dto.didNumber && dto.didNumber !== existing.number) {
            throw new BadRequestException('A DID number cannot be changed; remove it and add the new number');
        }

        // Update
        const updated = await this.prisma.dID.update({
            where: { id },
            data: {
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

        await this.unassignFromSubBilling(tenantId, did.number);

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
