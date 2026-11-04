import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards, Headers, ForbiddenException } from '@nestjs/common';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { SubscriptionsService } from './subscriptions.service';
import { InternalServiceGuard } from '../auth/guards/internal-service.guard';

@Controller('subscriptions')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN, Role.SUPER_ADMIN)
export class SubscriptionsController {
  constructor(private readonly service: SubscriptionsService) {}

  @Get()
  list(@GetUser() user: any, @Query('tenantId') tenantId?: string) {
    if (tenantId === 'all' || (!tenantId && user.role === Role.SUPER_ADMIN)) {
      if (user.role !== Role.SUPER_ADMIN) throw new ForbiddenException('Only SuperAdmin can view all subscriptions');
      return this.service.listAll();
    }
    return this.service.list(this.scope(user, tenantId));
  }

  @Post('quote')
  quote(@GetUser() user: any, @Body() body: any) {
    this.scope(user, body.tenantId);
    return this.service.request('quote', 'POST', {
      plan_id: body.plan_id,
      duration_unit: body.duration_unit,
      duration_count: body.duration_count,
    });
  }

  private scope(user: any, tenantId?: string) {
    if (tenantId && user.role !== Role.SUPER_ADMIN && tenantId !== user.tenantId) throw new ForbiddenException();
    return tenantId || user.tenantId;
  }

  @Post('activate')
  activate(@GetUser() user: any, @Body() body: any) {
    if (body.payment_mode === 'credit_override' && user.role !== Role.SUPER_ADMIN) {
      throw new ForbiddenException('Credit override requires Super Admin approval');
    }
    return this.service.activate(this.scope(user, body.tenantId), body, user.id);
  }

  @Post('assets/reassign')
  move(@GetUser() user: any, @Body() body: any) {
    return this.service.move(this.scope(user, body.tenantId), body, user.id);
  }

  @Get(':id/history')
  history(@GetUser() user: any, @Param('id') id: string, @Query('tenantId') tenantId?: string) {
    return this.service.action(this.scope(user, tenantId), id, 'history', 'GET');
  }

  @Post(':id/renew')
  renew(@GetUser() user: any, @Param('id') id: string, @Body() body: any) {
    return this.service.action(this.scope(user, body.tenantId), id, 'renew', 'POST', {
      operation_key: body.operation_key,
      actor_id: user.id,
    });
  }

  @Patch(':id/auto-renew')
  autoRenew(@GetUser() user: any, @Param('id') id: string, @Body() body: any) {
    return this.service.action(this.scope(user, body.tenantId), id, 'auto-renew', 'PATCH', {
      auto_renew: body.auto_renew,
      actor_id: user.id,
    });
  }

  @Post(':id/:transition')
  transition(
    @GetUser() user: any,
    @Param('id') id: string,
    @Param('transition') transition: string,
    @Body() body: any,
  ) {
    if (user.role !== Role.SUPER_ADMIN || !['freeze', 'cancel', 'release'].includes(transition)) {
      throw new ForbiddenException();
    }
    return this.service.action(this.scope(user, body.tenantId), id, transition, 'POST', {
      actor_id: user.id,
    });
  }
}

@Public()
@Controller('internal/subscriptions')
@UseGuards(InternalServiceGuard)
export class SubscriptionEventsController {
  constructor(private readonly service: SubscriptionsService) {}

  @Post('events')
  event(@Headers('x-subscription-token') token: string, @Body() body: any) {
    this.service.authenticate(token);
    return this.service.receive(body);
  }
}
