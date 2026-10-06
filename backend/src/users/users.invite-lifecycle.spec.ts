import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from './users.service';
import { PrismaService } from '../prisma/prisma.service';
import { KamailioDBService } from '../freeswitch/kamailio-db.service';
import { MailService } from '../mail/mail.service';
import { Role, UserStatus } from '@prisma/client';
import { BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';

describe('UsersService - Staff Invite Lifecycle & Auto-Flush', () => {
    let service: UsersService;
    let prisma: any;
    let mailService: any;

    const mockAdmin = {
        id: 'admin-uuid-1',
        email: 'admin@balatrix.com',
        role: Role.SUPER_ADMIN,
        name: 'Super Admin',
        tenantId: 'tenant-uuid-1',
        tenant: { id: 'tenant-uuid-1', name: 'Balatrix Corp' }
    };

    beforeEach(async () => {
        prisma = {
            user: {
                findUnique: jest.fn(),
                findFirst: jest.fn(),
                findMany: jest.fn(),
                create: jest.fn(),
                update: jest.fn(),
                delete: jest.fn(),
                count: jest.fn()
            },
            userAuditLog: {
                create: jest.fn()
            },
            supportProfile: {
                create: jest.fn()
            }
        };

        mailService = {
            sendSupportInvitationEmail: jest.fn().mockResolvedValue(true)
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                UsersService,
                { provide: PrismaService, useValue: prisma },
                { provide: KamailioDBService, useValue: { syncSubscriber: jest.fn(), deleteSubscriber: jest.fn() } },
                { provide: MailService, useValue: mailService }
            ],
        }).compile();

        service = module.get<UsersService>(UsersService);
    });

    describe('1. inviteSupportUser', () => {
        it('should create an invited user with a secure invite token and 7-day expiry', async () => {
            prisma.user.findUnique.mockResolvedValueOnce(mockAdmin); // admin lookup
            prisma.user.findUnique.mockResolvedValueOnce(null); // existing user check
            prisma.user.findFirst.mockResolvedValueOnce(null); // existing support check

            const createdUser = {
                id: 'staff-uuid-101',
                email: 'staff@balatrix.com',
                name: 'Staff Member',
                role: Role.SUPPORT,
                status: UserStatus.INVITED,
                inviteToken: 'mocked_hex_token_1234567890abcdef',
                inviteTokenExpiry: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
            };
            prisma.user.create.mockResolvedValueOnce(createdUser);

            const result = await service.inviteSupportUser('admin-uuid-1', {
                email: 'staff@balatrix.com',
                name: 'Staff Member'
            });

            expect(result.id).toBe('staff-uuid-101');
            expect(result.inviteToken).toBeDefined();
            expect(result.inviteLink).toContain('/invite/accept?token=');
            expect(mailService.sendSupportInvitationEmail).toHaveBeenCalled();
        });
    });

    describe('2. getInviteLink (SuperAdmin / Admin API)', () => {
        it('should return the active invite link for an INVITED staff member', async () => {
            prisma.user.findUnique
                .mockResolvedValueOnce(mockAdmin) // canManageUser check
                .mockResolvedValueOnce({
                    id: 'staff-uuid-101',
                    email: 'staff@balatrix.com',
                    name: 'Staff Member',
                    status: UserStatus.INVITED,
                    inviteToken: 'valid_active_token_123',
                    inviteTokenExpiry: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // 5 days left
                    role: Role.SUPPORT,
                    tenantId: 'tenant-uuid-1'
                });

            const linkData = await service.getInviteLink('admin-uuid-1', 'staff-uuid-101');

            expect(linkData.inviteToken).toBe('valid_active_token_123');
            expect(linkData.inviteLink).toContain('token=valid_active_token_123');
            expect(linkData.status).toBe(UserStatus.INVITED);
        });

        it('should throw BadRequestException if user is already ACTIVE (token already flushed)', async () => {
            prisma.user.findUnique
                .mockResolvedValueOnce(mockAdmin)
                .mockResolvedValueOnce({
                    id: 'staff-uuid-101',
                    email: 'staff@balatrix.com',
                    status: UserStatus.ACTIVE,
                    inviteToken: null, // ALREADY FLUSHED
                    inviteTokenExpiry: null
                });

            await expect(service.getInviteLink('admin-uuid-1', 'staff-uuid-101'))
                .rejects.toThrow(BadRequestException);
        });

        it('should throw BadRequestException if invite link has expired', async () => {
            prisma.user.findUnique
                .mockResolvedValueOnce(mockAdmin)
                .mockResolvedValueOnce({
                    id: 'staff-uuid-101',
                    email: 'staff@balatrix.com',
                    status: UserStatus.INVITED,
                    inviteToken: 'expired_token_123',
                    inviteTokenExpiry: new Date(Date.now() - 1000) // Expired 1 second ago
                });

            await expect(service.getInviteLink('admin-uuid-1', 'staff-uuid-101'))
                .rejects.toThrow(BadRequestException);
        });
    });

    describe('3. acceptInvite & Auto-Flush', () => {
        it('should activate user and atomically FLUSH inviteToken and inviteTokenExpiry to NULL', async () => {
            const pendingUser = {
                id: 'staff-uuid-101',
                email: 'staff@balatrix.com',
                status: UserStatus.INVITED,
                inviteToken: 'valid_active_token_123',
                inviteTokenExpiry: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000)
            };

            prisma.user.findUnique.mockResolvedValueOnce(pendingUser);
            prisma.user.update.mockResolvedValueOnce({
                id: pendingUser.id,
                email: pendingUser.email,
                status: UserStatus.ACTIVE,
                inviteToken: null,
                inviteTokenExpiry: null
            });

            const acceptResult = await service.acceptInvite('valid_active_token_123', 'MySecurePassword123!');

            expect(acceptResult.status).toBe(UserStatus.ACTIVE);

            // Verify update payload explicitly set inviteToken: null and inviteTokenExpiry: null
            expect(prisma.user.update).toHaveBeenCalledWith({
                where: { id: 'staff-uuid-101' },
                data: expect.objectContaining({
                    status: UserStatus.ACTIVE,
                    inviteToken: null,
                    inviteTokenExpiry: null
                })
            });
        });

        it('should reject already used / non-existent token (Replay Attack Prevention)', async () => {
            prisma.user.findUnique.mockResolvedValueOnce(null); // Token was flushed, not found

            await expect(service.acceptInvite('already_flushed_token', 'SomePassword123'))
                .rejects.toThrow(NotFoundException);
        });
    });

    describe('4. resendSupportInvite', () => {
        it('should regenerate a fresh invite token and return updated link', async () => {
            prisma.user.findUnique
                .mockResolvedValueOnce(mockAdmin) // canManageUser
                .mockResolvedValueOnce(mockAdmin) // admin details
                .mockResolvedValueOnce({
                    id: 'staff-uuid-101',
                    email: 'staff@balatrix.com',
                    status: UserStatus.INVITED,
                    inviteToken: 'old_expired_token'
                });

            const mockUpdatedToken = 'brand_new_fresh_token_999_abcdef1234567890abcdef1234567890abcdef12';
            prisma.user.update.mockResolvedValueOnce({
                id: 'staff-uuid-101',
                email: 'staff@balatrix.com',
                status: UserStatus.INVITED,
                inviteToken: mockUpdatedToken,
                inviteTokenExpiry: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
            });

            const resendResult = await service.resendSupportInvite('admin-uuid-1', 'staff-uuid-101');

            expect(resendResult.inviteToken).toBeDefined();
            expect(resendResult.inviteToken).toHaveLength(64);
            expect(resendResult.inviteLink).toContain(`token=${resendResult.inviteToken}`);
            expect(mailService.sendSupportInvitationEmail).toHaveBeenCalled();
        });
    });

    describe('5. updateUserStatus Manual Activation Auto-Flush', () => {
        it('should flush invite tokens if admin manually sets user status to ACTIVE', async () => {
            prisma.user.findUnique
                .mockResolvedValueOnce(mockAdmin) // canManageUser
                .mockResolvedValueOnce({
                    id: 'staff-uuid-101',
                    email: 'staff@balatrix.com',
                    status: UserStatus.INVITED,
                    inviteToken: 'old_pending_token'
                });

            prisma.user.update.mockResolvedValueOnce({
                id: 'staff-uuid-101',
                email: 'staff@balatrix.com',
                status: UserStatus.ACTIVE,
                inviteToken: null,
                inviteTokenExpiry: null
            });

            await service.updateUserStatus('admin-uuid-1', 'staff-uuid-101', UserStatus.ACTIVE);

            expect(prisma.user.update).toHaveBeenCalledWith({
                where: { id: 'staff-uuid-101' },
                data: expect.objectContaining({
                    status: UserStatus.ACTIVE,
                    inviteToken: null,
                    inviteTokenExpiry: null
                })
            });
        });
    });
});
