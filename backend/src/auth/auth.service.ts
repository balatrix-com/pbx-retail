import {
    Injectable,
    UnauthorizedException,
    BadRequestException,
    NotFoundException,
    ConflictException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { EnforcementService } from '../enforcement/enforcement.service';
import { Role, User } from '@prisma/client';
import * as bcrypt from 'bcrypt';

import { MailService } from '../mail/mail.service';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class AuthService {
    constructor(
        private prisma: PrismaService,
        private jwtService: JwtService,
        private configService: ConfigService,
        private enforcementService: EnforcementService,
        private mailService: MailService,
        private notificationsService: NotificationsService
    ) { }

    async validateUser(email: string, pass: string): Promise<any> {
        console.log(`Attempting login for: ${email}`);
        const normalizedEmail = email.toLowerCase();
        const user = await this.prisma.user.findUnique({ where: { email: normalizedEmail } });
        if (!user) {
            console.log('User not found');
            return null;
        }
        if (!user.password) {
            console.log('User has no password set');
            return null;
        }
        const isMatch = await bcrypt.compare(pass, user.password);
        console.log(`Password match: ${isMatch}`);

        if (isMatch) {
            const { password, ...result } = user;
            return result;
        }
        return null;
    }

    async signup(data: {
        email: string;
        password: string;
        companyName: string;
        name?: string;
    }) {
        const existingUser = await this.prisma.user.findUnique({
            where: { email: data.email },
        });
        if (existingUser) {
            throw new ConflictException('User already exists');
        }

        const hashedPassword = await bcrypt.hash(data.password, 10);

        // Create Tenant and Admin User in transaction
        const result = await this.prisma.$transaction(async (prisma) => {
            const tenant = await prisma.tenant.create({
                data: {
                    name: data.companyName,
                },
            });

            const user = await prisma.user.create({
                data: {
                    email: data.email.toLowerCase(),
                    password: hashedPassword,
                    name: data.name,
                    role: Role.ADMIN,
                    tenantId: tenant.id,
                },
            });

            // Create Welcome Notification
            await this.notificationsService.createNotification({
                tenantId: tenant.id,
                userId: user.id,
                type: 'system',
                title: 'Welcome to Cloud PBX!',
                message: 'Your telecom infrastructure dashboard is ready. Explore the features and start commanding your network.',
            });

            return { user, tenant };
        });

        const userVar = result.user as any;
        const tokens = await this.getTokens(userVar.id, userVar.email, userVar.role, userVar.tenantId, userVar.forcePasswordChange, userVar.monitoringEnabled);
        await this.updateRefreshToken(userVar.id, tokens.refreshToken);

        return {
            user: {
                id: result.user.id,
                email: result.user.email,
                name: userVar.name,
                role: userVar.role,
                status: userVar.status,
                monitoringEnabled: userVar.monitoringEnabled,
                tenantId: userVar.tenantId,
                forcePasswordChange: userVar.forcePasswordChange,
            },
            ...tokens,
        };
    }

    async login(user: User) {
        const userVar = user as any;
        const tokens = await this.getTokens(userVar.id, userVar.email, userVar.role, userVar.tenantId, userVar.monitoringEnabled);
        await this.updateRefreshToken(userVar.id, tokens.refreshToken);

        const fullUser = await this.prisma.user.findUnique({
            where: { id: user.id },
            include: {
                partner: true,
                tenant: {
                    include: {
                        partner: true
                    }
                }
            }
        });
        const partner = fullUser?.partner || fullUser?.tenant?.partner || null;

        return {
            user: {
                id: user.id,
                email: user.email,
                name: userVar.name,
                role: userVar.role,
                status: userVar.status,
                monitoringEnabled: userVar.monitoringEnabled,
                tenantId: userVar.tenantId,
                forcePasswordChange: userVar.forcePasswordChange,
                partner: partner ? {
                    name: partner.name,
                    logoMain: partner.logoMain,
                    logoSidebar: partner.logoSidebar,
                    favicon: partner.favicon,
                    primaryColor: partner.primaryColor,
                    accentColor: partner.accentColor,
                    supportEmail: partner.supportEmail,
                    supportPhone: partner.supportPhone
                } : null
            },
            ...tokens,
        };
    }

    async logout(userId: string) {
        await this.prisma.user.update({
            where: { id: userId },
            data: { refreshToken: null },
        });
    }

    async refreshTokens(userId: string, refreshToken: string | null) {
        const user = await this.prisma.user.findUnique({ where: { id: userId } });
        if (!user || !user.refreshToken || !refreshToken)
            throw new UnauthorizedException('Access Denied');

        const refreshTokenMatches = await bcrypt.compare(
            refreshToken,
            user.refreshToken,
        );
        if (!refreshTokenMatches) throw new UnauthorizedException('Access Denied');

        const userVar = user as any;
        const tokens = await this.getTokens(userVar.id, userVar.email, userVar.role, userVar.tenantId, userVar.forcePasswordChange, userVar.monitoringEnabled);
        await this.updateRefreshToken(user.id, tokens.refreshToken);
        return tokens;
    }

    async updateRefreshToken(userId: string, refreshToken: string) {
        const hashedRefreshToken = await bcrypt.hash(refreshToken, 10);
        await this.prisma.user.update({
            where: { id: userId },
            data: { refreshToken: hashedRefreshToken },
        });
    }

    async getTokens(userId: string, email: string, role: string, tenantId: string | null, forcePasswordChange: boolean = false, monitoringEnabled?: boolean, impersonation?: any) {
        const user = { monitoringEnabled }; // small wrapper for scope access if needed, or pass directly
        const [accessToken, refreshToken] = await Promise.all([
            this.jwtService.signAsync(
                {
                    sub: userId,
                    email,
                    role,
                    tenantId,
                    forcePasswordChange,
                    monitoringEnabled: user?.monitoringEnabled,
                    impersonation
                },
                {
                    secret: this.configService.get<string>('jwt.secret'),
                    expiresIn: '15m',
                },
            ),
            this.jwtService.signAsync(
                {
                    sub: userId,
                    email,
                    role,
                    tenantId,
                },
                {
                    secret: this.configService.get<string>('jwt.refreshSecret'),
                    expiresIn: this.configService.get<string>('jwt.refreshExpiresIn'),
                } as any,
            ),
        ]);

        return {
            accessToken,
            refreshToken,
        };
    }

    async getMe(userId: string, impersonation?: any) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            include: {
                partner: true,
                tenant: {
                    include: {
                        tenantFeatures: true,
                        partner: true
                    }
                },
            },
        });

        if (!user) return null;

        // Get enforcement state
        const enforcement = await this.enforcementService.getUserEnforcementState(userId);

        const { password, refreshToken, partnerId, partner: userPartner, ...result } = user;

        let tenantFeatures = null;
        if (user.tenant) {
            tenantFeatures = user.tenant.tenantFeatures || {
                ivrEnabled: true,
                ivrLimit: 10,
                ringGroupEnabled: true,
                ringGroupLimit: 10,
                schedulerEnabled: true,
                schedulerLimit: 10,
                didForwardEnabled: true,
                didForwardLimit: 10,
                monitorEnabled: true,
                monitorLimit: 10,
            };
        }

        const partner = userPartner || user.tenant?.partner || null;

        return {
            ...result,
            tenant: user.tenant ? {
                id: user.tenant.id,
                name: user.tenant.name,
                createdAt: user.tenant.createdAt,
                updatedAt: user.tenant.updatedAt,
                stripeCustomerId: user.tenant.stripeCustomerId,
                serviceBlocked: user.tenant.serviceBlocked,
                customerCode: user.tenant.customerCode,
                subBillingCustomerId: user.tenant.subBillingCustomerId,
                tenantFeatures
            } : null,
            enforcement,
            partner: partner ? {
                name: partner.name,
                logoMain: partner.logoMain,
                logoSidebar: partner.logoSidebar,
                favicon: partner.favicon,
                primaryColor: partner.primaryColor,
                accentColor: partner.accentColor,
                supportEmail: partner.supportEmail,
                supportPhone: partner.supportPhone
            } : null,
            ...(impersonation && {
                impersonation: {
                    isImpersonating: true,
                    originalUser: {
                        id: impersonation.originalUserId,
                        email: impersonation.originalEmail
                    },
                    startedAt: impersonation.startedAt
                }
            })
        };
    }

    async endImpersonation(user: any) {
        if (!user.impersonation) {
            throw new BadRequestException('Not currently impersonating');
        }

        const { originalUserId, originalEmail } = user.impersonation;

        // Get original user
        const originalUser = await this.prisma.user.findUnique({
            where: { id: originalUserId }
        });

        if (!originalUser) {
            throw new NotFoundException('Original user not found');
        }

        // Log end of impersonation
        await this.prisma.userAuditLog.create({
            data: {
                actorId: originalUserId,
                targetId: user.sub,
                action: 'END_IMPERSONATION' as any,
                metadata: {
                    targetEmail: user.email
                }
            }
        });

        // Generate new tokens for original user
        const originalUserVar = originalUser as any;
        const tokens = await this.getTokens(
            originalUserVar.id,
            originalUserVar.email,
            originalUserVar.role,
            originalUserVar.tenantId,
            originalUserVar.forcePasswordChange,
            originalUserVar.monitoringEnabled
        );

        await this.updateRefreshToken(originalUserVar.id, tokens.refreshToken);

        return {
            user: {
                id: originalUserVar.id,
                email: originalUserVar.email,
                name: originalUserVar.name,
                role: originalUserVar.role,
                status: originalUserVar.status,
                monitoringEnabled: originalUserVar.monitoringEnabled,
                tenantId: originalUserVar.tenantId
            },
            ...tokens
        };
    }

    async updateProfile(userId: string, data: { name?: string; password?: string }) {
        const updateData: any = {};
        if (data.name) {
            updateData.name = data.name;
        }
        if (data.password) {
            updateData.password = await bcrypt.hash(data.password, 10);
            updateData.forcePasswordChange = false;
        }

        const user = await this.prisma.user.update({
            where: { id: userId },
            data: updateData,
        });

        const { password, refreshToken, ...result } = user;
        return result;
    }

    async forgotPassword(email: string) {
        const normalizedEmail = email.toLowerCase();
        const user = await this.prisma.user.findUnique({
            where: { email: normalizedEmail },
            include: { tenant: true },
        });

        if (!user) {
            throw new NotFoundException('Account with that email does not exist.');
        }

        // Generate a 32-byte hex token
        const crypto = require('crypto');
        const token = crypto.randomBytes(32).toString('hex');
        const expiry = new Date();
        expiry.setMinutes(expiry.getMinutes() + 10);

        // Save token and expiry
        await this.prisma.user.update({
            where: { id: user.id },
            data: {
                resetToken: token,
                resetTokenExpiry: expiry,
            },
        });

        // Send Email
        await this.mailService.sendPasswordResetEmail(user.email, user.name || '', token, user.tenant?.name || 'Cloud PBX');

        return { message: 'A password reset link has been sent to your registered email address.' };
    }
    async verifyResetToken(token: string) {
        const user = await this.prisma.user.findUnique({
            where: { resetToken: token },
        });

        if (!user || !user.resetTokenExpiry || user.resetTokenExpiry < new Date()) {
            throw new BadRequestException('Invalid or expired password reset token.');
        }

        return { valid: true };
    }

    async resetPassword(token: string, newPassword: string) {
        const user = await this.prisma.user.findUnique({
            where: { resetToken: token },
        });

        // Verify token existence and expiration
        if (!user || !user.resetTokenExpiry || user.resetTokenExpiry < new Date()) {
            throw new BadRequestException('Invalid or expired password reset token.');
        }

        // Hash the new password
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        // Update user, clear tokens
        await this.prisma.user.update({
            where: { id: user.id },
            data: {
                password: hashedPassword,
                resetToken: null,
                resetTokenExpiry: null,
            },
        });

        return { message: 'Password has been reset successfully.' };
    }
}
