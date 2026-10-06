import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AuditService } from './audit.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';

@Controller('admin/audit-logs')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.SUPER_ADMIN)
export class AuditController {
    constructor(private auditService: AuditService) { }

    @Get()
    findAll(@Query() query: any) {
        const page = query.page ? parseInt(query.page) : 1;
        const limit = query.limit ? parseInt(query.limit) : 50;

        return this.auditService.findAll({
            ...query,
            page,
            limit
        });
    }
}
