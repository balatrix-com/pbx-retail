import {
    Controller,
    Get,
    Put,
    Body,
    Param,
    UseGuards,
    Query,
} from '@nestjs/common';
import { PhoneNumbersService } from './phone-numbers.service';
import { UpdatePhoneNumberDto } from './dto/update-phone-number.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { GetUser } from '../../auth/decorators/get-user.decorator';
import { Role } from '@prisma/client';

@Controller('telecom/phone-numbers')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PhoneNumbersController {
    constructor(private readonly phoneNumbersService: PhoneNumbersService) { }

    @Get()
    @Roles(Role.ADMIN, Role.SUPPORT, Role.SUPER_ADMIN)
    findAll(@GetUser() user: any, @Query('tenantId') tenantId?: string) {
        const targetTenantId = (user.role === Role.SUPER_ADMIN || user.role === Role.SUPPORT) && tenantId
            ? tenantId
            : user.tenantId;
        return this.phoneNumbersService.findAll(targetTenantId);
    }

    @Get(':id')
    @Roles(Role.ADMIN, Role.SUPPORT, Role.SUPER_ADMIN)
    findOne(@GetUser() user: any, @Param('id') id: string) {
        return this.phoneNumbersService.findOne(user.tenantId, id);
    }

    @Put(':id')
    @Roles(Role.ADMIN, Role.SUPER_ADMIN)
    update(
        @GetUser() user: any,
        @Param('id') id: string,
        @Body() dto: UpdatePhoneNumberDto,
    ) {
        return this.phoneNumbersService.update(user.tenantId, id, dto);
    }
}
