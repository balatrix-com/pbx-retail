import {
    Controller,
    Get,
    Post,
    Put,
    Delete,
    Body,
    Param,
    UseGuards,
} from '@nestjs/common';
import { IVRsService } from './ivrs.service';
import { CreateIVRDto, UpdateIVRDto } from './dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { FeatureGuard } from '../../auth/guards/feature.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { GetUser } from '../../auth/decorators/get-user.decorator';
import { RequireFeature } from '../../auth/decorators/feature.decorator';
import { Role } from '@prisma/client';

@Controller('telecom/ivrs')
@UseGuards(JwtAuthGuard, RolesGuard, FeatureGuard)
@RequireFeature('ivr')
export class IVRsController {
    constructor(private readonly ivrsService: IVRsService) { }

    /**
     * GET /telecom/ivrs
     * List all IVRs for tenant
     */
    @Get()
    @Roles(Role.ADMIN, Role.SUPPORT)
    findAll(@GetUser() user: any) {
        return this.ivrsService.findAll(user.tenantId);
    }

    /**
     * GET /telecom/ivrs/:id
     * Get single IVR by ID
     */
    @Get(':id')
    @Roles(Role.ADMIN, Role.SUPPORT)
    findOne(@GetUser() user: any, @Param('id') id: string) {
        return this.ivrsService.findOne(user.tenantId, id);
    }

    /**
     * POST /telecom/ivrs
     * Create new IVR
     */
    @Post()
    @Roles(Role.ADMIN, Role.SUPPORT, Role.SUPER_ADMIN)
    create(@GetUser() user: any, @Body() dto: CreateIVRDto) {
        return this.ivrsService.create(user.tenantId, dto);
    }

    /**
     * PUT /telecom/ivrs/:id
     * Update IVR settings
     */
    @Put(':id')
    @Roles(Role.ADMIN, Role.SUPPORT, Role.SUPER_ADMIN)
    update(
        @GetUser() user: any,
        @Param('id') id: string,
        @Body() dto: UpdateIVRDto,
    ) {
        return this.ivrsService.update(user.tenantId, id, dto);
    }

    /**
     * DELETE /telecom/ivrs/:id
     * Delete IVR
     */
    @Delete(':id')
    @Roles(Role.ADMIN, Role.SUPPORT, Role.SUPER_ADMIN)
    remove(@GetUser() user: any, @Param('id') id: string) {
        return this.ivrsService.remove(user.tenantId, id);
    }
}
