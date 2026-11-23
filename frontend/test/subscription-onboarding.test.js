import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

function serviceWithApi(api) {
    const source = readFileSync(new URL('../src/services/subscription.service.js', import.meta.url), 'utf8')
        .replace("import api from './api';", '')
        .replace('export const subscriptionService', 'const subscriptionService');
    return vm.runInNewContext(`${source}\nsubscriptionService;`, { api, console });
}

test('tenant onboarding uses the backend activation endpoint that supplies the retry key', async () => {
    const calls = [];
    const service = serviceWithApi({ post: async (url, body) => {
        calls.push({ url, ...body });
        return { data: { success: true, data: { id: 'subscription' } } };
    } });
    const result = await service.switchPlan('tenant-1', 'starter');
    assert.equal(result.success, true);
    assert.deepEqual(calls, [{ url: '/wallet/subscription', targetTenantId: 'tenant-1', planId: 'starter', immediate: true }]);
});

test('activation failures reach the wizard rather than being treated as success', async () => {
    const service = serviceWithApi({ post: async () => { throw new Error('Insufficient funds'); } });
    await assert.rejects(service.switchPlan('tenant-1', 'starter'), /Insufficient funds/);
});
