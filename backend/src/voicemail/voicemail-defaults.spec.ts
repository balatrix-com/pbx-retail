import { VoicemailService } from './voicemail.service';

describe('automatic voicemail defaults', () => {
  const tenantId = 'tenant-1';

  function setup(existing: Array<{ extensionId: string | null }> = []) {
    const prisma = {
      tenant: {
        findUnique: jest.fn().mockResolvedValue({
          id: tenantId,
          status: 'ACTIVE',
          serviceBlocked: false,
          tenantFeatures: { voicemailEnabled: true },
          extensions: [
            { id: 'ext-1', extensionNumber: '101' },
            { id: 'ext-2', extensionNumber: '102' },
          ],
        }),
      },
      voicemailBox: {
        findMany: jest.fn().mockResolvedValue(existing),
        findFirst: jest.fn().mockResolvedValue(null),
      },
    };
    const service = new VoicemailService(prisma as any, {} as any, {} as any);
    const createBox = jest.spyOn(service, 'createBox').mockResolvedValue({} as any);
    return { service, createBox };
  }

  it('starts the company mailbox on and extension mailboxes off', async () => {
    const { service, createBox } = setup();
    await service.ensureDefaultBoxes(tenantId);
    expect(createBox).toHaveBeenCalledTimes(3);
    expect(createBox).toHaveBeenCalledWith(tenantId, expect.objectContaining({ extensionId: null, enabled: true }));
    expect(createBox).toHaveBeenCalledWith(tenantId, expect.objectContaining({ extensionId: 'ext-1', enabled: false }));
    expect(createBox).toHaveBeenCalledWith(tenantId, expect.objectContaining({ extensionId: 'ext-2', enabled: false }));
  });

  it('preserves existing mailboxes and creates only missing extension mailboxes', async () => {
    const { service, createBox } = setup([{ extensionId: null }, { extensionId: 'ext-1' }]);
    await service.ensureDefaultBoxes(tenantId);
    expect(createBox).toHaveBeenCalledTimes(1);
    expect(createBox).toHaveBeenCalledWith(tenantId, expect.objectContaining({ extensionId: 'ext-2', enabled: false }));
  });
});
