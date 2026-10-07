import {
  Body, Controller, Delete, Get, Param, ParseIntPipe, Post, Put, Req, UseGuards,
} from '@nestjs/common';
import { InboundNormalization, Role } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Audit } from '../audit/audit.decorator';
import { CarriersService } from './carriers.service';
import { CreateCarrierDto, EndpointDto, UpdateCarrierDto, UpdateEndpointDto } from './dto/carrier.dto';

@Controller('tenant/carriers')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class CarriersController {
  constructor(private readonly carriersService: CarriersService) {}

  @Get()
  getCarriers(@Req() req: any) {
    return this.carriersService.getCarriers(req.user.tenantId);
  }

  @Post()
  @Audit('CARRIER_CREATED', 'CARRIER_GATEWAY')
  createCarrier(@Req() req: any, @Body() data: CreateCarrierDto) {
    return this.carriersService.createCarrier(req.user.tenantId, data);
  }

  @Put(':id')
  @Audit('CARRIER_UPDATED', 'CARRIER_GATEWAY')
  updateCarrier(@Req() req: any, @Param('id', ParseIntPipe) id: number, @Body() data: UpdateCarrierDto) {
    return this.carriersService.updateCarrier(req.user.tenantId, id, data);
  }

  @Delete(':id')
  @Audit('CARRIER_DELETED', 'CARRIER_GATEWAY')
  deleteCarrier(@Req() req: any, @Param('id', ParseIntPipe) id: number) {
    return this.carriersService.deleteCarrier(req.user.tenantId, id);
  }

  @Post(':id/endpoints')
  @Audit('GATEWAY_ENDPOINT_CREATED', 'CARRIER_GATEWAY')
  createEndpoint(@Req() req: any, @Param('id', ParseIntPipe) id: number, @Body() data: EndpointDto) {
    return this.carriersService.createEndpoint(req.user.tenantId, id, data);
  }

  @Put(':carrierId/endpoints/:endpointId')
  @Audit('GATEWAY_ENDPOINT_UPDATED', 'CARRIER_GATEWAY')
  updateEndpoint(
    @Req() req: any,
    @Param('carrierId', ParseIntPipe) carrierId: number,
    @Param('endpointId', ParseIntPipe) endpointId: number,
    @Body() data: UpdateEndpointDto,
  ) {
    return this.carriersService.updateEndpoint(req.user.tenantId, carrierId, endpointId, data);
  }

  @Delete(':carrierId/endpoints/:endpointId')
  @Audit('GATEWAY_ENDPOINT_DELETED', 'CARRIER_GATEWAY')
  deleteEndpoint(
    @Req() req: any,
    @Param('carrierId', ParseIntPipe) carrierId: number,
    @Param('endpointId', ParseIntPipe) endpointId: number,
  ) {
    return this.carriersService.deleteEndpoint(req.user.tenantId, carrierId, endpointId);
  }
}

@Controller('tenant/settings')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class TenantCarrierSettingsController {
  constructor(private readonly carriersService: CarriersService) {}

  @Get('inbound-normalization')
  getInboundNormalization(@Req() req: any) {
    return this.carriersService.getInboundNormalization(req.user.tenantId);
  }

  @Put('inbound-normalization')
  @Audit('INBOUND_NORMALIZATION_UPDATED', 'CARRIER_GATEWAY')
  updateInboundNormalization(
    @Req() req: any,
    @Body('inboundNormalization') inboundNormalization: InboundNormalization,
  ) {
    return this.carriersService.updateInboundNormalization(req.user.tenantId, inboundNormalization);
  }
}
