import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards, Query } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { FeatureGuard } from '../../auth/guards/feature.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { GetUser } from '../../auth/decorators/get-user.decorator';
import { RequireFeature } from '../../auth/decorators/feature.decorator';
import { Role } from '@prisma/client';
import type { User } from '@prisma/client';
import { DIDForwardsService } from './did-forwards.service';
import { CreateDIDForwardDto, UpdateDIDForwardDto } from './dto';

@Controller('telecom/did-forwards')
@UseGuards(JwtAuthGuard, RolesGuard, FeatureGuard)
@RequireFeature('didForward')
export class DIDForwardsController {
    constructor(private readonly didForwardsService: DIDForwardsService) { }

    private getTenantId(user: User): string {
        if (!user.tenantId) {
            throw new Error('User does not have a tenant ID');
        }
        return user.tenantId;
    }

    @Get()
    @Roles(Role.ADMIN, Role.SUPER_ADMIN, Role.SUPPORT)
    findAll(@GetUser() user: User) {
        return this.didForwardsService.findAll(this.getTenantId(user));
    }

    @Get(':id')
    @Roles(Role.ADMIN, Role.SUPER_ADMIN, Role.SUPPORT)
    findOne(@GetUser() user: User, @Param('id') id: string) {
        return this.didForwardsService.findOne(this.getTenantId(user), id);
    }

    @Post()
    @Roles(Role.ADMIN, Role.SUPER_ADMIN, Role.SUPPORT)
    create(@GetUser() user: User, @Body() dto: CreateDIDForwardDto) {
        return this.didForwardsService.create(this.getTenantId(user), dto);
    }

    @Patch(':id')
    @Roles(Role.ADMIN, Role.SUPER_ADMIN, Role.SUPPORT)
    update(
        @GetUser() user: User,
        @Param('id') id: string,
        @Body() dto: UpdateDIDForwardDto,
    ) {
        return this.didForwardsService.update(this.getTenantId(user), id, dto);
    }

    @Delete(':id')
    @Roles(Role.ADMIN, Role.SUPER_ADMIN, Role.SUPPORT)
    remove(@GetUser() user: User, @Param('id') id: string) {
        return this.didForwardsService.remove(this.getTenantId(user), id);
    }
}
