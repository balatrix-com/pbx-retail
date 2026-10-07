import { Body, Controller, Delete, Get, Param, ParseIntPipe, Post, Put, Req, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { Audit } from '../audit/audit.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CreateInboundWhitelistDto, UpdateInboundWhitelistDto } from './dto/inbound-whitelist.dto';
import { InboundWhitelistService } from './inbound-whitelist.service';

@Controller('tenant/inbound-whitelist')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class InboundWhitelistController {
  constructor(private readonly inboundWhitelistService: InboundWhitelistService) {}

  @Get()
  findAll(@Req() req: any) {
    return this.inboundWhitelistService.findAll(req.user.tenantId);
  }

  @Post()
  @Audit('INBOUND_GATEWAY_CREATED', 'CARRIER_GATEWAY')
  create(@Req() req: any, @Body() data: CreateInboundWhitelistDto) {
    return this.inboundWhitelistService.create(req.user.tenantId, data);
  }

  @Put(':id')
  @Audit('INBOUND_GATEWAY_UPDATED', 'CARRIER_GATEWAY')
  update(
    @Req() req: any,
    @Param('id', ParseIntPipe) id: number,
    @Body() data: UpdateInboundWhitelistDto,
  ) {
    return this.inboundWhitelistService.update(req.user.tenantId, id, data);
  }

  @Delete(':id')
  @Audit('INBOUND_GATEWAY_DELETED', 'CARRIER_GATEWAY')
  remove(@Req() req: any, @Param('id', ParseIntPipe) id: number) {
    return this.inboundWhitelistService.remove(req.user.tenantId, id);
  }
}
