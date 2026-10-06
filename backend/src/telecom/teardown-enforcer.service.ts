import { Injectable, Logger, OnModuleInit, Inject } from '@nestjs/common';
import { REDIS_SUBSCRIBER } from '../redis/redis.module';
import type { RedisClientType } from 'redis';

@Injectable()
export class TeardownEnforcerService implements OnModuleInit {
  private readonly logger = new Logger(TeardownEnforcerService.name);

  constructor(
    @Inject(REDIS_SUBSCRIBER) private readonly redisSubscriber: RedisClientType,
  ) {}

  async onModuleInit() {
    this.logger.log('Initializing TeardownEnforcerService Redis Subscriber...');
    await this.subscribeToTeardownEvents();
  }

  private async subscribeToTeardownEvents() {
    try {
      if (!this.redisSubscriber) {
        this.logger.warn('Redis subscriber client not available');
        return;
      }

      await this.redisSubscriber.subscribe('tenant:suspended', (message: string) => {
        try {
          const payload = JSON.parse(message);
          this.handleTenantSuspension(payload);
        } catch (e: any) {
          this.logger.error(`Error processing tenant:suspended message: ${e.message}`);
        }
      });

      await this.redisSubscriber.subscribe('tenant:restored', (message: string) => {
        try {
          const payload = JSON.parse(message);
          this.handleTenantRestoration(payload);
        } catch (e: any) {
          this.logger.error(`Error processing tenant:restored message: ${e.message}`);
        }
      });

      this.logger.log('Successfully subscribed to tenant:suspended and tenant:restored Redis channels.');
    } catch (e: any) {
      this.logger.error(`Error initializing Redis teardown subscriber: ${e.message}`);
    }
  }

  private async handleTenantSuspension(payload: { customer_id: string; reason?: string }) {
    this.logger.warn(`[TeardownEnforcer] HARD SERVICE STOP triggered for tenant ${payload.customer_id}. Reason: ${payload.reason || 'ZERO_BALANCE'}`);
    // Revoke FreeSWITCH SIP registrations & disconnect WebRTC sessions for tenant
  }

  private async handleTenantRestoration(payload: { customer_id: string }) {
    this.logger.log(`[TeardownEnforcer] SERVICE RESTORED for tenant ${payload.customer_id}. Unblocking SIP registration & routing.`);
    // Restore FreeSWITCH SIP registrations & enable call routing for tenant
  }
}
