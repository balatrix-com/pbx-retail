import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { FreeSwitchSyncService } from '../freeswitch/freeswitch-sync.service';
import { AdminService } from '../admin/admin.service';
import { LookupRedisService } from '../redis/lookup-redis.module';
import { WalletService } from '../wallet/wallet.service';
import { ExtensionsService } from '../telecom/extensions/extensions.service';
import { MailService } from '../mail/mail.service';

@Injectable()
export class TenantsService {
    private readonly logger = new Logger(TenantsService.name);

    constructor(
        private prisma: PrismaService,
        private freeSwitchSync: FreeSwitchSyncService,
        private adminService: AdminService,
        private lookupRedis: LookupRedisService,
        private walletService: WalletService,
        private extensionsService: ExtensionsService,
        private mailService: MailService,
    ) { }

    async listTenants(query: {
        page?: number;
        limit?: number;
        search?: string;
        blocked?: boolean;
    }) {
        const page = query.page || 1;
        const limit = query.limit || 20;
        const skip = (page - 1) * limit;

        const where: any = {};
        if (query.search) {
            where.OR = [
                { name: { contains: query.search, mode: 'insensitive' } },
                { id: { contains: query.search } } // Search by ID too
            ];
        }
        if (query.blocked !== undefined) {
            where.serviceBlocked = query.blocked;
        }

        const [data, total, realTimeBalances] = await Promise.all([
            this.prisma.tenant.findMany({
                where,
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
                include: {
                    _count: {
                        select: { users: true }
                    },
                    wallet: true
                }
            }),
            this.prisma.tenant.count({ where }),
            this.adminService.getRealTimeBalances()
        ]);

        // Merge real-time balances into the PBX tenant data
        const enrichedData = data.map((tenant: any) => {
            const billingWallet = realTimeBalances.find((b: any) => b.customer_id === tenant.id);
            if (billingWallet) {
                return {
                    ...tenant,
                    wallet: {
                        ...tenant.wallet,
                        balance: billingWallet.balance,
                        currency: billingWallet.currency
                    }
                };
            }
            return tenant;
        });

        return {
            data: enrichedData,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit)
            }
        };
    }

    async getGlobalStats() {
        const [
            totalTenants,
            totalUsers,
            totalWalletBalance,
            totalExtensions
        ] = await Promise.all([
            this.prisma.tenant.count(),
            this.prisma.user.count(),
            this.adminService.getBillingTotalBalance(),
            this.prisma.extension.count()
        ]);

        const limitStr = process.env.SYSTEM_LIMIT_EXTENSIONS;
        const limit = limitStr ? parseInt(limitStr, 10) : 500;
        const availableExtensions = Math.max(0, limit - totalExtensions);

        return {
            totalTenants,
            totalUsers,
            totalWalletBalance,
            totalExtensions,
            availableExtensions,
            limitExtensions: limit
        };
    }

    async toggleTenantBlock(tenantId: string, blocked: boolean) {
        const tenant = await this.prisma.tenant.findUnique({
            where: { id: tenantId }
        });

        if (!tenant) throw new NotFoundException('Tenant not found');

        return this.prisma.tenant.update({
            where: { id: tenantId },
            data: { serviceBlocked: blocked }
        });
    }

    async getGrowthAnalytics(period: '30d' | '12m') {
        const now = new Date();
        const info = this.getDateRange(period, now);

        const tenants = await this.prisma.tenant.findMany({
            where: {
                createdAt: { gte: info.startDate }
            },
            select: { createdAt: true }
        });

        return this.aggregateByDate(tenants.map(t => ({ date: t.createdAt, value: 1 })), info.isMonthly, info.startDate, now);
    }

    async getRevenueAnalytics(period: '30d' | '12m') {
        const now = new Date();
        const info = this.getDateRange(period, now);

        const transactions = await this.prisma.walletTransaction.findMany({
            where: {
                createdAt: { gte: info.startDate },
                type: 'CREDIT'
            },
            select: { createdAt: true, amount: true }
        });

        // Convert Decimal to number for aggregation
        const items = transactions.map(t => ({ date: t.createdAt, value: Number(t.amount) }));
        return this.aggregateByDate(items, info.isMonthly, info.startDate, now);
    }

    private getDateRange(period: string, now: Date) {
        const startDate = new Date(now);
        let isMonthly = false;

        if (period === '12m') {
            startDate.setFullYear(startDate.getFullYear() - 1);
            isMonthly = true;
        } else {
            startDate.setDate(startDate.getDate() - 30);
        }
        return { startDate, isMonthly };
    }

    private aggregateByDate(items: { date: Date, value: number }[], isMonthly: boolean, start: Date, end: Date) {
        const map = new Map<string, number>();

        // Initialize map with 0
        const current = new Date(start);
        while (current <= end) {
            const key = isMonthly
                ? `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, '0')}`
                : `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, '0')}-${String(current.getDate()).padStart(2, '0')}`;

            map.set(key, 0);

            if (isMonthly) current.setMonth(current.getMonth() + 1);
            else current.setDate(current.getDate() + 1);
        }

        // Aggregate
        for (const item of items) {
            const key = isMonthly
                ? `${item.date.getFullYear()}-${String(item.date.getMonth() + 1).padStart(2, '0')}`
                : `${item.date.getFullYear()}-${String(item.date.getMonth() + 1).padStart(2, '0')}-${String(item.date.getDate()).padStart(2, '0')}`;

            if (map.has(key)) {
                map.set(key, map.get(key)! + item.value);
            }
        }

        return Array.from(map.entries()).map(([date, value]) => ({ date, value }));
    }

    async getTenantDetails(id: string) {
        const tenant = await this.prisma.tenant.findUnique({
            where: { id },
            include: {
                wallet: true,
                tenantFeatures: true,
                _count: {
                    select: {
                        users: true,
                        extensions: true,
                        dids: true,
                        ringGroups: true,
                        ivrs: true,
                        operationalSchedules: true
                    }
                }
            }
        });

        if (!tenant) throw new NotFoundException('Tenant not found');

        const features = tenant.tenantFeatures || {
            ivrEnabled: true,
            ivrLimit: 10,
            ringGroupEnabled: true,
            ringGroupLimit: 10,
            schedulerEnabled: true,
            schedulerLimit: 10,
            didForwardEnabled: true,
            didForwardLimit: 10,
            monitorEnabled: true,
            monitorLimit: 10
        };

        // Override local wallet with real-time balance and credit limit from billing system
        let realWallet = tenant.wallet;
        try {
            const billingBalance = await this.walletService.getBalance(tenant.id);
            if (realWallet) {
                realWallet.balance = new Prisma.Decimal(billingBalance.balance);
                (realWallet as any).creditLimit = billingBalance.creditLimit;
            } else {
                realWallet = {
                    balance: new Prisma.Decimal(billingBalance.balance),
                    currency: billingBalance.currency,
                    creditLimit: billingBalance.creditLimit
                } as any;
            }
        } catch (error) {
            // If fetching real balance fails, just use local fallback (or 0)
            if (!realWallet) {
                realWallet = { balance: new Prisma.Decimal(0), currency: 'USD', creditLimit: 0 } as any;
            } else {
                (realWallet as any).creditLimit = 0;
            }
        }

        // Fetch real-time active subscription details from sub-billing system
        let subscription = null;
        try {
            subscription = await this.walletService.getSubscription(id);
        } catch (error) {
            this.logger.warn(`Could not fetch subscription details for tenant ${id}: ${error.message}`);
        }

        // Fetch primary admin user for this tenant
        const adminUser = await this.prisma.user.findFirst({
            where: { tenantId: id, role: 'ADMIN' },
            select: { id: true, email: true, name: true, createdAt: true }
        });

        // Fetch real-time customer onboarding details from sub-billing
        let customerDetails = null;
        try {
            customerDetails = await this.walletService.getCustomerDetails(id);
        } catch (error) {
            this.logger.warn(`Could not fetch customer details for tenant ${id}: ${error.message}`);
        }

        // Derive first and last name if not explicitly in customerDetails
        let firstName = customerDetails?.first_name || '';
        let lastName = customerDetails?.last_name || '';
        if (!firstName && !lastName && adminUser?.name) {
            const parts = adminUser.name.split(' ');
            firstName = parts[0] || '';
            lastName = parts.slice(1).join(' ') || '';
        }

        const enrichedCustomerDetails = {
            customerType: customerDetails?.customer_type || 'company',
            companyName: customerDetails?.company_name || tenant.name,
            companyTaxId: customerDetails?.company_tax_id || '',
            firstName: firstName,
            lastName: lastName,
            adminEmail: customerDetails?.admin_email || adminUser?.email || '',
            phone: customerDetails?.phone || '',
            address: customerDetails?.address_st || '',
            city: customerDetails?.city || '',
            state: customerDetails?.state || '',
            country: customerDetails?.country || 'USA',
            creditLimit: (realWallet as any)?.creditLimit !== undefined ? Number((realWallet as any).creditLimit) : (customerDetails?.credit_limit !== undefined ? Number(customerDetails.credit_limit) : 0)
        };

        return {
            ...tenant,
            wallet: realWallet,
            tenantFeatures: features,
            subscription,
            adminUser,
            customerDetails: enrichedCustomerDetails,
            stats: {
                users: tenant._count.users,
                extensions: tenant._count.extensions,
                dids: tenant._count.dids,
                ringGroups: tenant._count.ringGroups,
                ivrs: tenant._count.ivrs,
                schedules: tenant._count.operationalSchedules
            }
        };
    }

    async updateTenantDetails(id: string, dto: {
        customerType?: 'company' | 'individual';
        companyName?: string;
        companyTaxId?: string;
        firstName?: string;
        lastName?: string;
        adminEmail?: string;
        adminPassword?: string;
        phone?: string;
        address?: string;
        city?: string;
        state?: string;
        country?: string;
        creditLimit?: number;
    }) {
        const tenant = await this.prisma.tenant.findUnique({
            where: { id }
        });
        if (!tenant) throw new NotFoundException('Tenant not found');

        // 1. Update Sub-Billing customer details & Credit limit
        try {
            await this.walletService.updateCustomerDetails(id, dto);
        } catch (err) {
            this.logger.warn(`Sub-billing update failed or skipped: ${err.message}`);
        }

        // 2. Update PBX Tenant Name if companyName or firstName/lastName changed
        let newTenantName = tenant.name;
        if (dto.customerType === 'company' && dto.companyName) {
            newTenantName = dto.companyName.trim();
        } else if (dto.customerType === 'individual' && (dto.firstName || dto.lastName)) {
            newTenantName = `${dto.firstName || ''} ${dto.lastName || ''}`.trim();
        } else if (dto.companyName) {
            newTenantName = dto.companyName.trim();
        }

        if (newTenantName && newTenantName !== tenant.name) {
            await this.prisma.tenant.update({
                where: { id },
                data: { name: newTenantName }
            });
        }

        // 3. Update PBX Admin User
        const adminUser = await this.prisma.user.findFirst({
            where: { tenantId: id, role: 'ADMIN' }
        });

        if (adminUser) {
            const userUpdateData: any = {};
            if (dto.firstName || dto.lastName) {
                userUpdateData.name = `${dto.firstName || ''} ${dto.lastName || ''}`.trim();
            }
            if (dto.adminEmail && dto.adminEmail.toLowerCase() !== adminUser.email.toLowerCase()) {
                const emailExists = await this.prisma.user.findUnique({
                    where: { email: dto.adminEmail.toLowerCase() }
                });
                if (emailExists && emailExists.id !== adminUser.id) {
                    throw new BadRequestException('Email already in use by another user');
                }
                userUpdateData.email = dto.adminEmail.toLowerCase();
            }
            if (dto.adminPassword && dto.adminPassword.trim().length > 0) {
                const hashedPassword = await import('bcrypt').then(m => m.hash(dto.adminPassword!, 10));
                userUpdateData.password = hashedPassword;
            }

            if (Object.keys(userUpdateData).length > 0) {
                await this.prisma.user.update({
                    where: { id: adminUser.id },
                    data: userUpdateData
                });
            }
        }

        return this.getTenantDetails(id);
    }


    async updateTenantFeatures(id: string, dto: {
        ivrEnabled?: boolean;
        ivrLimit?: number;
        ringGroupEnabled?: boolean;
        ringGroupLimit?: number;
        schedulerEnabled?: boolean;
        schedulerLimit?: number;
        didForwardEnabled?: boolean;
        didForwardLimit?: number;
        monitorEnabled?: boolean;
        monitorLimit?: number;
        recordingAllowed?: boolean;
    }) {
        const tenant = await this.prisma.tenant.findUnique({
            where: { id }
        });
        if (!tenant) throw new NotFoundException('Tenant not found');

        const isDisablingRecording = dto.recordingAllowed === false;

        const updatedFeatures = await this.prisma.tenantFeature.upsert({
            where: { tenantId: id },
            create: {
                tenantId: id,
                ivrEnabled: dto.ivrEnabled ?? true,
                ivrLimit: dto.ivrLimit ?? 10,
                ringGroupEnabled: dto.ringGroupEnabled ?? true,
                ringGroupLimit: dto.ringGroupLimit ?? 10,
                schedulerEnabled: dto.schedulerEnabled ?? true,
                schedulerLimit: dto.schedulerLimit ?? 10,
                didForwardEnabled: dto.didForwardEnabled ?? true,
                didForwardLimit: dto.didForwardLimit ?? 10,
                monitorEnabled: dto.monitorEnabled ?? true,
                monitorLimit: dto.monitorLimit ?? 10,
                recordingAllowed: dto.recordingAllowed ?? false,
                recordingEnabled: false,
            },
            update: {
                ivrEnabled: dto.ivrEnabled,
                ivrLimit: dto.ivrLimit,
                ringGroupEnabled: dto.ringGroupEnabled,
                ringGroupLimit: dto.ringGroupLimit,
                schedulerEnabled: dto.schedulerEnabled,
                schedulerLimit: dto.schedulerLimit,
                didForwardEnabled: dto.didForwardEnabled,
                didForwardLimit: dto.didForwardLimit,
                monitorEnabled: dto.monitorEnabled,
                monitorLimit: dto.monitorLimit,
                recordingAllowed: dto.recordingAllowed,
                ...(isDisablingRecording ? { recordingEnabled: false } : {}),
            }
        });

        if (isDisablingRecording) {
            await this.prisma.extension.updateMany({
                where: { tenantId: id },
                data: { recordingEnabled: false }
            });
            await this.freeSwitchSync.syncAllDialplans(id);
        }

        return updatedFeatures;
    }



    async assignOutboundEndpoint(tenantId: string, endpointId: number) {
        const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
        if (!tenant) throw new NotFoundException('Tenant not found');

        const updated = await this.prisma.tenant.update({
            where: { id: tenantId },
            data: { outboundEndpointId: endpointId }
        });

        await this.freeSwitchSync.syncTenantForwards(tenantId);
        await this.invalidateT2002Cache(tenant.customerCode);
        return updated;
    }

    async removeOutboundEndpoint(tenantId: string) {
        const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
        if (!tenant) throw new NotFoundException('Tenant not found');

        const updated = await this.prisma.tenant.update({
            where: { id: tenantId },
            data: { outboundEndpointId: null }
        });

        await this.freeSwitchSync.syncTenantForwards(tenantId);
        await this.invalidateT2002Cache(tenant.customerCode);
        return updated;
    }

    private async invalidateT2002Cache(customerCode: string | null) {
        if (!customerCode) return;
        const baseUrl = process.env.CACHE_FLUSH_URL || 'http://localhost:8000';
        const token = process.env.CACHE_FLUSH_TOKEN || 'PBX_FLUSH_2026_acaJOOAJjasojoa';
        const url = `${baseUrl}/admin/cache/flush/carrier?customer=${customerCode}`;

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'X-Cache-Token': token
                }
            });
            if (!response.ok) {
                console.error(`Failed to flush t_2002 cache for ${customerCode}: ${response.statusText}`);
            }
        } catch (error) {
            console.error(`Error flushing t_2002 cache for ${customerCode}:`, error);
        }
    }


    async createTenant(data: {
        customerType: 'individual' | 'company';
        firstName: string;
        lastName: string;
        companyName?: string;
        companyTaxId?: string;
        adminEmail: string;
        adminPassword: string;
        planId?: string;
        phone: string;
        address: string;
        city: string;
        state: string;
        country: string;
        creditLimit?: number;
    }) {
        // Validation - Throw errors immediately (no defaults/placeholders!)
        if (!data.customerType || !['individual', 'company'].includes(data.customerType)) {
            throw new Error('customerType is required and must be either individual or company');
        }
        if (!data.firstName) throw new Error('firstName is required');
        if (!data.lastName) throw new Error('lastName is required');
        if (!data.adminEmail) throw new Error('adminEmail is required');
        if (!data.adminPassword) throw new Error('adminPassword is required');
        if (!data.phone) throw new Error('phone is required');
        if (!data.address || data.address.length < 10) throw new Error('address is required and must be at least 10 characters');
        if (!data.city) throw new Error('city is required');
        if (!data.state) throw new Error('state is required');
        if (!data.country) throw new Error('country is required');

        if (data.customerType === 'company') {
            if (!data.companyName) throw new Error('companyName is required for company type');
            if (!data.companyTaxId) throw new Error('companyTaxId is required for company type');
        }

        const existingUser = await this.prisma.user.findUnique({
            where: { email: data.adminEmail.toLowerCase() }
        });

        if (existingUser) {
            throw new Error('User with this email already exists');
        }

        let subBillingCustomerId: string | null = null;
        let subBillingSubscriptionId: string | null = null;
        let localPlanId: string | null = null;
        let freeMinutes = 0;

        // Generate Customer Code (Sequential starting from 1001)
        // This ensures extensions start at U100101, U100201, etc.
        // Find the highest existing customer code numerically
        const allTenants = await this.prisma.tenant.findMany({
            where: { customerCode: { not: null } },
            select: { customerCode: true }
        });

        let nextCode = 1001; // Default start

        if (allTenants.length > 0) {
            const maxCode = Math.max(
                ...allTenants
                    .map(t => {
                        const match = t.customerCode!.match(/\d+/);
                        return match ? parseInt(match[0], 10) : 0;
                    })
                    .filter(c => !isNaN(c) && c > 0)
            );
            if (maxCode >= 1001) {
                nextCode = maxCode + 1;
            }
        }

        // Ensure uniqueness (though sequential should be unique unless race condition or gaps)
        let customerCode = `U${nextCode}`;
        let isUnique = false;
        let retries = 0;

        while (!isUnique && retries < 50) {
            const exists = await this.prisma.tenant.findUnique({ where: { customerCode } });
            if (exists) {
                nextCode++;
                customerCode = `U${nextCode}`;
                retries++;
                continue;
            }

            const existsInSubBilling = await this.walletService.checkCustomerExists(customerCode);
            if (existsInSubBilling) {
                this.logger.warn(`Stale sub-billing record found for ${customerCode}. Cleaning up before re-creation.`);
                await this.walletService.deleteSubBillingCustomer(customerCode);
            }

            isUnique = true;
        }

        if (!isUnique) throw new Error('Failed to generate unique customer code');

        // Create customer in sub-billing (Always run this for new tenants!)
        const subCustomer = await this.walletService.createSubBillingCustomerExtended({
            customerId: customerCode,
            customerType: data.customerType,
            firstName: data.firstName,
            lastName: data.lastName,
            companyName: data.companyName,
            companyTaxId: data.companyTaxId,
            email: data.adminEmail,
            phone: data.phone,
            address: data.address,
            city: data.city,
            state: data.state,
            country: data.country,
            creditLimit: data.creditLimit !== undefined && data.creditLimit !== null && (data.creditLimit as any) !== '' ? Number(data.creditLimit) : undefined
        });
        subBillingCustomerId = subCustomer.customer_id;

        // Transactional creation
        const result = await this.prisma.$transaction(async (prisma) => {
            // 1. Create Tenant
            const tenant = await prisma.tenant.create({
                data: {
                    id: subBillingCustomerId || undefined, // Use subBillingCustomerId as primary key if available
                    name: data.customerType === 'company' ? data.companyName! : `${data.firstName} ${data.lastName}`,
                    serviceBlocked: false,
                    customerCode,
                    subBillingCustomerId: subBillingCustomerId || null,
                }
            });

            // 2. Create Wallet
            await prisma.wallet.create({
                data: {
                    tenantId: tenant.id,
                    balance: 0.00
                }
            });

            // 3. Create Monitoring Addon (Default Active?)
            await prisma.monitoringAddOn.create({
                data: {
                    tenantId: tenant.id,
                    isActive: true,
                    price: 5.00
                }
            });

            // 4. Create Admin User
            // We need bcrypt here. Service typically imports bcrypt.
            // Wait, we don't have bcrypt imported in this file. 
            // We should import it at the top. 
            // BUT, `AuthService` handles signup usually. 
            // Replicating logic here is fine for Super Admin action.
            // We need to import * as bcrypt from 'bcrypt';
            const hashedPassword = await import('bcrypt').then(m => m.hash(data.adminPassword, 10));

            const user = await prisma.user.create({
                data: {
                    email: data.adminEmail.toLowerCase(),
                    password: hashedPassword,
                    name: `${data.firstName} ${data.lastName}`,
                    role: 'ADMIN',
                    tenantId: tenant.id,
                    status: 'ACTIVE',
                    monitoringEnabled: data.customerType === 'company' ? data.companyName!.startsWith('Demo') : false
                }
            });

            // 5. Create local subscription if plan matched
            if (localPlanId) {
                const endDate = new Date();
                endDate.setFullYear(endDate.getFullYear() + 1); // Default to 1 year

                await prisma.subscription.create({
                    data: {
                        tenantId: tenant.id,
                        planId: localPlanId,
                        subBillingSubscriptionId: subBillingSubscriptionId,
                        status: 'ACTIVE',
                        startDate: new Date(),
                        endDate: endDate,
                        remainingFreeMinutes: freeMinutes
                    }
                });
            }

            // 6. Initialize Redis Lookup
            await this.lookupRedis.updateExtensionLookup('', tenant.id);

            return {
                tenant,
                user: {
                    id: user.id,
                    email: user.email,
                    name: user.name,
                    role: user.role
                }
            };
        });

        // 7. Auto-sync and provision extensions in PBX & Kamailio
        await this.extensionsService.syncMissingExtensionsFromSubBilling(result.tenant.id).catch(err => {
            this.logger.warn(`Post-tenant creation extension sync warning: ${err.message}`);
        });

        // 8. Send credentials email (fire-and-forget, non-blocking)
        try {
            const tenantWithExts = await this.prisma.tenant.findUnique({
                where: { id: result.tenant.id },
                include: { extensions: true, tfns: true },
            });
            const tfn = tenantWithExts?.tfns[0]?.number || 'N/A';
            const extList = tenantWithExts?.extensions
                .map(e => `&bull; <b>${e.extensionNumber}</b> - ${e.name}<br>`)
                .join('') || 'None';
            const extHtml = `<div style="text-align:left;display:inline-block;margin:10px auto;">${extList}</div>`;

            await this.mailService.sendOnboardingCompletionEmail(
                data.adminEmail,
                `${data.firstName} ${data.lastName}`,
                result.tenant.customerCode || '',
                tfn,
                extHtml,
                data.adminEmail,
                'N/A',
                'N/A',
                data.adminPassword,
            );
            this.logger.log(`Credentials email sent to ${data.adminEmail} for tenant ${result.tenant.id}`);
        } catch (emailErr: any) {
            this.logger.error(`Failed to send credentials email to ${data.adminEmail}: ${emailErr.message}`);
        }

        return result;
    }

    async deleteTenant(id: string) {
        // 0. Cleanup external telecom dependencies (FreeSWITCH / Kamailio)
        // We fetch the entities first before deleting them from Prisma

        const tenant = await this.prisma.tenant.findUnique({ where: { id } });
        if (!tenant) throw new NotFoundException('Tenant not found');

        const [extensions, ringGroups, ivrs, didForwards, schedules, tfns, dids] = await Promise.all([
            this.prisma.extension.findMany({ where: { tenantId: id }, include: { tenant: true } }),
            this.prisma.ringGroup.findMany({ where: { tenantId: id }, include: { tenant: true } }),
            this.prisma.iVR.findMany({ where: { tenantId: id }, include: { tenant: true } }),
            this.prisma.dIDForward.findMany({ where: { tenantId: id }, include: { tenant: true } }),
            this.prisma.operationalSchedule.findMany({ where: { tenantId: id }, include: { tenant: true } }),
            this.prisma.tFN.findMany({ where: { tenantId: id }, include: { tenant: true } }),
            this.prisma.dID.findMany({ where: { tenantId: id }, include: { tenant: true } })
        ]);

        // Clean up individual entities from Kamailio and FreeSWITCH
        // Note: Individual cleanup ensures Kamailio subscribers and specific XML patterns are removed
        for (const ext of extensions) await this.freeSwitchSync.deleteExtension(ext).catch(() => { });
        for (const rg of ringGroups) await this.freeSwitchSync.deleteRingGroup(rg).catch(() => { });
        for (const ivr of ivrs) await this.freeSwitchSync.deleteIVR(ivr).catch(() => { });
        for (const fwd of didForwards) await this.freeSwitchSync.deleteDIDForward(fwd).catch(() => { });
        for (const sched of schedules) await this.freeSwitchSync.deleteSchedule(sched).catch(() => { });
        for (const tfn of tfns) await this.freeSwitchSync.deleteTFN(tfn).catch(() => { });
        for (const did of dids) await this.freeSwitchSync.deleteTFN(did).catch(() => { });

        // 0.1 Fail-safe Bulk Cleanup for FreeSWITCH routing tables and XMLs
        if (tenant.customerCode) {
            await this.freeSwitchSync.bulkDeleteTenantData(tenant.customerCode);
        }

        // 0.2 Cleanup Redis lookups
        await this.lookupRedis.deleteTenantLookups(id);

        // 0.3 Delete sub-billing customer (cascades wallet, subscriptions, assets in bala_billing)
        if (tenant.subBillingCustomerId) {
            await this.walletService.deleteSubBillingCustomer(tenant.subBillingCustomerId);
        } else if (tenant.customerCode) {
            // Fallback: customerCode doubles as customer_id in sub-billing
            await this.walletService.deleteSubBillingCustomer(tenant.customerCode);
        }

        // Proceed to delete local database records via single transaction
        return this.prisma.$transaction(async (prisma) => {
            // 1. Release Telephony Assets (TFNs)
            // TFNs have optional tenantId, so we release them back to pool
            await prisma.tFN.updateMany({
                where: { tenantId: id },
                data: { tenantId: null, status: 'AVAILABLE', routeType: null, routeTargetId: null }
            });

            // 2. Delete Telephony Configuration
            // DIDs (tenantId is required, so we must delete them, assuming platform re-provisions if needed)
            await prisma.dID.deleteMany({ where: { tenantId: id } });
            await prisma.dIDForward.deleteMany({ where: { tenantId: id } });

            await prisma.ringGroupMember.deleteMany({ where: { extension: { tenantId: id } } }); // Cascade manually if needed
            await prisma.ringGroup.deleteMany({ where: { tenantId: id } });
            await prisma.iVR.deleteMany({ where: { tenantId: id } });
            await prisma.extension.deleteMany({ where: { tenantId: id } });
            await prisma.operationalSchedule.deleteMany({ where: { tenantId: id } });
            await prisma.audioFile.deleteMany({ where: { tenantId: id } });

            // 3. Delete Billing Data
            await prisma.usageRecord.deleteMany({ where: { tenantId: id } });
            await prisma.subscription.deleteMany({ where: { tenantId: id } });
            await prisma.paymentMethod.deleteMany({ where: { tenantId: id } });

            // 4. Delete Wallet

            // Delete Transactions before Wallet? 
            // Wallet relation is 1:1. 
            // WalletTransaction has `walletId`.
            // We need to find wallet first to delete transactions?
            const wallet = await prisma.wallet.findUnique({ where: { tenantId: id } });
            if (wallet) {
                await prisma.walletTransaction.deleteMany({ where: { walletId: wallet.id } });
                await prisma.wallet.delete({ where: { id: wallet.id } });
            }

            await prisma.monitoringAddOn.deleteMany({ where: { tenantId: id } });



            // 6. Delete Users & Support Profiles
            // Support Profiles have explicit relation to User.
            // If we delete User, SupportProfiles (via `supportUserId`) should be deleted.
            // But we might need to be careful with foreign keys.
            // Simplest is to delete Users. If schema cascades, good. If not...
            // User schema: `supportProfile SupportProfile? @relation("SupportUser")`
            // SupportProfile schema: `supportUser User @relation(...)`.

            // We should delete SupportProfiles first manually just in case
            const users = await prisma.user.findMany({ where: { tenantId: id }, select: { id: true } });
            const userIds = users.map(u => u.id);

            if (userIds.length > 0) {
                await prisma.supportProfile.deleteMany({ where: { supportUserId: { in: userIds } } });
                // Also Managed Support Users? 
                // `managedSupportUsers` is relation "AdminUser". 
                // If this tenant's users were admins for OTHERS? Unlikely in this system design.
                await prisma.supportProfile.deleteMany({ where: { adminUserId: { in: userIds } } });

                await prisma.userAuditLog.deleteMany({ where: { actorId: { in: userIds } } });
                await prisma.userAuditLog.deleteMany({ where: { targetId: { in: userIds } } });

                await prisma.user.deleteMany({ where: { tenantId: id } });
            }

            // 7. Finally Delete Tenant
            return prisma.tenant.deleteMany({ where: { id } });
        }, { timeout: 30000 });
    }
}
