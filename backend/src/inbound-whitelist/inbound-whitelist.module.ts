import { Module } from '@nestjs/common';
import { InboundWhitelistController } from './inbound-whitelist.controller';
import { InboundWhitelistService } from './inbound-whitelist.service';
import { PrismaModule } from '../prisma/prisma.module';
import { FreeswitchModule } from '../freeswitch/freeswitch.module';

@Module({
  imports: [PrismaModule, FreeswitchModule],
  controllers: [InboundWhitelistController],
  providers: [InboundWhitelistService],
  exports: [InboundWhitelistService],
})
export class InboundWhitelistModule {}
