import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TransactionType, Prisma } from '@prisma/client';
import { BillingService } from '../billing/billing.service';
import { NotificationsService } from '../notifications/notifications.service';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';

import { FreeSwitchSyncService } from '../freeswitch/freeswitch-sync.service';
import { LookupRedisService } from '../redis/lookup-redis.module';

@Injectable()
export class WalletService {
    private readonly logger = new Logger(WalletService.name);
    public readonly subBillingUrl: string;

    constructor(
        private prisma: PrismaService,
        private billingService: BillingService,
        private notificationsService: NotificationsService,
        private httpService: HttpService,
        private configService: ConfigService,
        private freeSwitchSync: FreeSwitchSyncService,
        private lookupRedis: LookupRedisService,
    ) {
        this.subBillingUrl = this.configService.get<string>('SUB_BILLING_API_URL') || 'http://localhost:5005/api';
    }

    async getSubBillingCustomerId(tenantId: string): Promise<string> {
        const tenant = await this.prisma.tenant.findUnique({
            where: { id: tenantId },
            select: { subBillingCustomerId: true }
        });

        if (!tenant || !tenant.subBillingCustomerId) {
            throw new BadRequestException('Tenant not linked to a billing system customer');
        }

        return tenant.subBillingCustomerId;
    }

    async getBalance(tenantId: string) {
        const customerId = await this.getSubBillingCustomerId(tenantId);

        try {
            const response = await firstValueFrom(
                this.httpService.get(`${this.subBillingUrl}/pbx/balance/${customerId}`)
            );

            const data = response.data;
            // Parse "USD 189.00" into ["USD", "189.00"]
            const [currency, balanceStr] = data.f_balance.split(' ');

            return {
                balance: parseFloat(balanceStr),
                currency: currency || 'USD',
                freeMins: data["mins Balance"] !== undefined ? data["mins Balance"] : (data.freeMins || 0),
                creditLimit: data.credit_limit !== undefined ? parseFloat(data.credit_limit) : 0,
                autoRecharge: {
                    enabled: false,
                    threshold: 0,
                    amount: 0
                }
            };
        } catch (error) {
            this.logger.warn(`Sub Billing fetch failed for ${customerId}, checking local DB fallback...`);

            // Fallback to local Wallet and Subscription data
            const wallet = await this.prisma.wallet.findUnique({ where: { tenantId } });
            const subscription = await this.prisma.subscription.findFirst({
                where: { tenantId, status: 'ACTIVE' }
            });

            return {
                balance: wallet?.balance || 0,
                currency: wallet?.currency || 'USD',
                freeMins: subscription?.remainingFreeMinutes || 0,
                creditLimit: 0,
                autoRecharge: {
                    enabled: false,
                    threshold: 0,
                    amount: 0
                }
            };
        }
    }

    async getTransactions(tenantId: string) {
        const customerId = await this.getSubBillingCustomerId(tenantId);

        try {
            const response = await firstValueFrom(
                this.httpService.get(`${this.subBillingUrl}/pbx/transactions/${customerId}`)
            );

            // Sub Billing /api/pbx/transactions returns mapped array directly
            return response.data.map((tx: any) => ({
                id: tx.id,
                amount: tx.amount,
                type: tx.type === 'payment' ? 'CREDIT' : 'DEBIT',
                description: tx.description,
                createdAt: tx.date,
                status: 'SUCCESS'
            }));
        } catch (error) {
            this.logger.error(`Failed to fetch transactions from Sub Billing for ${customerId}: ${error.message}`);
            return [];
        }
    }

    async adjustBalance(tenantId: string, amount: number, type: TransactionType, description: string, referenceId?: string, tx?: Prisma.TransactionClient) {
        const customerId = await this.getSubBillingCustomerId(tenantId);
        const signedAmount = type === 'DEBIT' ? -Math.abs(amount) : Math.abs(amount);

        try {
            const response = await firstValueFrom(
                this.httpService.post(`${this.subBillingUrl}/payments/manual`, {
                    customer_id: customerId,
                    amount: signedAmount,
                    currency: 'usd',
                    tx_id: referenceId ? `${referenceId}-${Date.now()}` : `MANUAL-${Date.now()}`,
                    payment_type: 'pbx_admin_adjust',
                    description: description || `Admin adjustment: ${type}`
                })
            );
            return { success: true, data: response.data };
        } catch (error) {
            this.logger.error(`Failed to adjust balance for ${customerId}: ${error.response?.data?.message || error.message}`);
            throw new BadRequestException(`Failed to adjust balance: ${error.response?.data?.message || error.message}`);
        }
    }

    async topUpWallet(tenantId: string, amount: number) {
        if (amount <= 0) throw new BadRequestException('Amount must be positive');

        const customerId = await this.getSubBillingCustomerId(tenantId);
        const frontendUrl = this.configService.get<string>('FRONTEND_URL') || 'http://localhost:5173';

        try {
            const response = await firstValueFrom(
                this.httpService.post(`${this.subBillingUrl}/payments/initiate`, {
                    customer_id: customerId,
                    amount: amount,
                    Initiate_by: 'pbx',
                    description: `Wallet Top-up for ${tenantId}`,
                    success_url: `${frontendUrl}/wallet?success=true&session_id={CHECKOUT_SESSION_ID}`,
                    cancel_url: `${frontendUrl}/wallet?canceled=true`
                })
            );

            const data = response.data;
            return {
                checkoutUrl: data.data.checkout_url,
                paymentId: data.data.payment_id
            };
        } catch (error) {
            this.logger.error(`Failed to initiate payment with Sub Billing for ${customerId}: ${error.response?.data?.message || error.message}`);
            throw new BadRequestException('Payment initiation failed');
        }
    }

    async getAllBalances() {
        try {
            const response = await firstValueFrom(
                this.httpService.get(`${this.subBillingUrl}/pbx/all`)
            );
            const billingBalances = response.data;

            const tenants = await this.prisma.tenant.findMany({
                select: {
                    id: true,
                    name: true,
                    subBillingCustomerId: true
                }
            });

            return tenants.map(tenant => {
                const billingData = billingBalances.find((b: any) => b.customer_id === tenant.subBillingCustomerId);
                return {
                    tenantId: tenant.id,
                    tenantName: tenant.name,
                    subBillingCustomerId: tenant.subBillingCustomerId,
                    balance: billingData ? billingData.balance : 0,
                    freeMins: billingData ? billingData.freeMins : 0,
                    currency: billingData ? billingData.currency : 'USD'
                };
            });
        } catch (error) {
            this.logger.error(`Failed to fetch all balances from Sub Billing: ${error.message}`);
            return [];
        }
    }

    async getSubscription(tenantId: string) {
        const customerId = await this.getSubBillingCustomerId(tenantId);
        try {
            const response = await firstValueFrom(
                this.httpService.get(`${this.subBillingUrl}/pbx/subscription/${customerId}`)
            );
            this.logger.log(`Subscription data for ${customerId}: ${JSON.stringify(response.data)}`);
            return response.data;
        } catch (error) {
            this.logger.error(`Failed to fetch subscription from Sub Billing for ${customerId}: ${error.message}`);
            return null;
        }
    }

    async switchSubscriptionPlan(tenantId: string, planId: string, immediate: boolean = true) {
        const customerId = await this.getSubBillingCustomerId(tenantId);
        try {
            this.logger.log(`Switching subscription plan in sub-billing for customer ${customerId} (tenant ${tenantId}) to ${planId}`);
            const response = await firstValueFrom(
                this.httpService.post(`${this.subBillingUrl}/subscriptions/switch-plan`, {
                    customer_id: customerId,
                    target_plan_id: planId,
                    execute_on_expiration: !immediate
                })
            );

            const endDate = new Date();
            endDate.setFullYear(endDate.getFullYear() + 1);

            const subBillingData = response.data?.data;
            const subBillingSubId = subBillingData?.subscription_id || subBillingData?.id;

            // Find matching local plan in Prisma DB (for foreign key relation)
            let localPlan = await this.prisma.plan.findFirst({
                where: { OR: [{ id: planId }, { name: { equals: planId, mode: 'insensitive' } }] }
            });
            if (!localPlan) {
                localPlan = await this.prisma.plan.findFirst();
            }
            const localPlanIdToUse = localPlan ? localPlan.id : planId;

            // Fetch dynamic plan limits from sub-billing system
            let allowedExtensions = 5;
            let freeMins = localPlan?.freeMinutes || 500;
            try {
                const planRes = await firstValueFrom(
                    this.httpService.get(`${this.subBillingUrl}/plans/${planId}`)
                );
                const subPlan = planRes.data?.data || planRes.data;
                if (subPlan) {
                    if (subPlan.extensions !== undefined && subPlan.extensions !== null) {
                        allowedExtensions = Number(subPlan.extensions);
                    }
                    if (subPlan.free_mins !== undefined && subPlan.free_mins !== null) {
                        freeMins = Number(subPlan.free_mins);
                    }
                }
            } catch (err) {
                this.logger.warn(`Could not fetch plan limits from sub-billing for ${planId}: ${err.message}`);
                allowedExtensions = localPlan?.maxExtensions || 5;
            }

            const existingSub = await this.prisma.subscription.findFirst({
                where: { tenantId }
            });

            if (existingSub) {
                await this.prisma.subscription.update({
                    where: { id: existingSub.id },
                    data: {
                        planId: localPlanIdToUse,
                        subBillingSubscriptionId: subBillingSubId || existingSub.subBillingSubscriptionId,
                        status: 'ACTIVE',
                        remainingFreeMinutes: freeMins,
                        updatedAt: new Date()
                    }
                });
            } else {
                await this.prisma.subscription.create({
                    data: {
                        tenantId,
                        planId: localPlanIdToUse,
                        subBillingSubscriptionId: subBillingSubId || undefined,
                        status: 'ACTIVE',
                        startDate: new Date(),
                        endDate,
                        remainingFreeMinutes: freeMins
                    }
                });
            }

            // Auto-provision extensions matching target plan limit
            const tenant = await this.prisma.tenant.findUnique({
                where: { id: tenantId },
                select: { customerCode: true }
            });

            if (tenant && tenant.customerCode && allowedExtensions > 0) {
                const currentExtCount = await this.prisma.extension.count({
                    where: { tenantId }
                });

                if (currentExtCount < allowedExtensions) {
                    const toCreate = allowedExtensions - currentExtCount;
                    this.logger.log(`Auto-provisioning ${toCreate} extension(s) for tenant ${tenantId} (plan allowance: ${allowedExtensions})`);

                    for (let i = currentExtCount; i < allowedExtensions; i++) {
                        const suffix = (i + 1).toString().padStart(2, '0');
                        const extNum = `${tenant.customerCode}${suffix}`;

                        const existingExt = await this.prisma.extension.findUnique({
                            where: {
                                tenantId_extensionNumber: {
                                    tenantId,
                                    extensionNumber: extNum
                                }
                            }
                        });

                        if (!existingExt) {
                            const newExt = await this.prisma.extension.create({
                                data: {
                                    tenantId,
                                    extensionNumber: extNum,
                                    name: `Extension ${suffix}`,
                                    sipUsername: extNum,
                                    sipPassword: '123456',
                                    sipAuthRealm: process.env.SIP_SERVER || 'localhost',
                                    sequenceId: i + 1
                                }
                            });

                            // Sync to FreeSWITCH dialplan & Kamailio subscriber table
                            try {
                                await this.freeSwitchSync.syncExtension(newExt.id);
                            } catch (syncErr: any) {
                                this.logger.warn(`FreeSWITCH/Kamailio sync failed for new extension ${extNum}: ${syncErr.message}`);
                            }
                        } else {
                            // Ensure existing extension is registered in Kamailio
                            try {
                                await this.freeSwitchSync.syncExtension(existingExt.id);
                            } catch (syncErr: any) {
                                this.logger.debug(`Kamailio sync check failed for ${extNum}: ${syncErr.message}`);
                            }
                        }
                    }

                    // Sync with Redis Lookup DB
                    await this.lookupRedis.updateExtensionLookup(tenantId).catch(() => { });
                }
            }

            return response.data;
        } catch (error) {
            const errorMsg = error.response?.data?.message || error.message;
            this.logger.error(`Failed to switch subscription plan for tenant ${tenantId}: ${errorMsg}`);
            throw new BadRequestException(`Failed to switch subscription plan: ${errorMsg}`);
        }
    }

    async getCards(tenantId: string) {
        const customerId = await this.getSubBillingCustomerId(tenantId);
        try {
            const response = await firstValueFrom(
                this.httpService.get(`${this.subBillingUrl}/pbx/cards/${customerId}`)
            );
            return response.data;
        } catch (error) {
            this.logger.error(`Failed to fetch cards from Sub Billing for ${customerId}: ${error.message}`);
            return [];
        }
    }

    async updateAutoRechargeSettings(tenantId: string, enabled: boolean, threshold: number, amount: number) {
        // This could be implemented to call Sub Billing if it supports it, 
        // for now just returns success to avoid breaking frontend.
        return { success: true };
    }

    async checkCustomerExists(customerId: string): Promise<boolean> {
        try {
            const response = await firstValueFrom(
                this.httpService.get(`${this.subBillingUrl}/customers/${customerId}`)
            );
            return !!(response.status === 200 && response.data && response.data.success);
        } catch (error) {
            return false;
        }
    }

    async createSubBillingCustomer(customerId: string, email: string, name: string) {
        try {
            // First check if the customer already exists in sub-billing
            try {
                const checkResponse = await firstValueFrom(
                    this.httpService.get(`${this.subBillingUrl}/customers/${customerId}`)
                );
                if (checkResponse.status === 200 && checkResponse.data && checkResponse.data.success) {
                    this.logger.log(`Customer ${customerId} already exists in sub-billing.`);
                    return checkResponse.data.data;
                }
            } catch (checkErr) {
                // If it is 404, we proceed to create. Otherwise log and proceed to create.
                if (checkErr.response?.status !== 404) {
                    this.logger.warn(`Failed to check if customer exists, proceeding to create: ${checkErr.message}`);
                }
            }

            // Create customer in sub-billing
            this.logger.log(`Creating customer ${customerId} in sub-billing.`);
            const response = await firstValueFrom(
                this.httpService.post(`${this.subBillingUrl}/customers`, {
                    customer_id: customerId,
                    fr_cusid: customerId,
                    customer_type: 'individual',
                    first_name: name || 'Demo',
                    last_name: 'Customer',
                    admin_email: email,
                    address_st: '123 Demo Street',
                    city: 'Demo City',
                    state: 'Demo State',
                    country: 'USA'
                })
            );
            return response.data;
        } catch (error) {
            const errorMsg = error.response?.data?.message || error.message;
            this.logger.error(`Failed to create customer ${customerId} in sub-billing: ${errorMsg}`);
            throw new BadRequestException(`Failed to create sub-billing customer: ${errorMsg}`);
        }
    }

    async createSubBillingCustomerExtended(data: {
        customerId: string;
        customerType: 'individual' | 'company';
        firstName: string;
        lastName: string;
        companyName?: string;
        companyTaxId?: string;
        email: string;
        phone: string;
        address: string;
        city: string;
        state: string;
        country: string;
        creditLimit?: number;
    }) {
        try {
            // Strict Validation - Throw error immediately instead of using placeholders
            if (!data.customerId) throw new BadRequestException('customerId is required');
            if (!data.customerType || !['individual', 'company'].includes(data.customerType)) {
                throw new BadRequestException('customerType is required and must be either individual or company');
            }
            if (!data.firstName) throw new BadRequestException('firstName is required');
            if (!data.lastName) throw new BadRequestException('lastName is required');
            if (!data.email) throw new BadRequestException('email is required');
            if (!data.phone) throw new BadRequestException('phone is required');
            if (!data.address || data.address.length < 10) {
                throw new BadRequestException('address is required and must be at least 10 characters');
            }
            if (!data.city) throw new BadRequestException('city is required');
            if (!data.state) throw new BadRequestException('state is required');
            if (!data.country) throw new BadRequestException('country is required');

            if (data.customerType === 'company') {
                if (!data.companyName) throw new BadRequestException('companyName is required for company type');
                if (!data.companyTaxId) throw new BadRequestException('companyTaxId is required for company type');
            }

            this.logger.log(`Creating customer ${data.customerId} in sub-billing: ${data.email}`);

            let mappedCountry = data.country.toUpperCase();
            const allowedCountries = ['IND', 'USA', 'CAD', 'PAK', 'PHI', 'BNG', 'OTHER'];
            if (!allowedCountries.includes(mappedCountry)) {
                if (mappedCountry === 'INDIA') mappedCountry = 'IND';
                else if (mappedCountry === 'CANADA') mappedCountry = 'CAD';
                else if (mappedCountry === 'PAKISTAN') mappedCountry = 'PAK';
                else if (mappedCountry === 'PHILIPPINES') mappedCountry = 'PHI';
                else if (mappedCountry === 'BANGLADESH') mappedCountry = 'BNG';
                else throw new BadRequestException(`Invalid country code: ${data.country}`);
            }

            const response = await firstValueFrom(
                this.httpService.post(`${this.subBillingUrl}/customers`, {
                    customer_id: data.customerId,
                    fr_cusid: data.customerId,
                    customer_type: data.customerType,
                    company_name: data.customerType === 'company' ? data.companyName : null,
                    company_tax_id: data.customerType === 'company' ? data.companyTaxId : null,
                    first_name: data.firstName,
                    last_name: data.lastName,
                    admin_email: data.email,
                    phone: data.phone,
                    address_st: data.address,
                    city: data.city,
                    state: data.state,
                    country: mappedCountry,
                    credit_limit: data.creditLimit !== undefined ? data.creditLimit : 0
                })
            );
            if (response.data && response.data.success) {
                return response.data.data;
            }
            throw new Error(response.data?.message || 'Unknown error');
        } catch (error) {
            const errorMsg = error.response?.data?.message || error.message;
            this.logger.error(`Failed to create customer in sub-billing: ${errorMsg}`);
            throw new BadRequestException(`Failed to create sub-billing customer: ${errorMsg}`);
        }
    }

    async deleteSubBillingCustomer(customerId: string): Promise<void> {
        try {
            this.logger.log(`Deleting sub-billing customer ${customerId}`);
            const response = await firstValueFrom(
                this.httpService.delete(`${this.subBillingUrl}/customers/${customerId}`)
            );
            if (response.data && response.data.success) {
                this.logger.log(`Sub-billing customer ${customerId} deleted successfully`);
                return;
            }
            this.logger.warn(`Sub-billing DELETE returned unexpected body for ${customerId}: ${JSON.stringify(response.data)}`);
        } catch (error) {
            if (error.response?.status === 404) {
                this.logger.warn(`Sub-billing customer ${customerId} not found (404). Skipping.`);
                return;
            }
            this.logger.error(`Failed to delete sub-billing customer ${customerId}: ${error.response?.data?.message || error.message}`);
        }
    }

    async createSubBillingSubscription(customerId: string, planId: string) {
        try {
            this.logger.log(`Creating subscription in sub-billing for customer ${customerId} to plan ${planId}`);
            const response = await firstValueFrom(
                this.httpService.post(`${this.subBillingUrl}/subscriptions`, {
                    customer_id: customerId,
                    plan_id: planId,
                    status: 'active',
                    override_balance_check: false
                })
            );
            if (response.data && response.data.success) {
                return response.data.data;
            }
            throw new Error(response.data?.message || 'Unknown error');
        } catch (error) {
            const errorMsg = error.response?.data?.message || error.message;
            this.logger.error(`Failed to create sub-billing subscription: ${errorMsg}`);
            throw new BadRequestException(`Failed to create sub-billing subscription: ${errorMsg}`);
        }
    }

    async getSubBillingPlan(planId: string) {
        try {
            const response = await firstValueFrom(
                this.httpService.get(`${this.subBillingUrl}/plans/${planId}`)
            );
            if (response.data && response.data.success) {
                return response.data.data;
            }
            return response.data;
        } catch (error) {
            this.logger.error(`Failed to fetch plan from sub-billing: ${error.message}`);
            return null;
        }
    }

    async getPaymentDetails(tenantId: string) {
        try {
            const customerId = await this.getSubBillingCustomerId(tenantId);
            const response = await firstValueFrom(
                this.httpService.get(`${this.subBillingUrl}/payments/details/customer/${customerId}`)
            );
            return response.data?.data || [];
        } catch (error) {
            this.logger.error(`Failed to fetch payment details from Sub Billing for tenant ${tenantId}: ${error.message}`);
            return [];
        }
    }

    async getAllPaymentDetails() {
        try {
            const response = await firstValueFrom(
                this.httpService.get(`${this.subBillingUrl}/payments/details`)
            );
            return response.data?.data || [];
        } catch (error) {
            this.logger.error(`Failed to fetch all payment details from Sub Billing: ${error.message}`);
            return [];
        }
    }

    async getAssets(tenantId: string) {
        const customerId = await this.getSubBillingCustomerId(tenantId);
        try {
            const response = await firstValueFrom(
                this.httpService.get(`${this.subBillingUrl}/pbx/assets/${customerId}`)
            );
            return response.data;
        } catch (error) {
            this.logger.error(`Failed to fetch assets from sub-billing for ${customerId}: ${error.message}`);
            return { tfns: [], dids: [], extensions: [], totals: { tfns: 0, dids: 0, extensions: 0 } };
        }
    }

    async updateCreditLimit(tenantId: string, creditLimit: number) {
        const customerId = await this.getSubBillingCustomerId(tenantId);
        if (creditLimit < 0) {
            throw new BadRequestException('Credit limit cannot be negative');
        }
        try {
            const response = await firstValueFrom(
                this.httpService.put(`${this.subBillingUrl}/customers/${customerId}/credit-limit`, {
                    credit_limit: creditLimit
                })
            );
            return response.data;
        } catch (error) {
            const errorMsg = error.response?.data?.message || error.message;
            this.logger.error(`Failed to update credit limit for ${customerId}: ${errorMsg}`);
            throw new BadRequestException(`Failed to update credit limit: ${errorMsg}`);
        }
    }

    async getCustomerDetails(tenantId: string) {
        try {
            const customerId = await this.getSubBillingCustomerId(tenantId);
            const response = await firstValueFrom(
                this.httpService.get(`${this.subBillingUrl}/customers/${customerId}`)
            );
            if (response.data && response.data.success) {
                return response.data.data;
            }
            return response.data;
        } catch (error) {
            this.logger.warn(`Failed to fetch customer details from sub-billing for tenant ${tenantId}: ${error.message}`);
            return null;
        }
    }

    async updateCustomerDetails(tenantId: string, details: {
        customerType?: string;
        companyName?: string;
        companyTaxId?: string;
        firstName?: string;
        lastName?: string;
        adminEmail?: string;
        phone?: string;
        address?: string;
        city?: string;
        state?: string;
        country?: string;
        creditLimit?: number;
    }) {
        const customerId = await this.getSubBillingCustomerId(tenantId);

        let mappedCountry = details.country ? details.country.toUpperCase() : undefined;
        if (mappedCountry) {
            if (mappedCountry === 'INDIA') mappedCountry = 'IND';
            else if (mappedCountry === 'CANADA') mappedCountry = 'CAD';
            else if (mappedCountry === 'PAKISTAN') mappedCountry = 'PAK';
            else if (mappedCountry === 'PHILIPPINES') mappedCountry = 'PHI';
            else if (mappedCountry === 'BANGLADESH') mappedCountry = 'BNG';
        }

        const payload: any = {};
        if (details.customerType !== undefined) payload.customer_type = details.customerType;
        if (details.companyName !== undefined) payload.company_name = details.companyName;
        if (details.companyTaxId !== undefined) payload.company_tax_id = details.companyTaxId;
        if (details.firstName !== undefined) payload.first_name = details.firstName;
        if (details.lastName !== undefined) payload.last_name = details.lastName;
        if (details.adminEmail !== undefined) payload.admin_email = details.adminEmail;
        if (details.phone !== undefined) payload.phone = details.phone;
        if (details.address !== undefined) payload.address_st = details.address;
        if (details.city !== undefined) payload.city = details.city;
        if (details.state !== undefined) payload.state = details.state;
        if (mappedCountry !== undefined) payload.country = mappedCountry;
        if (details.creditLimit !== undefined && details.creditLimit !== null && (details.creditLimit as any) !== '') {
            payload.credit_limit = Number(details.creditLimit);
        }

        try {
            const response = await firstValueFrom(
                this.httpService.put(`${this.subBillingUrl}/customers/${customerId}`, payload)
            );
            if (response.data && response.data.success) {
                return response.data.data;
            }
            return response.data;
        } catch (error) {
            const errorMsg = error.response?.data?.message || error.message;
            this.logger.error(`Failed to update customer details in sub-billing for ${customerId}: ${errorMsg}`);
            throw new BadRequestException(`Failed to update sub-billing customer: ${errorMsg}`);
        }
    }
}
