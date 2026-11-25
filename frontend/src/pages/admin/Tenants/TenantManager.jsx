import React, { useState, useEffect } from 'react';
import { X, Wallet, Phone, Users, Info, Building2, Plus, Trash2, Loader, CreditCard, RefreshCw, User, LogIn, Sliders, ShieldAlert, Clock, Mic, Zap, Loader2, Radio, HardDrive, Activity, Package, Palette, Edit3, Save, Check, CheckCircle2, Globe, MapPin, Mail, Lock, Eye, EyeOff, Search, Pencil, Shield, CheckCircle } from 'lucide-react';
import React, { useState, useEffect, useMemo } from 'react';
import { X, Wallet, Phone, Users, Info, Building2, Plus, Trash2, Loader, CreditCard, RefreshCw, User, LogIn, Sliders, ShieldAlert, Clock, Mic, Zap, Loader2, Radio, HardDrive, Activity, Package, Palette, Edit3, Save, Check, CheckCircle2, Globe, MapPin, Mail, Lock, Eye, EyeOff, Search, Pencil, ExternalLink, Calendar, Shield, Sparkles } from 'lucide-react';
import api from '../../../services/api';
import { useAuth } from '../../../context/AuthContext';
import { useToast } from '../../../context/ToastContext';
import { formatCustomerId } from '../../../utils/billing.utils';
import { subscriptionService } from '../../../services/subscription.service';
import AddonPurchaseModal from '../../../components/subscription/AddonPurchaseModal';
import CreativeStatCard from '../../../components/common/CreativeStatCard';

const TABS = [
    { id: 'overview', label: 'Overview', icon: Info },
    { id: 'wallet', label: 'Wallet', icon: Wallet },
    { id: 'extensions', label: 'Extensions', icon: Users },
    { id: 'users', label: 'Users', icon: User },
    { id: 'features', label: 'Feature Controller', icon: Sliders },
    { id: 'subscriptions', label: 'Subscriptions', icon: CreditCard },
    { id: 'customize', label: 'Customize', icon: Palette }
];

const TenantManager = ({ tenantId, initialTenant, onClose }) => {
    const [activeTab, setActiveTab] = useState('overview');
    const [tenant, setTenant] = useState(initialTenant || null);
    const [subscription, setSubscription] = useState(null);
    const [loading, setLoading] = useState(!initialTenant);
    const [error, setError] = useState(null);
    const [refreshTrigger, setRefreshTrigger] = useState(0);

    // Fetch tenant details on mount and refresh
    useEffect(() => {
        fetchTenantDetails();
    }, [tenantId, refreshTrigger]);

    const fetchTenantDetails = async () => {
        if (!tenant) setLoading(true);
        setError(null);

        try {
            const [tenantRes, subscriptionRes] = await Promise.allSettled([
                api.get(`/tenants/${tenantId}`),
                subscriptionService.getSubscription(tenantId)
            ]);

            if (tenantRes.status === 'fulfilled' && tenantRes.value.data) {
                setTenant(tenantRes.value.data);
            } else if (!initialTenant) {
                throw tenantRes.reason || new Error('Tenant not found');
            }

            if (subscriptionRes.status === 'fulfilled') {
                setSubscription(subscriptionRes.value);
            } else {
                setSubscription(null);
            }
        } catch (err) {
            console.error('Failed to fetch tenant details:', err);
            setError(err.response?.data?.message || err.message || 'Failed to load tenant details');
            setSubscription(null);
        } finally {
            setLoading(false);
        }
    };

    const handleRefresh = () => setRefreshTrigger(prev => prev + 1);

    const [isBlockLoading, setIsBlockLoading] = useState(false);
    const handleToggleBlock = async () => {
        if (!tenant) return;
        const willBlock = !tenant.serviceBlocked;
        if (willBlock && !window.confirm(`Block customer ${tenant.name}? Outbound and inbound calls will be stopped and portal access will be disabled.`)) {
            return;
        }
        setIsBlockLoading(true);
        try {
            await api.patch(`/tenants/${tenant.id}/block`, { blocked: willBlock });
            handleRefresh();
        } catch (err) {
            alert('Failed to update service status: ' + (err.response?.data?.message || err.message));
        } finally {
            setIsBlockLoading(false);
        }
    };

    if (loading && !tenant) {
        return (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
                <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-xl flex items-center gap-3">
                    <Loader className="animate-spin text-blue-600" />
                    <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">Loading tenant details...</span>
                </div>
            </div>
        );
    }

    if (!tenant && error) {
        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm transition-opacity" onClick={onClose}></div>
                <div className="relative bg-white dark:bg-slate-800 rounded-2xl shadow-xl p-6 max-w-md w-full ring-1 ring-gray-200 dark:ring-slate-700">
                    <div className="flex items-center gap-3 text-rose-600 mb-3">
                        <ShieldAlert className="h-6 w-6" />
                        <h3 className="font-bold text-lg">Unable to Load Tenant</h3>
                    </div>
                    <p className="text-sm text-slate-600 dark:text-slate-300 mb-4">{error}</p>
                    <div className="flex justify-end">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold text-sm transition-colors"
                        >
                            Close
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    if (tenant.status === 'ARCHIVED' || tenant.archiveJob) return (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
            <div role="dialog" aria-modal="true" aria-label="Archived customer" className="bg-white rounded-2xl p-6 max-w-lg space-y-4">
                <h2 className="text-xl font-bold">{tenant.name} — {tenant.status === 'ARCHIVED' ? 'Archived' : 'Archive in progress'}</h2>
                {tenant.archiveJob?.last_error && <p role="alert" className="text-red-700">{tenant.archiveJob.last_error}</p>}
                <p>Customer ID: {tenant.customerCode || tenant.id}. Calls and logins are disabled. Financial and call history are retained; numbers remain held until explicitly released.</p>
                <a className="text-primary-700 underline" href={`/super-admin/subscriptions?tenantId=${encodeURIComponent(tenant.id)}`}>View subscription history</a>
                <button onClick={onClose} className="block rounded-xl border p-3">Close</button>
            </div>
        </div>
    );

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5">
            <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-md transition-opacity" onClick={onClose} />
            
            <div className="relative bg-[#f8fafc] dark:bg-[#07090e] rounded-3xl shadow-2xl w-[1080px] max-w-[95vw] h-[720px] max-h-[90vh] overflow-hidden flex flex-col border border-slate-200/80 dark:border-white/10 ring-1 ring-black/5 dark:ring-white/5 transition-all">
                
                {/* Header Banner - Matching Main Page Header Standard */}
                <div className="relative overflow-hidden bg-gradient-to-r from-teal-700 via-teal-600 to-emerald-600 dark:from-[#081816] dark:via-[#0c2621] dark:to-[#081816] px-6 py-4.5 text-white border-b border-teal-500/30 dark:border-teal-500/20 shrink-0">
                    <div className="absolute top-0 right-0 -mt-10 -mr-10 w-80 h-80 rounded-full bg-white/10 dark:bg-teal-500/10 blur-3xl pointer-events-none" />
                    
                    <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex items-center gap-3.5">
                            <div className="h-11 w-11 rounded-2xl bg-white/15 dark:bg-teal-500/20 backdrop-blur-md border border-white/20 dark:border-teal-400/30 flex items-center justify-center shadow-lg text-white shrink-0">
                                <Building2 className="h-5 w-5 text-white" />
                            </div>
                            <div>
                                <div className="flex items-center gap-2 flex-wrap">
                                    <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white font-display">
                                        {tenant.name}
                                    </h2>
                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-extrabold font-mono tracking-wider bg-white/20 text-white border border-white/25 shadow-xs">
                                        {formatCustomerId(tenant.customerCode) || tenant.id}
                                    </span>
                                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold font-mono uppercase tracking-wider border shadow-xs ${
                                        tenant.serviceBlocked 
                                            ? 'bg-rose-500/20 text-rose-200 border-rose-400/30' 
                                            : 'bg-emerald-500/20 text-emerald-200 border-emerald-400/30'
                                    }`}>
                                        <span className={`w-1.5 h-1.5 rounded-full ${tenant.serviceBlocked ? 'bg-rose-400' : 'bg-emerald-400 animate-pulse'}`} />
                                        {tenant.serviceBlocked ? 'Blocked' : 'Active Tenant'}
                                    </span>
                                </div>
                                <p className="text-teal-100/90 dark:text-teal-200/80 text-xs font-medium font-sans mt-0.5">
                                    Tenant Control Panel • Internal account management, limits & telephony services
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-2 self-end sm:self-center">
                            <button
                                onClick={handleRefresh}
                                className="inline-flex items-center justify-center p-2 rounded-xl bg-white/15 hover:bg-white/25 text-white backdrop-blur-md border border-white/20 transition-all active:scale-95 cursor-pointer shadow-xs"
                                title="Refresh Tenant Data"
                            >
                                <RefreshCw size={15} />
                            </button>
                            <button
                                onClick={onClose}
                                className="rounded-xl p-2 text-white/80 hover:text-white hover:bg-white/20 transition-all focus:outline-none cursor-pointer"
                                title="Close"
                            >
                                <X size={20} />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Top Horizontal Pill Navigation Bar */}
                <div className="bg-white/95 dark:bg-[#0b0d14]/95 border-b border-slate-200/80 dark:border-white/10 px-6 py-2.5 shrink-0 backdrop-blur-md z-10 flex items-center justify-between gap-3 overflow-x-auto no-scrollbar">
                    <div className="flex items-center gap-1.5 p-1 bg-slate-100/80 dark:bg-white/[0.04] rounded-2xl border border-slate-200/60 dark:border-white/5">
                        {TABS.map(tab => {
                            const Icon = tab.icon;
                            const isActive = activeTab === tab.id;
                            return (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer select-none ${isActive
                                        ? 'bg-teal-600 text-white shadow-md shadow-teal-600/25'
                                        : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-white dark:hover:bg-white/10'
                                        }`}
                                >
                                    <Icon size={15} className={isActive ? 'text-white' : 'text-slate-400 dark:text-slate-400'} />
                                    <span>{tab.label}</span>
                                </button>
                            );
                        })}
                    </div>

                    <div className="hidden lg:flex items-center gap-2 text-xs font-mono text-slate-500 dark:text-slate-400 font-medium shrink-0">
                        <span className="w-2 h-2 rounded-full bg-teal-500 animate-ping" />
                        <span>Live Console</span>
                    {/* Tab Content */}
                    <div className="flex-1 min-h-0 overflow-y-auto p-8 bg-white">
                        {activeTab === 'overview' && (<OverviewTab tenant={tenant} subscription={subscription} onToggleBlock={handleToggleBlock} isBlockLoading={isBlockLoading} />)}
                        {activeTab === 'wallet' && <WalletTab tenant={tenant} onUpdate={handleRefresh} />}
                        {activeTab === 'extensions' && <ExtensionsTab tenant={tenant} onUpdate={handleRefresh} />}
                        {activeTab === 'users' && <UsersTab tenant={tenant} />}
                        {activeTab === 'features' && <FeaturesTab tenant={tenant} onUpdate={handleRefresh} />}
                        {activeTab === 'subscriptions' && <SubscriptionsTab tenant={tenant} subscription={subscription} onUpdate={handleRefresh} />}
                        {activeTab === 'customize' && <CustomizeTab tenant={tenant} onUpdate={handleRefresh} />}
                    </div>
                </div>

                {/* Tab Content Canvas */}
                <div className="flex-1 min-h-0 overflow-y-auto p-5 sm:p-6 bg-[#f8fafc] dark:bg-[#06080d]">
                    {activeTab === 'overview' && (<OverviewTab tenant={tenant} subscription={subscription} />)}
                    {activeTab === 'wallet' && <WalletTab tenant={tenant} onUpdate={handleRefresh} />}
                    {activeTab === 'extensions' && <ExtensionsTab tenant={tenant} onUpdate={handleRefresh} />}
                    {activeTab === 'users' && <UsersTab tenant={tenant} />}
                    {activeTab === 'features' && <FeaturesTab tenant={tenant} onUpdate={handleRefresh} />}
                    {activeTab === 'subscriptions' && <SubscriptionsTab tenant={tenant} onUpdate={handleRefresh} />}
                    {activeTab === 'customize' && <CustomizeTab tenant={tenant} onUpdate={handleRefresh} />}
                </div>
            </div>
        </div>
    );
};

// --- Sub-Components ---

const OverviewTab = ({ tenant, subscription, onToggleBlock, isBlockLoading }) => (
    <div className="space-y-6 w-full">
        <div>
            <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight font-display">Organization Overview</h3>
            <p className="text-xs sm:text-sm font-medium text-slate-500 dark:text-slate-400 mt-1 font-sans">Core platform details and system status for this tenant.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            <CreativeStatCard
                title="Company Code"
                value={formatCustomerId(tenant.customerCode) || '—'}
                subtitle="Unique platform identifier"
                icon={Building2}
                color="blue"
                trend="Verified"
                trendUp={true}
            />
            <CreativeStatCard
                title="Created At"
                value={new Date(tenant.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                subtitle="Account provision date"
                icon={Clock}
                color="purple"
                trend="Active"
                trendUp={true}
            />
            <CreativeStatCard
                title="System Status"
                value={tenant.serviceBlocked ? 'Blocked' : 'Active'}
                subtitle={tenant.serviceBlocked ? 'Services restricted' : 'All services operational'}
                icon={Shield}
                color={tenant.serviceBlocked ? 'rose' : 'emerald'}
                badgeText={tenant.serviceBlocked ? 'Disabled' : 'Operational'}
                trend={tenant.serviceBlocked ? 'Restricted' : 'Healthy'}
                trendUp={!tenant.serviceBlocked}
            />
            <CreativeStatCard
                title="Total Users"
                value={tenant.stats?.users || 0}
                subtitle="Provisioned member seats"
                icon={Users}
                color="teal"
                trend="+8%"
                trendUp={true}
            />
            <CreativeStatCard
                title="Current Subscription"
                value={subscription?.plan?.name || subscription?.planName || subscription?.plan_name || 'No Active Plan'}
                subtitle="Active billing package"
                icon={CreditCard}
                color="cyan"
                trend="Subscribed"
                trendUp={true}
            />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="bg-white p-5 rounded-2xl shadow-sm ring-1 ring-gray-200/50 relative overflow-hidden group hover:shadow-md transition-all">
                <div className="relative z-10">
                    <div className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
                        <div className="h-1.5 w-1.5 rounded-full bg-blue-500"></div>
                        Company Code
                    </div>
                    <p className="text-2xl font-mono font-extrabold text-gray-900">{formatCustomerId(tenant.customerCode)}</p>
                </div>
            </div>

            <div className="bg-white p-5 rounded-2xl shadow-sm ring-1 ring-gray-200/50 relative overflow-hidden group hover:shadow-md transition-all">
                <div className="relative z-10">
                    <div className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
                        <div className="h-1.5 w-1.5 rounded-full bg-purple-500"></div>
                        Created At
                    </div>
                    <p className="text-2xl font-extrabold text-gray-900 tracking-tight">
                        {new Date(tenant.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                    </p>
                </div>
            </div>

            <div className="bg-white p-5 rounded-2xl shadow-sm ring-1 ring-gray-200/50 relative overflow-hidden group hover:shadow-md transition-all">
                <div className="relative z-10">
                    <div className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
                        <div className={`h-1.5 w-1.5 rounded-full ${tenant.serviceStatus === 'BLOCKED' || tenant.serviceBlocked ? 'bg-red-500' :
                                tenant.serviceStatus === 'DEACTIVATED' ? 'bg-amber-500' :
                                    tenant.serviceStatus === 'ARCHIVED' ? 'bg-slate-500' :
                                        'bg-green-500'
                            }`}></div>
                        System Status
                    </div>
                    <div className="mt-1 flex items-center justify-between gap-2">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold ring-1 ring-inset uppercase tracking-wider ${tenant.serviceStatus === 'BLOCKED' || tenant.serviceBlocked ? 'bg-red-50 text-red-700 ring-red-600/20' :
                                tenant.serviceStatus === 'DEACTIVATED' ? 'bg-amber-50 text-amber-700 ring-amber-600/20' :
                                    tenant.serviceStatus === 'ARCHIVED' ? 'bg-slate-50 text-slate-700 ring-slate-600/20' :
                                        'bg-green-50 text-green-700 ring-green-600/20'
                            }`}>
                            {tenant.serviceStatus === 'BLOCKED' || tenant.serviceBlocked ? 'Blocked' :
                                tenant.serviceStatus === 'DEACTIVATED' ? 'Deactivated' :
                                    tenant.serviceStatus === 'ARCHIVED' ? 'Archived' : 'Active'}
                        </span>
                        {onToggleBlock && tenant.serviceStatus !== 'ARCHIVED' && (
                            <button
                                type="button"
                                onClick={onToggleBlock}
                                disabled={isBlockLoading}
                                className={`text-[11px] font-bold px-2.5 py-1 rounded-lg border transition-all shadow-sm ${tenant.serviceBlocked
                                        ? 'border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                                        : 'border-red-300 bg-red-50 text-red-700 hover:bg-red-100'
                                    }`}
                                title={tenant.serviceBlocked ? "Unblock calls and portal access" : "Block calls and portal access"}
                            >
                                {isBlockLoading ? 'Updating...' : tenant.serviceBlocked ? 'Unblock' : 'Block'}
                            </button>
                        )}
                    </div>
                </div>
            </div>

            <div className="bg-white p-5 rounded-2xl shadow-sm ring-1 ring-gray-200/50 relative overflow-hidden group hover:shadow-md transition-all">
                <div className="relative z-10">
                    <div className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
                        <div className="h-1.5 w-1.5 rounded-full bg-indigo-500"></div>
                        Total Users
                    </div>
                    <p className="text-2xl font-extrabold text-gray-900 font-mono tracking-tight">{tenant.stats?.users || 0}</p>
                </div>
            </div>

            <div className="bg-white p-5 rounded-2xl shadow-sm ring-1 ring-gray-200/50 relative overflow-hidden group hover:shadow-md transition-all">
                <div className="relative z-10">
                    <div className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
                        <div className="h-1.5 w-1.5 rounded-full bg-blue-500"></div>
                        Current Subscription
                    </div>
                    <p className="text-2xl font-mono font-extrabold text-gray-900">
                        {subscription?.plan?.name || subscription?.planName || subscription?.plan_name || 'No Active Plan'}
                    </p>
                </div>
            </div>
        </div>
    </div>
);

const SubscriptionsTab = ({ tenant, subscription, onUpdate }) => {
    const subList = useMemo(() => {
        if (!subscription) return [];
        if (Array.isArray(subscription)) return subscription;
        if (Array.isArray(subscription.data)) return subscription.data;
        if (typeof subscription === 'object' && (subscription.id || subscription.plan_id || subscription.plan_name)) return [subscription];
        return [];
    }, [subscription]);

    const activeSub = useMemo(() => {
        return subList.find(s => s.status === 'ACTIVE') || subList[0] || (subscription?.plan ? subscription : null);
    }, [subList, subscription]);

    const limits = activeSub?.limits || activeSub?.plan?.limits || {};
    const extUsed = tenant.stats?.extensions || tenant.extensionsCount || 0;
    const extTotal = limits.extensions !== undefined ? Number(limits.extensions) : null;
    const extPercent = extTotal ? Math.min(100, Math.round((extUsed / extTotal) * 100)) : 0;

    const numUsed = tenant.stats?.numbers || tenant.numbersCount || 0;
    const numTotal = limits.numbers !== undefined ? Number(limits.numbers) : null;
    const numPercent = numTotal ? Math.min(100, Math.round((numUsed / numTotal) * 100)) : 0;

    const monUsed = tenant.stats?.monitoring_extensions || tenant.stats?.monitoring || 0;
    const monTotal = limits.monitoring_extensions !== undefined ? Number(limits.monitoring_extensions) : null;
    const monPercent = monTotal ? Math.min(100, Math.round((monUsed / monTotal) * 100)) : 0;

    const daysRemaining = activeSub?.next_billing ? Math.ceil((new Date(activeSub.next_billing).getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : null;

    const consoleUrl = `/super-admin/subscriptions?tenantId=${encodeURIComponent(tenant.id)}`;

    return (
        <div className="space-y-6 w-full animate-in fade-in duration-200">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h3 className="text-xl font-extrabold text-gray-900 tracking-tight flex items-center gap-2">
                        <CreditCard className="h-6 w-6 text-primary-600" />
                        Subscriptions & Capacity
                    </h3>
                    <p className="text-sm font-medium text-gray-500 mt-1">
                        Active plans, resource limits, and asset allocations for {tenant.name}.
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <a
                        href={consoleUrl}
                        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-primary-600 hover:bg-primary-700 text-white shadow-xs transition-all active:scale-95"
                    >
                        <span>Manage in Subscriptions Console</span>
                        <ExternalLink size={14} />
                    </a>
                </div>
            </div>

            {/* Active Subscription Summary Card */}
            {activeSub ? (
                <div className="bg-white p-6 rounded-2xl shadow-sm ring-1 ring-gray-200/80 space-y-5">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-100">
                        <div className="flex items-center gap-3.5">
                            <div className="h-12 w-12 rounded-2xl bg-primary-50 border border-primary-100 flex items-center justify-center text-primary-600">
                                <Sparkles className="h-6 w-6" />
                            </div>
                            <div>
                                <div className="flex items-center gap-2.5">
                                    <h4 className="text-lg font-black text-gray-900 tracking-tight">
                                        {activeSub.plan_name || activeSub.plan?.name || 'Active Subscription Plan'}
                                    </h4>
                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-black uppercase tracking-wider ${
                                        activeSub.status === 'ACTIVE'
                                            ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/20'
                                            : activeSub.status === 'EXPIRED'
                                            ? 'bg-red-50 text-red-700 ring-1 ring-red-600/20'
                                            : 'bg-amber-50 text-amber-700 ring-1 ring-amber-600/20'
                                    }`}>
                                        {activeSub.status || 'ACTIVE'}
                                    </span>
                                </div>
                                <p className="text-xs font-mono text-gray-500 mt-0.5">
                                    ID: {activeSub.id || activeSub.subscription_id || 'sub-active'}
                                </p>
                            </div>
                        </div>

                        <div className="text-right sm:border-l sm:border-gray-100 sm:pl-6">
                            <span className="text-[10px] font-black uppercase tracking-wider text-gray-400">Recurring Amount</span>
                            <div className="text-2xl font-mono font-black text-gray-900">
                                ${Number(activeSub.renewal_price || activeSub.amount || activeSub.price || 0).toFixed(2)}
                                <span className="text-xs font-bold text-gray-500 ml-1">/ {activeSub.duration_unit || activeSub.billing_period || 'cycle'}</span>
                            </div>
                        </div>
                    </div>

                    {/* Metadata Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="bg-gray-50/70 p-4 rounded-xl border border-gray-100">
                            <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block mb-1">Renewal Date</span>
                            <div className="flex items-center gap-2 text-sm font-extrabold text-gray-900">
                                <Calendar size={16} className="text-gray-400" />
                                <span>{activeSub.next_billing ? new Date(activeSub.next_billing).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}</span>
                            </div>
                            {daysRemaining !== null && (
                                <span className="text-xs text-amber-600 font-semibold mt-1 flex items-center gap-1">
                                    <Clock size={12} /> {daysRemaining > 0 ? `${daysRemaining} days remaining` : 'Renews today'}
                                </span>
                            )}
                        </div>

                        <div className="bg-gray-50/70 p-4 rounded-xl border border-gray-100">
                            <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block mb-1">Auto-Renewal</span>
                            <div className="flex items-center gap-2 text-sm font-extrabold">
                                <span className={`h-2.5 w-2.5 rounded-full ${activeSub.auto_renew ? 'bg-emerald-500' : 'bg-gray-400'}`} />
                                <span className={activeSub.auto_renew ? 'text-emerald-700' : 'text-gray-600'}>
                                    {activeSub.auto_renew ? 'Enabled (Automatic)' : 'Disabled'}
                                </span>
                            </div>
                            <span className="text-xs text-gray-400 mt-1 block">Charges tenant wallet balance</span>
                        </div>

                        <div className="bg-gray-50/70 p-4 rounded-xl border border-gray-100">
                            <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block mb-1">Wallet Balance</span>
                            <div className={`text-sm font-mono font-extrabold ${Number(tenant.wallet?.balance || 0) < 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                                ${Number(tenant.wallet?.balance || 0).toFixed(2)}
                            </div>
                            <span className="text-xs text-gray-400 mt-1 block">Available for renewals</span>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="bg-white p-8 rounded-2xl shadow-sm ring-1 ring-gray-200/80 text-center space-y-4">
                    <div className="h-14 w-14 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto">
                        <CreditCard size={28} />
                    </div>
                    <div>
                        <h4 className="text-lg font-black text-gray-900 tracking-tight">No Active Subscription</h4>
                        <p className="text-sm text-gray-500 max-w-md mx-auto mt-1">
                            This tenant does not currently have an active recurring plan assigned. Assign a package to allocate extension limits and phone numbers.
                        </p>
                    </div>
                    <div>
                        <a
                            href={consoleUrl}
                            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold bg-primary-600 hover:bg-primary-700 text-white shadow-xs transition-all"
                        >
                            <Sparkles size={14} />
                            <span>Assign Plan in Console</span>
                        </a>
                    </div>
                </div>
            )}

            {/* Resource Capacity Allocation Meters */}
            <div>
                <h4 className="text-sm font-black uppercase tracking-wider text-gray-500 mb-3">Resource Capacity Allocation</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Extensions Meter */}
                    <div className="bg-white p-5 rounded-2xl shadow-sm ring-1 ring-gray-200/80 space-y-3">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
                                <Users size={16} className="text-blue-500" />
                                Extensions
                            </span>
                            <span className="text-xs font-mono font-bold text-gray-900">
                                {extUsed} / {extTotal !== null ? extTotal : '∞'}
                            </span>
                        </div>
                        <div className="w-full bg-gray-100 h-2.5 rounded-full overflow-hidden">
                            <div
                                className="bg-blue-500 h-full rounded-full transition-all duration-300"
                                style={{ width: extTotal ? `${extPercent}%` : (extUsed > 0 ? '100%' : '0%') }}
                            />
                        </div>
                        <span className="text-[11px] text-gray-400 block font-medium">
                            {extTotal ? `${extPercent}% capacity allocated` : 'Unlimited extension capacity'}
                        </span>
                    </div>

                    {/* Phone Numbers Meter */}
                    <div className="bg-white p-5 rounded-2xl shadow-sm ring-1 ring-gray-200/80 space-y-3">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
                                <Phone size={16} className="text-emerald-500" />
                                Phone Numbers / DIDs
                            </span>
                            <span className="text-xs font-mono font-bold text-gray-900">
                                {numUsed} / {numTotal !== null ? numTotal : '∞'}
                            </span>
                        </div>
                        <div className="w-full bg-gray-100 h-2.5 rounded-full overflow-hidden">
                            <div
                                className="bg-emerald-500 h-full rounded-full transition-all duration-300"
                                style={{ width: numTotal ? `${numPercent}%` : (numUsed > 0 ? '100%' : '0%') }}
                            />
                        </div>
                        <span className="text-[11px] text-gray-400 block font-medium">
                            {numTotal ? `${numPercent}% capacity allocated` : 'Unlimited phone number capacity'}
                        </span>
                    </div>

                    {/* Monitoring Seats Meter */}
                    <div className="bg-white p-5 rounded-2xl shadow-sm ring-1 ring-gray-200/80 space-y-3">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
                                <Shield size={16} className="text-purple-500" />
                                Monitoring Seats
                            </span>
                            <span className="text-xs font-mono font-bold text-gray-900">
                                {monUsed} / {monTotal !== null ? monTotal : '∞'}
                            </span>
                        </div>
                        <div className="w-full bg-gray-100 h-2.5 rounded-full overflow-hidden">
                            <div
                                className="bg-purple-500 h-full rounded-full transition-all duration-300"
                                style={{ width: monTotal ? `${monPercent}%` : (monUsed > 0 ? '100%' : '0%') }}
                            />
                        </div>
                        <span className="text-[11px] text-gray-400 block font-medium">
                            {monTotal ? `${monPercent}% capacity allocated` : 'Unlimited monitoring seats'}
                        </span>
                    </div>
                </div>
            </div>

            {/* Quick Action Footer Callout */}
            <div className="p-4 rounded-2xl bg-indigo-50/70 border border-indigo-100 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <Zap className="h-5 w-5 text-indigo-600 shrink-0" />
                    <p className="text-xs font-semibold text-indigo-950">
                        Need to adjust limits, assign mid-cycle add-ons, or reassign allocated assets? Manage complete tenant assets in the Subscriptions console.
                    </p>
                </div>
                <a
                    href={consoleUrl}
                    className="inline-flex items-center gap-1.5 text-xs font-extrabold text-indigo-700 hover:text-indigo-900 hover:underline shrink-0"
                >
                    <span>Open Console</span>
                    <ExternalLink size={12} />
                </a>
            </div>
        </div>
    );
};

const WalletTab = ({ tenant, onUpdate }) => {
    const [amount, setAmount] = useState('');
    const [type, setType] = useState('CREDIT');
    const [description, setDescription] = useState('Admin adjustment');
    const [loading, setLoading] = useState(false);

    const [creditLimitInput, setCreditLimitInput] = useState('');
    const [creditLimitLoading, setCreditLimitLoading] = useState(false);

    // Sync input value with current creditLimit when tenant changes
    useEffect(() => {
        if (tenant?.wallet?.creditLimit !== undefined) {
            setCreditLimitInput(String(tenant.wallet.creditLimit));
        }
    }, [tenant]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            await api.post('/wallet/internal-adjust', {
                targetTenantId: tenant.id,
                amount: Number(amount),
                type,
                description
            });
            setAmount('');
            onUpdate();
        } catch (err) {
            alert('Failed to update wallet: ' + (err.response?.data?.message || err.message));
        } finally {
            setLoading(false);
        }
    };

    const handleCreditLimitSubmit = async (e) => {
        e.preventDefault();
        setCreditLimitLoading(true);
        try {
            await api.post('/wallet/credit-limit', {
                targetTenantId: tenant.id,
                creditLimit: Number(creditLimitInput)
            });
            onUpdate();
        } catch (err) {
            alert('Failed to update credit limit: ' + (err.response?.data?.message || err.message));
        } finally {
            setCreditLimitLoading(false);
        }
    };

    const balanceVal = Number(tenant.wallet?.balance || 0);
    const creditLimitVal = Number(tenant.wallet?.creditLimit || 0);

    return (
        <div className="space-y-6 w-full">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight font-display">Wallet & Credit Control</h3>
                    <p className="text-xs sm:text-sm font-medium text-slate-500 dark:text-slate-400 mt-0.5 font-sans">
                        Internal balance adjustment and operational credit limits.
                    </p>
                </div>
                
                {/* Balance & Limit Quick Stat Badges */}
                <div className="flex items-center gap-3">
                    <div className="bg-white dark:bg-white/[0.04] px-4 py-2.5 rounded-2xl border border-slate-200/80 dark:border-white/10 shadow-xs">
                        <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest block font-mono">Current Float</span>
                        <span className={`text-xl font-mono font-black tracking-tight ${balanceVal < 0 ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
                            ${balanceVal.toFixed(2)}
                        </span>
                    </div>
                    <div className="bg-white dark:bg-white/[0.04] px-4 py-2.5 rounded-2xl border border-slate-200/80 dark:border-white/10 shadow-xs">
                        <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest block font-mono">Credit Limit</span>
                        <span className="text-xl font-mono font-black tracking-tight text-slate-900 dark:text-white">
                            ${creditLimitVal.toFixed(2)}
                        </span>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Administrative Adjustment Card */}
                <div className="bg-white dark:bg-[#0c0e17] p-6 rounded-3xl border border-slate-200/80 dark:border-white/10 shadow-sm relative overflow-hidden">
                    <div className="flex items-center gap-3 mb-5 pb-4 border-b border-slate-100 dark:border-white/5">
                        <div className="p-2.5 rounded-2xl bg-teal-50 dark:bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-100 dark:border-teal-500/20">
                            <Wallet className="h-5 w-5" />
                        </div>
                        <div>
                            <h4 className="text-sm font-bold text-slate-900 dark:text-white font-display">Administrative Adjustment</h4>
                            <p className="text-xs text-slate-500 dark:text-slate-400 font-sans">Credit or debit funds with an internal audit memo</p>
                        </div>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5 font-mono">Transaction Type</label>
                                <select
                                    className="block w-full rounded-xl border border-slate-200 dark:border-white/10 py-2.5 px-3 text-slate-900 dark:text-white shadow-xs focus:ring-2 focus:ring-teal-500 text-xs sm:text-sm font-bold bg-slate-50 dark:bg-white/[0.03] transition-all cursor-pointer"
                                    value={type}
                                    onChange={e => setType(e.target.value)}
                                >
                                    <option value="CREDIT">Deposit (Credit Account)</option>
                                    <option value="DEBIT">Charge (Debit Account)</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5 font-mono">Amount (USD)</label>
                                <div className="relative rounded-xl shadow-xs">
                                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                                        <span className="text-slate-400 font-bold text-xs">$</span>
                                    </div>
                                    <input
                                        type="number"
                                        step="0.01"
                                        required
                                        className="block w-full rounded-xl border border-slate-200 dark:border-white/10 py-2.5 pl-7 pr-3 text-slate-900 dark:text-white focus:ring-2 focus:ring-teal-500 text-xs sm:text-sm font-mono font-bold bg-slate-50 dark:bg-white/[0.03] transition-all"
                                        value={amount}
                                        onChange={e => setAmount(e.target.value)}
                                        placeholder="0.00"
                                    />
                                </div>
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5 font-mono">Internal Memo / Note</label>
                            <input
                                type="text"
                                required
                                className="block w-full rounded-xl border border-slate-200 dark:border-white/10 py-2.5 px-3.5 text-slate-900 dark:text-white focus:ring-2 focus:ring-teal-500 text-xs sm:text-sm font-medium bg-slate-50 dark:bg-white/[0.03] transition-all"
                                value={description}
                                onChange={e => setDescription(e.target.value)}
                                placeholder="E.g., Platform fee adjustment, refund or setup credit"
                            />
                        </div>

                        <div className="flex justify-end pt-3">
                            <button
                                type="submit"
                                disabled={loading}
                                className="inline-flex justify-center items-center rounded-xl bg-teal-600 hover:bg-teal-500 px-5 py-2.5 text-xs font-bold text-white shadow-md shadow-teal-600/20 transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
                            >
                                {loading ? (
                                    <><Loader className="animate-spin -ml-1 mr-2 h-3.5 w-3.5" /> Processing...</>
                                ) : (
                                    'Process Adjustment'
                                )}
                            </button>
                        </div>
                    </form>
                </div>

                {/* Edit Credit Limit Card */}
                <div className="bg-white dark:bg-[#0c0e17] p-6 rounded-3xl border border-slate-200/80 dark:border-white/10 shadow-sm relative overflow-hidden flex flex-col justify-between">
                    <div>
                        <div className="flex items-center gap-3 mb-5 pb-4 border-b border-slate-100 dark:border-white/5">
                            <div className="p-2.5 rounded-2xl bg-cyan-50 dark:bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-100 dark:border-cyan-500/20">
                                <Shield className="h-5 w-5" />
                            </div>
                            <div>
                                <h4 className="text-sm font-bold text-slate-900 dark:text-white font-display">Credit Limit Policy</h4>
                                <p className="text-xs text-slate-500 dark:text-slate-400 font-sans">Set allowable overdraft ceiling for telephony services</p>
                            </div>
                        </div>

                        <form onSubmit={handleCreditLimitSubmit} className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5 font-mono">Maximum Credit Limit</label>
                                <div className="relative rounded-xl shadow-xs">
                                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                                        <span className="text-slate-400 font-bold text-xs">$</span>
                                    </div>
                                    <input
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        required
                                        className="block w-full rounded-xl border border-slate-200 dark:border-white/10 py-2.5 pl-7 pr-3 text-slate-900 dark:text-white focus:ring-2 focus:ring-teal-500 text-xs sm:text-sm font-mono font-bold bg-slate-50 dark:bg-white/[0.03] transition-all"
                                        value={creditLimitInput}
                                        onChange={e => setCreditLimitInput(e.target.value)}
                                        placeholder="0.00"
                                    />
                                </div>
                                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
                                    Allows outbound SIP calls up to this negative balance. Once surpassed, the tenant's outbound services are suspended automatically.
                                </p>
                            </div>

                            <div className="flex justify-end pt-3">
                                <button
                                    type="submit"
                                    disabled={creditLimitLoading}
                                    className="inline-flex justify-center items-center rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 dark:text-slate-900 px-5 py-2.5 text-xs font-bold text-white shadow-xs transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
                                >
                                    {creditLimitLoading ? (
                                        <><Loader className="animate-spin -ml-1 mr-2 h-3.5 w-3.5" /> Updating...</>
                                    ) : (
                                        'Update Limit'
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
};

const ExtensionsTab = ({ tenant, onUpdate }) => {
    const [extensions, setExtensions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showAdd, setShowAdd] = useState(false);
    const [newExt, setNewExt] = useState({ name: '', password: '' });
    const [predictedExt, setPredictedExt] = useState('...');


    useEffect(() => {
        fetchExtensions();
    }, [tenant.id]);

    // Fetch the real next extension number from the backend whenever the Add modal opens
    useEffect(() => {
        if (!showAdd) return;
        const fetchNextNumber = async () => {
            try {
                const res = await api.get('/telecom/extensions/next-number', { params: { tenantId: tenant.id } });
                if (res.data.nextExtensionNumber) {
                    setPredictedExt(res.data.nextExtensionNumber.toString());
                }
            } catch (err) {
                console.error('Failed to fetch next extension number', err);
            }
        };
        fetchNextNumber();
    }, [showAdd, tenant.id]);

    const fetchExtensions = async () => {
        setLoading(true);
        try {
            const extRes = await api.get(`/telecom/extensions?tenantId=${tenant.id}`);

            setExtensions(extRes.data);
        } catch (err) {
            console.error('Failed to fetch extensions', err);
        } finally {
            setLoading(false);
        }
    };

    const handleAddExtension = async (e) => {
        e.preventDefault();
        try {
            await api.post('/telecom/extensions', {
                targetTenantId: tenant.id,
                name: newExt.name,
                password: newExt.password
            });
            setShowAdd(false);
            setNewExt({ name: '', password: '' });
            fetchExtensions();
            onUpdate();
        } catch (err) {
            alert('Failed to add extension: ' + (err.response?.data?.message || err.message));
        }
    };

    const handleDeleteExtension = async (extension) => {
        if (!window.confirm(`Are you sure you want to delete extension ${extension.extensionNumber}?`)) {
            return;
        }

        try {
            await api.delete(`/telecom/extensions/${extension.id}`, {
                params: { tenantId: tenant.id }
            });
            fetchExtensions();
            onUpdate();
        } catch (err) {
            console.error('Failed to delete extension:', err);
            alert('Failed to delete extension: ' + (err.response?.data?.message || err.message));
        }
    };

    return (
        <div className="space-y-6 w-full">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200/80 dark:border-white/10">
                <div>
                    <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight font-display">SIP Extensions</h3>
                    <p className="text-xs sm:text-sm font-medium text-slate-500 dark:text-slate-400 mt-0.5 font-sans">
                        Provisioned hardware and softphone extension lines for this tenant.
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setShowAdd(true)}
                        className="inline-flex justify-center items-center rounded-xl bg-teal-600 hover:bg-teal-500 px-4 py-2.5 text-xs font-bold text-white shadow-md shadow-teal-600/20 transition-all active:scale-95 cursor-pointer gap-2"
                    >
                        <Plus size={15} /> Add Extension
                    </button>
                    <button
                        onClick={fetchExtensions}
                        className="p-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/[0.04] text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-white/10 transition-all cursor-pointer shadow-xs"
                        title="Reload Extensions"
                    >
                        <RefreshCw size={15} />
                    </button>
                </div>
            </div>

            {loading ? (
                <div className="flex justify-center py-16">
                    <Loader className="animate-spin text-teal-600 h-8 w-8" />
                </div>
            ) : (
                <div className="bg-white dark:bg-[#0c0e17] rounded-3xl border border-slate-200/80 dark:border-white/10 shadow-sm overflow-hidden">
                    <div className="px-6 py-4 border-b border-slate-100 dark:border-white/5 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Phone size={16} className="text-teal-600 dark:text-teal-400" />
                            <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider font-mono">
                                Allocated Extension Lines ({extensions.length})
                            </h4>
                        </div>
                    </div>
                    <div className="p-6">
                        {extensions.length === 0 ? (
                            <div className="text-center py-12">
                                <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-white/[0.04] text-slate-400 flex items-center justify-center mx-auto mb-3">
                                    <Phone size={20} />
                                </div>
                                <p className="text-sm font-bold text-slate-700 dark:text-slate-300">No extensions registered</p>
                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Click "Add Extension" above to create this tenant's first SIP extension line.</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                {extensions.map(ext => (
                                    <div 
                                        key={ext.id} 
                                        className="flex items-center justify-between p-4 rounded-2xl border border-slate-200/80 dark:border-white/10 bg-slate-50/70 dark:bg-white/[0.02] hover:bg-white dark:hover:bg-white/[0.05] hover:border-teal-500/40 dark:hover:border-teal-500/30 hover:shadow-md transition-all group"
                                    >
                                        <div className="flex items-center gap-3 min-w-0">
                                            <div className="w-10 h-10 rounded-xl bg-teal-50 dark:bg-teal-500/10 text-teal-700 dark:text-teal-300 border border-teal-200/60 dark:border-teal-500/20 flex items-center justify-center font-mono font-black text-sm shrink-0">
                                                {ext.extensionNumber}
                                            </div>
                                            <div className="min-w-0">
                                                <h5 className="text-sm font-bold text-slate-900 dark:text-white truncate font-display">{ext.name}</h5>
                                                <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500 uppercase tracking-wider">SIP Line</span>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2 shrink-0">
                                            <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                                                ext.ringGroupMembers?.length > 0 
                                                    ? 'bg-purple-50 dark:bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-500/20' 
                                                    : 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-500/20'
                                            }`}>
                                                {ext.ringGroupMembers?.length > 0 ? 'Ring Grp' : 'Active'}
                                            </span>
                                            <button
                                                onClick={() => handleDeleteExtension(ext)}
                                                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-all opacity-0 group-hover:opacity-100 cursor-pointer"
                                                title="Delete Extension"
                                            >
                                                <Trash2 size={15} />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {showAdd && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
                    <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-md transition-opacity" onClick={() => setShowAdd(false)} />
                    <div className="relative bg-white dark:bg-[#0c0e17] rounded-3xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col border border-slate-200/80 dark:border-white/10 ring-1 ring-black/5 p-6 z-10">
                        <div className="flex justify-between items-center mb-5 pb-3 border-b border-slate-100 dark:border-white/5">
                            <div>
                                <h4 className="text-lg font-black text-slate-900 dark:text-white tracking-tight font-display">Provision Extension</h4>
                                <p className="text-xs text-slate-500 dark:text-slate-400 font-sans">Create a new extension on this tenant's PBX</p>
                            </div>
                            <button onClick={() => setShowAdd(false)} className="rounded-xl p-2 text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 transition-colors cursor-pointer">
                                <X size={18} />
                            </button>
                        </div>
                        <form onSubmit={handleAddExtension} className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5 font-mono">Assigned Number</label>
                                <input
                                    className="block w-full rounded-xl border border-slate-200 dark:border-white/10 py-2.5 px-3.5 text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-white/[0.03] text-sm font-mono font-bold cursor-not-allowed"
                                    disabled
                                    value={predictedExt}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5 font-mono">Display / Friendly Name</label>
                                <input
                                    className="block w-full rounded-xl border border-slate-200 dark:border-white/10 py-2.5 px-3.5 text-slate-900 dark:text-white focus:ring-2 focus:ring-teal-500 text-sm font-medium bg-slate-50 dark:bg-white/[0.03] transition-all"
                                    placeholder="E.g., Support Desk, Front Desk"
                                    value={newExt.name}
                                    onChange={e => setNewExt({ ...newExt, name: e.target.value })}
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5 font-mono">SIP Secret / Password</label>
                                <input
                                    className="block w-full rounded-xl border border-slate-200 dark:border-white/10 py-2.5 px-3.5 text-slate-900 dark:text-white focus:ring-2 focus:ring-teal-500 text-sm font-mono font-bold bg-slate-50 dark:bg-white/[0.03] transition-all"
                                    placeholder="Secure alphanumeric password"
                                    type="text"
                                    value={newExt.password}
                                    onChange={e => setNewExt({ ...newExt, password: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="flex justify-end gap-2.5 pt-3">
                                <button
                                    type="button"
                                    onClick={() => setShowAdd(false)}
                                    className="inline-flex justify-center items-center rounded-xl px-4 py-2 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10 transition-all cursor-pointer"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="inline-flex justify-center items-center rounded-xl bg-teal-600 hover:bg-teal-500 px-5 py-2 text-xs font-bold text-white shadow-md shadow-teal-600/20 transition-all active:scale-95 cursor-pointer"
                                >
                                    Create Extension
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

const UsersTab = ({ tenant }) => {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const { } = useAuth();
    const [impersonatingId, setImpersonatingId] = useState(null);

    useEffect(() => {
        fetchUsers();
    }, [tenant.id]);

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const res = await api.get(`/users?tenantId=${tenant.id}`);
            setUsers(res.data.data);
        } catch (err) {
            console.error('Failed to fetch users', err);
        } finally {
            setLoading(false);
        }
    };

    const handleImpersonate = async (userId) => {
        if (!window.confirm('Open impersonation session in a new tab?')) return;

        setImpersonatingId(userId);
        try {
            const response = await api.post(`/users/impersonate/${userId}`);
            const { ticket } = response.data;
            const url = `/impersonate?ticket=${encodeURIComponent(ticket)}`;
            window.open(url, '_blank');
        } catch (err) {
            alert('Impersonation failed: ' + (err.response?.data?.message || err.message));
        } finally {
            setImpersonatingId(null);
        }
    };

    return (
        <div className="space-y-6 w-full">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200/80 dark:border-white/10">
                <div>
                    <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight font-display">Tenant Users</h3>
                    <p className="text-xs sm:text-sm font-medium text-slate-500 dark:text-slate-400 mt-0.5 font-sans">
                        Directory of administrator and agent user accounts associated with this tenant.
                    </p>
                </div>
                <button
                    onClick={fetchUsers}
                    className="p-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/[0.04] text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-white/10 transition-all cursor-pointer shadow-xs self-start sm:self-auto"
                    title="Reload Users"
                >
                    <RefreshCw size={15} />
                </button>
            </div>

            {loading ? (
                <div className="flex justify-center py-16">
                    <Loader className="animate-spin text-teal-600 h-8 w-8" />
                </div>
            ) : (
                <div className="bg-white dark:bg-[#0c0e17] rounded-3xl border border-slate-200/80 dark:border-white/10 shadow-sm overflow-hidden text-left">
                    {users.length === 0 ? (
                        <div className="text-center py-16">
                            <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-white/[0.04] text-slate-400 flex items-center justify-center mx-auto mb-3">
                                <User size={20} />
                            </div>
                            <p className="text-sm font-bold text-slate-700 dark:text-slate-300">No users found</p>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">There are currently no provisioned users under this tenant.</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-slate-100 dark:divide-white/5">
                            {users.map(user => (
                                <div key={user.id} className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/60 dark:hover:bg-white/[0.02] transition-colors group">
                                    <div className="flex items-center gap-3.5 min-w-0">
                                        <div className="w-10 h-10 rounded-2xl bg-teal-50 dark:bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-200/60 dark:border-teal-500/20 flex items-center justify-center font-display font-black text-sm shrink-0">
                                            {user.name ? user.name.charAt(0).toUpperCase() : user.email.charAt(0).toUpperCase()}
                                        </div>
                                        <div className="min-w-0">
                                            <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                                                <span className="font-bold text-sm text-slate-900 dark:text-white font-display truncate">
                                                    {user.name || 'Unnamed User'}
                                                </span>
                                                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider font-mono border ${
                                                    user.role === 'ADMIN' 
                                                        ? 'bg-purple-50 dark:bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-500/20' :
                                                    user.role === 'SUPPORT' 
                                                        ? 'bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-500/20' :
                                                        'bg-slate-100 dark:bg-white/[0.04] text-slate-600 dark:text-slate-300 border-slate-200 dark:border-white/10'
                                                }`}>
                                                    {user.role}
                                                </span>
                                            </div>
                                            <p className="text-xs text-slate-500 dark:text-slate-400 font-sans truncate">{user.email}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
                                        <button
                                            onClick={() => handleImpersonate(user.id)}
                                            disabled={impersonatingId === user.id}
                                            className="inline-flex justify-center items-center gap-1.5 rounded-xl border border-teal-500/30 dark:border-teal-500/20 bg-teal-50 dark:bg-teal-500/10 px-3.5 py-1.5 text-xs font-bold text-teal-700 dark:text-teal-300 hover:bg-teal-100 dark:hover:bg-teal-500/20 transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
                                        >
                                            {impersonatingId === user.id ? <Loader className="animate-spin h-3.5 w-3.5" /> : <LogIn className="h-3.5 w-3.5" />}
                                            Impersonate
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

const RecordingRateCardModal = ({ onClose, onConfirm, customerId }) => {
    const [rateCards, setRateCards] = useState([]);
    const [selectedCardId, setSelectedCardId] = useState('');
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        let isMounted = true;
        const fetchCards = async () => {
            setLoading(true);
            setError('');
            try {
                const res = await api.get('/admin/rec-rate-cards');
                const list = Array.isArray(res.data) ? res.data : (res.data?.data || []);
                if (!isMounted) return;
                setRateCards(list);
                if (list.length > 0) {
                    setSelectedCardId(String(list[0].id));
                }

                // If customer has an existing recording rate card mapping, pre-select it
                if (customerId) {
                    try {
                        const mapRes = await api.get(`/admin/rec-rate-cards/customer/${customerId}`);
                        const mappedId = mapRes.data?.rec_rc_id || mapRes.data?.id;
                        if (mappedId && list.some(c => String(c.id) === String(mappedId))) {
                            if (isMounted) setSelectedCardId(String(mappedId));
                        }
                    } catch (e) {
                        // Ignore if no mapping exists yet
                    }
                }
            } catch (err) {
                console.error('Failed to load recording rate cards:', err);
                if (isMounted) {
                    setError(err.response?.data?.message || err.message || 'Failed to load recording rate cards');
                }
            } finally {
                if (isMounted) setLoading(false);
            }
        };

        fetchCards();
        return () => { isMounted = false; };
    }, [customerId]);

    const selectedCard = rateCards.find(c => String(c.id) === String(selectedCardId));

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!selectedCardId) return;
        setSubmitting(true);
        try {
            await onConfirm(Number(selectedCardId));
        } catch (err) {
            // Error handled by onConfirm
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm transition-opacity" onClick={onClose}></div>
            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col ring-1 ring-gray-200">
                <div className="px-6 py-5 border-b border-gray-100 flex justify-between items-center shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600 border border-blue-100">
                            <Mic className="h-5 w-5" />
                        </div>
                        <div className="text-left">
                            <h4 className="text-lg font-extrabold text-gray-900 tracking-tight">Enable Call Recording</h4>
                            <p className="text-xs font-medium text-gray-500 mt-0.5">
                                Select a recording rate card for this tenant
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="rounded-xl p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors focus:outline-none"
                    >
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4 text-left">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-8 gap-2">
                            <Loader2 className="h-7 w-7 animate-spin text-primary-600" />
                            <span className="text-xs font-medium text-gray-500">Loading recording rate cards...</span>
                        </div>
                    ) : error ? (
                        <div className="p-4 rounded-xl bg-rose-50 border border-rose-100 text-rose-700 text-xs font-medium">
                            {error}
                        </div>
                    ) : rateCards.length === 0 ? (
                        <div className="text-center py-8">
                            <Mic className="mx-auto h-10 w-10 text-gray-300 mb-2" />
                            <p className="text-sm font-bold text-gray-700">No recording rate cards available</p>
                            <p className="text-xs text-gray-400 mt-1">Please create a recording rate card in Rate Cards Management first.</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-extrabold text-gray-700 uppercase tracking-wider mb-2">
                                    Recording Rate Card <span className="text-rose-500">*</span>
                                </label>
                                <select
                                    className="block w-full rounded-xl border border-gray-300 py-2.5 px-3.5 text-gray-900 shadow-sm focus:border-primary-500 focus:ring-primary-500 text-sm font-semibold bg-white"
                                    value={selectedCardId}
                                    onChange={(e) => setSelectedCardId(e.target.value)}
                                    required
                                >
                                    <option value="" disabled>Select a Rate Card</option>
                                    {rateCards.map((card) => {
                                        const rate = card.rate_per_min ?? card.ratePerMin;
                                        const rateStr = rate !== undefined && rate !== null ? `${parseFloat(rate).toFixed(4)}/min` : '';
                                        const retention = card.retention_period ?? card.retentionPeriod;
                                        const retentionStr = retention ? `${retention}d retention` : '';
                                        const parts = [rateStr, retentionStr].filter(Boolean).join(', ');
                                        return (
                                            <option key={card.id} value={card.id}>
                                                {card.name}{parts ? ` — ${parts}` : ''}
                                            </option>
                                        );
                                    })}
                                </select>
                            </div>

                            {selectedCard && (
                                <div className="p-3.5 rounded-xl bg-gray-50 border border-gray-100 space-y-1.5 text-xs text-gray-600">
                                    <div className="flex justify-between">
                                        <span className="text-gray-400 font-medium">Rate:</span>
                                        <span className="font-bold font-mono text-gray-900">
                                            ${parseFloat(selectedCard.rate_per_min ?? selectedCard.ratePerMin ?? 0).toFixed(4)} / min
                                        </span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-400 font-medium">Retention Period:</span>
                                        <span className="font-bold text-gray-900">
                                            {selectedCard.retention_period ?? selectedCard.retentionPeriod ?? 7} Days
                                        </span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-400 font-medium">Currency:</span>
                                        <span className="font-bold text-gray-900">{selectedCard.currency || 'USD'}</span>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    <div className="pt-3 flex justify-end gap-3 border-t border-gray-100">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={submitting}
                            className="inline-flex justify-center items-center rounded-xl bg-white px-4 py-2 text-sm font-bold text-gray-700 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 transition-all active:scale-[0.98] focus:outline-none"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={submitting || loading || rateCards.length === 0 || !selectedCardId}
                            className="inline-flex justify-center items-center rounded-xl bg-primary-600 px-4 py-2 text-sm font-bold text-white shadow-sm hover:bg-primary-700 transition-all active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {submitting ? (
                                <><Loader2 className="animate-spin -ml-1 mr-2 h-4 w-4" /> Enabling...</>
                            ) : (
                                'Confirm & Enable'
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

const FeaturesTab = ({ tenant, onUpdate }) => {
    const [features, setFeatures] = useState(tenant.tenantFeatures || {
        ivrEnabled: true,
        ivrLimit: 10,
        ringGroupEnabled: true,
        ringGroupLimit: 10,
        schedulerEnabled: true,
        schedulerLimit: 10,
        didForwardEnabled: true,
        didForwardLimit: 10,
        voicemailEnabled: false,
        voicemailBoxLimit: 0,
        voicemailStorageLimitMb: 0,
    });
    const [updatingFeature, setUpdatingFeature] = useState(null);
    const [showRecordingModal, setShowRecordingModal] = useState(false);

    // Keep state in sync if tenant prop updates
    useEffect(() => {
        if (tenant.tenantFeatures) {
            setFeatures(tenant.tenantFeatures);
        }
    }, [tenant.tenantFeatures]);

    const handleToggle = async (key) => {
        if (key === 'recordingAllowed') {
            const currentlyAllowed = !!features.recordingAllowed;
            if (!currentlyAllowed) {
                setShowRecordingModal(true);
            } else {
                setUpdatingFeature('recordingAllowed');
                try {
                    await api.patch(`/tenants/${tenant.id}/features`, { recordingAllowed: false });
                    setFeatures(prev => ({ ...prev, recordingAllowed: false }));
                    onUpdate();
                } catch (err) {
                    console.error('Failed to disable call recording:', err);
                    alert('Failed to disable call recording: ' + (err.response?.data?.message || err.message));
                } finally {
                    setUpdatingFeature(null);
                }
            }
            return;
        }

        setUpdatingFeature(key);
        const updatedFeatures = {
            ...features,
            [key]: !features[key]
        };
        try {
            await api.patch(`/tenants/${tenant.id}/features`, { [key]: !features[key] });
            setFeatures(updatedFeatures);
            onUpdate(); // refresh parent details
        } catch (err) {
            console.error('Failed to update tenant features:', err);
            alert('Failed to update tenant features');
        } finally {
            setUpdatingFeature(null);
        }
    };

    const handleEnableRecording = async (recRateCardId) => {
        setUpdatingFeature('recordingAllowed');
        try {
            await api.patch(`/tenants/${tenant.id}/features`, {
                recordingAllowed: true,
                recRateCardId: Number(recRateCardId)
            });
            setFeatures(prev => ({ ...prev, recordingAllowed: true }));
            setShowRecordingModal(false);
            onUpdate();
        } catch (err) {
            console.error('Failed to enable call recording:', err);
            alert('Failed to enable call recording: ' + (err.response?.data?.message || err.message));
            throw err;
        } finally {
            setUpdatingFeature(null);
        }
    };

    const handleLimitChange = async (limitKey, value) => {
        const intValue = parseInt(value, 10);
        if (isNaN(intValue) || intValue < 0) return;

        setUpdatingFeature(limitKey);
        const updatedFeatures = {
            ...features,
            [limitKey]: intValue
        };
        try {
            await api.patch(`/tenants/${tenant.id}/features`, { [limitKey]: intValue });
            setFeatures(updatedFeatures);
            onUpdate(); // refresh parent details
        } catch (err) {
            console.error('Failed to update tenant feature limit:', err);
            alert('Failed to update tenant feature limit');
        } finally {
            setUpdatingFeature(null);
        }
    };

    const FEATURE_ITEMS = [
        {
            key: 'recordingAllowed',
            title: 'Call Recording Permission',
            description: 'Allow tenant administrators to toggle automatic call recording for extensions.',
            icon: Mic,
            color: 'text-indigo-600 bg-indigo-50 dark:bg-indigo-500/10 border-indigo-100 dark:border-indigo-500/20',
        },
        {
            key: 'ivrEnabled',
            limitKey: 'ivrLimit',
            title: 'Interactive Voice Response (IVR)',
            description: 'Enable multi-level auto-attendant phone menus and call routing prompts.',
            icon: Phone,
            color: 'text-teal-600 bg-teal-50 dark:bg-teal-500/10 border-teal-100 dark:border-teal-500/20',
        },
        {
            key: 'ringGroupEnabled',
            limitKey: 'ringGroupLimit',
            title: 'Ring Groups',
            description: 'Group extensions together to ring sequentially or simultaneously for incoming calls.',
            icon: Users,
            color: 'text-purple-600 bg-purple-50 dark:bg-purple-500/10 border-purple-100 dark:border-purple-500/20',
        },
        {
            key: 'schedulerEnabled',
            limitKey: 'schedulerLimit',
            title: 'Operational Schedules (Scheduler)',
            description: 'Route calls automatically based on operational business hours, holidays, and times.',
            icon: Clock,
            color: 'text-amber-600 bg-amber-50 dark:bg-amber-500/10 border-amber-100 dark:border-amber-500/20',
        },
        {
            key: 'didForwardEnabled',
            limitKey: 'didForwardLimit',
            title: 'DID Forwarding',
            description: 'Directly forward incoming phone numbers to external lines or specific destinations.',
            icon: Phone,
            color: 'text-cyan-600 bg-cyan-50 dark:bg-cyan-500/10 border-cyan-100 dark:border-cyan-500/20',
            color: 'text-blue-600 bg-blue-50 border-blue-100',
        },
        {
            key: 'voicemailEnabled',
            title: 'Voicemail',
            description: 'On for new tenants: one active company mailbox and one off-by-default mailbox per extension.',
            icon: Mic,
            color: 'text-blue-600 bg-blue-50 border-blue-100',
        }
    ];

    return (
        <div className="space-y-6 w-full">
            <div className="flex justify-between items-center pb-4 border-b border-slate-200/80 dark:border-white/10">
                <div className="text-left">
                    <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight font-display">Feature Controller</h3>
                    <p className="text-xs sm:text-sm font-medium text-slate-500 dark:text-slate-400 mt-0.5 font-sans">Control active modules and configure resource allocation limits for this tenant.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-4">
                {FEATURE_ITEMS.map((item) => {
                    const Icon = item.icon;
                    const isEnabled = features[item.key];
                    const isUpdating = updatingFeature === item.key || updatingFeature === item.limitKey;
                    const limitVal = features[item.limitKey] ?? 10;

                    return (
                        <div
                            key={item.key}
                            className={`p-5 rounded-3xl border transition-all flex flex-col md:flex-row md:items-center justify-between gap-5 ${
                                isEnabled
                                    ? 'bg-white dark:bg-[#0c0e17] border-slate-200/80 dark:border-white/10 shadow-xs'
                                    : 'bg-slate-50/70 dark:bg-white/[0.02] border-slate-200/50 dark:border-white/5 opacity-80'
                            }`}
                        >
                            <div className="flex items-start gap-4 flex-1 min-w-0">
                                <div className={`p-3 rounded-2xl border shrink-0 ${item.color}`}>
                                    <Icon className="h-5 w-5" />
                                </div>
                                <div className="text-left flex-1 min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <h4 className="font-bold text-slate-900 dark:text-white text-sm tracking-tight font-display">{item.title}</h4>
                                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider font-mono border ${
                                            isEnabled
                                                ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20'
                                                : 'bg-slate-100 dark:bg-white/[0.04] text-slate-400 dark:text-slate-500 border-slate-200 dark:border-white/10'
                                        }`}>
                                            {isEnabled ? 'Enabled' : 'Disabled'}
                                        </span>
                                    </div>
                                    <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-1 leading-relaxed max-w-xl font-sans">{item.description}</p>

                                    {isEnabled && item.limitKey && (
                                        <div className="mt-3.5 flex items-center gap-2.5 bg-slate-50 dark:bg-white/[0.03] px-3 py-1.5 rounded-xl border border-slate-200/60 dark:border-white/10 inline-flex">
                                            <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300 font-mono">Allocation Ceiling:</span>
                                            <input
                                                type="number"
                                                min="0"
                                                value={limitVal}
                                                onChange={(e) => {
                                                    const val = e.target.value;
                                                    setFeatures(prev => ({
                                                        ...prev,
                                                        [item.limitKey]: val === '' ? '' : parseInt(val, 10)
                                                    }));
                                                }}
                                                onBlur={(e) => {
                                                    const val = e.target.value;
                                                    const intVal = val === '' ? 10 : parseInt(val, 10);
                                                    handleLimitChange(item.limitKey, intVal);
                                                }}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter') {
                                                        const val = e.target.value;
                                                        const intVal = val === '' ? 10 : parseInt(val, 10);
                                                        handleLimitChange(item.limitKey, intVal);
                                                        e.target.blur();
                                                    }
                                                }}
                                                disabled={isUpdating}
                                                className="w-16 px-2 py-0.5 text-xs font-mono font-black text-slate-900 dark:text-white bg-white dark:bg-[#121420] border border-slate-200 dark:border-white/15 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 text-center shadow-xs"
                                            />
                                            <span className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider font-mono">slots</span>
                                        </div>
                                    )}
                                    {isEnabled && item.key === 'voicemailEnabled' && (
                                        <div className="mt-3 flex flex-wrap items-end gap-4">
                                            <label className="flex flex-col gap-1 text-xs font-bold text-gray-700">
                                                Storage limit (MB, 0 = unlimited)
                                                <input type="number" min="0" className="w-28 px-2 py-1 border rounded"
                                                    value={features.voicemailStorageLimitMb ?? 0}
                                                    onChange={e => setFeatures(prev => ({ ...prev, voicemailStorageLimitMb: e.target.value }))}
                                                    onBlur={e => handleLimitChange('voicemailStorageLimitMb', e.target.value || 0)} />
                                            </label>
                                            <p className="text-xs text-gray-500">Each mailbox keeps its latest 20 messages. When a new message arrives, the oldest is removed.</p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Modern Toggle Switch */}
                            <div className="flex items-center shrink-0 justify-end self-end md:self-center">
                                <button
                                    onClick={() => !isUpdating && handleToggle(item.key)}
                                    disabled={isUpdating}
                                    type="button"
                                    className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 dark:focus:ring-offset-slate-900 disabled:opacity-50 ${
                                        isEnabled ? 'bg-teal-600 shadow-md shadow-teal-600/30' : 'bg-slate-200 dark:bg-white/15'
                                    }`}
                                >
                                    <span
                                        className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out flex items-center justify-center ${
                                            isEnabled ? 'translate-x-5' : 'translate-x-0'
                                        }`}
                                    >
                                        {isUpdating && <Loader className="animate-spin h-3 w-3 text-teal-600" />}
                                    </span>
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>

            {showRecordingModal && (
                <RecordingRateCardModal
                    onClose={() => setShowRecordingModal(false)}
                    onConfirm={handleEnableRecording}
                    customerId={tenant.customerCode || tenant.id}
                />
            )}
        </div>
    );
};

const SubscriptionsTab = ({ tenant, onUpdate }) => {
    const { addToast } = useToast();
    const [subscriptions, setSubscriptions] = useState([]);
    const [plans, setPlans] = useState([]);
    const [loading, setLoading] = useState(true);
    const [catalog, setCatalog] = useState([]);
    const [catalogLoading, setCatalogLoading] = useState(true);
    const [quantityMap, setQuantityMap] = useState({});
    const [quotingAddonId, setQuotingAddonId] = useState(null);
    const [quoteData, setQuoteData] = useState(null);
    const [addonModalOpen, setAddonModalOpen] = useState(false);

    useEffect(() => {
        if (tenant?.id) {
            loadSubscriptionData();
            loadCatalog();
        }
    }, [tenant?.id]);

    const loadSubscriptionData = async () => {
        setLoading(true);
        try {
            const [subRes, plansRes] = await Promise.allSettled([
                api.get('/subscriptions', { params: { tenantId: tenant.id } }),
                subscriptionService.getPlans()
            ]);
            if (subRes.status === 'fulfilled') {
                setSubscriptions(subRes.value.data || []);
            }
            if (plansRes.status === 'fulfilled') {
                setPlans(plansRes.value || []);
            }
        } catch (err) {
            console.error('Failed to load subscriptions', err);
        } finally {
            setLoading(false);
        }
    };

    const loadCatalog = async () => {
        setCatalogLoading(true);
        try {
            const addonsData = await subscriptionService.getCatalog();
            setCatalog(addonsData || []);
        } catch (err) {
            console.error('Failed to load add-on catalog:', err);
        } finally {
            setCatalogLoading(false);
        }
    };

    const getQuantity = (addonId) => quantityMap[addonId] || 1;

    const handleQuantityChange = (addonId, val) => {
        const q = Math.max(1, parseInt(val, 10) || 1);
        setQuantityMap((prev) => ({ ...prev, [addonId]: q }));
    };

    const getAddonIcon = (addonType = '') => {
        const type = String(addonType).toLowerCase();
        const iconClasses = "h-5 w-5 text-teal-600 dark:text-teal-400";
        switch (type) {
            case 'ext':
            case 'extension':
                return <Radio className={iconClasses} />;
            case 'tfn':
            case 'did':
                return <Phone className={iconClasses} />;
            case 'storage':
                return <HardDrive className={iconClasses} />;
            case 'mon':
                return <Activity className={iconClasses} />;
            default:
                return <Package className={iconClasses} />;
        }
    };

    const handleGetQuote = async (addon) => {
        const qty = getQuantity(addon.addon_id);
        setQuotingAddonId(addon.addon_id);
        try {
            const quote = await subscriptionService.getQuote(
                tenant?.id,
                addon.addon_id,
                qty
            );
            setQuoteData(quote);
            setAddonModalOpen(true);
        } catch (err) {
            console.error('Failed to calculate quote:', err);
            if (addToast) addToast('error', err.response?.data?.message || 'Failed to calculate quote');
        } finally {
            setQuotingAddonId(null);
        }
    };

    const handleRefreshAll = () => {
        loadSubscriptionData();
        loadCatalog();
        if (onUpdate) onUpdate();
    };

    const activeSubs = subscriptions.filter(s => ['active', 'grace'].includes(s.status));

    return (
        <div className="space-y-6 w-full">
            {/* Header with Title and External Link */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200/80 dark:border-white/10">
                <div>
                    <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight font-display">Subscription & Entitlements</h3>
                    <p className="text-xs sm:text-sm font-medium text-slate-500 dark:text-slate-400 mt-0.5 font-sans">
                        Active plans, resource allocations, and mid-cycle capacity add-ons.
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <a
                        href={`/super-admin/subscriptions?tenantId=${encodeURIComponent(tenant.id)}`}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-teal-600 hover:bg-teal-500 text-white shadow-md shadow-teal-600/20 transition-all cursor-pointer"
                    >
                        <CreditCard size={14} /> Full Billing Console
                    </a>
                    <button
                        onClick={handleRefreshAll}
                        className="p-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/[0.04] text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-all cursor-pointer shadow-xs"
                        title="Reload Subscriptions"
                    >
                        <RefreshCw size={15} />
                    </button>
                </div>
            </div>

            {/* Subscriptions Overview Cards */}
            {loading ? (
                <div className="flex justify-center py-12">
                    <Loader className="animate-spin text-teal-600 h-8 w-8" />
                </div>
            ) : subscriptions.length === 0 ? (
                <div className="p-8 text-center bg-white dark:bg-[#0c0e17] rounded-3xl border border-slate-200/80 dark:border-white/10">
                    <CreditCard className="mx-auto h-12 w-12 text-slate-300 dark:text-slate-600 mb-3" />
                    <p className="text-sm font-bold text-slate-700 dark:text-slate-300">No active subscription</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
                        This tenant currently has no active subscription packages assigned. Assign or renew a package via the billing console.
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {subscriptions.map(s => {
                        const isLive = ['active', 'grace'].includes(s.status);
                        return (
                            <div key={s.id} className="p-5 rounded-3xl border border-slate-200/80 dark:border-white/10 bg-white dark:bg-[#0c0e17] shadow-xs flex flex-col justify-between">
                                <div>
                                    <div className="flex justify-between items-start gap-2 mb-3">
                                        <div>
                                            <h4 className="font-bold text-base text-slate-900 dark:text-white font-display">{s.plan_name}</h4>
                                            <span className="inline-block mt-0.5 text-[10px] font-mono uppercase font-bold text-teal-700 dark:text-teal-300 bg-teal-50 dark:bg-teal-500/10 px-2 py-0.5 rounded-full border border-teal-200 dark:border-teal-500/20">
                                                {s.subscription_type || 'Base Plan'}
                                            </span>
                                        </div>
                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider font-mono border ${
                                            s.status === 'active' ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20' :
                                            s.status === 'grace' ? 'bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-500/20' :
                                            'bg-slate-100 dark:bg-white/[0.04] text-slate-500 border-slate-200 dark:border-white/10'
                                        }`}>
                                            {s.status}
                                        </span>
                                    </div>

                                    {/* Dates & Renewal info */}
                                    <div className="text-xs text-slate-500 dark:text-slate-400 font-mono mb-4 space-y-1">
                                        <p>Period: {s.start_date ? new Date(s.start_date).toLocaleDateString() : '—'} → {s.end_date ? new Date(s.end_date).toLocaleDateString() : '—'}</p>
                                        <p className="font-bold text-slate-800 dark:text-slate-200">
                                            Renewal: ${Number(s.renewal_price || 0).toFixed(2)} {String(s.currency_snapshot || 'USD').toUpperCase()} / {s.duration_count} {s.duration_unit}
                                        </p>
                                    </div>

                                    {/* Quotas breakdown */}
                                    <div className="bg-slate-50 dark:bg-white/[0.02] p-3 rounded-2xl border border-slate-200/60 dark:border-white/5 grid grid-cols-3 gap-2 text-center">
                                        <div>
                                            <span className="text-[10px] uppercase font-bold text-slate-400 block font-mono">Numbers</span>
                                            <span className="text-xs font-black text-slate-900 dark:text-white font-mono">
                                                {s.usage?.numbers || 0} / {s.entitlement_snapshot?.numbers || 0}
                                            </span>
                                        </div>
                                        <div>
                                            <span className="text-[10px] uppercase font-bold text-slate-400 block font-mono">Extensions</span>
                                            <span className="text-xs font-black text-slate-900 dark:text-white font-mono">
                                                {s.usage?.extensions || 0} / {s.entitlement_snapshot?.extensions || 0}
                                            </span>
                                        </div>
                                        <div>
                                            <span className="text-[10px] uppercase font-bold text-slate-400 block font-mono">Monitoring</span>
                                            <span className="text-xs font-black text-slate-900 dark:text-white font-mono">
                                                {s.usage?.monitoring_extensions || 0} / {s.entitlement_snapshot?.monitoring_extensions || 0}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Mid-Cycle Add-ons Catalog Section */}
            <div className="pt-4 border-t border-slate-200/80 dark:border-white/10">
                <div className="flex items-center gap-2 mb-1">
                    <Zap className="h-5 w-5 text-teal-600 dark:text-teal-400" />
                    <h4 className="text-base font-bold text-slate-900 dark:text-white tracking-tight font-display">
                        Mid-Cycle Capacity Add-ons
                    </h4>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-4 font-sans">
                    Select capacity add-ons to upgrade tenant resources with instant prorated billing.
                </p>

                {catalogLoading ? (
                    <div className="flex justify-center py-8">
                        <Loader2 className="h-6 w-6 animate-spin text-teal-600" />
                    </div>
                ) : catalog.length === 0 ? (
                    <p className="text-xs text-slate-400 italic">No add-ons currently available in the catalog.</p>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {catalog.map((addon) => (
                            <div
                                key={addon.addon_id}
                                className="bg-white dark:bg-[#0c0e17] rounded-3xl p-5 border border-slate-200/80 dark:border-white/10 shadow-xs flex flex-col justify-between"
                            >
                                <div>
                                    <div className="flex justify-between items-start mb-3">
                                        <div className="p-2.5 rounded-2xl bg-teal-50 dark:bg-teal-500/10 border border-teal-100 dark:border-teal-500/20">
                                            {getAddonIcon(addon.resource_type || addon.addon_type)}
                                        </div>
                                        <span className="text-base font-black font-mono text-slate-900 dark:text-white">
                                            ${Number(addon.unit_price || addon.price || 0).toFixed(2)}
                                            <span className="text-[11px] text-slate-400 font-sans font-normal"> / mo</span>
                                        </span>
                                    </div>

                                    <div className="flex items-center gap-1.5 flex-wrap">
                                        <h5 className="text-sm font-bold text-slate-900 dark:text-white tracking-tight font-display">
                                            {addon.name}
                                        </h5>
                                        {addon.units_count > 1 && (
                                            <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-teal-50 dark:bg-teal-500/10 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-500/20 font-mono">
                                                {addon.units_count} Units
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-1 leading-relaxed min-h-[32px] font-sans">
                                        {addon.description || `Resource: ${addon.resource_type || 'addon'}`}
                                    </p>
                                </div>

                                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-white/5 flex items-center gap-2.5">
                                    <div className="w-20">
                                        <input
                                            type="number"
                                            min="1"
                                            max="50"
                                            value={getQuantity(addon.addon_id)}
                                            onChange={(e) => handleQuantityChange(addon.addon_id, e.target.value)}
                                            className="w-full text-center font-mono font-bold text-xs rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.03] py-2 text-slate-900 dark:text-white focus:ring-2 focus:ring-teal-500"
                                        />
                                    </div>

                                    <button
                                        type="button"
                                        onClick={() => handleGetQuote(addon)}
                                        disabled={quotingAddonId === addon.addon_id}
                                        className="flex-1 inline-flex justify-center items-center gap-1.5 rounded-xl bg-teal-600 hover:bg-teal-500 px-3 py-2 text-xs font-bold text-white shadow-xs transition-all cursor-pointer disabled:opacity-50"
                                    >
                                        {quotingAddonId === addon.addon_id ? (
                                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                        ) : (
                                            <Plus className="h-3.5 w-3.5" />
                                        )}
                                        Purchase
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <AddonPurchaseModal
                isOpen={addonModalOpen}
                onClose={() => setAddonModalOpen(false)}
                quote={quoteData}
                customerId={tenant?.id}
                onSuccess={handleRefreshAll}
            />
        </div>
    );
};

const CustomizeTab = ({ tenant, onUpdate }) => {
    const { addToast } = useToast();
    const [isEditing, setIsEditing] = useState(false);
    const [saving, setSaving] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    const getInitialData = () => {
        const cd = tenant?.customerDetails || {};
        return {
            customerType: cd.customerType || 'company',
            companyName: cd.companyName || tenant?.name || '',
            companyTaxId: cd.companyTaxId || '',
            firstName: cd.firstName || (tenant?.adminUser?.name ? tenant.adminUser.name.split(' ')[0] : ''),
            lastName: cd.lastName || (tenant?.adminUser?.name ? tenant.adminUser.name.split(' ').slice(1).join(' ') : ''),
            adminEmail: cd.adminEmail || tenant?.adminUser?.email || '',
            adminPassword: '',
            creditLimit: cd.creditLimit !== undefined ? cd.creditLimit : (tenant?.wallet?.creditLimit || 0),
            phone: cd.phone || '',
            country: cd.country || 'USA',
            address: cd.address || '',
            city: cd.city || '',
            state: cd.state || '',
        };
    };

    const [formData, setFormData] = useState(getInitialData);

    useEffect(() => {
        setFormData(getInitialData());
    }, [tenant]);

    const handleCancel = () => {
        setFormData(getInitialData());
        setIsEditing(false);
    };

    const handleChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleSave = async (e) => {
        if (e) e.preventDefault();
        setSaving(true);
        try {
            const payload = {
                customerType: formData.customerType,
                companyName: formData.customerType === 'company' ? (formData.companyName || tenant?.name) : undefined,
                companyTaxId: formData.customerType === 'company' ? formData.companyTaxId : undefined,
                firstName: formData.firstName,
                lastName: formData.lastName,
                adminEmail: formData.adminEmail,
                phone: formData.phone,
                address: formData.address,
                city: formData.city,
                state: formData.state,
                country: formData.country,
                creditLimit: Number(formData.creditLimit) || 0
            };

            if (formData.adminPassword && formData.adminPassword.trim().length > 0) {
                payload.adminPassword = formData.adminPassword.trim();
            }

            await api.patch(`/tenants/${tenant.id}/details`, payload);
            if (addToast) {
                addToast('success', 'Tenant details updated successfully');
            }
            setIsEditing(false);
            setFormData(prev => ({ ...prev, adminPassword: '' }));
            if (onUpdate) {
                onUpdate();
            }
        } catch (err) {
            console.error('Failed to update tenant details:', err);
            const msg = err.response?.data?.message || err.message || 'Failed to update tenant details';
            if (addToast) addToast('error', msg);
            else alert(msg);
        } finally {
            setSaving(false);
        }
    };

    const countryOptions = [
        { code: 'USA', label: 'United States (USA)' },
        { code: 'CAD', label: 'Canada (CAD)' },
        { code: 'IND', label: 'India (IND)' },
        { code: 'PAK', label: 'Pakistan (PAK)' },
        { code: 'PHI', label: 'Philippines (PHI)' },
        { code: 'BNG', label: 'Bangladesh (BNG)' },
        { code: 'OTHER', label: 'Other' },
    ];

    const getCountryLabel = (code) => {
        const found = countryOptions.find(c => c.code === code);
        return found ? found.label : code || 'N/A';
    };

    return (
        <div className="space-y-6 w-full">
            {/* Header with Top Right Corner Edit / Action Buttons */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-gray-100 gap-4">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <div className="p-2 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-600">
                            <Palette size={20} />
                        </div>
                        <h3 className="text-xl font-extrabold text-gray-900 tracking-tight">
                            Tenant Details & Customization
                        </h3>
                    </div>
                    <p className="text-sm font-medium text-gray-500">
                        View and customize organization identity, administrator profile, and billing limits.
                    </p>
                </div>

                {/* Top Right Corner Edit / Save Buttons */}
                <div className="flex items-center gap-2">
                    {!isEditing ? (
                        <button
                            type="button"
                            onClick={() => setIsEditing(true)}
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-md shadow-indigo-600/20 active:scale-95 transition-all"
                        >
                            <Edit3 size={15} /> Edit Details
                        </button>
                    ) : (
                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={handleCancel}
                                disabled={saving}
                                className="px-3.5 py-2 rounded-xl text-xs font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 transition-all disabled:opacity-50"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleSave}
                                disabled={saving}
                                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-md shadow-indigo-600/20 active:scale-95 transition-all disabled:opacity-50"
                            >
                                {saving ? (
                                    <>
                                        <Loader2 size={15} className="animate-spin" />
                                        Saving...
                                    </>
                                ) : (
                                    <>
                                        <Save size={15} />
                                        Save Changes
                                    </>
                                )}
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* 1. Tenant Type & Company Info Section */}
            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-5">
                <div className="flex items-center gap-2 pb-3 border-b border-gray-50">
                    <Building2 className="h-5 w-5 text-indigo-600" />
                    <div>
                        <h4 className="text-base font-extrabold text-gray-900 tracking-tight">
                            Tenant & Company Information
                        </h4>
                        <p className="text-xs font-medium text-gray-500">
                            Organization type, commercial name, and tax identification
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    {/* Tenant Type */}
                    <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5">
                            Tenant Type
                        </label>
                        {!isEditing ? (
                            <div className="mt-1">
                                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold ring-1 ring-inset uppercase tracking-wider ${formData.customerType === 'company'
                                        ? 'bg-blue-50 text-blue-700 ring-blue-600/20'
                                        : 'bg-emerald-50 text-emerald-700 ring-emerald-600/20'
                                    }`}>
                                    {formData.customerType === 'company' ? <Building2 size={13} /> : <User size={13} />}
                                    {formData.customerType === 'company' ? 'Company' : 'Individual'}
                                </span>
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 gap-2 bg-gray-100/80 p-1 rounded-xl">
                                <button
                                    type="button"
                                    onClick={() => handleChange('customerType', 'company')}
                                    className={`py-2 text-xs font-bold rounded-lg transition-all ${formData.customerType === 'company'
                                            ? 'bg-white text-indigo-700 shadow-sm'
                                            : 'text-gray-500 hover:text-gray-900'
                                        }`}
                                >
                                    Company
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleChange('customerType', 'individual')}
                                    className={`py-2 text-xs font-bold rounded-lg transition-all ${formData.customerType === 'individual'
                                            ? 'bg-white text-indigo-700 shadow-sm'
                                            : 'text-gray-500 hover:text-gray-900'
                                        }`}
                                >
                                    Individual
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Company Name */}
                    {formData.customerType === 'company' && (
                        <div>
                            <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5">
                                Company Name
                            </label>
                            {!isEditing ? (
                                <p className="text-sm font-semibold text-gray-900 mt-1">
                                    {formData.companyName || tenant?.name || 'N/A'}
                                </p>
                            ) : (
                                <input
                                    type="text"
                                    value={formData.companyName}
                                    onChange={(e) => handleChange('companyName', e.target.value)}
                                    placeholder="e.g. Acme Corporation Inc"
                                    className="block w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm font-semibold text-gray-900 shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 bg-gray-50/50 hover:bg-white transition-all"
                                />
                            )}
                        </div>
                    )}

                    {/* Company Tax ID */}
                    {formData.customerType === 'company' && (
                        <div>
                            <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5">
                                Company Tax ID
                            </label>
                            {!isEditing ? (
                                <p className="text-sm font-mono font-medium text-gray-900 mt-1">
                                    {formData.companyTaxId || <span className="text-gray-400 font-sans italic">Not provided</span>}
                                </p>
                            ) : (
                                <input
                                    type="text"
                                    value={formData.companyTaxId}
                                    onChange={(e) => handleChange('companyTaxId', e.target.value)}
                                    placeholder="e.g. TAX-998822"
                                    className="block w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm font-mono font-medium text-gray-900 shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 bg-gray-50/50 hover:bg-white transition-all"
                                />
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* 2. Personal Details Section */}
            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-5">
                <div className="flex items-center gap-2 pb-3 border-b border-gray-50">
                    <User className="h-5 w-5 text-indigo-600" />
                    <div>
                        <h4 className="text-base font-extrabold text-gray-900 tracking-tight">
                            Personal Details
                        </h4>
                        <p className="text-xs font-medium text-gray-500">
                            Primary administrator identity, contact email, and credentials
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    {/* First Name */}
                    <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5">
                            First Name
                        </label>
                        {!isEditing ? (
                            <p className="text-sm font-medium text-gray-900 mt-1">
                                {formData.firstName || 'N/A'}
                            </p>
                        ) : (
                            <input
                                type="text"
                                value={formData.firstName}
                                onChange={(e) => handleChange('firstName', e.target.value)}
                                placeholder="First Name"
                                className="block w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm font-medium text-gray-900 shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 bg-gray-50/50 hover:bg-white transition-all"
                            />
                        )}
                    </div>

                    {/* Last Name */}
                    <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5">
                            Last Name
                        </label>
                        {!isEditing ? (
                            <p className="text-sm font-medium text-gray-900 mt-1">
                                {formData.lastName || 'N/A'}
                            </p>
                        ) : (
                            <input
                                type="text"
                                value={formData.lastName}
                                onChange={(e) => handleChange('lastName', e.target.value)}
                                placeholder="Last Name"
                                className="block w-full rounded-xl border border-gray-200 px-3.5 py-2.5 text-sm font-medium text-gray-900 shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 bg-gray-50/50 hover:bg-white transition-all"
                            />
                        )}
                    </div>

                    {/* Email */}
                    <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5">
                            Email
                        </label>
                        {!isEditing ? (
                            <div className="flex items-center gap-1.5 mt-1 text-sm font-medium text-gray-900">
                                <Mail size={15} className="text-gray-400" />
                                {formData.adminEmail || 'N/A'}
                            </div>
                        ) : (
                            <div className="relative rounded-xl shadow-sm">
                                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-gray-400">
                                    <Mail size={16} />
                                </div>
                                <input
                                    type="email"
                                    value={formData.adminEmail}
                                    onChange={(e) => handleChange('adminEmail', e.target.value)}
                                    placeholder="admin@example.com"
                                    className="block w-full pl-10 rounded-xl border border-gray-200 py-2.5 text-sm font-medium text-gray-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 bg-gray-50/50 hover:bg-white transition-all"
                                />
                            </div>
                        )}
                    </div>

                    {/* Password */}
                    <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5">
                            Password
                        </label>
                        {!isEditing ? (
                            <div className="flex items-center gap-1.5 mt-1 text-sm font-mono text-gray-500">
                                <Lock size={15} className="text-gray-400" />
                                ••••••••••••
                            </div>
                        ) : (
                            <div className="relative rounded-xl shadow-sm">
                                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-gray-400">
                                    <Lock size={16} />
                                </div>
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    value={formData.adminPassword}
                                    onChange={(e) => handleChange('adminPassword', e.target.value)}
                                    placeholder="Leave blank to keep unchanged"
                                    className="block w-full pl-10 pr-10 rounded-xl border border-gray-200 py-2.5 text-sm font-medium text-gray-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 bg-gray-50/50 hover:bg-white transition-all"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600"
                                >
                                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* 3. Billing & Limits Section */}
            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-5">
                <div className="flex items-center gap-2 pb-3 border-b border-gray-50">
                    <CreditCard className="h-5 w-5 text-indigo-600" />
                    <div>
                        <h4 className="text-base font-extrabold text-gray-900 tracking-tight">
                            Billing & Limits
                        </h4>
                        <p className="text-xs font-medium text-gray-500">
                            Credit limits, telephone contact, country, and registered address
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    {/* Credit Limit */}
                    <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5">
                            Credit Limit
                        </label>
                        {!isEditing ? (
                            <p className="text-lg font-mono font-extrabold text-gray-900 mt-1">
                                ${Number(formData.creditLimit || 0).toFixed(2)}
                            </p>
                        ) : (
                            <div className="relative rounded-xl shadow-sm">
                                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-gray-400 font-bold sm:text-sm">
                                    $
                                </div>
                                <input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={formData.creditLimit}
                                    onChange={(e) => handleChange('creditLimit', e.target.value)}
                                    placeholder="0.00"
                                    className="block w-full pl-8 rounded-xl border border-gray-200 py-2.5 text-sm font-mono font-bold text-gray-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 bg-gray-50/50 hover:bg-white transition-all"
                                />
                            </div>
                        )}
                    </div>

                    {/* Phone */}
                    <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5">
                            Phone
                        </label>
                        {!isEditing ? (
                            <div className="flex items-center gap-1.5 mt-1 text-sm font-medium text-gray-900">
                                <Phone size={15} className="text-gray-400" />
                                {formData.phone || <span className="text-gray-400 font-sans italic">Not provided</span>}
                            </div>
                        ) : (
                            <div className="relative rounded-xl shadow-sm">
                                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-gray-400">
                                    <Phone size={16} />
                                </div>
                                <input
                                    type="text"
                                    value={formData.phone}
                                    onChange={(e) => handleChange('phone', e.target.value)}
                                    placeholder="+1 234 567 890"
                                    className="block w-full pl-10 rounded-xl border border-gray-200 py-2.5 text-sm font-medium text-gray-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 bg-gray-50/50 hover:bg-white transition-all"
                                />
                            </div>
                        )}
                    </div>

                    {/* Country */}
                    <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5">
                            Country
                        </label>
                        {!isEditing ? (
                            <div className="flex items-center gap-1.5 mt-1 text-sm font-medium text-gray-900">
                                <Globe size={15} className="text-gray-400" />
                                {getCountryLabel(formData.country)}
                            </div>
                        ) : (
                            <div className="relative rounded-xl shadow-sm">
                                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-gray-400">
                                    <Globe size={16} />
                                </div>
                                <select
                                    value={formData.country}
                                    onChange={(e) => handleChange('country', e.target.value)}
                                    className="block w-full pl-10 rounded-xl border border-gray-200 py-2.5 pr-8 text-sm font-semibold text-gray-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 bg-gray-50/50 hover:bg-white transition-all"
                                >
                                    {countryOptions.map(c => (
                                        <option key={c.code} value={c.code}>{c.label}</option>
                                    ))}
                                </select>
                            </div>
                        )}
                    </div>

                    {/* Address */}
                    <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5">
                            Address
                        </label>
                        {!isEditing ? (
                            <div className="flex items-start gap-1.5 mt-1 text-sm font-medium text-gray-900">
                                <MapPin size={15} className="text-gray-400 mt-0.5 shrink-0" />
                                <span>
                                    {[formData.address, formData.city, formData.state].filter(Boolean).join(', ') || <span className="text-gray-400 italic">Not provided</span>}
                                </span>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                <input
                                    type="text"
                                    value={formData.address}
                                    onChange={(e) => handleChange('address', e.target.value)}
                                    placeholder="Street Address (e.g. 123 Business Way, Suite 400)"
                                    className="block w-full rounded-xl border border-gray-200 px-3.5 py-2 text-sm font-medium text-gray-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 bg-gray-50/50 hover:bg-white transition-all"
                                />
                                <div className="grid grid-cols-2 gap-2">
                                    <input
                                        type="text"
                                        value={formData.city}
                                        onChange={(e) => handleChange('city', e.target.value)}
                                        placeholder="City"
                                        className="block w-full rounded-xl border border-gray-200 px-3.5 py-2 text-sm font-medium text-gray-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 bg-gray-50/50 hover:bg-white transition-all"
                                    />
                                    <input
                                        type="text"
                                        value={formData.state}
                                        onChange={(e) => handleChange('state', e.target.value)}
                                        placeholder="State / Province"
                                        className="block w-full rounded-xl border border-gray-200 px-3.5 py-2 text-sm font-medium text-gray-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 bg-gray-50/50 hover:bg-white transition-all"
                                    />
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TenantManager;
