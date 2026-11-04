import { Controller, Get, Param, UseGuards, Post, Body, Put, Delete, Req, UseInterceptors, UploadedFile, HttpException, HttpStatus } from '@nestjs/common';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { Audit } from '../audit/audit.decorator';

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AdminController {
    constructor(private readonly adminService: AdminService) { }

    /**
     * GET /admin/platform/stats
     * Get platform-wide statistics (SUPER_ADMIN only)
     */
    @Get('platform/stats')
    @Roles('SUPER_ADMIN')
    getPlatformStats() {
        return this.adminService.getPlatformStats();
    }

    /**
     * GET /admin/support/stats
     * Get platform stats for Support dashboard (SUPER_ADMIN or SUPPORT)
     */
    @Get('support/stats')
    @Roles('SUPER_ADMIN', 'SUPPORT')
    getSupportStats() {
        return this.adminService.getSupportStats();
    }

    /**
     * GET /admin/tenants/:id/telecom-stats
     * Get telecom stats for a specific tenant (SUPER_ADMIN only)
     */
    @Get('tenants/:id/telecom-stats')
    @Roles('SUPER_ADMIN')
    getTenantTelecomStats(@Param('id') tenantId: string) {
        return this.adminService.getTenantTelecomStats(tenantId);
    }

    /**
     * Whitelabel Packages/Plans Management (SUPER_ADMIN only)
     */
    @Get('packages')
    @Roles('SUPER_ADMIN')
    getAllPackages() {
        return this.adminService.getAllPackages();
    }

    @Get('packages/:id')
    @Roles('SUPER_ADMIN')
    getPackage(@Param('id') id: string) {
        return this.adminService.getPackage(id);
    }

    @Post('packages')
    @Roles('SUPER_ADMIN')
    @Audit('PLAN_CREATED', 'PLANS_ADDONS')
    createPackage(@Body() data: any) {
        return this.adminService.createPackage(data);
    }

    @Put('packages/:id')
    @Roles('SUPER_ADMIN')
    @Audit('PLAN_UPDATED', 'PLANS_ADDONS')
    updatePackage(@Param('id') id: string, @Body() data: any) {
        return this.adminService.updatePackage(id, data);
    }

    @Delete('packages/:id')
    @Roles('SUPER_ADMIN')
    @Audit('PLAN_DELETED', 'PLANS_ADDONS')
    deletePackage(@Param('id') id: string) {
        return this.adminService.deletePackage(id);
    }

    /**
     * Recording Rate Card Management (SUPER_ADMIN only)
     */
    @Get('rec-rate-cards')
    @Roles('SUPER_ADMIN')
    getAllRecRateCards() {
        return this.adminService.getAllRecRateCards();
    }

    @Get('rec-rate-cards/mappings')
    @Roles('SUPER_ADMIN')
    getCustomerRecRateCardMappings() {
        return this.adminService.getCustomerRecRateCardMappings();
    }

    @Get('rec-rate-cards/customer/:customerId')
    @Roles('SUPER_ADMIN')
    getCustomerRecRateCard(@Param('customerId') customerId: string) {
        return this.adminService.getCustomerRecRateCard(customerId);
    }

    @Put('rec-rate-cards/:id')
    @Roles('SUPER_ADMIN')
    @Audit('RATE_CARD_UPDATED', 'RATE_CARD')
    updateRecRateCard(@Param('id') id: string, @Body() data: any) {
        return this.adminService.updateRecRateCard(id, data);
    }

    @Put('rec-rate-cards/customer/:customerId')
    @Roles('SUPER_ADMIN')
    @Audit('RATE_CARD_MAPPING_UPDATED', 'RATE_CARD')
    updateCustomerRecRateCardMapping(@Param('customerId') customerId: string, @Body() data: { rec_rc_id: number }) {
        return this.adminService.updateCustomerRecRateCardMapping(customerId, data);
    }

    /**
     * White-label Branding & Partners Management (SUPER_ADMIN only)
     */
    @Get('branding/current')
    @Roles('SUPER_ADMIN')
    async getCurrentBranding() {
        return this.adminService.getCurrentBranding();
    }

    @Put('branding/current')
    @Roles('SUPER_ADMIN')
    @Audit('SYSTEM_SETTINGS_UPDATED', 'SYSTEM_SETTINGS')
    async updateCurrentBranding(@Body() data: any) {
        return this.adminService.updateCurrentBranding(data);
    }

    @Post('branding/upload')
    @Roles('SUPER_ADMIN')
    @UseInterceptors(FileInterceptor('file', {
        storage: diskStorage({
            destination: './uploads',
            filename: (req, file, cb) => {
                const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
                cb(null, `${uniqueSuffix}${extname(file.originalname)}`);
            }
        })
    }))
    async uploadLogo(@UploadedFile() file: any) {
        if (!file) {
            throw new HttpException('No file uploaded', HttpStatus.BAD_REQUEST);
        }
        return {
            url: `/api/uploads/${file.filename}`
        };
    }

    /**
     * Get global extension status
     */
    @Get('extensions/status')
    @Roles('SUPER_ADMIN')
    async getGlobalExtensionStatus() {
        return this.adminService.getAllActiveExtensionsStatus();
    }
}
