import { TenantArchiveService } from './tenant-archive.service';
import { of } from 'rxjs';

describe('Tenant archive recovery', () => {
    let service: TenantArchiveService, prisma: any, fs: any, lookup: any, billing: any, job: any;
    beforeEach(() => {
        job = { tenant_id: 'tenant', phase: 'ARCHIVE_REQUESTED', state: 'ARCHIVE_REQUESTED', actor_id: 'super', lease_token: null };
        const tenant = { id: 'tenant', customerCode: 'U1005', subBillingCustomerId: 'U1005', status: 'SUSPENDED' };
        const model = () => ({ findMany: jest.fn().mockResolvedValue([]), updateMany: jest.fn(), deleteMany: jest.fn(), count: jest.fn().mockResolvedValue(0), update: jest.fn() });
        prisma = { tenant: { findUniqueOrThrow: jest.fn().mockResolvedValue(tenant), update: jest.fn() },
            extension: model(), user: model(), dID: model(), tFN: model(), ringGroup: model(), ringGroupMember: model(), iVR: model(), dIDForward: model(), operationalSchedule: model(), audioFile: model(), subscription: model(), inboundWhitelist: model(), outboundEndpoint: model(),
            $queryRawUnsafe: jest.fn(async (sql, id, token) => {
                if (sql.startsWith('UPDATE tenant_archive_jobs')) { job.lease_token = token; return [{ ...job }]; }
                if (sql.includes('SELECT lease_token')) return [{ lease_token: job.lease_token }];
                if (sql.startsWith('SELECT 1 FROM tenant_archive_jobs')) return [{ present: 1 }];
                return [];
            }),
            $executeRawUnsafe: jest.fn(async (sql, id, second) => {
                if (sql.includes('SET phase=$2')) { job.phase = second; job.state = second; }
                if (sql.includes("phase='ARCHIVED'")) { job.phase = 'ARCHIVED'; job.state = 'ARCHIVED'; }
                if (sql.includes("state='ARCHIVE_FAILED'")) job.state = 'ARCHIVE_FAILED';
                return 1;
            }),
        };
        prisma.$transaction = jest.fn(fn => fn(prisma));
        fs = { deleteExtension: jest.fn(), bulkDeleteTenantData: jest.fn(), deleteDID: jest.fn(), deleteTFN: jest.fn() };
        lookup = { syncTenantServiceState: jest.fn(), normalizeNumber: (n: string) => n, deleteTenantLookups: jest.fn() };
        billing = { post: jest.fn().mockReturnValue(of({ data: { success: true } })) };
        service = new TenantArchiveService(prisma, fs, { deleteSubscriber: jest.fn(), removeCarrierIP: jest.fn() } as any,
            { flushCustomer: jest.fn(), flushDID: jest.fn() } as any, lookup, billing, { get: (key: string) => key === 'SUBSCRIPTION_SERVICE_TOKEN' ? 'test-token' : 'http://billing/api' } as any);
    });
    it('keeps financial data and numbers while replacing user logins with audit tombstones', async () => {
        prisma.user.findMany.mockResolvedValue([{ id: 'admin', email: 'original@example.invalid' }]);
        await service.process('tenant');
        expect(job.state).toBe('ARCHIVED');
        expect(prisma.tenant.update).toHaveBeenCalledWith({ where: { id: 'tenant' }, data: { status: 'ARCHIVED', serviceBlocked: true } });
        expect(prisma.tFN.updateMany).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: 'HELD' }) }));
        expect(prisma.dID.deleteMany).not.toHaveBeenCalled();
        expect(prisma.user.deleteMany).not.toHaveBeenCalled();
        expect(prisma.user.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ email: 'archived-admin@archived.invalid', password: null, status: 'DELETED' }) }));
        expect(billing.post.mock.calls[0][0]).toContain('/customer-lifecycle/U1005/archive');
    });
    it('keeps the checkpoint and retries telecom failures before billing archival', async () => {
        fs.bulkDeleteTenantData.mockRejectedValueOnce(new Error('FreeSWITCH unavailable'));
        await service.process('tenant');
        expect(job.state).toBe('ARCHIVE_FAILED'); expect(job.phase).toBe('ARCHIVE_REQUESTED');
        expect(billing.post).not.toHaveBeenCalled();
        await service.process('tenant');
        expect(job.state).toBe('ARCHIVED');
    });
    it('resumes from the saved telecom checkpoint after a billing failure', async () => {
        billing.post.mockImplementationOnce(() => { throw new Error('Billing unavailable'); });
        await service.process('tenant');
        expect(job.phase).toBe('TELECOM_TORN_DOWN');
        await service.process('tenant');
        expect(job.state).toBe('ARCHIVED');
        expect(fs.bulkDeleteTenantData).toHaveBeenCalledTimes(1);
    });
    it('requires provider confirmation before releasing numbers', async () => {
        await expect(service.releaseNumbers('tenant', 'super', { reason: 'test' })).rejects.toThrow('Provider confirmation');
        expect(billing.post).not.toHaveBeenCalled();
    });
});
