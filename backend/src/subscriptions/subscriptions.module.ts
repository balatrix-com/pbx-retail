import { Global, Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { PrismaModule } from '../prisma/prisma.module';
import { FreeswitchModule } from '../freeswitch/freeswitch.module';
import { SubscriptionsService } from './subscriptions.service';
import { SubscriptionsController, SubscriptionEventsController } from './subscriptions.controller';

@Global()
@Module({ imports: [HttpModule, PrismaModule, FreeswitchModule], providers: [SubscriptionsService],
  controllers: [SubscriptionsController, SubscriptionEventsController], exports: [SubscriptionsService] })
export class SubscriptionsModule {}
