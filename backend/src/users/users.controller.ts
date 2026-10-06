import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards, Query } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { UsersService } from './users.service';
import { AuthService } from '../auth/auth.service';
import { AuditService } from '../audit/audit.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { Role, type User } from '@prisma/client';
import { CreateSupportUserDto } from './dto/create-support-user.dto';
import { UpdateUserStatusDto } from './dto/update-user-status.dto';
import { UpdatePermissionsDto } from './dto/update-permissions.dto';
import { InviteSupportUserDto } from './dto/invite-support-user.dto';
import { AcceptInviteDto } from './dto/accept-invite.dto';
import { PaginationQueryDto } from './dto/pagination-query.dto';
import { Audit } from '../audit/audit.decorator';

@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
    constructor(
        private readonly usersService: UsersService,
        private readonly authService: AuthService,
        private readonly auditService: AuditService
    ) { }

    @Get()
    @Roles(Role.ADMIN, Role.SUPER_ADMIN)
    listUsers(@GetUser() user: User, @Query() query: PaginationQueryDto) {
        return this.usersService.listUsers(user.id, query);
    }

    @Post('support')
    @Roles(Role.ADMIN, Role.SUPER_ADMIN)
    @Audit('USER_CREATED', 'USER_MANAGEMENT')
    createSupportUser(@GetUser() user: User, @Body() dto: CreateSupportUserDto) {
        return this.usersService.createSupportUser(user.id, dto);
    }



    @Patch(':id/status')
    @Roles(Role.ADMIN, Role.SUPER_ADMIN)
    @Audit('USER_STATUS_UPDATED', 'USER_MANAGEMENT')
    updateUserStatus(
        @GetUser() user: User,
        @Param('id') targetUserId: string,
        @Body() dto: UpdateUserStatusDto
    ) {
        return this.usersService.updateUserStatus(user.id, targetUserId, dto.status);
    }

    @Patch(':id/permissions')
    @Roles(Role.ADMIN, Role.SUPER_ADMIN)
    @Audit('USER_ROLE_UPDATED', 'USER_MANAGEMENT')
    updatePermissions(
        @GetUser() user: User,
        @Param('id') targetUserId: string,
        @Body() dto: UpdatePermissionsDto
    ) {
        return this.usersService.updatePermissions(
            user.id,
            targetUserId,
            dto.monitoringEnabled,
            dto.monitoringExtension,
            dto.monitoringSecret,
            dto.name
        );
    }

    @Get(':id/activity')
    @Roles(Role.ADMIN, Role.SUPER_ADMIN)
    getUserActivity(
        @GetUser() user: User,
        @Param('id') targetUserId: string,
        @Query() query: { page?: number; limit?: number }
    ) {
        return this.usersService.getUserActivity(user.id, targetUserId, query);
    }

    @Post('support/invite')
    @Throttle({ default: { limit: 10, ttl: 60000 } })
    @Roles(Role.ADMIN, Role.SUPER_ADMIN)
    inviteSupportUser(@GetUser() user: User, @Body() dto: InviteSupportUserDto) {
        return this.usersService.inviteSupportUser(user.id, dto);
    }

    /**
     * Get active invitation link for a pending user (SuperAdmin / Admin)
     */
    @Get(':id/invite-link')
    @Roles(Role.ADMIN, Role.SUPER_ADMIN)
    getInviteLink(@GetUser() user: User, @Param('id') targetUserId: string) {
        return this.usersService.getInviteLink(user.id, targetUserId);
    }

    /**
     * Resend / regenerate invitation link for a user (SuperAdmin / Admin)
     */
    @Post(':id/invite/resend')
    @Roles(Role.ADMIN, Role.SUPER_ADMIN)
    resendInvite(@GetUser() user: User, @Param('id') targetUserId: string) {
        return this.usersService.resendSupportInvite(user.id, targetUserId);
    }

    /**
     * Impersonate a user (SUPER_ADMIN only)
     */
    @Post('impersonate/:id')
    @Roles(Role.SUPER_ADMIN)
    @Audit('IMPERSONATION_START', 'AUTH')
    async impersonateUser(
        @Param('id') targetUserId: string,
        @GetUser() superAdmin: User
    ) {
        const result = await this.usersService.impersonateUser(superAdmin.id, targetUserId);

        // Generate JWT tokens for the target user
        const tokens = await this.authService.getTokens(
            result.user.id,
            result.user.email,
            result.user.role,
            result.user.tenantId
        );

        // Update refresh token for target user
        await this.authService.updateRefreshToken(result.user.id, tokens.refreshToken);

        return {
            ...result,
            ...tokens
        };
    }

    @Public()
    @Post('invite/accept')
    acceptInvite(@Body() dto: AcceptInviteDto) {
        return this.usersService.acceptInvite(dto.token, dto.password);
    }

    @Delete(':id')
    @Roles(Role.ADMIN, Role.SUPER_ADMIN)
    @Audit('USER_DELETED', 'USER_MANAGEMENT')
    deleteUser(@GetUser() user: User, @Param('id') targetId: string) {
        return this.usersService.deleteUser(user.id, targetId);
    }

    @Patch(':id/reset-password')
    @Roles(Role.SUPER_ADMIN, Role.ADMIN)
    resetPassword(
        @GetUser() user: User,
        @Param('id') targetUserId: string,
        @Body() { password }: { password: string }
    ) {
        return this.usersService.resetUserPassword(user.id, targetUserId, password);
    }
}
