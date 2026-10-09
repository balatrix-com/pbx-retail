export function planDurationPayload(form) {
    const count = Number(form.duration_count);
    const unit = form.duration_unit;
    if (!Number.isInteger(count) || count < 1 || count > 3660 || !['days', 'months'].includes(unit)) {
        throw new Error('Validity must be a whole number from 1 to 3660 days or calendar months.');
    }
    return {
        duration_count: count,
        duration_unit: unit,
        // Compatibility for legacy consumers; subscription expiry uses duration_*.
        validity_months: unit === 'months' ? count : 1,
    };
}
