import React from 'react';

export default function PlanValidityFields({ formData, onChange }) {
    const inputClass = 'w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#121520] text-sm font-semibold text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-teal-500 focus:outline-none transition-all shadow-2xs';
    return (
        <fieldset className="space-y-3 pt-1">
            <legend className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Plan Validity Period *
            </legend>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                    <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                        Duration
                    </label>
                    <input 
                        className={inputClass} 
                        type="number" 
                        min="1" 
                        max="3660" 
                        step="1"
                        name="duration_count" 
                        value={formData.duration_count} 
                        onChange={onChange} 
                        required 
                    />
                </div>
                <div>
                    <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                        Unit
                    </label>
                    <select 
                        className={inputClass} 
                        name="duration_unit" 
                        value={formData.duration_unit} 
                        onChange={onChange}
                    >
                        <option value="days">Days</option>
                        <option value="months">Calendar months</option>
                    </select>
                </div>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed font-medium">
                Validity timer initializes upon customer activation. Recurring price covers the selected duration period.
            </p>
        </fieldset>
    );
}
