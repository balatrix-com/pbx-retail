import { Controller, Get, Patch, Param, UseGuards, Request, Query } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
    constructor(private readonly notificationsService: NotificationsService) { }

    @Get()
    async getNotifications(@Request() req: any, @Query('limit') limit?: string) {
        const tenantId = req.user.tenantId;
        const userId = req.user.id;
        const parsedLimit = limit ? parseInt(limit, 10) : 50;

        const notifications = await this.notificationsService.getNotifications(tenantId, userId, parsedLimit);
        return { notifications };
    }

    @Patch('read-all')
    async markAllAsRead(@Request() req: any) {
        const tenantId = req.user.tenantId;
        const userId = req.user.id;

        await this.notificationsService.markAllAsRead(tenantId, userId);
        return { success: true };
    }

    @Patch(':id/read')
    async markAsRead(@Request() req: any, @Param('id') id: string) {
        const tenantId = req.user.tenantId;
        const userId = req.user.id;

        const notification = await this.notificationsService.markAsRead(id, tenantId, userId);
        return { success: true, notification };
    }
}
