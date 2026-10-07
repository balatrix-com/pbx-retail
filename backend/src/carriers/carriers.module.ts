import { Module } from '@nestjs/common';
import { CarriersController, TenantCarrierSettingsController } from './carriers.controller';
import { CarriersService } from './carriers.service';
import { PrismaModule } from '../prisma/prisma.module';
import { FreeswitchModule } from '../freeswitch/freeswitch.module';

@Module({
  imports: [PrismaModule, FreeswitchModule],
  controllers: [CarriersController, TenantCarrierSettingsController],
  providers: [CarriersService],
  exports: [CarriersService],
})
export class CarriersModule {}
