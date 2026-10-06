import { Controller, Get, Post, Body, Param, Headers, UnauthorizedException, Logger, Req, UseGuards } from '@nestjs/common';
import { OnboardingService } from './onboarding.service';
import { FreeSwitchSyncService } from '../freeswitch/freeswitch-sync.service';
import { ProvisionTenantDto } from './dto/provision-tenant.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GetUser } from '../auth/decorators/get-user.decorator';

@Controller('onboarding')
export class OnboardingController {
    constructor(
        private readonly onboardingService: OnboardingService,
        private readonly freeSwitchSync: FreeSwitchSyncService
    ) { }
    


    @Get('auth/status')
    @UseGuards(JwtAuthGuard)
    async getAuthOnboardingStatus(@GetUser() user: any) {
        return this.onboardingService.getOnboardingStatus(user.tenantId);
    }

    @Get('auth/available-tfns')
    @UseGuards(JwtAuthGuard)
    async getAvailableTFNsAuth(@GetUser() user: any) {
        return this.onboardingService.getAvailableTFNsAuthenticated(user.tenantId);
    }

    @Post('auth/select-tfn')
    @UseGuards(JwtAuthGuard)
    async selectTfnAuth(@GetUser() user: any, @Body('tfnId') tfnId: string) {
        return this.onboardingService.selectTfnForAuthenticatedUser(user.tenantId, tfnId);
    }



    @Post('provision-tenant')
    async provisionTenant(@Body() data: ProvisionTenantDto, @Req() req: any) {
        const authHeader = req.headers['x-sync-token'];
        const expectedToken = process.env.PBX_SYNC_TOKEN || 'your-super-secret-jwt-key-change-this-in-production';
        
        if (authHeader !== expectedToken) {
            console.error(`[PBX Provisioning] Unauthorized attempt. Received: ${authHeader}, Expected: ${expectedToken ? 'SET' : 'MISSING'}`);
            throw new UnauthorizedException('Invalid sync token');
        }

        const { tenant, user, subscription, extensionIdsToSync } = await this.onboardingService.provisionTenantFromSubBilling(data);

        // Sync extensions
        if (extensionIdsToSync && extensionIdsToSync.length > 0) {
            for (const id of extensionIdsToSync) {
                await this.freeSwitchSync.syncExtension(id);
            }
        }

        return {
            message: 'Tenant provisioned successfully',
            tenantId: tenant.id,
            userId: user!.id,
            subscriptionId: subscription!.id
        };
    }
}
