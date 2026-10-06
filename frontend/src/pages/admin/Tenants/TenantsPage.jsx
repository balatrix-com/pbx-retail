import React, { useState, useEffect } from 'react';
import api from '../../../services/api';
import { Building2, Plus, Search, Trash2, Ban, CheckCircle2, LayoutGrid, List, RefreshCw, BarChart3, Users, Wallet } from 'lucide-react';
import TenantWizard from './TenantWizard';
import TenantManager from './TenantManager';
import Pagination from '../../../components/common/Pagination';
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
    const [pagination, setPagination] = useState({
        page: 1,
        limit: 20,
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
    }, [pagination.page, search]);

    const fetchTenants = async () => {
        try {
            setLoading(true);
            const params = new URLSearchParams({
                page: pagination.page.toString(),
                limit: pagination.limit.toString(),
                ...(search && { search })
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
        if (!window.confirm('Are you sure you want to delete this tenant? This action cannot be undone.')) return;
        try {
            await api.delete(`/tenants/${id}`);
            fetchTenants();
        } catch (error) {
            console.error('Failed to delete tenant', error);
            alert('Failed to delete tenant');
        }
    };

    const handleToggleBlock = async (id, currentBlocked) => {
        try {
            await api.patch(`/tenants/${id}/block`, { blocked: !currentBlocked });
            fetchTenants();
        } catch (error) {
            console.error('Failed to toggle tenant block', error);
        }
    };

    if (!isSuperAdmin) return <div className="p-8 font-bold text-red-500">Access Denied</div>;

    return (
        <div className="max-w-7xl mx-auto pb-12 space-y-8 px-4 sm:px-6 lg:px-8">
            {/* Header section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h1 className="text-3xl font-black tracking-tight text-gray-900 flex items-center gap-3">
                        <div className="bg-primary-600 p-2 rounded-2xl shadow-lg shadow-primary-600/20">
                            <Building2 className="text-white h-7 w-7" />
                        </div>
                        Tenant Ecosystem
                    </h1>
                    <p className="mt-2 text-gray-500 font-medium">Provision, manage and monitor all client organizations.</p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setShowCreateModal(true)}
                        className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-primary-600 text-white px-6 py-3 rounded-2xl font-black shadow-xl shadow-primary-600/20 hover:bg-primary-700 transition-all active:scale-95"
                    >
                        <Plus size={20} />
                        New Tenant
                    </button>
                </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5 flex flex-col relative overflow-hidden group hover:shadow-md transition-all duration-300">
                    <Building2 className="absolute -bottom-3 -right-2 h-24 w-24 transform -rotate-12 text-blue-400/30 group-hover:scale-105 transition-transform duration-500 pointer-events-none stroke-[2.2]" />
                    <div className="relative z-10">
                        <div className="flex items-center gap-2.5 mb-2">
                            <div className="p-1.5 rounded-lg text-blue-500 bg-blue-50 ring-1 ring-blue-500/10 flex items-center justify-center">
                                <Building2 className="h-4 w-4 stroke-[2.2]" />
                            </div>
                            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Tenants</p>
                        </div>
                        <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-2 tracking-tight">{pagination.total}</div>
                    </div>
                </div>

                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5 flex flex-col relative overflow-hidden group hover:shadow-md transition-all duration-300">
                    <Users className="absolute -bottom-3 -right-2 h-24 w-24 transform -rotate-12 text-blue-400/30 group-hover:scale-105 transition-transform duration-500 pointer-events-none stroke-[2.2]" />
                    <div className="relative z-10">
                        <div className="flex items-center gap-2.5 mb-2">
                            <div className="p-1.5 rounded-lg text-blue-500 bg-blue-50 ring-1 ring-blue-500/10 flex items-center justify-center">
                                <Users className="h-4 w-4 stroke-[2.2]" />
                            </div>
                            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Platform Users</p>
                        </div>
                        <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-2 tracking-tight">{stats.totalUsers}</div>
                    </div>
                </div>

                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5 flex flex-col relative overflow-hidden group hover:shadow-md transition-all duration-300">
                    <BarChart3 className="absolute -bottom-3 -right-2 h-24 w-24 transform -rotate-12 text-blue-400/30 group-hover:scale-105 transition-transform duration-500 pointer-events-none stroke-[2.2]" />
                    <div className="relative z-10">
                        <div className="flex items-center gap-2.5 mb-2">
                            <div className="p-1.5 rounded-lg text-blue-500 bg-blue-50 ring-1 ring-blue-500/10 flex items-center justify-center">
                                <BarChart3 className="h-4 w-4 stroke-[2.2]" />
                            </div>
                            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Revenue</p>
                        </div>
                        <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-2 tracking-tight">${parseFloat(stats.totalWalletBalance || 0).toFixed(2)}</div>
                    </div>
                </div>
            </div>

            {/* Search and Filters */}
            <div className="bg-white rounded-3xl p-6 shadow-sm ring-1 ring-gray-200">
                <div className="relative w-full">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
                        <Search className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                        type="search"
                        id="tenant_search_filter"
                        name="tenant_search_filter"
                        autoComplete="off"
                        autoCorrect="off"
                        spellCheck="false"
                        placeholder="Search by company name, tenant ID, or email..."
                        className="block w-full rounded-2xl border-0 py-3.5 pl-12 pr-4 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-200 focus:ring-2 focus:ring-inset focus:ring-primary-600 sm:text-sm font-bold bg-gray-50/50 transition-all"
                        value={search}
                        onChange={(e) => { setSearch(e.target.value); setPagination(p => ({ ...p, page: 1 })); }}
                    />
                </div>
            </div>

            {/* Tenants Table */}
            <div className="bg-white rounded-3xl shadow-sm ring-1 ring-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-100">
                        <thead className="bg-gray-50/50">
                            <tr>
                                <th className="px-6 py-5 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Company & ID</th>
                                <th className="px-6 py-5 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Service Status</th>
                                <th className="hidden sm:table-cell px-6 py-5 text-center text-[10px] font-black text-gray-400 uppercase tracking-widest">Users</th>
                                <th className="hidden lg:table-cell px-6 py-5 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Wallet</th>
                                <th className="hidden md:table-cell px-6 py-5 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Date Joined</th>
                                <th className="px-6 py-5 text-right text-[10px] font-black text-gray-400 uppercase tracking-widest">Management</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50 bg-white">
                            {loading ? (
                                Array.from({ length: 5 }).map((_, i) => (
                                    <tr key={i} className="animate-pulse">
                                        <td colSpan="6" className="px-6 py-8"><div className="h-4 bg-gray-100 rounded-full w-full"></div></td>
                                    </tr>
                                ))
                            ) : tenants.length === 0 ? (
                                <tr>
                                    <td colSpan="6" className="px-6 py-12 text-center text-gray-400 font-bold italic">No tenants found matching your search.</td>
                                </tr>
                            ) : (
                                tenants.map(tenant => (
                                    <tr key={tenant.id} className="hover:bg-gray-50/50 transition-all group">
                                        <td className="px-6 py-5 whitespace-nowrap">
                                            <div className="flex flex-col">
                                                <span className="text-sm font-bold text-gray-900 group-hover:text-primary-600 transition-colors">{tenant.name}</span>
                                                <span className="text-[10px] text-gray-400 font-mono font-bold tracking-tight">{formatCustomerId(tenant.id)}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-5 whitespace-nowrap">
                                            <span className={clsx(
                                                "inline-flex items-center px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-tight shadow-sm ring-1",
                                                tenant.serviceBlocked 
                                                    ? 'bg-red-50 text-red-700 ring-red-600/10' 
                                                    : 'bg-emerald-50 text-emerald-700 ring-emerald-600/10'
                                            )}>
                                                {tenant.serviceBlocked ? 'Service Blocked' : 'Active'}
                                            </span>
                                        </td>
                                        <td className="hidden sm:table-cell px-6 py-5 whitespace-nowrap text-center">
                                            <span className="inline-flex items-center rounded-lg bg-gray-50 px-2.5 py-1 text-xs font-black text-gray-600 ring-1 ring-inset ring-gray-200">
                                                {tenant._count?.users || 0}
                                            </span>
                                        </td>
                                        <td className="hidden lg:table-cell px-6 py-5 whitespace-nowrap">
                                            <div className="flex items-center gap-2">
                                                <Wallet size={14} className="text-gray-400" />
                                                <span className="text-sm font-bold text-gray-700">
                                                    {tenant.wallet?.currency || 'USD'} {parseFloat(tenant.wallet?.balance || 0).toFixed(2)}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="hidden md:table-cell px-6 py-5 whitespace-nowrap text-xs font-bold text-gray-400">
                                            {new Date(tenant.createdAt).toLocaleDateString()}
                                        </td>
                                        <td className="px-6 py-5 whitespace-nowrap text-right">
                                            <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button
                                                    onClick={() => setSelectedTenantId(tenant.id)}
                                                    className="inline-flex items-center justify-center rounded-xl bg-white px-4 py-2 text-xs font-black text-primary-600 shadow-sm ring-1 ring-inset ring-primary-200 hover:bg-primary-50 transition-all active:scale-95"
                                                >
                                                    Configure
                                                </button>
                                                <button
                                                    onClick={() => handleToggleBlock(tenant.id, tenant.serviceBlocked)}
                                                    className={clsx(
                                                        "p-2 rounded-xl transition-all",
                                                        tenant.serviceBlocked ? "text-emerald-600 hover:bg-emerald-50" : "text-amber-600 hover:bg-amber-50"
                                                    )}
                                                    title={tenant.serviceBlocked ? "Unblock" : "Block"}
                                                >
                                                    {tenant.serviceBlocked ? <CheckCircle2 size={18} /> : <Ban size={18} />}
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(tenant.id)}
                                                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                )))
                            }
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                <div className="px-6">
                    <Pagination
                        pagination={pagination}
                        onPageChange={handlePageChange}
                    />
                </div>
            </div>

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
