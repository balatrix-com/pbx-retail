import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Role, UserStatus, SubscriptionStatus } from '@prisma/client';

export enum ServiceState {
    WALLET_ZERO = 'WALLET_ZERO',
    WALLET_NEGATIVE = 'WALLET_NEGATIVE',
    PLAN_EXPIRED = 'PLAN_EXPIRED',
    SERVICE_ACTIVE = 'SERVICE_ACTIVE',
}

export interface UserEnforcementState {
    isBlocked: boolean;
    blockReason: string | null;
    serviceState: ServiceState;
    userStatus: UserStatus;
    adminStatus?: UserStatus;
}

@Injectable()
export class EnforcementService {
    constructor(private prisma: PrismaService) { }

    async getServiceState(tenantId: string): Promise<ServiceState> {
        const tenant = await this.prisma.tenant.findUnique({
            where: { id: tenantId },
            include: {
                wallet: true,
                subscriptions: {
                    where: { status: SubscriptionStatus.ACTIVE }
                }
            }
        });

        if (!tenant) return ServiceState.PLAN_EXPIRED;

        // 1. Check active subscription free minutes
        const activeSub = tenant.subscriptions[0];
        const hasFreeMinutes = activeSub && Number(activeSub.remainingFreeMinutes || 0) > 0;

        // 2. Check Wallet
        const balance = Number(tenant.wallet?.balance || 0);

        if (balance < 0) return ServiceState.WALLET_NEGATIVE;
        if (balance === 0) {
            return hasFreeMinutes ? ServiceState.SERVICE_ACTIVE : ServiceState.WALLET_ZERO;
        }

        return ServiceState.SERVICE_ACTIVE;
    }

    async getUserEnforcementState(userId: string): Promise<UserEnforcementState> {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            include: {
                tenant: {
                    include: {
                        wallet: true
                    }
                },
                supportProfile: {
                    include: {
                        adminUser: true
                    }
                }
            }
        });

        if (!user) {
            return {
                isBlocked: true,
                blockReason: 'USER_NOT_FOUND',
                serviceState: ServiceState.PLAN_EXPIRED,
                userStatus: UserStatus.DELETED
            };
        }

        // 0. Super Admin Bypass
        if (user.role === Role.SUPER_ADMIN) {
            return {
                isBlocked: false,
                blockReason: null,
                serviceState: ServiceState.SERVICE_ACTIVE,
                userStatus: user.status
            };
        }

        // 1. Check user's own status
        if (user.status === UserStatus.SUSPENDED) {
            return {
                isBlocked: true,
                blockReason: 'USER_SUSPENDED',
                serviceState: ServiceState.SERVICE_ACTIVE,
                userStatus: user.status
            };
        }

        if (user.status === UserStatus.DELETED) {
            return {
                isBlocked: true,
                blockReason: 'USER_DELETED',
                serviceState: ServiceState.SERVICE_ACTIVE,
                userStatus: user.status
            };
        }

        if (user.status === UserStatus.INVITED) {
            return {
                isBlocked: true,
                blockReason: 'USER_NOT_ACTIVATED',
                serviceState: ServiceState.SERVICE_ACTIVE,
                userStatus: user.status
            };
        }

        // 2. Check if user is SUPPORT and admin is suspended
        let adminStatus: UserStatus | undefined;
        if (user.role === Role.SUPPORT && user.supportProfile) {
            const admin = user.supportProfile.adminUser;
            adminStatus = admin.status;

            if (admin.status === UserStatus.SUSPENDED || admin.status === UserStatus.DELETED) {
                return {
                    isBlocked: true,
                    blockReason: 'ADMIN_SUSPENDED',
                    serviceState: ServiceState.SERVICE_ACTIVE,
                    userStatus: user.status,
                    adminStatus: admin.status
                };
            }
        }

        // 3. Check tenant status (if applicable)
        if (user.tenant?.serviceBlocked) {
            return {
                isBlocked: true,
                blockReason: 'TENANT_SUSPENDED',
                serviceState: ServiceState.SERVICE_ACTIVE,
                userStatus: user.status,
                adminStatus
            };
        }

        // 4. Check wallet/plan enforcement (existing logic)
        let serviceState = ServiceState.SERVICE_ACTIVE;
        if (user.tenantId) {
            serviceState = await this.getServiceState(user.tenantId);
        }

        if (serviceState === ServiceState.PLAN_EXPIRED) {
            return {
                isBlocked: true,
                blockReason: 'PLAN_EXPIRED',
                serviceState,
                userStatus: user.status,
                adminStatus
            };
        }

        // WALLET_ZERO and WALLET_NEGATIVE don't block login, just services
        return {
            isBlocked: false,
            blockReason: null,
            serviceState,
            userStatus: user.status,
            adminStatus
        };
    }
}
