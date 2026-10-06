import { Controller, Get, UseGuards } from '@nestjs/common';
import { EnforcementService } from './enforcement.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GetUser } from '../auth/decorators/get-user.decorator';
import type { User } from '@prisma/client';

@Controller('service-state')
@UseGuards(JwtAuthGuard)
export class EnforcementController {
    constructor(private readonly enforcementService: EnforcementService) { }

    @Get()
    async getServiceState(@GetUser() user: User) {
        const userEnforcement = await this.enforcementService.getUserEnforcementState(user.id);

        return {
            state: userEnforcement.serviceState,
            userEnforcement: {
                isBlocked: userEnforcement.isBlocked,
                blockReason: userEnforcement.blockReason,
                userStatus: userEnforcement.userStatus,
                adminStatus: userEnforcement.adminStatus
            }
        };
    }
}
