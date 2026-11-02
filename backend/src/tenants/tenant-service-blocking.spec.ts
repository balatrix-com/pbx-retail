import { LookupRedisService } from '../redis/lookup-redis.module';
import { TenantsService } from './tenants.service';
import { JwtStrategy } from '../auth/strategies/jwt.strategy';
import { AuthService } from '../auth/auth.service';
import { assertTenantServiceAccess } from '../auth/tenant-service-access';
import { MonitorGateway } from '../monitor/monitor.gateway';
import * as bcrypt from 'bcrypt';

describe('Tenant service blocking', () => {
    const tenant = { id: 'tenant-1', customerCode: 'U1005', serviceBlocked: false };
    const prisma: any = { tenant: { findUnique: jest.fn(), update: jest.fn() }, user: { findUnique: jest.fn() },
        $queryRawUnsafe: jest.fn(), $executeRawUnsafe: jest.fn() };
    const redis: any = { isReady: true, eval: jest.fn() };
    const lookup = new LookupRedisService(redis, prisma);
    const archives = { status: jest.fn().mockResolvedValue(null) };
    const service = new TenantsService(prisma, {} as any, {} as any, lookup, {} as any, {} as any, {} as any, archives as any);
    beforeEach(() => {
        jest.clearAllMocks();
        redis.isReady = true;
        prisma.tenant.findUnique.mockResolvedValue(tenant);
        prisma.tenant.update.mockImplementation(({ data }) => Promise.resolve({ ...tenant, ...data }));
        prisma.$queryRawUnsafe.mockResolvedValue([{ version: BigInt(9), tenant_id: 'tenant-1', customer_code: 'U1005', state: 'BLOCKED', created_at: new Date() }]);
        redis.eval.mockResolvedValue(1);
    });

    it('saves block and delivers versioned Redis state before returning success', async () => {
        await expect(service.toggleTenantBlock('tenant-1', true)).resolves.toMatchObject({ serviceBlocked: true });
        expect(redis.eval).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({ keys: ['tenant:service-state:U1005'], arguments: [expect.stringContaining('"state":"BLOCKED"'), '9', 'BLOCKED'] }));
        expect(prisma.$executeRawUnsafe).toHaveBeenCalled();
    });
    it('reports pending enforcement on Redis failure and keeps DB block saved', async () => {
        redis.isReady = false;
        await expect(service.toggleTenantBlock('tenant-1', true)).rejects.toThrow('synchronization is pending');
        expect(prisma.tenant.update).toHaveBeenCalledWith({ where: { id: 'tenant-1' }, data: { serviceBlocked: true, status: 'SUSPENDED' } });
        expect(prisma.$executeRawUnsafe).not.toHaveBeenCalled();
    });
    it('rejects malformed block input', async () => {
        await expect(service.toggleTenantBlock('tenant-1', 'false' as any)).rejects.toThrow('boolean');
        expect(prisma.tenant.update).not.toHaveBeenCalled();
    });
    it('denies a previously issued access token after the tenant is blocked', async () => {
        prisma.user.findUnique.mockResolvedValue({ id: 'admin-1', role: 'ADMIN', tenantId: 'tenant-1', status: 'ACTIVE' });
        prisma.tenant.findUnique.mockResolvedValue({ serviceBlocked: true });
        const strategy = new JwtStrategy({ get: () => 'test-jwt-secret' } as any, prisma);
        await expect(strategy.validate({ sub: 'admin-1', role: 'ADMIN', tenantId: 'tenant-1' })).rejects.toThrow('suspended');
    });
    it('denies login and leaves token generation untouched', async () => {
        prisma.tenant.findUnique.mockResolvedValue({ serviceBlocked: true });
        const tokens = { signAsync: jest.fn() };
        const auth = new AuthService(prisma, tokens as any, {} as any, {} as any, {} as any, {} as any);
        await expect(auth.login({ role: 'ADMIN', tenantId: 'tenant-1' } as any)).rejects.toThrow('suspended');
        expect(tokens.signAsync).not.toHaveBeenCalled();
    });
    it('retains Super Admin management access', async () => {
        prisma.tenant.findUnique.mockResolvedValue({ serviceBlocked: true });
        await expect(assertTenantServiceAccess(prisma, { role: 'SUPER_ADMIN', tenantId: 'tenant-1' })).resolves.toBeUndefined();
        expect(prisma.tenant.findUnique).not.toHaveBeenCalled();
    });
    it('rejects a valid refresh token when the tenant has since been blocked', async () => {
        prisma.tenant.findUnique.mockResolvedValue({ serviceBlocked: true });
        prisma.user.findUnique.mockResolvedValue({ id: 'admin-1', role: 'ADMIN', tenantId: 'tenant-1', refreshToken: await bcrypt.hash('refresh-value', 4) });
        const tokens = { signAsync: jest.fn() };
        const auth = new AuthService(prisma, tokens as any, {} as any, {} as any, {} as any, {} as any);
        await expect(auth.refreshTokens('admin-1', 'refresh-value')).rejects.toThrow('suspended');
        expect(tokens.signAsync).not.toHaveBeenCalled();
    });
    it('rejects a new monitor connection for a blocked tenant', async () => {
        prisma.tenant.findUnique.mockResolvedValue({ serviceBlocked: true });
        const access = { getAssignedExtension: jest.fn() };
        const gateway = new MonitorGateway({} as any, {} as any, { verify: () => ({ sub: 'admin-1', role: 'ADMIN', tenantId: 'tenant-1' }) } as any, prisma, access as any);
        const socket = { id: 'socket-1', handshake: { auth: { token: 'valid' } }, disconnect: jest.fn(), data: {} };
        await gateway.handleConnection(socket as any);
        expect(socket.disconnect).toHaveBeenCalled();
        expect(access.getAssignedExtension).not.toHaveBeenCalled();
    });
    it('disconnects existing blocked tenant sockets while retaining Super Admin sockets', async () => {
        prisma.tenant.findUnique.mockResolvedValue({ serviceBlocked: true });
        const gateway = new MonitorGateway({} as any, {} as any, {} as any, prisma, {} as any);
        const userSocket = { data: { user: { role: 'ADMIN', tenantId: 'tenant-1' } }, disconnect: jest.fn() };
        const superSocket = { data: { user: { role: 'SUPER_ADMIN', tenantId: 'tenant-1' } }, disconnect: jest.fn() };
        gateway.server = { fetchSockets: async () => [userSocket, superSocket] } as any;
        await (gateway as any).disconnectBlockedSockets();
        expect(userSocket.disconnect).toHaveBeenCalledWith(true);
        expect(superSocket.disconnect).not.toHaveBeenCalled();
    });
});
