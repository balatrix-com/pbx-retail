import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useSubscriptionQuery, useWalletQuery } from '../../hooks/useBillingQueries';
import { subscriptionService } from '../../services/subscription.service';
import { plansService } from '../../services/plans.service';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';
import {
    Plus,
    RefreshCw,
    CheckCircle2,
    CreditCard,
    Loader2,
    ArrowUpRight,
    Wallet as WalletIcon,
    ShieldCheck,
    Trash2,
    Package,
    Layers,
    Sparkles
} from 'lucide-react';
import PlanSwitchModal from '../../components/subscription/PlanSwitchModal';
import PlanFormModal from '../../components/subscription/PlanFormModal';
import ConfirmActionModal from '../../components/subscription/ConfirmActionModal';
import AddonCatalogManagement from '../../components/subscription/AddonCatalogManagement';

const PlansPage = () => {
    const navigate=useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const activeTab = 'plans';

    const { user, isSuperAdmin, isAdmin } = useAuth();
    const canManagePlans = isSuperAdmin || isAdmin;

    const { addToast } = useToast();
    const queryClient = useQueryClient();

    // Active Subscription & Wallet Data
    const { data: subscription, isLoading: subLoading, refetch: refetchSubscription } = useSubscriptionQuery();
    const { data: wallet, refetch: refetchWallet } = useWalletQuery();

    // Plans List State
    const [plans, setPlans] = useState([]);
    const [plansLoading, setPlansLoading] = useState(true);
    const [selectedPlanForSwitch, setSelectedPlanForSwitch] = useState(null);
    const [planSwitchModalOpen, setPlanSwitchModalOpen] = useState(false);
    const [showModal, setShowModal] = useState(false);

    // Delete Plan State
    const [planToDelete, setPlanToDelete] = useState(null);
    const [deleteLoading, setDeleteLoading] = useState(false);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setPlansLoading(true);
        try {
            const plansData = await subscriptionService.getPlans();
            setPlans(plansData || []);
        } catch (err) {
            console.error('Failed to load subscriptions data:', err);
            addToast('error', 'Failed to load subscription items');
        } finally {
            setPlansLoading(false);
        }
    };

    // Purchasing Power Calculation
    const fiatBalance = Number(wallet?.balance || 0);
    const creditLimit = Number(wallet?.creditLimit || 0);
    const creditUsed = Number(wallet?.creditUsed || 0);
    const availablePurchasingPower = fiatBalance + creditLimit - creditUsed;

    // Plan Switch Handler
    const handleInitiatePlanSwitch = (plan) => {
        navigate(isSuperAdmin ? '/super-admin/subscriptions' : '/subscriptions');
    };

    // Refresh active subscription & wallet after plan changes
    const handleRefreshAll = () => {
        queryClient.invalidateQueries({ queryKey: ['subscription'] });
        queryClient.invalidateQueries({ queryKey: ['wallet'] });
        refetchSubscription();
        refetchWallet();
        loadData();
    };

    // Handle Delete Plan Confirmation
    const handleConfirmDeletePlan = async () => {
        if (!planToDelete) return;
        const planId = planToDelete.plan_id || planToDelete.id;
        setDeleteLoading(true);
        try {
            const res = await plansService.deletePlan(planId);
            addToast('success', res?.message || 'Plan deleted successfully');
            setPlanToDelete(null);
            loadData();
        } catch (err) {
            console.error('Failed to delete plan:', err);
            const status = err.response?.status;
            const backendMsg = err.response?.data?.message || err.normalized?.message;

            if (status === 404) {
                addToast('error', 'Plan not found — it may have already been deleted');
                setPlanToDelete(null);
                loadData();
            } else if (status === 400 || status === 409) {
                addToast('error', backendMsg || 'Cannot delete plan: active tenant subscription(s) are currently using this plan.');
                setPlanToDelete(null);
            } else {
                addToast('error', backendMsg || err.message || 'Failed to delete plan');
                setPlanToDelete(null);
            }
        } finally {
            setDeleteLoading(false);
        }
    };

    const handleTabChange = (tabName) => {
        setSearchParams({ tab: tabName });
    };

    return (
        <div className="w-full pb-16 space-y-7 animate-in fade-in duration-300 max-w-7xl mx-auto">
            {/* Header Banner */}
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-teal-700 via-teal-600 to-emerald-600 p-8 text-white shadow-xl shadow-teal-900/15">
                <div className="absolute top-0 right-0 -mt-10 -mr-10 w-80 h-80 rounded-full bg-white/10 blur-2xl pointer-events-none" />
                <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
                    <div className="space-y-1.5 max-w-2xl">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 backdrop-blur-md text-xs font-semibold tracking-wide border border-white/20">
                            <Sparkles size={14} className="text-teal-200" />
                            <span>Billing & Subscription Engine</span>
                        </div>
                        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                            Plan Catalog & Capacity Engine
                        </h1>
                        <p className="text-teal-100 text-xs sm:text-sm font-medium">
                            Manage base tier packages, quota limits, extensions capacity, and subscription allocations.
                        </p>
                    </div>

                    <div className="flex items-center gap-3">
                        <button
                            onClick={handleRefreshAll}
                            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white/15 hover:bg-white/25 backdrop-blur-md border border-white/20 px-4 py-2.5 text-xs font-bold text-white transition-all shadow-sm active:scale-95 cursor-pointer"
                        >
                            <RefreshCw size={14} className="text-teal-200" />
                            <span>Refresh</span>
                        </button>
                        {canManagePlans && (
                            <button
                                onClick={() => setShowModal(true)}
                                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white hover:bg-teal-50 px-5 py-2.5 text-xs font-bold text-teal-800 shadow-lg shadow-black/10 transition-all active:scale-95 cursor-pointer"
                            >
                                <Plus size={16} className="text-teal-700" />
                                <span>Add New Plan</span>
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Tab 1: Plans & Active Subscription */}
            {activeTab === 'plans' && (
                <div className="space-y-6">
                    {/* Active Subscription & Purchasing Power Banner */}
                    <div className="rounded-3xl bg-white/95 dark:bg-slate-900/95 border border-teal-200/70 dark:border-white/10 shadow-sm p-6 sm:p-7 backdrop-blur-sm">
                        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                            <div className="space-y-2">
                                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-teal-50 dark:bg-teal-950/60 border border-teal-200 dark:border-teal-800 text-[11px] font-extrabold uppercase text-teal-700 dark:text-teal-400 tracking-wider">
                                    <CheckCircle2 className="h-3.5 w-3.5 text-teal-600" /> Active Subscription
                                </div>
                                <h2 className="text-2xl font-black text-slate-800 dark:text-white tracking-tight">
                                    {subscription?.plan_name || 'No active plan assigned'}
                                </h2>
                                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                                    Status: <span className="text-teal-600 dark:text-teal-400 font-bold uppercase">{subscription?.status || 'NONE'}</span>
                                    {subscription?.next_billing && (
                                        <span className="ml-3">Next Renewal: <span className="font-bold text-slate-800 dark:text-white">{new Date(subscription.next_billing).toLocaleDateString()}</span></span>
                                    )}
                                </p>
                            </div>

                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 items-center">
                                <div className="px-4 py-3 rounded-2xl bg-teal-50/40 dark:bg-slate-800/50 border border-teal-200/60 dark:border-white/5">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">SIP Extensions</span>
                                    <span className="text-xl font-black text-slate-800 dark:text-white font-mono">
                                        {subscription?.limits?.extensions ?? subscription?.limits?.maxExtensions ?? 0}
                                    </span>
                                </div>
                                <div className="px-4 py-3 rounded-2xl bg-teal-50/40 dark:bg-slate-800/50 border border-teal-200/60 dark:border-white/5">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">DID Numbers</span>
                                    <span className="text-xl font-black text-slate-800 dark:text-white font-mono">
                                        {subscription?.limits?.numbers ?? subscription?.limits?.maxNumbers ?? 0}
                                    </span>
                                </div>
                                <div className="px-4 py-3 rounded-2xl bg-teal-50/40 dark:bg-slate-800/50 border border-teal-200/60 dark:border-white/5">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Monitoring Seats</span>
                                    <span className="text-xl font-black text-slate-800 dark:text-white font-mono">
                                        {subscription?.limits?.monitoring_extensions ?? subscription?.limits?.maxMonitoringExtensions ?? 0}
                                    </span>
                                </div>
                                <div className="px-4.5 py-3 rounded-2xl bg-gradient-to-br from-teal-50 to-emerald-50 dark:from-teal-950/60 dark:to-emerald-950/60 border border-teal-200 dark:border-teal-800">
                                    <span className="text-[10px] font-extrabold text-teal-800 dark:text-teal-300 uppercase tracking-wider block flex items-center gap-1">
                                        <WalletIcon className="h-3.5 w-3.5 text-teal-600" /> Purchasing Power
                                    </span>
                                    <span className="text-xl font-black text-teal-700 dark:text-teal-300 font-mono">
                                        ${availablePurchasingPower.toFixed(2)}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Plans List Section */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2.5">
                                <ShieldCheck className="h-5 w-5 text-teal-600 dark:text-teal-400" />
                                <h3 className="text-lg font-bold text-slate-800 dark:text-white tracking-tight">
                                    Available Plan Catalog
                                </h3>
                                <span className="text-xs font-bold text-teal-800 dark:text-teal-300 bg-teal-50 dark:bg-teal-950 px-2.5 py-0.5 rounded-full border border-teal-200 dark:border-teal-800">
                                    {plans.length} Packages
                                </span>
                            </div>
                        </div>

                        {plansLoading ? (
                            <div className="flex justify-center py-16">
                                <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
                            </div>
                        ) : plans.length === 0 ? (
                            <div className="rounded-3xl bg-white/95 dark:bg-slate-900/95 p-12 text-center border border-teal-200/70 dark:border-white/10">
                                <ShieldCheck className="h-10 w-10 text-teal-500 mx-auto mb-3" />
                                <h4 className="text-base font-bold text-slate-800 dark:text-white">No Plans Found</h4>
                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                                    Create a new plan to make it available for customer subscriptions.
                                </p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                {plans.map((p) => {
                                    const currentPlanId = subscription?.plan_id || subscription?.plan_name;
                                    const isCurrent = currentPlanId && (p.plan_id || p.name)
                                        ? (subscription?.plan_id === p.plan_id || subscription?.plan_name === p.name)
                                        : false;

                                    return (
                                        <div
                                            key={p.plan_id || p.id || p.name}
                                            className={`rounded-3xl p-6 sm:p-7 border transition-all flex flex-col justify-between relative group shadow-sm bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm ${isCurrent
                                                ? 'border-teal-500 ring-2 ring-teal-500/20 shadow-md shadow-teal-500/10'
                                                : 'border-teal-200/70 dark:border-white/10 hover:border-teal-400 dark:hover:border-teal-600'
                                                }`}
                                        >
                                            <div>
                                                <div className="flex justify-between items-start mb-3">
                                                    <div>
                                                        <h4 className="text-lg font-black text-slate-800 dark:text-white">
                                                            {p.name}
                                                        </h4>
                                                        <span className="text-[11px] font-mono text-slate-400 dark:text-slate-500 block mt-0.5">
                                                            {p.plan_id || p.id}
                                                        </span>
                                                    </div>

                                                    <div className="flex items-center gap-1.5">
                                                        {isCurrent && (
                                                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-teal-50 dark:bg-teal-950 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800">
                                                                ACTIVE TIER
                                                            </span>
                                                        )}

                                                        {/* Delete Plan Button */}
                                                        {canManagePlans && (
                                                            <button
                                                                type="button"
                                                                onClick={() => setPlanToDelete(p)}
                                                                title={`Delete ${p.name}`}
                                                                className="p-1.5 rounded-xl text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-all"
                                                            >
                                                                <Trash2 className="h-4 w-4" />
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>

                                                <div className="text-3xl font-black font-mono text-teal-700 dark:text-teal-400 mb-5">
                                                    ${Number(p.amount || p.price || 0).toFixed(2)}
                                                    <span className="text-xs text-slate-400 font-semibold font-sans"> / {p.duration_count || p.validity_months || 1} {p.duration_unit || 'months'}</span>
                                                </div>

                                                <ul className="space-y-2.5 text-xs text-slate-600 dark:text-slate-300 font-semibold">
                                                    <li className="flex items-center gap-2 p-2 rounded-xl bg-teal-50/40 dark:bg-slate-800/40 border border-teal-100 dark:border-white/5">
                                                        <CheckCircle2 className="h-4 w-4 text-teal-600 flex-shrink-0" />
                                                        <span><strong>{p.extensions ?? p.maxExtensions ?? 0}</strong> SIP Extensions</span>
                                                    </li>
                                                    <li className="flex items-center gap-2 p-2 rounded-xl bg-teal-50/40 dark:bg-slate-800/40 border border-teal-100 dark:border-white/5">
                                                        <CheckCircle2 className="h-4 w-4 text-teal-600 flex-shrink-0" />
                                                        <span><strong>{p.numbers ?? p.maxNumbers ?? 0}</strong> Direct Numbers</span>
                                                    </li>
                                                    <li className="flex items-center gap-2 p-2 rounded-xl bg-teal-50/40 dark:bg-slate-800/40 border border-teal-100 dark:border-white/5">
                                                        <CheckCircle2 className="h-4 w-4 text-teal-600 flex-shrink-0" />
                                                        <span><strong>{p.monitoring_extensions ?? p.maxMonitoringExtensions ?? 0}</strong> Monitoring Seats</span>
                                                    </li>
                                                </ul>
                                            </div>

                                            <div className="mt-6 pt-4 border-t border-teal-100 dark:border-white/10">
                                                <button
                                                    type="button"
                                                    onClick={() => handleInitiatePlanSwitch(p)}
                                                    disabled={isCurrent}
                                                    className={`w-full inline-flex justify-center items-center gap-1.5 rounded-2xl px-4 py-2.5 text-xs font-bold transition-all ${isCurrent
                                                        ? 'bg-teal-50 text-teal-600 dark:bg-teal-950 dark:text-teal-300 cursor-default'
                                                        : 'bg-gradient-to-r from-teal-600 to-teal-500 hover:from-teal-700 hover:to-teal-600 text-white shadow-md shadow-teal-600/20 active:scale-95'
                                                        }`}
                                                >
                                                    {isCurrent ? 'Current Plan' : (
                                                        <>
                                                            <span>Manage Subscription</span>
                                                            <ArrowUpRight className="h-4 w-4" />
                                                        </>
                                                    )}
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Tab 2: Add-on Catalog Management */}
            {activeTab === 'addons' && (
                <AddonCatalogManagement />
            )}

            {/* Plan Switch Modal Flow */}
            <PlanSwitchModal
                isOpen={planSwitchModalOpen}
                onClose={() => setPlanSwitchModalOpen(false)}
                currentPlan={subscription}
                newPlan={selectedPlanForSwitch}
                customerId={user?.tenantId}
                onSuccess={handleRefreshAll}
            />

            {/* Create New Plan Form Modal */}
            <PlanFormModal
                isOpen={showModal}
                onClose={() => setShowModal(false)}
                onSuccess={handleRefreshAll}
            />

            {/* Delete Plan Confirmation Modal */}
            <ConfirmActionModal
                isOpen={!!planToDelete}
                onClose={() => setPlanToDelete(null)}
                onConfirm={handleConfirmDeletePlan}
                title="Delete Plan"
                message={`Are you sure you want to delete ${planToDelete?.name || 'this plan'}? This action cannot be undone.`}
                confirmText="Delete"
                cancelText="Cancel"
                isDanger={true}
                loading={deleteLoading}
            />

        </div>
    );
};

export default PlansPage;
