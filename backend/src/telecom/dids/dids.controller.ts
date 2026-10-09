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
    @Roles(Role.ADMIN, Role.SUPPORT)
    findAll(@GetUser() user: any) {
        return this.didsService.findAll(user.tenantId);
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
     * POST /telecom/dids
     * Create new DID
     */
    @Post()
    @Roles(Role.ADMIN)
    create(@GetUser() user: any, @Body() dto: CreateDIDDto) {
        return this.didsService.create(user.tenantId, dto);
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
