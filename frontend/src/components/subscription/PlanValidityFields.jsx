import React from 'react';

export default function PlanValidityFields({ formData, onChange }) {
    const inputClass = 'w-full min-h-11 px-3.5 py-2 rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 text-sm font-semibold text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500';
    return (
        <fieldset className="space-y-2">
            <legend className="text-sm font-bold text-gray-900 dark:text-white">Plan validity period *</legend>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <label className="block text-sm text-gray-700 dark:text-slate-300">
                    Duration
                    <input className={inputClass} type="number" min="1" max="3660" step="1"
                        name="duration_count" value={formData.duration_count} onChange={onChange} required />
                </label>
                <label className="block text-sm text-gray-700 dark:text-slate-300">
                    Unit
                    <select className={inputClass} name="duration_unit" value={formData.duration_unit} onChange={onChange}>
                        <option value="days">Days</option>
                        <option value="months">Calendar months</option>
                    </select>
                </label>
            </div>
            <p className="text-xs text-gray-600 dark:text-slate-400">
                Examples: 15 days, 1 month, or 6 months. Validity starts when the subscription is activated.
                The recurring price covers the selected period.
            </p>
        </fieldset>
    );
}
