import React, { useState, useEffect, useMemo } from 'react';
import {
    CreditCard,
    Calendar,
    RefreshCw,
    CheckCircle2,
    AlertCircle,
    Loader2,
    Sparkles,
    Layers,
    Clock,
    Zap,
    Building2,
    ChevronDown,
    X,
    Search,
    ChevronRight,
    Users,
    ArrowRight,
    ArrowLeft,
    Phone,
    Shield,
    History,
    MoveRight,
    Lock,
    Unlock
} from 'lucide-react';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { subscriptionService } from '../../services/subscription.service';

const formatDate = (val) => {
    if (!val) return '—';
    try {
        return new Date(val).toLocaleDateString(undefined, {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });
    } catch {
        return '—';
    }
};

const getDaysRemaining = (nextBilling) => {
    if (!nextBilling) return null;
    const now = new Date();
    const target = new Date(nextBilling);
    const diffTime = target.getTime() - now.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

const TenantSubscriptionsView = ({ onBrowseCatalog, onBrowsePlans }) => {
    const { user, isSuperAdmin } = useAuth();
    const { addToast } = useToast();

    // Tenants state
    const [tenants, setTenants] = useState([]);
    const [selectedTenantId, setSelectedTenantId] = useState(() => {
        if (isSuperAdmin) {
            const param = new URLSearchParams(window.location.search).get('tenantId');
            return param || 'all';
        }
        return user?.tenantId || '';
    });

    const isAllTenants = isSuperAdmin && selectedTenantId === 'all';
    const effectiveTenantId = isAllTenants ? null : (selectedTenantId || user?.tenantId);
    const currentTenant = isAllTenants ? null : tenants.find(t => t.id === effectiveTenantId);
    const isArchived = isAllTenants ? false : currentTenant?.status === 'ARCHIVED';

    // Data states
    const [loading, setLoading] = useState(false);
    const [plans, setPlans] = useState([]);
    const [allOverview, setAllOverview] = useState({ summary: null, data: [] });
    const [tenantSubscriptions, setTenantSubscriptions] = useState([]);
    const [tenantWallet, setTenantWallet] = useState(null);

    // Filters for All Tenants view
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('ALL');
    const [planFilter, setPlanFilter] = useState('ALL');

    // Modals
    const [activationModal, setActivationModal] = useState({
        isOpen: false,
        tenantId: '',
        plan_id: '',
        duration_count: 1,
        duration_unit: 'months',
        payment_mode: 'wallet',
        auto_renew: true
    });
    const [quote, setQuote] = useState(null);
    const [quoting, setQuoting] = useState(false);
    const [submittingActivation, setSubmittingActivation] = useState(false);

    const [renewalModal, setRenewalModal] = useState({
        isOpen: false,
        subscription: null,
        tenantId: ''
    });
    const [submittingRenewal, setSubmittingRenewal] = useState(false);

    const [reassignModal, setReassignModal] = useState({
        isOpen: false,
        tenantId: '',
        asset: null,
        targetSubscriptionId: ''
    });
    const [submittingReassign, setSubmittingReassign] = useState(false);

    const [historyModal, setHistoryModal] = useState({
        isOpen: false,
        subscription: null,
        events: [],
        loading: false
    });

    const [togglingAutoRenewId, setTogglingAutoRenewId] = useState(null);

    // Load tenants and plans
    useEffect(() => {
        subscriptionService.getPlans().then(setPlans).catch(err => console.error('Failed to load plans:', err));
        if (isSuperAdmin) {
            api.get('/tenants', { params: { limit: 1000, status: 'ALL' } })
                .then(res => {
                    const list = res.data?.data || (Array.isArray(res.data) ? res.data : []);
                    setTenants(list);
                })
                .catch(err => console.error('Failed to load tenants:', err));
        }
    }, [isSuperAdmin]);

    // Main data fetch
    const fetchData = async () => {
        setLoading(true);
        try {
            if (isAllTenants) {
                const res = await subscriptionService.getAllSubscriptions();
                setAllOverview({
                    summary: res?.summary || null,
                    data: Array.isArray(res?.data) ? res.data : (Array.isArray(res) ? res : [])
                });
            } else if (effectiveTenantId) {
                const [subsRes, walletRes] = await Promise.all([
                    subscriptionService.getSubscriptions(effectiveTenantId),
                    api.get('/wallet', { params: { tenantId: effectiveTenantId } }).catch(() => null)
                ]);
                setTenantSubscriptions(Array.isArray(subsRes) ? subsRes : (subsRes?.data || []));
                setTenantWallet(walletRes?.data || null);
            }
        } catch (err) {
            console.error('Failed to load subscriptions:', err);
            addToast('error', err.response?.data?.message || 'Failed to load subscription data');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [isAllTenants, effectiveTenantId]);

    // Live quote calculation when activation parameters change
    useEffect(() => {
        if (!activationModal.isOpen || !activationModal.plan_id) {
            setQuote(null);
            return;
        }

        let cancelled = false;
        setQuoting(true);
        const timer = setTimeout(async () => {
            try {
                const q = await subscriptionService.getQuote({
                    tenantId: activationModal.tenantId,
                    plan_id: activationModal.plan_id,
                    duration_unit: activationModal.duration_unit,
                    duration_count: activationModal.duration_count
                });
                if (!cancelled) setQuote(q);
            } catch (err) {
                if (!cancelled) {
                    console.error('Quote calculation error:', err);
                    setQuote(null);
                }
            } finally {
                if (!cancelled) setQuoting(false);
            }
        }, 300);

        return () => {
            cancelled = true;
            clearTimeout(timer);
        };
    }, [activationModal.isOpen, activationModal.plan_id, activationModal.duration_count, activationModal.duration_unit, activationModal.tenantId]);

    // Toggle Auto-Renew
    const handleToggleAutoRenew = async (subId, currentVal, targetTenant) => {
        if (!subId || togglingAutoRenewId === subId) return;
        const tenantToUse = targetTenant || effectiveTenantId;
        setTogglingAutoRenewId(subId);
        try {
            await subscriptionService.toggleAutoRenew(subId, !currentVal, tenantToUse);
            addToast('success', `Auto-renew turned ${!currentVal ? 'ON' : 'OFF'}`);
            fetchData();
        } catch (err) {
            console.error('Auto-renew toggle failed:', err);
            addToast('error', err.response?.data?.message || 'Failed to update auto-renew');
        } finally {
            setTogglingAutoRenewId(null);
        }
    };

    // Confirm Plan Activation
    const handleConfirmActivation = async (e) => {
        e.preventDefault();
        if (submittingActivation) return;
        setSubmittingActivation(true);
        try {
            await subscriptionService.activateSubscription({
                tenantId: activationModal.tenantId,
                plan_id: activationModal.plan_id,
                duration_count: Number(activationModal.duration_count),
                duration_unit: activationModal.duration_unit,
                payment_mode: activationModal.payment_mode,
                auto_renew: activationModal.auto_renew,
                operation_key: `act:${activationModal.tenantId}:${activationModal.plan_id}:${Date.now()}`
            });
            addToast('success', 'Subscription activated successfully');
            setActivationModal(prev => ({ ...prev, isOpen: false }));
            fetchData();
        } catch (err) {
            console.error('Activation failed:', err);
            addToast('error', err.response?.data?.message || 'Failed to activate subscription');
        } finally {
            setSubmittingActivation(false);
        }
    };

    // Confirm Manual Renewal
    const handleConfirmRenewal = async () => {
        if (!renewalModal.subscription || submittingRenewal) return;
        setSubmittingRenewal(true);
        try {
            await subscriptionService.renewSubscription(renewalModal.subscription.id, {
                tenantId: renewalModal.tenantId,
                operation_key: `renew:${renewalModal.subscription.id}:${Date.now()}`
            });
            addToast('success', 'Subscription renewed successfully');
            setRenewalModal({ isOpen: false, subscription: null, tenantId: '' });
            fetchData();
        } catch (err) {
            console.error('Renewal failed:', err);
            addToast('error', err.response?.data?.message || 'Failed to renew subscription');
        } finally {
            setSubmittingRenewal(false);
        }
    };

    // Confirm Asset Move
    const handleConfirmReassign = async (e) => {
        e.preventDefault();
        if (!reassignModal.asset || !reassignModal.targetSubscriptionId || submittingReassign) return;
        setSubmittingReassign(true);
        try {
            await subscriptionService.reassignAsset({
                tenantId: reassignModal.tenantId,
                asset_id: reassignModal.asset.id,
                type: reassignModal.asset.type,
                target_subscription_id: reassignModal.targetSubscriptionId
            });
            addToast('success', 'Asset moved successfully');
            setReassignModal({ isOpen: false, tenantId: '', asset: null, targetSubscriptionId: '' });
            fetchData();
        } catch (err) {
            console.error('Asset reassignment failed:', err);
            addToast('error', err.response?.data?.message || 'Failed to move asset');
        } finally {
            setSubmittingReassign(false);
        }
    };

    // Transition (Freeze, Cancel, Release)
    const handleTransition = async (subId, transition, targetTenant) => {
        if (!window.confirm(`Are you sure you want to ${transition} this subscription?`)) return;
        try {
            await subscriptionService.transitionSubscription(subId, transition, targetTenant || effectiveTenantId);
            addToast('success', `Subscription ${transition} executed`);
            fetchData();
        } catch (err) {
            console.error(`Transition ${transition} failed:`, err);
            addToast('error', err.response?.data?.message || `Failed to ${transition} subscription`);
        }
    };

    // Open History Modal
    const handleOpenHistory = async (sub, targetTenant) => {
        setHistoryModal({ isOpen: true, subscription: sub, events: [], loading: true });
        try {
            const data = await subscriptionService.getSubscriptionHistory(sub.id, targetTenant || effectiveTenantId);
            setHistoryModal(prev => ({ ...prev, events: Array.isArray(data) ? data : [], loading: false }));
        } catch (err) {
            console.error('Failed to load history:', err);
            setHistoryModal(prev => ({ ...prev, loading: false }));
            addToast('error', 'Failed to load subscription history');
        }
    };

    // Open Activation Modal pre-filled for a tenant
    const openActivationModal = (tenantId, defaultPlanId = '') => {
        const firstPlan = plans[0];
        setActivationModal({
            isOpen: true,
            tenantId: tenantId || effectiveTenantId,
            plan_id: defaultPlanId || firstPlan?.plan_id || '',
            duration_count: firstPlan?.duration_count || firstPlan?.validity_months || 1,
            duration_unit: firstPlan?.duration_unit || 'months',
            payment_mode: 'wallet',
            auto_renew: true
        });
    };

    // Filtered All Tenants data
    const rawAllTenantsList = allOverview.data || [];
    const filteredAllTenants = useMemo(() => {
        return rawAllTenantsList.filter(item => {
            if (statusFilter !== 'ALL' && item.tenantStatus?.toUpperCase() !== statusFilter) return false;
            if (planFilter === 'SUBSCRIBED' && !item.hasSubscription) return false;
            if (planFilter === 'NO_PLAN' && item.hasSubscription) return false;

            if (searchQuery.trim()) {
                const q = searchQuery.toLowerCase();
                const matchesName = item.tenantName?.toLowerCase().includes(q);
                const matchesCode = item.customerCode?.toLowerCase().includes(q);
                const matchesEmail = item.adminEmail?.toLowerCase().includes(q);
                const matchesPlan = item.subscription?.plan_name?.toLowerCase().includes(q);
                return Boolean(matchesName || matchesCode || matchesEmail || matchesPlan);
            }
            return true;
        });
    }, [rawAllTenantsList, statusFilter, planFilter, searchQuery]);

    // KPI stats
    const stats = useMemo(() => {
        if (allOverview.summary) return allOverview.summary;
        const total = rawAllTenantsList.length;
        const active = rawAllTenantsList.filter(t => t.hasSubscription).length;
        const noPlan = total - active;
        const deactivated = rawAllTenantsList.filter(t => t.tenantStatus !== 'ACTIVE').length;
        return { totalTenants: total, activeSubscriptions: active, noActivePlan: noPlan, deactivatedOrgs: deactivated };
    }, [allOverview.summary, rawAllTenantsList]);

    // Summary of active subscriptions for single tenant
    const activeSingleTenantSubs = useMemo(() => {
        return tenantSubscriptions.filter(s => ['active', 'grace'].includes(s.status));
    }, [tenantSubscriptions]);

    const activeAssetsSummary = useMemo(() => {
        const result = { extensions: { total: 0, used: 0 }, numbers: { total: 0, used: 0 }, monitoring_extensions: { total: 0, used: 0 } };
        for (const s of activeSingleTenantSubs) {
            const entitlements = s.entitlement_snapshot || {};
            const usage = s.usage || {};
            result.extensions.total += Number(entitlements.extensions || 0);
            result.extensions.used += Number(usage.extensions || 0);
            result.numbers.total += Number(entitlements.numbers || 0);
            result.numbers.used += Number(usage.numbers || 0);
            result.monitoring_extensions.total += Number(entitlements.monitoring_extensions || 0);
            result.monitoring_extensions.used += Number(usage.monitoring_extensions || 0);
        }
        return result;
    }, [activeSingleTenantSubs]);

    return (
        <div className="space-y-6 animate-in fade-in duration-300">
            {/* Header controls & Tenant selector */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-gray-200/80 dark:border-slate-800 shadow-xs">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-primary-50 dark:bg-primary-950/60 text-primary-600 dark:text-primary-400">
                        <CreditCard className="h-6 w-6 stroke-[2.2]" />
                    </div>
                    <div>
                        <h2 className="text-lg font-extrabold text-gray-900 dark:text-white">
                            Subscription & Recurring Services
                        </h2>
                        <p className="text-xs font-medium text-gray-500 dark:text-slate-400">
                            {isAllTenants ? 'Managing active plans across all tenant accounts' : `Managing subscriptions for ${currentTenant?.name || 'Selected Tenant'}`}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2.5 flex-wrap">
                    {/* Tenant Selector Dropdown (SuperAdmin only) */}
                    {isSuperAdmin && (
                        <div className="relative">
                            <select
                                value={selectedTenantId}
                                onChange={(e) => setSelectedTenantId(e.target.value)}
                                className="appearance-none pl-9 pr-9 py-2 rounded-xl text-xs font-bold bg-gray-50/70 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500 cursor-pointer shadow-xs"
                            >
                                <option value="all">🏢 All Tenants Overview</option>
                                <optgroup label="Individual Tenants">
                                    {tenants.map(t => (
                                        <option key={t.id} value={t.id}>
                                            {t.name} ({t.customerCode || t.id.slice(0, 8)}) {t.status === 'ARCHIVED' ? '— Deactivated' : ''}
                                        </option>
                                    ))}
                                </optgroup>
                            </select>
                            <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400 pointer-events-none" />
                            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400 pointer-events-none" />
                        </div>
                    )}

                    <button
                        type="button"
                        onClick={fetchData}
                        disabled={loading}
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-gray-50 dark:bg-slate-800 text-gray-700 dark:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-700 transition border border-gray-200 dark:border-slate-700 shadow-xs"
                    >
                        <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin text-primary-600' : ''}`} />
                        <span>Sync Status</span>
                    </button>

                    {!isAllTenants && (
                        <button
                            type="button"
                            onClick={() => openActivationModal(effectiveTenantId)}
                            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-primary-600 hover:bg-primary-700 text-white transition shadow-xs"
                        >
                            <Sparkles className="h-3.5 w-3.5" />
                            <span>Activate Plan</span>
                        </button>
                    )}
                </div>
            </div>

            {/* ========================================================================= */}
            {/* VIEW A: All Tenants Overview Table (when selectedTenantId === 'all')      */}
            {/* ========================================================================= */}
            {isAllTenants ? (
                <div className="space-y-6">
                    {/* KPI Stat Cards */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-gray-200/80 dark:border-slate-800 shadow-xs flex items-center gap-3.5">
                            <div className="h-11 w-11 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                                <Building2 className="h-5 w-5" />
                            </div>
                            <div>
                                <span className="text-[11px] font-black uppercase tracking-wider text-gray-400 dark:text-slate-500">Total Tenants</span>
                                <div className="text-xl font-black text-gray-900 dark:text-white mt-0.5">{stats.totalTenants}</div>
                            </div>
                        </div>

                        <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-gray-200/80 dark:border-slate-800 shadow-xs flex items-center gap-3.5">
                            <div className="h-11 w-11 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                                <CheckCircle2 className="h-5 w-5" />
                            </div>
                            <div>
                                <span className="text-[11px] font-black uppercase tracking-wider text-gray-400 dark:text-slate-500">Active Subscriptions</span>
                                <div className="text-xl font-black text-emerald-600 dark:text-emerald-400 mt-0.5">{stats.activeSubscriptions}</div>
                            </div>
                        </div>

                        <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-gray-200/80 dark:border-slate-800 shadow-xs flex items-center gap-3.5">
                            <div className="h-11 w-11 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                                <AlertCircle className="h-5 w-5" />
                            </div>
                            <div>
                                <span className="text-[11px] font-black uppercase tracking-wider text-gray-400 dark:text-slate-500">No Active Plan</span>
                                <div className="text-xl font-black text-amber-600 dark:text-amber-400 mt-0.5">{stats.noActivePlan}</div>
                            </div>
                        </div>

                        <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-gray-200/80 dark:border-slate-800 shadow-xs flex items-center gap-3.5">
                            <div className="h-11 w-11 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
                                <Layers className="h-5 w-5" />
                            </div>
                            <div>
                                <span className="text-[11px] font-black uppercase tracking-wider text-gray-400 dark:text-slate-500">Deactivated Orgs</span>
                                <div className="text-xl font-black text-rose-600 dark:text-rose-400 mt-0.5">{stats.deactivatedOrgs}</div>
                            </div>
                        </div>
                    </div>

                    {/* Search & Filters */}
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-3 rounded-2xl border border-gray-200/80 dark:border-slate-800 shadow-xs">
                        <div className="relative flex-1 max-w-md">
                            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search by tenant name, code, email, or plan..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-9 pr-8 py-2 rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50/50 dark:bg-slate-800 text-xs text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 transition"
                            />
                            {searchQuery && (
                                <button
                                    type="button"
                                    onClick={() => setSearchQuery('')}
                                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                >
                                    <X className="h-3.5 w-3.5" />
                                </button>
                            )}
                        </div>

                        <div className="flex items-center gap-2">
                            <select
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value)}
                                className="px-3 py-2 rounded-xl text-xs font-bold bg-gray-50/50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500 cursor-pointer"
                            >
                                <option value="ALL">All Statuses</option>
                                <option value="ACTIVE">Active Only</option>
                                <option value="ARCHIVED">Deactivated Only</option>
                            </select>

                            <select
                                value={planFilter}
                                onChange={(e) => setPlanFilter(e.target.value)}
                                className="px-3 py-2 rounded-xl text-xs font-bold bg-gray-50/50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500 cursor-pointer"
                            >
                                <option value="ALL">All Plan Types</option>
                                <option value="SUBSCRIBED">Subscribed Only</option>
                                <option value="NO_PLAN">No Active Plan</option>
                            </select>
                        </div>
                    </div>

                    {/* All Tenants Table */}
                    <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-gray-200/80 dark:border-slate-800 overflow-hidden">
                        {loading ? (
                            <div className="flex items-center justify-center py-16 gap-3 text-sm text-gray-500 dark:text-slate-400 font-medium">
                                <Loader2 className="h-5 w-5 animate-spin text-primary-600" />
                                <span>Loading all tenant subscriptions...</span>
                            </div>
                        ) : filteredAllTenants.length === 0 ? (
                            <div className="py-16 px-6 text-center">
                                <Building2 className="h-10 w-10 text-gray-300 dark:text-slate-600 mx-auto mb-3" />
                                <h4 className="text-sm font-bold text-gray-900 dark:text-white">No Tenants Found</h4>
                                <p className="text-xs text-gray-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
                                    No organizations match your current search or filter criteria.
                                </p>
                            </div>
                        ) : (
                            <div className="w-full overflow-x-auto">
                                <table className="w-full divide-y divide-gray-100 dark:divide-slate-800 text-left">
                                    <thead className="bg-gray-50/70 dark:bg-slate-800/50">
                                        <tr>
                                            <th className="px-4 py-3.5 text-[11px] font-black uppercase tracking-wider text-gray-500 dark:text-slate-400">Organization / Tenant</th>
                                            <th className="px-4 py-3.5 text-[11px] font-black uppercase tracking-wider text-gray-500 dark:text-slate-400">Current Plan</th>
                                            <th className="px-4 py-3.5 text-[11px] font-black uppercase tracking-wider text-gray-500 dark:text-slate-400">Limits & Add-ons</th>
                                            <th className="px-4 py-3.5 text-[11px] font-black uppercase tracking-wider text-gray-500 dark:text-slate-400">Renewal / Expiry</th>
                                            <th className="px-4 py-3.5 text-center text-[11px] font-black uppercase tracking-wider text-gray-500 dark:text-slate-400">Auto-Renew</th>
                                            <th className="px-4 py-3.5 text-right text-[11px] font-black uppercase tracking-wider text-gray-500 dark:text-slate-400">Wallet</th>
                                            <th className="px-4 py-3.5 text-right text-[11px] font-black uppercase tracking-wider text-gray-500 dark:text-slate-400">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100 dark:divide-slate-800 bg-white dark:bg-slate-900">
                                        {filteredAllTenants.map((t) => {
                                            const isOrgArchived = t.tenantStatus === 'ARCHIVED';
                                            const sub = t.subscription;
                                            const daysLeft = sub?.next_billing ? getDaysRemaining(sub.next_billing) : null;
                                            const isToggling = togglingAutoRenewId === sub?.id;

                                            return (
                                                <tr key={t.tenantId} className="hover:bg-gray-50/50 dark:hover:bg-slate-800/30 transition-colors">
                                                    {/* Organization */}
                                                    <td className="px-4 py-3.5">
                                                        <div className="flex items-center gap-3">
                                                            <div className="h-10 w-10 rounded-xl bg-primary-50 dark:bg-primary-950/60 border border-primary-200/60 dark:border-primary-800/40 flex items-center justify-center text-primary-600 dark:text-primary-400 font-extrabold text-sm shrink-0">
                                                                {t.tenantName ? t.tenantName.substring(0, 2).toUpperCase() : 'PB'}
                                                            </div>
                                                            <div className="min-w-0">
                                                                <div className="text-sm font-extrabold text-gray-900 dark:text-white truncate" title={t.tenantName}>
                                                                    {t.tenantName}
                                                                </div>
                                                                <div className="flex items-center gap-2 mt-1 flex-wrap">
                                                                    {t.customerCode && (
                                                                        <span className="text-xs font-mono text-gray-500 dark:text-slate-400">
                                                                            Code: {t.customerCode}
                                                                        </span>
                                                                    )}
                                                                    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase tracking-wider border ${
                                                                        isOrgArchived
                                                                            ? 'bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-900/40'
                                                                            : 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900/40'
                                                                    }`}>
                                                                        {isOrgArchived ? 'Deactivated' : 'Active'}
                                                                    </span>
                                                                    {t.adminEmail && (
                                                                        <span className="text-xs text-gray-400 dark:text-slate-500 truncate" title={t.adminEmail}>
                                                                            • {t.adminEmail}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </td>

                                                    {/* Current Plan */}
                                                    <td className="px-4 py-3.5">
                                                        {t.hasSubscription && sub ? (
                                                            <div className="space-y-1">
                                                                <div className="flex items-center gap-2">
                                                                    <span className="text-sm font-extrabold text-gray-900 dark:text-white truncate" title={sub.plan_name}>
                                                                        {sub.plan_name || 'Assigned Plan'}
                                                                    </span>
                                                                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                                                                        {sub.status || 'ACTIVE'}
                                                                    </span>
                                                                </div>
                                                                <div className="text-xs font-mono font-bold text-gray-500 dark:text-slate-400">
                                                                    ${Number(sub.renewal_price || sub.amount || 0).toFixed(2)} {sub.currency || 'USD'}
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold text-gray-500 dark:text-slate-400 bg-gray-100 dark:bg-slate-800 border border-gray-200 dark:border-slate-700">
                                                                <AlertCircle className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                                                                No Active Plan
                                                            </span>
                                                        )}
                                                    </td>

                                                    {/* Limits & Add-ons */}
                                                    <td className="px-4 py-3.5">
                                                        {t.hasSubscription && sub ? (
                                                            <div className="flex flex-wrap items-center gap-1.5 text-xs font-mono text-gray-700 dark:text-slate-300">
                                                                <span className="px-2 py-0.5 rounded bg-gray-100 dark:bg-slate-800 border border-gray-200 dark:border-slate-700">
                                                                    {sub.limits?.extensions ?? 0} Ext
                                                                </span>
                                                                <span className="px-2 py-0.5 rounded bg-gray-100 dark:bg-slate-800 border border-gray-200 dark:border-slate-700">
                                                                    {sub.limits?.numbers ?? 0} DIDs
                                                                </span>
                                                                {sub.limits?.monitoring_extensions !== undefined && (
                                                                    <span className="px-2 py-0.5 rounded bg-gray-100 dark:bg-slate-800 border border-gray-200 dark:border-slate-700">
                                                                        {sub.limits.monitoring_extensions} Mon
                                                                    </span>
                                                                )}
                                                            </div>
                                                        ) : (
                                                            <span className="text-xs text-gray-400">—</span>
                                                        )}
                                                    </td>

                                                    {/* Renewal / Expiry */}
                                                    <td className="px-4 py-3.5">
                                                        {sub?.next_billing ? (
                                                            <div className="space-y-0.5">
                                                                <div className="text-xs font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
                                                                    <Calendar className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                                                                    <span>{formatDate(sub.next_billing)}</span>
                                                                </div>
                                                                {daysLeft !== null && (
                                                                    <div className="text-xs font-medium text-gray-500 dark:text-slate-400 flex items-center gap-1">
                                                                        <Clock className="h-3 w-3 text-amber-500 shrink-0" />
                                                                        <span>{daysLeft > 0 ? `${daysLeft}d left` : 'Renews today'}</span>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        ) : (
                                                            <span className="text-xs text-gray-400">—</span>
                                                        )}
                                                    </td>

                                                    {/* Auto-Renew Interactive Toggle */}
                                                    <td className="px-4 py-3.5 text-center">
                                                        {t.hasSubscription && sub ? (
                                                            <button
                                                                type="button"
                                                                onClick={() => handleToggleAutoRenew(sub.id, sub.auto_renew, t.tenantId)}
                                                                disabled={isToggling || isOrgArchived}
                                                                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold transition shadow-2xs ${
                                                                    sub.auto_renew
                                                                        ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100'
                                                                        : 'bg-gray-100 dark:bg-slate-800 text-gray-500 dark:text-slate-400 border border-gray-200 dark:border-slate-700 hover:bg-gray-200'
                                                                } disabled:opacity-50`}
                                                                title="Click to toggle auto-renewal"
                                                            >
                                                                {isToggling ? (
                                                                    <Loader2 className="h-3 w-3 animate-spin" />
                                                                ) : (
                                                                    <span className={`h-2 w-2 rounded-full ${sub.auto_renew ? 'bg-emerald-500' : 'bg-gray-400'}`} />
                                                                )}
                                                                <span>{sub.auto_renew ? 'ON' : 'OFF'}</span>
                                                            </button>
                                                        ) : (
                                                            <span className="text-xs text-gray-400">—</span>
                                                        )}
                                                    </td>

                                                    {/* Wallet */}
                                                    <td className="px-4 py-3.5 text-right font-mono">
                                                        <div className="text-sm font-extrabold text-gray-900 dark:text-white">
                                                            ${Number(t.wallet?.balance || 0).toFixed(2)}
                                                        </div>
                                                    </td>

                                                    {/* Actions */}
                                                    <td className="px-4 py-3.5 text-right">
                                                        <div className="flex flex-col items-end gap-1.5 ml-auto w-fit">
                                                            {t.hasSubscription && sub ? (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => setRenewalModal({ isOpen: true, subscription: sub, tenantId: t.tenantId })}
                                                                    disabled={isOrgArchived}
                                                                    className="w-full inline-flex items-center justify-center gap-1 px-3 py-1 rounded-lg text-xs font-bold bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition shadow-xs disabled:opacity-40"
                                                                >
                                                                    <RefreshCw className="h-3 w-3" />
                                                                    <span>Renew</span>
                                                                </button>
                                                            ) : (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => openActivationModal(t.tenantId)}
                                                                    disabled={isOrgArchived}
                                                                    className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold bg-white dark:bg-slate-800 text-primary-600 dark:text-primary-400 border border-primary-200 dark:border-primary-800/60 hover:bg-primary-50 dark:hover:bg-primary-950/40 transition shadow-xs disabled:opacity-40"
                                                                >
                                                                    <Sparkles className="h-3 w-3" />
                                                                    <span>Assign Plan</span>
                                                                </button>
                                                            )}

                                                            <button
                                                                type="button"
                                                                onClick={() => setSelectedTenantId(t.tenantId)}
                                                                title="View detailed tenant subscriptions and capacity"
                                                                className="w-full inline-flex items-center justify-center gap-1 px-3 py-1 rounded-lg text-xs font-bold bg-primary-600 text-white hover:bg-primary-700 transition shadow-xs active:scale-95"
                                                            >
                                                                <span>Manage</span>
                                                                <ChevronRight className="h-3.5 w-3.5" />
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            ) : (
                /* ========================================================================= */
                /* VIEW B: Single Tenant Detailed View                                       */
                /* ========================================================================= */
                <div className="space-y-6">
                    {/* Top navigation back to all tenants */}
                    {isSuperAdmin && (
                        <button
                            type="button"
                            onClick={() => setSelectedTenantId('all')}
                            className="inline-flex items-center gap-2 text-xs font-bold text-gray-500 hover:text-gray-900 dark:text-slate-400 dark:hover:text-white transition"
                        >
                            <ArrowLeft className="h-4 w-4" />
                            <span>Back to All Tenants Overview</span>
                        </button>
                    )}

                    {/* Tenant Info & Capacity Card */}
                    <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-gray-200/80 dark:border-slate-800 shadow-xs space-y-6">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-gray-100 dark:border-slate-800">
                            <div>
                                <div className="flex items-center gap-3">
                                    <h3 className="text-xl font-black text-gray-900 dark:text-white">
                                        {currentTenant?.name || 'Organization Subscriptions'}
                                    </h3>
                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${
                                        isArchived
                                            ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800'
                                            : 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                                    }`}>
                                        {isArchived ? 'Deactivated' : 'Active'}
                                    </span>
                                </div>
                                <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">
                                    Customer Code: <span className="font-mono font-bold text-gray-700 dark:text-slate-300">{currentTenant?.customerCode || '—'}</span>
                                    {currentTenant?.adminEmail && ` • Admin: ${currentTenant.adminEmail}`}
                                </p>
                            </div>

                            <div className="flex items-center gap-4">
                                <div className="text-right">
                                    <span className="text-[10px] font-black uppercase tracking-wider text-gray-400 dark:text-slate-500">Wallet Balance</span>
                                    <div className="text-lg font-black font-mono text-gray-900 dark:text-white">
                                        ${Number(tenantWallet?.balance || 0).toFixed(2)}
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => openActivationModal(effectiveTenantId)}
                                    disabled={isArchived}
                                    className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold bg-primary-600 hover:bg-primary-700 text-white transition shadow-xs disabled:opacity-40"
                                >
                                    <Sparkles className="h-4 w-4" />
                                    <span>Activate New Plan</span>
                                </button>
                            </div>
                        </div>

                        {/* Resource Capacity Meters */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {/* Extensions */}
                            <div className="bg-gray-50/70 dark:bg-slate-800/50 p-4 rounded-xl border border-gray-100 dark:border-slate-800">
                                <div className="flex items-center justify-between text-xs font-bold mb-2">
                                    <span className="text-gray-600 dark:text-slate-300 flex items-center gap-1.5">
                                        <Users className="h-4 w-4 text-blue-500" />
                                        Extensions
                                    </span>
                                    <span className="font-mono text-gray-900 dark:text-white">
                                        {activeAssetsSummary.extensions.used} / {activeAssetsSummary.extensions.total}
                                    </span>
                                </div>
                                <div className="w-full bg-gray-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                                    <div
                                        className="bg-blue-500 h-full rounded-full transition-all duration-300"
                                        style={{ width: `${activeAssetsSummary.extensions.total ? Math.min(100, (activeAssetsSummary.extensions.used / activeAssetsSummary.extensions.total) * 100) : 0}%` }}
                                    />
                                </div>
                            </div>

                            {/* Numbers */}
                            <div className="bg-gray-50/70 dark:bg-slate-800/50 p-4 rounded-xl border border-gray-100 dark:border-slate-800">
                                <div className="flex items-center justify-between text-xs font-bold mb-2">
                                    <span className="text-gray-600 dark:text-slate-300 flex items-center gap-1.5">
                                        <Phone className="h-4 w-4 text-emerald-500" />
                                        Phone Numbers / DIDs
                                    </span>
                                    <span className="font-mono text-gray-900 dark:text-white">
                                        {activeAssetsSummary.numbers.used} / {activeAssetsSummary.numbers.total}
                                    </span>
                                </div>
                                <div className="w-full bg-gray-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                                    <div
                                        className="bg-emerald-500 h-full rounded-full transition-all duration-300"
                                        style={{ width: `${activeAssetsSummary.numbers.total ? Math.min(100, (activeAssetsSummary.numbers.used / activeAssetsSummary.numbers.total) * 100) : 0}%` }}
                                    />
                                </div>
                            </div>

                            {/* Monitoring */}
                            <div className="bg-gray-50/70 dark:bg-slate-800/50 p-4 rounded-xl border border-gray-100 dark:border-slate-800">
                                <div className="flex items-center justify-between text-xs font-bold mb-2">
                                    <span className="text-gray-600 dark:text-slate-300 flex items-center gap-1.5">
                                        <Shield className="h-4 w-4 text-purple-500" />
                                        Monitoring Seats
                                    </span>
                                    <span className="font-mono text-gray-900 dark:text-white">
                                        {activeAssetsSummary.monitoring_extensions.used} / {activeAssetsSummary.monitoring_extensions.total}
                                    </span>
                                </div>
                                <div className="w-full bg-gray-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                                    <div
                                        className="bg-purple-500 h-full rounded-full transition-all duration-300"
                                        style={{ width: `${activeAssetsSummary.monitoring_extensions.total ? Math.min(100, (activeAssetsSummary.monitoring_extensions.used / activeAssetsSummary.monitoring_extensions.total) * 100) : 0}%` }}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Subscriptions List */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <h4 className="text-base font-extrabold text-gray-900 dark:text-white flex items-center gap-2">
                                <Layers className="h-5 w-5 text-primary-600" />
                                <span>Subscription Packages & Add-ons ({tenantSubscriptions.length})</span>
                            </h4>
                        </div>

                        {tenantSubscriptions.length === 0 ? (
                            <div className="bg-white dark:bg-slate-900 rounded-2xl p-12 text-center border border-gray-200/80 dark:border-slate-800">
                                <CreditCard className="h-10 w-10 text-gray-300 dark:text-slate-600 mx-auto mb-3" />
                                <h4 className="text-sm font-bold text-gray-900 dark:text-white">No Subscriptions Found</h4>
                                <p className="text-xs text-gray-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
                                    This tenant does not have any active or historical subscription packages.
                                </p>
                                <button
                                    type="button"
                                    onClick={() => openActivationModal(effectiveTenantId)}
                                    className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-primary-600 hover:bg-primary-700 text-white transition shadow-xs"
                                >
                                    <Sparkles className="h-4 w-4" />
                                    <span>Activate First Subscription</span>
                                </button>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 gap-4">
                                {tenantSubscriptions.map((s) => {
                                    const isActive = ['active', 'grace'].includes(s.status);
                                    const daysLeft = s.current_period_end ? getDaysRemaining(s.current_period_end) : null;
                                    const isToggling = togglingAutoRenewId === s.id;

                                    return (
                                        <div
                                            key={s.id}
                                            className={`bg-white dark:bg-slate-900 rounded-2xl p-6 border shadow-xs transition-all ${
                                                isActive ? 'border-gray-200/80 dark:border-slate-800' : 'border-gray-100 dark:border-slate-800/60 opacity-80'
                                            }`}
                                        >
                                            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                                                {/* Left: Info */}
                                                <div className="space-y-2">
                                                    <div className="flex items-center gap-3 flex-wrap">
                                                        <h5 className="text-base font-extrabold text-gray-900 dark:text-white">
                                                            {s.plan_name || 'Subscription Package'}
                                                        </h5>
                                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider ${
                                                            isActive
                                                                ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                                                                : 'bg-gray-100 dark:bg-slate-800 text-gray-500 dark:text-slate-400 border border-gray-200 dark:border-slate-700'
                                                        }`}>
                                                            {s.status}
                                                        </span>
                                                        <span className="text-xs font-mono text-gray-400">
                                                            ID: {s.subscription_id || s.id}
                                                        </span>
                                                    </div>

                                                    <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-slate-400 flex-wrap">
                                                        <div>
                                                            Period End: <span className="font-bold text-gray-800 dark:text-slate-200">{formatDate(s.current_period_end)}</span>
                                                            {daysLeft !== null && (
                                                                <span className="ml-1 text-amber-600 dark:text-amber-400 font-semibold">({daysLeft > 0 ? `${daysLeft}d left` : 'Due today'})</span>
                                                            )}
                                                        </div>
                                                        <div>
                                                            Renewal: <span className="font-bold font-mono text-gray-800 dark:text-slate-200">${Number(s.renewal_price || s.amount || 0).toFixed(2)} {s.currency_snapshot || 'USD'}</span>
                                                        </div>
                                                        <div>
                                                            Duration: <span className="font-bold text-gray-800 dark:text-slate-200">{s.duration_count} {s.duration_unit}</span>
                                                        </div>
                                                    </div>

                                                    {/* Entitlement Badges */}
                                                    <div className="flex items-center gap-2 pt-1 flex-wrap">
                                                        {s.entitlement_snapshot?.extensions && (
                                                            <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-900/40">
                                                                {s.usage?.extensions || 0} / {s.entitlement_snapshot.extensions} Extensions
                                                            </span>
                                                        )}
                                                        {s.entitlement_snapshot?.numbers && (
                                                            <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/40">
                                                                {s.usage?.numbers || 0} / {s.entitlement_snapshot.numbers} DIDs
                                                            </span>
                                                        )}
                                                        {s.entitlement_snapshot?.monitoring_extensions && (
                                                            <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-400 border border-purple-200 dark:border-purple-900/40">
                                                                {s.usage?.monitoring_extensions || 0} / {s.entitlement_snapshot.monitoring_extensions} Monitoring
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Right: Actions */}
                                                <div className="flex items-center gap-2.5 flex-wrap lg:justify-end">
                                                    {/* Auto-Renew Button */}
                                                    <button
                                                        type="button"
                                                        onClick={() => handleToggleAutoRenew(s.id, s.auto_renew, effectiveTenantId)}
                                                        disabled={isToggling}
                                                        className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition shadow-xs ${
                                                            s.auto_renew
                                                                ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100'
                                                                : 'bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-300 border border-gray-200 dark:border-slate-700 hover:bg-gray-200'
                                                        }`}
                                                    >
                                                        {isToggling ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                                                        <span>Auto-Renew: {s.auto_renew ? 'ON' : 'OFF'}</span>
                                                    </button>

                                                    {/* Renew Button */}
                                                    <button
                                                        type="button"
                                                        onClick={() => setRenewalModal({ isOpen: true, subscription: s, tenantId: effectiveTenantId })}
                                                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white transition shadow-xs"
                                                    >
                                                        <RefreshCw className="h-3.5 w-3.5" />
                                                        <span>Renew</span>
                                                    </button>

                                                    {/* Move Asset */}
                                                    {Array.isArray(s.assets) && s.assets.length > 0 && (
                                                        <button
                                                            type="button"
                                                            onClick={() => setReassignModal({ isOpen: true, tenantId: effectiveTenantId, asset: s.assets[0], targetSubscriptionId: '' })}
                                                            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-white dark:bg-slate-800 text-gray-700 dark:text-slate-200 hover:bg-gray-50 border border-gray-200 dark:border-slate-700 transition shadow-xs"
                                                        >
                                                            <MoveRight className="h-3.5 w-3.5" />
                                                            <span>Move Asset</span>
                                                        </button>
                                                    )}

                                                    {/* History */}
                                                    <button
                                                        type="button"
                                                        onClick={() => handleOpenHistory(s, effectiveTenantId)}
                                                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-white dark:bg-slate-800 text-gray-700 dark:text-slate-200 hover:bg-gray-50 border border-gray-200 dark:border-slate-700 transition shadow-xs"
                                                    >
                                                        <History className="h-3.5 w-3.5" />
                                                        <span>History</span>
                                                    </button>

                                                    {/* SuperAdmin Transition: Cancel / Freeze */}
                                                    {isSuperAdmin && isActive && (
                                                        <button
                                                            type="button"
                                                            onClick={() => handleTransition(s.id, 'cancel', effectiveTenantId)}
                                                            className="inline-flex items-center gap-1 px-2.5 py-2 rounded-xl text-xs font-bold bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 transition shadow-xs"
                                                            title="Cancel Subscription"
                                                        >
                                                            <span>Cancel</span>
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* ========================================================================= */}
            {/* MODAL 1: Plan Activation Modal                                            */}
            {/* ========================================================================= */}
            {activationModal.isOpen && (
                <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-gray-100 dark:border-slate-800 space-y-5">
                        <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-slate-800">
                            <div className="flex items-center gap-2.5">
                                <div className="p-2 rounded-xl bg-primary-50 dark:bg-primary-950/60 text-primary-600 dark:text-primary-400">
                                    <Sparkles className="h-5 w-5" />
                                </div>
                                <div>
                                    <h3 className="text-base font-extrabold text-gray-900 dark:text-white">Activate Subscription Plan</h3>
                                    <p className="text-xs text-gray-500 dark:text-slate-400">Configure duration and payment for tenant activation</p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => setActivationModal(prev => ({ ...prev, isOpen: false }))}
                                className="text-gray-400 hover:text-gray-600 dark:hover:text-slate-300"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <form onSubmit={handleConfirmActivation} className="space-y-4">
                            {/* Plan Selection */}
                            <div>
                                <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 mb-1.5">
                                    Select Plan Package <span className="text-rose-500">*</span>
                                </label>
                                <select
                                    required
                                    value={activationModal.plan_id}
                                    onChange={(e) => {
                                        const p = plans.find(plan => (plan.plan_id || plan.id) === e.target.value);
                                        setActivationModal(prev => ({
                                            ...prev,
                                            plan_id: e.target.value,
                                            duration_unit: p?.duration_unit || 'months',
                                            duration_count: p?.duration_count || p?.validity_months || 1
                                        }));
                                    }}
                                    className="w-full px-3 py-2 rounded-xl text-xs font-bold bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                                >
                                    <option value="">Choose a plan...</option>
                                    {plans.map(p => (
                                        <option key={p.plan_id || p.id} value={p.plan_id || p.id}>
                                            {p.name} — ${p.amount} {p.currency || 'USD'} ({p.duration_count || p.validity_months || 1} {p.duration_unit || 'months'})
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Duration Count & Unit */}
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 mb-1.5">
                                        Duration Count
                                    </label>
                                    <input
                                        type="number"
                                        min="1"
                                        max="3660"
                                        required
                                        value={activationModal.duration_count}
                                        onChange={(e) => setActivationModal(prev => ({ ...prev, duration_count: Number(e.target.value) }))}
                                        className="w-full px-3 py-2 rounded-xl text-xs font-bold bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 mb-1.5">
                                        Duration Unit
                                    </label>
                                    <select
                                        value={activationModal.duration_unit}
                                        onChange={(e) => setActivationModal(prev => ({ ...prev, duration_unit: e.target.value }))}
                                        className="w-full px-3 py-2 rounded-xl text-xs font-bold bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                                    >
                                        <option value="months">Calendar Months</option>
                                        <option value="days">Days</option>
                                    </select>
                                </div>
                            </div>

                            {/* Payment Mode */}
                            <div>
                                <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 mb-1.5">
                                    Payment Mode
                                </label>
                                <select
                                    value={activationModal.payment_mode}
                                    onChange={(e) => setActivationModal(prev => ({ ...prev, payment_mode: e.target.value }))}
                                    className="w-full px-3 py-2 rounded-xl text-xs font-bold bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                                >
                                    <option value="wallet">Charge Tenant Wallet / Available Balance</option>
                                    <option value="pending">Pending Activation (No service until paid)</option>
                                    {isSuperAdmin && <option value="credit_override">Approved Credit Override (SuperAdmin)</option>}
                                </select>
                            </div>

                            {/* Auto-renew checkbox */}
                            <label className="flex items-center gap-2 text-xs font-bold text-gray-700 dark:text-slate-300 cursor-pointer pt-1">
                                <input
                                    type="checkbox"
                                    checked={activationModal.auto_renew}
                                    onChange={(e) => setActivationModal(prev => ({ ...prev, auto_renew: e.target.checked }))}
                                    className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                                />
                                <span>Enable automatic recurring renewal for this subscription</span>
                            </label>

                            {/* Live Quote Breakdown */}
                            {quoting ? (
                                <div className="p-3.5 rounded-xl bg-gray-50 dark:bg-slate-800 flex items-center justify-center gap-2 text-xs text-gray-500 font-medium">
                                    <Loader2 className="h-4 w-4 animate-spin text-primary-600" />
                                    <span>Calculating prorated price...</span>
                                </div>
                            ) : quote ? (
                                <div className="p-4 rounded-xl bg-primary-50/60 dark:bg-primary-950/40 border border-primary-200/60 dark:border-primary-800/40 space-y-2">
                                    <div className="flex items-center justify-between text-xs font-bold text-primary-900 dark:text-primary-200">
                                        <span>Initial Charge:</span>
                                        <span className="font-mono text-sm">${Number(quote.initial_charge || 0).toFixed(2)} {quote.currency}</span>
                                    </div>
                                    <div className="flex items-center justify-between text-[11px] text-gray-600 dark:text-slate-400">
                                        <span>Renewal Price:</span>
                                        <span className="font-mono">${Number(quote.renewal_price || 0).toFixed(2)} {quote.currency}</span>
                                    </div>
                                    {Number(quote.setup_fee || 0) > 0 && (
                                        <div className="flex items-center justify-between text-[11px] text-gray-600 dark:text-slate-400">
                                            <span>Includes Setup Fee:</span>
                                            <span className="font-mono">${Number(quote.setup_fee).toFixed(2)}</span>
                                        </div>
                                    )}
                                    <div className="flex items-center justify-between text-[11px] text-gray-600 dark:text-slate-400">
                                        <span>Initial End Date:</span>
                                        <span>{formatDate(quote.end_date)}</span>
                                    </div>
                                </div>
                            ) : null}

                            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-gray-100 dark:border-slate-800">
                                <button
                                    type="button"
                                    onClick={() => setActivationModal(prev => ({ ...prev, isOpen: false }))}
                                    className="px-4 py-2 rounded-xl text-xs font-bold text-gray-600 hover:text-gray-900 dark:text-slate-300 transition"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={submittingActivation || quoting || !quote}
                                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-primary-600 hover:bg-primary-700 text-white transition shadow-xs disabled:opacity-40"
                                >
                                    {submittingActivation ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                                    <span>Confirm Activation</span>
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ========================================================================= */}
            {/* MODAL 2: Renewal Confirmation Modal                                       */}
            {/* ========================================================================= */}
            {renewalModal.isOpen && renewalModal.subscription && (
                <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-100 dark:border-slate-800 space-y-5">
                        <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-slate-800">
                            <div className="flex items-center gap-2.5">
                                <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
                                    <RefreshCw className="h-5 w-5" />
                                </div>
                                <div>
                                    <h3 className="text-base font-extrabold text-gray-900 dark:text-white">Confirm Manual Renewal</h3>
                                    <p className="text-xs text-gray-500 dark:text-slate-400">Extend subscription validity</p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => setRenewalModal({ isOpen: false, subscription: null, tenantId: '' })}
                                className="text-gray-400 hover:text-gray-600 dark:hover:text-slate-300"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <div className="space-y-3 text-xs text-gray-600 dark:text-slate-300">
                            <p>
                                You are about to renew <span className="font-bold text-gray-900 dark:text-white">{renewalModal.subscription.plan_name}</span> for{' '}
                                <span className="font-bold">{renewalModal.subscription.duration_count} {renewalModal.subscription.duration_unit}</span>.
                            </p>
                            <div className="p-3.5 rounded-xl bg-gray-50 dark:bg-slate-800 space-y-1.5 font-mono">
                                <div className="flex justify-between">
                                    <span>Renewal Cost:</span>
                                    <span className="font-bold text-gray-900 dark:text-white">
                                        ${Number(renewalModal.subscription.renewal_price || renewalModal.subscription.amount || 0).toFixed(2)} {renewalModal.subscription.currency_snapshot || 'USD'}
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span>Current Period End:</span>
                                    <span>{formatDate(renewalModal.subscription.current_period_end)}</span>
                                </div>
                            </div>
                            <p className="text-[11px] text-gray-400">
                                Payment will be deducted from the tenant's wallet balance. Early renewal extends the current end date without losing remaining days.
                            </p>
                        </div>

                        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-gray-100 dark:border-slate-800">
                            <button
                                type="button"
                                onClick={() => setRenewalModal({ isOpen: false, subscription: null, tenantId: '' })}
                                className="px-4 py-2 rounded-xl text-xs font-bold text-gray-600 hover:text-gray-900 dark:text-slate-300 transition"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleConfirmRenewal}
                                disabled={submittingRenewal}
                                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white transition shadow-xs disabled:opacity-40"
                            >
                                {submittingRenewal ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                                <span>Confirm Payment</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ========================================================================= */}
            {/* MODAL 3: Asset Reassignment Modal                                         */}
            {/* ========================================================================= */}
            {reassignModal.isOpen && (
                <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-100 dark:border-slate-800 space-y-5">
                        <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-slate-800">
                            <div className="flex items-center gap-2.5">
                                <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400">
                                    <MoveRight className="h-5 w-5" />
                                </div>
                                <div>
                                    <h3 className="text-base font-extrabold text-gray-900 dark:text-white">Move Asset Between Plans</h3>
                                    <p className="text-xs text-gray-500 dark:text-slate-400">Reassign asset ownership without disrupting service</p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => setReassignModal({ isOpen: false, tenantId: '', asset: null, targetSubscriptionId: '' })}
                                className="text-gray-400 hover:text-gray-600 dark:hover:text-slate-300"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <form onSubmit={handleConfirmReassign} className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 mb-1.5">
                                    Asset to Move
                                </label>
                                <input
                                    type="text"
                                    disabled
                                    value={`${reassignModal.asset?.type?.toUpperCase()}: ${reassignModal.asset?.value || reassignModal.asset?.id}`}
                                    className="w-full px-3 py-2 rounded-xl text-xs font-bold bg-gray-100 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-600 dark:text-slate-400 cursor-not-allowed"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-700 dark:text-slate-300 mb-1.5">
                                    Destination Active Subscription <span className="text-rose-500">*</span>
                                </label>
                                <select
                                    required
                                    value={reassignModal.targetSubscriptionId}
                                    onChange={(e) => setReassignModal(prev => ({ ...prev, targetSubscriptionId: e.target.value }))}
                                    className="w-full px-3 py-2 rounded-xl text-xs font-bold bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
                                >
                                    <option value="">Select active destination subscription...</option>
                                    {activeSingleTenantSubs
                                        .filter(s => s.id !== reassignModal.asset?.subscription_id)
                                        .map(s => (
                                            <option key={s.id} value={s.id}>
                                                {s.plan_name} ({s.subscription_id || s.id})
                                            </option>
                                        ))}
                                </select>
                            </div>

                            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-gray-100 dark:border-slate-800">
                                <button
                                    type="button"
                                    onClick={() => setReassignModal({ isOpen: false, tenantId: '', asset: null, targetSubscriptionId: '' })}
                                    className="px-4 py-2 rounded-xl text-xs font-bold text-gray-600 hover:text-gray-900 dark:text-slate-300 transition"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={submittingReassign || !reassignModal.targetSubscriptionId}
                                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-primary-600 hover:bg-primary-700 text-white transition shadow-xs disabled:opacity-40"
                                >
                                    {submittingReassign ? <Loader2 className="h-4 w-4 animate-spin" /> : <MoveRight className="h-4 w-4" />}
                                    <span>Confirm Move</span>
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ========================================================================= */}
            {/* MODAL 4: Subscription History Timeline Modal                              */}
            {/* ========================================================================= */}
            {historyModal.isOpen && (
                <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-gray-100 dark:border-slate-800 space-y-4">
                        <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-slate-800">
                            <div className="flex items-center gap-2.5">
                                <div className="p-2 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400">
                                    <History className="h-5 w-5" />
                                </div>
                                <div>
                                    <h3 className="text-base font-extrabold text-gray-900 dark:text-white">Subscription Audit History</h3>
                                    <p className="text-xs text-gray-500 dark:text-slate-400">
                                        Lifecycle log for {historyModal.subscription?.plan_name}
                                    </p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => setHistoryModal({ isOpen: false, subscription: null, events: [], loading: false })}
                                className="text-gray-400 hover:text-gray-600 dark:hover:text-slate-300"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        {historyModal.loading ? (
                            <div className="py-12 flex items-center justify-center gap-2 text-xs text-gray-500">
                                <Loader2 className="h-4 w-4 animate-spin text-primary-600" />
                                <span>Loading history events...</span>
                            </div>
                        ) : historyModal.events.length === 0 ? (
                            <div className="py-10 text-center text-xs text-gray-500">
                                No audit events logged yet for this subscription.
                            </div>
                        ) : (
                            <div className="max-h-72 overflow-y-auto divide-y divide-gray-100 dark:divide-slate-800 pr-1">
                                {historyModal.events.map((ev, idx) => (
                                    <div key={idx} className="py-2.5 text-xs flex items-start justify-between gap-3">
                                        <div>
                                            <div className="font-bold text-gray-900 dark:text-white capitalize">
                                                {ev.action || ev.event_type || 'Lifecycle Event'}
                                            </div>
                                            <div className="text-[11px] text-gray-500 dark:text-slate-400 mt-0.5">
                                                Status: <span className="font-semibold text-gray-700 dark:text-slate-300">{ev.status_after || ev.status || 'recorded'}</span>
                                                {ev.actor_id && ` • By: ${ev.actor_id}`}
                                            </div>
                                        </div>
                                        <div className="text-[11px] font-mono text-gray-400 shrink-0">
                                            {formatDate(ev.created_at)}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        <div className="flex items-center justify-end pt-3 border-t border-gray-100 dark:border-slate-800">
                            <button
                                type="button"
                                onClick={() => setHistoryModal({ isOpen: false, subscription: null, events: [], loading: false })}
                                className="px-4 py-2 rounded-xl text-xs font-bold bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-200 hover:bg-gray-200 transition"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TenantSubscriptionsView;
