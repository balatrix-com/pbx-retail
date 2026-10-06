import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { LocalStrategy } from './strategies/local.strategy';
import { JwtStrategy } from './strategies/jwt.strategy';
import { JwtRefreshStrategy } from './strategies/jwt-refresh.strategy';
import { PrismaModule } from '../prisma/prisma.module';
import { EnforcementModule } from '../enforcement/enforcement.module';
import { MailModule } from '../mail/mail.module';
import { NotificationsModule } from '../notifications/notifications.module';

import { RolesGuard } from './guards/roles.guard';
import { FeatureGuard } from './guards/feature.guard';

@Module({
  imports: [
    PrismaModule,
    EnforcementModule,
    MailModule,
    NotificationsModule,
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('jwt.secret'),
        signOptions: {
          expiresIn: configService.get<string>('jwt.expiresIn'),
        } as any,
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, LocalStrategy, JwtStrategy, JwtRefreshStrategy, RolesGuard, FeatureGuard],
  exports: [AuthService, RolesGuard, FeatureGuard],
})
export class AuthModule { }
