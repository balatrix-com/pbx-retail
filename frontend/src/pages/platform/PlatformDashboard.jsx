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
    ArrowRight,
    Filter,
    ChevronUp,
    ChevronDown,
    ChevronRight,
    ChevronLeft,
    MoreHorizontal,
    Check,
    ExternalLink,
    ArrowUpDown
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
    const [totalCount, setTotalCount] = useState(0);
    const [syncing, setSyncing] = useState(false);

    // Modern table controls matching UI design
    const [filterTab, setFilterTab] = useState('all'); // 'all' | 'active' | 'low_wallet'
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [selectedRows, setSelectedRows] = useState(new Set());
    const [expandedRows, setExpandedRows] = useState(new Set());
    const [sortField, setSortField] = useState('createdAt');
    const [sortOrder, setSortOrder] = useState('desc');
    const [activeMenuTenantId, setActiveMenuTenantId] = useState(null);

    useEffect(() => {
        fetchStats();
        fetchTenants();
    }, [page, search, rowsPerPage]); // Re-fetch when page, search, or rowsPerPage changes

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
                params: { page, limit: rowsPerPage, search }
            });
            const list = res.data?.data || (Array.isArray(res.data) ? res.data : []);
            setTenants(list);
            setTotalPages(res.data?.pagination?.totalPages || 1);
            setTotalCount(res.data?.pagination?.total || list.length);
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
    const [actionModal, setActionModal] = useState(null); // 'wallet' | 'manage'
    const [showDetailModal, setShowDetailModal] = useState(false);

    // Toggle expansion of detail row
    const toggleRowExpand = (id, e) => {
        e?.stopPropagation();
        setExpandedRows(prev => {
            const next = new Set(prev);
            if (next.has(id)) {
                next.delete(id);
            } else {
                next.add(id);
            }
            return next;
        });
    };

    // Toggle single row checkbox
    const toggleSelectRow = (id, e) => {
        e?.stopPropagation();
        setSelectedRows(prev => {
            const next = new Set(prev);
            if (next.has(id)) {
                next.delete(id);
            } else {
                next.add(id);
            }
            return next;
        });
    };

    // Toggle select all on current page
    const toggleSelectAll = () => {
        if (selectedRows.size === tenants.length && tenants.length > 0) {
            setSelectedRows(new Set());
        } else {
            setSelectedRows(new Set(tenants.map(t => t.id)));
        }
    };

    const handleSort = (field) => {
        if (sortField === field) {
            setSortOrder(prev => (prev === 'asc' ? 'desc' : 'asc'));
        } else {
            setSortField(field);
            setSortOrder('asc');
        }
    };

    // Close action popup when clicking outside
    useEffect(() => {
        const handleClickOutside = () => setActiveMenuTenantId(null);
        window.addEventListener('click', handleClickOutside);
        return () => window.removeEventListener('click', handleClickOutside);
    }, []);

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

            {/* Tenants Directory Section matching attachment design */}
            {(() => {
                // Derived filtering
                const activeCount = tenants.filter(t => !t.serviceBlocked).length;

                let displayedTenants = [...tenants];
                if (filterTab === 'active') {
                    displayedTenants = displayedTenants.filter(t => !t.serviceBlocked);
                }

                // Sorting
                displayedTenants.sort((a, b) => {
                    let valA, valB;
                    if (sortField === 'name') {
                        valA = (a.name || '').toLowerCase();
                        valB = (b.name || '').toLowerCase();
                    } else if (sortField === 'wallet') {
                        valA = Number(a.wallet?.balance || 0);
                        valB = Number(b.wallet?.balance || 0);
                    } else if (sortField === 'users') {
                        valA = a._count?.users || 0;
                        valB = b._count?.users || 0;
                    } else {
                        valA = new Date(a.createdAt || 0).getTime();
                        valB = new Date(b.createdAt || 0).getTime();
                    }

                    if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
                    if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
                    return 0;
                });

                const startIdx = (page - 1) * rowsPerPage + 1;
                const endIdx = Math.min(page * rowsPerPage, totalCount || displayedTenants.length);

                return (
                    <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-sm border border-slate-200/80 dark:border-slate-800 space-y-6">
                        {/* Top Controls: Filter Tabs on Left, Search + Filters on Right */}
                        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                            {/* Filter Tabs */}
                            <div className="flex items-center gap-2 flex-wrap">
                                <button
                                    type="button"
                                    onClick={() => setFilterTab('all')}
                                    className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
                                        filterTab === 'all'
                                            ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/20'
                                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                                    }`}
                                >
                                    All tenants ({totalCount || tenants.length})
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setFilterTab('active')}
                                    className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
                                        filterTab === 'active'
                                            ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/20'
                                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                                    }`}
                                >
                                    Active ({activeCount})
                                </button>
                            </div>

                            {/* Search and Filters Button */}
                            <div className="flex items-center gap-3 w-full lg:w-auto">
                                <div className="relative flex-1 lg:w-72">
                                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                    <input
                                        type="text"
                                        placeholder="Search tenants..."
                                        value={search}
                                        onChange={(e) => {
                                            setSearch(e.target.value);
                                            setPage(1);
                                        }}
                                        className="w-full pl-10 pr-4 py-2 rounded-xl text-xs sm:text-sm bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white dark:focus:bg-slate-800 transition-all"
                                    />
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setFilterTab(prev => prev === 'all' ? 'active' : 'all')}
                                    className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors shrink-0"
                                >
                                    <Filter className="h-4 w-4 text-slate-500 dark:text-slate-400" />
                                    <span>Filters</span>
                                    <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
                                </button>
                            </div>
                        </div>

                        {/* Table */}
                        <div className="overflow-x-auto -mx-6 px-6">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="border-b border-slate-100 dark:border-slate-800 text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                                        <th
                                            className="py-3.5 pl-6 pr-4 cursor-pointer select-none hover:text-slate-600 dark:hover:text-slate-300"
                                            onClick={() => handleSort('name')}
                                        >
                                            <div className="inline-flex items-center gap-1.5">
                                                TENANT
                                                <ArrowUpDown className="h-3 w-3 text-slate-400" />
                                            </div>
                                        </th>
                                        <th className="py-3.5 px-4 w-36">STATUS</th>
                                        <th className="py-3.5 px-4 text-right w-44">ACTIONS</th>
                                        <th className="py-3.5 pr-6 pl-2 w-12 text-center"></th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                                    {loading ? (
                                        <tr>
                                            <td colSpan="4" className="text-center py-12 text-sm font-medium text-slate-400">
                                                <div className="inline-flex items-center gap-2">
                                                    <RefreshCcw className="h-4 w-4 animate-spin text-blue-500" />
                                                    Loading directory...
                                                </div>
                                            </td>
                                        </tr>
                                    ) : displayedTenants.length === 0 ? (
                                        <tr>
                                            <td colSpan="4" className="text-center py-12 text-sm font-medium text-slate-400">
                                                No tenants found matching criteria.
                                            </td>
                                        </tr>
                                    ) : (
                                        displayedTenants.map((tenant, idx) => {
                                            const isExpanded = expandedRows.has(tenant.id);
                                            const balanceNum = Number(tenant.wallet?.balance || 0);

                                            // Avatar initial and color palette cycling (blue, purple, pink/red)
                                            const initial = (tenant.name || 'T').trim().charAt(0).toUpperCase();
                                            const avatarPalette = [
                                                'bg-blue-100 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400',
                                                'bg-purple-100 text-purple-600 dark:bg-purple-950/60 dark:text-purple-400',
                                                'bg-pink-100 text-pink-600 dark:bg-pink-950/60 dark:text-pink-400',
                                                'bg-indigo-100 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400',
                                            ];
                                            const avatarClass = avatarPalette[idx % avatarPalette.length];

                                            const displayDate = tenant.createdAt
                                                ? new Date(tenant.createdAt).toLocaleDateString('en-US', {
                                                      month: 'short',
                                                      day: 'numeric',
                                                      year: 'numeric'
                                                  })
                                                : '—';

                                            return (
                                                <React.Fragment key={tenant.id}>
                                                    {/* Main Row: Clean, Professional layout */}
                                                    <tr
                                                        onClick={() => setSelectedTenant(tenant)}
                                                        className={`group transition-all cursor-pointer ${
                                                            isExpanded
                                                                ? 'bg-blue-50/30 dark:bg-slate-800/40'
                                                                : 'hover:bg-slate-50/80 dark:hover:bg-slate-800/40'
                                                        }`}
                                                    >
                                                        {/* Tenant: Avatar + Name + ID */}
                                                        <td className="py-4 pl-6 pr-4">
                                                            <div className="flex items-center gap-3.5">
                                                                <div
                                                                    className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm shrink-0 shadow-2xs ${avatarClass}`}
                                                                >
                                                                    {initial}
                                                                </div>
                                                                <div className="min-w-0">
                                                                    <div className="font-bold text-sm text-slate-900 dark:text-white truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                                                                        {tenant.name}
                                                                    </div>
                                                                    <div className="flex items-center gap-2 mt-0.5">
                                                                        <span className="text-[11px] font-mono font-medium text-slate-400 dark:text-slate-500">
                                                                            {tenant.customerCode || tenant.id}
                                                                        </span>
                                                                        {tenant.domain && (
                                                                            <span className="text-[11px] text-slate-400 dark:text-slate-500 truncate max-w-[150px]">
                                                                                • {tenant.domain}
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </td>

                                                        {/* Status */}
                                                        <td className="py-4 px-4 whitespace-nowrap">
                                                            {tenant.serviceBlocked ? (
                                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800/40">
                                                                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                                                                    Blocked
                                                                </span>
                                                            ) : (
                                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/40">
                                                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                                                                    Active
                                                                </span>
                                                            )}
                                                        </td>

                                                        {/* Actions: Manage > and ... Menu */}
                                                        <td className="py-4 px-4 whitespace-nowrap text-right" onClick={(e) => e.stopPropagation()}>
                                                            <div className="inline-flex items-center justify-end gap-2">
                                                                <button
                                                                    type="button"
                                                                    onClick={() => {
                                                                        setSelectedTenant(tenant);
                                                                        setActionModal('manage');
                                                                    }}
                                                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 hover:border-slate-300 transition-all shadow-2xs active:scale-95"
                                                                >
                                                                    <span>Manage</span>
                                                                    <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
                                                                </button>

                                                                {/* More actions popup */}
                                                                <div className="relative inline-block text-left">
                                                                    <button
                                                                        type="button"
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            setActiveMenuTenantId(activeMenuTenantId === tenant.id ? null : tenant.id);
                                                                        }}
                                                                        className="p-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors shadow-2xs"
                                                                        title="More actions"
                                                                    >
                                                                        <MoreHorizontal className="h-4 w-4" />
                                                                    </button>

                                                                    {activeMenuTenantId === tenant.id && (
                                                                        <div className="absolute right-0 mt-2 w-48 rounded-2xl bg-white dark:bg-slate-800 shadow-xl ring-1 ring-black/5 dark:ring-white/10 z-30 py-1.5 text-left divide-y divide-slate-100 dark:divide-slate-700">
                                                                            <div className="py-1">
                                                                                <button
                                                                                    type="button"
                                                                                    onClick={() => {
                                                                                        setSelectedTenant(tenant);
                                                                                        setActionModal('wallet');
                                                                                        setActiveMenuTenantId(null);
                                                                                    }}
                                                                                    className="w-full flex items-center gap-2 px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/60"
                                                                                >
                                                                                    <CreditCard className="h-4 w-4 text-blue-500" />
                                                                                    Adjust Wallet
                                                                                </button>
                                                                                <button
                                                                                    type="button"
                                                                                    onClick={() => {
                                                                                        setSelectedTenant(tenant);
                                                                                        setShowDetailModal(true);
                                                                                        setActiveMenuTenantId(null);
                                                                                    }}
                                                                                    className="w-full flex items-center gap-2 px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/60"
                                                                                >
                                                                                    <Eye className="h-4 w-4 text-indigo-500" />
                                                                                    View Details
                                                                                </button>
                                                                            </div>
                                                                            <div className="py-1">
                                                                                <button
                                                                                    type="button"
                                                                                    onClick={() => {
                                                                                        handleBlockToggle(tenant.id, tenant.serviceBlocked);
                                                                                        setActiveMenuTenantId(null);
                                                                                    }}
                                                                                    className={`w-full flex items-center gap-2 px-4 py-2 text-xs font-semibold ${
                                                                                        tenant.serviceBlocked
                                                                                            ? 'text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30'
                                                                                            : 'text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30'
                                                                                    }`}
                                                                                >
                                                                                    {tenant.serviceBlocked ? (
                                                                                        <>
                                                                                            <CheckCircle className="h-4 w-4" />
                                                                                            Unblock Tenant
                                                                                        </>
                                                                                    ) : (
                                                                                        <>
                                                                                            <Ban className="h-4 w-4" />
                                                                                            Block Tenant
                                                                                        </>
                                                                                    )}
                                                                                </button>
                                                                            </div>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </td>

                                                        {/* Expand / Collapse Chevron */}
                                                        <td className="py-4 pr-6 pl-2 text-center" onClick={(e) => e.stopPropagation()}>
                                                            <button
                                                                type="button"
                                                                onClick={(e) => toggleRowExpand(tenant.id, e)}
                                                                className={`p-1.5 rounded-lg transition-colors ${
                                                                    isExpanded
                                                                        ? 'bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400'
                                                                        : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                                                                }`}
                                                                title={isExpanded ? 'Collapse' : 'Expand'}
                                                            >
                                                                {isExpanded ? (
                                                                    <ChevronUp className="h-4 w-4" />
                                                                ) : (
                                                                    <ChevronDown className="h-4 w-4" />
                                                                )}
                                                            </button>
                                                        </td>
                                                    </tr>

                                                    {/* Expanded Drawer Card: Professional Card Grid */}
                                                    {isExpanded && (
                                                        <tr className="bg-slate-50/60 dark:bg-slate-800/30">
                                                            <td colSpan="4" className="py-4 px-6">
                                                                <div className="rounded-2xl border border-slate-200/80 dark:border-slate-700/80 bg-white dark:bg-slate-800 p-5 shadow-xs">
                                                                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
                                                                        {/* 4 Metric Tiles Grid */}
                                                                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 flex-1">
                                                                            {/* 1. Wallet Balance */}
                                                                            <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50/80 dark:bg-slate-800/80 border border-slate-100 dark:border-slate-700/60">
                                                                                <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/50 border border-blue-200/50 dark:border-blue-800/50 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0">
                                                                                    <Wallet className="h-5 w-5" />
                                                                                </div>
                                                                                <div className="min-w-0">
                                                                                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                                                                                        Wallet
                                                                                    </div>
                                                                                    <div className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white font-mono truncate">
                                                                                        ${balanceNum.toFixed(2)}
                                                                                    </div>
                                                                                </div>
                                                                            </div>

                                                                            {/* 2. Users Count */}
                                                                            <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50/80 dark:bg-slate-800/80 border border-slate-100 dark:border-slate-700/60">
                                                                                <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-700/50 flex items-center justify-center text-slate-500 dark:text-slate-400 shrink-0">
                                                                                    <Users className="h-5 w-5" />
                                                                                </div>
                                                                                <div className="min-w-0">
                                                                                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                                                                                        Users
                                                                                    </div>
                                                                                    <div className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white truncate">
                                                                                        {tenant._count?.users || 0}
                                                                                    </div>
                                                                                </div>
                                                                            </div>

                                                                            {/* 3. Created Date */}
                                                                            <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50/80 dark:bg-slate-800/80 border border-slate-100 dark:border-slate-700/60">
                                                                                <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-950/50 border border-purple-200/50 dark:border-purple-800/50 flex items-center justify-center text-purple-600 dark:text-purple-400 shrink-0">
                                                                                    <Clock className="h-5 w-5" />
                                                                                </div>
                                                                                <div className="min-w-0">
                                                                                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                                                                                        Created
                                                                                    </div>
                                                                                    <div className="text-sm font-semibold text-slate-800 dark:text-slate-200 truncate">
                                                                                        {displayDate}
                                                                                    </div>
                                                                                </div>
                                                                            </div>

                                                                            {/* 4. Status Details */}
                                                                            <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50/80 dark:bg-slate-800/80 border border-slate-100 dark:border-slate-700/60">
                                                                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                                                                                    tenant.serviceBlocked
                                                                                        ? 'bg-rose-50 dark:bg-rose-950/50 text-rose-600'
                                                                                        : 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600'
                                                                                }`}>
                                                                                    <CheckCircle className="h-5 w-5" />
                                                                                </div>
                                                                                <div className="min-w-0">
                                                                                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                                                                                        Status
                                                                                    </div>
                                                                                    <div className="text-sm font-extrabold text-slate-900 dark:text-white truncate">
                                                                                        {tenant.serviceBlocked ? 'Blocked' : 'Active'}
                                                                                    </div>
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    )}
                                                </React.Fragment>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Bottom Footer: Showing count on Left, Rows per page + Pagination on Right */}
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-100 dark:border-slate-800 text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                            <div>
                                {displayedTenants.length > 0 ? (
                                    <span>
                                        Showing <span className="font-semibold text-slate-700 dark:text-slate-200">{startIdx}–{endIdx}</span> of <span className="font-semibold text-slate-700 dark:text-slate-200">{totalCount || displayedTenants.length}</span> tenants
                                    </span>
                                ) : (
                                    <span>0 tenants</span>
                                )}
                            </div>

                            <div className="flex items-center gap-4 flex-wrap">
                                {/* Rows per page selector */}
                                <div className="flex items-center gap-2">
                                    <span>Rows per page</span>
                                    <select
                                        value={rowsPerPage}
                                        onChange={(e) => {
                                            setRowsPerPage(Number(e.target.value));
                                            setPage(1);
                                        }}
                                        className="py-1 px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                                    >
                                        <option value={5}>5</option>
                                        <option value={10}>10</option>
                                        <option value={25}>25</option>
                                        <option value={50}>50</option>
                                    </select>
                                </div>

                                {/* Pagination Controls */}
                                <div className="flex items-center gap-1.5">
                                    <button
                                        type="button"
                                        disabled={page === 1}
                                        onClick={() => setPage(p => Math.max(1, p - 1))}
                                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                                    >
                                        <ChevronLeft className="h-3.5 w-3.5" />
                                        Previous
                                    </button>

                                    <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/50 border border-blue-500/30 text-blue-600 dark:text-blue-400 font-bold text-xs flex items-center justify-center">
                                        {page}
                                    </div>

                                    <button
                                        type="button"
                                        disabled={page >= totalPages}
                                        onClick={() => setPage(p => p + 1)}
                                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                                    >
                                        Next
                                        <ChevronRight className="h-3.5 w-3.5" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                );
            })()}

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
                    initialTenant={selectedTenant}
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
