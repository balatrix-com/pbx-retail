import { Injectable, BadRequestException, ForbiddenException, HttpException, Inject } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { randomBytes, timingSafeEqual } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { FreeSwitchSyncService } from '../freeswitch/freeswitch-sync.service';
import { KamailioDBService } from '../freeswitch/kamailio-db.service';
import { CacheFlushService } from '../freeswitch/cache-flush.service';
import { LOOKUP_REDIS_CLIENT, LookupRedisService } from '../redis/lookup-redis.module';

@Injectable()
export class SubscriptionsService {
  constructor(private prisma: PrismaService, private http: HttpService, private config: ConfigService,
    private fs: FreeSwitchSyncService, private kamailio: KamailioDBService,
    private lookup: LookupRedisService, @Inject(LOOKUP_REDIS_CLIENT) private redis: any, private cache: CacheFlushService) {}
  authenticate(token: string) {
    const expected = Buffer.from(this.config.get<string>('SUBSCRIPTION_SERVICE_TOKEN') || '');
    const supplied = Buffer.from(token || '');
    if (!expected.length || expected.length !== supplied.length || !timingSafeEqual(expected, supplied)) throw new ForbiddenException('Invalid subscription service token');
  }
  async request(path: string, method = 'GET', body?: any) {
    const token = this.config.get<string>('SUBSCRIPTION_SERVICE_TOKEN');
    if (!token) throw new BadRequestException('Subscription service token is not configured');
    const base = (this.config.get<string>('SUB_BILLING_API_URL') || 'http://localhost:5005/api').replace(/\/$/, '');
    try {
      const response = await firstValueFrom(this.http.request({ url: `${base}/subscription-management/${path}`, method,
        data: body, timeout: 10000, headers: { 'x-subscription-token': token } }));
      return response.data.data;
    } catch (e: any) { throw new HttpException(e.response?.data?.message || 'Subscription billing service unavailable', e.response?.status || 503); }
  }
  async tenant(id: string) {
    if (!id) throw new BadRequestException('Select a tenant');
    const t = await this.prisma.tenant.findUnique({ where: { id } });
    if (!t?.subBillingCustomerId && !t?.customerCode) throw new BadRequestException('Tenant is not linked to billing');
    return t!;
  }
  async list(tenantId: string): Promise<any[]> {
    const t = await this.tenant(tenantId);
    return this.request(`customer/${encodeURIComponent(t.subBillingCustomerId || t.customerCode!)}`);
  }
  async owned(tenantId: string, id: string) {
    const rows = await this.list(tenantId);
    const s = rows.find(s => s.id === id || s.subscription_id === id);
    if (!s) throw new ForbiddenException('Subscription does not belong to this tenant');
    return s;
  }
  async activate(tenantId: string, input: any, actor: string) {
    await this.assertMutable(tenantId);
    const t = await this.tenant(tenantId);
    const result = await this.request('activate', 'POST', { customer_id: t.subBillingCustomerId || t.customerCode,
      plan_id: input.plan_id, duration_unit: input.duration_unit, duration_count: input.duration_count,
      auto_renew: input.auto_renew, payment_mode: input.payment_mode, operation_key: input.operation_key, actor_id: actor });
    await this.reconcile(tenantId); return result;
  }
  async action(tenantId: string, id: string, action: string, method: string, body?: any) {
    if (method !== 'GET') await this.assertMutable(tenantId);
    const s = await this.owned(tenantId, id);
    const result = await this.request(`${s.id}/${action}`, method, body);
    if (method !== 'GET') await this.reconcile(tenantId);
    return result;
  }
  async move(tenantId: string, input: any, actor: string) {
    const rows = await this.list(tenantId);
    if (!rows.some(s => s.assets.some((a: any) => a.id === input.asset_id && a.type === input.type))) throw new ForbiddenException('Asset does not belong to this tenant');
    await this.owned(tenantId, input.target_subscription_id);
    const result = await this.request('assets/reassign', 'POST', { asset_id: input.asset_id, type: input.type, target_subscription_id: input.target_subscription_id, actor_id: actor });
    await this.reconcile(tenantId); return result;
  }
  async capacity(tenantId: string, resource: string, selected?: string) {
    await this.assertMutable(tenantId);
    const rows = (await this.list(tenantId)).filter(s => ['active', 'grace'].includes(s.status));
    const eligible = rows.filter(s => Number(s.entitlement_snapshot[resource] || 0) > Number(s.usage[resource] || 0));
    const s = selected ? eligible.find(s => s.id === selected) : eligible[0];
    if (!s) throw new BadRequestException('No active subscription has available capacity for this resource');
    return s;
  }
  async assignMonitoring(tenantId: string, user: any, selected?: string) {
    await this.assertMutable(tenantId);
    const rows = await this.list(tenantId);
    const existing = rows.find(s => s.assets.some((a: any) => a.type === 'monitoring' && a.value === user.id && a.status === 'active'));
    const s = selected ? await this.owned(tenantId, selected) : existing || await this.capacity(tenantId, 'monitoring_extensions');
    await this.request('monitoring/assign', 'POST', { subscription_id: s.id, user_id: user.id, name: user.name, email: user.email, extension: user.monitoringExtension, actor_id: user.id });
    await this.reconcile(tenantId);
  }
  async unassignMonitoring(tenantId: string, userId: string) {
    const t = await this.tenant(tenantId);
    await this.request('monitoring/unassign', 'POST', { user_id: userId, customer_id: t.subBillingCustomerId || t.customerCode });
    await this.reconcile(tenantId);
  }
  async transferMonitoring(tenantId: string, from: string, to: any) {
    const rows = await this.list(tenantId);
    const owner = rows.find(s => s.assets.some((a: any) => a.type === 'monitoring' && a.value === from && a.status === 'active'));
    if (!owner) throw new BadRequestException('Source monitoring seat has no active subscription owner');
    await this.request('monitoring/transfer','POST',{subscription_id:owner.id,from_user_id:from,to_user_id:to.id,name:to.name,email:to.email,extension:to.monitoringExtension});
    await this.reconcile(tenantId);
  }
  async assertEditable(type: string, id: string) {
    const rows = await this.prisma.$queryRawUnsafe<any[]>('SELECT status FROM subscription_asset_assignments WHERE asset_type=$1 AND resource_id=$2', type, id);
    if (rows.length && !rows.some(r => r.status === 'active')) throw new BadRequestException('This asset is frozen or released. Renew or reassign its subscription first.');
  }
  async assignExtension(tenantId:string,extension:any,selected?:string) {
    const s=await this.capacity(tenantId,'extensions',selected);
    return this.request('extensions/assign','POST',{subscription_id:s.id,extension:extension.extensionNumber,name:extension.name});
  }
  async unassignExtension(tenantId:string,extension:any) {
    const owner=(await this.list(tenantId)).find(s=>s.assets.some((a:any)=>a.type==='extension' && a.value===extension.extensionNumber && a.status!=='released'));
    if(!owner)throw new BadRequestException('Extension has no subscription owner; reconcile first');
    return this.request('extensions/unassign','POST',{subscription_id:owner.id,extension:extension.extensionNumber});
  }
  async receive(input: any) {
    if (!input.event_id || !input.customer_id) throw new BadRequestException('Missing subscription event identity');
    const t = await this.prisma.tenant.findFirst({ where: { OR: [{ subBillingCustomerId: input.customer_id }, { customerCode: input.customer_id }] } });
    if (!t) throw new BadRequestException('Unknown billing customer');
    const done = await this.prisma.$queryRawUnsafe<any[]>('SELECT event_id FROM subscription_event_receipts WHERE event_id=$1', input.event_id);
    if (done.length) return { success: true };
    await this.reconcile(t.id);
    await this.prisma.$transaction(async tx => {
      const inserted = await tx.$executeRawUnsafe('INSERT INTO subscription_event_receipts(event_id,tenant_id) VALUES($1,$2) ON CONFLICT DO NOTHING', input.event_id, t.id);
      if (inserted && (['grace', 'freeze', 'reactivate', 'release'].includes(input.action) || String(input.action).startsWith('retention_reminder_'))) await tx.notification.create({ data: {
        tenantId: t.id, type: 'SUBSCRIPTION', title: `Subscription ${input.action}`, message: `Subscription ${input.subscription_id}: ${input.action}. Check Subscriptions for assets and recovery options.` } });
      if(inserted && (['grace','freeze','release'].includes(input.action) || String(input.action).startsWith('retention_reminder_'))) {
        const admins=await tx.user.findMany({where:{role:'SUPER_ADMIN',status:'ACTIVE'},select:{id:true,tenantId:true}});
        for(const admin of admins)await tx.notification.create({data:{tenantId:admin.tenantId || t.id,userId:admin.id,type:'SUBSCRIPTION',title:`${t.customerCode}: subscription ${input.action}`,message:`Subscription ${input.subscription_id}: ${input.action}. Review tenant subscriptions for recovery or retention.`}});
      }
    });
    return { success: true };
  }
  async reconcile(tenantId: string) {
    return this.prisma.$transaction(async tx => {
      await tx.$queryRaw`SELECT 1 FROM pg_advisory_xact_lock(hashtext(${`subscription-reconcile:${tenantId}`}))`;
      await this.reconcileLocked(tenantId);
    }, { timeout: 120000 });
  }
  private async assertMutable(tenantId: string) {
    const jobs = await this.prisma.$queryRawUnsafe<any[]>('SELECT tenant_id FROM tenant_archive_jobs WHERE tenant_id=$1', tenantId);
    if (jobs.length) throw new BadRequestException('Customer is archiving or archived; only historical access is allowed');
  }
  private async reconcileLocked(tenantId: string) {
    const archival = await this.prisma.$queryRawUnsafe<any[]>('SELECT tenant_id FROM tenant_archive_jobs WHERE tenant_id=$1', tenantId);
    if (archival.length) return; // Never recreate SIP assets after archive has begun.
    // Re-read authoritative state: delayed/replayed events must never restore stale ownership.
    let rows = await this.list(tenantId);
    for (const s of rows.filter(s => s.subscription_type === 'base')) {
      const plan = await this.prisma.plan.findUnique({where:{subBillingPlanId:s.plan_id}});
      if (!plan) throw new BadRequestException('Base plan must be synchronized from the catalog before activation');
      const state: any = ['active','grace'].includes(s.status) ? 'ACTIVE' : s.status === 'cancelled' ? 'ARCHIVED' : 'EXPIRED';
      const data = {tenantId,planId:plan.id,status:state,startDate:new Date(s.start_date),endDate:new Date(s.end_date),remainingFreeMinutes:0};
      const current = await this.prisma.subscription.findFirst({where:{tenantId,OR:[{subBillingSubscriptionId:s.id},{subBillingSubscriptionId:s.subscription_id}]}});
      if (current) await this.prisma.subscription.update({where:{id:current.id},data:{...data,subBillingSubscriptionId:s.id}});
      else await this.prisma.subscription.create({data:{...data,subBillingSubscriptionId:s.id}});
    }
    const users = await this.prisma.user.findMany({ where: { tenantId, monitoringEnabled: true } });
    for (const u of users) {
      if (rows.some(s => s.assets.some((a: any) => a.type === 'monitoring' && a.value === u.id))) continue;
      const owner = rows.find(s => ['active','grace'].includes(s.status) && Number(s.usage.monitoring_extensions) < Number(s.entitlement_snapshot.monitoring_extensions));
      if (!owner) throw new BadRequestException(`Existing monitoring user ${u.email} has no subscription capacity; reconciliation required`);
      await this.request('monitoring/assign', 'POST', { subscription_id: owner.id, user_id: u.id, name: u.name, email: u.email, extension: u.monitoringExtension, actor_id: 'migration' });
      rows = await this.list(tenantId);
    }
    const assetIds=rows.flatMap(s=>s.assets.map((a:any)=>a.id));
    await this.prisma.$executeRawUnsafe(`UPDATE subscription_asset_assignments SET status='released',updated_at=now()
      WHERE tenant_id=$1 AND billing_asset_id NOT IN (SELECT jsonb_array_elements_text($2::jsonb))`,tenantId,JSON.stringify(assetIds));
    for (const s of rows) for (const asset of s.assets) {
      if(asset.status==='released' && rows.some(owner=>owner.assets.some((other:any)=>other.id!==asset.id && other.type===asset.type && other.value===asset.value && other.status==='active'))) {
        await this.prisma.$executeRawUnsafe("UPDATE subscription_asset_assignments SET status='released',updated_at=now() WHERE billing_asset_id=$1",asset.id);
        continue;
      }
      await this.project(tenantId, s, asset);
    }
  }
  private async project(tenantId: string, s: any, a: any) {
    let resource: any;
    if (a.type === 'did') resource = await this.prisma.dID.findFirst({ where: { tenantId, number: a.value }, include: { tenant: true } });
    if (a.type === 'tfn') resource = await this.prisma.tFN.findFirst({ where: { tenantId, number: a.value }, include: { tenant: true } });
    if (a.type === 'monitoring') resource = await this.prisma.user.findFirst({ where: { tenantId, id: a.value } });
    if (a.type === 'extension') {
      resource = await this.prisma.extension.findFirst({ where: { tenantId, extensionNumber: a.value }, include: { tenant: true } });
      if (!resource && a.status === 'active') {
        const conflict = await this.prisma.user.findFirst({ where: { monitoringExtension: a.value } });
        if (conflict) throw new BadRequestException('Billing extension conflicts with a monitoring extension');
        resource = await this.prisma.extension.create({ data: { tenantId, extensionNumber: a.value, sipUsername: a.value,
          sipPassword: randomBytes(18).toString('hex'), name: `Extension ${a.value}`, isActive: true }, include: { tenant: true } });
      }
    }
    if (!resource) return;
    const prior = (await this.prisma.$queryRawUnsafe<any[]>('SELECT * FROM subscription_asset_assignments WHERE billing_asset_id=$1', a.id))[0];
    const active = ['active', 'grace'].includes(s.status) && a.status === 'active';
    const status = active ? 'active' : a.status === 'released' ? 'released' : 'frozen';
    let before = prior?.before_state || {};
    if (status !== 'active' && (!prior || prior.status === 'active')) before = { isActive: resource.isActive, status: resource.status, monitoringEnabled: resource.monitoringEnabled };
    // Persist the original state BEFORE external calls. A partial failure can then be retried safely.
    await this.prisma.$executeRawUnsafe(`INSERT INTO subscription_asset_assignments(billing_asset_id,tenant_id,subscription_id,asset_type,resource_id,status,before_state)
      VALUES($1,$2,$3,$4,$5,$6,$7::jsonb) ON CONFLICT(billing_asset_id) DO UPDATE SET subscription_id=EXCLUDED.subscription_id,status=EXCLUDED.status,before_state=EXCLUDED.before_state,updated_at=now()`,
      a.id, tenantId, s.id, a.type, resource.id, status, JSON.stringify(before));
    const restoring = active && prior && Object.keys(before).length > 0;
    if (a.type === 'did' || a.type === 'tfn') {
      if (!active) {
        if (a.type === 'did') await this.prisma.dID.update({ where: { id: resource.id }, data: { isActive: false } });
        else await this.prisma.tFN.update({ where: { id: resource.id }, data: { status: 'HELD' } });
        if (a.type === 'did') await this.fs.deleteDID(resource); else await this.fs.deleteTFN(resource);
        await this.cache.flushDID(this.lookup.normalizeNumber(resource.number), true);
        if (!this.redis.isOpen) throw new Error('Lookup Redis unavailable');
        await this.redis.del(`lookup:v1:number:${this.lookup.normalizeNumber(resource.number)}`);
      } else if (restoring) {
        if (a.type === 'did') await this.prisma.dID.update({ where: { id: resource.id }, data: { isActive: before.isActive !== false } });
        else await this.prisma.tFN.update({ where: { id: resource.id }, data: { status: before.status || 'ASSIGNED' } });
        if (a.type === 'did') await this.fs.syncDID(resource.id); else await this.fs.syncTFN(resource.id);
        await this.cache.flushDID(this.lookup.normalizeNumber(resource.number), true);
        await this.lookup.updateNumberLookup(resource.number, tenantId);
      }
    } else if (a.type === 'extension') {
      if (!active) { await this.prisma.extension.update({ where: { id: resource.id }, data: { isActive: false } }); await this.fs.deleteExtension(resource); await this.cache.flushCustomer(resource.tenant.customerCode, true); }
      else if (restoring || !prior) { await this.prisma.extension.update({ where: { id: resource.id }, data: { isActive: before.isActive !== false } }); await this.fs.syncExtension(resource.id); if (restoring) await this.cache.flushCustomer(resource.tenant.customerCode, true); }
    } else if (a.type === 'monitoring') {
      const extension = a.metadata?.extension || resource.monitoringExtension;
      await this.prisma.$executeRawUnsafe(`INSERT INTO monitoring_seat_assignments(user_id,tenant_id,sub_billing_subscription_id,extension,status)
        VALUES($1,$2,$3,$4,$5) ON CONFLICT(user_id) DO UPDATE SET sub_billing_subscription_id=EXCLUDED.sub_billing_subscription_id,extension=EXCLUDED.extension,status=EXCLUDED.status,
        frozen_at=CASE WHEN EXCLUDED.status='frozen' THEN now() ELSE NULL END,released_at=CASE WHEN EXCLUDED.status='released' THEN now() ELSE NULL END`, resource.id, tenantId, s.id, extension || '', status);
      if (!active) {
        await this.prisma.user.update({ where: { id: resource.id }, data: { monitoringEnabled: false,
          ...(status==='released' ? {monitoringExtension:null,monitoringSecret:null} : {}) } });
        const reused = extension && await this.prisma.user.findFirst({where:{monitoringExtension:extension,monitoringEnabled:true,id:{not:resource.id}}});
        if (extension && !reused) await this.kamailio.deleteSubscriber(extension, true);
        if (!this.redis.isOpen) throw new Error('Redis unavailable; monitoring revocation must be retried');
        await this.redis.publish('monitor_seat_changes', JSON.stringify({userId:resource.id}));
      }
      else if (restoring) { await this.prisma.user.update({ where: { id: resource.id }, data: { monitoringEnabled: before.monitoringEnabled !== false } });
        if (before.monitoringEnabled !== false && extension && resource.monitoringSecret) await this.kamailio.syncSubscriber(extension, resource.monitoringSecret, true); }
    }
    if (active && restoring) await this.prisma.$executeRawUnsafe("UPDATE subscription_asset_assignments SET before_state='{}' WHERE billing_asset_id=$1", a.id);
  }
}
