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
    Request,
    BadRequestException,
} from '@nestjs/common';
import { TFNsService } from './tfns/tfns.service';
import { DIDsService } from './dids/dids.service';
import { AdminService } from '../admin/admin.service';
import { WalletService } from '../wallet/wallet.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { Role, User } from '@prisma/client';

@Controller('subscription')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SubscriptionTelecomController {
    constructor(
        private readonly tfnsService: TFNsService,
        private readonly didsService: DIDsService,
        private readonly adminService: AdminService,
        private readonly walletService: WalletService,
    ) { }

    /**
     * GET /subscription/tfns/available
     * Get available TFNs in inventory
     */
    @Get('tfns/available')
    @Roles(Role.ADMIN, Role.SUPER_ADMIN, Role.SUPPORT)
    async findAvailableTfns() {
        return this.tfnsService.findAvailable();
    }

    /**
     * GET /subscription/tfns
     * Get TFNs or TFN assets for a tenant
     */
    @Get('tfns')
    @Roles(Role.ADMIN, Role.SUPER_ADMIN, Role.SUPPORT)
    async findAllTfns(@GetUser() user: any, @Query('tenantId') tenantId?: string) {
        const targetTenantId = (user.role === Role.SUPER_ADMIN || user.role === Role.SUPPORT) && tenantId
            ? tenantId
            : user.tenantId;

        if (!targetTenantId) return [];

        try {
            // First check if sub-billing has assets for this tenant
            const assets = await this.walletService.getAssets(targetTenantId);
            if (assets && Array.isArray(assets.tfns) && assets.tfns.length > 0) {
                return assets.tfns;
            }
        } catch (e) {
            // Fallback to local PBX TFN records
        }

        return this.tfnsService.findAll(targetTenantId);
    }

    /**
     * POST /subscription/tfns/:id/assign
     * Assign TFN by ID to a tenant
     */
    @Post('tfns/:id/assign')
    @Roles(Role.SUPER_ADMIN)
    async assignTfnById(
        @Param('id') id: string,
        @Body('tenantId') tenantId?: string,
        @Body('targetTenantId') targetTenantId?: string
    ) {
        const target = tenantId || targetTenantId;
        if (!target) throw new BadRequestException('tenantId or targetTenantId is required');
        return this.adminService.assignNumber('TFN', id, target);
    }

    /**
     * POST /subscription/tfns/assign
     * Assign TFN to tenant
     */
    @Post('tfns/assign')
    @Roles(Role.SUPER_ADMIN)
    async assignTfn(
        @Body() body: { id?: string; number?: string; tenantId?: string; targetTenantId?: string }
    ) {
        const idOrNumber = body.id || body.number;
        const target = body.tenantId || body.targetTenantId;
        if (!idOrNumber || !target) {
            throw new BadRequestException('ID/Number and tenantId are required');
        }
        return this.adminService.assignNumber('TFN', idOrNumber, target);
    }

    /**
     * POST /subscription/tfns/unassign
     * Unassign TFN from tenant
     */
    @Post('tfns/unassign')
    @Roles(Role.SUPER_ADMIN)
    async unassignTfn(@Body() body: { id?: string; number?: string }) {
        const idOrNumber = body.id || body.number;
        if (!idOrNumber) throw new BadRequestException('ID or Number is required');
        return this.adminService.unassignNumber('TFN', idOrNumber);
    }

    /**
     * POST /subscription/tfns/:id/unassign
     */
    @Post('tfns/:id/unassign')
    @Roles(Role.SUPER_ADMIN)
    async unassignTfnById(@Param('id') id: string) {
        return this.adminService.unassignNumber('TFN', id);
    }

    /**
     * GET /subscription/dids/available
     * Get available DIDs in inventory
     */
    @Get('dids/available')
    @Roles(Role.ADMIN, Role.SUPER_ADMIN, Role.SUPPORT)
    async findAvailableDids() {
        return this.didsService.findAvailable();
    }

    /**
     * GET /subscription/dids
     * Get DIDs or DID assets for a tenant
     */
    @Get('dids')
    @Roles(Role.ADMIN, Role.SUPER_ADMIN, Role.SUPPORT)
    async findAllDids(@GetUser() user: any, @Query('tenantId') tenantId?: string) {
        const targetTenantId = (user.role === Role.SUPER_ADMIN || user.role === Role.SUPPORT) && tenantId
            ? tenantId
            : user.tenantId;

        if (!targetTenantId) return [];

        try {
            // First check if sub-billing has assets for this tenant
            const assets = await this.walletService.getAssets(targetTenantId);
            if (assets && Array.isArray(assets.dids) && assets.dids.length > 0) {
                return assets.dids;
            }
        } catch (e) {
            // Fallback to local PBX DID records
        }

        return this.didsService.findAll(targetTenantId);
    }

    /**
     * POST /subscription/dids/:id/assign
     * Assign DID by ID to a tenant
     */
    @Post('dids/:id/assign')
    @Roles(Role.SUPER_ADMIN)
    async assignDidById(
        @Param('id') id: string,
        @Body('tenantId') tenantId?: string,
        @Body('targetTenantId') targetTenantId?: string
    ) {
        const target = tenantId || targetTenantId;
        if (!target) throw new BadRequestException('tenantId or targetTenantId is required');
        return this.adminService.assignNumber('DID', id, target);
    }

    /**
     * POST /subscription/dids/assign
     * Assign DID to tenant
     */
    @Post('dids/assign')
    @Roles(Role.SUPER_ADMIN)
    async assignDid(
        @Body() body: { id?: string; number?: string; tenantId?: string; targetTenantId?: string }
    ) {
        const idOrNumber = body.id || body.number;
        const target = body.tenantId || body.targetTenantId;
        if (!idOrNumber || !target) {
            throw new BadRequestException('ID/Number and tenantId are required');
        }
        return this.adminService.assignNumber('DID', idOrNumber, target);
    }

    /**
     * POST /subscription/dids
     * Create / Assign new DID
     */
    @Post('dids')
    @Roles(Role.SUPER_ADMIN)
    async createDid(
        @GetUser() user: any,
        @Body() body: { didNumber?: string; number?: string; targetTenantId?: string; tenantId?: string }
    ) {
        const target = body.targetTenantId || body.tenantId || user.tenantId;
        const number = body.didNumber || body.number;
        if (!number) throw new Error('DID number is required');

        // Check if DID already exists in PBX
        const existing = await this.didsService.findAvailable();
        const found = existing.find(d => d.number === number);

        if (found) {
            return this.adminService.assignNumber('DID', found.id, target);
        }

        return this.didsService.create(target, { didNumber: number });
    }

    /**
     * POST /subscription/dids/unassign
     * Unassign DID from tenant
     */
    @Post('dids/unassign')
    @Roles(Role.SUPER_ADMIN)
    async unassignDid(@Body() body: { id?: string; number?: string }) {
        const idOrNumber = body.id || body.number;
        if (!idOrNumber) throw new Error('ID or Number is required');
        return this.adminService.unassignNumber('DID', idOrNumber);
    }

    /**
     * POST /subscription/dids/:id/unassign
     */
    @Post('dids/:id/unassign')
    @Roles(Role.SUPER_ADMIN)
    async unassignDidById(@Param('id') id: string) {
        return this.adminService.unassignNumber('DID', id);
    }
}
