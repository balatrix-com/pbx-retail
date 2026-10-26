import React, { useState, useEffect } from 'react';
import {
    Users,
    Building2,
    Database,
    RefreshCcw,
    ArrowUpRight,
    Wallet,
    Phone,
    PhoneCall,
    Clock,
    BarChart3,
    LayoutDashboard,
    CreditCard,
    Activity,
    Search,
    Shield,
    Ban,
    CheckCircle,
    Eye,
    Settings,
    AlertTriangle,
    Headphones,
    ArrowRight
} from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../../services/api';
import { GrowthChart, RevenueChart } from './AnalyticsCharts';
import TenantDetailModal from './TenantDetailModal';
import TenantManager from '../admin/Tenants/TenantManager';

const PlatformDashboard = () => {
    const [stats, setStats] = useState({
        totalTenants: 0,
        totalUsers: 0,
        totalWalletBalance: 0,
        telecom: {
            totalDIDs: 0,
            totalTFNs: 0,
            totalExtensions: 0,
            availableExtensions: 0,
            limitExtensions: 500,
            totalRingGroups: 0,
            totalIVRs: 0,
            totalSchedules: 0,
            activeTenants: 0,
            monthlyRevenue: 0
        }
    });
    const [tenants, setTenants] = useState([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [search, setSearch] = useState('');
    const [totalPages, setTotalPages] = useState(1);
    const [syncing, setSyncing] = useState(false);

    useEffect(() => {
        fetchStats();
        fetchTenants();
    }, [page, search]); // Re-fetch when page or search changes

    const fetchStats = async () => {
        try {
            // Try new admin endpoint first (has telecom stats)
            try {
                const res = await api.get('/admin/platform/stats');
                setStats({
                    totalTenants: res.data.tenants.total,
                    totalUsers: res.data.users.total,
                    totalWalletBalance: res.data.wallet.totalBalance,
                    telecom: res.data.telecom
                });
            } catch (adminError) {
                // Fall back to tenant stats endpoint (doesn't have telecom)
                const res = await api.get('/tenants/stats');
                setStats({
                    ...res.data,
                    telecom: {
                        totalDIDs: 0,
                        totalTFNs: 0,
                        totalExtensions: res.data.totalExtensions || 0,
                        availableExtensions: res.data.availableExtensions || 0,
                        limitExtensions: res.data.limitExtensions || 500,
                        totalRingGroups: 0,
                        totalIVRs: 0,
                        totalSchedules: 0,
                        activeTenants: 0,
                        monthlyRevenue: 0
                    }
                });
            }
        } catch (error) {
            console.error('Failed to fetch stats', error);
        }
    };

    const fetchTenants = async () => {
        try {
            setLoading(true);
            const res = await api.get('/tenants', {
                params: { page, limit: 10, search }
            });
            setTenants(res.data.data);
            setTotalPages(res.data.pagination.totalPages);
        } catch (error) {
            console.error('Failed to fetch tenants', error);
        } finally {
            setLoading(false);
        }
    };

    const handleBlockToggle = async (tenantId, currentStatus) => {
        if (!window.confirm(`Are you sure you want to ${currentStatus ? 'unblock' : 'block'} this tenant?`)) return;

        try {
            await api.patch(`/tenants/${tenantId}/block`, { blocked: !currentStatus });
            fetchTenants(); // Refresh list
        } catch (error) {
            alert('Failed to update tenant status');
        }
    };

    const [selectedTenant, setSelectedTenant] = useState(null);
    const [actionModal, setActionModal] = useState(null); // 'wallet'
    const [showDetailModal, setShowDetailModal] = useState(false);

    const handleWalletAdjust = async (amount, type, description) => {
        try {
            await api.post('/wallet/internal-adjust', {
                targetTenantId: selectedTenant.id,
                amount: parseFloat(amount),
                type,
                description
            });
            alert('Wallet adjusted successfully');
            setActionModal(null);
            fetchTenants(); // Refresh balance
        } catch (error) {
            alert(error.response?.data?.message || 'Failed to adjust wallet');
        }
    };

    return (
        <div className="max-w-7xl mx-auto pb-12 space-y-8 px-4 sm:px-0">
            <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
                <div>
                    <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">Platform Command Center</h1>
                    <p className="text-slate-500 dark:text-slate-400 mt-1 font-medium text-sm md:text-base">Overview of all organizations and system health</p>
                </div>
                <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
                    <Link
                        to="/analytics"
                        className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold shadow-sm bg-purple-600/90 hover:bg-purple-600 text-white dark:bg-[#a855f7]/90 dark:hover:bg-[#a855f7] transition-all active:scale-95 w-full sm:w-auto"
                    >
                        <BarChart3 className="h-4 w-4" />
                        Global analytics
                    </Link>
                </div>
            </header>

            {/* Top Metric Cards: Revenue Highlight (Left) + 4 Stat Tiles Grid (Right) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
                {/* Left Large Card: Monthly telecom revenue */}
                <div className="platform-card-blue lg:col-span-6 rounded-2xl p-6 sm:p-7 flex flex-col justify-between">
                    <div>
                        <div className="flex items-center gap-2 text-blue-600 dark:text-blue-300 text-xs sm:text-sm font-medium">
                            <CreditCard className="h-4 w-4" />
                            <span>Monthly telecom revenue</span>
                        </div>
                        <div className="mt-4 text-4xl sm:text-5xl lg:text-6xl font-extrabold text-blue-700 dark:text-blue-300 tracking-tight">
                            ${Number(stats.telecom.monthlyRevenue || 0).toFixed(2)}
                        </div>
                    </div>
                    <p className="mt-4 text-xs sm:text-sm text-blue-700/80 dark:text-blue-200/80 font-medium">
                        from {stats.telecom.activeTenants || 0} active telecom tenants
                    </p>
                </div>

                {/* Right 2x2 Tiles Grid - Unified Standard Format */}
                <div className="lg:col-span-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Tenants */}
                    <div className="platform-panel-dark rounded-2xl p-4 sm:p-5 flex flex-col justify-between">
                        <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-xs sm:text-sm font-medium">
                            <Building2 className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                            <span>Tenants</span>
                        </div>
                        <div className="mt-3 text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white">
                            {stats.totalTenants}
                        </div>
                    </div>

                    {/* Users */}
                    <div className="platform-panel-dark rounded-2xl p-4 sm:p-5 flex flex-col justify-between">
                        <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-xs sm:text-sm font-medium">
                            <Users className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                            <span>Users</span>
                        </div>
                        <div className="mt-3 text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white">
                            {stats.totalUsers}
                        </div>
                    </div>

                    {/* Wallet float */}
                    <div className="platform-panel-dark rounded-2xl p-4 sm:p-5 flex flex-col justify-between">
                        <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-xs sm:text-sm font-medium">
                            <Wallet className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                            <span>Wallet float</span>
                        </div>
                        <div className="mt-3 text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white">
                            ${Number(stats.totalWalletBalance || 0).toFixed(2)}
                        </div>
                    </div>

                    {/* Active telecom */}
                    <div className="platform-panel-dark rounded-2xl p-4 sm:p-5 flex flex-col justify-between">
                        <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-xs sm:text-sm font-medium">
                            <CheckCircle className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                            <span>Active telecom</span>
                        </div>
                        <div className="mt-3 text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white">
                            {stats.telecom.activeTenants} / {stats.totalTenants}
                        </div>
                    </div>
                </div>
            </div>

            {/* Telecom Overview Section Header */}
            <div className="space-y-4">
                <h2 className="text-lg md:text-xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                    <Activity className="h-5 w-5 text-blue-500" />
                    Telecom overview
                </h2>

                {/* 5 Pipeline Flow Cards with Arrows (DIDs and TFNs separated) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-[1fr_auto_1fr_auto_1fr_auto_1fr_auto_1fr] gap-3 items-center">
                    {/* 1. DIDs */}
                    <div className="platform-card-step rounded-2xl p-4 h-full flex flex-col justify-between">
                        <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 text-xs font-semibold">
                            <Phone className="h-4 w-4" />
                            <span>DIDs</span>
                        </div>
                        <div className="mt-2 text-3xl font-extrabold text-slate-900 dark:text-white">
                            {stats.telecom.totalDIDs || 0}
                        </div>
                        <div className="mt-2 text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                            Direct Inward Dialing
                        </div>
                    </div>

                    {/* Arrow 1 */}
                    <div className="hidden lg:flex items-center justify-center text-slate-400 dark:text-slate-600">
                        <ArrowRight className="h-4 w-4" />
                    </div>

                    {/* 2. TFNs */}
                    <div className="platform-card-step rounded-2xl p-4 h-full flex flex-col justify-between">
                        <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 text-xs font-semibold">
                            <PhoneCall className="h-4 w-4" />
                            <span>Toll-Free (TFNs)</span>
                        </div>
                        <div className="mt-2 text-3xl font-extrabold text-slate-900 dark:text-white">
                            {stats.telecom.totalTFNs || 0}
                        </div>
                        <div className="mt-2 text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                            Toll-Free Numbers
                        </div>
                    </div>

                    {/* Arrow 2 */}
                    <div className="hidden lg:flex items-center justify-center text-slate-400 dark:text-slate-600">
                        <ArrowRight className="h-4 w-4" />
                    </div>

                    {/* 3. IVR menus */}
                    <div className="platform-card-step-dashed rounded-2xl p-4 h-full flex flex-col justify-between relative">
                        <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 text-xs font-semibold">
                            <PhoneCall className="h-4 w-4" />
                            <span>IVR menus</span>
                        </div>
                        <div className="mt-2 text-3xl font-extrabold text-slate-900 dark:text-white">
                            {stats.telecom.totalIVRs || 0}
                        </div>
                        <div className="mt-2 text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                            {(stats.telecom.totalIVRs || 0) === 0 ? 'No menus configured' : `${stats.telecom.totalIVRs} configured`}
                        </div>
                    </div>

                    {/* Arrow 3 */}
                    <div className="hidden lg:flex items-center justify-center text-slate-400 dark:text-slate-600">
                        <ArrowRight className="h-4 w-4" />
                    </div>

                    {/* 4. Ring groups */}
                    <div className="platform-card-step-dashed rounded-2xl p-4 h-full flex flex-col justify-between relative">
                        <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 text-xs font-semibold">
                            <Users className="h-4 w-4" />
                            <span>Ring groups</span>
                        </div>
                        <div className="mt-2 text-3xl font-extrabold text-slate-900 dark:text-white">
                            {stats.telecom.totalRingGroups || 0}
                        </div>
                        <div className="mt-2 text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                            {(stats.telecom.totalRingGroups || 0) === 0 ? 'No groups configured' : `${stats.telecom.totalRingGroups} configured`}
                        </div>
                    </div>

                    {/* Arrow 4 */}
                    <div className="hidden lg:flex items-center justify-center text-slate-400 dark:text-slate-600">
                        <ArrowRight className="h-4 w-4" />
                    </div>

                    {/* 5. Extensions */}
                    <div className="platform-card-step rounded-2xl p-4 h-full flex flex-col justify-between">
                        <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 text-xs font-semibold">
                            <Headphones className="h-4 w-4" />
                            <span>Extensions</span>
                        </div>
                        <div className="mt-2 text-3xl font-extrabold text-slate-900 dark:text-white">
                            {stats.telecom.totalExtensions || 0}
                        </div>
                        <div className="mt-2 text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                            {stats.telecom.availableExtensions || 0} free
                        </div>
                    </div>
                </div>

                {/* Extension Capacity and Resource Mix Panel */}
                <div className="platform-panel-dark rounded-2xl p-5 md:p-6 space-y-6">
                    {/* Extension capacity with Badges/Box style */}
                    <div>
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs sm:text-sm font-semibold mb-3">
                            <span className="text-slate-700 dark:text-slate-300">Extension capacity</span>
                            <div className="flex items-center gap-2 flex-wrap">
                                <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800/40">
                                    {stats.telecom.totalExtensions || 0} Used
                                </span>
                                <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/40">
                                    {stats.telecom.availableExtensions || 0} Available
                                </span>
                                <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-100 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-white/10">
                                    Total: {stats.telecom.limitExtensions || 500}
                                </span>
                            </div>
                        </div>
                        <div className="w-full h-2.5 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                            <div
                                className="h-full bg-blue-500 rounded-full transition-all duration-500"
                                style={{
                                    width: `${Math.min(100, Math.max(2, ((stats.telecom.totalExtensions || 0) / (stats.telecom.limitExtensions || 500)) * 100))}%`
                                }}
                            />
                        </div>
                    </div>

                    {/* Resource mix */}
                    <div>
                        {(() => {
                            const ext = stats.telecom.totalExtensions || 0;
                            const tfn = stats.telecom.totalTFNs || 0;
                            const did = stats.telecom.totalDIDs || 0;
                            const totalRes = ext + tfn + did || 1;
                            const extPct = (ext / totalRes) * 100;
                            const tfnPct = (tfn / totalRes) * 100;
                            const didPct = (did / totalRes) * 100;

                            return (
                                <>
                                    <div className="flex items-center justify-between text-xs sm:text-sm font-semibold mb-2">
                                        <span className="text-slate-700 dark:text-slate-300">Resource mix</span>
                                        <span className="text-slate-600 dark:text-slate-400">{ext + tfn + did} total</span>
                                    </div>
                                    <div className="w-full h-2.5 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden flex">
                                        <div
                                            className="h-full bg-blue-500 transition-all duration-500"
                                            style={{ width: `${extPct}%` }}
                                            title={`Extensions: ${ext}`}
                                        />
                                        <div
                                            className="h-full bg-[#f97316] transition-all duration-500"
                                            style={{ width: `${tfnPct}%` }}
                                            title={`TFNs: ${tfn}`}
                                        />
                                        <div
                                            className="h-full bg-[#10b981] transition-all duration-500"
                                            style={{ width: `${didPct}%` }}
                                            title={`DIDs: ${did}`}
                                        />
                                    </div>
                                    <div className="flex items-center gap-5 mt-3 text-xs text-slate-600 dark:text-slate-400 font-medium">
                                        <div className="flex items-center gap-1.5">
                                            <span className="h-2.5 w-2.5 rounded-xs bg-blue-500" />
                                            <span>Extensions {ext}</span>
                                        </div>
                                        <div className="flex items-center gap-1.5">
                                            <span className="h-2.5 w-2.5 rounded-xs bg-[#f97316]" />
                                            <span>TFNs {tfn}</span>
                                        </div>
                                        <div className="flex items-center gap-1.5">
                                            <span className="h-2.5 w-2.5 rounded-xs bg-[#10b981]" />
                                            <span>DIDs {did}</span>
                                        </div>
                                    </div>
                                </>
                            );
                        })()}
                    </div>

                    {/* Schedules Badge Box */}
                    <div className="border-t border-slate-200 dark:border-white/10 pt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                        <div className="flex items-center gap-2.5">
                            <div className="p-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/40 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                                <Clock className="h-4 w-4" />
                            </div>
                            <div>
                                <div className="font-bold text-slate-800 dark:text-slate-200 text-xs sm:text-sm">
                                    Operational Schedules
                                </div>
                                <div className="text-[11px] text-slate-500 dark:text-slate-400">
                                    Time routing rules & holiday calendars
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-2">
                            <span className="px-3 py-1 rounded-xl text-xs font-bold bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-800 dark:text-slate-200">
                                {stats.telecom.totalSchedules || 0} Schedules
                            </span>
                            {(stats.telecom.totalSchedules || 0) === 0 ? (
                                <span className="px-2.5 py-1 rounded-xl text-xs font-semibold bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/40">
                                    Not configured
                                </span>
                            ) : (
                                <span className="px-2.5 py-1 rounded-xl text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/40">
                                    Active
                                </span>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Analytics Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <GrowthChart />
                <RevenueChart />
            </div>

            {/* Tenants List */}
            <div className="space-y-4">
                <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                    <h2 className="text-xl font-extrabold text-gray-900 flex items-center gap-2">
                        Tenants Directory
                    </h2>
                    <div className="relative w-full sm:max-w-md">
                        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                            <Search className="h-5 w-5 text-gray-400" />
                        </div>
                        <input
                            type="text"
                            placeholder="Search tenants..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="block w-full rounded-xl border-0 py-2.5 pl-10 pr-3 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-primary-600 sm:text-sm font-medium bg-white transition-all"
                        />
                    </div>
                </div>

                <div className="bg-white rounded-2xl shadow-sm ring-1 ring-gray-200 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50/50">
                                <tr>
                                    <th scope="col" className="py-3.5 pl-4 md:pl-6 pr-3 text-left text-[10px] font-extrabold uppercase tracking-wider text-gray-500">Name</th>
                                    <th scope="col" className="hidden lg:table-cell px-3 py-3.5 text-left text-[10px] font-extrabold uppercase tracking-wider text-gray-500">ID</th>
                                    <th scope="col" className="hidden sm:table-cell px-3 py-3.5 text-left text-[10px] font-extrabold uppercase tracking-wider text-gray-500">Created</th>
                                    <th scope="col" className="hidden md:table-cell px-3 py-3.5 text-left text-[10px] font-extrabold uppercase tracking-wider text-gray-500">Users</th>
                                    <th scope="col" className="hidden sm:table-cell px-3 py-3.5 text-left text-[10px] font-extrabold uppercase tracking-wider text-gray-500">Wallet</th>
                                    <th scope="col" className="px-3 py-3.5 text-left text-[10px] font-extrabold uppercase tracking-wider text-gray-500">Status</th>
                                    <th scope="col" className="relative py-3.5 pl-3 pr-4 md:pr-6">
                                        <span className="sr-only">Actions</span>
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 bg-white">
                                {loading ? (
                                    <tr>
                                        <td colSpan="7" className="text-center py-8 text-sm font-medium text-gray-500">Loading directory...</td>
                                    </tr>
                                ) : tenants.map(tenant => (
                                    <tr key={tenant.id} onClick={() => setSelectedTenant(tenant)} className={`cursor-pointer transition-all ${selectedTenant?.id === tenant.id ? 'table-row-selected' : tenant.serviceBlocked ? 'bg-red-50/30' : ''}`}>
                                        <td className="whitespace-nowrap py-4 pl-4 md:pl-6 pr-3 text-sm font-bold text-gray-900 truncate max-w-[120px] md:max-w-none">
                                            <div className="flex flex-col">
                                                <span>{tenant.name}</span>
                                                <span className="sm:hidden text-[10px] text-gray-400 font-mono tracking-tighter">Balance: ${Number(tenant.wallet?.balance || 0).toFixed(2)}</span>
                                            </div>
                                        </td>
                                        <td className="hidden lg:table-cell whitespace-nowrap px-3 py-4 text-xs font-mono text-gray-500">{tenant.id}</td>
                                        <td className="hidden sm:table-cell whitespace-nowrap px-3 py-4 text-sm font-medium text-gray-500">
                                            {new Date(tenant.createdAt).toLocaleDateString()}
                                        </td>
                                        <td className="hidden md:table-cell whitespace-nowrap px-3 py-4 text-center">
                                            <span className="inline-flex items-center rounded-md bg-gray-50 px-2 py-1 text-xs font-bold text-gray-600 ring-1 ring-inset ring-gray-500/10">
                                                {tenant._count?.users || 0}
                                            </span>
                                        </td>
                                        <td className={`hidden sm:table-cell whitespace-nowrap px-3 py-4 text-sm font-mono font-bold ${Number(tenant.wallet?.balance) < 0 ? 'text-red-600' : 'text-gray-900'}`}>
                                            ${Number(tenant.wallet?.balance || 0).toFixed(2)}
                                        </td>
                                        <td className="whitespace-nowrap px-3 py-4">
                                            {tenant.serviceBlocked ? (
                                                <span className="inline-flex items-center rounded-md bg-red-50 px-1.5 py-0.5 md:px-2 md:py-1 text-[10px] md:text-xs font-bold text-red-700 ring-1 ring-inset ring-red-600/20">Blocked</span>
                                            ) : (
                                                <span className="inline-flex items-center rounded-md bg-green-50 px-1.5 py-0.5 md:px-2 md:py-1 text-[10px] md:text-xs font-bold text-green-700 ring-1 ring-inset ring-green-600/20">Active</span>
                                            )}
                                        </td>
                                        <td className="whitespace-nowrap py-4 pl-3 pr-6 text-right text-sm font-medium">
                                            <div className="flex items-center justify-end gap-2">
                                                <button
                                                    className={`inline-flex items-center justify-center rounded-xl p-2 shadow-sm ring-1 ring-inset transition-all focus:outline-none ${tenant.serviceBlocked ? 'bg-green-50 text-green-700 ring-green-200 hover:bg-green-100' : 'bg-red-50 text-red-700 ring-red-200 hover:bg-red-100'}`}
                                                    onClick={() => handleBlockToggle(tenant.id, tenant.serviceBlocked)}
                                                    title={tenant.serviceBlocked ? "Unblock Tenant" : "Block Tenant"}
                                                >
                                                    {tenant.serviceBlocked ? <CheckCircle className="h-4 w-4" /> : <Ban className="h-4 w-4" />}
                                                </button>
                                                <button
                                                    className="inline-flex items-center justify-center rounded-xl bg-white p-2 text-blue-600 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-blue-50 hover:ring-blue-200 transition-all focus:outline-none"
                                                    onClick={() => { setSelectedTenant(tenant); setActionModal('wallet'); }}
                                                    title="Manage Wallet"
                                                >
                                                    <CreditCard className="h-4 w-4" />
                                                </button>
                                                <button
                                                    className="inline-flex items-center justify-center rounded-xl bg-white px-3 py-2 text-sm font-bold text-gray-700 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 hover:text-gray-900 transition-all focus:outline-none gap-2 flex"
                                                    onClick={() => { setSelectedTenant(tenant); setActionModal('manage'); }}
                                                    title="Manage Tenant"
                                                >
                                                    Manage <Settings className="h-4 w-4 text-gray-400" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Pagination */}
                <div className="flex items-center justify-between border-t border-gray-200 bg-white px-4 py-3 sm:px-6 rounded-2xl shadow-sm ring-1 ring-gray-200">
                    <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
                        <div>
                            <p className="text-sm text-gray-700 font-medium">
                                Page <span className="font-bold">{page}</span> of <span className="font-bold">{totalPages}</span>
                            </p>
                        </div>
                        <div>
                            <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
                                <button
                                    disabled={page === 1}
                                    onClick={() => setPage(p => p - 1)}
                                    className="relative inline-flex items-center rounded-l-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50 transition-colors bg-white font-bold text-sm"
                                >
                                    <span className="sr-only">Previous</span>
                                    Previous
                                </button>
                                <button
                                    disabled={page === totalPages}
                                    onClick={() => setPage(p => p + 1)}
                                    className="relative inline-flex items-center rounded-r-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50 transition-colors bg-white font-bold text-sm"
                                >
                                    <span className="sr-only">Next</span>
                                    Next
                                </button>
                            </nav>
                        </div>
                    </div>
                </div>
            </div>

            {/* Modals */}
            {actionModal === 'wallet' && selectedTenant && (
                <WalletModal
                    tenant={selectedTenant}
                    onClose={() => setActionModal(null)}
                    onSubmit={handleWalletAdjust}
                />
            )}

            {actionModal === 'manage' && selectedTenant && (
                <TenantManager
                    tenantId={selectedTenant.id}
                    onClose={() => {
                        setActionModal(null);
                        fetchTenants(); // Refresh data in case changes were made
                    }}
                />
            )}
            {/* Drill-down Modal */}
            {showDetailModal && selectedTenant && (
                <TenantDetailModal
                    tenantId={selectedTenant.id}
                    onClose={() => setShowDetailModal(false)}
                />
            )}
        </div>
    );
};

const WalletModal = ({ tenant, onClose, onSubmit }) => {
    const [amount, setAmount] = useState('');
    const [type, setType] = useState('CREDIT');
    const [desc, setDesc] = useState('Admin adjustment');

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm transition-opacity" onClick={onClose}></div>
            <div className="relative bg-white rounded-2xl shadow-xl ring-1 ring-gray-200 w-full max-w-md overflow-hidden transform transition-all">
                <div className="px-6 py-5 border-b border-gray-100 bg-gray-50/50">
                    <h3 className="text-xl font-bold text-gray-900 tracking-tight">Manage Wallet: {tenant.name}</h3>
                </div>
                <div className="px-6 py-6 space-y-5">
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1.5">Type</label>
                        <select
                            value={type}
                            onChange={e => setType(e.target.value)}
                            className="block w-full rounded-xl border-0 py-2.5 px-3 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-primary-600 sm:text-sm font-medium bg-gray-50/50 hover:bg-white transition-colors"
                        >
                            <option value="CREDIT">Credit (Add Funds)</option>
                            <option value="DEBIT">Debit (Remove Funds)</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1.5">Amount</label>
                        <div className="relative mt-2 rounded-xl shadow-sm">
                            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                                <span className="text-gray-500 sm:text-sm font-medium">$</span>
                            </div>
                            <input
                                type="number"
                                value={amount}
                                onChange={e => setAmount(e.target.value)}
                                className="block w-full rounded-xl border-0 py-2.5 pl-7 pr-3 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-primary-600 sm:text-sm font-medium bg-gray-50/50 hover:bg-white transition-colors font-mono"
                                placeholder="0.00"
                                step="any"
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1.5">Description</label>
                        <input
                            type="text"
                            value={desc}
                            onChange={e => setDesc(e.target.value)}
                            className="block w-full rounded-xl border-0 py-2.5 px-3 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-primary-600 sm:text-sm font-medium bg-gray-50/50 hover:bg-white transition-colors"
                        />
                    </div>
                </div>
                <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="rounded-xl px-4 py-2 text-sm font-bold text-gray-700 hover:text-gray-900 hover:bg-gray-100 transition-colors focus:outline-none"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={() => onSubmit(amount, type, desc)}
                        className="rounded-xl bg-primary-600 px-4 py-2 text-sm font-bold text-white shadow-sm hover:bg-primary-700 transition-all focus:outline-none focus:ring-2 focus:ring-primary-500 active:scale-[0.98]"
                    >
                        Confirm Setup
                    </button>
                </div>
            </div>
        </div>
    );
};


const StatCard = ({ icon: Icon, label, value }) => {
    return (
        <div className="platform-panel-dark rounded-2xl p-4 sm:p-5 flex flex-col justify-between">
            <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-xs sm:text-sm font-medium">
                {Icon && <Icon className="h-4 w-4 text-blue-600 dark:text-blue-400" />}
                <span>{label}</span>
            </div>
            <div className="mt-3 text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white">
                {value}
            </div>
        </div>
    );
};

export default PlatformDashboard;
