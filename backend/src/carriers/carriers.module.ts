import { Module } from '@nestjs/common';
import { CarriersController } from './carriers.controller';
import { CarriersService } from './carriers.service';
import { PrismaModule } from '../prisma/prisma.module';
import { FreeswitchModule } from '../freeswitch/freeswitch.module';

@Module({
  imports: [PrismaModule, FreeswitchModule],
  controllers: [CarriersController],
  providers: [CarriersService],
  exports: [CarriersService],
})
export class CarriersModule {}
