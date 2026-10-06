import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { lastValueFrom } from 'rxjs';

@Injectable()
export class CacheFlushService {
    private readonly logger = new Logger(CacheFlushService.name);
    private readonly apiUrl: string;
    private readonly apiToken: string;

    constructor(
        private readonly httpService: HttpService,
        private readonly configService: ConfigService,
    ) {
        this.apiUrl = this.configService.get<string>('CACHE_FLUSH_URL') || 'http://localhost:8000';
        this.apiToken = this.configService.get<string>('CACHE_FLUSH_TOKEN') || '';
    }

    /**
     * Flush DID cache entry
     */
    async flushDID(did: string): Promise<void> {
        if (!this.apiToken) {
            this.logger.warn('CACHE_FLUSH_TOKEN is empty. Cache flush skipped.');
            return;
        }

        const url = `${this.apiUrl}/admin/cache/flush/did`;
        const data = new URLSearchParams();
        data.append('did', did);

        try {
            const response = await lastValueFrom(
                this.httpService.post(url, data.toString(), {
                    headers: {
                        'X-Cache-Token': this.apiToken,
                        'Content-Type': 'application/x-www-form-urlencoded',
                    },
                }),
            );
            this.logger.log(`Flushed DID cache for ${did}: ${JSON.stringify(response.data)}`);
        } catch (error: any) {
            this.logger.error(`Failed to flush DID cache for ${did}: ${error.message}`, error.response?.data);
        }
    }

    /**
     * Flush Customer cache (dialplans + extensions) using customer code
     */
    async flushCustomer(customerCode: string): Promise<void> {
        if (!this.apiToken) {
            this.logger.warn('CACHE_FLUSH_TOKEN is empty. Cache flush skipped.');
            return;
        }

        const url = `${this.apiUrl}/admin/cache/flush/customer`;
        const data = new URLSearchParams();
        data.append('customer', customerCode);

        try {
            const response = await lastValueFrom(
                this.httpService.post(url, data.toString(), {
                    headers: {
                        'X-Cache-Token': this.apiToken,
                        'Content-Type': 'application/x-www-form-urlencoded',
                    },
                }),
            );
            this.logger.log(`Flushed Customer cache for ${customerCode}: ${JSON.stringify(response.data)}`);
        } catch (error: any) {
            this.logger.error(`Failed to flush Customer cache for ${customerCode}: ${error.message}`, error.response?.data);
        }
    }
}
