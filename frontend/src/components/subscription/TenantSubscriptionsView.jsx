import React, { useState, useEffect, useMemo } from 'react';
import {
    Package,
    CreditCard,
    Calendar,
    RefreshCw,
    ArrowUpDown,
    CheckCircle2,
    AlertCircle,
    Loader2,
    Sparkles,
    Layers,
    Trash2,
    Clock,
    Zap,
    Building2,
    ChevronDown,
    X,
    Search,
    ChevronRight,
    Users
} from 'lucide-react';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { useSubscriptionQuery } from '../../hooks/useBillingQueries';
import { subscriptionService } from '../../services/subscription.service';
import { addonsService } from '../../services/addons.service';
import PlanSwitchModal from './PlanSwitchModal';
import ConfirmActionModal from './ConfirmActionModal';

const TenantSubscriptionsView = ({ onBrowseCatalog, onBrowsePlans }) => {
    const { user, isSuperAdmin } = useAuth();
    const { addToast } = useToast();

    // Tenants state for Super Admin
    const [tenants, setTenants] = useState([]);
    const [selectedTenantId, setSelectedTenantId] = useState('');

    useEffect(() => {
        if (isSuperAdmin) {
            api.get('/tenants?limit=100')
                .then(res => {
                    const list = res.data?.data || (Array.isArray(res.data) ? res.data : []);
                    setTenants(list);
                    if (list.length > 0 && !selectedTenantId) {
                        setSelectedTenantId('all');
                    }
                })
                .catch(err => {
                    console.error('Failed to load tenants for selector:', err);
                });
        }
    }, [isSuperAdmin]);

    const isAllTenants = isSuperAdmin && selectedTenantId === 'all';
    const effectiveTenantId = isSuperAdmin ? selectedTenantId : user?.tenantId;
    const currentTenant = isAllTenants ? null : tenants.find(t => t.id === effectiveTenantId);
    const isArchived = isAllTenants ? false : currentTenant?.status === 'ARCHIVED';

    // Target tenant for modal actions (used when opening PlanSwitchModal from all-tenants view)
    const [modalTargetTenant, setModalTargetTenant] = useState(null);

    // Filters for All Tenants view
    const [allSearchQuery, setAllSearchQuery] = useState('');
    const [allStatusFilter, setAllStatusFilter] = useState('ALL');
    const [allPlanFilter, setAllPlanFilter] = useState('ALL');

    // Primary Subscription query
    const {
        data: subscription,
        isLoading: subLoading,
        isFetching: subFetching,
        refetch: refetchSubscription
    } = useSubscriptionQuery(effectiveTenantId, isAllTenants ? { limit: 100 } : {});

    // Add-on Subscriptions State
    const [addons, setAddons] = useState([]);
    const [addonsLoading, setAddonsLoading] = useState(false);
    const [togglingPlanAutoRenew, setTogglingPlanAutoRenew] = useState(false);
    const [togglingAddonId, setTogglingAddonId] = useState(null);

    // Plan Switch Modal
    const [planSwitchModalOpen, setPlanSwitchModalOpen] = useState(false);

    // Cancel Scheduled Switch State
    const [cancellingSchedule, setCancellingSchedule] = useState(false);

    // Cancel Addon Modal State
    const [addonToCancel, setAddonToCancel] = useState(null);
    const [cancellingAddon, setCancellingAddon] = useState(false);

    const subscriptionId = isAllTenants ? null : (subscription?.id || subscription?.subscription_id);

    // Fetch active add-ons when subscription is available (only for single tenant)
    useEffect(() => {
        if (!isAllTenants && subscriptionId) {
            fetchSubscriptionAddons(subscriptionId);
        } else {
            setAddons([]);
        }
    }, [isAllTenants, subscriptionId]);

    const fetchSubscriptionAddons = async (subId) => {
        setAddonsLoading(true);
        try {
            const data = await addonsService.getSubscriptionAddons(subId);
            setAddons(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error('Failed to fetch subscription add-ons:', err);
            // Graceful fallback: set empty array if none found
            setAddons([]);
        } finally {
            setAddonsLoading(false);
        }
    };

    const handleRefreshAll = () => {
        refetchSubscription();
        if (!isAllTenants && subscriptionId) {
            fetchSubscriptionAddons(subscriptionId);
        }
    };

    // Cancel Scheduled Plan Switch
    const handleCancelScheduledSwitch = async () => {
        if (cancellingSchedule) return;
        if (!window.confirm('Are you sure you want to cancel the scheduled plan switch? Your current plan will remain active and renew normally.')) {
            return;
        }
        setCancellingSchedule(true);
        try {
            const res = await subscriptionService.cancelScheduledSwitch(effectiveTenantId);
            addToast('success', res?.message || 'Scheduled plan switch cancelled successfully.');
            handleRefreshAll();
        } catch (err) {
            console.error('Failed to cancel scheduled plan switch:', err);
            const msg = err.response?.data?.message || err.normalized?.message || 'Failed to cancel scheduled plan switch';
            addToast('error', msg);
        } finally {
            setCancellingSchedule(false);
        }
    };

    // Toggle Primary Plan Auto-Renew
    const handleTogglePlanAutoRenew = async () => {
        if (togglingPlanAutoRenew) return;
        const currentVal = !!subscription?.auto_renew;
        const nextVal = !currentVal;

        setTogglingPlanAutoRenew(true);
        try {
            await subscriptionService.toggleAutoRenew(effectiveTenantId, nextVal);
            addToast('success', `Plan auto-renew turned ${nextVal ? 'ON' : 'OFF'}`);
            refetchSubscription();
        } catch (err) {
            console.error('Failed to toggle plan auto-renew:', err);
            const msg = err.response?.data?.message || err.normalized?.message || 'Failed to update auto-renew setting';
            addToast('error', msg);
        } finally {
            setTogglingPlanAutoRenew(false);
        }
    };

    // Toggle Add-on Auto-Renew
    const handleToggleAddonAutoRenew = async (addonItem) => {
        const addonSubId = addonItem.id || addonItem.subscription_addon_id;
        if (!addonSubId || togglingAddonId === addonSubId) return;

        const nextVal = !addonItem.auto_renew;
        setTogglingAddonId(addonSubId);

        // Optimistic UI update
        setAddons(prev => prev.map(item => {
            const id = item.id || item.subscription_addon_id;
            return id === addonSubId ? { ...item, auto_renew: nextVal } : item;
        }));

        try {
            await addonsService.toggleAutoRenew(addonSubId, nextVal);
            addToast('success', `Add-on auto-renew turned ${nextVal ? 'ON' : 'OFF'}`);
        } catch (err) {
            console.error('Failed to toggle add-on auto-renew:', err);
            // Revert optimistic update
            setAddons(prev => prev.map(item => {
                const id = item.id || item.subscription_addon_id;
                return id === addonSubId ? { ...item, auto_renew: !nextVal } : item;
            }));
            const msg = err.response?.data?.message || err.normalized?.message || 'Failed to update add-on auto-renew';
            addToast('error', msg);
        } finally {
            setTogglingAddonId(null);
        }
    };

    // Confirm cancel add-on
    const handleConfirmCancelAddon = async () => {
        if (!addonToCancel) return;
        const addonSubId = addonToCancel.id || addonToCancel.subscription_addon_id;
        setCancellingAddon(true);
        try {
            await addonsService.cancelSubscriptionAddon(addonSubId);
            addToast('success', 'Add-on subscription cancelled successfully');
            setAddonToCancel(null);
            if (subscriptionId) {
                fetchSubscriptionAddons(subscriptionId);
            }
        } catch (err) {
            console.error('Failed to cancel addon subscription:', err);
            const msg = err.response?.data?.message || err.normalized?.message || 'Failed to cancel add-on';
            addToast('error', msg);
        } finally {
            setCancellingAddon(false);
        }
    };

    // Calculate days remaining helper
    const getDaysRemaining = (expiryDate) => {
        if (!expiryDate) return null;
        const diffTime = new Date(expiryDate).getTime() - new Date().getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays;
    };

    // All Tenants data and filtering
    const rawAllTenantsList = useMemo(() => {
        if (!isAllTenants) return [];
        if (Array.isArray(subscription?.data)) return subscription.data;
        if (Array.isArray(subscription)) return subscription;
        return [];
    }, [isAllTenants, subscription]);

    const filteredAllTenants = useMemo(() => {
        if (!isAllTenants) return [];
        return rawAllTenantsList.filter(item => {
            // Status filter
            if (allStatusFilter !== 'ALL' && item.tenantStatus?.toUpperCase() !== allStatusFilter) {
                return false;
            }
            // Plan filter
            if (allPlanFilter === 'SUBSCRIBED' && !item.hasSubscription) return false;
            if (allPlanFilter === 'NO_PLAN' && item.hasSubscription) return false;

            // Search query
            if (allSearchQuery.trim()) {
                const q = allSearchQuery.toLowerCase();
                const matchesName = (item.tenantName || '').toLowerCase().includes(q);
                const matchesCode = (item.customerCode || '').toLowerCase().includes(q);
                const matchesEmail = (item.adminEmail || '').toLowerCase().includes(q);
                const matchesPlan = (item.subscription?.plan_name || '').toLowerCase().includes(q);
                const matchesCustId = (item.subBillingCustomerId || '').toLowerCase().includes(q);
                return matchesName || matchesCode || matchesEmail || matchesPlan || matchesCustId;
            }

            return true;
        });
    }, [isAllTenants, rawAllTenantsList, allStatusFilter, allPlanFilter, allSearchQuery]);

    // KPI counts for All Tenants
    const allStats = useMemo(() => {
        const total = rawAllTenantsList.length;
        const subscribed = rawAllTenantsList.filter(t => t.hasSubscription).length;
        const noPlan = total - subscribed;
        const archived = rawAllTenantsList.filter(t => t.tenantStatus === 'ARCHIVED').length;
        return { total, subscribed, noPlan, archived };
    }, [rawAllTenantsList]);

    return (
        <div className="space-y-8 animate-in fade-in duration-300">

            {/* Top Toolbar / Refresh Status */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
                <div>
                    <h2 className="text-xl font-extrabold text-gray-900 dark:text-white flex items-center gap-2">
                        <CreditCard className="h-6 w-6 text-primary-600 dark:text-primary-400" />
                        Subscription & Recurring Services
                    </h2>
                    <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">
                        Manage active plan, recurring add-ons, and automated renewals
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    {isSuperAdmin && (
                        <div className="relative bg-white dark:bg-slate-800 border border-gray-200/90 dark:border-slate-700 shadow-xs rounded-xl flex items-center px-3 py-1.5 gap-2 hover:border-slate-300 transition-all">
                            <Building2 className="h-4 w-4 text-primary-600 dark:text-primary-400 shrink-0" />
                            <select
                                value={selectedTenantId}
                                onChange={(e) => setSelectedTenantId(e.target.value)}
                                className="bg-transparent text-xs font-bold text-gray-800 dark:text-slate-200 pr-5 py-0.5 focus:outline-none cursor-pointer border-none ring-0 appearance-none font-sans"
                                style={{ WebkitAppearance: 'none', MozAppearance: 'none' }}
                            >
                                {tenants.length === 0 && (
                                    <option value="">No Tenants</option>
                                )}
                                <option value="all" className="dark:bg-slate-800 font-bold">
                                    🏢 All Tenants
                                </option>
                                {tenants.map((t) => (
                                    <option key={t.id} value={t.id} className="dark:bg-slate-800">
                                        🏢 {t.name} {t.status === 'ARCHIVED' ? '(Deactivated)' : ''}
                                    </option>
                                ))}
                            </select>
                            <ChevronDown className="h-3.5 w-3.5 text-gray-400 pointer-events-none -ml-4" />
                        </div>
                    )}
                    <button
                        onClick={handleRefreshAll}
                        disabled={subFetching || addonsLoading}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-white dark:bg-slate-800 text-gray-700 dark:text-slate-200 border border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700 transition shadow-xs disabled:opacity-50"
                        title="Refresh Subscriptions"
                    >
                        <RefreshCw className={`h-3.5 w-3.5 ${(subFetching || addonsLoading) ? 'animate-spin' : ''}`} />
                        <span>Sync Status</span>
                    </button>
                </div>
            </div>

            {/* ========================================================================= */}
            {/* VIEW A: All Tenants Subscriptions Overview (when selectedTenantId === 'all') */}
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
                                <div className="text-xl font-extrabold text-gray-900 dark:text-white">
                                    {allStats.total}
                                </div>
                                <div className="text-[11px] font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                                    Total Tenants
                                </div>
                            </div>
                        </div>

                        <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-gray-200/80 dark:border-slate-800 shadow-xs flex items-center gap-3.5">
                            <div className="h-11 w-11 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                                <CheckCircle2 className="h-5 w-5" />
                            </div>
                            <div>
                                <div className="text-xl font-extrabold text-emerald-600 dark:text-emerald-400">
                                    {allStats.subscribed}
                                </div>
                                <div className="text-[11px] font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                                    Active Subscriptions
                                </div>
                            </div>
                        </div>

                        <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-gray-200/80 dark:border-slate-800 shadow-xs flex items-center gap-3.5">
                            <div className="h-11 w-11 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                                <AlertCircle className="h-5 w-5" />
                            </div>
                            <div>
                                <div className="text-xl font-extrabold text-amber-600 dark:text-amber-400">
                                    {allStats.noPlan}
                                </div>
                                <div className="text-[11px] font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                                    No Active Plan
                                </div>
                            </div>
                        </div>

                        <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-gray-200/80 dark:border-slate-800 shadow-xs flex items-center gap-3.5">
                            <div className="h-11 w-11 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
                                <Layers className="h-5 w-5" />
                            </div>
                            <div>
                                <div className="text-xl font-extrabold text-gray-900 dark:text-white">
                                    {allStats.archived}
                                </div>
                                <div className="text-[11px] font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider">
                                    Deactivated Orgs
                                </div>
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
                                value={allSearchQuery}
                                onChange={(e) => setAllSearchQuery(e.target.value)}
                                className="w-full pl-9 pr-8 py-2 rounded-xl border border-gray-200 dark:border-slate-700 bg-gray-50/50 dark:bg-slate-800 text-xs text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 transition"
                            />
                            {allSearchQuery && (
                                <button
                                    type="button"
                                    onClick={() => setAllSearchQuery('')}
                                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                >
                                    <X className="h-3.5 w-3.5" />
                                </button>
                            )}
                        </div>

                        <div className="flex items-center gap-2">
                            <select
                                value={allStatusFilter}
                                onChange={(e) => setAllStatusFilter(e.target.value)}
                                className="px-3 py-2 rounded-xl text-xs font-bold bg-gray-50/50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500 cursor-pointer"
                            >
                                <option value="ALL">All Statuses</option>
                                <option value="ACTIVE">Active Only</option>
                                <option value="ARCHIVED">Deactivated Only</option>
                            </select>

                            <select
                                value={allPlanFilter}
                                onChange={(e) => setAllPlanFilter(e.target.value)}
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
                        {subLoading ? (
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
                            <div className="w-full overflow-hidden">
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
                                                                    ${Number(sub.amount || 0).toFixed(2)} / mo
                                                                </div>
                                                                {sub.target_plan_name && (
                                                                    <div className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 dark:text-amber-400">
                                                                        <Clock className="h-2.5 w-2.5 shrink-0" />
                                                                        <span>Switch: {sub.target_plan_name}</span>
                                                                    </div>
                                                                )}
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
                                                            <div className="space-y-1.5">
                                                                <div className="flex items-center gap-1.5 text-xs font-mono text-gray-700 dark:text-slate-300">
                                                                    <span className="px-2 py-0.5 rounded bg-gray-100 dark:bg-slate-800 border border-gray-200 dark:border-slate-700">
                                                                        {sub.limits?.extensions ?? 0} Ext
                                                                    </span>
                                                                    <span className="px-2 py-0.5 rounded bg-gray-100 dark:bg-slate-800 border border-gray-200 dark:border-slate-700">
                                                                        {sub.limits?.free_mins ?? 0} Mins
                                                                    </span>
                                                                </div>
                                                                {sub.active_addons_count > 0 && (
                                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800/60">
                                                                        <Layers className="h-3 w-3" />
                                                                        {sub.active_addons_count} {sub.active_addons_count === 1 ? 'Add-on' : 'Add-ons'}
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
                                                                    <span>
                                                                        {new Date(sub.next_billing).toLocaleDateString(undefined, {
                                                                            month: 'short',
                                                                            day: 'numeric',
                                                                            year: 'numeric'
                                                                        })}
                                                                    </span>
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

                                                    {/* Auto-Renew */}
                                                    <td className="px-4 py-3.5 text-center">
                                                        {t.hasSubscription && sub ? (
                                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${
                                                                sub.auto_renew
                                                                    ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                                                                    : 'bg-gray-100 dark:bg-slate-800 text-gray-500 dark:text-slate-400 border border-gray-200 dark:border-slate-700'
                                                            }`}>
                                                                {sub.auto_renew ? 'ON' : 'OFF'}
                                                            </span>
                                                        ) : (
                                                            <span className="text-xs text-gray-400">—</span>
                                                        )}
                                                    </td>

                                                    {/* Wallet */}
                                                    <td className="px-4 py-3.5 text-right font-mono">
                                                        <div className="text-sm font-extrabold text-gray-900 dark:text-white">
                                                            ${Number(t.wallet?.balance || 0).toFixed(2)}
                                                        </div>
                                                        {t.wallet?.freeMins > 0 && (
                                                            <div className="text-xs text-gray-400 dark:text-slate-500">
                                                                {t.wallet.freeMins} free mins
                                                            </div>
                                                        )}
                                                    </td>

                                                    {/* Actions: Change / Assign stacked on top of Manage */}
                                                    <td className="px-4 py-3.5 text-right">
                                                        <div className="flex flex-col items-end gap-1.5 ml-auto w-fit">
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    setModalTargetTenant(t);
                                                                    setPlanSwitchModalOpen(true);
                                                                }}
                                                                disabled={isOrgArchived}
                                                                title={isOrgArchived ? "Subscription changes disabled for deactivated tenants." : (t.hasSubscription ? "Change Plan" : "Assign Plan")}
                                                                className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-white dark:bg-slate-800 text-primary-600 dark:text-primary-400 border border-primary-200 dark:border-primary-800/60 hover:bg-primary-50 dark:hover:bg-primary-950/40 transition shadow-xs disabled:opacity-40 disabled:cursor-not-allowed"
                                                            >
                                                                <Sparkles className="h-3 w-3" />
                                                                <span>{t.hasSubscription ? 'Change' : 'Assign'}</span>
                                                            </button>

                                                            <button
                                                                type="button"
                                                                onClick={() => setSelectedTenantId(t.tenantId)}
                                                                title="View detailed tenant subscriptions and add-ons"
                                                                className="w-full inline-flex items-center justify-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold bg-primary-600 text-white hover:bg-primary-700 transition shadow-xs active:scale-95"
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
                /* VIEW B: Single Tenant View (when a specific tenant is selected)            */
                /* ========================================================================= */
                <>
                    {/* Deactivation Warning Banner */}
                    {isArchived && (
                        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 dark:bg-amber-950/40 dark:border-amber-800/60 text-amber-900 dark:text-amber-200 flex items-center gap-3 shadow-xs animate-in fade-in duration-200">
                            <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0" />
                            <p className="text-sm font-semibold">
                                This organization is deactivated. Subscriptions, recurring renewals, and add-on purchases are locked.
                            </p>
                        </div>
                    )}
                    {/* ========================================================================= */}
                    {/* SECTION 2A: Primary Subscription Table                                    */}
                    {/* ========================================================================= */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="p-1.5 rounded-lg bg-primary-50 dark:bg-primary-950/60 text-primary-600 dark:text-primary-400">
                            <Sparkles className="h-4 w-4" />
                        </div>
                        <h3 className="text-base font-extrabold text-gray-900 dark:text-white tracking-tight">
                            Primary Subscription
                        </h3>
                    </div>
                </div>

                {/* Scheduled Switch Pending Alert Banner */}
                {subscription?.target_plan_name && (
                    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent dark:from-amber-500/15 dark:via-amber-950/30 dark:to-transparent border-2 border-amber-400/80 dark:border-amber-500/50 p-5 shadow-lg shadow-amber-500/5 backdrop-blur-xs transition-all animate-in fade-in slide-in-from-top-2 duration-300">
                        {/* Left visual accent bar */}
                        <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-gradient-to-b from-amber-500 to-amber-600 dark:from-amber-400 dark:to-amber-500" />

                        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
                            <div className="flex items-start sm:items-center gap-4">
                                <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-amber-500 to-amber-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-amber-500/25 ring-4 ring-amber-100 dark:ring-amber-950/60">
                                    <Clock className="h-6 w-6 stroke-[2.3] animate-pulse" />
                                </div>
                                <div className="space-y-1">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <span className="text-xs font-black uppercase tracking-wider text-amber-950 dark:text-amber-200">
                                            Scheduled Plan Switch Active
                                        </span>
                                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-amber-500 text-white shadow-xs">
                                            <Calendar className="h-3 w-3" />
                                            Effective {new Date(subscription.scheduled_switch_at || subscription.next_billing).toLocaleDateString(undefined, {
                                                year: 'numeric',
                                                month: 'short',
                                                day: 'numeric'
                                            })}
                                        </span>
                                        <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wide bg-amber-200/90 dark:bg-amber-900/60 text-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-800">
                                            Next Billing Rollover
                                        </span>
                                    </div>
                                    <p className="text-xs sm:text-sm text-gray-700 dark:text-slate-300 font-medium leading-relaxed">
                                        Switching to <span className="font-extrabold text-gray-900 dark:text-white bg-amber-100/80 dark:bg-amber-950/70 px-2 py-0.5 rounded-md border border-amber-300/80 dark:border-amber-800/80 text-amber-900 dark:text-amber-300">{subscription.target_plan_name}</span> at <span className="font-mono font-bold text-gray-900 dark:text-white">${Number(subscription.target_plan_amount || 0).toFixed(2)}/mo</span>. Current limits & allocated minutes stay active until rollover.
                                    </p>
                                </div>
                            </div>

                            {isSuperAdmin && (
                                <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end shrink-0 pt-2 lg:pt-0 border-t lg:border-t-0 border-amber-200/60 dark:border-amber-800/40">
                                    <button
                                        type="button"
                                        disabled={isArchived}
                                        title={isArchived ? "Subscription changes disabled for deactivated tenants." : "Change Target Plan"}
                                        onClick={() => setPlanSwitchModalOpen(true)}
                                        className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-white dark:bg-slate-800 text-gray-800 dark:text-slate-100 border border-amber-300/80 dark:border-slate-700 hover:bg-amber-50/70 dark:hover:bg-slate-700 hover:border-amber-400 transition shadow-sm active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed"
                                    >
                                        <RefreshCw className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                                        <span>Change Target Plan</span>
                                    </button>
                                    <button
                                        type="button"
                                        disabled={cancellingSchedule || isArchived}
                                        title={isArchived ? "Operation disabled for deactivated tenants." : "Cancel Scheduled Switch"}
                                        onClick={handleCancelScheduledSwitch}
                                        className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-red-50 dark:bg-red-950/60 text-red-700 dark:text-red-300 border border-red-200/90 dark:border-red-900/60 hover:bg-red-100 dark:hover:bg-red-900/50 transition shadow-sm disabled:opacity-50 active:scale-[0.98]"
                                    >
                                        {cancellingSchedule ? (
                                            <>
                                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                                <span>Cancelling...</span>
                                            </>
                                        ) : (
                                            <>
                                                <X className="h-3.5 w-3.5" />
                                                <span>Cancel Switch</span>
                                            </>
                                        )}
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-gray-200/80 dark:border-slate-800 overflow-hidden">
                    {subLoading ? (
                        <div className="flex items-center justify-center py-12 gap-3 text-sm text-gray-500 dark:text-slate-400 font-medium">
                            <Loader2 className="h-5 w-5 animate-spin text-primary-600" />
                            <span>Loading subscription details...</span>
                        </div>
                    ) : !subscription ? (
                        !isSuperAdmin ? (
                            <div className="py-12 px-6 text-center">
                                <AlertCircle className="h-10 w-10 text-amber-500 mx-auto mb-3" />
                                <h4 className="text-base font-bold text-gray-900 dark:text-white">No Active Subscription</h4>
                                <p className="text-xs text-gray-500 dark:text-slate-400 mt-1 max-w-md mx-auto">
                                    You currently do not have an active subscription assigned. Please contact your system administrator or account representative to activate your plan.
                                </p>
                            </div>
                        ) : (
                            <div className="py-12 px-6 text-center">
                                <AlertCircle className="h-10 w-10 text-amber-500 mx-auto mb-3" />
                                <h4 className="text-base font-bold text-gray-900 dark:text-white">No Active Subscription Found</h4>
                                <p className="text-xs text-gray-500 dark:text-slate-400 mt-1 max-w-md mx-auto">
                                    You do not have an active billing plan assigned yet. Assign a plan now to unlock PBX features.
                                </p>
                                <div className="mt-5 flex items-center justify-center gap-3">
                                    <button
                                        onClick={() => setPlanSwitchModalOpen(true)}
                                        disabled={isArchived}
                                        title={isArchived ? "Subscription changes disabled for deactivated tenants." : "Assign Plan"}
                                        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-primary-600 hover:bg-primary-700 transition shadow-md shadow-primary-600/20 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed"
                                    >
                                        <Sparkles className="h-4 w-4" />
                                        Assign Plan / Subscribe
                                    </button>
                                    {onBrowsePlans && (
                                        <button
                                            onClick={onBrowsePlans}
                                            disabled={isArchived}
                                            title={isArchived ? "Subscription changes disabled for deactivated tenants." : "Browse Plans"}
                                            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-gray-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700 transition shadow-xs disabled:opacity-40 disabled:cursor-not-allowed"
                                        >
                                            Browse Plans
                                        </button>
                                    )}
                                </div>
                            </div>
                        )
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-100 dark:divide-slate-800 text-left">
                                <thead className="bg-gray-50/70 dark:bg-slate-800/50">
                                    <tr>
                                        <th className="px-6 py-4 text-[11px] font-black uppercase tracking-wider text-gray-500 dark:text-slate-400">Plan Name</th>
                                        <th className="px-6 py-4 text-[11px] font-black uppercase tracking-wider text-gray-500 dark:text-slate-400">Status</th>
                                        <th className="px-6 py-4 text-[11px] font-black uppercase tracking-wider text-gray-500 dark:text-slate-400">Limits & Resources</th>
                                        <th className="px-6 py-4 text-[11px] font-black uppercase tracking-wider text-gray-500 dark:text-slate-400">Billing Period / Dates</th>
                                        <th className="px-6 py-4 text-center text-[11px] font-black uppercase tracking-wider text-gray-500 dark:text-slate-400">Auto-Renew</th>
                                        {isSuperAdmin && (
                                            <th className="px-6 py-4 text-center text-[11px] font-black uppercase tracking-wider text-gray-500 dark:text-slate-400">Actions</th>
                                        )}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-slate-800 bg-white dark:bg-slate-900">
                                    <tr className="hover:bg-gray-50/50 dark:hover:bg-slate-800/30 transition-colors">
                                        {/* Plan Name */}
                                        <td className="px-6 py-5 whitespace-nowrap">
                                            <div className="flex items-center gap-3">
                                                <div className="h-10 w-10 rounded-xl bg-primary-50 dark:bg-primary-950/60 border border-primary-200/60 dark:border-primary-800/40 flex items-center justify-center text-primary-600 dark:text-primary-400 font-bold">
                                                    <Package className="h-5 w-5" />
                                                </div>
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-sm font-extrabold text-gray-900 dark:text-white">
                                                            {subscription.plan_name || subscription.name || 'Standard Plan'}
                                                        </span>
                                                        {subscription.target_plan_name && (
                                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                                                                <Clock className="h-2.5 w-2.5" />
                                                                Switch to {subscription.target_plan_name} queued
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="text-[11px] font-mono text-gray-400 dark:text-slate-500">
                                                        ID: {subscription.plan_id || subscription.id || 'primary'}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>

                                        {/* Status */}
                                        <td className="px-6 py-5 whitespace-nowrap">
                                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold uppercase tracking-wider bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                                                <CheckCircle2 className="h-3 w-3" />
                                                {subscription.status || 'ACTIVE'}
                                            </span>
                                        </td>

                                        {/* Limits & Resources */}
                                        <td className="px-6 py-5 whitespace-nowrap">
                                            <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-slate-300 font-medium">
                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-300 font-mono">
                                                    {subscription?.limits?.extensions ?? 5} Ext
                                                </span>
                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-300 font-mono">
                                                    {subscription?.limits?.free_mins ?? 500} Mins
                                                </span>
                                            </div>
                                        </td>

                                        {/* Billing Period / Dates */}
                                        <td className="px-6 py-5 whitespace-nowrap">
                                            <div className="space-y-1 text-xs">
                                                <div className="flex items-center gap-1.5 text-gray-700 dark:text-slate-300">
                                                    <span className="font-semibold text-gray-500 dark:text-slate-400">Started:</span>
                                                    <span>
                                                        {subscription.start_date
                                                            ? new Date(subscription.start_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
                                                            : (subscription.created_at
                                                                ? new Date(subscription.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
                                                                : '—')}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-1.5 text-gray-900 dark:text-white font-bold">
                                                    <span className="font-semibold text-gray-500 dark:text-slate-400">Renews:</span>
                                                    <span>
                                                        {subscription.next_billing
                                                            ? new Date(subscription.next_billing).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
                                                            : '—'}
                                                    </span>
                                                </div>
                                                {subscription.next_billing && getDaysRemaining(subscription.next_billing) !== null && (
                                                    <div className="text-[11px] font-medium text-gray-500 dark:text-slate-400 flex items-center gap-1">
                                                        <Clock className="h-3 w-3 text-amber-500" />
                                                        <span>
                                                            {getDaysRemaining(subscription.next_billing) > 0
                                                                ? `${getDaysRemaining(subscription.next_billing)} days remaining`
                                                                : 'Renews today'}
                                                        </span>
                                                    </div>
                                                )}
                                            </div>
                                        </td>

                                        {/* Auto-Renew Toggle / Read-Only Badge */}
                                        <td className="px-6 py-5 whitespace-nowrap text-center">
                                            {isSuperAdmin ? (
                                                <div className="inline-flex flex-col items-center gap-1">
                                                    <button
                                                        type="button"
                                                        role="switch"
                                                        aria-checked={!!subscription.auto_renew}
                                                        disabled={togglingPlanAutoRenew || isArchived}
                                                        title={isArchived ? "Auto-renew disabled for deactivated tenants." : "Toggle Auto-Renew"}
                                                        onClick={handleTogglePlanAutoRenew}
                                                        className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 ${subscription.auto_renew
                                                                ? 'bg-primary-600'
                                                                : 'bg-gray-200 dark:bg-slate-700'
                                                            } ${togglingPlanAutoRenew || isArchived ? 'opacity-50 cursor-not-allowed' : ''}`}
                                                    >
                                                        <span
                                                            aria-hidden="true"
                                                            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${subscription.auto_renew ? 'translate-x-5' : 'translate-x-0'
                                                                }`}
                                                        />
                                                    </button>
                                                    <span className={`text-[10px] font-bold ${subscription.auto_renew
                                                            ? 'text-primary-600 dark:text-primary-400'
                                                            : 'text-gray-400 dark:text-slate-500'
                                                        }`}>
                                                        {subscription.auto_renew ? 'ON' : 'OFF'}
                                                    </span>
                                                </div>
                                            ) : (
                                                <span
                                                    className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold ${
                                                        subscription.auto_renew
                                                            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                                                            : 'bg-gray-100 text-gray-600 dark:bg-slate-800 dark:text-slate-400 border border-gray-200 dark:border-slate-700'
                                                    }`}
                                                >
                                                    {subscription.auto_renew ? 'Active (Auto-Renews)' : 'Manual (Off)'}
                                                </span>
                                            )}
                                        </td>

                                        {/* Actions: Upgrade / Downgrade (Super Admin Only) */}
                                        {isSuperAdmin && (
                                            <td className="px-6 py-5 whitespace-nowrap text-right">
                                                <button
                                                    type="button"
                                                    disabled={isArchived}
                                                    onClick={() => setPlanSwitchModalOpen(true)}
                                                    title={isArchived ? "Subscription changes disabled for deactivated tenants." : "Change Plan"}
                                                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black text-primary-600 dark:text-primary-400 bg-white dark:bg-slate-800 ring-1 ring-inset ring-primary-200 dark:ring-primary-800/40 hover:bg-primary-50 dark:hover:bg-primary-950/40 transition shadow-xs active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
                                                >
                                                    <ArrowUpDown className="h-3.5 w-3.5" />
                                                    <span>{subscription.target_plan_name ? 'Modify Scheduled Plan' : 'Upgrade / Downgrade Plan'}</span>
                                                </button>
                                            </td>
                                        )}
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>

            {/* ========================================================================= */}
            {/* SECTION: Subscription History (Previous Plans & Cycles)                   */}
            {/* ========================================================================= */}
            <div className="space-y-4">
                <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
                        <Clock className="h-4 w-4" />
                    </div>
                    <h3 className="text-base font-extrabold text-gray-900 dark:text-white tracking-tight">
                        Subscription History
                    </h3>
                </div>
                <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-gray-200/80 dark:border-slate-800 overflow-hidden">
                    {((subscription?.history && subscription.history.length > 0) || subscription?.previous_plan) ? (
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-100 dark:divide-slate-800 text-left">
                                <thead className="bg-gray-50/70 dark:bg-slate-800/50">
                                    <tr>
                                        <th className="px-6 py-3.5 text-[11px] font-black uppercase tracking-wider text-gray-500 dark:text-slate-400">
                                            Plan
                                        </th>
                                        <th className="px-6 py-3.5 text-[11px] font-black uppercase tracking-wider text-gray-500 dark:text-slate-400">
                                            Amount
                                        </th>
                                        <th className="px-6 py-3.5 text-[11px] font-black uppercase tracking-wider text-gray-500 dark:text-slate-400">
                                            Billing Period
                                        </th>
                                        <th className="px-6 py-3.5 text-[11px] font-black uppercase tracking-wider text-gray-500 dark:text-slate-400">
                                            Type
                                        </th>
                                        <th className="px-6 py-3.5 text-center text-[11px] font-black uppercase tracking-wider text-gray-500 dark:text-slate-400">
                                            Status
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-slate-800 bg-white dark:bg-slate-900">
                                    {((subscription?.history && subscription.history.length > 0)
                                        ? subscription.history
                                        : (subscription?.previous_plan ? [subscription.previous_plan] : [])
                                    ).map((cycle, idx) => (
                                        <tr key={cycle.id || idx} className="hover:bg-gray-50/50 dark:hover:bg-slate-800/30 transition-colors">
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="font-extrabold text-sm text-gray-900 dark:text-white">
                                                    {cycle.plan_name}
                                                </div>
                                                <div className="text-[11px] text-gray-400 font-mono">
                                                    {cycle.plan_id}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap font-mono font-bold text-sm text-gray-900 dark:text-white">
                                                ${Number(cycle.amount || 0).toFixed(2)} {cycle.currency || 'USD'}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-600 dark:text-slate-300">
                                                {cycle.start_date ? new Date(cycle.start_date).toLocaleDateString() : '—'} 
                                                {' → '}
                                                {cycle.end_date ? new Date(cycle.end_date).toLocaleDateString() : '—'}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-300">
                                                    {cycle.transition_type === 'plan_switch' ? 'Plan Switch' : 'Renewal'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-center">
                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                                                    {cycle.status || 'Completed'}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div className="py-8 px-4 text-center text-xs text-gray-400 dark:text-slate-500">
                            No previous billing history available for this account.
                        </div>
                    )}
                </div>
            </div>

            {/* ========================================================================= */}
            {/* SECTION 2B: Add-on Subscriptions Table                                    */}
            {/* ========================================================================= */}
            <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                        <div className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
                            <Layers className="h-4 w-4" />
                        </div>
                        <div>
                            <h3 className="text-base font-extrabold text-gray-900 dark:text-white tracking-tight">
                                Add-on Subscriptions
                            </h3>
                            <p className="text-xs text-gray-500 dark:text-slate-400">
                                Extra extensions, numbers, and features provisioned for your tenant
                            </p>
                        </div>
                    </div>

                    {isSuperAdmin && onBrowseCatalog && (
                        <button
                            onClick={onBrowseCatalog}
                            disabled={isArchived}
                            title={isArchived ? "Add-on purchases disabled for deactivated tenants." : "Browse Add-on Catalog"}
                            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-950/50 border border-primary-200/60 dark:border-primary-800/40 hover:bg-primary-100 transition shadow-xs disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                            <Zap className="h-3.5 w-3.5" />
                            <span>Browse Add-on Catalog</span>
                        </button>
                    )}
                </div>

                <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-gray-200/80 dark:border-slate-800 overflow-hidden">
                    {addonsLoading ? (
                        <div className="flex items-center justify-center py-12 gap-3 text-sm text-gray-500 dark:text-slate-400 font-medium">
                            <Loader2 className="h-5 w-5 animate-spin text-primary-600" />
                            <span>Loading add-on subscriptions...</span>
                        </div>
                    ) : addons.length === 0 ? (
                        <div className="py-12 px-6 text-center">
                            <Layers className="h-10 w-10 text-gray-300 dark:text-slate-600 mx-auto mb-3" />
                            <h4 className="text-sm font-bold text-gray-900 dark:text-white">No Active Add-on Subscriptions</h4>
                            <p className="text-xs text-gray-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
                                You currently don't have any standalone add-ons. You can purchase additional extensions or DIDs anytime from the catalog.
                            </p>
                            {isSuperAdmin && onBrowseCatalog && (
                                <button
                                    onClick={onBrowseCatalog}
                                    disabled={isArchived}
                                    title={isArchived ? "Add-on purchases disabled for deactivated tenants." : "Get Extra Add-ons"}
                                    className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-primary-600 hover:bg-primary-700 transition shadow-xs disabled:opacity-40 disabled:cursor-not-allowed"
                                >
                                    Get Extra Add-ons
                                </button>
                            )}
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-100 dark:divide-slate-800 text-left">
                                <thead className="bg-gray-50/70 dark:bg-slate-800/50">
                                    <tr>
                                        <th className="px-6 py-4 text-[11px] font-black uppercase tracking-wider text-gray-500 dark:text-slate-400">Add-on Item</th>
                                        <th className="px-6 py-4 text-[11px] font-black uppercase tracking-wider text-gray-500 dark:text-slate-400">Quantity</th>
                                        <th className="px-6 py-4 text-[11px] font-black uppercase tracking-wider text-gray-500 dark:text-slate-400">Start Date</th>
                                        <th className="px-6 py-4 text-[11px] font-black uppercase tracking-wider text-gray-500 dark:text-slate-400">Expiry Date</th>
                                        <th className="px-6 py-4 text-center text-[11px] font-black uppercase tracking-wider text-gray-500 dark:text-slate-400">Auto-Renew</th>
                                        {isSuperAdmin && (
                                            <th className="px-6 py-4 text-center text-[11px] font-black uppercase tracking-wider text-gray-500 dark:text-slate-400">Actions</th>
                                        )}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-slate-800 bg-white dark:bg-slate-900">
                                    {addons.map((addon) => {
                                        const addonSubId = addon.id || addon.subscription_addon_id;
                                        const isToggling = togglingAddonId === addonSubId;
                                        const daysRemaining = getDaysRemaining(addon.expiration_date);

                                        return (
                                            <tr key={addonSubId || addon.addon_id} className="hover:bg-gray-50/50 dark:hover:bg-slate-800/30 transition-colors">
                                                {/* Add-on Name */}
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="flex items-center gap-3">
                                                        <div className="h-9 w-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200/60 dark:border-indigo-800/40 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold">
                                                            <Package className="h-4 w-4" />
                                                        </div>
                                                        <div>
                                                            <div className="text-sm font-bold text-gray-900 dark:text-white">
                                                                {addon.name || addon.addon_id}
                                                            </div>
                                                            <div className="text-[11px] font-mono text-gray-400 dark:text-slate-500">
                                                                {addon.addon_id}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </td>

                                                {/* Quantity */}
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold font-mono bg-gray-100 dark:bg-slate-800 text-gray-800 dark:text-slate-200 border border-gray-200 dark:border-slate-700">
                                                        × {addon.quantity || 1}
                                                    </span>
                                                </td>

                                                {/* Start Date */}
                                                <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-600 dark:text-slate-300 font-medium">
                                                    {addon.created_at ? (
                                                        <div className="flex items-center gap-1.5">
                                                            <Calendar className="h-3.5 w-3.5 text-gray-400" />
                                                            <span>
                                                                {new Date(addon.created_at).toLocaleDateString(undefined, {
                                                                    year: 'numeric',
                                                                    month: 'short',
                                                                    day: 'numeric'
                                                                })}
                                                            </span>
                                                        </div>
                                                    ) : (
                                                        <span className="text-gray-400">—</span>
                                                    )}
                                                </td>

                                                {/* Expiry Date */}
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    {addon.expiration_date ? (
                                                        <div className="space-y-0.5">
                                                            <div className="text-xs font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
                                                                <Calendar className="h-3.5 w-3.5 text-gray-400" />
                                                                <span>
                                                                    {new Date(addon.expiration_date).toLocaleDateString(undefined, {
                                                                        year: 'numeric',
                                                                        month: 'short',
                                                                        day: 'numeric'
                                                                    })}
                                                                </span>
                                                            </div>
                                                            {daysRemaining !== null && (
                                                                <div className="text-[11px] font-medium text-gray-500 dark:text-slate-400 flex items-center gap-1">
                                                                    <Clock className="h-3 w-3 text-amber-500" />
                                                                    {daysRemaining > 0
                                                                        ? `${daysRemaining} days left`
                                                                        : 'Expired'}
                                                                </div>
                                                            )}
                                                        </div>
                                                    ) : (
                                                        <span className="text-xs text-gray-400">—</span>
                                                    )}
                                                </td>

                                                {/* Auto-Renew Toggle / Read-Only Badge */}
                                                <td className="px-6 py-4 whitespace-nowrap text-center">
                                                    {isSuperAdmin ? (
                                                        <div className="flex w-full flex-col items-center justify-center gap-1">
                                                            <button
                                                                type="button"
                                                                role="switch"
                                                                aria-checked={!!addon.auto_renew}
                                                                disabled={isToggling || isArchived}
                                                                title={isArchived ? "Auto-renew disabled for deactivated tenants." : "Toggle Add-on Auto-Renew"}
                                                                onClick={() => handleToggleAddonAutoRenew(addon)}
                                                                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 ${addon.auto_renew
                                                                        ? 'bg-primary-600'
                                                                        : 'bg-gray-200 dark:bg-slate-700'
                                                                    } ${isToggling || isArchived ? 'opacity-50 cursor-not-allowed' : ''}`}
                                                            >
                                                                <span
                                                                    aria-hidden="true"
                                                                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${addon.auto_renew ? 'translate-x-5' : 'translate-x-0'
                                                                        }`}
                                                                />
                                                            </button>
                                                            <span className={`text-[10px] font-bold ${addon.auto_renew
                                                                    ? 'text-primary-600 dark:text-primary-400'
                                                                    : 'text-gray-400 dark:text-slate-500'
                                                                }`}>
                                                                {addon.auto_renew ? 'ON' : 'OFF'}
                                                            </span>
                                                        </div>
                                                    ) : (
                                                        <span
                                                            className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold ${
                                                                addon.auto_renew
                                                                    ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                                                                    : 'bg-gray-100 text-gray-600 dark:bg-slate-800 dark:text-slate-400 border border-gray-200 dark:border-slate-700'
                                                            }`}
                                                        >
                                                            {addon.auto_renew ? 'Active (Auto-Renews)' : 'Manual (Off)'}
                                                        </span>
                                                    )}
                                                </td>

                                                {/* Actions */}
                                                {isSuperAdmin && (
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <div className="flex w-full items-center justify-center">
                                                            <button
                                                                type="button"
                                                                disabled={isArchived}
                                                                onClick={() => setAddonToCancel(addon)}
                                                                title={isArchived ? "Add-on operations disabled for deactivated tenants." : "Cancel Add-on"}
                                                                className="inline-flex items-center justify-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold text-rose-600 dark:text-rose-400 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-transparent hover:border-rose-200 dark:hover:border-rose-900/40 transition disabled:opacity-40 disabled:cursor-not-allowed"
                                                            >
                                                                <Trash2 className="h-3.5 w-3.5" />
                                                                <span>Cancel</span>
                                                            </button>
                                                        </div>
                                                    </td>
                                                )}
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
            </>
            )}

            {/* Plan Switch Modal */}
            <PlanSwitchModal
                isOpen={planSwitchModalOpen}
                onClose={() => {
                    setPlanSwitchModalOpen(false);
                    setModalTargetTenant(null);
                }}
                currentPlan={modalTargetTenant ? modalTargetTenant.subscription : subscription}
                customerId={modalTargetTenant ? modalTargetTenant.tenantId : effectiveTenantId}
                isArchived={modalTargetTenant ? modalTargetTenant.tenantStatus === 'ARCHIVED' : isArchived}
                onSuccess={() => {
                    handleRefreshAll();
                    setModalTargetTenant(null);
                }}
            />

            {/* Cancel Add-on Confirmation Modal */}
            <ConfirmActionModal
                isOpen={!!addonToCancel}
                onClose={() => setAddonToCancel(null)}
                onConfirm={handleConfirmCancelAddon}
                title="Cancel Add-on Subscription"
                message={`Are you sure you want to cancel the add-on "${addonToCancel?.name || addonToCancel?.addon_id}"? This item will not renew at expiration.`}
                confirmText="Confirm Cancel"
                cancelText="Keep Add-on"
                isDanger={true}
                loading={cancellingAddon}
            />

        </div>
    );
};

export default TenantSubscriptionsView;
