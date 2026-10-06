import {
    Injectable,
    NotFoundException,
    BadRequestException,
    ForbiddenException,
    Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { FreeSwitchSyncService } from '../../freeswitch/freeswitch-sync.service';
import { CreateRingGroupDto, UpdateRingGroupDto, AddMemberDto, RingStrategy } from './dto';

@Injectable()
export class RingGroupsService {
    private readonly logger = new Logger(RingGroupsService.name);

    constructor(
        private prisma: PrismaService,
        private readonly freeSwitchSync: FreeSwitchSyncService,
    ) { }

    /**
     * Find all ring groups for a tenant
     */
    async findAll(tenantId: string) {
        return this.prisma.ringGroup.findMany({
            where: { tenantId },
            include: {
                members: {
                    include: {
                        extension: {
                            select: {
                                id: true,
                                extensionNumber: true,
                                name: true,
                            },
                        },
                    },
                    orderBy: [{ priority: 'asc' }, { position: 'asc' }],
                },
            },
            orderBy: { createdAt: 'desc' },
        });
    }

    /**
     * Find one ring group by ID
     */
    async findOne(tenantId: string, id: string) {
        const ringGroup = await this.prisma.ringGroup.findFirst({
            where: { id, tenantId },
            include: {
                members: {
                    include: {
                        extension: {
                            select: {
                                id: true,
                                extensionNumber: true,
                                name: true,
                            },
                        },
                    },
                    orderBy: [{ priority: 'asc' }, { position: 'asc' }],
                },
            },
        });

        if (!ringGroup) {
            throw new NotFoundException('Ring group not found');
        }

        return ringGroup;
    }

    /**
     * Create a new ring group
     * Includes subscription limit check
     */
    async create(tenantId: string, dto: CreateRingGroupDto) {
        // Enforce system limits
        const limitStr = process.env.SYSTEM_LIMIT_RING_GROUPS;
        if (limitStr) {
            const limit = parseInt(limitStr, 10);
            if (!isNaN(limit)) {
                const count = await this.prisma.ringGroup.count();
                if (count >= limit) {
                    throw new BadRequestException(`Maximum ring group limit of ${limit} has been reached.`);
                }
            }
        }

        return this.prisma.$transaction(async (prisma) => {
            // Check feature limit
            const features = await prisma.tenantFeature.findUnique({
                where: { tenantId }
            });
            if (features) {
                const count = await prisma.ringGroup.count({ where: { tenantId } });
                if (count >= features.ringGroupLimit) {
                    throw new ForbiddenException(`Limit reached. You can only create up to ${features.ringGroupLimit} Ring Groups.`);
                }
            }

            // Find next sequence ID
            const last = await prisma.ringGroup.findFirst({
                where: { tenantId },
                orderBy: { sequenceId: 'desc' }
            });
            const sequenceId = (last?.sequenceId || 0) + 1;

            // Create ring group
            const ringGroup = await prisma.ringGroup.create({
                data: {
                    tenantId,
                    sequenceId,
                    name: dto.name,
                    strategy: dto.strategy,
                    ringTimeout: dto.ringTimeout || 3,
                    noAnswerAction: dto.noAnswerAction,
                    noAnswerDestination: dto.noAnswerDestination,
                    // If members are provided, create them
                    ...(dto.members && dto.members.length > 0 && {
                        members: {
                            create: dto.members.map((m, index) => ({
                                extensionId: m.extensionId,
                                priority: m.priority || 1,
                                position: m.position || index + 1,
                            }))
                        }
                    })
                },
                include: {
                    members: {
                        include: {
                            extension: true,
                        },
                    },
                },
            });

            this.logger.log(`Created ring group "${ringGroup.name}" for tenant ${tenantId} ${dto.members?.length ? `with ${dto.members.length} members` : ''}`);
            
            // Sync with FreeSwitch after transaction commit logic (or just within for now)
            await this.freeSwitchSync.syncRingGroup(ringGroup.id);

            return ringGroup;
        });
    }

    /**
     * Update ring group settings
     */
    async update(tenantId: string, id: string, dto: UpdateRingGroupDto) {
        // Verify ownership
        const existing = await this.prisma.ringGroup.findFirst({
            where: { id, tenantId },
        });

        if (!existing) {
            throw new NotFoundException('Ring group not found');
        }

        // Update
        const updated = await this.prisma.ringGroup.update({
            where: { id },
            data: {
                name: dto.name,
                strategy: dto.strategy,
                ringTimeout: dto.ringTimeout,
                noAnswerAction: dto.noAnswerAction,
                noAnswerDestination: dto.noAnswerDestination,
            },
            include: {
                members: {
                    include: {
                        extension: true,
                    },
                },
            },
        });

        this.logger.log(`Updated ring group "${updated.name}"`);
        await this.freeSwitchSync.syncRingGroup(updated.id);

        return updated;
    }

    /**
     * Delete ring group
     * Cascades to delete all members
     */
    async remove(tenantId: string, id: string) {
        // Verify ownership and fetch tenant for sync
        const ringGroup = await this.prisma.ringGroup.findFirst({
            where: { id, tenantId },
            include: { tenant: true },
        });

        if (!ringGroup) {
            throw new NotFoundException('Ring group not found');
        }

        // Integrity Check: Is this ring group a target for any TFN?
        const tfnUsage = await this.prisma.tFN.findFirst({
            where: {
                tenantId,
                routeType: 'ring_group',
                routeTargetId: id
            }
        });
        if (tfnUsage) {
            throw new BadRequestException(`Cannot delete ring group. It is currently the routing target for TFN ${tfnUsage.number}.`);
        }

        // Integrity Check: Is this ring group a target for any DID?
        const didUsage = await this.prisma.dID.findFirst({
            where: {
                tenantId,
                routeType: 'ring_group',
                routeTargetId: id
            }
        });
        if (didUsage) {
            throw new BadRequestException(`Cannot delete ring group. It is currently the routing target for DID ${didUsage.number}.`);
        }

        // Sync: Delete from FreeSwitch
        await this.freeSwitchSync.deleteRingGroup(ringGroup);

        // Delete (cascade will remove members)
        await this.prisma.ringGroup.delete({ where: { id } });

        this.logger.log(`Deleted ring group "${ringGroup.name}" for tenant ${tenantId}`);

        return { message: 'Ring group deleted successfully' };
    }

    /**
     * Add member to ring group
     */
    async addMember(tenantId: string, ringGroupId: string, dto: AddMemberDto) {
        // Verify ring group ownership
        const ringGroup = await this.prisma.ringGroup.findFirst({
            where: { id: ringGroupId, tenantId },
        });

        if (!ringGroup) {
            throw new NotFoundException('Ring group not found');
        }

        // Verify extension exists and belongs to tenant
        const extension = await this.prisma.extension.findFirst({
            where: { id: dto.extensionId, tenantId },
        });

        if (!extension) {
            throw new BadRequestException('Extension not found or does not belong to this tenant');
        }

        // Check if already a member
        const existingMember = await this.prisma.ringGroupMember.findFirst({
            where: {
                ringGroupId,
                extensionId: dto.extensionId,
            },
        });

        if (existingMember) {
            throw new BadRequestException('Extension is already a member of this ring group');
        }

        // Determine next position if not provided
        let position = dto.position;
        if (!position) {
            const memberCount = await this.prisma.ringGroupMember.count({
                where: { ringGroupId }
            });
            position = memberCount + 1;
        }

        // Add member
        const member = await this.prisma.ringGroupMember.create({
            data: {
                ringGroupId,
                extensionId: dto.extensionId,
                priority: dto.priority || 1,
                position: position,
            },
            include: {
                extension: {
                    select: {
                        id: true,
                        extensionNumber: true,
                        name: true,
                    },
                },
            },
        });

        this.logger.log(`Added extension ${extension.extensionNumber} to ring group "${ringGroup.name}"`);
        await this.freeSwitchSync.syncRingGroup(ringGroup.id);

        return member;
    }

    /**
     * Remove member from ring group
     */
    async removeMember(tenantId: string, ringGroupId: string, memberId: string) {
        // Verify ring group ownership
        const ringGroup = await this.prisma.ringGroup.findFirst({
            where: { id: ringGroupId, tenantId },
        });

        if (!ringGroup) {
            throw new NotFoundException('Ring group not found');
        }

        // Find and delete member
        const member = await this.prisma.ringGroupMember.findFirst({
            where: {
                id: memberId,
                ringGroupId,
            },
        });

        if (!member) {
            throw new NotFoundException('Member not found in this ring group');
        }

        await this.prisma.ringGroupMember.delete({ where: { id: memberId } });

        this.logger.log(`Removed member from ring group "${ringGroup.name}"`);
        await this.freeSwitchSync.syncRingGroup(ringGroup.id);

        return { message: 'Member removed successfully' };
    }

    /**
     * Update member priority/position
     */
    async updateMember(
        tenantId: string,
        ringGroupId: string,
        memberId: string,
        data: { priority?: number; position?: number },
    ) {
        // Verify ring group ownership
        const ringGroup = await this.prisma.ringGroup.findFirst({
            where: { id: ringGroupId, tenantId },
        });

        if (!ringGroup) {
            throw new NotFoundException('Ring group not found');
        }

        // Update member
        const member = await this.prisma.ringGroupMember.update({
            where: { id: memberId },
            data: {
                priority: data.priority,
                position: data.position,
            },
            include: {
                extension: true,
            },
        });

        await this.freeSwitchSync.syncRingGroup(ringGroup.id);
        return member;
    }

    /**
     * Reorder members in bulk
     */
    async reorderMembers(
        tenantId: string,
        ringGroupId: string,
        orders: { id: string, position: number }[]
    ) {
        // Verify ownership
        const ringGroup = await this.prisma.ringGroup.findFirst({
            where: { id: ringGroupId, tenantId },
        });

        if (!ringGroup) {
            throw new NotFoundException('Ring group not found');
        }

        // Perform updates in transaction
        await this.prisma.$transaction(
            orders.map(order => 
                this.prisma.ringGroupMember.update({
                    where: { id: order.id, ringGroupId },
                    data: { position: order.position }
                })
            )
        );

        this.logger.log(`Reordered ${orders.length} members for ring group ${ringGroup.name}`);

        // Sync with FreeSWITCH
        await this.freeSwitchSync.syncRingGroup(ringGroup.id);

        return { message: 'Reordered successfully' };
    }
}
