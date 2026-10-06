import {
    Controller,
    Get,
    Post,
    Put,
    Delete,
    Body,
    Param,
    UseGuards,
    Query,
} from '@nestjs/common';
import { ExtensionsService } from './extensions.service';
import { CreateExtensionDto, UpdateExtensionDto } from './dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { GetUser } from '../../auth/decorators/get-user.decorator';
import { Role } from '@prisma/client';
import { Public } from '../../auth/decorators/public.decorator';

@Controller('telecom/extensions')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ExtensionsController {
    constructor(private readonly extensionsService: ExtensionsService) { }

    /**
     * GET /telecom/extensions
     * List all extensions for the authenticated user's tenant
     * Accessible by: ADMIN, SUPPORT
     */
    @Get()
    @Roles(Role.ADMIN, Role.SUPPORT, Role.SUPER_ADMIN)
    findAll(@GetUser() user: any, @Query('tenantId') tenantId?: string) {
        const targetTenantId = (user.role === Role.SUPER_ADMIN || user.role === Role.SUPPORT) && tenantId
            ? tenantId
            : user.tenantId;
        return this.extensionsService.findAll(targetTenantId);
    }

    /**
     * GET /telecom/extensions/status
     * Get real-time status of online extensions from Kamailio
     */
    @Get('status')
    @Roles(Role.ADMIN, Role.SUPPORT, Role.SUPER_ADMIN)
    getStatus(@GetUser() user: any, @Query('tenantId') tenantId?: string) {
        const targetTenantId = (user.role === Role.SUPER_ADMIN || user.role === Role.SUPPORT) && tenantId
            ? tenantId
            : user.tenantId;
        return this.extensionsService.getActiveStatus(targetTenantId);
    }

    /**
     * GET /telecom/extensions/next-number
     * Get next available extension number
     */
    @Get('next-number')
    @Roles(Role.ADMIN, Role.SUPER_ADMIN)
    async getNextNumber(@GetUser() user: any, @Query('tenantId') tenantId?: string) {
        const targetTenantId = (user.role === Role.SUPER_ADMIN) && tenantId
            ? tenantId
            : user.tenantId;
        const nextNum = await this.extensionsService.getNextExtensionNumber(targetTenantId);
        return { nextExtensionNumber: nextNum };
    }

    /**
     * GET /telecom/extensions/:id
     * Get single extension by ID
     * Accessible by: ADMIN, SUPPORT
     */
    @Get(':id')
    @Roles(Role.ADMIN, Role.SUPPORT)
    findOne(@GetUser() user: any, @Param('id') id: string) {
        return this.extensionsService.findOne(user.tenantId, id);
    }

    /**
     * POST /telecom/extensions/sync-from-billing
     * Sync extensions from sub-billing assets into PBX DB, Kamailio, and FreeSWITCH
     */
    @Public()
    @Post('sync-from-billing')
    async syncFromBilling(@Body() body: { customerId?: string; tenantId?: string }) {
        const target = body.tenantId || body.customerId;
        if (!target) return { success: false, message: 'customerId or tenantId is required' };
        await this.extensionsService.syncMissingExtensionsFromSubBilling(target);
        return { success: true, message: `Extensions synced for ${target}` };
    }

    /**
     * POST /telecom/extensions
     * Create new extension with SIP credentials
     * Accessible by: SUPER_ADMIN, SALES, SUPPORT
     */
    @Post()
    @Roles(Role.SUPER_ADMIN, Role.SUPPORT)
    create(@GetUser() user: any, @Body() dto: CreateExtensionDto & { targetTenantId?: string }) {
        const tenantId = (user.role === Role.SUPER_ADMIN || user.role === Role.SUPPORT) && dto.targetTenantId
            ? dto.targetTenantId
            : user.tenantId;
        return this.extensionsService.create(tenantId, dto);
    }

    /**
     * PUT /telecom/extensions/:id
     * Update extension settings
     * Accessible by: ADMIN, SUPER_ADMIN, SALES, SUPPORT
     */
    @Put(':id')
    @Roles(Role.ADMIN, Role.SUPER_ADMIN, Role.SUPPORT)
    update(
        @GetUser() user: any,
        @Param('id') id: string,
        @Body() dto: UpdateExtensionDto,
    ) {
        return this.extensionsService.update(user.tenantId, id, dto);
    }

    /**
     * DELETE /telecom/extensions/:id
     * Delete extension
     * Accessible by: SUPER_ADMIN, SALES, SUPPORT
     */
    @Delete(':id')
    @Roles(Role.SUPER_ADMIN, Role.SUPPORT)
    remove(@GetUser() user: any, @Param('id') id: string, @Query('tenantId') tenantId?: string) {
        const targetTenantId = (user.role === Role.SUPER_ADMIN || user.role === Role.SUPPORT) && tenantId
            ? tenantId
            : user.tenantId;
        return this.extensionsService.remove(targetTenantId, id);
    }
}
