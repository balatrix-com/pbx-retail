import { NotFoundException } from '@nestjs/common';
import { SipTraceService } from './sip-trace.service';

const event = {
  session_uuid: '06cc594c-e616-46c6-9bc0-aceeae73c3ef', customer_id: 'U1001',
  direction: 'OUTBOUND', caller_number: '1001', destination_number: '15551234567',
  started_at: new Date('2026-10-21T10:00:00Z'), ended_at: new Date('2026-10-21T10:01:00Z'),
  first_leg_received_at: new Date('2026-10-21T10:01:02Z'), a_leg_sip_call_id: 'a@test',
  b_leg_sip_call_ids: ['b@test'], merge_status: 'READY', cdr_export_status: 'COMPLETED', hangup_cause: null,
};

describe('SipTraceService', () => {
  const tenantLookup = jest.fn();
  const service = new SipTraceService({ tenant: { findUnique: tenantLookup } } as any);
  afterEach(() => jest.restoreAllMocks());

  it('merges only indexed A/B legs in timestamp order', async () => {
    jest.spyOn(service as any, 'event').mockResolvedValue(event);
    jest.spyOn(service as any, 'messages').mockResolvedValue([
      { id: '1', callId: 'a@test', timestamp: '2026-10-21T10:00:00Z', timestampMs: 1000, method: 'INVITE', src: 'A:1', dst: 'B:2', captureId: 62, raw: 'INVITE' },
      { id: '2', callId: 'b@test', timestamp: '2026-10-21T10:00:01Z', timestampMs: 2000, method: '200', src: 'B:2', dst: 'A:1', captureId: 62, raw: 'SIP/2.0 200' },
    ]);
    const result = await service.flow(event.session_uuid);
    expect(result.participants).toEqual(['A:1', 'B:2']);
    expect(result.messages.map(message => message.callId)).toEqual(['a@test', 'b@test']);
    expect(result.messages[1].elapsedMs).toBe(1000);
    expect(result.messages[0]).not.toHaveProperty('raw');
  });

  it('includes SIP response, CSeq and SDP labels without exposing packet bodies in the flow', async () => {
    const originalBase = process.env.HOMER_API_BASE_URL;
    const originalToken = process.env.HOMER_API_TOKEN;
    process.env.HOMER_API_BASE_URL = 'http://127.0.0.1:9088';
    process.env.HOMER_API_TOKEN = 'test-token';
    jest.spyOn(service as any, 'event').mockResolvedValue(event);
    jest.spyOn(global, 'fetch').mockResolvedValue({ ok: true, json: async () => ({ data: [{
      id: 'packet-1', protocol_header: { time_seconds: 1792576800, src_ip: '10.0.0.1', src_port: 5060, dst_ip: '10.0.0.2', dst_port: 5080 },
      data_header: { call_id: 'a@test', method: '200' },
      raw: 'SIP/2.0 200 OK\r\nCSeq: 123 INVITE\r\nContent-Type: application/sdp\r\nAuthorization: Digest secret',
    }] }) } as Response);
    try {
      const result = await service.flow(event.session_uuid);
      expect(result.messages[0]).toMatchObject({ method: '200', responseCode: 200, cseqMethod: 'INVITE', hasSdp: true });
      expect(result.messages[0]).not.toHaveProperty('raw');
    } finally {
      if (originalBase === undefined) delete process.env.HOMER_API_BASE_URL;
      else process.env.HOMER_API_BASE_URL = originalBase;
      if (originalToken === undefined) delete process.env.HOMER_API_TOKEN;
      else process.env.HOMER_API_TOKEN = originalToken;
    }
  });

  it('restricts raw message retrieval to the selected event and redacts credentials', async () => {
    jest.spyOn(service as any, 'event').mockResolvedValue(event);
    jest.spyOn(service as any, 'messages').mockResolvedValue([
      { id: 'owned', raw: 'INVITE sip:x SIP/2.0\r\nAuthorization: Digest secret\r\nVia: SIP/2.0/UDP x' },
    ]);
    await expect(service.raw(event.session_uuid, 'other')).rejects.toBeInstanceOf(NotFoundException);
    const result = await service.raw(event.session_uuid, 'owned');
    expect(result.raw).not.toContain('secret');
    expect(result.raw).toContain('Authorization: [REDACTED]');
  });

  it('limits tenant history before applying search and scopes it by the JWT tenant', async () => {
    tenantLookup.mockResolvedValue({ customerCode: 'U1001' });
    const query = jest.fn().mockResolvedValue({ rows: [event] });
    jest.spyOn(service as any, 'db').mockReturnValue({ query });
    const result = await service.tenantList('tenant-1', { search: '1555', page: '1', limit: '25' });
    expect(tenantLookup).toHaveBeenCalledWith({ where: { id: 'tenant-1' }, select: { customerCode: true } });
    expect(query.mock.calls[0][0]).toMatch(/WITH latest AS[\s\S]*customer_id = \$1[\s\S]*LIMIT 100[\s\S]*WHERE \(\$2 = ''/);
    expect(query.mock.calls[0][1]).toEqual(['U1001', '1555', 26, 0]);
    expect(result.maxVisibleCalls).toBe(100);
  });

  it('only opens a tenant call if it remains in that tenant’s latest 100', async () => {
    tenantLookup.mockResolvedValue({ customerCode: 'U1001' });
    const query = jest.fn().mockResolvedValue({ rows: [] });
    jest.spyOn(service as any, 'db').mockReturnValue({ query });
    await expect(service.flow(event.session_uuid, 'tenant-1')).rejects.toBeInstanceOf(NotFoundException);
    expect(query.mock.calls[0][0]).toMatch(/JOIN latest USING \(session_uuid\)/);
    expect(query.mock.calls[0][1]).toEqual([event.session_uuid, 'U1001']);
  });
});
