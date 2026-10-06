import {
    Injectable,
    NotFoundException,
    BadRequestException,
    ForbiddenException,
    Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateIVRDto, UpdateIVRDto } from './dto';

import { FreeSwitchSyncService } from '../../freeswitch/freeswitch-sync.service';

@Injectable()
export class IVRsService {
    private readonly logger = new Logger(IVRsService.name);

    constructor(
        private prisma: PrismaService,
        private readonly freeSwitchSync: FreeSwitchSyncService,
    ) { }

    /**
     * Find all IVRs for a tenant
     */
    async findAll(tenantId: string) {
        return this.prisma.iVR.findMany({
            where: { tenantId },
            orderBy: { createdAt: 'desc' },
        });
    }

    /**
     * Find one IVR by ID
     */
    async findOne(tenantId: string, id: string) {
        const ivr = await this.prisma.iVR.findFirst({
            where: { id, tenantId },
        });

        if (!ivr) {
            throw new NotFoundException('IVR not found');
        }

        return ivr;
    }

    /**
     * Create a new IVR
     * Includes subscription limit check and menu validation
     */
    async create(tenantId: string, dto: CreateIVRDto) {
        // Enforce system limits
        const limitStr = process.env.SYSTEM_LIMIT_IVRS;
        if (limitStr) {
            const limit = parseInt(limitStr, 10);
            if (!isNaN(limit)) {
                const count = await this.prisma.iVR.count();
                if (count >= limit) {
                    throw new BadRequestException(`Maximum IVR limit of ${limit} has been reached.`);
                }
            }
        }

        // Check feature limit
        const features = await this.prisma.tenantFeature.findUnique({
            where: { tenantId }
        });
        if (features) {
            const count = await this.prisma.iVR.count({ where: { tenantId } });
            if (count >= features.ivrLimit) {
                throw new ForbiddenException(`Limit reached. You can only create up to ${features.ivrLimit} IVRs.`);
            }
        }

        // Validate menu actions reference valid resources
        if (dto.menu) {
            await this.validateMenu(tenantId, dto.menu);
        }

        // Create IVR
        const last = await this.prisma.iVR.findFirst({
            where: { tenantId },
            orderBy: { sequenceId: 'desc' }
        });
        const sequenceId = (last?.sequenceId || 0) + 1;

        const ivr = await this.prisma.iVR.create({
            data: {
                tenantId,
                sequenceId,
                name: dto.name,
                greetingAudioPath: dto.greetingAudioPath,
                menu: (dto.menu || {}) as any,
                timeoutMs: dto.timeout || 5000,
                maxAttempts: dto.maxFailures || 3,
            },
        });

        this.logger.log(`Created IVR "${ivr.name}" for tenant ${tenantId}`);
        await this.freeSwitchSync.syncIVR(ivr.id);

        return ivr;
    }

    /**
     * Update IVR settings
     */
    async update(tenantId: string, id: string, dto: UpdateIVRDto) {
        // Verify ownership
        const existing = await this.prisma.iVR.findFirst({
            where: { id, tenantId },
        });

        if (!existing) {
            throw new NotFoundException('IVR not found');
        }

        // Validate menu if being updated
        if (dto.menu) {
            await this.validateMenu(tenantId, dto.menu);
        }

        // Update
        const updated = await this.prisma.iVR.update({
            where: { id },
            data: {
                name: dto.name,
                greetingAudioPath: dto.greetingAudioPath,
                menu: dto.menu as any,
                timeoutMs: dto.timeout,
                maxAttempts: dto.maxFailures,
            },
        });

        this.logger.log(`Updated IVR "${updated.name}"`);
        await this.freeSwitchSync.syncIVR(updated.id);

        return updated;
    }

    /**
     * Delete IVR
     */
    async remove(tenantId: string, id: string) {
        // Verify ownership and fetch tenant for sync
        const ivr = await this.prisma.iVR.findFirst({
            where: { id, tenantId },
            include: { tenant: true } // Need tenant for sync delete
        });

        if (!ivr) {
            throw new NotFoundException('IVR not found');
        }

        // Sync: Delete from FreeSwitch
        await this.freeSwitchSync.deleteIVR(ivr);

        // Delete from Local DB
        await this.prisma.iVR.delete({ where: { id } });

        this.logger.log(`Deleted IVR "${ivr.name}" for tenant ${tenantId}`);

        return { message: 'IVR deleted successfully' };
    }

    /**
     * Validate menu actions reference valid extensions/ring groups/IVRs
     */
    private async validateMenu(tenantId: string, menu: Record<string, any>): Promise<void> {

        // Recursive helper
        const validMenuRecursive = async (currentMenu: Record<string, any>) => {

            for (const [digit, action] of Object.entries(currentMenu)) {
                if (!action.type) {
                    throw new BadRequestException(`Menu digit "${digit}" missing action type`);
                }

                // Handle Submenu
                if (action.type === 'submenu') {
                    if (action.children) {
                        await validMenuRecursive(action.children);
                    }
                    continue; // Skip target validation for submenu
                }

                // Handle Back/Hangup/Repeat (no target needed)
                if (['back', 'hangup', 'repeat'].includes(action.type)) {
                    continue;
                }

                // Validate target exists for types that require one
                if (['extension', 'ring_group', 'ivr', 'external'].includes(action.type)) {
                    // External just needs a number string, no DB check
                    if (action.type === 'external') {
                        if (!action.target) throw new BadRequestException(`External number missing for digit "${digit}"`);
                        continue;
                    }

                    if (!action.target) {
                        throw new BadRequestException(`Menu digit "${digit}" missing target`);
                    }

                    // Verify target exists and belongs to tenant
                    if (action.type === 'extension') {
                        const extension = await this.prisma.extension.findFirst({
                            where: { extensionNumber: action.target, tenantId }, // Fixed: search by extensionNumber, not ID
                        });
                        if (!extension) {
                            throw new BadRequestException(
                                `Extension ${action.target} not found`,
                            );
                        }
                    } else if (action.type === 'ring_group') {
                        const ringGroup = await this.prisma.ringGroup.findFirst({
                            where: { id: action.target, tenantId },
                        });
                        if (!ringGroup) {
                            throw new BadRequestException(
                                `Ring group ${action.target} not found`,
                            );
                        }
                    } else if (action.type === 'ivr') {
                        const nestedIVR = await this.prisma.iVR.findFirst({
                            where: { id: action.target, tenantId },
                        });
                        if (!nestedIVR) {
                            throw new BadRequestException(
                                `Target IVR not found`,
                            );
                        }
                    }
                }
            }
        };

        await validMenuRecursive(menu);
    }
}
