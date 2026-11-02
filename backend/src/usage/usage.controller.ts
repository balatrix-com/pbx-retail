import { BadRequestException, Controller, Post, Get, Body, UseGuards, Query } from '@nestjs/common';
import { UsageService } from './usage.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { Role, type User } from '@prisma/client';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

class ReportUsageDto {
    tenantId: string;
    minutes: number;
}

@Controller('usage')
@UseGuards(JwtAuthGuard)
export class UsageController {
    constructor(private readonly usageService: UsageService) { }

    @Post('report')
    @UseGuards(RolesGuard)
    @Roles(Role.SUPER_ADMIN)
    reportUsage(@GetUser() user: User, @Body() body: ReportUsageDto) {
        if (!body.tenantId) throw new BadRequestException('Tenant ID is required');
        return this.usageService.reportUsage(body.tenantId, body.minutes);
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
