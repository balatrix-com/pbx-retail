import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InboundNormalization } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { FreeSwitchSyncService } from '../freeswitch/freeswitch-sync.service';
import { CacheFlushService } from '../freeswitch/cache-flush.service';
import { CreateCarrierDto, EndpointDto, UpdateCarrierDto, UpdateEndpointDto } from './dto/carrier.dto';

@Injectable()
export class CarriersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly freeSwitchSync: FreeSwitchSyncService,
    private readonly cacheFlush: CacheFlushService,
  ) {}

  private requireTenant(tenantId?: string): string {
    if (!tenantId) throw new ForbiddenException('Tenant account is required');
    return tenantId;
  }

  private async tenantContext(tenantId?: string) {
    const id = this.requireTenant(tenantId);
    const tenant = await this.prisma.tenant.findUnique({
      where: { id }, select: { id: true, customerCode: true },
    });
    if (!tenant) throw new ForbiddenException('Tenant account was not found');
    return tenant;
  }

  private async flush(tenantId?: string) {
    const tenant = await this.tenantContext(tenantId);
    if (tenant.customerCode) await this.cacheFlush.flushCarrier(tenant.customerCode);
    await this.freeSwitchSync.syncTenantForwards(tenant.id);
  }

  getCarriers(tenantId?: string) {
    return this.prisma.outboundCarrier.findMany({
      where: { tenantId: this.requireTenant(tenantId) },
      include: { endpoints: { orderBy: [{ priority: 'asc' }, { id: 'asc' }] } },
      orderBy: { name: 'asc' },
    });
  }

  createCarrier(tenantId: string | undefined, data: CreateCarrierDto) {
    return this.prisma.outboundCarrier.create({
      data: { name: data.name.trim(), tenantId: this.requireTenant(tenantId) },
    });
  }

  async updateCarrier(tenantId: string | undefined, id: number, data: UpdateCarrierDto) {
    const result = await this.prisma.outboundCarrier.updateMany({
      where: { id, tenantId: this.requireTenant(tenantId) }, data: { name: data.name.trim() },
    });
    if (!result.count) throw new NotFoundException('Carrier not found');
    return this.prisma.outboundCarrier.findUnique({ where: { id }, include: { endpoints: true } });
  }

  async deleteCarrier(tenantId: string | undefined, id: number) {
    const owned = await this.prisma.outboundCarrier.findFirst({
      where: { id, tenantId: this.requireTenant(tenantId) }, select: { id: true },
    });
    if (!owned) throw new NotFoundException('Carrier not found');
    const deleted = await this.prisma.outboundCarrier.delete({ where: { id } });
    await this.flush(tenantId);
    return deleted;
  }

  async createEndpoint(tenantId: string | undefined, carrierId: number, data: EndpointDto) {
    const tenant = await this.tenantContext(tenantId);
    const carrier = await this.prisma.outboundCarrier.findFirst({
      where: { id: carrierId, tenantId: tenant.id }, select: { id: true },
    });
    if (!carrier) throw new NotFoundException('Carrier not found');
    const created = await this.prisma.outboundEndpoint.create({
      data: {
        ...data,
        name: data.name.trim(), sipHost: data.sipHost.trim().toLowerCase(),
        isSystemDefault: false, carrierId, tenantId: tenant.id,
      },
    });
    await this.flush(tenant.id);
    return created;
  }

  async updateEndpoint(
    tenantId: string | undefined, carrierId: number, id: number, data: UpdateEndpointDto,
  ) {
    const tenant = this.requireTenant(tenantId);
    const existing = await this.prisma.outboundEndpoint.findFirst({
      where: { id, carrierId, tenantId: tenant },
    });
    if (!existing) throw new NotFoundException('Endpoint not found');
    const updated = await this.prisma.outboundEndpoint.update({
      where: { id },
      data: {
        ...(data.name !== undefined ? { name: data.name.trim() } : {}),
        ...(data.sipHost !== undefined ? { sipHost: data.sipHost.trim().toLowerCase() } : {}),
        ...(data.sipPort !== undefined ? { sipPort: data.sipPort } : {}),
        ...(data.transport !== undefined ? { transport: data.transport } : {}),
        ...(data.prefix !== undefined ? { prefix: data.prefix } : {}),
        ...(data.stripPlus !== undefined ? { stripPlus: data.stripPlus } : {}),
        ...(data.callerIdMode !== undefined ? { callerIdMode: data.callerIdMode } : {}),
        ...(data.callerIdNumber !== undefined ? { callerIdNumber: data.callerIdNumber } : {}),
        ...(data.isActive !== undefined ? { isActive: data.isActive } : {}),
        ...(data.priority !== undefined ? { priority: data.priority } : {}),
        isSystemDefault: false,
      },
    });
    await this.flush(tenant);
    return updated;
  }

  async deleteEndpoint(tenantId: string | undefined, carrierId: number, id: number) {
    const tenant = this.requireTenant(tenantId);
    const existing = await this.prisma.outboundEndpoint.findFirst({
      where: { id, carrierId, tenantId: tenant }, select: { id: true },
    });
    if (!existing) throw new NotFoundException('Endpoint not found');
    const deleted = await this.prisma.outboundEndpoint.delete({ where: { id } });
    await this.flush(tenant);
    return deleted;
  }

  async getInboundNormalization(tenantId?: string) {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: this.requireTenant(tenantId) }, select: { inboundNormalization: true },
    });
    if (!tenant) throw new NotFoundException('Tenant not found');
    return tenant;
  }

  async updateInboundNormalization(tenantId: string | undefined, rule: InboundNormalization) {
    if (!Object.values(InboundNormalization).includes(rule)) {
      throw new BadRequestException('Invalid inbound normalization rule');
    }
    const tenant = await this.prisma.tenant.update({
      where: { id: this.requireTenant(tenantId) },
      data: { inboundNormalization: rule },
      select: { customerCode: true, inboundNormalization: true },
    });
    if (tenant.customerCode) await this.cacheFlush.flushDIDForCustomer(tenant.customerCode);
    return { inboundNormalization: tenant.inboundNormalization };
  }
}
