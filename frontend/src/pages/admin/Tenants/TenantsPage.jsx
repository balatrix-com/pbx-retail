import React, { useState, useEffect } from 'react';
import api from '../../../services/api';
import {
    Building2,
    Plus,
    Search,
    Trash2,
    Ban,
    CheckCircle2,
    LayoutGrid,
    List,
    RefreshCw,
    BarChart3,
    Users,
    Wallet,
    Calendar,
    ChevronRight,
    SlidersHorizontal,
    Activity,
    ShieldAlert,
    ExternalLink
} from 'lucide-react';
import TenantWizard from './TenantWizard';
import TenantManager from './TenantManager';
import Pagination from '../../../components/common/Pagination';
import CreativeStatCard from '../../../components/common/CreativeStatCard';
import { useAuth } from '../../../context/AuthContext';
import { clsx } from 'clsx';
import { formatCustomerId } from '../../../utils/billing.utils';

const TenantsPage = () => {
    const { isSuperAdmin } = useAuth();
    const [tenants, setTenants] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [selectedTenantId, setSelectedTenantId] = useState(null);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'table'
    const [actionBusy, setActionBusy] = useState(null);
    const [actionError, setActionError] = useState('');
    const [pagination, setPagination] = useState({
        page: 1,
        limit: 10,
        total: 0,
        totalPages: 1
    });
    const [stats, setStats] = useState({
        totalTenants: 0,
        totalUsers: 0,
        totalWalletBalance: 0
    });

    useEffect(() => {
        fetchTenants();
    }, [pagination.page, pagination.limit, search, statusFilter]);

    useEffect(() => {
        if (!tenants.some(t => t.archiveJob && t.archiveJob.state !== 'ARCHIVED')) return;
        const timer = setInterval(fetchTenants, 5000);
        return () => clearInterval(timer);
    }, [tenants]);

    const fetchTenants = async () => {
        try {
            setLoading(true);
            const params = new URLSearchParams({
                page: pagination.page.toString(),
                limit: pagination.limit.toString(),
                ...(search && { search }),
                ...(statusFilter && { status: statusFilter })
            });
            const res = await api.get(`/tenants?${params}`);
            setTenants(res.data.data || []);
            setPagination(prev => ({
                ...prev,
                total: res.data.pagination?.total || 0,
                totalPages: res.data.pagination?.totalPages || 1
            }));

            // Also fetch stats
            const statsRes = await api.get('/tenants/stats');
            setStats(statsRes.data);
        } catch (error) {
            console.error('Failed to fetch tenants or stats:', error);
        } finally {
            setLoading(false);
        }
    };

    const handlePageChange = (newPage) => {
        setPagination(prev => ({ ...prev, page: newPage }));
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Archive this customer permanently? Calling and portal access will stop, SIP credentials and routing will be removed, and subscriptions will be cancelled. Numbers will remain held until you explicitly confirm release. Customer IDs, CDRs, invoices and payment history are preserved. This cannot be undone.')) return;
        setActionBusy(id);
        setActionError('');
        try {
            await api.delete(`/tenants/${id}`);
            fetchTenants();
        } catch (error) {
            console.error('Failed to delete tenant', error);
            setActionError(error.response?.data?.message || 'Archive request failed. Check the status and retry.');
            fetchTenants();
        } finally {
            setActionBusy(null);
        }
    };

    const handleRetryArchive = async (id) => {
        setActionBusy(id);
        setActionError('');
        try {
            await api.post(`/tenants/${id}/archive/retry`);
            await fetchTenants();
        } catch (error) {
            setActionError(error.response?.data?.message || 'Archive retry failed');
        } finally {
            setActionBusy(null);
        }
    };

    const handleReleaseNumbers = async (id) => {
        if (!window.confirm('Confirm the carrier has approved number release. This will make held TFNs available and remove held DID assignments so those numbers can be reassigned.')) return;
        const reason = window.prompt('Enter the carrier approval/reference or release reason:');
        if (!reason?.trim()) return;
        setActionBusy(id);
        setActionError('');
        try {
            await api.post(`/tenants/${id}/archive/release-numbers`, { provider_confirmed: true, reason });
            await fetchTenants();
        } catch (error) {
            setActionError(error.response?.data?.message || 'Number release failed');
        } finally {
            setActionBusy(null);
        }
    };

    const handleToggleBlock = async (id, currentBlocked) => {
        try {
            await api.patch(`/tenants/${id}/block`, { blocked: !currentBlocked });
            fetchTenants();
        } catch (error) {
            console.error('Failed to toggle tenant block', error);
            setActionError(error.response?.data?.message || 'Service-state update failed');
            fetchTenants();
        }
    };

    if (!isSuperAdmin) return <div className="p-8 font-bold text-red-500">Access Denied</div>;

    const statusPill = (tenant) => {
        if (tenant.status === 'ARCHIVED') {
            return (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 ring-1 ring-inset ring-slate-500/20">
                    <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
                    Archived
                </span>
            );
        }
        if (tenant.archiveJob) {
            return (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 ring-1 ring-inset ring-amber-600/20">
                    <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
                    {tenant.archiveJob.state.replaceAll('_', ' ')}
                </span>
            );
        }
        if (tenant.serviceBlocked) {
            return (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-400 ring-1 ring-inset ring-red-600/20">
                    <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
                    Blocked
                </span>
            );
        }
        return (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 ring-1 ring-inset ring-emerald-600/20">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                Active
            </span>
        );
    };

    return (
        <div className="w-full pb-16 space-y-7 animate-in fade-in duration-300 max-w-7xl mx-auto">
            {/* Top Header Banner */}
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-teal-700 via-teal-600 to-emerald-600 p-8 text-white shadow-xl shadow-teal-900/15">
                <div className="absolute top-0 right-0 -mt-10 -mr-10 w-80 h-80 rounded-full bg-white/10 blur-2xl pointer-events-none" />
                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="space-y-1.5 max-w-2xl">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 backdrop-blur-md text-xs font-semibold tracking-wide border border-white/20">
                            <Building2 size={14} className="text-teal-200" />
                            <span>Enterprise Organizations & Multi-Tenant Directory</span>
                        </div>
                        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                            Tenant Directory & Organizations
                        </h1>
                        <p className="text-teal-100 text-xs sm:text-sm font-medium">
                            Manage client organizations, provisioning states, assigned extensions, wallet float reserves, and tenant lifecycles.
                        </p>
                    </div>

                    <div className="flex items-center gap-3">
                        <button
                            onClick={fetchTenants}
                            className="p-3 rounded-2xl bg-white/15 hover:bg-white/25 border border-white/20 text-white transition-all active:scale-95 shadow-sm cursor-pointer"
                            title="Refresh"
                        >
                            <RefreshCw className={clsx("h-4 w-4", loading && "animate-spin text-teal-200")} />
                        </button>
                        <button
                            onClick={() => setShowCreateModal(true)}
                            className="inline-flex items-center justify-center gap-2 bg-white hover:bg-teal-50 text-teal-800 px-5 py-3 rounded-2xl font-bold text-xs shadow-lg shadow-black/10 transition-all active:scale-95 cursor-pointer"
                        >
                            <Plus size={16} className="text-teal-700" />
                            <span>New Tenant</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* KPI Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                <CreativeStatCard
                    title="Total Organizations"
                    value={pagination.total}
                    subtitle="Managed tenant accounts"
                    icon={Building2}
                    color="blue"
                    trend="+12%"
                    trendUp={true}
                />
                <CreativeStatCard
                    title="Platform Users"
                    value={stats.totalUsers || 0}
                    subtitle="Tenant admins & operators"
                    icon={Users}
                    color="purple"
                    trend="+8%"
                    trendUp={true}
                />
                <CreativeStatCard
                    title="Total Float Balance"
                    value={`$${parseFloat(stats.totalWalletBalance || 0).toFixed(2)}`}
                    subtitle="Combined tenant float reserves"
                    icon={Wallet}
                    color="emerald"
                    trend="+10%"
                    trendUp={true}
                />
            </div>

            {/* Controls Bar: Search, Status Filter, View Toggle */}
            <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-white/95 dark:bg-slate-900/95 p-3 rounded-2xl border border-teal-200/70 dark:border-white/10 shadow-sm backdrop-blur-sm">
                {/* Search */}
                <div className="relative flex-1 min-w-0">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-teal-600/70 dark:text-teal-400" />
                    <input
                        type="search"
                        id="tenant_search_filter"
                        name="tenant_search_filter"
                        autoComplete="off"
                        spellCheck="false"
                        placeholder="Search by company name, customer code, or tenant ID..."
                        className="w-full pl-10 pr-4 py-2.5 text-xs sm:text-sm rounded-xl border border-teal-200/80 dark:border-white/10 bg-teal-50/30 dark:bg-slate-800/50 text-slate-800 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 font-semibold transition-all"
                        value={search}
                        onChange={(e) => { setSearch(e.target.value); setPagination(p => ({ ...p, page: 1 })); }}
                    />
                </div>

                <div className="flex items-center gap-2 shrink-0">
                    {/* Status Filter */}
                    <div className="relative">
                        <select
                            className="appearance-none pl-3.5 pr-8 py-2.5 text-xs font-bold rounded-xl border border-teal-200/80 dark:border-white/10 bg-teal-50/30 dark:bg-slate-800/50 text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500 cursor-pointer"
                            value={statusFilter}
                            onChange={e => { setStatusFilter(e.target.value); setPagination(p => ({ ...p, page: 1 })); }}
                        >
                            <option value="">Current Customers</option>
                            <option value="ACTIVE">Active Only</option>
                            <option value="SUSPENDED">Blocked / Archiving</option>
                            <option value="ARCHIVED">Archived</option>
                            <option value="ALL">All Statuses</option>
                        </select>
                        <SlidersHorizontal className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-teal-600/70 dark:text-teal-400 pointer-events-none" />
                    </div>

                    {/* View Switcher */}
                    <div className="flex items-center p-1 rounded-xl border border-teal-200/80 dark:border-white/10 bg-teal-50/40 dark:bg-slate-800/50">
                        <button
                            type="button"
                            onClick={() => setViewMode('grid')}
                            className={clsx(
                                "p-1.5 rounded-lg transition-all",
                                viewMode === 'grid'
                                    ? "bg-white dark:bg-slate-700 text-teal-700 dark:text-white shadow-xs font-bold"
                                    : "text-slate-400 hover:text-slate-700 dark:hover:text-white"
                            )}
                            title="Grid View"
                        >
                            <LayoutGrid className="h-4 w-4" />
                        </button>
                        <button
                            type="button"
                            onClick={() => setViewMode('table')}
                            className={clsx(
                                "p-1.5 rounded-lg transition-all",
                                viewMode === 'table'
                                    ? "bg-white dark:bg-slate-700 text-teal-700 dark:text-white shadow-xs font-bold"
                                    : "text-slate-400 hover:text-slate-700 dark:hover:text-white"
                            )}
                            title="Table View"
                        >
                            <List className="h-4 w-4" />
                        </button>
                    </div>
                </div>
            </div>

            {actionError && (
                <div role="alert" className="p-3.5 rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/40 text-red-700 dark:text-red-300 text-sm flex items-center gap-2">
                    <ShieldAlert className="h-4 w-4 shrink-0 text-red-500" />
                    <span>{actionError}</span>
                </div>
            )}

            {/* Tenant Listing Content: Grid vs Table */}
            {loading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {Array.from({ length: 6 }).map((_, i) => (
                        <div key={i} className="animate-pulse bg-white dark:bg-[#0c0d12] rounded-2xl p-5 border border-gray-200/80 dark:border-white/10 space-y-4">
                            <div className="h-5 bg-gray-100 dark:bg-white/5 rounded-lg w-3/4"></div>
                            <div className="h-4 bg-gray-100 dark:bg-white/5 rounded-lg w-1/2"></div>
                            <div className="h-10 bg-gray-100 dark:bg-white/5 rounded-xl"></div>
                        </div>
                    ))}
                </div>
            ) : tenants.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-12 bg-white dark:bg-[#0c0d12] rounded-3xl border border-gray-200/80 dark:border-white/10 text-center">
                    <div className="p-4 rounded-full bg-gray-50 dark:bg-white/5 text-gray-400 mb-3">
                        <Building2 className="h-8 w-8" />
                    </div>
                    <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">No organizations found</h3>
                    <p className="text-sm text-slate-400 mt-1 max-w-sm">No tenants matched your query or filter criteria.</p>
                </div>
            ) : viewMode === 'grid' ? (
                /* Card / Grid View */
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {tenants.map(tenant => (
                        <div
                            key={tenant.id}
                            className="group bg-white dark:bg-[#0c0d12] rounded-2xl p-5 border border-gray-200/80 dark:border-white/10 hover:border-primary-300 dark:hover:border-primary-500/40 hover:shadow-lg hover:shadow-primary-600/5 transition-all flex flex-col justify-between space-y-4 relative"
                        >
                            {/* Card Header */}
                            <div>
                                <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0 flex-1">
                                        <h3 className="text-base font-bold text-slate-900 dark:text-white truncate group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
                                            {tenant.name}
                                        </h3>
                                        <div className="flex items-center gap-2 mt-1">
                                            <span className="text-[11px] font-mono font-bold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-white/5 px-2 py-0.5 rounded-md">
                                                {formatCustomerId(tenant.id)}
                                            </span>
                                            {tenant.customerCode && (
                                                <span className="text-[10px] font-mono text-slate-400 truncate">
                                                    {tenant.customerCode}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <div className="shrink-0">
                                        {statusPill(tenant)}
                                    </div>
                                </div>
                                {tenant.archiveJob?.last_error && (
                                    <p className="text-xs text-red-600 dark:text-red-400 mt-2 line-clamp-2 bg-red-50 dark:bg-red-950/30 p-2 rounded-lg">
                                        {tenant.archiveJob.last_error}
                                    </p>
                                )}
                            </div>

                            {/* Card Metrics Grid */}
                            <div className="grid grid-cols-2 gap-2 py-3 border-y border-gray-100 dark:border-white/5">
                                <div className="flex items-center gap-2 text-xs">
                                    <Users className="h-4 w-4 text-slate-400 shrink-0" />
                                    <div>
                                        <span className="text-slate-400 block text-[10px]">Users</span>
                                        <span className="font-bold text-slate-700 dark:text-slate-200">
                                            {tenant._count?.users || 0}
                                        </span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 text-xs">
                                    <Wallet className="h-4 w-4 text-slate-400 shrink-0" />
                                    <div>
                                        <span className="text-slate-400 block text-[10px]">Wallet Float</span>
                                        <span className="font-bold text-slate-700 dark:text-slate-200 truncate">
                                            ${parseFloat(tenant.wallet?.balance || 0).toFixed(2)}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Card Footer Actions */}
                            <div className="flex items-center justify-between gap-2 pt-1">
                                <span className="text-[11px] text-slate-400 flex items-center gap-1 font-medium">
                                    <Calendar className="h-3 w-3" />
                                    {new Date(tenant.createdAt).toLocaleDateString()}
                                </span>

                                <div className="flex items-center gap-1">
                                    {/* Action Buttons */}
                                    <button
                                        onClick={() => handleToggleBlock(tenant.id, tenant.serviceBlocked)}
                                        disabled={Boolean(tenant.archiveJob) || tenant.status === 'ARCHIVED' || actionBusy === tenant.id}
                                        className={clsx(
                                            "p-1.5 rounded-lg transition-colors",
                                            tenant.serviceBlocked
                                                ? "text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
                                                : "text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/30"
                                        )}
                                        title={tenant.serviceBlocked ? "Unblock customer" : "Block customer"}
                                    >
                                        {tenant.serviceBlocked ? <CheckCircle2 size={16} /> : <Ban size={16} />}
                                    </button>

                                    <button
                                        onClick={() => handleDelete(tenant.id)}
                                        disabled={Boolean(tenant.archiveJob) || tenant.status === 'ARCHIVED' || actionBusy === tenant.id}
                                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition-colors"
                                        title="Archive tenant permanently"
                                    >
                                        <Trash2 size={16} />
                                    </button>

                                    {tenant.archiveJob?.state === 'ARCHIVE_FAILED' && (
                                        <button
                                            disabled={actionBusy === tenant.id}
                                            onClick={() => handleRetryArchive(tenant.id)}
                                            className="px-2 py-1 text-xs rounded-lg text-amber-700 bg-amber-50 dark:bg-amber-950/40 font-bold"
                                        >
                                            Retry
                                        </button>
                                    )}

                                    {tenant.status === 'ARCHIVED' && (
                                        <button
                                            disabled={actionBusy === tenant.id}
                                            onClick={() => handleReleaseNumbers(tenant.id)}
                                            className="px-2 py-1 text-xs rounded-lg text-primary-700 bg-primary-50 dark:bg-purple-950/40 font-bold"
                                        >
                                            Release
                                        </button>
                                    )}

                                    <button
                                        onClick={() => setSelectedTenantId(tenant.id)}
                                        className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-bold rounded-xl bg-primary-50 dark:bg-purple-950/40 text-primary-700 dark:text-[#c084fc] hover:bg-primary-100 dark:hover:bg-purple-900/60 transition-all active:scale-95 ml-1"
                                    >
                                        <span>Manage</span>
                                        <ChevronRight className="h-3.5 w-3.5" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                /* Compact Table View */
                <div className="bg-white dark:bg-[#0c0d12] rounded-2xl border border-gray-200/80 dark:border-white/10 shadow-xs overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-gray-100 dark:border-white/10 bg-gray-50/50 dark:bg-white/5 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                    <th className="py-3 px-4">Organization & ID</th>
                                    <th className="py-3 px-4">Status</th>
                                    <th className="py-3 px-4 text-center">Users</th>
                                    <th className="py-3 px-4">Wallet Float</th>
                                    <th className="py-3 px-4">Joined</th>
                                    <th className="py-3 px-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-white/5 text-sm font-medium">
                                {tenants.map(tenant => (
                                    <tr key={tenant.id} className="hover:bg-slate-50/80 dark:hover:bg-white/5 transition-colors group">
                                        <td className="py-3 px-4">
                                            <div className="font-bold text-slate-900 dark:text-white group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
                                                {tenant.name}
                                            </div>
                                            <div className="text-[11px] font-mono text-slate-400">
                                                {formatCustomerId(tenant.id)}
                                            </div>
                                        </td>
                                        <td className="py-3 px-4 whitespace-nowrap">
                                            {statusPill(tenant)}
                                        </td>
                                        <td className="py-3 px-4 text-center">
                                            <span className="inline-flex px-2 py-0.5 rounded-md bg-slate-100 dark:bg-white/5 text-xs font-bold text-slate-700 dark:text-slate-300">
                                                {tenant._count?.users || 0}
                                            </span>
                                        </td>
                                        <td className="py-3 px-4 whitespace-nowrap font-bold text-slate-700 dark:text-slate-200">
                                            ${parseFloat(tenant.wallet?.balance || 0).toFixed(2)}
                                        </td>
                                        <td className="py-3 px-4 whitespace-nowrap text-xs text-slate-400">
                                            {new Date(tenant.createdAt).toLocaleDateString()}
                                        </td>
                                        <td className="py-3 px-4 whitespace-nowrap text-right">
                                            <div className="flex items-center justify-end gap-1.5">
                                                <button
                                                    onClick={() => handleToggleBlock(tenant.id, tenant.serviceBlocked)}
                                                    disabled={Boolean(tenant.archiveJob) || tenant.status === 'ARCHIVED' || actionBusy === tenant.id}
                                                    className={clsx(
                                                        "p-1.5 rounded-lg transition-colors",
                                                        tenant.serviceBlocked
                                                            ? "text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
                                                            : "text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/30"
                                                    )}
                                                    title={tenant.serviceBlocked ? "Unblock customer" : "Block customer"}
                                                >
                                                    {tenant.serviceBlocked ? <CheckCircle2 size={16} /> : <Ban size={16} />}
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(tenant.id)}
                                                    disabled={Boolean(tenant.archiveJob) || tenant.status === 'ARCHIVED' || actionBusy === tenant.id}
                                                    className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition-colors"
                                                    title="Archive tenant permanently"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                                <button
                                                    onClick={() => setSelectedTenantId(tenant.id)}
                                                    className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-bold rounded-xl bg-primary-50 dark:bg-purple-950/40 text-primary-700 dark:text-[#c084fc] hover:bg-primary-100 dark:hover:bg-purple-900/60 transition-all active:scale-95 ml-1"
                                                >
                                                    <span>Configure</span>
                                                    <ChevronRight className="h-3.5 w-3.5" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Pagination Controls */}
            <div className="bg-white dark:bg-[#0c0d12] rounded-2xl border border-gray-200/80 dark:border-white/10 shadow-xs overflow-hidden">
                <Pagination
                    pagination={pagination}
                    onPageChange={handlePageChange}
                    onLimitChange={(newLimit) => setPagination(prev => ({ ...prev, limit: newLimit, page: 1 }))}
                    itemName="tenants"
                />
            </div>

            {/* Modals */}
            {showCreateModal && (
                <TenantWizard
                    onClose={() => setShowCreateModal(false)}
                    onSuccess={() => {
                        setShowCreateModal(false);
                        fetchTenants();
                    }}
                />
            )}

            {selectedTenantId && (
                <TenantManager
                    tenantId={selectedTenantId}
                    onClose={() => setSelectedTenantId(null)}
                />
            )}
        </div>
    );
};

export default TenantsPage;
