import { Test, TestingModule } from '@nestjs/testing';
import { ExtensionsService } from './extensions.service';
import { PrismaService } from '../../prisma/prisma.service';
import { FreeSwitchSyncService } from '../../freeswitch/freeswitch-sync.service';
import { LookupRedisService } from '../../redis/lookup-redis.module';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { of, throwError } from 'rxjs';

describe('ExtensionsService (Kamailio & Sub-Billing Auto-Sync)', () => {
    let service: ExtensionsService;
    let prisma: any;
    let freeSwitchSync: any;
    let lookupRedis: any;
    let httpService: any;

    beforeEach(async () => {
        prisma = {
            tenant: {
                findFirst: jest.fn().mockImplementation(({ where }) => {
                    return Promise.resolve({ id: 'tenant-uuid-1', customerCode: '1006', subBillingCustomerId: 'U1006' });
                }),
                findUnique: jest.fn().mockImplementation(({ where }) => {
                    return Promise.resolve({ id: 'tenant-uuid-1', customerCode: '1006', subBillingCustomerId: 'U1006' });
                }),
            },
            extension: {
                findMany: jest.fn().mockResolvedValue([]),
                findFirst: jest.fn().mockResolvedValue(null),
                findUnique: jest.fn().mockResolvedValue(null),
                create: jest.fn().mockImplementation(({ data }) => {
                    return Promise.resolve({ id: 'ext-uuid-1', ...data });
                }),
                count: jest.fn().mockResolvedValue(0),
            },
        };

        freeSwitchSync = {
            syncExtension: jest.fn().mockResolvedValue(undefined),
            deleteExtension: jest.fn().mockResolvedValue(undefined),
        };

        lookupRedis = {
            updateExtensionLookup: jest.fn().mockResolvedValue(undefined),
            deleteExtensionLookup: jest.fn().mockResolvedValue(undefined),
        };

        httpService = {
            get: jest.fn().mockReturnValue(
                of({
                    data: {
                        extensions: [
                            { extension_number: '100601', extension_name: 'Extension 100601', status: 'active' },
                            { extension_number: '100602', extension_name: 'Extension 100602', status: 'active' }
                        ]
                    }
                })
            ),
        };

        const configService = {
            get: jest.fn().mockReturnValue({ apiUrl: 'http://localhost:5005/api' }),
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                ExtensionsService,
                { provide: PrismaService, useValue: prisma },
                { provide: FreeSwitchSyncService, useValue: freeSwitchSync },
                { provide: LookupRedisService, useValue: lookupRedis },
                { provide: HttpService, useValue: httpService },
                { provide: ConfigService, useValue: configService },
            ],
        }).compile();

        service = module.get<ExtensionsService>(ExtensionsService);
    });

    describe('syncMissingExtensionsFromSubBilling', () => {
        it('should fetch sub-billing extension assets and automatically create PBX extensions and sync Kamailio subscribers', async () => {
            await service.syncMissingExtensionsFromSubBilling('tenant-uuid-1');

            // Verify sub-billing API was called
            expect(httpService.get).toHaveBeenCalledWith('http://localhost:5005/api/pbx/assets/U1006');

            // Verify both extensions were inserted into PBX DB
            expect(prisma.extension.create).toHaveBeenCalledTimes(2);
            expect(prisma.extension.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    data: expect.objectContaining({
                        tenantId: 'tenant-uuid-1',
                        extensionNumber: '100601',
                        sipUsername: '100601',
                    })
                })
            );

            // Verify syncExtension was called for FreeSWITCH and Kamailio registration
            expect(freeSwitchSync.syncExtension).toHaveBeenCalledTimes(2);

            // Verify Redis lookup was updated
            expect(lookupRedis.updateExtensionLookup).toHaveBeenCalledWith('tenant-uuid-1');
        });

        it('should sync existing extensions to Kamailio without re-inserting duplicate PBX records', async () => {
            // Setup existing extension in DB
            prisma.extension.findMany.mockResolvedValueOnce([
                { id: 'ext-existing-1', extensionNumber: '100601', tenantId: 'tenant-uuid-1' }
            ]);

            await service.syncMissingExtensionsFromSubBilling('tenant-uuid-1');

            // Only the second extension (100602) should be created
            expect(prisma.extension.create).toHaveBeenCalledTimes(1);
            expect(prisma.extension.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    data: expect.objectContaining({
                        extensionNumber: '100602'
                    })
                })
            );

            // Both existing and new extensions should have Kamailio sync executed
            expect(freeSwitchSync.syncExtension).toHaveBeenCalledWith('ext-existing-1');
        });

        it('should gracefully handle sub-billing service network errors without throwing', async () => {
            httpService.get.mockReturnValueOnce(throwError(() => new Error('Sub-billing connection refused')));

            await expect(service.syncMissingExtensionsFromSubBilling('tenant-uuid-1')).resolves.not.toThrow();
            expect(prisma.extension.create).not.toHaveBeenCalled();
        });

        it('should normalize legacy truncated extension numbers to standard format with customerCode', async () => {
            httpService.get.mockReturnValueOnce(
                of({
                    data: {
                        extensions: [
                            { extension_number: '00601', extension_name: 'Legacy Truncated 1' },
                            { extension_number: '00602', extension_name: 'Legacy Truncated 2' }
                        ]
                    }
                })
            );

            await service.syncMissingExtensionsFromSubBilling('tenant-uuid-1');

            expect(prisma.extension.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    data: expect.objectContaining({
                        extensionNumber: '100601'
                    })
                })
            );
        });
    });

    describe('findAll', () => {
        it('should query and return extensions for the tenant', async () => {
            prisma.extension.findMany.mockResolvedValue([
                { id: 'ext-1', extensionNumber: '100601', tenantId: 'tenant-uuid-1' }
            ]);

            const result = await service.findAll('U1006');

            expect(result).toHaveLength(1);
            expect(result[0].extensionNumber).toBe('100601');
        });
    });
});
