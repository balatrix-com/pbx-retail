import React, { useState } from 'react';
import { Dialog } from '@headlessui/react';
import { X, CheckCircle2, Loader2, ShieldCheck, DollarSign, CreditCard, Users, Phone, Hash, Activity } from 'lucide-react';
import { subscriptionService } from '../../services/subscription.service';
import { useToast } from '../../context/ToastContext';
import PlanValidityFields from './PlanValidityFields';
import { planDurationPayload } from '../../utils/planDuration';

const PlanFormModal = ({ isOpen, onClose, onSuccess }) => {
    const { addToast } = useToast();
    const [submitting, setSubmitting] = useState(false);

    const [formData, setFormData] = useState({
        plan_id: '',
        name: '',
        amount: 49.99,
        currency: 'usd',
        plan_category: 'base',
        duration_unit: 'months',
        duration_count: 1,
        numbers: 3,
        extensions: 5,
        monitoring_extensions: 1,
        setup_fees: 10.00
    });

    if (!isOpen) return null;

    const handleChange = (e) => {
        const { name, value, type } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'number' ? parseFloat(value) || 0 : value
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.name.trim()) {
            addToast('error', 'Plan name is required');
            return;
        }

        const planId = formData.plan_id.trim() || formData.name.toLowerCase().replace(/[^a-z0-9]/g, '_');

        setSubmitting(true);
        try {
            const payload = {
                ...formData,
                ...planDurationPayload(formData),
                plan_id: planId
            };
            const res = await subscriptionService.createPlan(payload);
            addToast('success', res?.message || `Plan "${formData.name}" created successfully!`);
            if (onSuccess) onSuccess();
            onClose();
        } catch (err) {
            console.error('Failed to create plan:', err);
            addToast('error', err.response?.data?.message || err.message || 'Failed to create plan');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Dialog open={isOpen} onClose={onClose} className="relative z-50">
            {/* Backdrop */}
            <div className="fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity" aria-hidden="true" />

            <div className="fixed inset-0 flex items-center justify-center p-4 overflow-y-auto">
                <Dialog.Panel className="mx-auto max-w-2xl w-full rounded-3xl bg-white dark:bg-[#0c0e17] border border-slate-200/80 dark:border-white/10 shadow-2xl transition-all max-h-[92vh] overflow-y-auto p-0">
                    
                    {/* Header */}
                    <div className="p-6 sm:p-7 border-b border-slate-100 dark:border-white/5 bg-gradient-to-r from-teal-500/10 via-emerald-500/5 to-transparent flex justify-between items-center">
                        <div className="flex items-center gap-3.5">
                            <div className="p-3 rounded-2xl bg-teal-500/15 border border-teal-500/20 text-teal-600 dark:text-teal-400">
                                <ShieldCheck className="h-6 w-6 stroke-[2.2]" />
                            </div>
                            <div>
                                <Dialog.Title className="text-xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                                    Create New Subscription Plan
                                </Dialog.Title>
                                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-0.5">
                                    Configure billing tier parameters and pooled telecom resource limits
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/10 p-2 rounded-xl transition-all cursor-pointer"
                        >
                            <X className="h-5 w-5" />
                        </button>
                    </div>

                    {/* Form Details */}
                    <form onSubmit={handleSubmit} className="p-6 sm:p-7 space-y-6">
                        {/* Section 1: Classification & Period */}
                        <div className="p-4 sm:p-5 rounded-2xl bg-slate-50/80 dark:bg-white/[0.02] border border-slate-200/70 dark:border-white/5 space-y-4">
                            <div className="flex items-center gap-2">
                                <span className="h-2 w-2 rounded-full bg-teal-500"></span>
                                <h4 className="text-[11px] font-extrabold tracking-wider uppercase text-slate-500 dark:text-slate-400 font-mono">
                                    Plan Classification & Period
                                </h4>
                            </div>

                            <div className="grid grid-cols-1 gap-4">
                                <div>
                                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                                        Plan Category
                                    </label>
                                    <select 
                                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#121520] text-sm font-semibold text-slate-900 dark:text-white focus:ring-2 focus:ring-teal-500 focus:outline-none transition-all shadow-2xs" 
                                        name="plan_category" 
                                        value={formData.plan_category} 
                                        onChange={handleChange}
                                    >
                                        <option value="base">Base PBX</option>
                                        <option value="capacity">Extra Capacity</option>
                                    </select>
                                </div>
                                <PlanValidityFields formData={formData} onChange={handleChange} />
                            </div>
                        </div>
                        
                        {/* Section 2: Identity & Pricing */}
                        <div className="p-4 sm:p-5 rounded-2xl bg-slate-50/80 dark:bg-white/[0.02] border border-slate-200/70 dark:border-white/5 space-y-4">
                            <div className="flex items-center gap-2">
                                <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
                                <h4 className="text-[11px] font-extrabold tracking-wider uppercase text-slate-500 dark:text-slate-400 font-mono">
                                    Plan Identity & Financials
                                </h4>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                                        Plan Name *
                                    </label>
                                    <input
                                        type="text"
                                        name="name"
                                        value={formData.name}
                                        onChange={handleChange}
                                        placeholder="e.g. Starter Pro Plan"
                                        required
                                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#121520] text-sm font-semibold text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-teal-500 focus:outline-none transition-all shadow-2xs"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                                        Plan Code (ID)
                                    </label>
                                    <input
                                        type="text"
                                        name="plan_id"
                                        value={formData.plan_id}
                                        onChange={handleChange}
                                        placeholder="e.g. starter_pro_v1"
                                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#121520] text-sm font-mono font-bold text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-teal-500 focus:outline-none transition-all shadow-2xs"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                                        Recurring Price ($) *
                                    </label>
                                    <div className="relative">
                                        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">$</span>
                                        <input
                                            type="number"
                                            step="0.01"
                                            name="amount"
                                            value={formData.amount}
                                            onChange={handleChange}
                                            placeholder="49.99"
                                            required
                                            className="w-full pl-8 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#121520] text-sm font-mono font-bold text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-teal-500 focus:outline-none transition-all shadow-2xs"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                                        Setup Fees ($)
                                    </label>
                                    <div className="relative">
                                        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">$</span>
                                        <input
                                            type="number"
                                            step="0.01"
                                            name="setup_fees"
                                            value={formData.setup_fees}
                                            onChange={handleChange}
                                            placeholder="0.00"
                                            className="w-full pl-8 pr-4 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#121520] text-sm font-mono font-bold text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-teal-500 focus:outline-none transition-all shadow-2xs"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Section 3: Quotas & Resource Capacities */}
                        <div className="p-4 sm:p-5 rounded-2xl bg-slate-50/80 dark:bg-white/[0.02] border border-slate-200/70 dark:border-white/5 space-y-4">
                            <div className="flex items-center gap-2">
                                <span className="h-2 w-2 rounded-full bg-cyan-500"></span>
                                <h4 className="text-[11px] font-extrabold tracking-wider uppercase text-slate-500 dark:text-slate-400 font-mono">
                                    Included Quotas & Capacities
                                </h4>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                                        Extensions
                                    </label>
                                    <input
                                        type="number"
                                        name="extensions"
                                        value={formData.extensions}
                                        onChange={handleChange}
                                        placeholder="5"
                                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#121520] text-sm font-mono font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-teal-500 focus:outline-none transition-all shadow-2xs"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                                        Included Numbers
                                    </label>
                                    <input
                                        type="number"
                                        min="0"
                                        name="numbers"
                                        value={formData.numbers}
                                        onChange={handleChange}
                                        placeholder="3"
                                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#121520] text-sm font-mono font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-teal-500 focus:outline-none transition-all shadow-2xs"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                                        Monitoring Exts
                                    </label>
                                    <input
                                        type="number"
                                        min="0"
                                        name="monitoring_extensions"
                                        value={formData.monitoring_extensions}
                                        onChange={handleChange}
                                        placeholder="1"
                                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#121520] text-sm font-mono font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-teal-500 focus:outline-none transition-all shadow-2xs"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-white/5">
                            <button
                                type="button"
                                onClick={onClose}
                                className="rounded-xl px-5 py-2.5 text-xs font-bold text-slate-600 dark:text-slate-300 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-white/10 transition-all cursor-pointer"
                            >
                                Cancel
                            </button>

                            <button
                                type="submit"
                                disabled={submitting}
                                className="inline-flex justify-center items-center gap-2 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 px-6 py-2.5 text-xs font-bold text-white shadow-lg shadow-teal-900/20 active:scale-95 transition-all disabled:opacity-50 cursor-pointer"
                            >
                                {submitting ? (
                                    <>
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                        Saving...
                                    </>
                                ) : (
                                    <>
                                        <CheckCircle2 className="h-4 w-4" />
                                        Save Plan
                                    </>
                                )}
                            </button>
                        </div>

                    </form>

                </Dialog.Panel>
            </div>
        </Dialog>
    );
};

export default PlanFormModal;
