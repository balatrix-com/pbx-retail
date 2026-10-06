import { Controller, Post, Get, Body, UseGuards, Query, Param, Res } from '@nestjs/common';
import { TelecomService } from './telecom.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { Role, type User } from '@prisma/client';

class PurchaseTFNDto {
    number: string;
}

@Controller('telecom')
@UseGuards(JwtAuthGuard)
export class TelecomController {
    constructor(private readonly telecomService: TelecomService) { }

    // TFNs
    @Get('tfns/search')
    @Get('tfns/search')
    searchTFNs() {
        return this.telecomService.searchTFNs();
    }

    @Get('tfns/mine')
    listMyTFNs(@GetUser() user: User) {
        return this.telecomService.listTFNs(user.tenantId!);
    }

    @Post('tfns/purchase')
    @Roles(Role.SUPER_ADMIN)
    @UseGuards(RolesGuard)
    purchaseTFN(@GetUser() user: User, @Body() body: PurchaseTFNDto & { targetTenantId?: string }) {
        const tenantId = (user.role === Role.SUPER_ADMIN) && body.targetTenantId
            ? body.targetTenantId
            : user.tenantId!;

        return this.telecomService.purchaseTFN(tenantId, body.number);
    }

    // Extensions - Managed by ExtensionsController
    // Removed duplicate listExtensions and createExtension endpoints

    // Monitoring
    @Get('monitoring/live')
    getMonitoring(@GetUser() user: User) {
        return this.telecomService.getMonitoringStatus(user.tenantId!);
    }

    @Post('monitoring/purchase')
    purchaseMonitoring(@GetUser() user: User) {
        return this.telecomService.purchaseMonitoring(user.tenantId!);
    }

    // --- Call Recording Endpoints ---

    @Get('recording/status')
    getRecordingStatus(@GetUser() user: User) {
        return this.telecomService.getRecordingStatus(user.tenantId!);
    }

    @Post('recording/toggle')
    toggleRecording(@GetUser() user: User, @Body() body: { enabled: boolean }) {
        return this.telecomService.toggleRecording(user.tenantId!, body.enabled);
    }

    @Get('recordings/:callUuid/check')
    async checkRecording(@GetUser() user: User, @Param('callUuid') callUuid: string) {
        const hasRecording = await this.telecomService.checkRecording(user.tenantId!, callUuid);
        return { hasRecording };
    }

    @Get('recordings/:callUuid/play')
    async playRecording(@GetUser() user: User, @Param('callUuid') callUuid: string, @Res() res: any) {
        await this.telecomService.streamRecording(user.tenantId!, callUuid, res);
    }

    // --- Interconnection Endpoints ---

    @Get('routing-options')
    getRoutingOptions(@GetUser() user: User) {
        return this.telecomService.getRoutingOptions(user.tenantId!);
    }

    @Post('tfns/:id/routing') // Using Post or Patch
    updateTFNRouting(
        @GetUser() user: User,
        @Param('id') id: string,
        @Body() body: {
            routeType?: string;
            routeTargetId?: string;
            forwardEnabled?: boolean;
            forwardNumber?: string;
        }
    ) {
        return this.telecomService.updateTFNRouting(id, user.tenantId!, body);
    }
}
