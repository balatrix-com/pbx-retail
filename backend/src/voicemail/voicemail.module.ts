import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { FreeswitchModule } from '../freeswitch/freeswitch.module';
import { VoicemailController } from './voicemail.controller';
import { VoicemailService } from './voicemail.service';

@Module({ imports: [PrismaModule, FreeswitchModule], controllers: [VoicemailController], providers: [VoicemailService], exports: [VoicemailService] })
export class VoicemailModule {}
