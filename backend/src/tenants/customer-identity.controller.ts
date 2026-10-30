import { Body, Controller, Get, Headers, Post, Param, BadRequestException, ConflictException, UseGuards } from '@nestjs/common';
import { InternalServiceGuard } from '../auth/guards/internal-service.guard';
import { PrismaService } from '../prisma/prisma.service';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';

@Controller('internal/customer-identities')
@UseGuards(InternalServiceGuard)
export class CustomerIdentityController {
    constructor(private prisma: PrismaService, private subscriptions: SubscriptionsService) {}

    @Post('reserve')
    async reserve(@Headers('x-subscription-token') token: string, @Body() input: { prefix?: string }) {
        this.subscriptions.authenticate(token);
        const prefix = input.prefix || 'U';
        if (!['U','C'].includes(prefix)) throw new BadRequestException('Invalid customer prefix');
        const rows = await this.prisma.$queryRawUnsafe<any[]>('SELECT reserve_customer_identity($1) AS customer_code', prefix);
        return { customer_code: rows[0].customer_code };
    }

    @Post(':code/claim')
    async claim(@Headers('x-subscription-token') token: string, @Param('code') code: string) {
        this.subscriptions.authenticate(token);
        const rows = await this.prisma.$queryRawUnsafe<any[]>('UPDATE customer_identity_registry SET claimed_at=now() WHERE customer_code=$1 AND claimed_at IS NULL RETURNING customer_code', code);
        if (!rows.length) throw new ConflictException('Customer identity is unknown or has already been used');
        return { customer_code: code };
    }
}
