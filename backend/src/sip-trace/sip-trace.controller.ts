import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { SipTraceService } from './sip-trace.service';

@Controller('sip-traces')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.SUPER_ADMIN)
export class SipTraceController {
  constructor(private readonly traces: SipTraceService) {}

  @Get()
  list(@Query() query: Record<string, string>) {
    return this.traces.list(query);
  }

  @Get(':sessionUuid')
  flow(@Param('sessionUuid') sessionUuid: string) {
    return this.traces.flow(sessionUuid);
  }

  @Get(':sessionUuid/messages/:messageId')
  raw(@Param('sessionUuid') sessionUuid: string, @Param('messageId') messageId: string) {
    return this.traces.raw(sessionUuid, messageId);
  }
}

@Controller('tenant/sip-traces')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class TenantSipTraceController {
  constructor(private readonly traces: SipTraceService) {}

  @Get()
  list(@GetUser('tenantId') tenantId: string, @Query() query: Record<string, string>) {
    return this.traces.tenantList(tenantId, query);
  }

  @Get(':sessionUuid')
  flow(@GetUser('tenantId') tenantId: string, @Param('sessionUuid') sessionUuid: string) {
    return this.traces.flow(sessionUuid, tenantId);
  }

  @Get(':sessionUuid/messages/:messageId')
  raw(@GetUser('tenantId') tenantId: string, @Param('sessionUuid') sessionUuid: string,
      @Param('messageId') messageId: string) {
    return this.traces.raw(sessionUuid, messageId, tenantId);
  }
}
