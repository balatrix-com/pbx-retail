import { Controller, Get, Post, Delete, Body, Param, UseGuards, BadRequestException } from '@nestjs/common';
import { AddonsService } from './addons.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { GetUser } from '../auth/decorators/get-user.decorator';
import type { User } from '@prisma/client';
import { Audit } from '../audit/audit.decorator';

class AddonQuoteDto {
    tenantId?: string;
    addonId: string;
    quantity?: number;
}

class AddonPurchaseDto {
    tenantId?: string;
    addonId: string;
    quantity?: number;
}

@Controller('addons')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AddonsController {
    constructor(private readonly addonsService: AddonsService) {}

    @Get('catalog')
    getCatalog() {
        return this.addonsService.getCatalog();
    }

    @Post('catalog')
    @Roles(Role.ADMIN, Role.SUPER_ADMIN)
    @Audit('ADDON_CATALOG_CREATED', 'PLANS_ADDONS')
    createCatalogItem(@Body() body: any) {
        return this.addonsService.createCatalogItem(body);
    }

    @Delete('catalog/:addonId')
    @Roles(Role.ADMIN, Role.SUPER_ADMIN)
    @Audit('ADDON_CATALOG_DELETED', 'PLANS_ADDONS')
    deleteCatalogItem(@Param('addonId') addonId: string) {
        return this.addonsService.deleteCatalogItem(addonId);
    }

    @Get('subscription/:subscriptionId')
    getSubscriptionAddons(@Param('subscriptionId') subscriptionId: string) {
        return this.addonsService.getSubscriptionAddons(subscriptionId);
    }

    @Delete('subscription/:subscriptionAddonId')
    @Audit('ADDON_CANCELLED', 'PLANS_ADDONS')
    cancelSubscriptionAddon(@Param('subscriptionAddonId') subscriptionAddonId: string) {
        return this.addonsService.cancelSubscriptionAddon(subscriptionAddonId);
    }

    @Post('quote')
    getQuote(@GetUser() user: User, @Body() body: AddonQuoteDto) {
        const tenantId = body.tenantId || user.tenantId;
        if (!tenantId) {
            throw new BadRequestException('Tenant ID is required');
        }
        if (!body.addonId) {
            throw new BadRequestException('addonId is required');
        }
        return this.addonsService.getQuote(tenantId, body.addonId, body.quantity || 1);
    }

    @Post('purchase')
    @Audit('ADDON_PURCHASED', 'PLANS_ADDONS')
    purchaseAddon(@GetUser() user: User, @Body() body: AddonPurchaseDto) {
        const tenantId = body.tenantId || user.tenantId;
        if (!tenantId) {
            throw new BadRequestException('Tenant ID is required');
        }
        if (!body.addonId) {
            throw new BadRequestException('addonId is required');
        }
        return this.addonsService.purchaseAddon(tenantId, body.addonId, body.quantity || 1);
    }
}
