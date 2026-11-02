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
    @Roles(Role.ADMIN, Role.SUPPORT)
    findAll(@Request() req: any) {
        return this.tfnsService.findAll(req.user.tenantId);
    }

    @Get('mine')
    @Roles(Role.ADMIN)
    findMine(@Request() req: any) {
        return this.tfnsService.findAll(req.user.tenantId);
    }

    @Get(':id')
    @Roles(Role.ADMIN, Role.SUPPORT)
    findOne(@Request() req: any, @Param('id') id: string) {
        return this.tfnsService.findOne(req.user.tenantId, id);
    }

    @Post()
    @Roles(Role.ADMIN)
    create(@Request() req: any, @Body() createTFNDto: CreateTFNDto) {
        return this.tfnsService.create(req.user.tenantId, createTFNDto);
    }

    @Put(':id')
    @Roles(Role.ADMIN)
    update(
        @Request() req: any,
        @Param('id') id: string,
        @Body() updateTFNDto: UpdateTFNDto,
    ) {
        return this.tfnsService.update(req.user.tenantId, id, updateTFNDto);
    }

    @Delete(':id')
    @Roles(Role.ADMIN)
    remove(@Request() req: any, @Param('id') id: string) {
        return this.tfnsService.remove(req.user.tenantId, id);
    }
}
