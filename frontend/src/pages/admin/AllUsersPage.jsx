import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Users, Search, Filter, Plus, Edit2, Trash2, Eye, RefreshCw, UserCheck, UserMinus, ShieldAlert, Globe } from 'lucide-react';
import api from '../../services/api';
import Pagination from '../../components/common/Pagination';
import { clsx } from 'clsx';

const AllUsersPage = () => {
    const { impersonateUser } = useAuth();
    const navigate = useNavigate();

    const [users, setUsers] = useState([]);
    const [tenants, setTenants] = useState([]);
    const [loading, setLoading] = useState(true);
    const [pagination, setPagination] = useState({
        page: 1,
        limit: 10,
        total: 0,
        totalPages: 1
    });

    // Filters
    const [search, setSearch] = useState('');
    const [roleFilter, setRoleFilter] = useState('');
    const [tenantFilter, setTenantFilter] = useState('');
    const [statusFilter, setStatusFilter] = useState('');

    // Stats
    const [stats, setStats] = useState({
        total: 0,
        active: 0,
        suspended: 0,
        admins: 0
    });

    useEffect(() => {
        fetchUsers();
        fetchTenants();
    }, [pagination.page, pagination.limit, search, roleFilter, tenantFilter, statusFilter]);

    const fetchUsers = async () => {
        try {
            setLoading(true);
            const params = new URLSearchParams({
                page: pagination.page.toString(),
                limit: pagination.limit.toString(),
                ...(search && { search }),
                ...(roleFilter && { role: roleFilter }),
                ...(tenantFilter && { tenantId: tenantFilter }),
                ...(statusFilter && { status: statusFilter }),
            });

            const res = await api.get(`/users?${params}`);
            setUsers(res.data.data || []);
            setPagination(prev => ({
                ...prev,
                total: res.data.pagination?.total || 0,
                totalPages: res.data.pagination?.totalPages || 1
            }));

            // Basic stats calculation from the response (or we could have a separate endpoint)
            if (res.data.pagination) {
                setStats(prev => ({
                    ...prev,
                    total: res.data.pagination.total
                }));
            }
        } catch (error) {
            console.error('Failed to fetch users:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchTenants = async () => {
        try {
            const res = await api.get('/tenants?limit=100');
            setTenants(res.data.data || res.data || []);
        } catch (error) {
            console.error('Failed to fetch tenants:', error);
        }
    };

    const handlePageChange = (newPage) => {
        setPagination(prev => ({ ...prev, page: newPage }));
    };

    const handleDelete = async (userId, userName) => {
        if (!window.confirm(`Delete user "${userName}"? This action cannot be undone.`)) return;

        try {
            await api.delete(`/users/${userId}`);
            fetchUsers();
        } catch (error) {
            alert('Failed to delete user');
            console.error(error);
        }
    };

    const handleStatusToggle = async (userId, currentStatus) => {
        const newStatus = currentStatus === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';

        try {
            await api.patch(`/users/${userId}/status`, { status: newStatus });
            fetchUsers();
        } catch (error) {
            alert('Failed to update user status');
            console.error(error);
        }
    };

    const handleImpersonate = async (userId, userName) => {
        if (!window.confirm(`Open impersonation session for "${userName}" in a new tab?`)) return;

        try {
            const response = await api.post(`/users/impersonate/${userId}`);
            const { ticket } = response.data;
            const url = `/impersonate?ticket=${encodeURIComponent(ticket)}`;
            window.open(url, '_blank');
        } catch (error) {
            console.error('Impersonation error:', error);
            alert('Impersonation failed: ' + (error.response?.data?.message || error.message));
        }
    };

    const clearFilters = () => {
        setSearch('');
        setRoleFilter('');
        setTenantFilter('');
        setStatusFilter('');
        setPagination(prev => ({ ...prev, page: 1 }));
    };

    const getRoleBadgeStyle = (role) => {
        switch (role) {
            case 'SUPER_ADMIN': return 'bg-purple-100 text-purple-700 ring-1 ring-inset ring-purple-600/20';
            case 'ADMIN': return 'bg-indigo-100 text-indigo-700 ring-1 ring-inset ring-indigo-600/20';
            case 'SUPPORT': return 'bg-blue-100 text-blue-700 ring-1 ring-inset ring-blue-600/20';
            default: return 'bg-gray-100 text-gray-700 ring-1 ring-inset ring-gray-600/20';
        }
    };

    const getStatusBadgeStyle = (status) => {
        switch (status) {
            case 'ACTIVE': return 'bg-emerald-100 text-emerald-700 ring-1 ring-inset ring-emerald-600/20';
            case 'SUSPENDED': return 'bg-red-100 text-red-700 ring-1 ring-inset ring-red-600/20';
            case 'INVITED': return 'bg-blue-100 text-blue-700 ring-1 ring-inset ring-blue-600/20';
            default: return 'bg-gray-100 text-gray-700 ring-1 ring-inset ring-gray-600/20';
        }
    };

    return (
        <div className="w-full pb-12 space-y-6">
            {/* Header section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-2xl bg-primary-50 dark:bg-primary-950/40 border border-primary-100 dark:border-primary-800/40 flex items-center justify-center text-primary-600 dark:text-primary-400 shrink-0 shadow-xs">
                        <Users className="h-6 w-6" />
                    </div>
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-gray-900 dark:text-white">
                            Platform Users
                        </h1>
                        <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">
                            Global oversight of all accounts and permissions across the platform.
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2.5">
                    <button
                        className="inline-flex items-center justify-center gap-2 rounded-xl bg-white dark:bg-[#12131a] border border-gray-200/80 dark:border-white/10 px-4 py-2.5 text-sm font-semibold text-gray-700 dark:text-gray-200 shadow-xs hover:bg-gray-50 dark:hover:bg-white/5 transition-all active:scale-95"
                        onClick={fetchUsers}
                    >
                        <RefreshCw size={16} className={clsx(loading && "animate-spin")} />
                        Sync Data
                    </button>
                    <button
                        className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary-600 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-primary-600/20 hover:bg-primary-700 transition-all active:scale-95"
                        onClick={() => {/* TODO: Create user modal */ }}
                    >
                        <Plus size={18} />
                        New User
                    </button>
                </div>
            </div>

            {/* Stats Overview */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                    { label: 'Total Users', value: stats.total, icon: Users, sub: 'Registered accounts' },
                    { label: 'Active Users', value: users.filter(u => u.status === 'ACTIVE').length + '+', icon: UserCheck, sub: 'Currently active' },
                    { label: 'Suspended Users', value: users.filter(u => u.status === 'SUSPENDED').length, icon: ShieldAlert, sub: 'Restricted access' },
                    { label: 'Multi-Tenant', value: tenants.length, icon: Globe, sub: 'Associated tenants' },
                ].map((stat, i) => {
                    const Icon = stat.icon;
                    return (
                        <div key={i} className="platform-panel-dark rounded-2xl p-5 border border-gray-200/80 dark:border-white/10 shadow-xs relative overflow-hidden transition-all hover:border-primary-500/30 flex flex-col justify-between">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{stat.label}</span>
                                <div className="h-8 w-8 rounded-xl bg-primary-50 dark:bg-primary-950/50 border border-primary-100 dark:border-primary-800/40 flex items-center justify-center text-primary-600 dark:text-primary-400">
                                    <Icon className="h-4 w-4" />
                                </div>
                            </div>
                            <div className="mt-3">
                                <div className="text-3xl font-black text-gray-900 dark:text-white tracking-tight">
                                    {stat.value}
                                </div>
                                <span className="text-xs text-gray-400 dark:text-gray-500 font-medium">{stat.sub}</span>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Filters bar */}
            <div className="bg-white dark:bg-[#0c0d12] p-3 rounded-2xl border border-gray-200/80 dark:border-white/10 shadow-xs flex flex-col xl:flex-row gap-3 items-stretch xl:items-center justify-between">
                <div className="relative flex-1">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 h-4 w-4" />
                    <input
                        type="text"
                        placeholder="Search name, email or ID..."
                        value={search}
                        onChange={(e) => { setSearch(e.target.value); setPagination(p => ({ ...p, page: 1 })); }}
                        className="w-full bg-gray-50/80 dark:bg-white/[0.03] border border-gray-200/80 dark:border-white/10 rounded-xl pl-10 pr-4 py-2 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 transition-all font-medium"
                    />
                </div>

                <div className="flex flex-wrap items-center gap-2.5">
                    <select
                        value={roleFilter}
                        onChange={(e) => { setRoleFilter(e.target.value); setPagination(p => ({ ...p, page: 1 })); }}
                        className="bg-gray-50/80 dark:bg-white/[0.03] border border-gray-200/80 dark:border-white/10 rounded-xl px-3 py-2 text-sm text-gray-700 dark:text-gray-300 focus:outline-none focus:border-primary-500 transition-all font-medium"
                    >
                        <option value="">All Roles</option>
                        <option value="SUPER_ADMIN">Super Admin</option>
                        <option value="ADMIN">Admin</option>
                        <option value="SUPPORT">Support</option>
                    </select>

                    <select
                        value={tenantFilter}
                        onChange={(e) => { setTenantFilter(e.target.value); setPagination(p => ({ ...p, page: 1 })); }}
                        className="bg-gray-50/80 dark:bg-white/[0.03] border border-gray-200/80 dark:border-white/10 rounded-xl px-3 py-2 text-sm text-gray-700 dark:text-gray-300 focus:outline-none focus:border-primary-500 transition-all font-medium max-w-[180px]"
                    >
                        <option value="">All Tenants</option>
                        <option value="null">Platform Only</option>
                        {tenants.map(t => (
                            <option key={t.id} value={t.id}>{t.name}</option>
                        ))}
                    </select>

                    <select
                        value={statusFilter}
                        onChange={(e) => { setStatusFilter(e.target.value); setPagination(p => ({ ...p, page: 1 })); }}
                        className="bg-gray-50/80 dark:bg-white/[0.03] border border-gray-200/80 dark:border-white/10 rounded-xl px-3 py-2 text-sm text-gray-700 dark:text-gray-300 focus:outline-none focus:border-primary-500 transition-all font-medium"
                    >
                        <option value="">Status</option>
                        <option value="ACTIVE">Active</option>
                        <option value="SUSPENDED">Suspended</option>
                        <option value="INVITED">Invited</option>
                    </select>

                    <button
                        onClick={clearFilters}
                        className="px-3.5 py-2 text-sm font-semibold text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white rounded-xl hover:bg-gray-100 dark:hover:bg-white/5 transition-all"
                    >
                        Reset
                    </button>
                </div>
            </div>

            {/* Users Table */}
            <div className="bg-white dark:bg-[#0c0d12] rounded-2xl border border-gray-200/80 dark:border-white/10 shadow-xs overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-100 dark:divide-white/5">
                        <thead className="bg-gray-50/75 dark:bg-white/[0.02]">
                            <tr>
                                <th scope="col" className="px-6 py-4 text-left text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">User Profile</th>
                                <th scope="col" className="px-6 py-4 text-left text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Access Role</th>
                                <th scope="col" className="hidden lg:table-cell px-6 py-4 text-left text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Assigned Tenant</th>
                                <th scope="col" className="px-6 py-4 text-left text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Current Status</th>
                                <th scope="col" className="hidden xl:table-cell px-6 py-4 text-left text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider text-center">Registration</th>
                                <th scope="col" className="px-6 py-4 text-right text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Management</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-white/5 bg-transparent">
                            {loading ? (
                                Array.from({ length: 5 }).map((_, i) => (
                                    <tr key={i} className="animate-pulse">
                                        <td colSpan="6" className="px-6 py-6"><div className="h-4 bg-gray-100 dark:bg-white/5 rounded-full w-full"></div></td>
                                    </tr>
                                ))
                            ) : users.length === 0 ? (
                                <tr>
                                    <td colSpan="6" className="px-6 py-16 text-center">
                                        <div className="flex flex-col items-center">
                                            <div className="bg-gray-50 dark:bg-white/5 p-4 rounded-2xl mb-3 border border-gray-100 dark:border-white/5">
                                                <Users size={32} className="text-gray-400 dark:text-gray-500" />
                                            </div>
                                            <p className="text-gray-600 dark:text-gray-300 font-bold">No matching users found.</p>
                                            <p className="text-gray-400 text-xs mt-1">Try adjusting your filters or search keywords.</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                users.map(user => (
                                    <tr key={user.id} className="hover:bg-gray-50/60 dark:hover:bg-white/[0.02] transition-colors group">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center gap-3.5">
                                                <div className="h-9 w-9 rounded-xl bg-primary-50 dark:bg-primary-950/40 text-primary-600 dark:text-primary-400 flex items-center justify-center font-black text-xs uppercase border border-primary-100 dark:border-primary-800/30">
                                                    {user.name ? user.name.substring(0, 2) : user.email.substring(0, 2)}
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="text-sm font-bold text-gray-900 dark:text-white">{user.name || 'No Name'}</span>
                                                    <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">{user.email}</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={clsx("inline-flex items-center px-2.5 py-1 rounded-lg text-[10px] font-black tracking-tight uppercase shadow-xs", getRoleBadgeStyle(user.role))}>
                                                {user.role}
                                            </span>
                                        </td>
                                        <td className="hidden lg:table-cell px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center gap-2">
                                                <div className="h-2 w-2 rounded-full bg-primary-400"></div>
                                                <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">{user.tenant?.name || 'Platform'}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={clsx("inline-flex items-center px-2.5 py-1 rounded-lg text-[10px] font-black tracking-tight uppercase shadow-xs", getStatusBadgeStyle(user.status))}>
                                                {user.status}
                                            </span>
                                        </td>
                                        <td className="hidden xl:table-cell px-6 py-4 whitespace-nowrap text-center">
                                            <span className="text-xs font-mono font-medium text-gray-500 dark:text-gray-400">
                                                {new Date(user.createdAt).toLocaleDateString()}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right">
                                            <div className="flex items-center justify-end gap-1.5 opacity-80 group-hover:opacity-100 transition-opacity">
                                                <button
                                                    onClick={() => handleImpersonate(user.id, user.name || user.email)}
                                                    className="p-1.5 text-gray-400 hover:text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-950/40 rounded-xl transition-all"
                                                    title="Impersonate"
                                                >
                                                    <Eye size={17} />
                                                </button>
                                                <button
                                                    onClick={() => handleStatusToggle(user.id, user.status)}
                                                    className={clsx(
                                                        "p-1.5 rounded-xl transition-all",
                                                        user.status === 'ACTIVE' ? "text-gray-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/40" : "text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
                                                    )}
                                                    title={user.status === 'ACTIVE' ? "Suspend" : "Activate"}
                                                >
                                                    {user.status === 'ACTIVE' ? <UserMinus size={17} /> : <UserCheck size={17} />}
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(user.id, user.name || user.email)}
                                                    disabled={user.role === 'SUPER_ADMIN'}
                                                    className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-xl transition-all disabled:opacity-20"
                                                    title="Delete"
                                                >
                                                    <Trash2 size={17} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination Component */}
                <Pagination
                    pagination={pagination}
                    onPageChange={handlePageChange}
                    onLimitChange={(newLimit) => setPagination(prev => ({ ...prev, limit: newLimit, page: 1 }))}
                    itemName="users"
                />
            </div>
        </div>
    );
};

export default AllUsersPage;
