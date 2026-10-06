import { Module } from '@nestjs/common';
import { IVRsController } from './ivrs.controller';
import { IVRsService } from './ivrs.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { FreeswitchModule } from '../../freeswitch/freeswitch.module';

@Module({
    imports: [PrismaModule, FreeswitchModule],
    controllers: [IVRsController],
    providers: [IVRsService],
    exports: [IVRsService], // Export for use in DIDs module
})
export class IVRsModule { }
