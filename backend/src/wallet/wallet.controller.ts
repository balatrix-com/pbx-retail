import { Controller, Get, Post, Body, UseGuards, Query, ForbiddenException, BadRequestException } from '@nestjs/common';
import { WalletService } from './wallet.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { Role, TransactionType } from '@prisma/client';
import type { User } from '@prisma/client';

class TopUpDto {
    amount: number;
}
class AutoRechargeDto {
    enabled: boolean;
    threshold: number;
    amount: number;
}

@Controller('wallet')
@UseGuards(JwtAuthGuard, RolesGuard)
export class WalletController {
    constructor(private readonly walletService: WalletService) { }

    @Get()
    getBalance(@GetUser() user: User) {
        if (!user.tenantId) {
            return {
                balance: 0,
                currency: 'USD',
                autoRecharge: { enabled: false, threshold: 0, amount: 0 }
            };
        }
        return this.walletService.getBalance(user.tenantId);
    }

    @Get('transactions')
    getTransactions(@GetUser() user: User) {
        if (!user.tenantId) return [];
        return this.walletService.getTransactions(user.tenantId);
    }

    @Get('subscription')
    getSubscription(
        @GetUser() user: User,
        @Query('tenantId') queryTenantId?: string
    ) {
        const tenantId = (user.role === Role.SUPER_ADMIN && queryTenantId) ? queryTenantId : user.tenantId;
        if (!tenantId) return null;
        return this.walletService.getSubscription(tenantId);
    }

    @Post('subscription')
    switchSubscription(
        @GetUser() user: User,
        @Body('targetTenantId') targetTenantId: string,
        @Body('planId') planId: string,
        @Body('immediate') immediate: boolean
    ) {
        const tenantId = targetTenantId || user.tenantId;
        if (!tenantId) throw new BadRequestException('Tenant ID is required');
        if (!planId) throw new BadRequestException('Plan ID is required');
        return this.walletService.switchSubscriptionPlan(tenantId, planId, immediate ?? true);
    }

    @Get('cards')
    getCards(@GetUser() user: User) {
        if (!user.tenantId) return [];
        return this.walletService.getCards(user.tenantId);
    }

    @Post('topup')
    topUp(@GetUser() user: User, @Body() body: TopUpDto) {
        if (!user.tenantId) throw new ForbiddenException('No tenant associated with this account');
        return this.walletService.topUpWallet(user.tenantId, body.amount);
    }

    @Post('auto-recharge')
    autoRecharge(@GetUser() user: User, @Body() body: AutoRechargeDto) {
        if (!user.tenantId) throw new ForbiddenException('No tenant associated with this account');
        return this.walletService.updateAutoRechargeSettings(user.tenantId, body.enabled, body.threshold, body.amount);
    }

    @Get('payment-details')
    getPaymentDetails(@GetUser() user: User) {
        if (user.role === Role.SUPER_ADMIN) {
            return this.walletService.getAllPaymentDetails();
        }
        if (!user.tenantId) {
            return [];
        }
        return this.walletService.getPaymentDetails(user.tenantId);
    }

    @Get('all-balances')
    @Roles(Role.SUPER_ADMIN)
    getAllBalances() {
        return this.walletService.getAllBalances();
    }

    @Get('assets')
    getAssets(@GetUser() user: User, @Query('tenantId') queryTenantId?: string) {
        const tenantId = (user.role === Role.SUPER_ADMIN && queryTenantId) ? queryTenantId : user.tenantId;
        if (!tenantId) return { tfns: [], dids: [], extensions: [], totals: { tfns: 0, dids: 0, extensions: 0 } };
        return this.walletService.getAssets(tenantId);
    }

    // Admin Internal Adjustment
    @Post('internal-adjust')
    @Roles(Role.SUPER_ADMIN)
    async internalAdjust(
        @GetUser() user: User,
        @Body('targetTenantId') targetTenantId: string,
        @Body('amount') amount: number,
        @Body('type') type: TransactionType,
        @Body('description') description: string
    ) {
        if (user.role !== Role.SUPER_ADMIN) {
            throw new ForbiddenException('Only Platform Owner can perform internal adjustments');
        }

        // If user is ADMIN of their own tenant, they can maybe add funds? 
        // Requirement says "internal-adjust (admin only)". Let's stick to standard RBAC.

        const tenantId = targetTenantId || user.tenantId!; // Default to self if not provided
        return this.walletService.adjustBalance(tenantId, amount, type, description, `MANUAL-ADJ-BY-${user.email}`);
    }

    @Post('credit-limit')
    @Roles(Role.SUPER_ADMIN)
    async updateCreditLimit(
        @GetUser() user: User,
        @Body('targetTenantId') targetTenantId: string,
        @Body('creditLimit') creditLimit: number
    ) {
        if (user.role !== Role.SUPER_ADMIN) {
            throw new ForbiddenException('Only Platform Owner can edit credit limit');
        }
        if (!targetTenantId) {
            throw new BadRequestException('Target tenant ID is required');
        }
        return this.walletService.updateCreditLimit(targetTenantId, creditLimit);
    }
}
