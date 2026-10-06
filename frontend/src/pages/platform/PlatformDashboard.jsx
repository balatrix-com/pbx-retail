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
    Settings
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
                    <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-gray-900">Platform Command Center</h1>
                    <p className="text-gray-500 mt-1 font-medium text-sm md:text-base">Overview of all organizations and system health</p>
                </div>
                <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
                    <Link
                        to="/analytics"
                        className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-sm font-bold shadow-sm bg-primary-600 text-white hover:bg-primary-700 transition-all active:scale-95 w-full sm:w-auto"
                    >
                        <BarChart3 className="h-4 w-4" />
                        Global Analytics
                    </Link>
                </div>
            </header>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                <StatCard
                    icon={Building2}
                    label="Total Tenants"
                    value={stats.totalTenants}
                    color="blue"
                />
                <StatCard
                    icon={Users}
                    label="Total Users"
                    value={stats.totalUsers}
                    color="purple"
                />
                <StatCard
                    icon={Wallet}
                    label="Wallet Float"
                    value={`$${Number(stats.totalWalletBalance).toFixed(2)}`}
                    color="green"
                />
            </div>

            {/* Telecom Stats Section */}
            {stats.telecom.totalDIDs > 0 && (
                <div className="space-y-4">
                    <h2 className="text-xl font-extrabold text-gray-900 flex items-center gap-2">
                        <Activity className="h-5 w-5 text-blue-500" />
                        Telecom Overview
                    </h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        <StatCard
                            icon={Phone}
                            label="Total DIDs"
                            value={stats.telecom.totalDIDs}
                            color="blue"
                        />
                        <StatCard
                            icon={Phone}
                            label="Total TFNs"
                            value={stats.telecom.totalTFNs}
                            color="blue"
                        />
                        <StatCard
                            icon={Users}
                            label="Total Extensions"
                            value={stats.telecom.totalExtensions}
                            color="blue"
                        />
                        <StatCard
                            icon={Database}
                            label="Available Extensions"
                            value={`${stats.telecom.availableExtensions} / ${stats.telecom.limitExtensions}`}
                            color="blue"
                        />
                        <StatCard
                            icon={Users}
                            label="Ring Groups"
                            value={stats.telecom.totalRingGroups}
                            color="blue"
                        />
                        <StatCard
                            icon={PhoneCall}
                            label="IVR Menus"
                            value={stats.telecom.totalIVRs}
                            color="blue"
                        />
                        <StatCard
                            icon={Clock}
                            label="Schedules"
                            value={stats.telecom.totalSchedules}
                            color="blue"
                        />
                        <StatCard
                            icon={Building2}
                            label="Active Telecom Tenants"
                            value={stats.telecom.activeTenants}
                            color="blue"
                        />
                        <StatCard
                            icon={CreditCard}
                            label="Monthly Telecom Revenue"
                            value={`$${Number(stats.telecom.monthlyRevenue).toFixed(2)}`}
                            color="blue"
                        />
                    </div>
                </div>
            )}

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


const StatCard = ({ icon: Icon, label, value, color }) => {
    const colorMap = {
        blue: 'text-blue-500 bg-blue-50 ring-1 ring-blue-500/10',
        purple: 'text-blue-500 bg-blue-50 ring-1 ring-blue-500/10',
        green: 'text-blue-500 bg-blue-50 ring-1 ring-blue-500/10',
        orange: 'text-blue-500 bg-blue-50 ring-1 ring-blue-500/10',
        indigo: 'text-blue-500 bg-blue-50 ring-1 ring-blue-500/10',
        teal: 'text-blue-500 bg-blue-50 ring-1 ring-blue-500/10',
        emerald: 'text-blue-500 bg-blue-50 ring-1 ring-blue-500/10'
    };
    const iconColorMap = {
        blue: 'text-blue-400/30',
        purple: 'text-blue-400/30',
        green: 'text-blue-400/30',
        orange: 'text-blue-400/30',
        indigo: 'text-blue-400/30',
        teal: 'text-blue-400/30',
        emerald: 'text-blue-400/30'
    };

    const scheme = colorMap[color] || 'text-blue-500 bg-blue-50 ring-1 ring-blue-500/10';
    const watermark = iconColorMap[color] || 'text-blue-400/30';

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5 flex flex-col relative overflow-hidden group hover:shadow-md transition-all duration-300">
            <Icon className={`absolute -bottom-3 -right-2 h-24 w-24 transform -rotate-12 group-hover:scale-105 transition-transform duration-500 pointer-events-none stroke-[2.2] ${watermark}`} />
            <div className="relative z-10">
                <div className="flex items-center gap-2.5 mb-2">
                    <div className={`p-1.5 rounded-lg ${scheme} flex items-center justify-center`}>
                        <Icon className="h-4 w-4 stroke-[2.2]" />
                    </div>
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">{label}</p>
                </div>
                <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-2 tracking-tight">
                    {value}
                </div>
            </div>
        </div>
    );
};

export default PlatformDashboard;
