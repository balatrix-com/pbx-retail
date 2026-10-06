import { Module } from '@nestjs/common';
import { EnforcementController } from './enforcement.controller';
import { EnforcementService } from './enforcement.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [EnforcementController],
  providers: [EnforcementService],
  exports: [EnforcementService],
})
export class EnforcementModule { }
