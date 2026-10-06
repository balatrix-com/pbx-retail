import { Module } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { AuditModule } from '../audit/audit.module';
import { FreeswitchModule } from '../freeswitch/freeswitch.module';
import { MailModule } from '../mail/mail.module';

@Module({
    imports: [PrismaModule, AuthModule, AuditModule, FreeswitchModule, MailModule],
    controllers: [UsersController],
    providers: [UsersService],
    exports: [UsersService]
})
export class UsersModule { }
