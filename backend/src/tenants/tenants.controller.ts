
import { Controller, Get, Post, Delete, Body, Patch, Param, UseGuards, Query, Put, Req, ForbiddenException, BadRequestException, HttpCode } from '@nestjs/common';
import { TenantsService } from './tenants.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { UpdateTenantDetailsDto } from './dto/update-tenant-details.dto';
import { Audit } from '../audit/audit.decorator';
import { TenantArchiveService } from './tenant-archive.service';

@Controller('tenants')
@UseGuards(JwtAuthGuard, RolesGuard)
export class TenantsController {
    constructor(private readonly tenantsService: TenantsService, private readonly archives: TenantArchiveService) { }

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
        if (query.status && !['ACTIVE','SUSPENDED','ARCHIVED','ALL'].includes(query.status)) throw new BadRequestException('Invalid tenant status');

        return this.tenantsService.listTenants({
            page,
            limit,
            search: query.search,
            blocked,
            status: query.status
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
            recordingAllowed?: boolean;
            recRateCardId?: number;
        }
    ) {
        return this.tenantsService.updateTenantFeatures(id, body);
    }


    @Delete(':id')
    @HttpCode(202)
    @Roles(Role.SUPER_ADMIN)
    @Audit('TENANT_ARCHIVE_REQUESTED', 'USER_MANAGEMENT')
    deleteTenant(@Param('id') id: string, @Req() req: any) {
        return this.tenantsService.deleteTenant(id, req.user.id);
    }

    @Get(':id/archive')
    @Roles(Role.SUPER_ADMIN)
    getArchive(@Param('id') id: string) { return this.archives.status(id); }

    @Post(':id/archive/retry')
    @HttpCode(202)
    @Roles(Role.SUPER_ADMIN)
    retryArchive(@Param('id') id: string, @Req() req: any) { return this.archives.request(id, req.user.id); }

    @Post(':id/archive/release-numbers')
    @Roles(Role.SUPER_ADMIN)
    @Audit('TENANT_NUMBERS_RELEASED', 'USER_MANAGEMENT')
    releaseNumbers(@Param('id') id: string, @Req() req: any, @Body() input: any) { return this.archives.releaseNumbers(id, req.user.id, input); }

    @Post()
    @Roles(Role.SUPER_ADMIN)
    @Audit('TENANT_CREATED', 'USER_MANAGEMENT')
    create(@Body() body: any) {
        // Validation could be improved with DTO and Pipes, but for now manual or implicit is fine
        // DTO created earlier: CreateTenantDto
        return this.tenantsService.createTenant(body);
    }
}
