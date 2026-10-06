import { Module } from '@nestjs/common';
import { MonitorController } from './monitor.controller';
import { MonitorService } from './monitor.service';
import { MonitorGateway } from './monitor.gateway';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';

// RedisModule is @Global() — REDIS_CLIENT and REDIS_SUBSCRIBER are available without explicit import.
// We still import it here to make the dependency explicit in case Global changes.

@Module({
    imports: [
        HttpModule,
        ConfigModule,
        JwtModule.registerAsync({
            imports: [ConfigModule],
            useFactory: async (configService: ConfigService) => ({
                secret: configService.get<string>('jwt.secret'),
            }),
            inject: [ConfigService],
        }),
    ],
    controllers: [MonitorController],
    providers: [MonitorService, MonitorGateway],
    exports: [MonitorService],
})
export class MonitorModule { }
