import { Test, TestingModule } from '@nestjs/testing';
import { AddonsService } from './addons.service';
import { PrismaService } from '../prisma/prisma.service';
import { WalletService } from '../wallet/wallet.service';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { of, throwError } from 'rxjs';
import { NotFoundException, BadRequestException } from '@nestjs/common';

describe('AddonsService (Dynamic Catalog & Purchase)', () => {
    let service: AddonsService;
    let prisma: any;
    let walletService: any;
    let httpService: any;

    beforeEach(async () => {
        prisma = {
            subscription: {
                findFirst: jest.fn().mockResolvedValue({
                    id: 'sub-1',
                    tenantId: 'tenant-1',
                    status: 'ACTIVE',
                    endDate: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000)
                }),
            },
        };

        walletService = {
            getSubBillingCustomerId: jest.fn().mockResolvedValue('U1010'),
            getBalance: jest.fn().mockResolvedValue({ balance: 100.0, creditLimit: 50.0 }),
            adjustBalance: jest.fn().mockResolvedValue({ success: true }),
        };

        httpService = {
            get: jest.fn().mockImplementation((url) => {
                if (url.includes('/addons/catalog')) {
                    return of({
                        data: {
                            success: true,
                            data: [
                                {
                                    addon_id: 'addon_3_extension',
                                    name: '3 Extra Extensions',
                                    resource_type: 'extension',
                                    units_count: 3,
                                    unit_price: 15.00,
                                    currency: 'USD',
                                    is_active: true,
                                    description: '3 extra extensions pack'
                                },
                                {
                                    addon_id: 'addon_ext_1',
                                    name: '1 Extra Extension',
                                    resource_type: 'extension',
                                    units_count: 1,
                                    unit_price: 5.00,
                                    currency: 'USD',
                                    is_active: true,
                                    description: '1 extra extension'
                                }
                            ]
                        }
                    });
                }
                return of({ data: {} });
            }),
            post: jest.fn().mockImplementation((url, body) => {
                if (url.includes('/addons/purchase')) {
                    return of({
                        data: {
                            success: true,
                            message: 'Addon purchased in Sub-Billing',
                            data: { addon_id: body.addon_id, quantity: body.quantity }
                        }
                    });
                }
                return of({ data: { success: true } });
            }),
        };

        const configService = {
            get: jest.fn().mockReturnValue('http://localhost:5005/api'),
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                AddonsService,
                { provide: PrismaService, useValue: prisma },
                { provide: WalletService, useValue: walletService },
                { provide: HttpService, useValue: httpService },
                { provide: ConfigService, useValue: configService },
            ],
        }).compile();

        service = module.get<AddonsService>(AddonsService);
    });

    describe('getQuote', () => {
        it('should successfully get quote for dynamic addon (addon_3_extension) from sub-billing catalog', async () => {
            const quote = await service.getQuote('tenant-1', 'addon_3_extension', 1);

            expect(quote.addon_id).toBe('addon_3_extension');
            expect(quote.name).toBe('3 Extra Extensions');
            expect(quote.unit_price).toBe(15.00);
            expect(quote.sufficient_funds).toBe(true);
        });

        it('should throw NotFoundException when addon is not found in dynamic or static catalog', async () => {
            await expect(service.getQuote('tenant-1', 'non_existent_addon', 1))
                .rejects
                .toThrow(NotFoundException);
        });
    });

    describe('purchaseAddon', () => {
        it('should execute purchase via Sub-Billing endpoint', async () => {
            const res = await service.purchaseAddon('tenant-1', 'addon_3_extension', 1);

            expect(httpService.post).toHaveBeenCalledWith(
                'http://localhost:5005/api/addons/purchase',
                expect.objectContaining({
                    customer_id: 'U1010',
                    addon_id: 'addon_3_extension',
                    quantity: 1
                })
            );
            expect(res.success).toBe(true);
        });

        it('should throw BadRequestException if tenant has insufficient funds', async () => {
            walletService.getBalance.mockResolvedValueOnce({ balance: 0, creditLimit: 0 });

            await expect(service.purchaseAddon('tenant-1', 'addon_3_extension', 10))
                .rejects
                .toThrow(BadRequestException);
        });
    });
});
