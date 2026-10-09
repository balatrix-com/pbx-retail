import { Injectable, Inject, ForbiddenException, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Role, UserStatus, UserAuditAction } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { InviteSupportUserDto } from './dto/invite-support-user.dto';
import { PaginationQueryDto } from './dto/pagination-query.dto';

import { KamailioDBService } from '../freeswitch/kamailio-db.service';
import { MailService } from '../mail/mail.service';
import { REDIS_CLIENT } from '../redis/redis.module';
import type { RedisClientType } from 'redis';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom, timeout } from 'rxjs';
import { ReassignMonitoringDto } from './dto/reassign-monitoring.dto';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';

@Injectable()
export class UsersService {
    constructor(
        private prisma: PrismaService,
        private kamailioService: KamailioDBService,
        private mailService: MailService,
        @Inject(REDIS_CLIENT) private readonly redisClient: RedisClientType,
        private readonly httpService: HttpService,
        private readonly configService: ConfigService,
        private readonly subscriptions: SubscriptionsService,
    ) { }

    private async monitoringAddonUnits(tenantId: string): Promise<number> {
        const tenant = await this.prisma.tenant.findUnique({
            where: { id: tenantId }, select: { subBillingCustomerId: true },
        });
        if (!tenant?.subBillingCustomerId) throw new BadRequestException('Tenant is not linked to sub-billing');
        const baseUrl = this.configService.get<string>('SUB_BILLING_API_URL') || 'http://localhost:5005/api';
        try {
            const response = await firstValueFrom(this.httpService.get(
                `${baseUrl}/addons/customer/${encodeURIComponent(tenant.subBillingCustomerId)}/monitoring-entitlement`,
            ).pipe(timeout(5000)));
            const units = Number(response.data?.data?.addon_units);
            if (response.data?.success !== true || !response.data?.data?.subscription_id || !Number.isSafeInteger(units) || units < 0) {
                throw new Error('Invalid or inactive billing entitlement');
            }
            return units;
        } catch (error) {
            throw new BadRequestException('Could not verify monitoring add-on entitlement with sub-billing');
        }
    }

    private async validateMonitoringExtension(tenantId: string, extension: string): Promise<string> {
        const tenant = await this.prisma.tenant.findUnique({
            where: { id: tenantId }, select: { customerCode: true },
        });
        const prefix = tenant?.customerCode;
        if (!prefix || !extension.startsWith(prefix) || !/^\d{2}$/.test(extension.slice(prefix.length)) || extension.slice(-2) === '00') {
            throw new BadRequestException('Monitoring extension must use the customer code followed by 01–99');
        }
        return prefix;
    }

    // Helper to create audit log
    private async createAuditLog(
        actorId: string,
        targetId: string | null,
        action: UserAuditAction,
        metadata?: any
    ) {
        await this.prisma.userAuditLog.create({
            data: {
                actorId,
                targetId,
                action,
                metadata: metadata || {}
            }
        });
    }

    // Helper to check if admin can manage a user
    private async canManageUser(adminId: string, targetUserId: string): Promise<boolean> {
        const admin = await this.prisma.user.findUnique({
            where: { id: adminId },
            include: { managedSupportUsers: true }
        });

        if (!admin) return false;
        if (admin.role === Role.SUPER_ADMIN) return true;

        if (admin.role === Role.ADMIN) {
            // ADMIN can manage any user in their tenant
            const target = await this.prisma.user.findUnique({
                where: { id: targetUserId },
                select: { tenantId: true }
            });

            if (target && target.tenantId === admin.tenantId) {
                return true;
            }
        }

        // Fallback to SupportProfile check (legacy or specific cross-tenant cases?)
        const supportProfile = await this.prisma.supportProfile.findFirst({
            where: {
                adminUserId: adminId,
                supportUserId: targetUserId
            }
        });

        return !!supportProfile;
    }

    async listUsers(userId: string, query?: PaginationQueryDto) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId }
        });

        if (!user) throw new NotFoundException('User not found');

        const page = query?.page || 1;
        const limit = Math.min(query?.limit || 20, 100);
        const skip = (page - 1) * limit;

        // Build where clause
        const where: any = {};

        if (user.role === Role.ADMIN) {
            // ADMIN sees all users in their tenant
            if (user.tenantId) {
                where.tenantId = user.tenantId;
            } else {
                // Should not happen for valid admins, but safe fallback
                where.tenantId = 'NON_EXISTENT'; // Return nothing
            }
        }
        // SUPER_ADMIN sees all users (no where clause restriction)

        // Apply filters
        if (query?.search) {
            where.OR = [
                { email: { contains: query.search, mode: 'insensitive' } },
                { name: { contains: query.search, mode: 'insensitive' } }
            ];
        }

        if (query?.status) {
            where.status = query.status;
        }

        if (query?.role) {
            where.role = query.role;
        }

        // SUPER_ADMIN can filter by tenant
        if (query?.tenantId && user.role === Role.SUPER_ADMIN) {
            if (query.tenantId === 'null') {
                where.tenantId = null;
            } else {
                where.tenantId = query.tenantId;
            }
        }

        if (user.role !== Role.SUPER_ADMIN && user.role !== Role.ADMIN) {
            throw new ForbiddenException('Insufficient permissions');
        }

        // Get total count
        const total = await this.prisma.user.count({ where });

        // Get paginated users
        const users = await this.prisma.user.findMany({
            where,
            select: {
                id: true,
                email: true,
                name: true,
                role: true,
                status: true,
                monitoringEnabled: true,
                monitoringExtension: true,
                tenantId: true,
                inviteToken: true,
                inviteTokenExpiry: true,
                tenant: user.role === Role.SUPER_ADMIN ? {
                    select: {
                        id: true,
                        name: true,
                    }
                } : false,
                createdAt: true,
                updatedAt: true
            },
            skip,
            take: limit,
            orderBy: { createdAt: 'desc' }
        });

        return {
            data: users,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit)
            }
        };
    }

    async createSupportUser(adminId: string, dto: { email: string; password: string; name?: string }) {
        const admin = await this.prisma.user.findUnique({
            where: { id: adminId }
        });

        if (!admin) throw new NotFoundException('Admin user not found');
        if (admin.role === Role.SUPPORT) {
            throw new ForbiddenException('Support users cannot create other users');
        }

        // Check if email already exists
        const existing = await this.prisma.user.findUnique({
            where: { email: dto.email }
        });

        if (existing) {
            throw new BadRequestException('Email already in use');
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(dto.password, 10);

        // Determine tenantId
        const tenantId = admin.role === Role.SUPER_ADMIN ? admin.tenantId : admin.tenantId;

        if (!tenantId && admin.role === Role.ADMIN) {
            throw new BadRequestException('Admin must belong to a tenant');
        }

        // Create support user
        const supportUser = await this.prisma.user.create({
            data: {
                email: dto.email,
                password: hashedPassword,
                name: dto.name,
                role: Role.SUPPORT,
                status: UserStatus.ACTIVE,
                tenantId
            }
        });

        // Create support profile
        await this.prisma.supportProfile.create({
            data: {
                adminUserId: adminId,
                supportUserId: supportUser.id,
                monitoringEnabled: false
            }
        });

        // Audit log
        await this.createAuditLog(adminId, supportUser.id, UserAuditAction.CREATE_USER, {
            email: dto.email,
            role: Role.SUPPORT
        });

        return {
            id: supportUser.id,
            email: supportUser.email,
            name: supportUser.name,
            role: supportUser.role,
            status: supportUser.status,
            tenantId: supportUser.tenantId,
            createdAt: supportUser.createdAt
        };
    }



    async updateUserStatus(actorId: string, targetUserId: string, status: UserStatus) {
        const canManage = await this.canManageUser(actorId, targetUserId);
        if (!canManage) {
            throw new ForbiddenException('You do not have permission to manage this user');
        }

        const targetUser = await this.prisma.user.findUnique({
            where: { id: targetUserId }
        });

        if (!targetUser) throw new NotFoundException('User not found');

        // Update status
        const updateData: any = { status };
        if (status !== UserStatus.ACTIVE && targetUser.monitoringEnabled) {
            updateData.monitoringEnabled = false;
            updateData.monitoringExtension = null;
            updateData.monitoringSecret = null;
        }
        if (status === UserStatus.ACTIVE && targetUser.status === UserStatus.INVITED) {
            updateData.inviteToken = null;
            updateData.inviteTokenExpiry = null;
        }

        const updated = await this.prisma.user.update({
            where: { id: targetUserId },
            data: updateData
        });

        if (status !== UserStatus.ACTIVE && targetUser.monitoringExtension) {
            try {
                await this.kamailioService.deleteSubscriber(targetUser.monitoringExtension, true);
            } catch (error) {
                console.error('Could not remove suspended user monitoring SIP subscriber', error);
            }
            try {
                await this.redisClient.publish('monitor_seat_changes', JSON.stringify({ userId: targetUserId }));
            } catch (error) {
                console.error('Could not notify monitor gateway of suspended user', error);
            }
        }

        // If suspending, invalidate refresh token
        if (status === UserStatus.SUSPENDED) {
            await this.prisma.user.update({
                where: { id: targetUserId },
                data: { refreshToken: null }
            });
        }

        // Audit log
        const action = status === UserStatus.SUSPENDED ? UserAuditAction.SUSPEND_USER :
            status === UserStatus.ACTIVE ? UserAuditAction.ACTIVATE_USER :
                UserAuditAction.DELETE_USER;

        await this.createAuditLog(actorId, targetUserId, action, {
            previousStatus: targetUser.status,
            newStatus: status
        });

        return {
            id: updated.id,
            email: updated.email,
            status: updated.status
        };
    }

    async updatePermissions(
        actorId: string,
        targetUserId: string,
        monitoringEnabled: boolean,
        monitoringExtension?: string,
        monitoringSecret?: string,
        name?: string,
        subscriptionId?: string
    ) {
        const [actor, targetUser] = await Promise.all([
            this.prisma.user.findUnique({ where: { id: actorId }, select: { tenantId: true, role: true } }),
            this.prisma.user.findUnique({ where: { id: targetUserId } }),
        ]);
        if (actor?.role !== Role.ADMIN || !actor.tenantId || actor.tenantId !== targetUser?.tenantId) {
            throw new ForbiddenException('Only the tenant Admin can manage monitoring extensions');
        }
        if (!targetUser) throw new NotFoundException('User not found');
        if (targetUser.role !== Role.ADMIN && targetUser.role !== Role.SUPPORT) {
            throw new BadRequestException('Monitoring extensions can be assigned only to Admin or Support users');
        }
        if (!targetUser.tenantId) {
            throw new BadRequestException('The target user must belong to a tenant');
        }
        if (monitoringEnabled && targetUser.status !== UserStatus.ACTIVE) {
            throw new BadRequestException('Monitoring seats can be assigned only to active users');
        }

        const extension = monitoringEnabled ? (monitoringExtension || targetUser.monitoringExtension)?.trim() : null;
        const secret = monitoringEnabled ? (monitoringSecret || targetUser.monitoringSecret)?.trim() : null;
        if (monitoringEnabled && (!extension || !secret)) {
            throw new BadRequestException('Monitoring extension and SIP password are required');
        }
        if (monitoringEnabled) {
            await this.validateMonitoringExtension(targetUser.tenantId, extension!);
        }

        // Resolve billing entitlement before taking the tenant advisory lock.
        const billingSubscriptions = await this.subscriptions.list(targetUser.tenantId);
        const activeSubscriptions = billingSubscriptions.filter(s => ['active', 'grace'].includes(s.status));
        const monitoringLimit = activeSubscriptions.reduce((n, s) => n + Number(s.entitlement_snapshot.monitoring_extensions || 0), 0);
        if (monitoringEnabled && !targetUser.monitoringEnabled) await this.subscriptions.capacity(targetUser.tenantId, 'monitoring_extensions', subscriptionId);

        const updatedUser = await this.prisma.$transaction(async tx => {
            // Serialize seat changes for this tenant so concurrent Admin requests cannot exceed the plan.
            if (extension) await tx.$queryRaw`SELECT 1 AS locked FROM pg_advisory_xact_lock(hashtext(${`monitor-extension:${extension}`}))`;
            await tx.$queryRaw`SELECT 1 AS locked FROM pg_advisory_xact_lock(hashtext(${`monitor-tenant:${targetUser.tenantId}`}))`;
            const currentUser = await tx.user.findUnique({ where: { id: targetUserId } });
            if (!currentUser || currentUser.monitoringEnabled !== targetUser.monitoringEnabled ||
                currentUser.monitoringExtension !== targetUser.monitoringExtension) {
                throw new BadRequestException('Monitoring seat changed; refresh and try again');
            }
            if (monitoringEnabled && !targetUser.monitoringEnabled) {
                const assigned = await tx.user.count({ where: { tenantId: targetUser.tenantId!, monitoringEnabled: true } });
                const limit = monitoringLimit;
                if (assigned >= limit) throw new BadRequestException(`Monitoring extension quota reached (${assigned}/${limit})`);
            }
            if (monitoringEnabled) {
                const [existingUser, existingExtension] = await Promise.all([
                    tx.user.findFirst({ where: { monitoringExtension: extension, id: { not: targetUserId } } }),
                    tx.extension.findFirst({ where: { extensionNumber: extension! } }),
                ]);
                if (existingUser || existingExtension) throw new BadRequestException(`Extension ${extension} is already in use`);
            }
            return tx.user.update({
                where: { id: targetUserId },
                data: {
                    monitoringEnabled,
                    monitoringExtension: extension,
                    monitoringSecret: secret,
                    name: name === undefined ? undefined : name,
                },
            });
        });

        // Sync with Kamailio
        try {
            if (monitoringEnabled) await this.subscriptions.assignMonitoring(targetUser.tenantId, updatedUser, subscriptionId);
            else await this.subscriptions.unassignMonitoring(targetUser.tenantId, targetUserId);
            if (monitoringEnabled) {
                await this.kamailioService.syncSubscriber(extension!, secret!, true);
                if (targetUser.monitoringExtension && targetUser.monitoringExtension !== extension) {
                    await this.kamailioService.deleteSubscriber(targetUser.monitoringExtension, true);
                }
            } else if (targetUser.monitoringExtension) {
                await this.kamailioService.deleteSubscriber(targetUser.monitoringExtension, true);
            }
        } catch (error) {
            if (monitoringEnabled && extension && extension !== targetUser.monitoringExtension) {
                try { await this.kamailioService.deleteSubscriber(extension, true); } catch (_) { /* best effort */ }
            }
            if (targetUser.monitoringEnabled && targetUser.monitoringExtension && targetUser.monitoringSecret) {
                try { await this.kamailioService.syncSubscriber(targetUser.monitoringExtension, targetUser.monitoringSecret, true); } catch (_) { /* best effort */ }
            }
            await this.prisma.user.update({
                where: { id: targetUserId },
                data: {
                    monitoringEnabled: targetUser.monitoringEnabled,
                    monitoringExtension: targetUser.monitoringExtension,
                    monitoringSecret: targetUser.monitoringSecret,
                    name: targetUser.name,
                },
            });
            throw new BadRequestException('Could not synchronize the monitoring SIP extension; the change was reverted');
        }

        if (!monitoringEnabled || targetUser.monitoringExtension !== updatedUser.monitoringExtension) {
            try {
                await this.redisClient.publish('monitor_seat_changes', JSON.stringify({ userId: targetUserId }));
            } catch (error) {
                console.error('Failed to notify monitor gateway of revoked seat', error);
            }
        }

        // Audit log
        await this.createAuditLog(actorId, targetUserId, UserAuditAction.UPDATE_USER, {
            field: 'monitoringEnabled',
            newValue: monitoringEnabled,
            monitoringExtension: updatedUser.monitoringExtension
        });

        return {
            userId: targetUserId,
            monitoringEnabled: updatedUser.monitoringEnabled,
            monitoringExtension: updatedUser.monitoringExtension
        };
    }

    async reassignMonitoring(actorId: string, dto: ReassignMonitoringDto) {
        if (dto.fromUserId === dto.toUserId) throw new BadRequestException('Select a different user for reassignment');
        const actor = await this.prisma.user.findUnique({ where: { id: actorId }, select: { role: true, tenantId: true } });
        if (actor?.role !== Role.ADMIN || !actor.tenantId) throw new ForbiddenException('Admin access required');
        const extension = dto.monitoringExtension.trim();
        await this.validateMonitoringExtension(actor.tenantId, extension);
        const original = await this.prisma.$transaction(async tx => {
            await tx.$queryRaw`SELECT 1 AS locked FROM pg_advisory_xact_lock(hashtext(${`monitor-tenant:${actor.tenantId}`}))`;
            // Lock both rows in a stable order, then validate their current state under the lock.
            const ids = [dto.fromUserId, dto.toUserId].sort();
            await tx.$queryRaw`SELECT id FROM users WHERE id IN (${ids[0]}, ${ids[1]}) ORDER BY id FOR UPDATE`;
            const [from, to] = await Promise.all([
                tx.user.findUnique({ where: { id: dto.fromUserId } }),
                tx.user.findUnique({ where: { id: dto.toUserId } }),
            ]);
            if (!from || !to || from.tenantId !== actor.tenantId || to.tenantId !== actor.tenantId) {
                throw new ForbiddenException('Both users must belong to your tenant');
            }
            if (!from.monitoringEnabled || !from.monitoringExtension || !from.monitoringSecret) {
                throw new BadRequestException('Source user does not have an active monitoring seat');
            }
            if (to.monitoringEnabled || to.monitoringExtension) throw new BadRequestException('Destination user already has a monitoring seat');
            if (to.status !== UserStatus.ACTIVE || (to.role !== Role.ADMIN && to.role !== Role.SUPPORT)) {
                throw new BadRequestException('Destination must be an active Admin or Support user');
            }
            const [otherUser, regularExtension] = await Promise.all([
                tx.user.findFirst({ where: { monitoringExtension: extension, id: { notIn: [from.id, to.id] } } }),
                tx.extension.findFirst({ where: { extensionNumber: extension } }),
            ]);
            if (otherUser || regularExtension) throw new BadRequestException(`Extension ${extension} is already in use`);
            const secret = dto.monitoringSecret?.trim() || from.monitoringSecret;
            await tx.user.update({ where: { id: from.id }, data: {
                monitoringEnabled: false, monitoringExtension: null, monitoringSecret: null,
            } });
            await tx.user.update({ where: { id: to.id }, data: {
                monitoringEnabled: true, monitoringExtension: extension, monitoringSecret: secret,
                name: dto.name === undefined ? undefined : dto.name,
            } });
            return { from, to, secret };
        });

        try {
            await this.subscriptions.transferMonitoring(actor.tenantId!, original.from.id, { ...original.to, monitoringExtension: extension });
            await this.kamailioService.syncSubscriber(extension, original.secret, true);
            if (original.from.monitoringExtension !== extension) {
                await this.kamailioService.deleteSubscriber(original.from.monitoringExtension!, true);
            }
        } catch (error) {
            // Kamailio is external to the PBX DB: compensate both stores on failure.
            await this.prisma.$transaction(async tx => {
                await tx.user.update({ where: { id: original.to.id }, data: {
                    monitoringEnabled: original.to.monitoringEnabled,
                    monitoringExtension: original.to.monitoringExtension,
                    monitoringSecret: original.to.monitoringSecret,
                    name: original.to.name,
                } });
                await tx.user.update({ where: { id: original.from.id }, data: {
                    monitoringEnabled: original.from.monitoringEnabled,
                    monitoringExtension: original.from.monitoringExtension,
                    monitoringSecret: original.from.monitoringSecret,
                } });
            });
            if (extension !== original.from.monitoringExtension) {
                try { await this.kamailioService.deleteSubscriber(extension, true); } catch (_) { /* best effort */ }
            }
            try { await this.kamailioService.syncSubscriber(original.from.monitoringExtension!, original.from.monitoringSecret!, true); } catch (_) { /* best effort */ }
            throw new BadRequestException('Could not synchronize the reassigned SIP extension; the transfer was reverted');
        }
        try { await this.redisClient.publish('monitor_seat_changes', JSON.stringify({ userId: original.from.id })); }
        catch (error) { console.error('Failed to revoke old monitor session', error); }
        await this.createAuditLog(actorId, original.to.id, UserAuditAction.UPDATE_USER, {
            field: 'monitoringSeatReassignment', fromUserId: original.from.id,
            toUserId: original.to.id, oldExtension: original.from.monitoringExtension, monitoringExtension: extension,
        });
        return { fromUserId: original.from.id, toUserId: original.to.id, monitoringExtension: extension };
    }

    async getMonitoringSeats(actorId: string) {
        const actor = await this.prisma.user.findUnique({ where: { id: actorId }, select: { tenantId: true, role: true } });
        if (actor?.role !== Role.ADMIN || !actor.tenantId) throw new ForbiddenException('Admin access required');
        const [subscription, users, used, tenant, pendingStaffInvites] = await Promise.all([
            this.prisma.subscription.findFirst({
                where: { tenantId: actor.tenantId, status: 'ACTIVE' },
                include: { plan: { select: { maxMonitoringExtensions: true } } },
                orderBy: { createdAt: 'desc' },
            }),
            this.prisma.user.findMany({
                where: { tenantId: actor.tenantId, role: { in: [Role.ADMIN, Role.SUPPORT] }, status: UserStatus.ACTIVE },
                select: { id: true, email: true, name: true, role: true, monitoringEnabled: true, monitoringExtension: true },
                orderBy: { email: 'asc' },
            }),
            this.prisma.user.count({ where: { tenantId: actor.tenantId, monitoringEnabled: true } }),
            this.prisma.tenant.findUnique({ where: { id: actor.tenantId }, select: { customerCode: true } }),
            this.prisma.user.count({ where: { tenantId: actor.tenantId, role: Role.SUPPORT, status: UserStatus.INVITED } }),
        ]);
        const subscriptions = (await this.subscriptions.list(actor.tenantId)).filter(s => ['active','grace'].includes(s.status));
        const planLimit = subscriptions.filter(s => s.subscription_type === 'base').reduce((n,s) => n + Number(s.entitlement_snapshot.monitoring_extensions || 0), 0);
        const addonUnits = subscriptions.filter(s => s.subscription_type === 'capacity').reduce((n,s) => n + Number(s.entitlement_snapshot.monitoring_extensions || 0), 0);
        const limit = planLimit + addonUnits;
        return { users, used, limit, planLimit, addonUnits, customerCode: tenant?.customerCode, pendingStaffInvites,
            subscriptions, remaining: Math.max(0, limit - used), hasActivePlan: subscriptions.length > 0 };
    }

    async deleteUser(actorId: string, targetUserId: string) {
        const canManage = await this.canManageUser(actorId, targetUserId);
        if (!canManage) {
            throw new ForbiddenException('You do not have permission to delete this user');
        }

        const targetUser = await this.prisma.user.findUnique({
            where: { id: targetUserId }
        });

        if (!targetUser) throw new NotFoundException('User not found');

        if (targetUser.monitoringExtension) {
            await this.kamailioService.deleteSubscriber(targetUser.monitoringExtension, true);
            if(targetUser.tenantId) await this.subscriptions.unassignMonitoring(targetUser.tenantId,targetUserId);
            try {
                await this.redisClient.publish('monitor_seat_changes', JSON.stringify({ userId: targetUserId }));
            } catch (error) {
                console.error('Could not notify monitor gateway of deleted user', error);
            }
        }

        // Hard Delete with manual cascade
        await this.prisma.$transaction(async (prisma) => {
            // 1. Delete Support Profile (if exists)
            await prisma.supportProfile.deleteMany({
                where: { supportUserId: targetUserId }
            });

            // 2. Delete Audit Logs where user is actor (or target if necessary)
            // Ideally we'd keep them but set to null, but schema might restrict. 
            // For Safety/Simplicity in dev: delete logs involving this user to clear DB state as requested
            await prisma.userAuditLog.deleteMany({
                where: {
                    OR: [
                        { actorId: targetUserId },
                        { targetId: targetUserId }
                    ]
                }
            });

            // 3. Delete the User
            await prisma.user.delete({
                where: { id: targetUserId }
            });
        });

        // Audit log (target is now null because user is gone)
        // We need to bypass createAuditLog's relation check or simple pass null target
        // But createAuditLog likely expects existing target.
        // Let's create a raw audit log entry manually if needed, or just skip logging the deletion of the deleted user's logs
        // Actually, we can log the action with the *actor* but targetId as null.

        await this.prisma.userAuditLog.create({
            data: {
                actorId,
                targetId: null, // User is gone
                action: UserAuditAction.DELETE_USER,
                metadata: {
                    email: targetUser.email,
                    deletedUserId: targetUserId
                }
            }
        });

        return {
            id: targetUserId,
            status: 'DELETED'
        };
    }


    async getUserActivity(adminId: string, targetUserId: string, query?: { page?: number; limit?: number }) {
        // Verify access
        const admin = await this.prisma.user.findUnique({ where: { id: adminId } });
        const target = await this.prisma.user.findUnique({ where: { id: targetUserId } });

        if (!admin || !target) throw new NotFoundException('User not found');

        if (admin.role !== Role.SUPER_ADMIN && admin.role === Role.ADMIN) {
            // Admin can only see their support users
            const supportProfile = await this.prisma.supportProfile.findUnique({
                where: { supportUserId: targetUserId }
            });

            if (!supportProfile || supportProfile.adminUserId !== adminId) {
                throw new ForbiddenException('You can only view activity of your supported users');
            }

            if (!supportProfile && adminId !== targetUserId) {
                throw new ForbiddenException('Access denied');
            }
        }

        const page = query?.page || 1;
        const limit = Math.min(query?.limit || 20, 100);
        const skip = (page - 1) * limit;

        const [data, total] = await Promise.all([
            this.prisma.userAuditLog.findMany({
                where: {
                    OR: [
                        { actorId: targetUserId },
                        { targetId: targetUserId }
                    ]
                },
                include: {
                    actor: {
                        select: { email: true, role: true }
                    }
                },
                orderBy: { timestamp: 'desc' },
                skip,
                take: limit
            }),
            this.prisma.userAuditLog.count({
                where: {
                    OR: [
                        { actorId: targetUserId },
                        { targetId: targetUserId }
                    ]
                }
            })
        ]);

        return {
            data,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit)
            }
        };
    }

    async inviteSupportUser(adminId: string, dto: InviteSupportUserDto) {
        const admin = await this.prisma.user.findUnique({
            where: { id: adminId },
            include: { tenant: true }
        });

        if (!admin) throw new NotFoundException('Admin not found');

        // Check if user exists
        const existingUser = await this.prisma.user.findUnique({
            where: { email: dto.email.toLowerCase() }
        });

        if (existingUser) {
            throw new BadRequestException('User already exists');
        }

        // Generate invite token
        const inviteToken = crypto.randomBytes(32).toString('hex');
        const inviteTokenExpiry = new Date();
        inviteTokenExpiry.setDate(inviteTokenExpiry.getDate() + 7); // 7 days

        // Create support user
        const supportUser = await this.prisma.user.create({
            data: {
                email: dto.email.toLowerCase(),
                name: dto.name,
                password: '', // Will be set on acceptance
                role: Role.SUPPORT,
                status: UserStatus.INVITED,
                tenantId: admin.tenantId,
                inviteToken,
                inviteTokenExpiry,
                supportProfile: {
                    create: {
                        adminUserId: adminId,
                        monitoringEnabled: false
                    }
                }
            }
        });

        // Audit log
        await this.createAuditLog(adminId, supportUser.id, UserAuditAction.INVITE_USER, {
            email: dto.email,
            role: Role.SUPPORT
        });

        // Send Invite Email
        await this.mailService.sendSupportInvitationEmail(
            supportUser.email,
            supportUser.name || '',
            inviteToken,
            admin.name || 'Admin',
            admin.tenant?.name || ''
        ).catch(err => {
            console.error('Failed to send support invitation email:', err.message);
        });

        const frontendUrl = process.env.FRONTEND_URL || 'https://subdev.balatrix.com';
        const inviteLink = `${frontendUrl}/invite/accept?token=${supportUser.inviteToken}`;

        return {
            id: supportUser.id,
            email: supportUser.email,
            inviteToken: supportUser.inviteToken,
            inviteTokenExpiry: supportUser.inviteTokenExpiry,
            inviteLink
        };
    }

    async getInviteLink(actorId: string, targetUserId: string) {
        const canManage = await this.canManageUser(actorId, targetUserId);
        if (!canManage) {
            throw new ForbiddenException('You do not have permission to view this user’s invite link');
        }

        const targetUser = await this.prisma.user.findUnique({
            where: { id: targetUserId },
            select: {
                id: true,
                email: true,
                name: true,
                status: true,
                inviteToken: true,
                inviteTokenExpiry: true,
                role: true,
                tenantId: true
            }
        });

        if (!targetUser) {
            throw new NotFoundException('User not found');
        }

        if (targetUser.status !== UserStatus.INVITED || !targetUser.inviteToken) {
            throw new BadRequestException('User is already active or does not have a pending invitation link');
        }

        if (targetUser.inviteTokenExpiry && targetUser.inviteTokenExpiry < new Date()) {
            throw new BadRequestException('The invitation link has expired. Please generate a new invite.');
        }

        const frontendUrl = process.env.FRONTEND_URL || 'https://subdev.balatrix.com';
        const inviteLink = `${frontendUrl}/invite/accept?token=${targetUser.inviteToken}`;

        return {
            id: targetUser.id,
            email: targetUser.email,
            name: targetUser.name,
            status: targetUser.status,
            inviteToken: targetUser.inviteToken,
            inviteTokenExpiry: targetUser.inviteTokenExpiry,
            inviteLink
        };
    }

    async resendSupportInvite(actorId: string, targetUserId: string) {
        const canManage = await this.canManageUser(actorId, targetUserId);
        if (!canManage) {
            throw new ForbiddenException('You do not have permission to resend invite for this user');
        }

        const admin = await this.prisma.user.findUnique({
            where: { id: actorId },
            include: { tenant: true }
        });
        if (!admin) throw new NotFoundException('Admin not found');

        const targetUser = await this.prisma.user.findUnique({
            where: { id: targetUserId }
        });
        if (!targetUser) throw new NotFoundException('User not found');

        if (targetUser.status === UserStatus.ACTIVE) {
            throw new BadRequestException('User is already active and has accepted the invitation');
        }

        // Generate fresh invite token
        const inviteToken = crypto.randomBytes(32).toString('hex');
        const inviteTokenExpiry = new Date();
        inviteTokenExpiry.setDate(inviteTokenExpiry.getDate() + 7); // 7 days

        const updated = await this.prisma.user.update({
            where: { id: targetUserId },
            data: {
                status: UserStatus.INVITED,
                inviteToken,
                inviteTokenExpiry
            }
        });

        // Audit log
        await this.createAuditLog(actorId, targetUserId, UserAuditAction.INVITE_USER, {
            email: targetUser.email,
            action: 'RESEND_INVITE'
        });

        // Send Email
        await this.mailService.sendSupportInvitationEmail(
            updated.email,
            updated.name || '',
            inviteToken,
            admin.name || 'Admin',
            admin.tenant?.name || ''
        ).catch(err => {
            console.error('Failed to send support invitation email:', err.message);
        });

        const frontendUrl = process.env.FRONTEND_URL || 'https://subdev.balatrix.com';
        const inviteLink = `${frontendUrl}/invite/accept?token=${inviteToken}`;

        return {
            id: updated.id,
            email: updated.email,
            inviteToken: inviteToken,
            inviteTokenExpiry: inviteTokenExpiry,
            inviteLink
        };
    }

    async acceptInvite(token: string, password: string) {
        const user = await this.prisma.user.findUnique({
            where: { inviteToken: token }
        });

        if (!user) {
            throw new NotFoundException('Invalid invite token');
        }

        if (user.status !== UserStatus.INVITED) {
            throw new BadRequestException('Invite already accepted or user not invited');
        }

        if (!user.inviteTokenExpiry || user.inviteTokenExpiry < new Date()) {
            throw new BadRequestException('Invite token has expired');
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Update user: activate and flush invite tokens
        const updated = await this.prisma.user.update({
            where: { id: user.id },
            data: {
                password: hashedPassword,
                status: UserStatus.ACTIVE,
                inviteToken: null,
                inviteTokenExpiry: null
            }
        });

        // Audit log (actor is the user themselves)
        await this.createAuditLog(user.id, user.id, UserAuditAction.ACCEPT_INVITE, {
            email: user.email
        });

        return {
            id: updated.id,
            email: updated.email,
            status: updated.status
        };
    }

    async impersonateUser(superAdminId: string, targetUserId: string) {
        const superAdmin = await this.prisma.user.findUnique({
            where: { id: superAdminId }
        });

        if (!superAdmin || superAdmin.role !== Role.SUPER_ADMIN) {
            throw new ForbiddenException('Only SUPER_ADMIN can impersonate users');
        }

        const targetUser = await this.prisma.user.findUnique({
            where: { id: targetUserId },
            include: { tenant: true }
        });

        if (!targetUser) {
            throw new NotFoundException('Target user not found');
        }

        // Audit log
        await this.createAuditLog(superAdminId, targetUserId, UserAuditAction.IMPERSONATE_USER, {
            targetEmail: targetUser.email,
            targetRole: targetUser.role
        });

        return {
            user: {
                id: targetUser.id,
                email: targetUser.email,
                name: targetUser.name,
                role: targetUser.role,
                tenantId: targetUser.tenantId
            },
            impersonation: {
                originalUserId: superAdminId,
                originalEmail: superAdmin.email,
                startedAt: new Date()
            }
        };
    }

    async resetUserPassword(actorId: string, targetUserId: string, newPassword: string) {
        const canManage = await this.canManageUser(actorId, targetUserId);
        if (!canManage) {
            throw new ForbiddenException("You do not have permission to reset this user's password");
        }

        const targetUser = await this.prisma.user.findUnique({
            where: { id: targetUserId },
        });

        if (!targetUser) throw new NotFoundException('User not found');

        // Hash new password
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        // Update user: set new password and force change on next login
        await this.prisma.user.update({
            where: { id: targetUserId },
            data: {
                password: hashedPassword,
                forcePasswordChange: true,
                refreshToken: null, // Invalidate existing sessions
            },
        });

        // Audit log
        await this.createAuditLog(actorId, targetUserId, UserAuditAction.RESET_PASSWORD, {
            email: targetUser.email,
            forcedChange: true,
        });

        return {
            message: 'Password reset successfully. User will be required to change it on next login.',
        };
    }
}
