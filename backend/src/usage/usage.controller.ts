import { Controller, Post, Get, UseGuards, Query, GoneException } from '@nestjs/common';
import { UsageService } from './usage.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { Role, type User } from '@prisma/client';

@Controller('usage')
@UseGuards(JwtAuthGuard)
export class UsageController {
    constructor(private readonly usageService: UsageService) { }

    @Post('report')
    reportUsage() {
        throw new GoneException('Per-minute usage billing is retired in retail');
    }

    @Get('summary')
    getSummary(@GetUser() user: User) {
        return this.usageService.getSummary(user.tenantId!);
    }

    @Get('cdrs')
    getCDRs(
        @GetUser() user: User,
        @Query('startDate') startDate?: string,
        @Query('endDate') endDate?: string,
        @Query('limit') limit?: string,
        @Query('offset') offset?: string,
        @Query('customerId') customerId?: string
    ) {
        if (user.role !== Role.SUPER_ADMIN && !user.tenantId) return { data: [], total: 0 };
        return this.usageService.getCDRs(user.tenantId, { startDate, endDate, limit, offset, customerId }, user.role);
    }
}
