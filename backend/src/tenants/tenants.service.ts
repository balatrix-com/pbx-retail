import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { FreeSwitchSyncService } from '../freeswitch/freeswitch-sync.service';
import { AdminService } from '../admin/admin.service';
import { LookupRedisService } from '../redis/lookup-redis.module';
import { WalletService } from '../wallet/wallet.service';
import { ExtensionsService } from '../telecom/extensions/extensions.service';
import { MailService } from '../mail/mail.service';
import { TenantArchiveService } from './tenant-archive.service';

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
        private archives: TenantArchiveService,
    ) { }

    async listTenants(query: {
        page?: number;
        limit?: number;
        search?: string;
        blocked?: boolean;
        status?: string;
    }) {
        const page = query.page || 1;
        const limit = query.limit || 20;
        const skip = (page - 1) * limit;

        const where: any = query.status === 'ALL' ? {} : { status: query.status || { not: 'ARCHIVED' } };
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
                        select: { users: { where: { status: { not: 'DELETED' } } } }
                    },
                    wallet: true,
                    subscriptions: {
                        where: {
                            status: 'ACTIVE',
                            endDate: { gt: new Date() }
                        },
                        select: { id: true }
                    }
                }
            }),
            this.prisma.tenant.count({ where }),
            this.adminService.getRealTimeBalances()
        ]);

        const archiveJobs = await this.prisma.$queryRawUnsafe<any[]>('SELECT * FROM tenant_archive_jobs WHERE tenant_id = ANY($1::text[])', data.map(t => t.id));
        // Merge real-time balances into the PBX tenant data
        const enrichedData = data.map((tenant: any) => {
            const archiveJob = archiveJobs.find(j => j.tenant_id === tenant.id) || null;
            const hasActivePlan = Array.isArray(tenant.subscriptions) && tenant.subscriptions.length > 0;
            let serviceStatus = 'ACTIVE';
            if (tenant.status === 'ARCHIVED' || archiveJob) {
                serviceStatus = 'ARCHIVED';
            } else if (tenant.serviceBlocked || tenant.status === 'SUSPENDED') {
                serviceStatus = 'BLOCKED';
            } else if (!hasActivePlan) {
                serviceStatus = 'DEACTIVATED';
            }

            tenant = {
                ...tenant,
                archiveJob,
                serviceStatus,
                hasActivePlan
            };
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
            this.prisma.tenant.count({ where: { status: { not: 'ARCHIVED' } } }),
            this.prisma.user.count({ where: { status: { not: 'DELETED' } } }),
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
        if (typeof blocked !== 'boolean') throw new BadRequestException('blocked must be a boolean');
        const tenant = await this.prisma.tenant.findUnique({
            where: { id: tenantId }
        });

        if (!tenant) throw new NotFoundException('Tenant not found');

        if (tenant.status === 'ARCHIVED' || await this.archives.status(tenantId)) throw new BadRequestException('Archive is permanent; this tenant cannot be unblocked');

        const updated = await this.prisma.tenant.update({
            where: { id: tenantId },
            data: { serviceBlocked: blocked, status: blocked ? 'SUSPENDED' : 'ACTIVE' }
        });
        if (updated.customerCode) await this.lookupRedis.syncTenantServiceState(updated.customerCode);
        return updated;
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
            archiveJob: await this.archives.status(id),
            serviceStatus: (tenant.status === 'ARCHIVED') ? 'ARCHIVED' : (tenant.serviceBlocked || tenant.status === 'SUSPENDED') ? 'BLOCKED' : (!subscription || !['active', 'grace'].includes(subscription.status)) ? 'DEACTIVATED' : 'ACTIVE',
            hasActivePlan: Boolean(subscription && ['active', 'grace'].includes(subscription.status)),
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

        if (tenant.status === 'ARCHIVED' || await this.archives.status(id)) throw new BadRequestException('Archived customer details are read-only');
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

        // One durable authority for PBX and direct billing customer creation.
        const codes = await this.prisma.$queryRawUnsafe<Array<{ customer_code: string }>>(
            "SELECT reserve_customer_identity('U') AS customer_code"
        );
        const customerCode = codes[0].customer_code;

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

    async deleteTenant(id: string, actor: string = 'system') {
        return this.archives.request(id, actor);
    }
}
