import { Controller, Get, Post, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { PlansService } from './plans.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { Role } from '@prisma/client';
import type { User } from '@prisma/client';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Audit } from '../audit/audit.decorator';

@Controller('plans')
@UseGuards(JwtAuthGuard)
export class PlansController {
    constructor(private readonly plansService: PlansService) { }

    @Get()
    async findAll(@GetUser() user: User) {
        return this.plansService.findAll(user.id);
    }

    @Post()
    @Roles(Role.ADMIN, Role.SUPER_ADMIN)
    @UseGuards(RolesGuard)
    @Audit('PLAN_CREATED', 'PLANS_ADDONS')
    async createCustom(@Body() data: any, @GetUser() user: User) {
        return this.plansService.createCustom(data, user.id);
    }

    @Delete(':planId')
    @Roles(Role.ADMIN, Role.SUPER_ADMIN)
    @UseGuards(RolesGuard)
    @Audit('PLAN_DELETED', 'PLANS_ADDONS')
    async deletePlan(@Param('planId') planId: string) {
        return this.plansService.deletePlan(planId);
    }
}
