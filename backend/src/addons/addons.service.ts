import { Injectable, BadRequestException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';

// Historical add-ons remain readable. All new capacity is sold as subscriptions.
@Injectable()
export class AddonsService {
    constructor(private httpService: HttpService, private config: ConfigService) {}
    private retired(): never {
        throw new BadRequestException('Add-ons have been replaced by capacity subscriptions. Open Subscriptions to activate or manage a capacity plan.');
    }
    async getCatalog() {
        const response = await firstValueFrom(this.httpService.get(`${this.config.get<string>('SUB_BILLING_API_URL') || 'http://localhost:5005/api'}/addons/catalog`));
        return response.data?.data || [];
    }
    async getSubscriptionAddons(subscriptionId: string) {
        const response = await firstValueFrom(this.httpService.get(`${this.config.get<string>('SUB_BILLING_API_URL') || 'http://localhost:5005/api'}/addons/subscription/${encodeURIComponent(subscriptionId)}`));
        return response.data;
    }
    async createCatalogItem(_body: any) { return this.retired(); }
    async deleteCatalogItem(_id: string) { return this.retired(); }
    async cancelSubscriptionAddon(_id: string) { return this.retired(); }
    async getQuote(_tenant: string, _id: string, _quantity = 1) { return this.retired(); }
    async purchaseAddon(_tenant: string, _id: string, _quantity = 1) { return this.retired(); }
}
