import {
    Controller,
    Get,
    Post,
    Body,
    Param,
    Delete,
    Put,
    UseGuards,
    Request,
    Query,
} from '@nestjs/common';
import { TFNsService } from './tfns.service';
import { CreateTFNDto, UpdateTFNDto } from './dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';

@Controller('telecom/tfns')
@UseGuards(JwtAuthGuard, RolesGuard)
export class TFNsController {
    constructor(private readonly tfnsService: TFNsService) { }

    @Get()
    @Roles(Role.ADMIN, Role.SUPER_ADMIN, Role.SUPPORT)
    findAll(@Request() req: any, @Query('tenantId') tenantId?: string) {
        const user = req.user;
        const targetTenantId = (user.role === Role.SUPER_ADMIN || user.role === Role.SUPPORT) && tenantId
            ? tenantId
            : user.tenantId;
        return this.tfnsService.findAll(targetTenantId);
    }

    @Get('mine')
    @Roles(Role.ADMIN, Role.SUPER_ADMIN)
    findMine(@Request() req: any) {
        return this.tfnsService.findAll(req.user.tenantId);
    }

    @Get('available')
    @Roles(Role.SUPER_ADMIN)
    findAvailable() {
        return this.tfnsService.findAvailable();
    }

    @Post(':id/assign')
    @Roles(Role.SUPER_ADMIN)
    assign(@Param('id') id: string, @Body('tenantId') tenantId: string) {
        return this.tfnsService.assign(id, tenantId);
    }

    @Get(':id')
    @Roles(Role.ADMIN, Role.SUPER_ADMIN, Role.SUPPORT)
    findOne(@Request() req: any, @Param('id') id: string) {
        return this.tfnsService.findOne(req.user.tenantId, id);
    }

    @Post()
    @Roles(Role.ADMIN, Role.SUPER_ADMIN)
    create(@Request() req: any, @Body() createTFNDto: CreateTFNDto) {
        return this.tfnsService.create(req.user.tenantId, createTFNDto);
    }

    @Put(':id')
    @Roles(Role.ADMIN, Role.SUPER_ADMIN)
    update(
        @Request() req: any,
        @Param('id') id: string,
        @Body() updateTFNDto: UpdateTFNDto,
    ) {
        return this.tfnsService.update(req.user.tenantId, id, updateTFNDto);
    }

    @Delete(':id')
    @Roles(Role.ADMIN, Role.SUPER_ADMIN)
    remove(@Request() req: any, @Param('id') id: string) {
        return this.tfnsService.remove(req.user.tenantId, id);
    }
}
