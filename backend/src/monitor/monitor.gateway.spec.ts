import { UserStatus } from '@prisma/client';
import { MonitorGateway } from './monitor.gateway';

describe('MonitorGateway current account checks', () => {
    const superAdminToken = { sub: 'user-a', role: 'SUPER_ADMIN', tenantId: null };
    const tenantToken = { sub: 'user-b', role: 'ADMIN', tenantId: 'tenant-a' };
    const prisma = {
        user: { findUnique: jest.fn(), findMany: jest.fn() },
        tenant: { findUnique: jest.fn() },
    };
    const jwtService = { verify: jest.fn() };
    const monitoringAccess = { getAssignedExtension: jest.fn() };
    const redisClient = { scanIterator: jest.fn() };
    const gateway = new MonitorGateway(
        {} as any, redisClient as any, jwtService as any, prisma as any, monitoringAccess as any,
    );
    const socket = () => ({
        id: 'socket-a',
        handshake: { auth: { token: 'dummy-token' }, query: {} },
        data: { user: undefined as any },
        disconnect: jest.fn(),
        emit: jest.fn(),
        join: jest.fn(),
    });

    beforeEach(() => {
        jest.resetAllMocks();
    });

    it('rejects a previously issued Super Admin token after role demotion at connection', async () => {
        const client = socket();
        jwtService.verify.mockReturnValue(superAdminToken);
        prisma.user.findUnique.mockResolvedValue({
            id: 'user-a', role: 'ADMIN', status: UserStatus.ACTIVE, tenantId: null,
        });

        await gateway.handleConnection(client as any);

        expect(client.disconnect).toHaveBeenCalledWith(true);
        expect(client.data.user).toBeUndefined();
        expect(monitoringAccess.getAssignedExtension).not.toHaveBeenCalled();
    });

    it('disconnects an inactive account before joining the global room', async () => {
        const client = socket();
        client.data.user = superAdminToken;
        prisma.user.findUnique.mockResolvedValue({
            id: 'user-a', role: 'SUPER_ADMIN', status: UserStatus.SUSPENDED, tenantId: null,
        });

        await gateway.handleJoinRoom('all', client as any);

        expect(client.disconnect).toHaveBeenCalledWith(true);
        expect(client.join).not.toHaveBeenCalled();
    });

    it('disconnects an existing Super Admin socket after deactivation', async () => {
        const client = socket();
        client.data.user = superAdminToken;
        gateway.server = { fetchSockets: jest.fn().mockResolvedValue([client]) } as any;
        prisma.user.findMany.mockResolvedValue([{
            id: 'user-a', role: 'SUPER_ADMIN', status: UserStatus.SUSPENDED, tenantId: null,
        }]);

        await (gateway as any).disconnectBlockedSockets();

        expect(client.disconnect).toHaveBeenCalledWith(true);
        expect(prisma.tenant.findUnique).not.toHaveBeenCalled();
    });

    it('disconnects an existing global socket after role demotion', async () => {
        const client = socket();
        client.data.user = superAdminToken;
        gateway.server = { fetchSockets: jest.fn().mockResolvedValue([client]) } as any;
        prisma.user.findMany.mockResolvedValue([{
            id: 'user-a', role: 'ADMIN', status: UserStatus.ACTIVE, tenantId: null,
        }]);

        await (gateway as any).disconnectBlockedSockets();

        expect(client.disconnect).toHaveBeenCalledWith(true);
    });

    it('keeps tenant and customer-code room aliases for an active tenant admin', async () => {
        const client = socket();
        client.data.user = tenantToken;
        prisma.user.findUnique.mockResolvedValue({
            id: 'user-b', role: 'ADMIN', status: UserStatus.ACTIVE, tenantId: 'tenant-a',
        });
        prisma.tenant.findUnique.mockResolvedValue({
            serviceBlocked: false, customerCode: 'U100', subBillingCustomerId: 'T100',
        });
        jest.spyOn(gateway as any, 'buildAnalyticsSnapshot').mockResolvedValue({ activeCalls: 0 });

        await gateway.handleJoinRoom('tenant-a', client as any);

        for (const room of ['tenant:tenant-a', 'tenant:U100', 'tenant:100', 'tenant:T100', 'tenant:UT100']) {
            expect(client.join).toHaveBeenCalledWith(room);
        }
        expect(client.disconnect).not.toHaveBeenCalled();
    });
});
