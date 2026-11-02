import { Module } from '@nestjs/common';
import { MonitorController } from './monitor.controller';
import { MonitorService } from './monitor.service';
import { MonitorGateway } from './monitor.gateway';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { MonitoringAccessService } from './monitoring-access.service';
import { PrismaModule } from '../prisma/prisma.module';

// RedisModule is @Global() — REDIS_CLIENT and REDIS_SUBSCRIBER are available without explicit import.
// We still import it here to make the dependency explicit in case Global changes.

@Module({
    imports: [
        HttpModule,
        ConfigModule,
        PrismaModule,
        JwtModule.registerAsync({
            imports: [ConfigModule],
            useFactory: async (configService: ConfigService) => ({
                secret: configService.get<string>('jwt.secret'),
            }),
            inject: [ConfigService],
        }),
    ],
    controllers: [MonitorController],
    providers: [MonitorService, MonitorGateway, MonitoringAccessService],
    exports: [MonitorService],
})
export class MonitorModule { }
