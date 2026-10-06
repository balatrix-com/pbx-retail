import { Controller, Post, Get, Body, Headers, Req, UseGuards, BadRequestException } from '@nestjs/common';
import { BillingService } from './billing.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GetUser } from '../auth/decorators/get-user.decorator';
import type { User } from '@prisma/client';
import type { Request } from 'express';

@Controller('billing')
export class BillingController {
    constructor(private readonly billingService: BillingService) { }

    @Post('create-checkout')
    @UseGuards(JwtAuthGuard)
    createCheckout(@GetUser() user: User) {
        return this.billingService.createCheckoutSession(user.tenantId!);
    }

    @Post('webhook')
    async handleWebhook(@Headers('stripe-signature') signature: string, @Req() req: Request) {
        if (!signature) throw new BadRequestException('Missing signature');
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const rawBody = (req as any).rawBody || req.body;
        return this.billingService.handleWebhook(signature, rawBody);
    }

    @Get('payment-methods')
    @UseGuards(JwtAuthGuard)
    listPaymentMethods(@GetUser() user: User) {
        return this.billingService.listPaymentMethods(user.tenantId!);
    }

    @Post('set-default-card')
    @UseGuards(JwtAuthGuard)
    setDefaultCard(@GetUser() user: User, @Body('paymentMethodId') pmId: string) {
        return this.billingService.setDefaultPaymentMethod(user.tenantId!, pmId);
    }
}
