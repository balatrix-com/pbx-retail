
import { Module } from '@nestjs/common';
import { TenantsController } from './tenants.controller';
import { TenantsService } from './tenants.service';
import { PrismaService } from '../prisma/prisma.service';
import { FreeswitchModule } from '../freeswitch/freeswitch.module';
import { AdminModule } from '../admin/admin.module';
import { LookupRedisModule } from '../redis/lookup-redis.module';
import { WalletModule } from '../wallet/wallet.module';
import { MailModule } from '../mail/mail.module';
import { ExtensionsModule } from '../telecom/extensions/extensions.module';
import { CustomerIdentityController } from './customer-identity.controller';
import { TenantArchiveService } from './tenant-archive.service';
import { HttpModule } from '@nestjs/axios';

@Module({
    imports: [FreeswitchModule, AdminModule, LookupRedisModule, WalletModule, MailModule, ExtensionsModule, HttpModule],
    controllers: [TenantsController, CustomerIdentityController],
    providers: [TenantsService, PrismaService, TenantArchiveService],
    exports: [TenantsService],
})
export class TenantsModule { }
