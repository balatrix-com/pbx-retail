import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException, OnModuleInit, ServiceUnavailableException } from '@nestjs/common';
import { Prisma, TenantStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { FreeSwitchSyncService } from '../freeswitch/freeswitch-sync.service';
import { AudioUploadService } from '../freeswitch/audio-upload.service';
import { createReadStream, promises as fs } from 'fs';
import { join } from 'path';
import { randomUUID } from 'crypto';
import { spawn } from 'child_process';

type BoxInput = {
  name?: string;
  extensionId?: string | null;
  enabled?: boolean;
  noAnswerSeconds?: number;
  notifyByEmail?: boolean;
  notifyEmail?: string | null;
};

@Injectable()
export class VoicemailService implements OnModuleInit {
  private readonly storageRoot = process.env.VOICEMAIL_STORAGE_ROOT || '/var/lib/pbx-voicemail';
  private readonly greetingRoot = process.env.VOICEMAIL_GREETING_ROOT || '/opt/ivr_audio';

  constructor(
    private readonly prisma: PrismaService,
    private readonly sync: FreeSwitchSyncService,
    private readonly audioStorage: AudioUploadService,
  ) { }

  async onModuleInit() {
    try {
      const incomingRoot = join(this.storageRoot, 'incoming');
      await fs.mkdir(incomingRoot, { recursive: true, mode: 0o2770 });
      await this.setPermissions(this.storageRoot, 0o2770).catch(() => { });
      await this.setPermissions(incomingRoot, 0o2770).catch(() => { });
    } catch { }
  }

  private async setPermissions(targetPath: string, mode: number) {
    const stat = await fs.lstat(targetPath);
    if (stat.isSymbolicLink()) throw new BadRequestException('Symbolic links are not allowed');
    const gidStr = process.env.VOICEMAIL_SHARED_GID;
    if (gidStr) {
      const gid = Number(gidStr);
      if (!Number.isInteger(gid) || gid < 0) {
        throw new ServiceUnavailableException('Invalid VOICEMAIL_SHARED_GID');
      }
      try {
        await fs.chown(targetPath, -1, gid);
      } catch (err) {
        throw new ServiceUnavailableException('Failed to set voicemail shared group permissions');
      }
      await fs.chmod(targetPath, mode);
    } else {
      const fallbackMode = (mode & 0o777) === 0o640 ? 0o666 : 0o777;
      await fs.chmod(targetPath, fallbackMode).catch(() => { });
    }
  }

  async capabilities(tenantId: string) {
    const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId }, include: { tenantFeatures: true } });
    if (!tenant) throw new NotFoundException('Tenant not found');
    const enabled = tenant.status === TenantStatus.ACTIVE && !tenant.serviceBlocked && !!tenant.tenantFeatures?.voicemailEnabled;
    const [boxCount, bytes] = await Promise.all([
      this.prisma.voicemailBox.count({ where: { tenantId, retiredAt: null } }),
      this.prisma.voicemailMessage.aggregate({ where: { tenantId, deletedAt: null, status: 'READY' }, _sum: { audioBytes: true } }),
    ]);
    return {
      enabled,
      boxLimit: tenant.tenantFeatures?.voicemailBoxLimit ?? 0,
      messageLimit: 20,
      boxCount,
      storageLimitBytes: (tenant.tenantFeatures?.voicemailStorageLimitMb ?? 0) * 1024 * 1024,
      storageUsedBytes: Number(bytes._sum.audioBytes ?? 0),
    };
  }

  async assertEnabled(tenantId: string) {
    if (!(await this.capabilities(tenantId)).enabled) throw new ForbiddenException('Voicemail is unavailable for this tenant');
  }

  private validateInput(input: BoxInput) {
    if (!input || typeof input !== 'object') throw new BadRequestException('Mailbox settings are required');
    if (input.name !== undefined && (typeof input.name !== 'string' || !input.name.trim() || input.name.length > 100))
      throw new BadRequestException('Mailbox name must be 1–100 characters');
    if (input.extensionId !== undefined && input.extensionId !== null && input.extensionId !== '' && (typeof input.extensionId !== 'string' || !/^[A-Za-z0-9_-]{1,64}$/.test(input.extensionId)))
      throw new BadRequestException('Invalid extension ID');
    if (input.enabled !== undefined && typeof input.enabled !== 'boolean') throw new BadRequestException('enabled must be a boolean');
    if (input.notifyByEmail !== undefined && typeof input.notifyByEmail !== 'boolean') throw new BadRequestException('notifyByEmail must be a boolean');
    if (input.noAnswerSeconds !== undefined && (!Number.isInteger(input.noAnswerSeconds) || input.noAnswerSeconds < 10 || input.noAnswerSeconds > 120))
      throw new BadRequestException('No-answer timeout must be 10–120 seconds');
    if (input.notifyEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.notifyEmail))
      throw new BadRequestException('Invalid notification email');
    if (input.notifyByEmail && !input.notifyEmail) throw new BadRequestException('Notification email is required');
  }

  async listBoxes(tenantId: string) {
    await this.assertEnabled(tenantId);
    await this.ensureDefaultBoxes(tenantId);
    return this.prisma.voicemailBox.findMany({ where: { tenantId, retiredAt: null }, include: { extension: { select: { extensionNumber: true, name: true } }, _count: { select: { messages: true } } }, orderBy: { sequenceId: 'asc' } });
  }

  /** Provision one company mailbox and one mailbox for every extension, without replacing existing boxes. */
  async ensureDefaultBoxes(tenantId: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      include: { tenantFeatures: true, extensions: { select: { id: true, extensionNumber: true } } },
    });
    if (!tenant?.tenantFeatures?.voicemailEnabled || tenant.status !== TenantStatus.ACTIVE || tenant.serviceBlocked) return;
    const boxes = await this.prisma.voicemailBox.findMany({ where: { tenantId, retiredAt: null }, select: { extensionId: true } });
    const existing = new Set(boxes.map(box => box.extensionId ?? '__company__'));
    const missing = [
      ...(!existing.has('__company__') ? [{ name: 'Company voicemail', extensionId: null, enabled: true }] : []),
      ...tenant.extensions.filter(ext => !existing.has(ext.id)).map(ext => ({ name: `Extension ${ext.extensionNumber}`, extensionId: ext.id, enabled: false })),
    ];
    for (const mailbox of missing) {
      for (let attempt = 0; attempt < 3; attempt++) {
        const current = await this.prisma.voicemailBox.findFirst({ where: { tenantId, extensionId: mailbox.extensionId, retiredAt: null } });
        if (current) break;
        try {
          await this.createBox(tenantId, mailbox);
          break;
        } catch (error) {
          if (attempt === 2) throw error;
        }
      }
    }
  }

  async createBox(tenantId: string, input: BoxInput) {
    await this.assertEnabled(tenantId);
    this.validateInput(input);
    if (!input.name) throw new BadRequestException('Mailbox name is required');
    const boxId = randomUUID();
    const tenantIncomingDir = join(this.storageRoot, 'incoming', tenantId);
    const incomingDirectory = join(tenantIncomingDir, boxId);
    await fs.mkdir(incomingDirectory, { recursive: true, mode: 0o2770 });
    await this.setPermissions(tenantIncomingDir, 0o2770).catch(() => { });
    await this.setPermissions(incomingDirectory, 0o2770).catch(() => { });
    let box;
    try {
      box = await this.prisma.$transaction(async tx => {
        const features = await tx.tenantFeature.findUnique({ where: { tenantId } });
        if (!features?.voicemailEnabled) throw new ForbiddenException('Voicemail is disabled');
        const existing = await tx.voicemailBox.findFirst({ where: { tenantId, extensionId: input.extensionId || null, retiredAt: null } });
        if (existing) throw new ConflictException('Mailbox already exists for this extension or company');
        if (input.extensionId) {
          const ext = await tx.extension.findFirst({ where: { id: input.extensionId, tenantId } });
          if (!ext) throw new BadRequestException('Extension does not belong to this tenant');
        }
        const last = await tx.voicemailBox.findFirst({ where: { tenantId }, orderBy: { sequenceId: 'desc' } });
        return tx.voicemailBox.create({
          data: {
            id: boxId, tenantId, sequenceId: (last?.sequenceId ?? 0) + 1, name: input.name!.trim(),
            extensionId: input.extensionId || null, enabled: input.enabled ?? true, noAnswerSeconds: input.noAnswerSeconds ?? 20,
            notifyByEmail: input.notifyByEmail ?? false, notifyEmail: input.notifyEmail || null,
          }
        });
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    } catch (error) {
      await fs.rm(incomingDirectory, { recursive: true, force: true });
      throw error;
    }
    await this.sync.syncVoicemailBox(box.id);
    if (box.extensionId) await this.sync.syncExtension(box.extensionId);
    return box;
  }

  async updateBox(tenantId: string, id: string, input: BoxInput) {
    await this.assertEnabled(tenantId);
    this.validateInput(input);
    const existing = await this.getBox(tenantId, id);
    if (input.extensionId) {
      const ext = await this.prisma.extension.findFirst({ where: { id: input.extensionId, tenantId } });
      if (!ext) throw new BadRequestException('Extension does not belong to this tenant');
      const assigned = await this.prisma.voicemailBox.findFirst({ where: { extensionId: input.extensionId, id: { not: id } } });
      if (assigned) throw new ConflictException('Extension already has a voicemail box');
    }
    if (input.enabled === false && existing.enabled) await this.assertNoDirectRoutes(tenantId, id);
    const box = await this.prisma.voicemailBox.update({
      where: { id }, data: {
        name: input.name?.trim(), enabled: input.enabled, extensionId: input.extensionId === '' ? null : input.extensionId,
        noAnswerSeconds: input.noAnswerSeconds, notifyByEmail: input.notifyByEmail, notifyEmail: input.notifyEmail,
      }
    });
    await this.sync.syncVoicemailBox(id);
    if (existing.extensionId) await this.sync.syncExtension(existing.extensionId);
    if (box.extensionId && box.extensionId !== existing.extensionId) await this.sync.syncExtension(box.extensionId);
    return box;
  }

  private async getBox(tenantId: string, id: string) {
    const box = await this.prisma.voicemailBox.findFirst({ where: { id, tenantId } });
    if (!box) throw new NotFoundException('Mailbox not found');
    return box;
  }

  private async assertNoDirectRoutes(tenantId: string, id: string) {
    const [dids, tfns, schedules, ivrs] = await Promise.all([
      this.prisma.dID.count({ where: { tenantId, routeType: 'voicemail', routeTargetId: id } }),
      this.prisma.tFN.count({ where: { tenantId, routeType: 'voicemail', routeTargetId: id } }),
      this.prisma.operationalSchedule.findMany({ where: { tenantId } }),
      this.prisma.iVR.findMany({ where: { tenantId }, select: { menu: true, fallbackVoicemailBoxId: true } }),
    ]);
    if (dids || tfns || schedules.some(s => [s.primaryRouteTarget, s.afterHoursRouteTarget, s.weekendRouteTarget].includes(id)) ||
      ivrs.some(i => i.fallbackVoicemailBoxId === id || JSON.stringify(i.menu).includes(id)))
      throw new ConflictException('Reassign routes that use this mailbox first');
  }

  async deleteBox(tenantId: string, id: string) {
    await this.assertEnabled(tenantId);
    const box = await this.getBox(tenantId, id);
    await this.assertNoDirectRoutes(tenantId, id);
    const messages = await this.prisma.voicemailMessage.count({ where: { boxId: id, deletedAt: null } });
    if (messages) throw new ConflictException('Delete messages in this mailbox first');
    await this.prisma.voicemailBox.delete({ where: { id } });
    await this.sync.deleteVoicemailBox(box);
    if (box.extensionId) await this.sync.syncExtension(box.extensionId);
    await fs.rm(this.greetingPath(tenantId, id), { force: true });
    return { deleted: true };
  }

  async assertExtensionMailboxCanRetire(tenantId: string, extensionId: string) {
    const box = await this.prisma.voicemailBox.findFirst({ where: { tenantId, extensionId, retiredAt: null } });
    if (box) await this.assertNoDirectRoutes(tenantId, box.id);
    return box?.id;
  }

  async retireExtensionMailbox(tenantId: string, boxId?: string) {
    if (!boxId) return;
    const box = await this.prisma.voicemailBox.findFirst({ where: { tenantId, id: boxId, retiredAt: null } });
    if (!box) return;
    await this.prisma.voicemailBox.update({
      where: { id: box.id },
      data: { enabled: false, retiredAt: new Date(), extensionId: null, name: `Former ${box.name}`.slice(0, 100) },
    });
    await this.sync.syncVoicemailBox(box.id);
  }

  private greetingPath(tenantId: string, boxId: string) {
    return join(this.greetingRoot, tenantId, 'voicemail', boxId, 'greeting.wav');
  }

  private async convertAudio(input: string, output: string) {
    await new Promise<void>((resolve, reject) => {
      const child = spawn(process.env.FFMPEG_BINARY || 'ffmpeg', ['-hide_banner', '-loglevel', 'error', '-nostdin', '-y', '-i', input, '-vn', '-ac', '1', '-ar', '16000', '-c:a', 'pcm_s16le', '-t', '60', output], { stdio: 'ignore' });
      const timer = setTimeout(() => child.kill('SIGKILL'), 30000);
      child.once('error', error => { clearTimeout(timer); reject(error); });
      child.once('close', code => { clearTimeout(timer); code === 0 ? resolve() : reject(new Error('Audio conversion failed')); });
    });
  }

  async selectLibraryGreeting(tenantId: string, id: string, audioFileId: string) {
    await this.assertEnabled(tenantId);
    await this.getBox(tenantId, id);
    if (!audioFileId) throw new BadRequestException('Audio file ID is required');
    const audio = await this.prisma.audioFile.findFirst({ where: { id: audioFileId, tenantId } });
    if (!audio) throw new NotFoundException('Audio file not found in library');
    const buffer = await this.audioStorage.readAudio(audio.storageUrl);
    return this.saveGreeting(tenantId, id, buffer, 50 * 1024 * 1024);
  }

  private async saveGreeting(tenantId: string, id: string, buffer: Buffer, maxBytes = 10 * 1024 * 1024) {
    if (!buffer?.length || buffer.length > maxBytes) throw new BadRequestException('Greeting exceeds size limit');
    const path = this.greetingPath(tenantId, id);
    const greetingDir = join(this.greetingRoot, tenantId, 'voicemail', id);
    await fs.mkdir(greetingDir, { recursive: true, mode: 0o2750 });
    await this.setPermissions(greetingDir, 0o2750).catch(() => { });
    const source = `${path}.${randomUUID()}.upload`;
    const converted = `${path}.${randomUUID()}.wav`;
    try {
      await fs.writeFile(source, buffer, { mode: 0o600 });
      await this.convertAudio(source, converted);
      await this.setPermissions(converted, 0o640);
      await fs.rename(converted, path);
      await this.prisma.voicemailBox.update({ where: { id }, data: { greetingPath: path } });
      await this.sync.syncVoicemailBox(id);
      return { uploaded: true };
    } catch (error) {
      if ((error as any)?.status === 503) throw error;
      throw new BadRequestException('Greeting could not be converted to WAV');
    } finally {
      await Promise.all([fs.rm(source, { force: true }), fs.rm(converted, { force: true })]);
    }
  }

  async uploadGreeting(tenantId: string, id: string, file: Express.Multer.File) {
    await this.assertEnabled(tenantId);
    await this.getBox(tenantId, id);
    if (!file?.buffer?.length || file.size > 10 * 1024 * 1024) throw new BadRequestException('Greeting must be 1–10 MB');
    return this.saveGreeting(tenantId, id, file.buffer, 10 * 1024 * 1024);
  }

  async removeGreeting(tenantId: string, id: string) {
    await this.assertEnabled(tenantId);
    await this.getBox(tenantId, id);
    await this.prisma.voicemailBox.update({ where: { id }, data: { greetingPath: null } });
    await this.sync.syncVoicemailBox(id);
    await fs.rm(this.greetingPath(tenantId, id), { force: true });
    return { defaultGreeting: true };
  }

  async streamGreeting(tenantId: string, id: string, res: any) {
    await this.assertEnabled(tenantId);
    const box = await this.getBox(tenantId, id);
    if (!box.greetingPath) throw new NotFoundException('Custom greeting not found');
    const path = this.greetingPath(tenantId, id);
    let stat;
    try { stat = await fs.stat(path); } catch { throw new NotFoundException('Custom greeting file not found'); }
    res.setHeader('Content-Type', 'audio/wav');
    res.setHeader('Content-Length', stat.size);
    res.setHeader('Cache-Control', 'private, no-store');
    createReadStream(path).pipe(res);
  }

  async listMessages(tenantId: string, boxId?: string, page = 1) {
    await this.assertEnabled(tenantId);
    if (boxId) await this.getBox(tenantId, boxId);
    const where = { tenantId, deletedAt: null, status: 'READY' as const, ...(boxId ? { boxId } : {}) };
    const [items, total] = await Promise.all([
      this.prisma.voicemailMessage.findMany({ where, orderBy: { createdAt: 'desc' }, skip: (page - 1) * 25, take: 25, include: { box: { select: { name: true } } } }),
      this.prisma.voicemailMessage.count({ where }),
    ]);
    return { items: items.map(({ audioKey, audioBytes, ...m }) => ({ ...m, audioBytes: Number(audioBytes) })), total, page };
  }

  private async getMessage(tenantId: string, id: string) {
    const message = await this.prisma.voicemailMessage.findFirst({ where: { id, tenantId, deletedAt: null, status: 'READY' } });
    if (!message) throw new NotFoundException('Voicemail message not found');
    return message;
  }

  private messagePath(tenantId: string, boxId: string, id: string) {
    return join(this.storageRoot, tenantId, boxId, `${id}.wav`);
  }

  async streamMessage(tenantId: string, id: string, res: any, download: boolean, range?: string) {
    await this.assertEnabled(tenantId);
    const message = await this.getMessage(tenantId, id);
    const path = this.messagePath(tenantId, message.boxId, message.id);
    let stat;
    try { stat = await fs.stat(path); } catch { throw new NotFoundException('Voicemail audio not found'); }
    let start = 0;
    let end = stat.size - 1;
    if (range) {
      const match = /^bytes=(\d*)-(\d*)$/.exec(range);
      if (!match) throw new BadRequestException('Invalid audio range');
      start = match[1] ? Number(match[1]) : 0;
      end = match[2] ? Number(match[2]) : end;
      if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start > end || end >= stat.size) throw new BadRequestException('Invalid audio range');
      res.status(206).setHeader('Content-Range', `bytes ${start}-${end}/${stat.size}`);
    }
    res.setHeader('Content-Type', 'audio/wav');
    res.setHeader('Accept-Ranges', 'bytes');
    res.setHeader('Content-Length', end - start + 1);
    res.setHeader('Cache-Control', 'private, no-store');
    res.setHeader('Content-Disposition', `${download ? 'attachment' : 'inline'}; filename="voicemail-${id}.wav"`);
    createReadStream(path, { start, end }).pipe(res);
  }

  async markRead(tenantId: string, id: string, read: boolean) {
    await this.assertEnabled(tenantId);
    await this.getMessage(tenantId, id);
    return this.prisma.voicemailMessage.update({ where: { id }, data: { readAt: read ? new Date() : null }, select: { id: true, readAt: true } });
  }

  async deleteMessage(tenantId: string, id: string) {
    await this.assertEnabled(tenantId);
    const message = await this.getMessage(tenantId, id);
    await fs.rm(this.messagePath(tenantId, message.boxId, message.id), { force: true });
    await this.prisma.voicemailMessage.update({ where: { id }, data: { deletedAt: new Date(), audioKey: null } });
    return { deleted: true };
  }
}
