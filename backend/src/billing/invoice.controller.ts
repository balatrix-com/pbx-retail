
import { Controller, Get, Post, Body, Param, UseGuards, Request } from '@nestjs/common';
import { InvoiceService } from './invoice.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';

@Controller('billing/invoices')
@UseGuards(JwtAuthGuard, RolesGuard)
export class InvoiceController {
    constructor(private readonly invoiceService: InvoiceService) { }



    @Get()
    @Roles(Role.ADMIN, Role.SUPER_ADMIN, Role.SUPPORT)
    findAll(@Request() req: any) {
        return this.invoiceService.getInvoices(req.user.tenantId);
    }

    @Get(':id')
    @Roles(Role.SUPER_ADMIN, Role.ADMIN)
    findOne(@Param('id') id: string) {
        return this.invoiceService.getInvoice(id);
    }

    @Post(':id/adjustments')
    @Roles(Role.SUPER_ADMIN)
    addAdjustment(@Param('id') id: string, @Body() body: { reason: string, amount: number, authorizedBy: string }) {
        return this.invoiceService.addAdjustment(id, body);
    }

    @Post(':id/finalize')
    @Roles(Role.SUPER_ADMIN)
    finalize(@Param('id') id: string) {
        return this.invoiceService.finalizeInvoice(id);
    }
}
