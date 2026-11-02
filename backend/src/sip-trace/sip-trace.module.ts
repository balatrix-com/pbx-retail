import { Module } from '@nestjs/common';
import { SipTraceController, TenantSipTraceController } from './sip-trace.controller';
import { SipTraceService } from './sip-trace.service';

@Module({ controllers: [SipTraceController, TenantSipTraceController], providers: [SipTraceService] })
export class SipTraceModule {}
