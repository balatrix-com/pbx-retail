import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { KamailioDBService } from '../freeswitch/kamailio-db.service';
import { CacheFlushService } from '../freeswitch/cache-flush.service';
import { CreateInboundWhitelistDto, UpdateInboundWhitelistDto } from './dto/inbound-whitelist.dto';

@Injectable()
export class InboundWhitelistService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly kamailioDb: KamailioDBService,
    private readonly cacheFlush: CacheFlushService,
  ) {}

  private requireTenant(tenantId?: string): string {
    if (!tenantId) throw new ForbiddenException('Tenant account is required');
    return tenantId;
  }

  private async tenant(tenantId?: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: this.requireTenant(tenantId) },
      select: { id: true, customerCode: true },
    });
    if (!tenant?.customerCode) throw new ForbiddenException('Tenant customer code is required');
    return { ...tenant, customerCode: tenant.customerCode };
  }

  findAll(tenantId?: string) {
    return this.prisma.inboundWhitelist.findMany({
      where: { tenantId: this.requireTenant(tenantId) },
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(tenantId: string | undefined, data: CreateInboundWhitelistDto) {
    const tenant = await this.tenant(tenantId);
    const entry = await this.prisma.inboundWhitelist.create({
      data: {
        tenantId: tenant.id,
        ipAddress: data.ipAddress,
        port: data.port ?? 5060,
        tag: data.tag.trim(),
      },
    });
    await this.kamailioDb.addInboundIP(
      entry.ipAddress, entry.port, `${tenant.customerCode}:${entry.tag}`,
    );
    await this.cacheFlush.flushDIDForCustomer(tenant.customerCode);
    return entry;
  }

  async update(tenantId: string | undefined, id: number, data: UpdateInboundWhitelistDto) {
    const tenant = await this.tenant(tenantId);
    const oldEntry = await this.prisma.inboundWhitelist.findFirst({
      where: { id, tenantId: tenant.id },
    });
    if (!oldEntry) throw new NotFoundException('Inbound whitelist entry not found');

    const updated = await this.prisma.inboundWhitelist.update({
      where: { id },
      data: { ...data, ...(data.tag !== undefined ? { tag: data.tag.trim() } : {}) },
    });
    const keyChanged = updated.ipAddress !== oldEntry.ipAddress || updated.port !== oldEntry.port;
    if (keyChanged) await this.syncSharedAddress(oldEntry.ipAddress, oldEntry.port);
    await this.kamailioDb.addInboundIP(
      updated.ipAddress, updated.port, `${tenant.customerCode}:${updated.tag}`,
    );
    await this.cacheFlush.flushDIDForCustomer(tenant.customerCode);
    return updated;
  }

  async remove(tenantId: string | undefined, id: number) {
    const tenant = await this.tenant(tenantId);
    const entry = await this.prisma.inboundWhitelist.findFirst({ where: { id, tenantId: tenant.id } });
    if (!entry) throw new NotFoundException('Inbound whitelist entry not found');
    const deleted = await this.prisma.inboundWhitelist.delete({ where: { id } });
    await this.syncSharedAddress(entry.ipAddress, entry.port);
    await this.cacheFlush.flushDIDForCustomer(tenant.customerCode);
    return deleted;
  }

  private async syncSharedAddress(ipAddress: string, port: number) {
    const replacement = await this.prisma.inboundWhitelist.findFirst({
      where: { ipAddress, port },
      include: { tenant: { select: { customerCode: true } } },
      orderBy: { id: 'asc' },
    });
    if (!replacement) {
      await this.kamailioDb.removeInboundIP(ipAddress, port);
      return;
    }
    await this.kamailioDb.addInboundIP(
      ipAddress, port, `${replacement.tenant.customerCode}:${replacement.tag}`,
    );
  }
}
