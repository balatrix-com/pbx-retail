import React, { useState } from 'react';
import { Dialog } from '@headlessui/react';
import { X, RefreshCw, Loader2, ArrowRight, ShieldCheck, Zap, AlertCircle } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { subscriptionService } from '../../services/subscription.service';
import { useToast } from '../../context/ToastContext';

const PlanSwitchModal = ({ isOpen, onClose, currentPlan, newPlan, customerId, onSuccess }) => {
    const { addToast } = useToast();
    const queryClient = useQueryClient();
    const [immediate, setImmediate] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState(null);

    if (!newPlan) return null;

    const handleConfirmSwitch = async () => {
        setSubmitting(true);
        setError(null);
        try {
            const res = await subscriptionService.switchPlan(
                customerId || 'U1001',
                newPlan.plan_id,
                immediate
            );
            addToast('success', res.message || `Successfully switched to ${newPlan.name}!`);
            queryClient.invalidateQueries({ queryKey: ['subscription'] });
            queryClient.invalidateQueries({ queryKey: ['wallet'] });
            if (onSuccess) {
                onSuccess();
            }
            onClose();
        } catch (err) {
            console.error('Plan switch error:', err);
            const msg = err.response?.data?.message || err.normalized?.message || 'Failed to switch plan';
            setError(msg);
            addToast('error', msg);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Dialog open={isOpen} onClose={onClose} className="relative z-50">
            {/* Backdrop */}
            <div className="fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity" aria-hidden="true" />

            <div className="fixed inset-0 flex items-center justify-center p-4">
                <Dialog.Panel className="mx-auto max-w-lg w-full rounded-2xl bg-white dark:bg-slate-900 p-6 shadow-2xl ring-1 ring-gray-900/10 dark:ring-slate-800 transition-all">
                    
                    {/* Header */}
                    <div className="flex justify-between items-center pb-4 border-b border-gray-100 dark:border-slate-800">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-xl bg-primary-50 dark:bg-primary-950/60 text-primary-600 dark:text-primary-400">
                                <RefreshCw className="h-5 w-5 stroke-[2.2]" />
                            </div>
                            <div>
                                <Dialog.Title className="text-lg font-extrabold text-gray-900 dark:text-white tracking-tight">
                                    Switch Subscription Plan
                                </Dialog.Title>
                                <p className="text-xs font-medium text-gray-500 dark:text-slate-400">
                                    Upgrade or downgrade your active PBX plan
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="text-gray-400 hover:text-gray-600 dark:hover:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800 p-1.5 rounded-lg transition-colors focus:outline-none"
                        >
                            <X className="h-5 w-5" />
                        </button>
                    </div>

                    {/* Content Details */}
                    <div className="py-5 space-y-5">

                        {/* Plan Comparison Box */}
                        <div className="p-4 rounded-xl bg-gray-50 dark:bg-slate-800/60 border border-gray-100 dark:border-slate-800 flex items-center justify-between gap-4">
                            {/* Current Plan */}
                            <div className="flex-1 min-w-0">
                                <span className="text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider block">Current Plan</span>
                                <p className="text-sm font-bold text-gray-900 dark:text-white truncate">
                                    {currentPlan?.name || 'Current Plan'}
                                </p>
                                <p className="text-xs font-mono text-gray-500 dark:text-slate-400">
                                    ${Number(currentPlan?.amount || 0).toFixed(2)}/mo
                                </p>
                            </div>

                            <ArrowRight className="h-5 w-5 text-gray-400 dark:text-slate-500 flex-shrink-0" />

                            {/* Target Plan */}
                            <div className="flex-1 min-w-0 text-right">
                                <span className="text-[10px] font-bold text-primary-600 dark:text-primary-400 uppercase tracking-wider block">New Plan</span>
                                <p className="text-sm font-bold text-gray-900 dark:text-white truncate">
                                    {newPlan.name}
                                </p>
                                <p className="text-xs font-mono font-bold text-primary-600 dark:text-primary-400">
                                    ${Number(newPlan.amount).toFixed(2)}/mo
                                </p>
                            </div>
                        </div>

                        {/* Step B: Timing Options Toggle */}
                        <div className="space-y-3">
                            <label className="text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-slate-300 block">
                                When should the plan switch take effect?
                            </label>

                            <div className="grid grid-cols-2 gap-3">
                                {/* Option 1: Switch Immediately */}
                                <button
                                    type="button"
                                    onClick={() => setImmediate(true)}
                                    className={`p-3.5 rounded-xl border text-left transition-all ${
                                        immediate 
                                            ? 'bg-primary-50/60 dark:bg-primary-950/40 border-primary-500 ring-2 ring-primary-500/20' 
                                            : 'bg-white dark:bg-slate-800/40 border-gray-200 dark:border-slate-700 hover:border-gray-300 dark:hover:border-slate-600'
                                    }`}
                                >
                                    <div className="flex items-center justify-between mb-1">
                                        <span className="text-xs font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
                                            <Zap className="h-3.5 w-3.5 text-primary-600" />
                                            Switch Immediately
                                        </span>
                                        {immediate && <div className="h-2 w-2 rounded-full bg-primary-600"></div>}
                                    </div>
                                    <p className="text-[11px] font-medium text-gray-500 dark:text-slate-400 leading-tight">
                                        Applies instantly with prorated wallet adjustments.
                                    </p>
                                </button>

                                {/* Option 2: Switch at Renewal */}
                                <button
                                    type="button"
                                    onClick={() => setImmediate(false)}
                                    className={`p-3.5 rounded-xl border text-left transition-all ${
                                        !immediate 
                                            ? 'bg-primary-50/60 dark:bg-primary-950/40 border-primary-500 ring-2 ring-primary-500/20' 
                                            : 'bg-white dark:bg-slate-800/40 border-gray-200 dark:border-slate-700 hover:border-gray-300 dark:hover:border-slate-600'
                                    }`}
                                >
                                    <div className="flex items-center justify-between mb-1">
                                        <span className="text-xs font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
                                            <ShieldCheck className="h-3.5 w-3.5 text-indigo-500" />
                                            Next Billing Cycle
                                        </span>
                                        {!immediate && <div className="h-2 w-2 rounded-full bg-primary-600"></div>}
                                    </div>
                                    <p className="text-[11px] font-medium text-gray-500 dark:text-slate-400 leading-tight">
                                        Schedules the change for your next renewal date.
                                    </p>
                                </button>
                            </div>
                        </div>

                        {error && (
                            <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/50 text-xs font-bold text-red-600 dark:text-red-400 flex items-center gap-2">
                                <AlertCircle className="h-4 w-4" />
                                {error}
                            </div>
                        )}

                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100 dark:border-slate-800">
                        <button
                            type="button"
                            onClick={onClose}
                            className="rounded-xl bg-white dark:bg-slate-800 px-4 py-2.5 text-sm font-bold text-gray-700 dark:text-slate-300 shadow-sm ring-1 ring-inset ring-gray-300 dark:ring-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700 transition-all focus:outline-none"
                        >
                            Cancel
                        </button>

                        <button
                            type="button"
                            onClick={handleConfirmSwitch}
                            disabled={submitting}
                            className="inline-flex justify-center items-center gap-2 rounded-xl bg-primary-600 px-5 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-primary-700 transition-all focus:outline-none focus:ring-2 focus:ring-primary-500 active:scale-[0.98] disabled:opacity-50"
                        >
                            {submitting ? (
                                <>
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    Switching...
                                </>
                            ) : (
                                'Confirm Plan Switch'
                            )}
                        </button>
                    </div>

                </Dialog.Panel>
            </div>
        </Dialog>
    );
};

export default PlanSwitchModal;
