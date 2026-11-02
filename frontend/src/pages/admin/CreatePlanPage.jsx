import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { subscriptionService } from '../../services/subscription.service';
import { useToast } from '../../context/ToastContext';
import PlanValidityFields from '../../components/subscription/PlanValidityFields';
import { planDurationPayload } from '../../utils/planDuration';
import {
    Plus,
    ArrowLeft,
    ShieldCheck,
    DollarSign,
    CreditCard,
    Users,
    Phone,
    Activity,
    CheckCircle2,
    Loader2
} from 'lucide-react';

const CreatePlanPage = () => {
    const navigate = useNavigate();
    const { addToast } = useToast();
    const [submitting, setSubmitting] = useState(false);

    const [formData, setFormData] = useState({
        plan_id: '',
        name: '',
        amount: 49.99,
        currency: 'usd',
        duration_count: 1,
        duration_unit: 'months',
        numbers: 3,
        extensions: 5,
        monitoring_extensions: 1,
        setup_fees: 10.00
    });

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
            navigate('/subscriptions');
        } catch (err) {
            console.error('Failed to create plan:', err);
            addToast('error', err.response?.data?.message || err.message || 'Failed to create new plan');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="p-4 sm:p-8 max-w-4xl mx-auto space-y-8">

            {/* Header */}
            <div className="flex items-center gap-4">
                <button
                    onClick={() => navigate('/subscriptions')}
                    className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800 transition-all"
                >
                    <ArrowLeft size={18} />
                </button>
                <div>
                    <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-gray-900 dark:text-white flex items-center gap-2.5">
                        <Plus className="h-7 w-7 text-primary-600" />
                        Create New Subscription Plan
                    </h1>
                    <p className="text-gray-500 dark:text-slate-400 mt-1 font-medium text-sm">
                        Configure pricing, resource limits, and rate card mappings for a new billing plan
                    </p>
                </div>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-6">

                {/* Section 1: Basic Plan Information */}
                <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-sm border border-gray-200/80 dark:border-slate-800 space-y-5">
                    <div className="flex items-center gap-2 pb-3 border-b border-gray-100 dark:border-slate-800">
                        <ShieldCheck className="h-5 w-5 text-primary-600" />
                        <h2 className="text-base font-bold text-gray-900 dark:text-white">
                            Basic Information
                        </h2>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        {/* Plan Name */}
                        <div>
                            <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-slate-300 mb-1.5">
                                Plan Name *
                            </label>
                            <input
                                type="text"
                                name="name"
                                value={formData.name}
                                onChange={handleChange}
                                placeholder="e.g. Starter Pro Plan"
                                required
                                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800/60 text-sm font-semibold text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500"
                            />
                        </div>

                        {/* Plan Identifier */}
                        <div>
                            <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-slate-300 mb-1.5">
                                Plan ID / Code (Unique)
                            </label>
                            <input
                                type="text"
                                name="plan_id"
                                value={formData.plan_id}
                                onChange={handleChange}
                                placeholder="e.g. starter_pro_v1"
                                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800/60 text-sm font-mono font-bold text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500"
                            />
                            <span className="text-[11px] text-gray-400 dark:text-slate-500 mt-1 block">
                                Auto-generated from name if left empty
                            </span>
                        </div>
                    </div>
                </div>

                {/* Section 2: Pricing & Validity */}
                <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-sm border border-gray-200/80 dark:border-slate-800 space-y-5">
                    <div className="flex items-center gap-2 pb-3 border-b border-gray-100 dark:border-slate-800">
                        <DollarSign className="h-5 w-5 text-emerald-500" />
                        <h2 className="text-base font-bold text-gray-900 dark:text-white">
                            Pricing & Billing Validity
                        </h2>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-5">
                        {/* Amount */}
                        <div>
                            <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-slate-300 mb-1.5">
                                Recurring Price ($)
                            </label>
                            <input
                                type="number"
                                step="0.01"
                                min="0"
                                name="amount"
                                value={formData.amount}
                                onChange={handleChange}
                                required
                                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800/60 text-sm font-mono font-bold text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500"
                            />
                        </div>

                        {/* Setup Fees */}
                        <div>
                            <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-slate-300 mb-1.5">
                                Setup Fees ($)
                            </label>
                            <input
                                type="number"
                                step="0.01"
                                min="0"
                                name="setup_fees"
                                value={formData.setup_fees}
                                onChange={handleChange}
                                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800/60 text-sm font-mono font-bold text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500"
                            />
                        </div>

                        {/* Currency */}
                        <div>
                            <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-slate-300 mb-1.5">
                                Currency
                            </label>
                            <select
                                name="currency"
                                value={formData.currency}
                                onChange={handleChange}
                                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800/60 text-sm font-bold text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500"
                            >
                                <option value="usd">USD ($)</option>
                                <option value="eur">EUR (€)</option>
                                <option value="gbp">GBP (£)</option>
                            </select>
                        </div>

                    </div>
                    <PlanValidityFields formData={formData} onChange={handleChange} />
                </div>

                {/* Section 3: Resource Limits & Allocation */}
                <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-sm border border-gray-200/80 dark:border-slate-800 space-y-5">
                    <div className="flex items-center gap-2 pb-3 border-b border-gray-100 dark:border-slate-800">
                        <CreditCard className="h-5 w-5 text-indigo-500" />
                        <h2 className="text-base font-bold text-gray-900 dark:text-white">
                            Included Resources & Limits
                        </h2>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
                        {/* Extensions */}
                        <div>
                            <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                                <Users className="h-3.5 w-3.5 text-indigo-500" />
                                Included Extensions
                            </label>
                            <input
                                type="number"
                                min="1"
                                name="extensions"
                                value={formData.extensions}
                                onChange={handleChange}
                                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800/60 text-sm font-mono font-bold text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500"
                            />
                        </div>

                        {/* Pooled Numbers */}
                        <div>
                            <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                                <Phone className="h-3.5 w-3.5 text-emerald-500" />
                                Numbers (TFN + DID pooled)
                            </label>
                            <input
                                type="number"
                                min="0"
                                name="numbers"
                                value={formData.numbers}
                                onChange={handleChange}
                                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800/60 text-sm font-mono font-bold text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500"
                            />
                        </div>

                        {/* Monitoring Seats */}
                        <div>
                            <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                                <Activity className="h-3.5 w-3.5 text-amber-500" />
                                Monitoring Extensions
                            </label>
                            <input
                                type="number"
                                min="0"
                                name="monitoring_extensions"
                                value={formData.monitoring_extensions}
                                onChange={handleChange}
                                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800/60 text-sm font-mono font-bold text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500"
                            />
                        </div>
                    </div>
                </div>

                {/* Form Actions */}
                <div className="flex items-center justify-end gap-4 pt-2">
                    <button
                        type="button"
                        onClick={() => navigate('/subscriptions')}
                        className="rounded-xl bg-white dark:bg-slate-900 px-5 py-3 text-sm font-bold text-gray-700 dark:text-slate-300 border border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-800 transition-all"
                    >
                        Cancel
                    </button>

                    <button
                        type="submit"
                        disabled={submitting}
                        className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary-600 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-primary-600/20 hover:bg-primary-700 transition-all disabled:opacity-50"
                    >
                        {submitting ? (
                            <>
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Saving Plan...
                            </>
                        ) : (
                            <>
                                <CheckCircle2 className="h-4 w-4" />
                                Create Plan
                            </>
                        )}
                    </button>
                </div>

            </form>
        </div>
    );
};

export default CreatePlanPage;
