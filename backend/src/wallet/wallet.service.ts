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
import { mirrorSubBillingPlan } from '../plans/plan-mirror';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';

export interface AllSubscriptionsQueryDto {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
    hasSubscription?: boolean;
}


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
        private subscriptions: SubscriptionsService,
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

    async getAllSubscriptions(query?: AllSubscriptionsQueryDto) {
        const page = Math.max(1, query?.page || 1);
        const limit = Math.max(1, Math.min(100, query?.limit || 50));
        const search = query?.search?.trim()?.toLowerCase() || '';
        const status = query?.status?.trim()?.toUpperCase() || '';
        const hasSubscription = query?.hasSubscription;

        try {
            // 1. Fetch all tenants from PBX database
            const tenants = await this.prisma.tenant.findMany({
                select: {
                    id: true,
                    name: true,
                    customerCode: true,
                    subBillingCustomerId: true,
                    status: true,
                    serviceBlocked: true,
                    createdAt: true,
                    users: {
                        where: { role: 'ADMIN' },
                        select: { email: true },
                        take: 1
                    }
                },
                orderBy: { createdAt: 'desc' }
            });

            // 2. Query Sub-Billing for active subscriptions and balances in parallel with resilient fallbacks
            let billingSubscriptions: any[] = [];
            let billingBalances: any[] = [];

            try {
                const [subsRes, balancesRes] = await Promise.all([
                    firstValueFrom(this.httpService.get(`${this.subBillingUrl}/pbx/subscriptions/all`)).catch(err => {
                        this.logger.warn(`Failed to fetch /pbx/subscriptions/all from Sub-Billing: ${err.message}`);
                        return { data: [] };
                    }),
                    firstValueFrom(this.httpService.get(`${this.subBillingUrl}/pbx/all`)).catch(err => {
                        this.logger.warn(`Failed to fetch /pbx/all from Sub-Billing: ${err.message}`);
                        return { data: [] };
                    })
                ]);

                billingSubscriptions = Array.isArray(subsRes?.data) ? subsRes.data : [];
                billingBalances = Array.isArray(balancesRes?.data) ? balancesRes.data : [];
            } catch (billingErr: any) {
                this.logger.error(`Sub-Billing communication error in getAllSubscriptions: ${billingErr.message}`);
            }

            // 3. Map for fast O(1) lookups
            const subMap = new Map<string, any>();
            for (const sub of billingSubscriptions) {
                if (sub?.customer_id) {
                    subMap.set(sub.customer_id, sub);
                }
            }

            const balanceMap = new Map<string, any>();
            for (const bal of billingBalances) {
                if (bal?.customer_id) {
                    balanceMap.set(bal.customer_id, bal);
                }
            }

            // 4. Enrich each tenant with subscription and wallet data
            let enriched = tenants.map(tenant => {
                const sub = tenant.subBillingCustomerId ? subMap.get(tenant.subBillingCustomerId) : null;
                const bal = tenant.subBillingCustomerId ? balanceMap.get(tenant.subBillingCustomerId) : null;
                const adminEmail = tenant.users && tenant.users.length > 0 ? tenant.users[0].email : null;

                return {
                    tenantId: tenant.id,
                    tenantName: tenant.name,
                    customerCode: tenant.customerCode,
                    subBillingCustomerId: tenant.subBillingCustomerId,
                    tenantStatus: tenant.status,
                    serviceBlocked: tenant.serviceBlocked,
                    adminEmail,
                    hasSubscription: !!sub,
                    subscription: sub ? {
                        id: sub.id,
                        subscription_id: sub.subscription_id,
                        status: sub.status,
                        plan_id: sub.plan_id,
                        plan_name: sub.plan_name,
                        amount: sub.amount,
                        currency: sub.currency,
                        start_date: sub.start_date,
                        next_billing: sub.next_billing,
                        auto_renew: sub.auto_renew,
                        target_plan_id: sub.target_plan_id || null,
                        target_plan_name: sub.target_plan_name || null,
                        target_plan_amount: sub.target_plan_amount ?? null,
                        scheduled_switch_at: sub.scheduled_switch_at || null,
                        active_addons_count: sub.active_addons_count || 0,
                        limits: sub.limits || { extensions: 0, free_mins: 0 }
                    } : null,
                    wallet: {
                        balance: bal ? bal.balance : 0,
                        freeMins: bal ? bal.freeMins : 0,
                        currency: bal ? bal.currency : 'USD'
                    }
                };
            });

            // 5. Apply filters
            if (status) {
                enriched = enriched.filter(t => t.tenantStatus?.toUpperCase() === status);
            }

            if (hasSubscription !== undefined) {
                enriched = enriched.filter(t => t.hasSubscription === hasSubscription);
            }

            if (search) {
                enriched = enriched.filter(t => {
                    const matchesName = t.tenantName?.toLowerCase().includes(search);
                    const matchesCode = t.customerCode?.toLowerCase().includes(search);
                    const matchesCustId = t.subBillingCustomerId?.toLowerCase().includes(search);
                    const matchesEmail = t.adminEmail?.toLowerCase().includes(search);
                    const matchesPlan = t.subscription?.plan_name?.toLowerCase().includes(search);
                    return Boolean(matchesName || matchesCode || matchesCustId || matchesEmail || matchesPlan);
                });
            }

            // 6. Pagination
            const total = enriched.length;
            const totalPages = Math.ceil(total / limit) || 1;
            const startIndex = (page - 1) * limit;
            const paginatedData = enriched.slice(startIndex, startIndex + limit);

            return {
                data: paginatedData,
                pagination: {
                    page,
                    limit,
                    total,
                    totalPages
                }
            };
        } catch (error: any) {
            this.logger.error(`Failed to get all subscriptions: ${error.message}`);
            return {
                data: [],
                pagination: {
                    page,
                    limit,
                    total: 0,
                    totalPages: 1
                }
            };
        }
    }

    async toggleSubscriptionAutoRenew(tenantId: string, autoRenew: boolean) {
        const customerId = await this.getSubBillingCustomerId(tenantId);
        try {
            const subRes = await firstValueFrom(
                this.httpService.get(`${this.subBillingUrl}/subscriptions/customer/${customerId}`)
            );
            const activeSub = subRes.data?.data?.find((s: any) => s.status === 'active');
            if (!activeSub) {
                throw new BadRequestException('No active subscription found to toggle');
            }

            const response = await firstValueFrom(
                this.httpService.patch(`${this.subBillingUrl}/subscriptions/${activeSub.id}/auto-renew`, { auto_renew: autoRenew })
            );
            return response.data;
        } catch (error: any) {
            const message = error.response?.data?.message || error.message;
            throw new BadRequestException(`Failed to toggle auto-renew: ${message}`);
        }
    }

    async cancelScheduledPlanSwitch(tenantId: string) {
        const customerId = await this.getSubBillingCustomerId(tenantId);
        try {
            this.logger.log(`Cancelling scheduled subscription plan switch in sub-billing for customer ${customerId} (tenant ${tenantId})`);
            const response = await firstValueFrom(
                this.httpService.post(`${this.subBillingUrl}/subscriptions/cancel-switch`, {
                    customer_id: customerId
                })
            );
            return response.data;
        } catch (error: any) {
            const errorMsg = error.response?.data?.message || error.message;
            this.logger.error(`Failed to cancel scheduled plan switch for tenant ${tenantId}: ${errorMsg}`);
            throw new BadRequestException(`Failed to cancel scheduled plan switch: ${errorMsg}`);
        }
    }

    // Compatibility for the customer-creation wizard; this is activation, not plan switching.
    async switchSubscriptionPlan(tenantId: string, planId: string, immediate: boolean = true, actor: string = 'onboarding') {
        if (!immediate) throw new BadRequestException('Scheduled plan switching is retired. Manage subscriptions and asset reassignment from Subscriptions.');
        await this.getSubBillingCustomerId(tenantId);
        const planResponse = await firstValueFrom(this.httpService.get(`${this.subBillingUrl}/plans/${encodeURIComponent(planId)}`));
        const remotePlan = planResponse.data?.data || planResponse.data;
        if (!remotePlan || remotePlan.plan_id !== planId) throw new BadRequestException(`Sub-billing plan ${planId} was not found`);
        await mirrorSubBillingPlan(this.prisma, remotePlan);
        this.logger.log(`Activating subscription for tenant ${tenantId}: ${planId}`);
        const result = await this.subscriptions.activate(tenantId, {
            plan_id: planId,
            payment_mode: 'wallet',
            auto_renew: false,
            // Stable across HTTP retries, including retries after PBX reconciliation fails.
            operation_key: `wallet-activation:${tenantId}:${planId}`,
        }, actor);
        return { success: true, data: result };
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
