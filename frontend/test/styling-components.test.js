import test from 'node:test';
import assert from 'node:assert/strict';

// Helper logic mirrored from SubscriptionsTab in TenantManager.jsx
function parseSubscription(subscription) {
    if (!subscription) return [];
    if (Array.isArray(subscription)) return subscription;
    if (Array.isArray(subscription.data)) return subscription.data;
    if (typeof subscription === 'object' && (subscription.id || subscription.plan_id || subscription.plan_name)) return [subscription];
    return [];
}

function resolveActiveSubscription(subList, fallback) {
    return subList.find(s => s.status === 'ACTIVE') || subList[0] || (fallback?.plan ? fallback : null);
}

function calculateCapacity(used, limit) {
    const total = limit !== undefined && limit !== null ? Number(limit) : null;
    const percent = total && total > 0 ? Math.min(100, Math.round((used / total) * 100)) : 0;
    return { used, total, percent };
}

// Helper logic mirrored from SipTracesPage.jsx
function classifyCallDirection(direction) {
    const isOutbound = String(direction).toUpperCase() === 'OUTBOUND';
    return {
        isOutbound,
        badgeText: isOutbound ? 'OUTBOUND' : 'INBOUND',
        borderClass: isOutbound ? 'border-l-emerald-500' : 'border-l-blue-500'
    };
}

function classifyCdrStatus(status) {
    const normalized = String(status).toUpperCase();
    if (normalized === 'COMPLETED') return { status: 'COMPLETED', type: 'success' };
    if (normalized.includes('FAIL')) return { status: normalized, type: 'error' };
    return { status: normalized || 'UNKNOWN', type: 'default' };
}

test('SubscriptionsTab parses varied subscription response structures', () => {
    // Array response
    assert.equal(parseSubscription([{ id: 'sub-1', status: 'ACTIVE' }]).length, 1);

    // Wrapped { data: [...] } response
    assert.equal(parseSubscription({ data: [{ id: 'sub-2', status: 'ACTIVE' }] }).length, 1);

    // Single object response
    assert.equal(parseSubscription({ id: 'sub-3', plan_name: 'Pro' }).length, 1);

    // Empty or null
    assert.deepEqual(parseSubscription(null), []);
    assert.deepEqual(parseSubscription(undefined), []);
});

test('SubscriptionsTab finds active subscription correctly', () => {
    const subs = [
        { id: 'sub-old', status: 'EXPIRED', plan_name: 'Old Tier' },
        { id: 'sub-active', status: 'ACTIVE', plan_name: 'Enterprise Tier' }
    ];
    const active = resolveActiveSubscription(subs, null);
    assert.equal(active.id, 'sub-active');
    assert.equal(active.plan_name, 'Enterprise Tier');
});

test('SubscriptionsTab calculates capacity usage percentages accurately', () => {
    // Regular capacity
    const c1 = calculateCapacity(5, 10);
    assert.equal(c1.percent, 50);

    // Full capacity
    const c2 = calculateCapacity(10, 10);
    assert.equal(c2.percent, 100);

    // Over-allocated capacity capped at 100%
    const c3 = calculateCapacity(15, 10);
    assert.equal(c3.percent, 100);

    // Unlimited capacity
    const c4 = calculateCapacity(5, null);
    assert.equal(c4.total, null);
    assert.equal(c4.percent, 0);
});

test('SipTracesPage classifies call directions with corresponding accents', () => {
    const inbound = classifyCallDirection('INBOUND');
    assert.equal(inbound.isOutbound, false);
    assert.equal(inbound.badgeText, 'INBOUND');
    assert.equal(inbound.borderClass, 'border-l-blue-500');

    const outbound = classifyCallDirection('OUTBOUND');
    assert.equal(outbound.isOutbound, true);
    assert.equal(outbound.badgeText, 'OUTBOUND');
    assert.equal(outbound.borderClass, 'border-l-emerald-500');
});

test('SipTracesPage classifies CDR status cleanly', () => {
    assert.deepEqual(classifyCdrStatus('COMPLETED'), { status: 'COMPLETED', type: 'success' });
    assert.deepEqual(classifyCdrStatus('FAILED'), { status: 'FAILED', type: 'error' });
    assert.deepEqual(classifyCdrStatus('CALL_FAILED'), { status: 'CALL_FAILED', type: 'error' });
    assert.deepEqual(classifyCdrStatus('NO_ANSWER'), { status: 'NO_ANSWER', type: 'default' });
});
