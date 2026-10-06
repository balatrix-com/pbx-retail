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
import { DIDsService } from './dids.service';
import { CreateDIDDto, UpdateDIDDto } from './dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { GetUser } from '../../auth/decorators/get-user.decorator';
import { Role } from '@prisma/client';

@Controller('telecom/dids')
@UseGuards(JwtAuthGuard, RolesGuard)
export class DIDsController {
    constructor(private readonly didsService: DIDsService) { }

    /**
     * GET /telecom/dids
     * List all DIDs for tenant
     */
    @Get()
    @Roles(Role.ADMIN, Role.SUPPORT, Role.SUPER_ADMIN)
    findAll(@GetUser() user: any, @Query('tenantId') tenantId?: string) {
        const targetTenantId = (user.role === Role.SUPER_ADMIN || user.role === Role.SUPPORT) && tenantId
            ? tenantId
            : user.tenantId;
        return this.didsService.findAll(targetTenantId);
    }

    /**
     * GET /telecom/dids/:id
     * Get single DID by ID
     */
    @Get(':id')
    @Roles(Role.ADMIN, Role.SUPPORT)
    findOne(@GetUser() user: any, @Param('id') id: string) {
        return this.didsService.findOne(user.tenantId, id);
    }

    /**
     * GET /telecom/dids/available
     * Get unassigned DIDs
     */
    @Get('available')
    @Roles(Role.SUPER_ADMIN)
    findAvailable() {
        return this.didsService.findAvailable();
    }

    /**
     * POST /telecom/dids/:id/assign
     * Assign DID to tenant
     */
    @Post(':id/assign')
    @Roles(Role.SUPER_ADMIN)
    assign(@Param('id') id: string, @Body('tenantId') tenantId: string) {
        return this.didsService.assign(id, tenantId);
    }

    /**
     * POST /telecom/dids
     * Create new DID
     */
    @Post()
    @Roles(Role.SUPER_ADMIN)
    create(@GetUser() user: any, @Body() dto: CreateDIDDto & { targetTenantId?: string }) {
        const tenantId = (user.role === Role.SUPER_ADMIN) && dto.targetTenantId
            ? dto.targetTenantId
            : user.tenantId;

        return this.didsService.create(tenantId, dto);
    }

    /**
     * PUT /telecom/dids/:id
     * Update DID routing
     */
    @Put(':id')
    @Roles(Role.ADMIN)
    update(
        @GetUser() user: any,
        @Param('id') id: string,
        @Body() dto: UpdateDIDDto,
    ) {
        return this.didsService.update(user.tenantId, id, dto);
    }

    /**
     * DELETE /telecom/dids/:id
     * Delete DID
     */
    @Delete(':id')
    @Roles(Role.ADMIN)
    remove(@GetUser() user: any, @Param('id') id: string) {
        return this.didsService.remove(user.tenantId, id);
    }
}
