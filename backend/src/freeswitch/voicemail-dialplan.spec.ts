import { DialplanGeneratorService } from './dialplan-generator.service';

describe('Voicemail dialplan', () => {
  const generator = new DialplanGeneratorService();

  it('routes an unanswered extension to its assigned mailbox', () => {
    const xml = generator.generateSimpleExtensionXML('ext1_U1005', 'U100501', undefined, false, 'U1005', 'vm2_U1005', 23);
    expect(xml).toContain('call_timeout=23');
    expect(xml).toContain('USER_BUSY,NO_ANSWER,NO_USER_RESPONSE');
    expect(xml).toContain('transfer" data="vm2_U1005 XML public');
  });

  it('records a mailbox deposit under its tenant and box', () => {
    const tenant = '6cdd6539-c702-402a-9083-e97c42496b6e';
    const box = '7b8ec897-b997-4c2a-9736-a4e831a20c11';
    const xml = generator.generateVoicemailXML('vm2_U1005', tenant, box);
    expect(xml).toContain('voicemail_tenant_id=' + tenant);
    expect(xml).toContain('record_rate=16000');
    expect(xml).toContain(`/incoming/${tenant}/${box}/${'${uuid}'}.wav 120 200 5`);
  });

  it('supports alphanumeric tenant IDs like U1035', () => {
    const tenant = 'U1035';
    const box = '7b8ec897-b997-4c2a-9736-a4e831a20c11';
    const xml = generator.generateVoicemailXML('vm1_u1035', tenant, box);
    expect(xml).toContain('voicemail_tenant_id=U1035');
    expect(xml).toContain('/incoming/U1035/' + box);
  });
});
