import { Test, TestingModule } from '@nestjs/testing';
import { SubscriptionTelecomController } from './subscription-telecom.controller';
import { TFNsService } from './tfns/tfns.service';
import { DIDsService } from './dids/dids.service';
import { AdminService } from '../admin/admin.service';
import { WalletService } from '../wallet/wallet.service';
import { BadRequestException } from '@nestjs/common';
import { Role } from '@prisma/client';

describe('SubscriptionTelecomController', () => {
    let controller: SubscriptionTelecomController;
    let tfnsService: jest.Mocked<TFNsService>;
    let didsService: jest.Mocked<DIDsService>;
    let adminService: jest.Mocked<AdminService>;
    let walletService: jest.Mocked<WalletService>;

    beforeEach(async () => {
        const mockTfnsService = {
            findAvailable: jest.fn().mockResolvedValue([{ id: 'tfn-1', number: '+18001112233', status: 'AVAILABLE' }]),
            findAll: jest.fn().mockResolvedValue([{ id: 'tfn-1', number: '+18001112233', status: 'ASSIGNED' }]),
            assign: jest.fn(),
        };

        const mockDidsService = {
            findAvailable: jest.fn().mockResolvedValue([{ id: 'did-1', number: '+15551234567' }]),
            findAll: jest.fn().mockResolvedValue([{ id: 'did-1', number: '+15551234567' }]),
            create: jest.fn().mockResolvedValue({ id: 'did-2', number: '+15559998877' }),
        };

        const mockAdminService = {
            assignNumber: jest.fn().mockImplementation((type, idOrNumber, tenantId) => {
                return Promise.resolve({ id: idOrNumber, type, tenantId, status: 'ASSIGNED' });
            }),
            unassignNumber: jest.fn().mockImplementation((type, idOrNumber) => {
                return Promise.resolve({ id: idOrNumber, type, tenantId: null, status: 'AVAILABLE' });
            }),
        };

        const mockWalletService = {
            getAssets: jest.fn().mockResolvedValue({
                tfns: [{ id: 'tfn-asset-1', source_id: 'tier_1_starter', source_type: 'plan', tfn_number: null, status: 'unassigned' }],
                dids: [{ id: 'did-asset-1', source_id: 'tier_1_starter', source_type: 'plan', did_number: null, status: 'unassigned' }],
                extensions: []
            }),
        };

        const module: TestingModule = await Test.createTestingModule({
            controllers: [SubscriptionTelecomController],
            providers: [
                { provide: TFNsService, useValue: mockTfnsService },
                { provide: DIDsService, useValue: mockDidsService },
                { provide: AdminService, useValue: mockAdminService },
                { provide: WalletService, useValue: mockWalletService },
            ],
        }).compile();

        controller = module.get<SubscriptionTelecomController>(SubscriptionTelecomController);
        tfnsService = module.get(TFNsService);
        didsService = module.get(DIDsService);
        adminService = module.get(AdminService);
        walletService = module.get(WalletService);
    });

    describe('GET /subscription/tfns/available', () => {
        it('should return available TFNs from inventory', async () => {
            const result = await controller.findAvailableTfns();
            expect(result).toHaveLength(1);
            expect(result[0].number).toBe('+18001112233');
            expect(tfnsService.findAvailable).toHaveBeenCalled();
        });
    });

    describe('GET /subscription/dids/available', () => {
        it('should return available DIDs from inventory', async () => {
            const result = await controller.findAvailableDids();
            expect(result).toHaveLength(1);
            expect(result[0].number).toBe('+15551234567');
            expect(didsService.findAvailable).toHaveBeenCalled();
        });
    });

    describe('GET /subscription/tfns', () => {
        it('should return sub-billing TFN assets if present for tenant', async () => {
            const user = { role: Role.SUPER_ADMIN, tenantId: null };
            const result = await controller.findAllTfns(user, 'U1009');
            expect(walletService.getAssets).toHaveBeenCalledWith('U1009');
            expect(result).toHaveLength(1);
            expect(result[0].source_id).toBe('tier_1_starter');
        });

        it('should fallback to local PBX TFN records if wallet assets fails', async () => {
            walletService.getAssets.mockRejectedValueOnce(new Error('Sub-billing down'));
            const user = { role: Role.SUPER_ADMIN, tenantId: null };
            const result = await controller.findAllTfns(user, 'U1009');
            expect(tfnsService.findAll).toHaveBeenCalledWith('U1009');
            expect(result).toHaveLength(1);
        });
    });

    describe('GET /subscription/dids', () => {
        it('should return sub-billing DID assets if present for tenant', async () => {
            const user = { role: Role.SUPER_ADMIN, tenantId: null };
            const result = await controller.findAllDids(user, 'U1009');
            expect(walletService.getAssets).toHaveBeenCalledWith('U1009');
            expect(result).toHaveLength(1);
            expect(result[0].source_id).toBe('tier_1_starter');
        });
    });

    describe('POST /subscription/tfns/assign & /subscription/tfns/:id/assign', () => {
        it('should assign TFN by ID', async () => {
            const res = await controller.assignTfnById('tfn-1', 'U1009');
            expect(adminService.assignNumber).toHaveBeenCalledWith('TFN', 'tfn-1', 'U1009');
            expect(res.status).toBe('ASSIGNED');
        });

        it('should assign TFN by body number and tenantId', async () => {
            const res = await controller.assignTfn({ number: '+18001112233', tenantId: 'U1009' });
            expect(adminService.assignNumber).toHaveBeenCalledWith('TFN', '+18001112233', 'U1009');
            expect(res.status).toBe('ASSIGNED');
        });

        it('should throw BadRequestException if missing tenantId', async () => {
            await expect(controller.assignTfnById('tfn-1', undefined as any)).rejects.toThrow(BadRequestException);
            await expect(controller.assignTfn({ number: '+18001112233' } as any)).rejects.toThrow(BadRequestException);
        });
    });

    describe('POST /subscription/tfns/unassign', () => {
        it('should unassign TFN by number or ID', async () => {
            const res = await controller.unassignTfn({ number: '+18001112233' });
            expect(adminService.unassignNumber).toHaveBeenCalledWith('TFN', '+18001112233');
            expect(res.status).toBe('AVAILABLE');
        });
    });

    describe('POST /subscription/dids/assign & /unassign', () => {
        it('should assign DID', async () => {
            const res = await controller.assignDid({ number: '+15551234567', tenantId: 'U1009' });
            expect(adminService.assignNumber).toHaveBeenCalledWith('DID', '+15551234567', 'U1009');
            expect(res.status).toBe('ASSIGNED');
        });

        it('should unassign DID', async () => {
            const res = await controller.unassignDid({ number: '+15551234567' });
            expect(adminService.unassignNumber).toHaveBeenCalledWith('DID', '+15551234567');
            expect(res.status).toBe('AVAILABLE');
        });
    });

    describe('POST /subscription/dids (create / assign)', () => {
        it('should assign existing available DID or create a new DID', async () => {
            const user = { role: Role.SUPER_ADMIN, tenantId: null };
            // If already in inventory:
            const res = await controller.createDid(user, { didNumber: '+15551234567', targetTenantId: 'U1009' });
            expect(adminService.assignNumber).toHaveBeenCalledWith('DID', 'did-1', 'U1009');

            // If not in inventory:
            didsService.findAvailable.mockResolvedValueOnce([]);
            const res2 = await controller.createDid(user, { didNumber: '+15559998877', targetTenantId: 'U1009' });
            expect(didsService.create).toHaveBeenCalledWith('U1009', { didNumber: '+15559998877' });
        });
    });
});
