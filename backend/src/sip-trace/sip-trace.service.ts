import {
  BadGatewayException, BadRequestException, Injectable, NotFoundException,
  OnModuleDestroy, ServiceUnavailableException,
} from '@nestjs/common';
import { Pool } from 'pg';
import { PrismaService } from '../prisma/prisma.service';

type TraceRow = {
  session_uuid: string; customer_id: string | null; direction: string | null;
  caller_number: string | null; destination_number: string | null;
  started_at: Date | null; ended_at: Date | null; first_leg_received_at: Date;
  a_leg_sip_call_id: string | null; b_leg_sip_call_ids: string[];
  merge_status: string; cdr_export_status: string; hangup_cause: string | null;
};
type Json = Record<string, any>;

@Injectable()
export class SipTraceService implements OnModuleDestroy {
  private pool?: Pool;

  constructor(private readonly prisma: PrismaService) {}

  async onModuleDestroy() { await this.pool?.end(); }

  private db() {
    if (!process.env.SIP_TRACE_DATABASE_URL) {
      throw new ServiceUnavailableException('SIP trace database is not configured');
    }
    this.pool ??= new Pool({ connectionString: process.env.SIP_TRACE_DATABASE_URL, max: 4,
      connectionTimeoutMillis: 3000, idleTimeoutMillis: 30000, statement_timeout: 5000 });
    return this.pool;
  }

  private date(value: string | undefined, fallback: number) {
    if (!value) return new Date(fallback);
    const date = new Date(value);
    if (!Number.isFinite(date.getTime())) throw new BadRequestException('Invalid date');
    return date;
  }

  async list(query: Record<string, string>) {
    const to = this.date(query.to, Date.now());
    const from = this.date(query.from, to.getTime() - 24 * 3600_000);
    if (from >= to || to.getTime() - from.getTime() > 31 * 86400_000) {
      throw new BadRequestException('Choose a time window of at most 31 days');
    }
    const requestedLimit = query.limit === undefined ? 25 : Number(query.limit);
    const requestedPage = query.page === undefined ? 1 : Number(query.page);
    if (!Number.isInteger(requestedLimit) || requestedLimit < 1 || requestedLimit > 100 ||
        !Number.isInteger(requestedPage) || requestedPage < 1 || requestedPage > 1000) {
      throw new BadRequestException('Invalid pagination');
    }
    const limit = requestedLimit;
    const page = requestedPage;
    const customer = (query.customerId || '').trim();
    const search = (query.search || '').trim();
    if (customer.length > 80 || search.length > 120) throw new BadRequestException('Search is too long');
    const values = [from, to, customer, search, limit + 1, (page - 1) * limit];
    const rows = await this.db().query<TraceRow>(`
      SELECT session_uuid, customer_id, direction, caller_number, destination_number,
             started_at, ended_at, first_leg_received_at, a_leg_sip_call_id,
             b_leg_sip_call_ids, merge_status, cdr_export_status, hangup_cause
      FROM live_call_event
      WHERE COALESCE(started_at, first_leg_received_at) >= $1
        AND COALESCE(started_at, first_leg_received_at) < $2
        AND ($3 = '' OR customer_id = $3)
        AND ($4 = '' OR session_uuid ILIKE '%' || $4 || '%'
             OR caller_number ILIKE '%' || $4 || '%'
             OR destination_number ILIKE '%' || $4 || '%'
             OR a_leg_sip_call_id ILIKE '%' || $4 || '%'
             OR $4 = ANY(b_leg_sip_call_ids))
      ORDER BY COALESCE(started_at, first_leg_received_at) DESC, id DESC
      LIMIT $5 OFFSET $6`, values);
    return { data: rows.rows.slice(0, limit).map(row => this.summary(row)),
      page, hasMore: rows.rows.length > limit };
  }

  private async tenantCustomerCode(tenantId: string) {
    if (!tenantId) throw new NotFoundException('Tenant not found');
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId }, select: { customerCode: true },
    });
    if (!tenant?.customerCode) throw new NotFoundException('Tenant trace identity not configured');
    return tenant.customerCode;
  }

  async tenantList(tenantId: string, query: Record<string, string>) {
    const customerCode = await this.tenantCustomerCode(tenantId);
    const page = query.page === undefined ? 1 : Number(query.page);
    const limit = query.limit === undefined ? 25 : Number(query.limit);
    if (!Number.isInteger(page) || page < 1 || page > 4 ||
        !Number.isInteger(limit) || limit < 1 || limit > 100 ||
        (page - 1) * limit >= 100) throw new BadRequestException('Invalid tenant trace page');
    const search = (query.search || '').trim();
    if (search.length > 120) throw new BadRequestException('Search is too long');
    // Rank first, filter second: search/time filters must never expose call 101+.
    const rows = await this.db().query<TraceRow>(`
      WITH latest AS (
        SELECT session_uuid, customer_id, direction, caller_number, destination_number,
               started_at, ended_at, first_leg_received_at, a_leg_sip_call_id,
               b_leg_sip_call_ids, merge_status, cdr_export_status, hangup_cause, id
        FROM live_call_event
        WHERE customer_id = $1 AND merge_status = 'READY'
        ORDER BY COALESCE(started_at, first_leg_received_at) DESC, id DESC
        LIMIT 100
      )
      SELECT session_uuid, customer_id, direction, caller_number, destination_number,
             started_at, ended_at, first_leg_received_at, a_leg_sip_call_id,
             b_leg_sip_call_ids, merge_status, cdr_export_status, hangup_cause
      FROM latest
      WHERE ($2 = '' OR session_uuid ILIKE '%' || $2 || '%'
             OR caller_number ILIKE '%' || $2 || '%'
             OR destination_number ILIKE '%' || $2 || '%'
             OR a_leg_sip_call_id ILIKE '%' || $2 || '%'
             OR $2 = ANY(b_leg_sip_call_ids))
      ORDER BY COALESCE(started_at, first_leg_received_at) DESC, id DESC
      LIMIT $3 OFFSET $4`, [customerCode, search,
        Math.min(limit + 1, 101 - (page - 1) * limit), (page - 1) * limit]);
    return { data: rows.rows.slice(0, limit).map(row => this.summary(row)),
      page, hasMore: rows.rows.length > limit, maxVisibleCalls: 100 };
  }

  private summary(row: TraceRow) {
    const { a_leg_sip_call_id, b_leg_sip_call_ids, ...rest } = row;
    return { ...rest, sipCallIds: this.callIds(row), traceAvailable: this.callIds(row).length > 0 };
  }

  private callIds(row: TraceRow) {
    return [...new Set([row.a_leg_sip_call_id, ...(row.b_leg_sip_call_ids || [])]
      .filter((id): id is string => Boolean(id && id.trim())))].slice(0, 50);
  }

  private async event(sessionUuid: string, tenantId?: string) {
    if (!/^[0-9a-fA-F-]{36}$/.test(sessionUuid)) throw new BadRequestException('Invalid session UUID');
    const customerCode = tenantId ? await this.tenantCustomerCode(tenantId) : null;
    const result = await this.db().query<TraceRow>(customerCode ? `
      WITH latest AS (
        SELECT session_uuid FROM live_call_event
        WHERE customer_id = $2 AND merge_status = 'READY'
        ORDER BY COALESCE(started_at, first_leg_received_at) DESC, id DESC
        LIMIT 100
      )
      SELECT event.session_uuid, event.customer_id, event.direction,
             event.caller_number, event.destination_number, event.started_at,
             event.ended_at, event.first_leg_received_at, event.a_leg_sip_call_id,
             event.b_leg_sip_call_ids, event.merge_status, event.cdr_export_status,
             event.hangup_cause
      FROM live_call_event AS event JOIN latest USING (session_uuid)
      WHERE event.session_uuid = $1 AND event.customer_id = $2 LIMIT 1` : `
      SELECT session_uuid, customer_id, direction, caller_number, destination_number,
             started_at, ended_at, first_leg_received_at, a_leg_sip_call_id,
             b_leg_sip_call_ids, merge_status, cdr_export_status, hangup_cause
      FROM live_call_event WHERE session_uuid = $1 LIMIT 1`,
      customerCode ? [sessionUuid, customerCode] : [sessionUuid]);
    if (!result.rows[0]) throw new NotFoundException('Call event not found');
    return result.rows[0];
  }

  private async messages(row: TraceRow) {
    const ids = this.callIds(row);
    if (!ids.length) return [];
    const start = (row.started_at || row.first_leg_received_at).getTime();
    const end = row.ended_at?.getTime() || Date.now();
    const base = process.env.HOMER_API_BASE_URL?.replace(/\/$/, '');
    const token = process.env.HOMER_API_TOKEN?.trim();
    if (!base || !token) throw new ServiceUnavailableException('Homer API is not configured');
    // Every query is constrained by server-owned Call-IDs and the call's time window.
    const body = { ...(ids.length === 1 ? { session_id: ids[0] } : { session_ids: ids }),
      proto_type: 1, event_type: 'call',
      timestamp: { from: start - 300000, to: Math.min(end + 300000, Date.now() + 300000) } };
    let response: Response;
    try {
      response = await fetch(`${base}/api/v4/transactions/messages`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json', 'Auth-Token': token },
        body: JSON.stringify(body), signal: AbortSignal.timeout(10000),
      });
    } catch { throw new BadGatewayException('Homer is unavailable'); }
    if (!response.ok) throw new BadGatewayException(`Homer returned HTTP ${response.status}`);
    let payload: Json;
    try { payload = await response.json() as Json; }
    catch { throw new BadGatewayException('Homer returned invalid JSON'); }
    const data = payload?.data;
    const rows: Json[] = Array.isArray(data) ? data : Array.isArray(data?.items) ? data.items : [];
    const allowed = new Set(ids);
    return rows.slice(0, 2000).map((item, index) => {
      const protocol = item.protocol_header || {};
      const detail = item.data_header || {};
      const callId = String(detail.call_id || item.sid || item.session_id || item.call_id || '');
      if (!allowed.has(callId)) return null;
      const raw = String(item.raw || item.payload || '');
      const dateValue = item.timestamp || item.create_date;
      const epoch = Number(dateValue || item.micro_ts || 0);
      const parsed = typeof dateValue === 'string' ? Date.parse(dateValue) : NaN;
      const timestampMs = Number(protocol.time_seconds) > 0
        ? Number(protocol.time_seconds) * 1000 + Number(protocol.time_useconds || 0) / 1000
        : Number.isFinite(parsed) ? parsed
          : epoch > 1e15 ? epoch / 1000 : epoch > 1e12 ? epoch : epoch * 1000;
      const method = String(detail.method || item.method || raw.split(/\r?\n/, 1)[0] || 'SIP');
      const responseCode = /^[1-6]\d\d$/.test(method) ? Number(method) : null;
      const cseqMethod = raw.match(/^CSeq:\s*\d+\s+([A-Z]+)\b/im)?.[1] || null;
      const hasSdp = /^Content-Type:\s*application\/sdp\b/im.test(raw);
      return { id: String(item.id || item.uuid || `${callId}-${timestampMs}-${index}`), callId,
        timestamp: Number.isFinite(timestampMs) && timestampMs > 0 ? new Date(timestampMs).toISOString() : null,
        timestampMs, method, responseCode, cseqMethod, hasSdp,
        src: `${protocol.src_ip || item.src_ip || '?'}:${protocol.src_port || item.src_port || '?'}`,
        dst: `${protocol.dst_ip || item.dst_ip || '?'}:${protocol.dst_port || item.dst_port || '?'}`,
        captureId: Number(protocol.capture_id ?? item.capture_id ?? 0), raw };
    }).filter((item): item is NonNullable<typeof item> => item !== null)
      .sort((a, b) => a.timestampMs - b.timestampMs);
  }

  async flow(sessionUuid: string, tenantId?: string) {
    const row = await this.event(sessionUuid, tenantId);
    const messages = await this.messages(row);
    const participants = [...new Set(messages.flatMap(message => [message.src, message.dst]))];
    const first = messages[0]?.timestampMs || 0;
    return { call: this.summary(row), participants,
      messages: messages.map(({ raw, ...message }) => ({ ...message,
        elapsedMs: message.timestampMs - first,
        fromIndex: participants.indexOf(message.src), toIndex: participants.indexOf(message.dst),
        rawAvailable: Boolean(raw) })) };
  }

  async raw(sessionUuid: string, messageId: string, tenantId?: string) {
    const row = await this.event(sessionUuid, tenantId);
    const message = (await this.messages(row)).find(item => item.id === messageId);
    if (!message) throw new NotFoundException('SIP message not found in this call');
    return { id: message.id, raw: this.redact(message.raw) };
  }

  private redact(raw: string) {
    return raw.replace(/^(Authorization|Proxy-Authorization|WWW-Authenticate|Proxy-Authenticate|P-Asserted-Identity|Remote-Party-ID):[^\r\n]*(?:\r?\n[ \t]+[^\r\n]*)*/gim,
      (_full, header) => `${header}: [REDACTED]`);
  }
}
