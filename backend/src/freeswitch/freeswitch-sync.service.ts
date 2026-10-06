import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { FreeSwitchDBService } from './freeswitch-db.service';
import { KamailioDBService } from './kamailio-db.service';
import { DialplanGeneratorService } from './dialplan-generator.service';
import { CacheFlushService } from './cache-flush.service';

@Injectable()
export class FreeSwitchSyncService {
    private readonly logger = new Logger(FreeSwitchSyncService.name);

    constructor(
        private prisma: PrismaService,
        private freeswitchDB: FreeSwitchDBService,
        private kamailioDB: KamailioDBService,
        private dialplanGenerator: DialplanGeneratorService,
        private cacheFlush: CacheFlushService,
    ) { }

    /**
     * Sync an Extension to FreeSWITCH dialplan AND Kamailio Subscriber
     * Key: ext_{id}
     */
    async syncExtension(extensionId: string, tx?: any): Promise<void> {
        const client = tx || this.prisma;
        const ext = await client.extension.findUnique({
            where: { id: extensionId },
            include: { tenant: true }
        });
        if (!ext) return;

        // 1. Sync Kamailio Subscriber
        if (ext.sipPassword) {
            await this.kamailioDB.syncSubscriber(ext.extensionNumber, ext.sipPassword);
        } else {
            this.logger.warn(`Skipping Kamailio sync for ${ext.extensionNumber}: No SIP password available.`);
        }

        // 2. Sync FreeSWITCH Dialplan
        // Dialplan Key: ext{n}_{customer} where n is derived from extensionNumber suffix
        // Fallback to 1001 if no code yet (migration handling)
        const key = this.getExtensionDialplanKey(ext);
        const customerCode = ext.tenant?.customerCode || '';
        const enableRecording = (ext as any).recordingEnabled ?? false;

        let xml = '';

        if (ext.forwardAllEnabled && ext.forwardAllDestination) {
            // CFU (Call Forward Unconditional)
            // Resolve gateway for external forwarding (same logic as DID forwarding)
            const isExternalCFU = ext.forwardAllType !== 'extension';
            const cfuGateway = isExternalCFU ? await this.resolveOutboundGatewayForTenant(ext.tenantId) : undefined;
            xml = this.dialplanGenerator.generateExtensionCFUXML(key, ext.forwardAllDestination, undefined, enableRecording, customerCode, cfuGateway);
        } else if (ext.forwardNoAnswerEnabled && ext.forwardNoAnswerDestination) {
            // CFNA (Call Forward No Answer)
            // Resolve gateway for external forwarding (same logic as DID forwarding)
            const isExternalCFNA = ext.forwardNoAnswerType !== 'extension';
            const cfnaGateway = isExternalCFNA ? await this.resolveOutboundGatewayForTenant(ext.tenantId) : undefined;
            xml = this.dialplanGenerator.generateExtensionForwardingXML(
                key,
                ext.extensionNumber,
                ext.forwardNoAnswerDestination,
                ext.forwardNoAnswerTimeout,
                undefined,
                enableRecording,
                customerCode,
                cfnaGateway
            );
        } else {
            xml = this.dialplanGenerator.generateSimpleExtensionXML(key, ext.extensionNumber, undefined, enableRecording, customerCode);
        }

        await this.freeswitchDB.upsertDialplan(key, xml);
        this.logger.log(`Synced Extension ${key}`);

        // Flush cache (using customer-level flush as per requirement)
        if (ext.tenant?.customerCode) {
            await this.cacheFlush.flushCustomer(ext.tenant.customerCode);
        }
    }

    /**
     * Sync a Ring Group to FreeSWITCH dialplan
     * Key: rg_{name_slug}
     */
    async syncRingGroup(ringGroupId: string, tx?: any): Promise<void> {
        const client = tx || this.prisma;
        const rg = await client.ringGroup.findUnique({
            where: { id: ringGroupId },
            include: {
                members: { 
                    include: { extension: true },
                    orderBy: [{ priority: 'asc' }, { position: 'asc' }]
                },
                tenant: true
            }
        });
        if (!rg) return;

        const key = `rg${rg.sequenceId}_${rg.tenant.customerCode}`;
        const customerCode = rg.tenant?.customerCode || '';
        const enableRecording = (rg.members[0]?.extension as any)?.recordingEnabled ?? false;

        // Map to { extensionNumber, priority } for DialplanGenerator
        const members = rg.members.map((m: any) => ({
            extensionNumber: m.extension.extensionNumber,
            priority: m.priority
        }));

        const xml = this.dialplanGenerator.generateRingGroupXML(
            key,
            members,
            rg.strategy || 'simultaneous',
            rg.ringTimeout || 30,
            undefined,
            enableRecording,
            customerCode
        );

        await this.freeswitchDB.upsertDialplan(key, xml);
        this.logger.log(`Synced RingGroup ${key}`);

        // Flush customer cache
        if (rg.tenant?.customerCode) {
            await this.cacheFlush.flushCustomer(rg.tenant.customerCode);
        }
    }

    /**
     * Sync an IVR to FreeSWITCH dialplan (Multiple Files)
     * Key: ivr_{name_slug}_...
     */
    async syncIVR(ivrId: string, tx?: any): Promise<void> {
        const client = tx || this.prisma;
        const ivr = await client.iVR.findUnique({
            where: { id: ivrId },
            include: { tenant: true }
        });
        if (!ivr) return;

        const baseKey = `ivr${ivr.sequenceId}_${ivr.tenant.customerCode}`;

        // 1. Clean up old entries for this IVR to remove stale menus/actions
        await this.freeswitchDB.deleteDialplanPattern(baseKey);

        const greeting = ivr.greetingAudioPath || '/opt/ivr_audio/default.wav';

        // 2. Resolve target IDs to actual Dialplan Keys (e.g. ext101_1001)
        const resolvedMenu = await this.resolveMenuTargets(ivr.menu, ivr.tenantId);

        const xmlMap = this.dialplanGenerator.generateIVRXMLs(
            baseKey,
            greeting,
            resolvedMenu
        );

        for (const [key, xml] of xmlMap.entries()) {
            await this.freeswitchDB.upsertDialplan(key, xml);
        }
        this.logger.log(`Synced IVR ${baseKey} (${xmlMap.size} files)`);

        // Flush customer cache
        if (ivr.tenant?.customerCode) {
            await this.cacheFlush.flushCustomer(ivr.tenant.customerCode);
        }
    }

    /**
     * Delete IVR and all associated sub-menus from FreeSWITCH
     */
    async deleteIVR(ivr: any): Promise<void> {
        if (!ivr || !ivr.tenant) return;

        const baseKey = `ivr${ivr.sequenceId}_${ivr.tenant.customerCode}`;
        await this.freeswitchDB.deleteDialplanPattern(baseKey);
        this.logger.log(`Deleted IVR ${baseKey} and submenus`);

        // Flush customer cache
        if (ivr.tenant?.customerCode) {
            await this.cacheFlush.flushCustomer(ivr.tenant.customerCode);
        }
    }

    /**
     * Sync a single DID to FreeSWITCH database
     * Populates the did_routes table for fast lookup.
     * XML generation is DISABLED as per requirement.
     */
    async syncDID(didId: string, tx?: any): Promise<void> {
        const client = tx || this.prisma;
        try {
            const did = await client.dID.findUnique({
                where: { id: didId },
                include: { tenant: true },
            });

            if (!did) {
                this.logger.warn(`DID ${didId} not found for sync`);
                return;
            }

            this.logger.log(`Syncing DID ${did.number} to FreeSWITCH...`);

            if (!did.tenant) {
                this.logger.warn(`DID ${did.number} has no tenant. Skipping sync.`);
                return;
            }

            let targetKey = '';

            if (did.routeType === 'forward') {
                // Forwarding logic
                if (!did.forwardNumber) {
                    this.logger.warn(`DID ${did.number} has generic forward route but no number`);
                    return;
                }
                const seqId = (did as any).sequenceId || 0;
                targetKey = `fwd_${seqId}_${did.tenant.customerCode}`;

                // Generate and Upsert XML
                const gateway = await this.resolveOutboundGatewayForTenant(did.tenantId);
                const xml = this.dialplanGenerator.generateDIDForwardXML(targetKey, did.forwardNumber, gateway);
                await this.freeswitchDB.upsertDialplan(targetKey, xml);

            } else {
                // Standard logic for other types
                targetKey = await this.resolveRoutingTarget(
                    did.routeType,
                    did.routeTargetId,
                    did.tenant?.customerCode || '',
                    did.forwardNumber
                );
            }

            if (!targetKey) {
                this.logger.warn(`DID ${did.number} has no valid target`);
                return;
            }

            // 2. Sync to did_routes table
            const customerId = did.tenant?.customerCode || '';
            if (customerId) {
                const normalizedNumber = this.normalizeNumber(did.number);
                await this.freeswitchDB.syncDIDRoute(normalizedNumber, customerId, targetKey);
                this.logger.log(`Successfully synced DID ${normalizedNumber} -> ${targetKey}`);

                // Flush DID cache
                await this.cacheFlush.flushDID(normalizedNumber);
            }
        } catch (error) {
            this.logger.error(`Failed to sync DID`, error);
        }
    }

    /**
     * Delete a DID from FreeSWITCH
     */
    async deleteDID(did: any): Promise<void> {
        if (!did) return;
        
        // DIDs and TFNs share the removal logic in FreeSwitchDBService
        // But DIDs also need sequence-based forwarding XMLs removed
        const normalizedNumber = this.normalizeNumber(did.number);
        
        // 1. Remove from did_routes and dialplan_xml (exact match)
        await this.freeswitchDB.removeDID(normalizedNumber, normalizedNumber).catch(() => {});

        // 2. Clean up potential forwarding XMLs
        // DIDs use: fwd_{seqId}_{customerCode}
        if (did.tenant && did.sequenceId !== undefined) {
            await this.freeswitchDB.deleteDialplanPattern(`fwd_${did.sequenceId}_${did.tenant.customerCode}`).catch(() => {});
        }

        this.logger.log(`Deleted DID ${normalizedNumber} and associated forwarding XMLs`);

        // Flush DID cache
        await this.cacheFlush.flushDID(normalizedNumber);
    }


    /**
     * Sync a TFN to FreeSWITCH database
     * Same logic as DID but supports TFN model
     */
    async syncTFN(tfnId: string, tx?: any): Promise<void> {
        const client = tx || this.prisma;
        try {
            const tfn = await client.tFN.findUnique({
                where: { id: tfnId },
                include: { tenant: true },
            });

            if (!tfn) {
                this.logger.warn(`TFN ${tfnId} not found for sync`);
                return;
            }
            if (!tfn.tenant) {
                this.logger.warn(`TFN ${tfn.number} has no tenant. Skipping sync.`);
                return;
            }

            this.logger.log(`Syncing TFN ${tfn.number} to FreeSWITCH...`);

            let targetKey = '';

            // 1. Resolve Target
            if (tfn.routeType === 'schedule') {
                if (tfn.routeTargetId) {
                    await this.syncSchedule(tfn.routeTargetId);
                    const sched = await this.prisma.operationalSchedule.findUnique({
                        where: { id: tfn.routeTargetId },
                        include: { tenant: true }
                    });
                    if (sched) targetKey = `sched${sched.sequenceId}_${sched.tenant.customerCode}`;
                }
            } else if (tfn.routeType === 'ivr') {
                if (tfn.routeTargetId) {
                    await this.syncIVR(tfn.routeTargetId);
                    const ivr = await this.prisma.iVR.findUnique({
                        where: { id: tfn.routeTargetId },
                        include: { tenant: true }
                    });
                    if (ivr) targetKey = `ivr${ivr.sequenceId}_${ivr.tenant.customerCode}`;
                }
            } else if (tfn.routeType === 'queue' || tfn.routeType === 'ring_group') {
                if (tfn.routeTargetId) {
                    await this.syncRingGroup(tfn.routeTargetId);
                    const rg = await this.prisma.ringGroup.findUnique({
                        where: { id: tfn.routeTargetId },
                        include: { tenant: true }
                    });
                    if (rg) targetKey = `rg${rg.sequenceId}_${rg.tenant.customerCode}`;
                }
            } else if (tfn.routeType === 'extension') {
                if (tfn.routeTargetId) {
                    await this.syncExtension(tfn.routeTargetId);
                    const ext = await this.prisma.extension.findUnique({
                        where: { id: tfn.routeTargetId },
                        include: { tenant: true }
                    });
                    if (ext) targetKey = this.getExtensionDialplanKey(ext);
                }
            } else if (tfn.routeType === 'forward') {
                // TFN Forwarding - unique key using number since TFN has no sequenceId
                targetKey = `fwd_tfn_${tfn.number}`;
                const gateway = await this.resolveOutboundGatewayForTenant(tfn.tenantId);
                const fwdXml = this.dialplanGenerator.generateDIDForwardXML(targetKey, tfn.forwardNumber!, gateway);
                await this.freeswitchDB.upsertDialplan(targetKey, fwdXml);
            } else {
                if (tfn.routeType && tfn.routeTargetId) {
                    targetKey = await this.resolveDialplanKey(tfn.routeType, tfn.routeTargetId);
                }
            }

            if (!targetKey) {
                this.logger.warn(`TFN ${tfn.number} has no valid target`);
                return;
            }

            // XML Generation REMOVED as per requirement

            // 2. Sync to did_routes table
            const customerId = tfn.tenant.customerCode || '';
            if (customerId) {
                const normalizedNumber = this.normalizeNumber(tfn.number);
                await this.freeswitchDB.syncDIDRoute(normalizedNumber, customerId, targetKey);
                this.logger.log(`Successfully synced TFN ${normalizedNumber} -> ${targetKey}`);

                // Flush DID cache (TFNs are DIDs in cache)
                await this.cacheFlush.flushDID(normalizedNumber);
            }

        } catch (error) {
            this.logger.error(`Failed to sync TFN`, error);
        }
    }

    /**
     * Delete TFN from FreeSWITCH
     */
    async deleteTFN(tfn: any): Promise<void> {
        if (!tfn) return;
        const normalizedNumber = this.normalizeNumber(tfn.number);
        
        // 1. Remove from did_routes and dialplan_xml (exact match)
        await this.freeswitchDB.removeDID(normalizedNumber, normalizedNumber).catch(() => {});

        // 2. Clean up potential forwarding XMLs
        // TFNs use: fwd_tfn_{number}
        await this.freeswitchDB.deleteDialplanPattern(`fwd_tfn_${tfn.number}`).catch(() => {});
        
        // DIDs (and sometimes TFNs if passed same object) use: fwd_{seqId}_{customerCode}
        if (tfn.tenant && tfn.sequenceId !== undefined) {
            await this.freeswitchDB.deleteDialplanPattern(`fwd_${tfn.sequenceId}_${tfn.tenant.customerCode}`).catch(() => {});
        }

        this.logger.log(`Deleted TFN/DID ${normalizedNumber} and associated forwarding XMLs`);

        // Flush DID cache
        await this.cacheFlush.flushDID(normalizedNumber);
    }

    /**
     * Bulk delete all routing data for a tenant from FreeSWITCH
     */
    async bulkDeleteTenantData(customerCode: string): Promise<void> {
        if (!customerCode) return;
        
        try {
            const customerId = customerCode;
            
            // 1. Bulk delete from did_routes
            if (customerId) {
                await this.freeswitchDB.deleteRoutesByCustomer(customerId);
            }

            // 2. Bulk delete from dialplan_xml using pattern _{customerCode}
            await this.freeswitchDB.deleteDialplansByCustomer(customerCode);

            this.logger.log(`Bulk deleted FreeSWITCH data for customer ${customerCode}`);

            // Flush customer cache
            if (customerCode) {
                await this.cacheFlush.flushCustomer(customerCode);
            }
        } catch (error) {
            this.logger.error(`Failed bulk FreeSWITCH cleanup for ${customerCode}: ${error.message}`);
        }
    }

    private normalizeNumber(num: string): string {
        if (!num) return '';
        // User Request: Store without country code (e.g. +1800... -> 800...)
        // Remove +1 (US) or +91 (India) prefix
        let cleaned = num.replace(/^\+/, ''); // Remove leading +

        // US: 1 + 10 digits = 11 digits
        if (cleaned.startsWith('1') && cleaned.length === 11) {
            cleaned = cleaned.substring(1);
        }
        // India: 91 + 10 digits = 12 digits
        else if (cleaned.startsWith('91') && cleaned.length === 12) {
            cleaned = cleaned.substring(2);
        }
        return cleaned;
    }

    /**
     * Helper to resolve routing target key and generate forward dialplan if needed
     */
    private async resolveRoutingTarget(
        routeType: string | null,
        routeTargetId: string | null,
        customerCode: string | null,
        forwardNumber?: string | null
    ): Promise<string> {
        if (!routeType) return '';

        const code = customerCode;

        if (routeType === 'schedule') {
            if (routeTargetId) {
                await this.syncSchedule(routeTargetId);
                const sched = await this.prisma.operationalSchedule.findUnique({ where: { id: routeTargetId }, include: { tenant: true } });
                return sched ? `sched${sched.sequenceId}_${code}` : '';
            }
        } else if (routeType === 'ivr') {
            if (routeTargetId) {
                await this.syncIVR(routeTargetId);
                const ivr = await this.prisma.iVR.findUnique({ where: { id: routeTargetId }, include: { tenant: true } });
                return ivr ? `ivr${ivr.sequenceId}_${code}` : '';
            }
        } else if (routeType === 'ring_group' || routeType === 'queue') {
            if (routeTargetId) {
                await this.syncRingGroup(routeTargetId);
                const rg = await this.prisma.ringGroup.findUnique({ where: { id: routeTargetId }, include: { tenant: true } });
                return rg ? `rg${rg.sequenceId}_${code}` : '';
            }
        } else if (routeType === 'extension') {
            if (routeTargetId) {
                await this.syncExtension(routeTargetId);
                const ext = await this.prisma.extension.findUnique({ where: { id: routeTargetId }, include: { tenant: true } });
                return ext ? this.getExtensionDialplanKey(ext) : '';
            }
        } else if (routeType === 'forward') {
            // For forwarding, we need a unique key. 
            // We don't have a sequence ID for the routing rule itself easily available without the entity (DID/TFN).
            // Strategy: Use a deterministic hash or just use the number if unique? 
            // But multiple numbers can forward to same place. 
            // BETTER: We should generate the forward XML *here* using the target number as part of key if needed, 
            // OR use the did/tfn number in the key?
            // Let's use `fwd_EXT_{number}` format? 
            // Actually, `generateDIDForwardXML` was taking `targetKey`.
            // Providing a unique key `fwd_${forwardNumber}_${code}` might collide if multiple rules?
            // No, forwarding is per-DID/TFN. 
            // Let's assume we can't easily get sequenceId here without passing the parent entity.
            // REF: The original code used `did.sequenceId`. 
            // I'll assume the caller passes enough context or handled inside specific blocks.
            // See `syncDID` uses `did.sequenceId`.
            // I refactored `syncDID` to use this helper, but I lost `sequenceId` access.
            // Reverting to allow `syncDID` to handle its own specific logic or passing sequence ID.
            return ''; // Handled by caller for 'forward' type usually
        }

        // Fallback
        return this.resolveDialplanKey(routeType, routeTargetId || '');
    }


    /**
     * Delete Ring Group from FreeSWITCH
     */
    async deleteRingGroup(rg: any): Promise<void> {
        if (!rg || !rg.tenant) return;
        const key = `rg${rg.sequenceId}_${rg.tenant.customerCode}`;
        await this.freeswitchDB.deleteDialplanPattern(key);
        this.logger.log(`Deleted RingGroup ${key}`);

        // Flush customer cache
        if (rg.tenant?.customerCode) {
            await this.cacheFlush.flushCustomer(rg.tenant.customerCode);
        }
    }

    /**
     * Delete Extension dialplan from FreeSWITCH and Kamailio
     */
    async deleteExtension(extension: any): Promise<void> {
        if (!extension || !extension.tenant) return;

        // 1. Delete from Kamailio
        await this.kamailioDB.deleteSubscriber(extension.extensionNumber);

        // 2. Delete from FreeSWITCH
        const key = this.getExtensionDialplanKey(extension);
        await this.freeswitchDB.deleteDialplan(key);
        this.logger.log(`Deleted Extension ${key} and Kamailio subscriber`);

        // Flush extension cache (using customer-level flush as per requirement)
        if (extension.tenant?.customerCode) {
            await this.cacheFlush.flushCustomer(extension.tenant.customerCode);
        }
    }

    /**
     * Delete Schedule from FreeSWITCH
     */
    async deleteSchedule(sched: any): Promise<void> {
        if (!sched || !sched.tenant) return;
        const key = `sched${sched.sequenceId}_${sched.tenant.customerCode}`;
        // Also delete the DID wrapper for schedule if it exists
        await this.freeswitchDB.deleteDialplanPattern(`did_sched${sched.sequenceId}_${sched.tenant.customerCode}`);
        // And the schedule itself
        await this.freeswitchDB.deleteDialplanPattern(key);
        this.logger.log(`Deleted Schedule ${key}`);

        // Flush customer cache
        if (sched.tenant?.customerCode) {
            await this.cacheFlush.flushCustomer(sched.tenant.customerCode);
        }
    }

    /**
     * Sync Operational Schedule
     * Key: sched{n}_{customer}
     */
    async syncSchedule(scheduleId: string, tx?: any): Promise<void> {
        const client = tx || this.prisma;
        const schedule = await client.operationalSchedule.findUnique({
            where: { id: scheduleId },
            include: { tenant: true }
        });
        if (!schedule) return;

        const key = `sched${schedule.sequenceId}_${schedule.tenant.customerCode}`;

        const primaryKey = await this.resolveDialplanKey(schedule.primaryRouteType, schedule.primaryRouteTarget);
        const ahKey = await this.resolveDialplanKey(schedule.afterHoursRouteType, schedule.afterHoursRouteTarget);
        const weekendKey = await this.resolveDialplanKey(schedule.weekendRouteType, schedule.weekendRouteTarget);

        // Note: generateDIDScheduleXML needs to be adaptable or we pass the key as extension name
        // Use key as the extension name so it can be transferred to
        const xml = this.dialplanGenerator.generateDIDScheduleXML(key, schedule.timezone, {
            primaryRoute: primaryKey,
            afterHoursRoute: ahKey,
            weekendRoute: weekendKey,
            startTime: schedule.startTime,
            endTime: schedule.endTime,
            weekdays: this.maskToWday(schedule.daysMask)
        });

        await this.freeswitchDB.upsertDialplan(key, xml);

        // Flush customer cache
        if (schedule.tenant?.customerCode) {
            await this.cacheFlush.flushCustomer(schedule.tenant.customerCode);
        }
    }

    /**
     * Sync DID Forward (External Number)
     * Key: fwd{n}_{customer}
     */
    async syncDIDForward(id: string): Promise<void> {
        const forward = await this.prisma.dIDForward.findUnique({
            where: { id },
            include: { tenant: true }
        });
        if (!forward) return;

        const key = `fwd${forward.sequenceId}_${forward.tenant.customerCode}`;
        const gateway = await this.resolveOutboundGatewayForTenant(forward.tenantId);
        const xml = this.dialplanGenerator.generateDIDForwardXML(key, forward.destinationNumber, gateway);

        await this.freeswitchDB.upsertDialplan(key, xml);
        this.logger.log(`Synced DID Forward ${key}`);

        // Flush customer cache
        if (forward.tenant?.customerCode) {
            await this.cacheFlush.flushCustomer(forward.tenant.customerCode);
        }
    }

    /**
     * Delete DID Forward
     */
    async deleteDIDForward(forward: any): Promise<void> {
        if (!forward || !forward.tenant) return;
        const key = `fwd${forward.sequenceId}_${forward.tenant.customerCode}`;
        await this.freeswitchDB.deleteDialplanPattern(key);
        this.logger.log(`Deleted DID Forward ${key}`);

        // Flush customer cache
        if (forward.tenant?.customerCode) {
            await this.cacheFlush.flushCustomer(forward.tenant.customerCode);
        }
    }

    // --- Helpers ---

    private getExtensionDialplanKey(ext: any): string {
        const customerCode = ext?.tenant?.customerCode || '';
        const pattern = new RegExp(`^${customerCode}(\\d+)$`);
        const match = (ext?.extensionNumber || '').match(pattern);
        let seq = ext?.sequenceId || 0;
        if (match) {
            seq = parseInt(match[1], 10);
        }
        return `ext${seq}_${customerCode}`;
    }

    private async resolveDialplanKey(type: string, targetId: string, tx?: any): Promise<string> {
        if (!targetId) return '';
        const client = tx || this.prisma;

        if (type === 'extension') {
            const ext = await client.extension.findUnique({
                where: { id: targetId },
                include: { tenant: true }
            });
            return ext ? this.getExtensionDialplanKey(ext) : '';
        }
        if (type === 'ring_group') {
            const rg = await client.ringGroup.findUnique({
                where: { id: targetId },
                include: { tenant: true }
            });
            return rg ? `rg${rg.sequenceId}_${rg.tenant.customerCode}` : '';
        }
        if (type === 'ivr') {
            const ivr = await client.iVR.findUnique({
                where: { id: targetId },
                include: { tenant: true }
            });
            return ivr ? `ivr${ivr.sequenceId}_${ivr.tenant.customerCode}` : '';
        }
        if (type === 'schedule') {
            const sched = await client.operationalSchedule.findUnique({
                where: { id: targetId },
                include: { tenant: true }
            });
            return sched ? `sched${sched.sequenceId}_${sched.tenant.customerCode}` : '';
        }
        if (type === 'did_forward' || type === 'forward') {
            const forward = await client.dIDForward.findUnique({
                where: { id: targetId },
                include: { tenant: true }
            });
            return forward ? `fwd${forward.sequenceId}_${forward.tenant.customerCode}` : '';
        }
        return '';
    }

    private maskToWday(mask: number): string {
        const days: number[] = [];
        if (mask & 1) days.push(1); // Mon
        if (mask & 2) days.push(2);
        if (mask & 4) days.push(3);
        if (mask & 8) days.push(4);
        if (mask & 16) days.push(5);
        if (mask & 32) days.push(6);
        if (mask & 64) days.push(0); // Sun
        return days.join(',');
    }

    /**
     * Sync all Dialplans for a tenant
     * Resyncs Entities first, then DIDs
     */
    async syncAllDialplans(tenantId: string): Promise<void> {
        try {
            // 1. Sync Extensions
            const exts = await this.prisma.extension.findMany({ where: { tenantId } });
            for (const e of exts) await this.syncExtension(e.id);

            // 2. Sync Ring Groups
            const rgs = await this.prisma.ringGroup.findMany({ where: { tenantId } });
            for (const r of rgs) await this.syncRingGroup(r.id);

            // 3. Sync IVRs
            const ivrs = await this.prisma.iVR.findMany({ where: { tenantId } });
            for (const i of ivrs) await this.syncIVR(i.id);

            // 4. Sync DIDs
            const dids = await this.prisma.dID.findMany({ where: { tenantId } });
            for (const d of dids) await this.syncDID(d.id);

            this.logger.log(`Synced all dialplans for tenant ${tenantId}`);
        } catch (error) {
            this.logger.error(`Failed to sync tenant dialplans: ${error.message}`);
            throw error;
        }
    }

    /**
     * Sync a TFN to FreeSWITCH database
     * Same logic as DID but supports TFN model
     */


    // Deprecated helpers maintained for compatibility
    async deleteDialplan(key: string): Promise<void> {
        await this.freeswitchDB.deleteDialplan(key);
    }

    async syncExtensionRoutes(extensionId: string) { await this.syncExtension(extensionId); }
    async syncRingGroupRoutes(rgId: string) { await this.syncRingGroup(rgId); }
    async syncIVRRoutes(ivrId: string) { await this.syncIVR(ivrId); }

    /**
     * Recursively resolve menu targets to their actual dialplan keys
     */
    private async resolveMenuTargets(menu: any, tenantId: string): Promise<any> {
        if (!menu) return {};
        const resolved = JSON.parse(JSON.stringify(menu)); // Deep copy

        for (const key of Object.keys(resolved)) {
            const item = resolved[key];
            if (item.type === 'submenu' && item.children) {
                item.children = await this.resolveMenuTargets(item.children, tenantId);
            } else if (['extension', 'ring_group', 'ivr', 'schedule', 'did_forward', 'forward'].includes(item.type)) {
                if (item.target) {
                    let dialplanKey = '';

                    // Special handling for extensions: Target is usually "extensionNumber" (string), not UUID
                    if (item.type === 'extension') {
                        const ext = await this.prisma.extension.findFirst({
                            where: { extensionNumber: item.target, tenantId },
                            include: { tenant: true }
                        });
                        if (ext) {
                            dialplanKey = this.getExtensionDialplanKey(ext);
                        }
                    } else {
                        // Other types (RingGroup, IVR) uses UUID
                        dialplanKey = await this.resolveDialplanKey(item.type, item.target);
                    }

                    // Use the resolved key as the new target
                    if (dialplanKey) {
                        item.target = dialplanKey;
                    }
                }
            }
        }
        return resolved;
    }

    /**
     * Dynamically resolves the outbound gateway (host:port) for a tenant.
     * Uses tenant's assigned gateway, or falls back to system default database gateway.
     */
    async resolveOutboundGatewayForTenant(tenantId: string | null): Promise<string> {
        this.logger.log(`resolveOutboundGatewayForTenant called for tenantId: "${tenantId}"`);
        if (!tenantId) {
            const gw = await this.getDefaultSystemGateway();
            this.logger.log(`resolveOutboundGatewayForTenant: No tenantId provided. Using system default: "${gw}"`);
            return gw;
        }
        const tenant = await this.prisma.tenant.findUnique({
            where: { id: tenantId },
            include: { outboundEndpoint: true }
        });
        this.logger.log(`resolveOutboundGatewayForTenant: Tenant lookup result: customerCode="${tenant?.customerCode}", outboundEndpointId=${tenant?.outboundEndpointId}`);
        if (tenant?.outboundEndpoint) {
            const { sipHost, sipPort } = tenant.outboundEndpoint;
            const gw = `${sipHost}:${sipPort}`;
            this.logger.log(`resolveOutboundGatewayForTenant: Tenant has assigned outbound endpoint: "${gw}"`);
            return gw;
        }
        const gw = await this.getDefaultSystemGateway();
        this.logger.log(`resolveOutboundGatewayForTenant: Tenant has no assigned outbound endpoint. Using system default: "${gw}"`);
        return gw;
    }

    /**
     * Resolves the system default outbound gateway from database.
     * Priority: isSystemDefault endpoint → any active endpoint → env fallback.
     */
    async getDefaultSystemGateway(): Promise<string> {
        // 1. Look for the endpoint explicitly marked as system default
        const defaultEndpoint = await this.prisma.outboundEndpoint.findFirst({
            where: { isSystemDefault: true, isActive: true }
        });
        if (defaultEndpoint) {
            const gw = `${defaultEndpoint.sipHost}:${defaultEndpoint.sipPort}`;
            this.logger.log(`getDefaultSystemGateway: Found active system default endpoint (id=${defaultEndpoint.id}, name="${defaultEndpoint.name}"): "${gw}"`);
            return gw;
        }

        // 2. Fallback: pick the first active endpoint if none is marked as default
        const anyEndpoint = await this.prisma.outboundEndpoint.findFirst({
            where: { isActive: true },
            orderBy: { id: 'asc' },
        });
        if (anyEndpoint) {
            const gw = `${anyEndpoint.sipHost}:${anyEndpoint.sipPort}`;
            this.logger.warn(
                `getDefaultSystemGateway: No active system-default outbound endpoint found. Using first active endpoint (id=${anyEndpoint.id}, name="${anyEndpoint.name}"): "${gw}"`
            );
            return gw;
        }

        // 3. Last resort: env variable (should not happen in production)
        const envGateway = process.env.OUTBOUND_GATEWAY || 'localhost:5060';
        this.logger.error(
            `getDefaultSystemGateway: No active outbound endpoints found in the database! Falling back to OUTBOUND_GATEWAY env variable (value: "${process.env.OUTBOUND_GATEWAY}"). Resolved to: "${envGateway}"`
        );
        return envGateway;
    }

    /**
     * Synchronizes all forwarding routes (DIDs and TFNs) for a given tenant.
     */
    async syncTenantForwards(tenantId: string): Promise<void> {
        this.logger.log(`Syncing forwarding routes for tenant: ${tenantId}`);
        const [dids, tfns, forwards] = await Promise.all([
            this.prisma.dID.findMany({
                where: { tenantId, routeType: 'forward' },
                select: { id: true }
            }),
            this.prisma.tFN.findMany({
                where: { tenantId, routeType: 'forward' },
                select: { id: true }
            }),
            this.prisma.dIDForward.findMany({
                where: { tenantId },
                select: { id: true }
            })
        ]);

        for (const did of dids) {
            await this.syncDID(did.id);
        }
        for (const tfn of tfns) {
            await this.syncTFN(tfn.id);
        }
        for (const fwd of forwards) {
            await this.syncDIDForward(fwd.id);
        }
    }

    /**
     * Bulk synchronizes all forwarding routes for all tenants relying on the system default gateway.
     */
    async syncAllSystemDefaultForwards(): Promise<void> {
        this.logger.log('Starting bulk resync of system-default forwarding XMLs...');
        const tenantsWithoutGateway = await this.prisma.tenant.findMany({
            where: { outboundEndpointId: null },
            select: { id: true }
        });
        const tenantIds = tenantsWithoutGateway.map(t => t.id);

        const [dids, tfns, forwards] = await Promise.all([
            this.prisma.dID.findMany({
                where: {
                    tenantId: { in: tenantIds },
                    routeType: 'forward'
                },
                select: { id: true }
            }),
            this.prisma.tFN.findMany({
                where: {
                    tenantId: { in: tenantIds },
                    routeType: 'forward'
                },
                select: { id: true }
            }),
            this.prisma.dIDForward.findMany({
                where: { tenantId: { in: tenantIds } },
                select: { id: true }
            })
        ]);

        this.logger.log(`Found ${dids.length} DIDs, ${tfns.length} TFNs, and ${forwards.length} Forwards relying on system default. Syncing...`);

        for (const did of dids) {
            await this.syncDID(did.id);
        }
        for (const tfn of tfns) {
            await this.syncTFN(tfn.id);
        }
        for (const fwd of forwards) {
            await this.syncDIDForward(fwd.id);
        }
        this.logger.log('Bulk resync of system-default forwarding XMLs completed.');
    }
}
