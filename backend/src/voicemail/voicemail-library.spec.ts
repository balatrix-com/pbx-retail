import { NotFoundException } from '@nestjs/common';
import { VoicemailService } from './voicemail.service';
import { promises as fs } from 'fs';

describe('voicemail Audio Library selection', () => {
  function setup(audio: any) {
    const prisma = { audioFile: { findFirst: jest.fn().mockResolvedValue(audio) } };
    const storage = { readAudio: jest.fn().mockResolvedValue(Buffer.from('audio')) };
    const service = new VoicemailService(prisma as any, {} as any, storage as any);
    jest.spyOn(service, 'assertEnabled').mockResolvedValue(undefined);
    jest.spyOn(service as any, 'getBox').mockResolvedValue({ id: 'box' });
    const save = jest.spyOn(service as any, 'saveGreeting').mockResolvedValue({ uploaded: true });
    return { prisma, storage, service, save };
  }

  it('rejects library files that do not belong to the current tenant before reading storage', async () => {
    const { service, prisma, storage } = setup(null);
    await expect(service.selectLibraryGreeting('tenant-1', 'box', 'foreign-audio')).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.audioFile.findFirst).toHaveBeenCalledWith({ where: { id: 'foreign-audio', tenantId: 'tenant-1' } });
    expect(storage.readAudio).not.toHaveBeenCalled();
  });

  it('allows one library source to supply multiple mailboxes through the existing conversion path', async () => {
    const { service, storage, save } = setup({ size: 100, storageUrl: '/opt/ivr_audio/tenant-1/greeting.mp3' });
    await service.selectLibraryGreeting('tenant-1', 'box-1', 'audio');
    await service.selectLibraryGreeting('tenant-1', 'box-2', 'audio');
    expect(storage.readAudio).toHaveBeenCalledWith('/opt/ivr_audio/tenant-1/greeting.mp3');
    expect(save).toHaveBeenCalledWith('tenant-1', 'box-1', Buffer.from('audio'), 50 * 1024 * 1024);
    expect(save).toHaveBeenCalledWith('tenant-1', 'box-2', Buffer.from('audio'), 50 * 1024 * 1024);
  });
});

describe('voicemail permission enforcement', () => {
  const originalGid = process.env.VOICEMAIL_SHARED_GID;
  afterEach(() => {
    if (originalGid === undefined) delete process.env.VOICEMAIL_SHARED_GID;
    else process.env.VOICEMAIL_SHARED_GID = originalGid;
    jest.restoreAllMocks();
  });

  it('reports a permission error instead of succeeding when group ownership cannot be set', async () => {
    process.env.VOICEMAIL_SHARED_GID = '1005';
    const service = new VoicemailService({} as any, {} as any, {} as any);
    jest.spyOn(fs, 'lstat').mockResolvedValue({ isSymbolicLink: () => false } as any);
    jest.spyOn(fs, 'chown').mockRejectedValue(new Error('EPERM'));
    const chmod = jest.spyOn(fs, 'chmod').mockResolvedValue(undefined);
    await expect((service as any).setPermissions('/greeting.wav', 0o640)).rejects.toMatchObject({ status: 503 });
    expect(chmod).not.toHaveBeenCalled();
  });

  it('sets shared-group ownership and a non-public greeting mode', async () => {
    process.env.VOICEMAIL_SHARED_GID = '1005';
    const service = new VoicemailService({} as any, {} as any, {} as any);
    jest.spyOn(fs, 'lstat').mockResolvedValue({ isSymbolicLink: () => false } as any);
    const chown = jest.spyOn(fs, 'chown').mockResolvedValue(undefined);
    const chmod = jest.spyOn(fs, 'chmod').mockResolvedValue(undefined);
    await (service as any).setPermissions('/greeting.wav', 0o640);
    expect(chown).toHaveBeenCalledWith('/greeting.wav', -1, 1005);
    expect(chmod).toHaveBeenCalledWith('/greeting.wav', 0o640);
  });
});
