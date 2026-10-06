
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { BillingService } from './billing.service'; // Assuming integration later
import { InvoiceStatus, Prisma } from '@prisma/client';

@Injectable()
export class InvoiceService {
    constructor(
        private prisma: PrismaService,
        private billingService: BillingService
    ) { }



    async addAdjustment(invoiceId: string, adjustmentCtx: { reason: string, amount: number, authorizedBy: string }) {
        const invoice = await this.prisma.invoice.findUnique({ where: { id: invoiceId } });
        if (!invoice) throw new NotFoundException('Invoice not found');
        if (invoice.status !== InvoiceStatus.DRAFT) {
            throw new BadRequestException('Cannot adjust a finalized invoice');
        }

        return this.prisma.$transaction(async (tx) => {
            // Create Adjustment
            await tx.invoiceAdjustment.create({
                data: {
                    invoiceId,
                    reason: adjustmentCtx.reason,
                    amount: adjustmentCtx.amount,
                    authorizedBy: adjustmentCtx.authorizedBy
                }
            });

            // Update Invoice Balance
            const newBalance = Number(invoice.balanceDue) + adjustmentCtx.amount;

            const updated = await tx.invoice.update({
                where: { id: invoiceId },
                data: {
                    balanceDue: newBalance,
                    total: Number(invoice.total) + adjustmentCtx.amount // Adjust total too? Or just balance?
                    // Typically adjustments affect the Amount Due. 
                    // If it's a "Credit", amount is negative. Total might stay same (original price), but Balance drops.
                    // Or Total might change.
                    // Let's update BalanceDue. 
                    // If we want to track "Original Total" vs "Adjusted Total", we need more fields.
                    // For now, update BalanceDue.
                }
            });
            return updated;
        });
    }

    async finalizeInvoice(invoiceId: string) {
        const invoice = await this.prisma.invoice.findUnique({ where: { id: invoiceId } });
        if (!invoice) throw new NotFoundException('Invoice not found');
        if (invoice.status !== InvoiceStatus.DRAFT) throw new BadRequestException('Invoice is not in DRAFT status');

        // Lock it
        // Generate Stripe PaymentIntent if needed?
        // For MVP, we'll just mark it PENDING. 
        // Real stripe integration: 
        // await this.billingService.createPaymentIntent(...)

        let stripeId = null;
        if (this.billingService.isStripeConfigured()) {
            // Create a PaymentIntent for the balance due
            // We need a customer ID. 
            // If quote has one or tenant has one.
            // ... Logic to get Customer ID ...
        }

        const updated = await this.prisma.invoice.update({
            where: { id: invoiceId },
            data: {
                status: InvoiceStatus.PENDING,
                stripeId // Store PI ID
            }
        });

        return updated;
    }

    async getInvoice(id: string) {
        return this.prisma.invoice.findUnique({
            where: { id },
            include: { adjustments: true }
        });
    }

    async getInvoices(tenantId: string) {
        return this.prisma.invoice.findMany({
            where: { tenantId },
            orderBy: { createdAt: 'desc' },
            include: { adjustments: true }
        });
    }
}
