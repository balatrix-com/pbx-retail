import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuditService {
    constructor(private prisma: PrismaService) { }

    async log(params: {
        action: string;
        category: 'AUTH' | 'TENANT' | 'BILLING' | 'SYSTEM' | 'USER' | 'CARRIER_GATEWAY' | 'RATE_CARD' | 'MANAGE_NUMBERS' | 'PLANS_ADDONS' | 'USER_MANAGEMENT' | 'SYSTEM_SETTINGS';
        actorId?: string | number;
        actorType?: 'USER' | 'SYSTEM' | 'API';
        actorEmail?: string;
        targetId?: string | number;
        targetType?: string;
        metadata?: any;
        ipAddress?: string;
        userAgent?: string;
    }) {
        try {
            const result = await this.prisma.auditLog.create({
                data: {
                    action: params.action,
                    category: params.category,
                    actorId: params.actorId !== undefined && params.actorId !== null ? String(params.actorId) : null,
                    actorEmail: params.actorEmail || null,
                    actorType: params.actorType || 'USER',
                    targetId: params.targetId !== undefined && params.targetId !== null ? String(params.targetId) : null,
                    targetType: params.targetType !== undefined && params.targetType !== null ? String(params.targetType) : null,
                    ipAddress: params.ipAddress || null,
                    userAgent: params.userAgent || null,
                    metadata: params.metadata || {}
                }
            });

            // After creating the log entry, trim to last 100
            await this.prisma.$executeRaw`
              DELETE FROM audit_logs
              WHERE id NOT IN (
                SELECT id FROM audit_logs
                ORDER BY "createdAt" DESC
                LIMIT 100
              )
            `;
            
            return result;
        } catch (error) {
            console.error('Failed to create audit log:', error);
            // Don't throw error to avoid breaking the main flow
        }
    }

    async findAll(query: {
        search?: string;
        category?: string;
        action?: string;
        actorId?: string;
        dateFrom?: string;
        dateTo?: string;
    }) {
        const where: any = {};

        if (query.category) where.category = query.category;
        if (query.action) where.action = query.action;
        if (query.actorId) where.actorId = query.actorId;
        
        if (query.dateFrom) {
            where.createdAt = { gte: new Date(query.dateFrom) };
        }
        if (query.dateTo) {
            where.createdAt = { ...where.createdAt, lte: new Date(query.dateTo) };
        }

        if (query.search) {
            where.OR = [
                { actorEmail: { contains: query.search, mode: 'insensitive' } },
                { action: { contains: query.search, mode: 'insensitive' } },
                { targetId: { contains: query.search } }
            ];
        }

        // Always return all logs (max 100), newest first
        const data = await this.prisma.auditLog.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            take: 100
        });

        return {
            data,
            pagination: {
                page: 1,
                limit: 100,
                total: data.length,
                totalPages: 1
            }
        };
    }
}
