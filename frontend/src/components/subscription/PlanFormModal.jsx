import React, { useState } from 'react';
import { Dialog } from '@headlessui/react';
import { X, CheckCircle2, Loader2, ShieldCheck, DollarSign, CreditCard, Users, Phone, Hash, Activity } from 'lucide-react';
import { subscriptionService } from '../../services/subscription.service';
import { useToast } from '../../context/ToastContext';

const PlanFormModal = ({ isOpen, onClose, onSuccess }) => {
    const { addToast } = useToast();
    const [submitting, setSubmitting] = useState(false);

    const [formData, setFormData] = useState({
        plan_id: '',
        name: '',
        amount: 49.99,
        currency: 'usd',
        validity_months: 1,
        rate_card_id: '8',
        free_mins: 1000,
        tfns: 2,
        dids: 1,
        extensions: 5,
        monitoring_per_user: 1,
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
                plan_id: planId
            };
            const res = await subscriptionService.createPlan(payload);
            addToast('success', res?.message || `Plan "${formData.name}" created successfully!`);
            if (onSuccess) onSuccess();
            onClose();
        } catch (err) {
            console.error('Failed to create plan:', err);
            addToast('error', err.response?.data?.message || 'Failed to create plan');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Dialog open={isOpen} onClose={onClose} className="relative z-50">
            {/* Backdrop */}
            <div className="fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity" aria-hidden="true" />

            <div className="fixed inset-0 flex items-center justify-center p-4 overflow-y-auto">
                <Dialog.Panel className="mx-auto max-w-2xl w-full rounded-2xl bg-white dark:bg-slate-900 p-6 shadow-2xl ring-1 ring-gray-900/10 dark:ring-slate-800 transition-all max-h-[90vh] overflow-y-auto">
                    
                    {/* Header */}
                    <div className="flex justify-between items-center pb-4 border-b border-gray-100 dark:border-slate-800">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-xl bg-primary-50 dark:bg-primary-950/60 text-primary-600 dark:text-primary-400">
                                <ShieldCheck className="h-5 w-5 stroke-[2.2]" />
                            </div>
                            <div>
                                <Dialog.Title className="text-lg font-extrabold text-gray-900 dark:text-white tracking-tight">
                                    Create New Subscription Plan
                                </Dialog.Title>
                                <p className="text-xs font-medium text-gray-500 dark:text-slate-400">
                                    Add new billing tier with rate card mapping & resource limits
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

                    {/* Form Details */}
                    <form onSubmit={handleSubmit} className="py-4 space-y-4">
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-slate-300 mb-1">
                                    Plan Name *
                                </label>
                                <input
                                    type="text"
                                    name="name"
                                    value={formData.name}
                                    onChange={handleChange}
                                    placeholder="Starter Pro Plan"
                                    required
                                    className="w-full px-3.5 py-2 rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 text-sm font-semibold text-gray-900 dark:text-white"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-slate-300 mb-1">
                                    Plan Code (ID)
                                </label>
                                <input
                                    type="text"
                                    name="plan_id"
                                    value={formData.plan_id}
                                    onChange={handleChange}
                                    placeholder="starter_pro_v1"
                                    className="w-full px-3.5 py-2 rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 text-sm font-mono font-bold text-gray-900 dark:text-white"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-slate-300 mb-1">
                                    Recurring Price ($)
                                </label>
                                <input
                                    type="number"
                                    step="0.01"
                                    name="amount"
                                    value={formData.amount}
                                    onChange={handleChange}
                                    required
                                    className="w-full px-3.5 py-2 rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 text-sm font-mono font-bold text-gray-900 dark:text-white"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-slate-300 mb-1">
                                    Setup Fees ($)
                                </label>
                                <input
                                    type="number"
                                    step="0.01"
                                    name="setup_fees"
                                    value={formData.setup_fees}
                                    onChange={handleChange}
                                    className="w-full px-3.5 py-2 rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 text-sm font-mono font-bold text-gray-900 dark:text-white"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-slate-300 mb-1">
                                    Extensions
                                </label>
                                <input
                                    type="number"
                                    name="extensions"
                                    value={formData.extensions}
                                    onChange={handleChange}
                                    className="w-full px-3.5 py-2 rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 text-sm font-mono font-bold text-gray-900 dark:text-white"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-slate-300 mb-1">
                                    Free Minutes
                                </label>
                                <input
                                    type="number"
                                    name="free_mins"
                                    value={formData.free_mins}
                                    onChange={handleChange}
                                    className="w-full px-3.5 py-2 rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 text-sm font-mono font-bold text-gray-900 dark:text-white"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-slate-300 mb-1">
                                    Rate Card ID
                                </label>
                                <input
                                    type="text"
                                    name="rate_card_id"
                                    value={formData.rate_card_id}
                                    onChange={handleChange}
                                    className="w-full px-3.5 py-2 rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 text-sm font-mono font-bold text-gray-900 dark:text-white"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-slate-300 mb-1">
                                    Toll-Free Numbers (TFN)
                                </label>
                                <input
                                    type="number"
                                    name="tfns"
                                    value={formData.tfns}
                                    onChange={handleChange}
                                    className="w-full px-3.5 py-2 rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 text-sm font-mono font-bold text-gray-900 dark:text-white"
                                />
                            </div>

                            {/* Direct Inward Dialing (DID) */}
                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-slate-300 mb-1">
                                    Direct Inward Dialing (DID)
                                </label>
                                <input
                                    type="number"
                                    min="0"
                                    name="dids"
                                    value={formData.dids}
                                    onChange={handleChange}
                                    placeholder="1"
                                    className="w-full px-3.5 py-2 rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 text-sm font-mono font-bold text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:outline-none"
                                />
                            </div>
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
                                type="submit"
                                disabled={submitting}
                                className="inline-flex justify-center items-center gap-2 rounded-xl bg-primary-600 px-5 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-primary-700 transition-all focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-50"
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
