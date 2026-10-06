import { Controller, Post, UseGuards, Logger } from '@nestjs/common';
import { LookupRedisService } from '../redis/lookup-redis.module';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';

@Controller('admin/lookup-sync')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.SUPER_ADMIN)
export class LookupSyncController {
    private readonly logger = new Logger(LookupSyncController.name);

    constructor(private readonly lookupRedisService: LookupRedisService) { }

    @Post('full')
    async triggerFullSync() {
        this.logger.log('Manual full sync of Redis Lookup DB triggered by Super Admin');
        const results = await this.lookupRedisService.syncAll();
        return {
            message: 'Bulk synchronization completed',
            results
        };
    }
}
