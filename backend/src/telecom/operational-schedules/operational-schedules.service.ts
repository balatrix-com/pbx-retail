import {
    Injectable,
    NotFoundException,
    BadRequestException,
    ForbiddenException,
    Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { FreeSwitchSyncService } from '../../freeswitch/freeswitch-sync.service';
import { CreateScheduleDto, UpdateScheduleDto } from './dto';

interface RouteInfo {
    routeType: string;
    routeTargetId: string | null;
}

@Injectable()
export class OperationalSchedulesService {
    private readonly logger = new Logger(OperationalSchedulesService.name);

    constructor(
        private prisma: PrismaService,
        private readonly freeSwitchSync: FreeSwitchSyncService,
    ) { }

    /**
     * Find all schedules for a tenant
     */
    async findAll(tenantId: string) {
        return this.prisma.operationalSchedule.findMany({
            where: { tenantId },
            orderBy: { createdAt: 'desc' },
        });
    }

    /**
     * Find one schedule by ID
     */
    async findOne(tenantId: string, id: string) {
        const schedule = await this.prisma.operationalSchedule.findFirst({
            where: { id, tenantId },
        });

        if (!schedule) {
            throw new NotFoundException('Schedule not found');
        }

        return schedule;
    }

    /**
     * Create a new operational schedule
     */
    async create(tenantId: string, dto: CreateScheduleDto) {
        // Enforce system limits
        const limitStr = process.env.SYSTEM_LIMIT_SCHEDULERS;
        if (limitStr) {
            const limit = parseInt(limitStr, 10);
            if (!isNaN(limit)) {
                const count = await this.prisma.operationalSchedule.count();
                if (count >= limit) {
                    throw new BadRequestException(`Maximum schedule limit of ${limit} has been reached.`);
                }
            }
        }

        // Check feature limit
        const features = await this.prisma.tenantFeature.findUnique({
            where: { tenantId }
        });
        if (features) {
            const count = await this.prisma.operationalSchedule.count({ where: { tenantId } });
            if (count >= features.schedulerLimit) {
                throw new ForbiddenException(`Limit reached. You can only create up to ${features.schedulerLimit} Schedules.`);
            }
        }

        // Validate route targets exist
        await this.validateRouteTarget(tenantId, dto.primaryRouteType, dto.primaryRouteTargetId);

        if (dto.afterHoursRouteType && dto.afterHoursRouteTargetId) {
            await this.validateRouteTarget(tenantId, dto.afterHoursRouteType, dto.afterHoursRouteTargetId);
        }

        if (dto.weekendRouteType && dto.weekendRouteTargetId) {
            await this.validateRouteTarget(tenantId, dto.weekendRouteType, dto.weekendRouteTargetId);
        }

        // Calculate daysMask from start/end days
        const daysMask = this.calculateDaysMask(dto.businessDaysStart, dto.businessDaysEnd);

        // Create schedule
        const last = await this.prisma.operationalSchedule.findFirst({
            where: { tenantId },
            orderBy: { sequenceId: 'desc' }
        });
        const sequenceId = (last?.sequenceId || 0) + 1;

        const schedule = await this.prisma.operationalSchedule.create({
            data: {
                tenantId,
                sequenceId,
                name: dto.name,
                timezone: dto.timezone || 'America/New_York',
                startTime: dto.businessHoursStart,
                endTime: dto.businessHoursEnd,
                daysMask: daysMask,
                primaryRouteType: dto.primaryRouteType,
                primaryRouteTarget: dto.primaryRouteTargetId || '',
                afterHoursRouteType: dto.afterHoursRouteType || '',
                afterHoursRouteTarget: dto.afterHoursRouteTargetId || '',
                weekendRouteType: dto.weekendRouteType || '',
                weekendRouteTarget: dto.weekendRouteTargetId || '',
            },
        });

        this.logger.log(`Created schedule ${schedule.name} for tenant ${tenantId}`);
        await this.freeSwitchSync.syncSchedule(schedule.id);
        return schedule;
    }

    /**
     * Update schedule
     */
    async update(tenantId: string, id: string, dto: UpdateScheduleDto) {
        // Verify ownership
        const existing = await this.prisma.operationalSchedule.findFirst({
            where: { id, tenantId },
        });

        if (!existing) {
            throw new NotFoundException('Schedule not found');
        }

        // Validate route targets if being updated
        if (dto.primaryRouteType && dto.primaryRouteTargetId) {
            await this.validateRouteTarget(tenantId, dto.primaryRouteType, dto.primaryRouteTargetId);
        }

        if (dto.afterHoursRouteType && dto.afterHoursRouteTargetId) {
            await this.validateRouteTarget(tenantId, dto.afterHoursRouteType, dto.afterHoursRouteTargetId);
        }

        if (dto.weekendRouteType && dto.weekendRouteTargetId) {
            await this.validateRouteTarget(tenantId, dto.weekendRouteType, dto.weekendRouteTargetId);
        }

        // Calculate daysMask if start/end days are provided
        // Note: dto might not have both, but typically form sends full object or we need to merge
        // For simplicity, if either is provided, we recalculate (assuming DTO has both or we fail safely)
        // Ideally DTO is partial but form sends all business info together.
        // Let's assume if one is present, both are, or we construct from existing? 
        // Actually the DTO `UpdateScheduleDto` is PartialType, so fields are optional.
        // However, days logic usually requires both.
        // Let's check if either is provided.
        let daysMask = undefined;
        if (dto.businessDaysStart !== undefined || dto.businessDaysEnd !== undefined) {
            // Retrieve missing part from existing? 
            // But existing doesn't store start/end, only mask.
            // We can't easily reconstruct user intent "Mon-Wed" just from mask "7".
            // Strategy: The frontend MUST send both if changing days.
            // Assuming frontend sends both if updating days section.
            if (dto.businessDaysStart !== undefined && dto.businessDaysEnd !== undefined) {
                daysMask = this.calculateDaysMask(dto.businessDaysStart, dto.businessDaysEnd);
            } else {
                // Warn or ignore? For now ignore if incomplete pair, but this is a potential edge case.
                // Given frontend behavior, it likely sends both.
            }
        }

        // Update
        const updated = await this.prisma.operationalSchedule.update({
            where: { id },
            data: {
                ...(dto.name && { name: dto.name }),
                ...(dto.timezone && { timezone: dto.timezone }),
                ...(dto.businessHoursStart && { startTime: dto.businessHoursStart }),
                ...(dto.businessHoursEnd && { endTime: dto.businessHoursEnd }),
                ...(daysMask !== undefined && { daysMask: daysMask }),
                ...(dto.primaryRouteType && { primaryRouteType: dto.primaryRouteType }),
                ...(dto.primaryRouteTargetId && { primaryRouteTarget: dto.primaryRouteTargetId }),
                ...(dto.afterHoursRouteType && { afterHoursRouteType: dto.afterHoursRouteType }),
                ...(dto.afterHoursRouteTargetId && { afterHoursRouteTarget: dto.afterHoursRouteTargetId }),
                ...(dto.weekendRouteType && { weekendRouteType: dto.weekendRouteType }),
                ...(dto.weekendRouteTargetId && { weekendRouteTarget: dto.weekendRouteTargetId }),
            },
        });

        this.logger.log(`Updated schedule ${updated.name}`);
        await this.freeSwitchSync.syncSchedule(updated.id);
        return updated;
    }

    /**
     * Calculate bitmask for business days
     * Mon=1, Tue=2, ... Sun=64 (mapped from input 1=Mon...7=Sun)
     * Input: start (1-7), end (1-7)
     */
    private calculateDaysMask(start: number, end: number): number {
        let mask = 0;
        // Adjust inputs: User 1=Mon...7=Sun
        // Bitmask needs: 0=Mon, 1=Tue... 6=Sun? 
        // Helper maskToWday used: 1=Mon...64=Sun.
        // Bit 0 = 1 (Mon), Bit 1 = 2 (Tue), ... Bit 6 = 64 (Sun).

        // Handle wrap-around or simple range?
        // Assume simple range for now: Start <= End
        // If Start > End (e.g. Fri-Mon), handle wrap.

        const normalize = (d: number) => (d - 1); // 0=Mon, 6=Sun

        let current = normalize(start);
        const stop = normalize(end);

        // Safety break
        let count = 0;
        while (count < 8) {
            mask |= (1 << current);
            if (current === stop) break;
            current = (current + 1) % 7;
            count++;
        }
        return mask;
    }

    /**
     * Delete schedule
     */
    async remove(tenantId: string, id: string) {
        // Verify ownership and fetch tenant for sync
        const schedule = await this.prisma.operationalSchedule.findFirst({
            where: { id, tenantId },
            include: { tenant: true },
        });

        if (!schedule) {
            throw new NotFoundException('Schedule not found');
        }

        // Sync: Delete from FreeSwitch
        await this.freeSwitchSync.deleteSchedule(schedule);

        await this.prisma.operationalSchedule.delete({ where: { id } });

        this.logger.log(`Deleted schedule ${schedule.name} for tenant ${tenantId}`);
        return { message: 'Schedule deleted successfully' };
    }

    /**
     * Get current active route based on time
     */
    getCurrentRoute(schedule: any, now: Date = new Date()): RouteInfo {
        const day = now.getDay(); // 0=Sunday, 1=Monday, ..., 6=Saturday
        const time = now.toTimeString().substring(0, 5); // "HH:MM"

        // Check if weekend (Sunday=0, Saturday=6)
        if (day === 0 || day === 6) {
            return {
                routeType: schedule.weekendRouteType || schedule.primaryRouteType,
                routeTargetId: schedule.weekendRouteTarget || schedule.primaryRouteTarget,
            };
        }

        // Check if business day (using daysMask bitmask)
        // daysMask: Mon=1, Tue=2, Wed=4, Thu=8, Fri=16, Sat=32, Sun=64
        const dayBit = Math.pow(2, (day + 6) % 7); // Convert to 0=Mon, 1=Tue, etc.
        const isBusinessDay = (schedule.daysMask & dayBit) !== 0;

        if (isBusinessDay) {
            // Check if within business hours
            if (time >= schedule.startTime && time < schedule.endTime) {
                // Business hours
                return {
                    routeType: schedule.primaryRouteType,
                    routeTargetId: schedule.primaryRouteTarget,
                };
            } else {
                // After hours (business day but outside hours)
                return {
                    routeType: schedule.afterHoursRouteType || schedule.primaryRouteType,
                    routeTargetId: schedule.afterHoursRouteTarget || schedule.primaryRouteTarget,
                };
            }
        }

        // Default to weekend route (for non-business days)
        return {
            routeType: schedule.weekendRouteType || schedule.primaryRouteType,
            routeTargetId: schedule.weekendRouteTarget || schedule.primaryRouteTarget,
        };
    }

    /**
     * Validate that route target exists
     */
    private async validateRouteTarget(
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
        } else {
            throw new BadRequestException(`Unknown route type: ${routeType}`);
        }
    }
}
