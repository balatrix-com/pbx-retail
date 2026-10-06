
import { Controller, Get, Post, Delete, Body, Patch, Param, UseGuards, Query, Put, Req, ForbiddenException, BadRequestException } from '@nestjs/common';
import { TenantsService } from './tenants.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { UpdateTenantDetailsDto } from './dto/update-tenant-details.dto';
import { Audit } from '../audit/audit.decorator';

@Controller('tenants')
@UseGuards(JwtAuthGuard, RolesGuard)
export class TenantsController {
    constructor(private readonly tenantsService: TenantsService) { }

    @Get('profile/details')
    @Roles(Role.SUPER_ADMIN, Role.ADMIN)
    getMyTenantDetails(@Req() req: any, @Query('tenantId') queryTenantId?: string) {
        const tenantId = req.user.role === Role.SUPER_ADMIN ? (queryTenantId || req.user.tenantId) : req.user.tenantId;
        if (!tenantId) {
            throw new BadRequestException('No tenant associated with this account');
        }
        return this.tenantsService.getTenantDetails(tenantId);
    }

    @Get()
    @Roles(Role.SUPER_ADMIN)
    listTenants(@Query() query: any) {
        // Simple query parsing
        const page = query.page ? parseInt(query.page) : 1;
        const limit = query.limit ? parseInt(query.limit) : 100;
        const blocked = query.blocked === 'true' ? true : query.blocked === 'false' ? false : undefined;

        return this.tenantsService.listTenants({
            page,
            limit,
            search: query.search,
            blocked
        });
    }

    @Get('stats')
    @Roles(Role.SUPER_ADMIN)
    getStats() {
        return this.tenantsService.getGlobalStats();
    }

    @Patch(':id/block')
    @Roles(Role.SUPER_ADMIN)
    @Audit('TENANT_SUSPENDED', 'USER_MANAGEMENT')
    blockTenant(@Param('id') id: string, @Body() body: { blocked: boolean }) {
        return this.tenantsService.toggleTenantBlock(id, body.blocked);
    }

    @Get('analytics/growth')
    @Roles(Role.SUPER_ADMIN)
    async getGrowth(@Query('period') period: '30d' | '12m' = '30d') {
        return this.tenantsService.getGrowthAnalytics(period);
    }

    @Get('analytics/revenue')
    @Roles(Role.SUPER_ADMIN)
    async getRevenue(@Query('period') period: '30d' | '12m' = '30d') {
        return this.tenantsService.getRevenueAnalytics(period);
    }

    @Get(':id')
    @Roles(Role.SUPER_ADMIN, Role.ADMIN)
    getTenantDetails(@Param('id') id: string, @Req() req: any) {
        if (req.user.role === Role.ADMIN && req.user.tenantId !== id) {
            throw new ForbiddenException('Access denied to other tenant details');
        }
        return this.tenantsService.getTenantDetails(id);
    }

    @Patch(':id/details')
    @Roles(Role.SUPER_ADMIN)
    @Audit('TENANT_UPDATED', 'USER_MANAGEMENT')
    updateTenantDetails(
        @Param('id') id: string,
        @Body() body: UpdateTenantDetailsDto
    ) {
        return this.tenantsService.updateTenantDetails(id, body);
    }

    @Patch(':id/features')
    @Roles(Role.SUPER_ADMIN)
    updateFeatures(
        @Param('id') id: string,
        @Body() body: {
            ivrEnabled?: boolean;
            ivrLimit?: number;
            ringGroupEnabled?: boolean;
            ringGroupLimit?: number;
            schedulerEnabled?: boolean;
            schedulerLimit?: number;
            didForwardEnabled?: boolean;
            didForwardLimit?: number;
            monitorEnabled?: boolean;
            monitorLimit?: number;
            recordingAllowed?: boolean;
        }
    ) {
        return this.tenantsService.updateTenantFeatures(id, body);
    }


    @Delete(':id')
    @Roles(Role.SUPER_ADMIN)
    @Audit('TENANT_DELETED', 'USER_MANAGEMENT')
    deleteTenant(@Param('id') id: string) {
        return this.tenantsService.deleteTenant(id);
    }

    @Put(':id/outbound-endpoint')
    @Roles(Role.SUPER_ADMIN)
    assignOutboundEndpoint(
        @Param('id') id: string,
        @Body() body: { endpointId: number }
    ) {
        return this.tenantsService.assignOutboundEndpoint(id, body.endpointId);
    }

    @Delete(':id/outbound-endpoint')
    @Roles(Role.SUPER_ADMIN)
    removeOutboundEndpoint(@Param('id') id: string) {
        return this.tenantsService.removeOutboundEndpoint(id);
    }

    @Post()
    @Roles(Role.SUPER_ADMIN)
    @Audit('TENANT_CREATED', 'USER_MANAGEMENT')
    create(@Body() body: any) {
        // Validation could be improved with DTO and Pipes, but for now manual or implicit is fine
        // DTO created earlier: CreateTenantDto
        return this.tenantsService.createTenant(body);
    }
}
