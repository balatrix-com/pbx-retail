import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { KamailioDBService } from '../freeswitch/kamailio-db.service';

@Injectable()
export class InboundWhitelistService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly kamailioDb: KamailioDBService,
  ) {}

  async findAll() {
    return this.prisma.inboundWhitelist.findMany({
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async create(data: { ipAddress: string; port?: number; tag: string }) {
    const port = data.port !== undefined ? data.port : 5060;
    
    // Create in local database first
    const entry = await this.prisma.inboundWhitelist.create({
      data: {
        ipAddress: data.ipAddress,
        port,
        tag: data.tag,
      },
    });

    // Sync to Kamailio DB
    await this.kamailioDb.addInboundIP(entry.ipAddress, entry.port, entry.tag);

    return entry;
  }

  async update(id: number, data: { ipAddress?: string; port?: number; tag?: string }) {
    const oldEntry = await this.prisma.inboundWhitelist.findUnique({
      where: { id },
    });
    if (!oldEntry) {
      throw new NotFoundException('Inbound whitelist entry not found');
    }

    const updated = await this.prisma.inboundWhitelist.update({
      where: { id },
      data,
    });

    const ipChanged = data.ipAddress && data.ipAddress !== oldEntry.ipAddress;
    const portChanged = data.port !== undefined && data.port !== oldEntry.port;

    // If IP or Port changed, we must delete the old one from Kamailio DB first
    if (ipChanged || portChanged) {
      await this.kamailioDb.removeInboundIP(oldEntry.ipAddress, oldEntry.port);
    }

    // Sync/update to Kamailio DB
    await this.kamailioDb.addInboundIP(updated.ipAddress, updated.port, updated.tag);

    return updated;
  }

  async remove(id: number) {
    const entry = await this.prisma.inboundWhitelist.findUnique({
      where: { id },
    });
    if (!entry) {
      throw new NotFoundException('Inbound whitelist entry not found');
    }

    // Remove from Kamailio DB
    await this.kamailioDb.removeInboundIP(entry.ipAddress, entry.port);

    // Delete from local database
    return this.prisma.inboundWhitelist.delete({
      where: { id },
    });
  }
}
