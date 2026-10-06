import { Module } from '@nestjs/common';
import { AudioController } from './audio.controller';
import { FreeswitchModule } from '../../freeswitch/freeswitch.module';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
    imports: [FreeswitchModule, PrismaModule],
    controllers: [AudioController],
})
export class AudioModule { }
