import { of } from 'rxjs';
import { Role, UserStatus } from '@prisma/client';
import { UsersService } from './users.service';

describe('UsersService monitoring entitlements and reassignment', () => {
    const actor = { id: 'admin', role: Role.ADMIN, tenantId: 'tenant' };
    const from = { id: 'from', tenantId: 'tenant', role: Role.SUPPORT, status: UserStatus.ACTIVE,
        monitoringEnabled: true, monitoringExtension: 'U100201', monitoringSecret: 'old-secret', name: 'Old' };
    const to = { id: 'to', tenantId: 'tenant', role: Role.SUPPORT, status: UserStatus.ACTIVE,
        monitoringEnabled: false, monitoringExtension: null, monitoringSecret: null, name: 'New' };
    let prisma: any;
    let kamailio: any;
    let service: UsersService;

    beforeEach(() => {
        prisma = {
            user: { findUnique: jest.fn(async ({ where }) => ({ admin: actor, from, to }[where.id])),
                findMany: jest.fn().mockResolvedValue([from, to]), count: jest.fn().mockResolvedValue(1),
                findFirst: jest.fn().mockResolvedValue(null), update: jest.fn(async ({ where, data }) => ({ id: where.id, ...data })) },
            tenant: { findUnique: jest.fn().mockResolvedValue({ customerCode: 'U1002', subBillingCustomerId: 'U1002' }) },
            subscription: { findFirst: jest.fn().mockResolvedValue({ plan: { maxMonitoringExtensions: 1 } }) },
            extension: { findFirst: jest.fn().mockResolvedValue(null) },
            userAuditLog: { create: jest.fn().mockResolvedValue({}) },
            $queryRaw: jest.fn().mockResolvedValue([]),
        };
        prisma.$transaction = jest.fn(async callback => callback(prisma));
        kamailio = { syncSubscriber: jest.fn().mockResolvedValue(undefined), deleteSubscriber: jest.fn().mockResolvedValue(undefined) };
        const http: any = { get: jest.fn().mockReturnValue(of({ data: { success: true, data: { addon_units: 2, subscription_id: 'sub' } } })) };
        const config: any = { get: jest.fn().mockReturnValue('http://billing/api') };
        service = new UsersService(prisma, kamailio, {} as any, { publish: jest.fn() } as any, http, config);
    });

    it('adds active purchased units to the plan monitoring limit', async () => {
        expect(await service.getMonitoringSeats('admin')).toMatchObject({ used: 1, planLimit: 1, addonUnits: 2, limit: 3, remaining: 2, customerCode: 'U1002' });
    });

    it('transfers one seat and keeps its SIP password when no replacement is supplied', async () => {
        const result = await service.reassignMonitoring('admin', {
            fromUserId: 'from', toUserId: 'to', monitoringExtension: 'U100201', name: 'New',
        });
        expect(result).toMatchObject({ fromUserId: 'from', toUserId: 'to', monitoringExtension: 'U100201' });
        expect(prisma.user.update).toHaveBeenNthCalledWith(1, expect.objectContaining({
            where: { id: 'from' }, data: expect.objectContaining({ monitoringEnabled: false, monitoringExtension: null }),
        }));
        expect(prisma.user.update).toHaveBeenNthCalledWith(2, expect.objectContaining({
            where: { id: 'to' }, data: expect.objectContaining({ monitoringEnabled: true, monitoringSecret: 'old-secret' }),
        }));
        expect(kamailio.syncSubscriber).toHaveBeenCalledWith('U100201', 'old-secret', true);
        expect(kamailio.deleteSubscriber).not.toHaveBeenCalled();
    });

    it('rejects an invalid monitoring suffix', async () => {
        await expect(service.reassignMonitoring('admin', {
            fromUserId: 'from', toUserId: 'to', monitoringExtension: 'U1002000',
        })).rejects.toThrow('01–99');
    });

    it('allows a second seat when an active purchased add-on supplies units', async () => {
        await expect(service.updatePermissions('admin', 'to', true, 'U100202', 'new-secret')).resolves.toMatchObject({
            userId: 'to', monitoringEnabled: true, monitoringExtension: 'U100202',
        });
        expect(kamailio.syncSubscriber).toHaveBeenCalledWith('U100202', 'new-secret', true);
    });

    it('restores both user assignments if SIP synchronization fails', async () => {
        kamailio.syncSubscriber.mockRejectedValueOnce(new Error('SIP database unavailable'));
        await expect(service.reassignMonitoring('admin', {
            fromUserId: 'from', toUserId: 'to', monitoringExtension: 'U100202',
        })).rejects.toThrow('transfer was reverted');
        expect(prisma.user.update).toHaveBeenCalledWith(expect.objectContaining({
            where: { id: 'from' }, data: expect.objectContaining({ monitoringEnabled: true, monitoringExtension: 'U100201' }),
        }));
        expect(prisma.user.update).toHaveBeenCalledWith(expect.objectContaining({
            where: { id: 'to' }, data: expect.objectContaining({ monitoringEnabled: false, monitoringExtension: null }),
        }));
    });
});
