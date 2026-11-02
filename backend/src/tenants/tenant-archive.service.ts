import { BadRequestException, Injectable, Logger, NotFoundException, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { PrismaService } from '../prisma/prisma.service';
import { FreeSwitchSyncService } from '../freeswitch/freeswitch-sync.service';
import { KamailioDBService } from '../freeswitch/kamailio-db.service';
import { CacheFlushService } from '../freeswitch/cache-flush.service';
import { LookupRedisService } from '../redis/lookup-redis.module';

@Injectable()
export class TenantArchiveService implements OnModuleInit, OnModuleDestroy {
    private logger = new Logger(TenantArchiveService.name);
    private timer?: ReturnType<typeof setInterval>;
    private running = new Set<string>();
    constructor(private prisma: PrismaService, private fs: FreeSwitchSyncService, private kamailio: KamailioDBService,
        private cache: CacheFlushService, private lookup: LookupRedisService, private http: HttpService, private config: ConfigService) {}

    onModuleInit() { this.timer = setInterval(() => void this.retryPending(), 30000); this.timer.unref(); }
    onModuleDestroy() { if (this.timer) clearInterval(this.timer); }
    async status(id: string) {
        const rows = await this.prisma.$queryRawUnsafe<any[]>('SELECT * FROM tenant_archive_jobs WHERE tenant_id=$1', id);
        return rows[0] || null;
    }
    private async history(tx: any, id: string, event: string, actor: string, metadata = {}) {
        await tx.$executeRawUnsafe('INSERT INTO tenant_lifecycle_history(tenant_id,event,actor_id,metadata) VALUES($1,$2,$3,$4::jsonb)', id, event, actor, JSON.stringify(metadata));
    }
    async request(id: string, actor: string) {
        await this.prisma.$transaction(async tx => {
            await tx.$queryRawUnsafe('SELECT pg_advisory_xact_lock(hashtext($1))', `tenant-archive:${id}`);
            const tenant = await tx.tenant.findUnique({ where: { id } });
            if (!tenant) throw new NotFoundException('Tenant not found');
            if (await tx.user.count({ where: { tenantId: id, role: 'SUPER_ADMIN', status: { not: 'DELETED' } } })) throw new BadRequestException('Cannot archive a tenant containing platform Super Admins');
            await tx.$executeRawUnsafe(`INSERT INTO tenant_archive_jobs(tenant_id,actor_id) VALUES($1,$2) ON CONFLICT DO NOTHING`, id, actor);
            if (tenant.status !== 'ARCHIVED') {
                await tx.tenant.update({ where: { id }, data: { serviceBlocked: true, status: 'SUSPENDED' } });
                await tx.extension.updateMany({ where: { tenantId: id }, data: { isActive: false } });
                await tx.dID.updateMany({ where: { tenantId: id }, data: { isActive: false } });
                await tx.tFN.updateMany({ where: { tenantId: id }, data: { status: 'HELD' } });
                await tx.outboundEndpoint.updateMany({ where: { tenantId: id }, data: { isActive: false } });
                await tx.$executeRawUnsafe(`INSERT INTO held_number_inventory(number,number_type,tenant_id,resource_id)
                  SELECT number,'DID',"tenantId",id FROM dids WHERE "tenantId"=$1 ON CONFLICT DO NOTHING`, id);
                await tx.$executeRawUnsafe(`INSERT INTO held_number_inventory(number,number_type,tenant_id,resource_id)
                  SELECT number,'TFN',"tenantId",id FROM tfns WHERE "tenantId"=$1 ON CONFLICT DO NOTHING`, id);
                await this.history(tx, id, 'ARCHIVE_REQUESTED', actor);
            }
        });
        const tenant = await this.prisma.tenant.findUniqueOrThrow({ where: { id } });
        if (tenant.customerCode) await this.lookup.syncTenantServiceState(tenant.customerCode);
        void this.process(id).catch(e => this.logger.error(e.message));
        return this.status(id);
    }
    private async billing(tenant: any, action: string, input: any) {
        const customer = tenant.subBillingCustomerId || tenant.customerCode;
        if (!customer) return;
        const token = this.config.get<string>('SUBSCRIPTION_SERVICE_TOKEN');
        if (!token) throw new Error('Subscription service token is required for archive');
        const base = (this.config.get<string>('SUB_BILLING_API_URL') || 'http://localhost:5005/api').replace(/\/$/, '');
        const response = await firstValueFrom(this.http.post(`${base}/customer-lifecycle/${encodeURIComponent(customer)}/${action}`, input,
            { timeout: 15000, headers: { 'x-subscription-token': token } }));
        if (response.data.success !== true) throw new Error('Billing archive rejected');
    }
    private async checkpoint(id: string, phase: string, token: string, actor: string) {
        await this.prisma.$transaction(async tx => {
            const n = await tx.$executeRawUnsafe(`UPDATE tenant_archive_jobs SET phase=$2,state=$2,last_error=NULL,updated_at=now() WHERE tenant_id=$1 AND lease_token=$3 AND lease_until>now()`, id, phase, token);
            if (!n) throw new Error('Archive lease was lost');
            await this.history(tx, id, phase, actor);
        });
    }
    private async assertLease(id: string, token: string) {
        const rows = await this.prisma.$queryRawUnsafe<any[]>('SELECT 1 FROM tenant_archive_jobs WHERE tenant_id=$1 AND lease_token=$2 AND lease_until>now()', id, token);
        if (!rows.length) throw new Error('Archive lease was lost');
    }
    private async teardown(tenant: any, token: string) {
        const id = tenant.id;
        const extensions = await this.prisma.extension.findMany({ where: { tenantId: id }, include: { tenant: true } });
        for (const extension of extensions) { await this.assertLease(id, token); await this.fs.deleteExtension(extension); }
        const users = await this.prisma.user.findMany({ where: { tenantId: id, monitoringExtension: { not: null } } });
        for (const user of users) if (user.monitoringExtension) { await this.assertLease(id, token); await this.kamailio.deleteSubscriber(user.monitoringExtension, true); }
        await this.assertLease(id, token);
        if (tenant.customerCode) { await this.fs.bulkDeleteTenantData(tenant.customerCode, true); await this.cache.flushCustomer(tenant.customerCode, true); }
        const dids = await this.prisma.dID.findMany({ where: { tenantId: id }, include: { tenant: true } });
        const tfns = await this.prisma.tFN.findMany({ where: { tenantId: id }, include: { tenant: true } });
        for (const did of dids) { await this.assertLease(id, token); await this.fs.deleteDID(did); }
        for (const tfn of tfns) { await this.assertLease(id, token); await this.fs.deleteTFN(tfn); }
        for (const number of [...dids, ...tfns]) await this.cache.flushDID(this.lookup.normalizeNumber(number.number), true);
        await this.lookup.deleteTenantLookups(id, true);
        const ips = await this.prisma.inboundWhitelist.findMany({ where: { tenantId: id } });
        const endpoints = await this.prisma.outboundEndpoint.findMany({ where: { tenantId: id } });
        for (const entry of [...ips.map(i => ({ ip: i.ipAddress, port: i.port })), ...endpoints.map(e => ({ ip: e.sipHost, port: e.sipPort }))]) {
            const owners = await this.prisma.inboundWhitelist.count({ where: { tenantId: { not: id }, ipAddress: entry.ip, port: entry.port, tenant: { status: { not: 'ARCHIVED' } } } });
            const trunks = await this.prisma.outboundEndpoint.count({ where: { tenantId: { not: id }, sipHost: entry.ip, sipPort: entry.port, tenant: { status: { not: 'ARCHIVED' } } } });
            if (!owners && !trunks) { await this.assertLease(id, token); await this.kamailio.removeCarrierIP(entry.ip, entry.port, true); }
        }
    }
    async process(id: string) {
        if (this.running.has(id)) return;
        const token = randomUUID();
        const jobs = await this.prisma.$queryRawUnsafe<any[]>(`UPDATE tenant_archive_jobs SET lease_token=$2,lease_until=now()+interval '5 minutes',attempts=attempts+1
          WHERE tenant_id=$1 AND state<>'ARCHIVED' AND (lease_until IS NULL OR lease_until<now()) RETURNING *`, id, token);
        if (!jobs.length) return;
        this.running.add(id);
        const heartbeat = setInterval(() => void this.prisma.$executeRawUnsafe(`UPDATE tenant_archive_jobs SET lease_until=now()+interval '5 minutes' WHERE tenant_id=$1 AND lease_token=$2`, id, token).catch(e => this.logger.error(e.message)), 30000);
        heartbeat.unref();
        const job = jobs[0];
        try {
            const tenant = await this.prisma.tenant.findUniqueOrThrow({ where: { id } });
            if (tenant.customerCode) await this.lookup.syncTenantServiceState(tenant.customerCode);
            if (job.phase === 'ARCHIVED') {
                await this.checkpoint(id, 'ARCHIVED', token, job.actor_id);
                await this.prisma.$executeRawUnsafe('UPDATE tenant_archive_jobs SET lease_until=NULL WHERE tenant_id=$1 AND lease_token=$2', id, token);
            }
            if (job.phase === 'ARCHIVE_REQUESTED') {
                await this.teardown(tenant, token);
                await this.checkpoint(id, 'TELECOM_TORN_DOWN', token, job.actor_id);
                job.phase = 'TELECOM_TORN_DOWN';
            }
            if (job.phase === 'TELECOM_TORN_DOWN') {
                await this.assertLease(id, token);
                await this.billing(tenant, 'archive', { actor_id: job.actor_id });
                await this.checkpoint(id, 'BILLING_ARCHIVED', token, job.actor_id);
                job.phase = 'BILLING_ARCHIVED';
            }
            if (job.phase === 'BILLING_ARCHIVED') {
                await this.prisma.$transaction(async tx => {
                    const own = await tx.$queryRawUnsafe<any[]>('SELECT lease_token FROM tenant_archive_jobs WHERE tenant_id=$1 FOR UPDATE', id);
                    if (own[0]?.lease_token !== token) throw new Error('Archive lease was lost');
                    await tx.dID.updateMany({ where: { tenantId: id }, data: { isActive: false, routeTargetId: null, routeType: null } });
                    await tx.tFN.updateMany({ where: { tenantId: id }, data: { status: 'HELD', routeTargetId: null, routeType: null } });
                    await tx.ringGroupMember.deleteMany({ where: { extension: { tenantId: id } } });
                    await tx.ringGroup.deleteMany({ where: { tenantId: id } });
                    await tx.iVR.deleteMany({ where: { tenantId: id } });
                    await tx.dIDForward.deleteMany({ where: { tenantId: id } });
                    await tx.operationalSchedule.deleteMany({ where: { tenantId: id } });
                    await tx.extension.deleteMany({ where: { tenantId: id } });
                    await tx.audioFile.deleteMany({ where: { tenantId: id } });
                    await tx.subscription.updateMany({ where: { tenantId: id }, data: { status: 'ARCHIVED' } });
                    await tx.$executeRawUnsafe("UPDATE subscription_asset_assignments SET status='frozen',updated_at=now() WHERE tenant_id=$1 AND status<>'released'", id);
                    await tx.$executeRawUnsafe("UPDATE monitoring_seat_assignments SET status='frozen',frozen_at=COALESCE(frozen_at,now()) WHERE tenant_id=$1 AND status<>'released'", id);
                    const users = await tx.user.findMany({ where: { tenantId: id } });
                    for (const user of users) await tx.user.update({ where: { id: user.id }, data: { email: `archived-${user.id}@archived.invalid`, password: null, refreshToken: null,
                        inviteToken: null, inviteTokenExpiry: null, status: 'DELETED', monitoringEnabled: false, monitoringExtension: null, monitoringSecret: null } });
                    await tx.tenant.update({ where: { id }, data: { status: 'ARCHIVED', serviceBlocked: true } });
                    await this.history(tx, id, 'ARCHIVED', job.actor_id);
                    await tx.$executeRawUnsafe("UPDATE tenant_archive_jobs SET phase='ARCHIVED',state='ARCHIVED',last_error=NULL,lease_until=NULL,updated_at=now() WHERE tenant_id=$1 AND lease_token=$2", id, token);
                }, { timeout: 60000 });
                job.phase = 'ARCHIVED';
                if (tenant.customerCode) await this.lookup.syncTenantServiceState(tenant.customerCode);
            }
        } catch (error) {
            await this.prisma.$transaction(async tx => {
                await tx.$executeRawUnsafe("UPDATE tenant_archive_jobs SET state='ARCHIVE_FAILED',last_error=$3,lease_until=NULL,updated_at=now() WHERE tenant_id=$1 AND lease_token=$2", id, token, String(error.message).slice(0,1000));
                await this.history(tx, id, 'ARCHIVE_FAILED', job.actor_id, { phase: job.phase, error: String(error.message).slice(0,1000) });
            });
            this.logger.error(`Archive ${id} failed at ${job.phase}: ${error.message}`);
        } finally { clearInterval(heartbeat); this.running.delete(id); }
    }
    private async retryPending() {
        try {
            const jobs = await this.prisma.$queryRawUnsafe<any[]>("SELECT tenant_id FROM tenant_archive_jobs WHERE state<>'ARCHIVED' AND (lease_until IS NULL OR lease_until<now()) ORDER BY updated_at LIMIT 2");
            for (const job of jobs) void this.process(job.tenant_id).catch(e => this.logger.error(e.message));
        } catch (error) { this.logger.warn(`Archive retry unavailable: ${error.message}`); }
    }
    async releaseNumbers(id: string, actor: string, input: any) {
        if (input.provider_confirmed !== true || !String(input.reason || '').trim()) throw new BadRequestException('Provider confirmation and reason are required');
        const tenant = await this.prisma.tenant.findUniqueOrThrow({ where: { id } });
        if (tenant.status !== 'ARCHIVED') throw new BadRequestException('Tenant must be archived before releasing held numbers');
        await this.billing(tenant, 'release-numbers', { ...input, actor_id: actor });
        await this.prisma.$transaction(async tx => {
            await tx.$queryRawUnsafe('SELECT pg_advisory_xact_lock(hashtext($1))', `tenant-number-release:${id}`);
            await tx.tFN.updateMany({ where: { tenantId: id, status: 'HELD' }, data: { tenantId: null, status: 'AVAILABLE', routeType: null, routeTargetId: null } });
            await tx.dID.deleteMany({ where: { tenantId: id, isActive: false } });
            await tx.$executeRawUnsafe("UPDATE held_number_inventory SET status='RELEASED',released_at=now() WHERE tenant_id=$1 AND status='HELD'", id);
            await this.history(tx, id, 'NUMBERS_RELEASED', actor, { reason: input.reason });
        });
        return { released: true };
    }
}
