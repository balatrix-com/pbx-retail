import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class NotificationsService {
    private readonly logger = new Logger(NotificationsService.name);

    constructor(private prisma: PrismaService) { }

    /**
     * Get recent notifications for a user/tenant
     */
    async getNotifications(tenantId: string, userId: string, limit = 50) {
        if (!tenantId) return [];
        return this.prisma.notification.findMany({
            where: {
                tenantId,
                OR: [
                    { userId: null }, // tenant-wide
                    { userId: userId } // user-specific
                ]
            },
            orderBy: {
                createdAt: 'desc'
            },
            take: limit
        });
    }

    /**
     * Mark a specific notification as read
     */
    async markAsRead(id: string, tenantId: string, userId: string) {
        if (!tenantId) throw new Error('Unauthorized');
        // Ensure the notification belongs to this tenant/user before updating
        const notification = await this.prisma.notification.findFirst({
            where: {
                id,
                tenantId,
                OR: [
                    { userId: null },
                    { userId: userId }
                ]
            }
        });

        if (!notification) {
            throw new Error('Notification not found or unauthorized');
        }

        return this.prisma.notification.update({
            where: { id },
            data: { read: true }
        });
    }

    /**
     * Mark all notifications as read for a user
     */
    async markAllAsRead(tenantId: string, userId: string) {
        if (!tenantId) return;
        return this.prisma.notification.updateMany({
            where: {
                tenantId,
                read: false,
                OR: [
                    { userId: null },
                    { userId: userId }
                ]
            },
            data: { read: true }
        });
    }

    /**
     * Internal method to create a new notification (used by other services)
     */
    async createNotification(data: {
        tenantId: string;
        userId?: string;
        type: 'system' | 'billing' | 'warning' | 'error' | 'missed_call';
        title: string;
        message: string;
    }, tx?: any) {
        const client = tx || this.prisma;
        try {
            const notification = await client.notification.create({
                data
            });
            return notification;
        } catch (error) {
            this.logger.error(`Failed to create notification: ${error.message}`, error.stack);
            // We don't throw here usually to prevent breaking the main transaction (e.g., billing)
        }
    }
}
