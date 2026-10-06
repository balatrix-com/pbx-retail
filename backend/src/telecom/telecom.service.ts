import { Injectable, BadRequestException, NotFoundException, ForbiddenException, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { WalletService } from '../wallet/wallet.service';
import { TransactionType, TFNStatus } from '@prisma/client';
import { EnforcementService, ServiceState } from '../enforcement/enforcement.service';
import { FreeSwitchSyncService } from '../freeswitch/freeswitch-sync.service';
import { AudioUploadService } from '../freeswitch/audio-upload.service';
import { RecordingStorageService } from '../freeswitch/recording-storage.service';

@Injectable()
export class TelecomService implements OnModuleInit {
    constructor(
        private prisma: PrismaService,
        private walletService: WalletService,
        private enforcementService: EnforcementService,
        private freeswitchSync: FreeSwitchSyncService,
        private audioUploadService: AudioUploadService,
        private recordingStorageService: RecordingStorageService
    ) { }

    async onModuleInit() {
        // Seed some TFNs if none exist
        const count = await this.prisma.tFN.count();
        if (count === 0) {
            await this.prisma.tFN.createMany({
                data: [
                    { number: '+18005550100', price: 2.00 }, // Default price needed if not in schema default? Schema has default 2.00
                    { number: '+18005550101', price: 2.00 },
                    { number: '+18005550102', price: 2.00 },
                    { number: '+18005550103', price: 5.00 }, // Premium
                ]
            });
            console.log('Seeded TFNs');
        }
    }

    // --- TFN Logic ---

    async searchTFNs() {
        return this.prisma.tFN.findMany({
            where: { status: TFNStatus.AVAILABLE }
        });
    }

    async listTFNs(tenantId: string) {
        return this.prisma.tFN.findMany({
            where: { tenantId }
        });
    }

    async purchaseTFN(tenantId: string, number: string) {
        const state = await this.enforcementService.getServiceState(tenantId);
        if (state === ServiceState.PLAN_EXPIRED) throw new ForbiddenException('Plan expired');
        if (state === ServiceState.WALLET_NEGATIVE) throw new ForbiddenException('Wallet negative');

        const tfn = await this.prisma.tFN.findUnique({ where: { number } });
        if (!tfn) throw new NotFoundException('TFN not found');
        if (tfn.status !== TFNStatus.AVAILABLE) throw new BadRequestException('TFN not available');

        // Charge Wallet (One-time setup or pro-rated first month? Usually immediate charge)
        try {
            await this.walletService.adjustBalance(tenantId, Number(tfn.price), TransactionType.DEBIT, `Purchase TFN ${number}`, `TFN-${tfn.id}`);
        } catch (err) {
            throw new ForbiddenException('Insufficient funds to purchase TFN');
        }

        // Assign
        return this.prisma.tFN.update({
            where: { id: tfn.id },
            data: {
                status: TFNStatus.ASSIGNED,
                tenantId,
                purchasedAt: new Date()
            }
        });
    }

    // --- Extension Logic ---

    async listExtensions(tenantId: string) {
        return this.prisma.extension.findMany({ where: { tenantId } });
    }

    async createExtension(tenantId: string, data: { extensionNumber: string; name: string; sipPassword?: string }) {
        const state = await this.enforcementService.getServiceState(tenantId);
        if (state === ServiceState.PLAN_EXPIRED) throw new ForbiddenException('Plan expired');

        // Validate Extension Number Uniqueness
        const existing = await this.prisma.extension.findFirst({
            where: { tenantId, extensionNumber: data.extensionNumber }
        });
        if (existing) throw new BadRequestException(`Extension ${data.extensionNumber} already exists`);

        return this.prisma.extension.create({
            data: {
                tenantId,
                extensionNumber: data.extensionNumber,
                name: data.name,
                sipUsername: `${data.extensionNumber}@default`,
                sipPassword: data.sipPassword || 'changeme',
            }
        });
    }

    // --- Monitoring Add-on Logic ---

    async purchaseMonitoring(tenantId: string) {
        const existing = await this.prisma.monitoringAddOn.findUnique({ where: { tenantId } });
        if (existing && existing.isActive) throw new BadRequestException('Monitoring already active');

        // Price
        const PRICE = 5.00; // Hardcoded or config

        try {
            await this.walletService.adjustBalance(tenantId, PRICE, TransactionType.DEBIT, 'Purchase Monitoring Add-on', 'MONITORING-ADDON');
        } catch (err) {
            throw new ForbiddenException('Insufficient funds for Monitoring');
        }

        if (existing) {
            return this.prisma.monitoringAddOn.update({
                where: { tenantId },
                data: { isActive: true }
            });
        } else {
            return this.prisma.monitoringAddOn.create({
                data: {
                    tenantId,
                    price: PRICE
                }
            });
        }
    }

    async getMonitoringStatus(tenantId: string) {
        const state = await this.enforcementService.getServiceState(tenantId);
        if (state === ServiceState.PLAN_EXPIRED) throw new ForbiddenException(`Monitoring unavailable: ${state}`);

        const addon = await this.prisma.monitoringAddOn.findUnique({ where: { tenantId } });
        if (!addon || !addon.isActive) {
            return { active: false };
        }

        // Return Mock Data
        return {
            activeCalls: Math.floor(Math.random() * 10),
            queues: [
                { name: 'Support', waiting: Math.floor(Math.random() * 5) },
                { name: 'Sales', waiting: Math.floor(Math.random() * 3) }
            ],
            serverStatus: 'HEALTHY'
        };
    }

    // --- Call Recording Logic ---

    async getRecordingStatus(tenantId: string) {
        const feature = await this.prisma.tenantFeature.findUnique({ where: { tenantId } });
        return { 
            enabled: feature?.recordingEnabled ?? false,
            allowed: feature?.recordingAllowed ?? false
        };
    }

    async toggleRecording(tenantId: string, enabled: boolean) {
        let feature = await this.prisma.tenantFeature.findUnique({ where: { tenantId } });
        
        if (enabled && (!feature || !feature.recordingAllowed)) {
            throw new ForbiddenException('Call recording feature is not allowed for your tenant. Please contact support.');
        }

        if (!feature) {
            feature = await this.prisma.tenantFeature.create({ data: { tenantId, recordingEnabled: enabled } });
        } else {
            feature = await this.prisma.tenantFeature.update({ where: { tenantId }, data: { recordingEnabled: enabled } });
        }

        await this.prisma.extension.updateMany({
            where: { tenantId },
            data: { recordingEnabled: enabled }
        });

        if (enabled) {
            const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
            if (tenant?.customerCode) {
                await this.recordingStorageService.ensureRecordingsDirectory(tenant.customerCode);
            }
        }

        await this.freeswitchSync.syncAllDialplans(tenantId);

        return { success: true, enabled };
    }


    async checkRecording(tenantId: string, callUuid: string): Promise<boolean> {
        const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
        if (!tenant || !tenant.customerCode) return false;
        
        const remotePath = `/recordings/${tenant.customerCode}/${callUuid}.mp3`;
        return this.recordingStorageService.checkFileExists(remotePath);
    }

    async streamRecording(tenantId: string, callUuid: string, res: any): Promise<void> {
        const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
        if (!tenant || !tenant.customerCode) {
            res.status(404).send('Not found');
            return;
        }

        const remotePath = `/recordings/${tenant.customerCode}/${callUuid}.mp3`;
        await this.recordingStorageService.streamAudio(remotePath, res);
    }

    // --- Routing Interconnection Logic ---

    async getRoutingOptions(tenantId: string) {
        const [extensions, ringGroups, ivrs, schedules, didForwards] = await Promise.all([
            this.prisma.extension.findMany({
                where: { tenantId },
                select: { id: true, name: true, extensionNumber: true }
            }),
            this.prisma.ringGroup.findMany({
                where: { tenantId },
                select: { id: true, name: true }
            }),
            this.prisma.iVR.findMany({
                where: { tenantId },
                select: { id: true, name: true }
            }),
            this.prisma.operationalSchedule.findMany({
                where: { tenantId },
                select: { id: true, name: true }
            }),
            this.prisma.dIDForward.findMany({
                where: { tenantId },
                select: { id: true, name: true, destinationNumber: true }
            })
        ]);

        return {
            extensions,
            ringGroups,
            ivrs,
            schedules,
            didForwards,
        };
    }

    async updateTFNRouting(id: string, tenantId: string, data: {
        routeType?: string;
        routeTargetId?: string;
        forwardEnabled?: boolean;
        forwardNumber?: string;
    }) {
        const tfn = await this.prisma.tFN.findUnique({ where: { id } });
        if (!tfn) throw new NotFoundException('TFN not found');
        if (tfn.tenantId !== tenantId) throw new ForbiddenException('Access denied');

        // Validate Target
        if (data.routeType && data.routeTargetId) {
            await this.validateRouteTarget(data.routeType, data.routeTargetId, tenantId);
        }

        const updated = await this.prisma.tFN.update({
            where: { id },
            data: {
                routeType: data.routeType,
                routeTargetId: data.routeTargetId,
                forwardEnabled: data.forwardEnabled,
                forwardNumber: data.forwardNumber
            }
        });

        // Trigger FreeSWITCH Sync
        try {
            await this.freeswitchSync.syncTFN(updated.id);
        } catch (error) {
            console.error(`FreeSWITCH sync failed for TFN ${updated.number}:`, error);
        }

        return updated;
    }

    private async validateRouteTarget(type: string, targetId: string, tenantId: string) {
        let valid = false;
        switch (type) {
            case 'extension':
                const ext = await this.prisma.extension.findFirst({ where: { id: targetId, tenantId } });
                valid = !!ext;
                break;
            case 'ring_group':
                const rg = await this.prisma.ringGroup.findFirst({ where: { id: targetId, tenantId } });
                valid = !!rg;
                break;
            case 'ivr':
                const ivr = await this.prisma.iVR.findFirst({ where: { id: targetId, tenantId } });
                valid = !!ivr;
                break;
            case 'schedule':
                const sched = await this.prisma.operationalSchedule.findFirst({ where: { id: targetId, tenantId } });
                valid = !!sched;
                break;
            case 'forward':
                // targetId not needed for forward, used forwardNumber instead, but if passed:
                valid = true;
                break;
            case 'did_forward':
                const fwd = await this.prisma.dIDForward.findFirst({ where: { id: targetId, tenantId } });
                valid = !!fwd;
                break;
            default:
                throw new BadRequestException(`Invalid route type: ${type}`);
        }

        if (!valid) throw new BadRequestException(`Invalid routing target for type ${type}`);
    }
}
