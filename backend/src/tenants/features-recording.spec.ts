import { BadRequestException, NotFoundException } from '@nestjs/common';
import { TenantsService } from './tenants.service';

describe('TenantsService - Recording Feature Guard', () => {
    let service: TenantsService;
    let prismaMock: any;
    let adminServiceMock: any;
    let freeSwitchSyncMock: any;

    beforeEach(() => {
        prismaMock = {
            tenant: {
                findUnique: jest.fn(),
            },
            recRateCard: {
                findUnique: jest.fn(),
                upsert: jest.fn(),
            },
            tenantFeature: {
                upsert: jest.fn(),
            },
            extension: {
                updateMany: jest.fn(),
            },
        };

        adminServiceMock = {
            updateCustomerRecRateCardMapping: jest.fn(),
            getAllRecRateCards: jest.fn().mockResolvedValue([]),
        };

        freeSwitchSyncMock = {
            syncAllDialplans: jest.fn(),
        };

        service = new TenantsService(
            prismaMock as any,
            freeSwitchSyncMock as any,
            adminServiceMock as any,
            {} as any,
            {} as any,
            {} as any,
            {} as any,
            {} as any,
        );
    });

    it('should throw NotFoundException if tenant does not exist', async () => {
        prismaMock.tenant.findUnique.mockResolvedValue(null);

        await expect(
            service.updateTenantFeatures('non-existent', { recordingAllowed: true, recRateCardId: 10 }),
        ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when enabling recording without recRateCardId', async () => {
        prismaMock.tenant.findUnique.mockResolvedValue({
            id: 'tenant-1',
            customerCode: 'CUST-001',
        });

        await expect(
            service.updateTenantFeatures('tenant-1', { recordingAllowed: true }),
        ).rejects.toThrow(BadRequestException);
        await expect(
            service.updateTenantFeatures('tenant-1', { recordingAllowed: true }),
        ).rejects.toThrow(/recRateCardId.*must be selected before enabling call recording/);
    });

    it('should throw BadRequestException if recRateCardId does not exist in local database or sub-billing', async () => {
        prismaMock.tenant.findUnique.mockResolvedValue({
            id: 'tenant-1',
            customerCode: 'CUST-001',
        });
        prismaMock.recRateCard.findUnique.mockResolvedValue(null);
        adminServiceMock.getAllRecRateCards.mockResolvedValue([]);

        await expect(
            service.updateTenantFeatures('tenant-1', { recordingAllowed: true, recRateCardId: 999 }),
        ).rejects.toThrow(BadRequestException);
        await expect(
            service.updateTenantFeatures('tenant-1', { recordingAllowed: true, recRateCardId: 999 }),
        ).rejects.toThrow(/Recording rate card id 999 does not exist/);
    });

    it('should fall back to sub-billing when rate card is missing locally and sync it', async () => {
        prismaMock.tenant.findUnique.mockResolvedValue({
            id: 'tenant-1',
            customerCode: 'CUST-001',
            subBillingCustomerId: 'sub-cust-001',
        });
        // Missing locally first
        prismaMock.recRateCard.findUnique.mockResolvedValue(null);
        // Exists in sub-billing
        adminServiceMock.getAllRecRateCards.mockResolvedValue([
            { id: 2, name: '15_Days_Standard', rate_per_min: 0.005, retention_period: 15 }
        ]);
        prismaMock.recRateCard.upsert.mockResolvedValue({
            id: 2,
            name: '15_Days_Standard',
        });
        adminServiceMock.updateCustomerRecRateCardMapping.mockResolvedValue({ success: true });
        prismaMock.tenantFeature.upsert.mockResolvedValue({
            tenantId: 'tenant-1',
            recordingAllowed: true,
        });

        const result = await service.updateTenantFeatures('tenant-1', {
            recordingAllowed: true,
            recRateCardId: 2,
        });

        expect(prismaMock.recRateCard.upsert).toHaveBeenCalledWith(expect.objectContaining({
            where: { id: 2 },
        }));
        expect(adminServiceMock.updateCustomerRecRateCardMapping).toHaveBeenCalledWith('sub-cust-001', {
            rec_rc_id: 2,
        });
        expect(result.recordingAllowed).toBe(true);
    });

    it('should call adminService.updateCustomerRecRateCardMapping and upsert feature when valid recRateCardId is provided', async () => {
        prismaMock.tenant.findUnique.mockResolvedValue({
            id: 'tenant-1',
            customerCode: 'CUST-001',
            subBillingCustomerId: 'sub-cust-001',
        });
        prismaMock.recRateCard.findUnique.mockResolvedValue({
            id: 2,
            name: '7_days_standard',
        });
        adminServiceMock.updateCustomerRecRateCardMapping.mockResolvedValue({ success: true });
        prismaMock.tenantFeature.upsert.mockResolvedValue({
            tenantId: 'tenant-1',
            recordingAllowed: true,
        });

        const result = await service.updateTenantFeatures('tenant-1', {
            recordingAllowed: true,
            recRateCardId: 2,
        });

        expect(adminServiceMock.updateCustomerRecRateCardMapping).toHaveBeenCalledWith('sub-cust-001', {
            rec_rc_id: 2,
        });
        expect(prismaMock.tenantFeature.upsert).toHaveBeenCalledWith(expect.objectContaining({
            where: { tenantId: 'tenant-1' },
            create: expect.objectContaining({ recordingAllowed: true }),
            update: expect.objectContaining({ recordingAllowed: true }),
        }));
        expect(result.recordingAllowed).toBe(true);
    });

    it('should allow disabling recording without needing a recRateCardId and disable extensions', async () => {
        prismaMock.tenant.findUnique.mockResolvedValue({
            id: 'tenant-1',
            customerCode: 'CUST-001',
        });
        prismaMock.tenantFeature.upsert.mockResolvedValue({
            tenantId: 'tenant-1',
            recordingAllowed: false,
        });
        prismaMock.extension.updateMany.mockResolvedValue({ count: 5 });

        const result = await service.updateTenantFeatures('tenant-1', {
            recordingAllowed: false,
        });

        expect(adminServiceMock.updateCustomerRecRateCardMapping).not.toHaveBeenCalled();
        expect(prismaMock.extension.updateMany).toHaveBeenCalledWith({
            where: { tenantId: 'tenant-1' },
            data: { recordingEnabled: false },
        });
        expect(freeSwitchSyncMock.syncAllDialplans).toHaveBeenCalledWith('tenant-1');
        expect(result.recordingAllowed).toBe(false);
    });
});
