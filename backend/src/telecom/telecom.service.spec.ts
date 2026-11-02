import { BadRequestException } from '@nestjs/common';
import { TelecomService } from './telecom.service';

describe('TelecomService.updateTFNRouting', () => {
  const tfn = {
    id: 'tfn-a',
    number: '+18005550100',
    tenantId: 'tenant-a',
    routeType: 'extension',
    routeTargetId: 'extension-a',
  };
  const prisma = {
    tFN: { findUnique: jest.fn(), update: jest.fn() },
    extension: { findFirst: jest.fn() },
    ringGroup: { findFirst: jest.fn() },
  };
  const freeswitchSync = { syncTFN: jest.fn() };
  const service = new TelecomService(
    prisma as any, {} as any, {} as any, freeswitchSync as any, {} as any, {} as any,
  );

  beforeEach(() => {
    jest.resetAllMocks();
    prisma.tFN.findUnique.mockResolvedValue(tfn);
    prisma.tFN.update.mockResolvedValue(tfn);
    freeswitchSync.syncTFN.mockResolvedValue(undefined);
  });

  it('rejects a foreign extension supplied without routeType', async () => {
    prisma.extension.findFirst.mockResolvedValue(null);

    await expect(service.updateTFNRouting('tfn-a', 'tenant-a', {
      routeTargetId: 'extension-b',
    })).rejects.toBeInstanceOf(BadRequestException);

    expect(prisma.extension.findFirst).toHaveBeenCalledWith({
      where: { id: 'extension-b', tenantId: 'tenant-a' },
    });
    expect(prisma.tFN.update).not.toHaveBeenCalled();
    expect(freeswitchSync.syncTFN).not.toHaveBeenCalled();
  });

  it('validates a stored target when only routeType changes', async () => {
    prisma.ringGroup.findFirst.mockResolvedValue(null);

    await expect(service.updateTFNRouting('tfn-a', 'tenant-a', {
      routeType: 'ring_group',
    })).rejects.toBeInstanceOf(BadRequestException);

    expect(prisma.ringGroup.findFirst).toHaveBeenCalledWith({
      where: { id: 'extension-a', tenantId: 'tenant-a' },
    });
    expect(prisma.tFN.update).not.toHaveBeenCalled();
  });

  it('preserves forwarding fields and syncs a valid partial update', async () => {
    prisma.extension.findFirst.mockResolvedValue({ id: 'extension-a2' });
    const data = {
      routeTargetId: 'extension-a2',
      forwardEnabled: true,
      forwardNumber: '+18005550199',
    };

    await expect(service.updateTFNRouting('tfn-a', 'tenant-a', data)).resolves.toBe(tfn);

    expect(prisma.tFN.update).toHaveBeenCalledWith({
      where: { id: 'tfn-a' },
      data: {
        routeType: undefined,
        routeTargetId: 'extension-a2',
        forwardEnabled: true,
        forwardNumber: '+18005550199',
      },
    });
    expect(freeswitchSync.syncTFN).toHaveBeenCalledWith('tfn-a');
  });

  it('keeps forwarding-only updates on the existing path', async () => {
    await service.updateTFNRouting('tfn-a', 'tenant-a', { forwardEnabled: false });

    expect(prisma.extension.findFirst).not.toHaveBeenCalled();
    expect(prisma.tFN.update).toHaveBeenCalled();
    expect(freeswitchSync.syncTFN).toHaveBeenCalledWith('tfn-a');
  });
});
