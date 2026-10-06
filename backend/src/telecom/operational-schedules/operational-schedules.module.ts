import { Module } from '@nestjs/common';
import { OperationalSchedulesController } from './operational-schedules.controller';
import { OperationalSchedulesService } from './operational-schedules.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { FreeswitchModule } from '../../freeswitch/freeswitch.module';

@Module({
    imports: [PrismaModule, FreeswitchModule],
    controllers: [OperationalSchedulesController],
    providers: [OperationalSchedulesService],
    exports: [OperationalSchedulesService],
})
export class OperationalSchedulesModule { }
