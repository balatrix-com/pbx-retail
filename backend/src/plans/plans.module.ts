import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { PlansController } from './plans.controller';
import { PlansService } from './plans.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule, HttpModule, ConfigModule],
  controllers: [PlansController],
  providers: [PlansService],
})
export class PlansModule { }
