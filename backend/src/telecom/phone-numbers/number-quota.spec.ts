import { BadRequestException } from '@nestjs/common';
import { DIDsService } from '../dids/dids.service';
import { TFNsService } from '../tfns/tfns.service';

describe('Shared plan number quota', () => {
    const tx: any = {
        $queryRaw: jest.fn(),
        subscription: { findFirst: jest.fn() },
        tFN: { count: jest.fn(), findUnique: jest.fn(), create: jest.fn(), update: jest.fn() },
        dID: { count: jest.fn(), findUnique: jest.fn(), create: jest.fn(), update: jest.fn(), findFirst: jest.fn() },
    };
    const prisma: any = {
        $transaction: jest.fn(async callback => callback(tx)),
        tFN: { findUnique: jest.fn(), count: jest.fn() },
        dID: { findUnique: jest.fn(), count: jest.fn() },
    };
    const sync: any = { syncTFN: jest.fn(), syncDID: jest.fn() };
    const redis: any = { updateNumberLookup: jest.fn() };
    const http: any = {};
    const config: any = {};

    beforeEach(() => {
        jest.clearAllMocks();
        tx.subscription.findFirst.mockResolvedValue({ plan: { maxNumbers: 1 } });
        tx.tFN.count.mockResolvedValue(1);
        tx.dID.count.mockResolvedValue(0);
        prisma.tFN.findUnique.mockResolvedValue(null);
        prisma.dID.findUnique.mockResolvedValue(null);
        prisma.tFN.count.mockResolvedValue(0);
        prisma.dID.count.mockResolvedValue(0);
        tx.$queryRaw.mockResolvedValue([{ locked: 1 }]);
        tx.tFN.findUnique.mockResolvedValue(null);
        tx.dID.findUnique.mockResolvedValue(null);
    });

    it('rejects a DID when a TFN has filled the pooled allowance', async () => {
        const service = new DIDsService(prisma, sync, redis, http, config);
        await expect(service.create('tenant-1', { didNumber: '+15551234567' })).rejects.toThrow(BadRequestException);
        expect(tx.dID.create).not.toHaveBeenCalled();
    });

    it('rejects a TFN when a TFN has filled the pooled allowance', async () => {
        const service = new TFNsService(prisma, sync, redis, http, config);
        await expect(service.create('tenant-1', { tfnNumber: '+18005551234' })).rejects.toThrow(BadRequestException);
        expect(tx.tFN.create).not.toHaveBeenCalled();
    });

    it('claims an available TFN inventory row without creating a duplicate', async () => {
        tx.tFN.count.mockResolvedValue(0);
        tx.tFN.findUnique.mockResolvedValue({ id: 'inventory-tfn', number: '+18005551234', tenantId: null, status: 'AVAILABLE' });
        tx.tFN.update.mockResolvedValue({ id: 'inventory-tfn', number: '+18005551234', tenantId: 'tenant-1' });
        const service = new TFNsService(prisma, sync, redis, http, config);
        jest.spyOn(service as any, 'syncAssetsToSubBilling').mockResolvedValue(undefined);

        await service.create('tenant-1', { tfnNumber: '+18005551234' });

        expect(tx.tFN.update).toHaveBeenCalledWith(expect.objectContaining({
            where: { id: 'inventory-tfn' },
            data: expect.objectContaining({ tenantId: 'tenant-1', status: 'ASSIGNED' }),
        }));
        expect(tx.tFN.create).not.toHaveBeenCalled();
    });

    it('claims an unassigned DID inventory row without creating a duplicate', async () => {
        tx.tFN.count.mockResolvedValue(0);
        tx.dID.findFirst.mockResolvedValue(null);
        tx.dID.findUnique.mockResolvedValue({ id: 'inventory-did', number: '+15551234567', tenantId: null });
        tx.dID.update.mockResolvedValue({ id: 'inventory-did', number: '+15551234567', tenantId: 'tenant-1' });
        const service = new DIDsService(prisma, sync, redis, http, config);
        jest.spyOn(service as any, 'syncAssetsToSubBilling').mockResolvedValue(undefined);

        await service.create('tenant-1', { didNumber: '+15551234567' });

        expect(tx.dID.update).toHaveBeenCalledWith(expect.objectContaining({
            where: { id: 'inventory-did' },
            data: expect.objectContaining({ tenantId: 'tenant-1', sequenceId: 1 }),
        }));
        expect(tx.dID.create).not.toHaveBeenCalled();
    });
});
