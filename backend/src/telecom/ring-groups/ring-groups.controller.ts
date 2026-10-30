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
import { RingGroupsService } from './ring-groups.service';
import { CreateRingGroupDto, UpdateRingGroupDto, AddMemberDto, UpdateMemberDto, ReorderMembersDto } from './dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { FeatureGuard } from '../../auth/guards/feature.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { GetUser } from '../../auth/decorators/get-user.decorator';
import { RequireFeature } from '../../auth/decorators/feature.decorator';
import { Role } from '@prisma/client';
import { resolveTenantScope } from '../../auth/tenant-scope';

@Controller('telecom/ring-groups')
@UseGuards(JwtAuthGuard, RolesGuard, FeatureGuard)
@RequireFeature('ringGroup')
export class RingGroupsController {
    constructor(private readonly ringGroupsService: RingGroupsService) { }

    /**
     * GET /telecom/ring-groups
     * List all ring groups for tenant
     */
    @Get()
    @Roles(Role.ADMIN, Role.SUPPORT)
    findAll(@GetUser() user: any) {
        return this.ringGroupsService.findAll(resolveTenantScope(user));
    }

    /**
     * GET /telecom/ring-groups/:id
     * Get single ring group by ID
     */
    @Get(':id')
    @Roles(Role.ADMIN, Role.SUPPORT)
    findOne(@GetUser() user: any, @Param('id') id: string) {
        return this.ringGroupsService.findOne(resolveTenantScope(user), id);
    }

    /**
     * POST /telecom/ring-groups
     * Create new ring group
     */
    @Post()
    @Roles(Role.ADMIN, Role.SUPPORT, Role.SUPER_ADMIN)
    create(@GetUser() user: any, @Body() dto: CreateRingGroupDto) {
        return this.ringGroupsService.create(resolveTenantScope(user), dto);
    }

    /**
     * PUT /telecom/ring-groups/:id
     * Update ring group settings
     */
    @Put(':id')
    @Roles(Role.ADMIN, Role.SUPPORT, Role.SUPER_ADMIN)
    update(
        @GetUser() user: any,
        @Param('id') id: string,
        @Body() dto: UpdateRingGroupDto,
    ) {
        return this.ringGroupsService.update(resolveTenantScope(user), id, dto);
    }

    /**
     * DELETE /telecom/ring-groups/:id
     * Delete ring group
     */
    @Delete(':id')
    @Roles(Role.ADMIN, Role.SUPPORT, Role.SUPER_ADMIN)
    remove(@GetUser() user: any, @Param('id') id: string) {
        return this.ringGroupsService.remove(resolveTenantScope(user), id);
    }

    /**
     * POST /telecom/ring-groups/:id/members
     * Add member to ring group
     */
    @Post(':id/members')
    @Roles(Role.ADMIN, Role.SUPPORT, Role.SUPER_ADMIN)
    addMember(
        @GetUser() user: any,
        @Param('id') id: string,
        @Body() dto: AddMemberDto,
    ) {
        return this.ringGroupsService.addMember(resolveTenantScope(user), id, dto);
    }

    /**
     * DELETE /telecom/ring-groups/:id/members/:memberId
     * Remove member from ring group
     */
    @Delete(':id/members/:memberId')
    @Roles(Role.ADMIN, Role.SUPPORT, Role.SUPER_ADMIN)
    removeMember(
        @GetUser() user: any,
        @Param('id') id: string,
        @Param('memberId') memberId: string,
    ) {
        return this.ringGroupsService.removeMember(resolveTenantScope(user), id, memberId);
    }

    /**
     * PUT /telecom/ring-groups/:id/members/:memberId
     * Update member priority/position
     */
    @Put(':id/members/:memberId')
    @Roles(Role.ADMIN, Role.SUPPORT, Role.SUPER_ADMIN)
    updateMember(
        @GetUser() user: any,
        @Param('id') id: string,
        @Param('memberId') memberId: string,
        @Body() dto: UpdateMemberDto,
    ) {
        return this.ringGroupsService.updateMember(resolveTenantScope(user), id, memberId, dto);
    }

    /**
     * PUT /telecom/ring-groups/:id/members/reorder
     * Bulk reorder members
     */
    @Put(':id/reorder')
    @Roles(Role.ADMIN, Role.SUPPORT, Role.SUPER_ADMIN)
    reorder(
        @GetUser() user: any,
        @Param('id') id: string,
        @Body() dto: ReorderMembersDto,
    ) {
        return this.ringGroupsService.reorderMembers(resolveTenantScope(user), id, dto.orders);
    }
}

