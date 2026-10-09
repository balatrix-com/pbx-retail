import {
    Controller,
    Get,
    Put,
    Body,
    Param,
    UseGuards,
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
    @Roles(Role.ADMIN, Role.SUPPORT)
    findAll(@GetUser() user: any) {
        return this.phoneNumbersService.findAll(user.tenantId);
    }

    @Get('quota')
    @Roles(Role.ADMIN)
    getQuota(@GetUser() user: any) {
        return this.phoneNumbersService.getQuota(user.tenantId);
    }

    @Get(':id')
    @Roles(Role.ADMIN, Role.SUPPORT)
    findOne(@GetUser() user: any, @Param('id') id: string) {
        return this.phoneNumbersService.findOne(user.tenantId, id);
    }

    @Put(':id')
    @Roles(Role.ADMIN)
    update(
        @GetUser() user: any,
        @Param('id') id: string,
        @Body() dto: UpdatePhoneNumberDto,
    ) {
        return this.phoneNumbersService.update(user.tenantId, id, dto);
    }
}
