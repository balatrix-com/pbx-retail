import test from 'node:test';
import assert from 'node:assert/strict';
import { planDurationPayload } from '../src/utils/planDuration.js';

for (const [count, unit, legacyMonths] of [[15, 'days', 1], [1, 'months', 1], [6, 'months', 6]]) {
    test(`plan creation submits ${count} ${unit}`, () => {
        assert.deepEqual(planDurationPayload({ duration_count: count, duration_unit: unit, validity_months: 99 }), {
            duration_count: count, duration_unit: unit, validity_months: legacyMonths,
        });
    });
}

test('validity rejects zero, fractions, excessive values and unsupported units', () => {
    for (const count of [0, -1, 1.5, '', 3661]) {
        assert.throws(() => planDurationPayload({ duration_count: count, duration_unit: 'days' }));
    }
    assert.throws(() => planDurationPayload({ duration_count: 1, duration_unit: 'years' }));
});
