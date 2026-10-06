import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { FreeSwitchSyncService } from '../freeswitch/freeswitch-sync.service';

@Injectable()
export class CarriersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly freeSwitchSync: FreeSwitchSyncService,
  ) {}

  async getCarriers() {
    return this.prisma.outboundCarrier.findMany({
      include: {
        endpoints: true,
      },
    });
  }

  async createCarrier(data: { name: string }) {
    return this.prisma.outboundCarrier.create({
      data,
    });
  }

  async updateCarrier(id: number, data: { name: string }) {
    return this.prisma.outboundCarrier.update({
      where: { id },
      data,
    });
  }

  async deleteCarrier(id: number) {
    return this.prisma.outboundCarrier.delete({
      where: { id },
    });
  }

  async createEndpoint(carrierId: number, data: any) {
    if (data.isSystemDefault) {
      const created = await this.prisma.$transaction(async (tx) => {
        await tx.outboundEndpoint.updateMany({
          data: { isSystemDefault: false },
        });
        return tx.outboundEndpoint.create({
          data: {
            ...data,
            carrierId,
          },
        });
      });

      await this.freeSwitchSync.syncAllSystemDefaultForwards();
      return created;
    }

    return this.prisma.outboundEndpoint.create({
      data: {
        ...data,
        carrierId,
      },
    });
  }

  async updateEndpoint(id: number, data: any) {
    const oldEndpoint = await this.prisma.outboundEndpoint.findUnique({ where: { id } });
    if (!oldEndpoint) throw new NotFoundException('Endpoint not found');

    const isNowDefault = data.isSystemDefault === true;
    const wasDefault = oldEndpoint.isSystemDefault === true;
    const hostOrPortChanged = (data.sipHost !== undefined && data.sipHost !== oldEndpoint.sipHost) || 
                              (data.sipPort !== undefined && data.sipPort !== oldEndpoint.sipPort);

    let updated;
    if (isNowDefault && !wasDefault) {
      updated = await this.prisma.$transaction(async (tx) => {
        await tx.outboundEndpoint.updateMany({
          data: { isSystemDefault: false },
        });
        return tx.outboundEndpoint.update({
          where: { id },
          data,
        });
      });
    } else {
      updated = await this.prisma.outboundEndpoint.update({
        where: { id },
        data,
      });
    }

    // Resync tenants directly assigned to this endpoint when host/port changes
    if (hostOrPortChanged) {
      const assignedTenants = await this.prisma.tenant.findMany({
        where: { outboundEndpointId: id },
        select: { id: true },
      });
      for (const t of assignedTenants) {
        await this.freeSwitchSync.syncTenantForwards(t.id);
      }
    }

    // Resync system-default-reliant tenants when default status or host/port changes
    if (isNowDefault || (wasDefault && hostOrPortChanged) || (wasDefault && !isNowDefault)) {
      await this.freeSwitchSync.syncAllSystemDefaultForwards();
    }

    return updated;
  }

  async deleteEndpoint(id: number) {
    const endpoint = await this.prisma.outboundEndpoint.findUnique({ where: { id } });
    if (!endpoint) throw new NotFoundException('Endpoint not found');

    const wasDefault = endpoint.isSystemDefault === true;
    const deleted = await this.prisma.outboundEndpoint.delete({
      where: { id },
    });

    if (wasDefault) {
      await this.freeSwitchSync.syncAllSystemDefaultForwards();
    }

    return deleted;
  }
}
