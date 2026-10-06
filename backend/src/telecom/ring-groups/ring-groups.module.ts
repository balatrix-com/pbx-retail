import { Module } from '@nestjs/common';
import { RingGroupsController } from './ring-groups.controller';
import { RingGroupsService } from './ring-groups.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { FreeswitchModule } from '../../freeswitch/freeswitch.module';

@Module({
    imports: [PrismaModule, FreeswitchModule],
    controllers: [RingGroupsController],
    providers: [RingGroupsService],
    exports: [RingGroupsService], // Export for use in DIDs module
})
export class RingGroupsModule { }
