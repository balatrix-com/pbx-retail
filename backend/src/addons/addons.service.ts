import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { PrismaService } from '../prisma/prisma.service';
import { WalletService } from '../wallet/wallet.service';
import { TransactionType } from '@prisma/client';

export interface AddonCatalogItem {
    addon_id: string;
    name: string;
    resource_type: string;
    units_count?: number;
    unit_price: number;
    price: number;
    currency: string;
    is_active: boolean;
    description: string;
}

@Injectable()
export class AddonsService {
    private readonly logger = new Logger(AddonsService.name);
    private subBillingUrl: string;

    private readonly catalog: AddonCatalogItem[] = [
        {
            addon_id: 'addon_ext_1',
            name: '1 Extra Extension',
            resource_type: 'extension',
            units_count: 1,
            unit_price: 5.00,
            price: 5.00,
            currency: 'USD',
            is_active: true,
            description: 'Add 1 extra SIP extension with full PBX routing'
        },
        {
            addon_id: 'addon_tfn_1',
            name: '1 Extra Toll-Free Number (TFN)',
            resource_type: 'tfn',
            units_count: 1,
            unit_price: 5.00,
            price: 5.00,
            currency: 'USD',
            is_active: true,
            description: 'Reserve 1 additional Toll-Free phone number'
        },
        {
            addon_id: 'addon_did_1',
            name: '1 Direct Inward Dialing (DID)',
            resource_type: 'did',
            units_count: 1,
            unit_price: 3.00,
            price: 3.00,
            currency: 'USD',
            is_active: true,
            description: 'Dedicated local phone number for direct inward calls'
        },
        {
            addon_id: 'addon_recording_100gb',
            name: '100 GB Call Recording Storage',
            resource_type: 'storage',
            units_count: 1,
            unit_price: 20.00,
            price: 20.00,
            currency: 'USD',
            is_active: true,
            description: 'Secure cloud storage for call recordings and voicemail'
        },
        {
            addon_id: 'addon_monitoring_user',
            name: 'Call Monitoring User Seat',
            resource_type: 'mon',
            units_count: 1,
            unit_price: 15.00,
            price: 15.00,
            currency: 'USD',
            is_active: true,
            description: 'Real-time eavesdrop, whisper coaching, and supervisor barge'
        }
    ];

    constructor(
        private prisma: PrismaService,
        private walletService: WalletService,
        private httpService: HttpService,
        private configService: ConfigService
    ) {
        this.subBillingUrl = this.configService.get<string>('SUB_BILLING_API_URL') || 'http://localhost:5005/api';
    }

    async getCatalog(): Promise<AddonCatalogItem[]> {
        try {
            this.logger.log(`Fetching addon catalog from sub-billing: ${this.subBillingUrl}/addons/catalog`);
            const response = await firstValueFrom(
                this.httpService.get(`${this.subBillingUrl}/addons/catalog`)
            );
            const data = response.data?.data || response.data;
            if (Array.isArray(data) && data.length > 0) {
                return data.map(item => ({
                    addon_id: item.addon_id,
                    name: item.name,
                    resource_type: item.resource_type,
                    units_count: Number(item.units_count || 1),
                    unit_price: Number(item.unit_price),
                    price: Number(item.unit_price),
                    currency: item.currency,
                    is_active: item.is_active,
                    description: item.description || `${item.name} Add-on`
                }));
            }
        } catch (error) {
            this.logger.warn(`Failed to fetch addon catalog from sub-billing: ${error.message}, falling back to hardcoded catalog`);
        }
        return this.catalog.filter(item => item.is_active);
    }

    async createCatalogItem(data: any) {
        try {
            const response = await firstValueFrom(
                this.httpService.post(`${this.subBillingUrl}/addons/catalog`, data)
            );
            return response.data;
        } catch (error) {
            const status = error.response?.status || 500;
            const message = error.response?.data?.message || error.message;
            throw new BadRequestException(`Failed to create catalog item: ${message}`);
        }
    }

    async deleteCatalogItem(addonId: string) {
        try {
            const response = await firstValueFrom(
                this.httpService.delete(`${this.subBillingUrl}/addons/catalog/${addonId}`)
            );
            return response.data;
        } catch (error) {
            const status = error.response?.status || 500;
            const message = error.response?.data?.message || error.message;
            throw new BadRequestException(`Failed to delete catalog item: ${message}`);
        }
    }

    async getSubscriptionAddons(subscriptionId: string) {
        try {
            const response = await firstValueFrom(
                this.httpService.get(`${this.subBillingUrl}/addons/subscription/${subscriptionId}`)
            );
            return response.data;
        } catch (error) {
            const status = error.response?.status || 500;
            const message = error.response?.data?.message || error.message;
            throw new BadRequestException(`Failed to fetch subscription addons: ${message}`);
        }
    }

    async cancelSubscriptionAddon(subscriptionAddonId: string) {
        try {
            const response = await firstValueFrom(
                this.httpService.delete(`${this.subBillingUrl}/addons/subscription/${subscriptionAddonId}`)
            );
            return response.data;
        } catch (error) {
            const status = error.response?.status || 500;
            const message = error.response?.data?.message || error.message;
            throw new BadRequestException(`Failed to cancel subscription addon: ${message}`);
        }
    }

    async getQuote(tenantId: string, addonId: string, quantity: number = 1) {
        if (!tenantId) throw new BadRequestException('Tenant ID is required');
        const qty = Math.max(1, Number(quantity) || 1);

        const customerId = await this.walletService.getSubBillingCustomerId(tenantId).catch(() => tenantId);

        // 1. Try fetching official quote from Sub-Billing
        try {
            const response = await firstValueFrom(
                this.httpService.post(`${this.subBillingUrl}/addons/quote`, {
                    customer_id: customerId,
                    addon_id: addonId,
                    quantity: qty
                })
            );
            if (response.data?.success && response.data?.data) {
                return response.data.data;
            }
        } catch (err: any) {
            this.logger.debug(`Sub-billing quote API returned error or not found, falling back to local calculation: ${err.message}`);
        }

        // 2. Dynamic catalog lookup fallback
        const catalog = await this.getCatalog();
        const addon = catalog.find(a => a.addon_id === addonId);
        if (!addon) {
            throw new NotFoundException(`Add-on with ID ${addonId} not found in catalog`);
        }

        // Fetch real-time tenant wallet balance & credit limit
        let availablePurchasingPower = 0;
        try {
            const walletData = await this.walletService.getBalance(tenantId);
            const balance = Number(walletData.balance || 0);
            const creditLimit = Number(walletData.creditLimit || 0);
            availablePurchasingPower = balance + Math.max(0, creditLimit);
        } catch (error) {
            this.logger.warn(`Could not fetch wallet balance for tenant ${tenantId}, fallback to 0: ${error.message}`);
        }

        // Fetch subscription details to calculate remaining cycle days
        let remainingDays = 28;
        let totalCycleDays = 30;
        try {
            const subscription = await this.prisma.subscription.findFirst({
                where: { tenantId, status: 'ACTIVE' }
            });

            if (subscription && subscription.endDate) {
                const diffMs = subscription.endDate.getTime() - Date.now();
                const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
                remainingDays = Math.max(1, Math.min(30, diffDays));
            }
        } catch (error) {
            this.logger.warn(`Could not fetch subscription for tenant ${tenantId}, using default 28 days`);
        }

        const fraction = remainingDays / totalCycleDays;
        const proratedChargeDue = Number((addon.unit_price * qty * fraction).toFixed(2));
        const sufficientFunds = availablePurchasingPower >= proratedChargeDue;

        return {
            success: true,
            customer_id: tenantId,
            addon_id: addon.addon_id,
            name: addon.name,
            resource_type: addon.resource_type,
            quantity: qty,
            unit_price: addon.unit_price,
            remaining_days: remainingDays,
            total_cycle_days: totalCycleDays,
            prorated_charge_due: proratedChargeDue,
            available_purchasing_power: availablePurchasingPower,
            sufficient_funds: sufficientFunds
        };
    }

    async purchaseAddon(tenantId: string, addonId: string, quantity: number = 1) {
        const quote = await this.getQuote(tenantId, addonId, quantity);
        if (!quote.sufficient_funds) {
            throw new BadRequestException(
                `Insufficient purchasing power ($${quote.available_purchasing_power.toFixed(2)}) for prorated charge ($${quote.prorated_charge_due.toFixed(2)})`
            );
        }

        const customerId = await this.walletService.getSubBillingCustomerId(tenantId).catch(() => tenantId);

        // Execute purchase in Sub-Billing
        try {
            const response = await firstValueFrom(
                this.httpService.post(`${this.subBillingUrl}/addons/purchase`, {
                    customer_id: customerId,
                    addon_id: addonId,
                    quantity
                })
            );
            this.logger.log(`Tenant ${tenantId} successfully purchased add-on ${addonId} x${quantity} in Sub-Billing`);
            return response.data;
        } catch (subErr: any) {
            this.logger.warn(`Sub-billing /addons/purchase endpoint error: ${subErr.message}. Executing local debit fallback.`);
            
            // Debit wallet via walletService
            if (quote.prorated_charge_due > 0) {
                await this.walletService.adjustBalance(
                    tenantId,
                    quote.prorated_charge_due,
                    TransactionType.DEBIT,
                    `Purchase Add-on: ${quote.name} (Qty: ${quote.quantity})`,
                    `ADDON-${addonId}-${Date.now()}`
                );
            }

            return {
                success: true,
                message: 'Add-on purchase confirmed successfully',
                data: {
                    tenant_id: tenantId,
                    addon_purchased: {
                        addon_id: addonId,
                        name: quote.name,
                        quantity: quote.quantity,
                        prorated_charge_paid: quote.prorated_charge_due
                    }
                }
            };
        }
    }
}
