import {
    Controller,
    Get,
    Query,
    UseGuards,
} from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { GetUser } from '../../auth/decorators/get-user.decorator';

@Controller('telecom/analytics')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AnalyticsController {
    constructor(private readonly analyticsService: AnalyticsService) { }

    /**
     * GET /telecom/analytics/summary
     * Get overall call summary metrics
     */
    @Get('summary')
    @Roles('ADMIN', 'SUPPORT')
    getCallSummary(
        @GetUser() user: any,
        @Query('start') startDate?: string,
        @Query('end') endDate?: string,
    ) {
        return this.analyticsService.getCallSummary(user.tenantId, startDate, endDate);
    }

    /**
     * GET /telecom/analytics/daily
     * Get daily call volume for charts
     */
    @Get('daily')
    @Roles('ADMIN', 'SUPPORT')
    getDailyCallVolume(
        @GetUser() user: any,
        @Query('days') days?: string,
    ) {
        const daysNum = days ? parseInt(days, 10) : 30;
        return this.analyticsService.getDailyCallVolume(user.tenantId, daysNum);
    }

    /**
     * GET /telecom/analytics/calls-by-did
     * Get calls grouped by DID
     */
    @Get('calls-by-did')
    @Roles('ADMIN', 'SUPPORT')
    getCallsByDID(
        @GetUser() user: any,
        @Query('start') startDate?: string,
        @Query('end') endDate?: string,
    ) {
        return this.analyticsService.getCallsByDID(user.tenantId, startDate, endDate);
    }

    /**
     * GET /telecom/analytics/hourly
     * Get hourly call distribution
     */
    @Get('hourly')
    @Roles('ADMIN', 'SUPPORT')
    getCallsByHour(
        @GetUser() user: any,
        @Query('start') startDate?: string,
        @Query('end') endDate?: string,
    ) {
        return this.analyticsService.getCallsByHour(user.tenantId, startDate, endDate);
    }

    /**
     * GET /telecom/analytics/costs
     * Get cost breakdown from real UsageRecords + DID count
     */
    @Get('costs')
    @Roles('ADMIN', 'SUPPORT')
    getCostBreakdown(
        @GetUser() user: any,
        @Query('month') month?: string,
    ) {
        return this.analyticsService.getCostBreakdown(user.tenantId, month);
    }

    /**
     * GET /telecom/analytics/top-extensions
     * Get top extensions by call volume
     */
    @Get('top-extensions')
    @Roles('ADMIN', 'SUPPORT')
    getTopExtensions(
        @GetUser() user: any,
        @Query('limit') limit?: string,
    ) {
        const limitNum = limit ? parseInt(limit, 10) : 10;
        return this.analyticsService.getTopExtensions(user.tenantId, limitNum);
    }

    /**
     * GET /telecom/analytics/live
     * Get live call stats from Redis (active, ringing, answered)
     */
    @Get('live')
    @Roles('ADMIN', 'SUPPORT')
    getLiveStats(@GetUser() user: any) {
        return this.analyticsService.getLiveStats(user.tenantId);
    }

    /**
     * GET /telecom/analytics/dashboard
     * Proxy to internal analytics dashboard service
     */
    @Get('dashboard')
    @Roles('ADMIN', 'SUPPORT')
    getDashboard(
        @GetUser() user: any,
        @Query('range') range?: string,
    ) {
        return this.analyticsService.getProxyDashboard(user.tenantId, range || 'today');
    }

    /**
     * GET /telecom/analytics/global/dashboard
     * Get platform-wide analytics for Super Admin (with optional tenant filter)
     */
    @Get('global/dashboard')
    @Roles('SUPER_ADMIN')
    getGlobalDashboard(
        @Query('range') range?: string,
        @Query('customer_id') customerId?: string,
    ) {
        return this.analyticsService.getGlobalDashboard(range || 'today', customerId);
    }
}
