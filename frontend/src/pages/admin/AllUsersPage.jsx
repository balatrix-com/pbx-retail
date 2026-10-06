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
        limit: 20,
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
    }, [pagination.page, search, roleFilter, tenantFilter, statusFilter]);

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
            const { accessToken, refreshToken } = response.data;
            const url = `/impersonate?token=${accessToken}&refresh=${refreshToken}`;
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
        <div className="max-w-7xl mx-auto pb-12 space-y-8 px-4 sm:px-6 lg:px-8">
            {/* Header section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h1 className="text-3xl font-black tracking-tight text-gray-900 flex items-center gap-3">
                        <div className="bg-primary-600 p-2 rounded-2xl shadow-lg shadow-primary-600/20">
                            <Users className="text-white h-7 w-7" />
                        </div>
                        Platform Users
                    </h1>
                    <p className="mt-2 text-gray-500 font-medium">Global oversight of all accounts and permissions across the platform.</p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 rounded-2xl bg-white border border-gray-200 px-5 py-3 text-sm font-bold text-gray-700 shadow-sm hover:bg-gray-50 transition-all active:scale-95"
                        onClick={fetchUsers}
                    >
                        <RefreshCw size={18} className={clsx(loading && "animate-spin")} />
                        Sync Data
                    </button>
                    <button
                        className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 rounded-2xl bg-primary-600 px-6 py-3 text-sm font-black text-white shadow-xl shadow-primary-600/20 hover:bg-primary-700 transition-all active:scale-95"
                        onClick={() => {/* TODO: Create user modal */ }}
                    >
                        <Plus size={20} />
                        New User
                    </button>
                </div>
            </div>

            {/* Stats Overview */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {[
                    { label: 'Total Users', value: stats.total, icon: Users },
                    { label: 'Active Users', value: users.filter(u => u.status === 'ACTIVE').length + '+', icon: UserCheck },
                    { label: 'Suspended Users', value: users.filter(u => u.status === 'SUSPENDED').length, icon: ShieldAlert },
                    { label: 'Multi-Tenant', value: tenants.length, icon: Globe },
                ].map((stat, i) => {
                    const Icon = stat.icon;
                    return (
                        <div key={i} className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5 flex flex-col relative overflow-hidden group hover:shadow-md transition-all duration-300">
                            <Icon className="absolute -bottom-3 -right-2 h-24 w-24 transform -rotate-12 text-blue-400/30 group-hover:scale-105 transition-transform duration-500 pointer-events-none stroke-[2.2]" />
                            <div className="relative z-10">
                                <div className="flex items-center gap-2.5 mb-2">
                                    <div className="p-1.5 rounded-lg text-blue-500 bg-blue-50 ring-1 ring-blue-500/10 flex items-center justify-center">
                                        <Icon className="h-4 w-4 stroke-[2.2]" />
                                    </div>
                                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">{stat.label}</p>
                                </div>
                                <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-2 tracking-tight">{stat.value}</div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Filters bar */}
            <div className="bg-white rounded-3xl p-6 shadow-sm ring-1 ring-gray-200">
                <div className="flex flex-col xl:flex-row gap-4">
                    <div className="flex-1 relative">
                        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
                            <Search size={20} className="text-gray-400" />
                        </div>
                        <input
                            type="text"
                            placeholder="Search name, email or ID..."
                            value={search}
                            onChange={(e) => { setSearch(e.target.value); setPagination(p => ({ ...p, page: 1 })); }}
                            className="block w-full rounded-2xl border-0 py-3.5 pl-12 pr-4 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-200 focus:ring-2 focus:ring-inset focus:ring-primary-600 sm:text-sm font-bold bg-gray-50/50"
                        />
                    </div>

                    <div className="flex flex-wrap md:flex-nowrap gap-3">
                        <select
                            value={roleFilter}
                            onChange={(e) => { setRoleFilter(e.target.value); setPagination(p => ({ ...p, page: 1 })); }}
                            className="block w-full md:w-44 rounded-2xl border-0 py-3.5 pl-4 pr-10 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-200 focus:ring-2 focus:ring-inset focus:ring-primary-600 sm:text-sm font-bold bg-white"
                        >
                            <option value="">All Roles</option>
                            <option value="SUPER_ADMIN">Super Admin</option>
                            <option value="ADMIN">Admin</option>
                            <option value="SUPPORT">Support</option>
                        </select>

                        <select
                            value={tenantFilter}
                            onChange={(e) => { setTenantFilter(e.target.value); setPagination(p => ({ ...p, page: 1 })); }}
                            className="block w-full md:w-56 rounded-2xl border-0 py-3.5 pl-4 pr-10 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-200 focus:ring-2 focus:ring-inset focus:ring-primary-600 sm:text-sm font-bold bg-white"
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
                            className="block w-full md:w-44 rounded-2xl border-0 py-3.5 pl-4 pr-10 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-200 focus:ring-2 focus:ring-inset focus:ring-primary-600 sm:text-sm font-bold bg-white"
                        >
                            <option value="">Status</option>
                            <option value="ACTIVE">Active</option>
                            <option value="SUSPENDED">Suspended</option>
                            <option value="INVITED">Invited</option>
                        </select>

                        <button
                            onClick={clearFilters}
                            className="flex-1 md:flex-none inline-flex items-center justify-center gap-2 rounded-2xl bg-gray-50 px-5 py-3 text-sm font-bold text-gray-500 hover:bg-gray-100 hover:text-gray-900 transition-all active:scale-95 border border-gray-100"
                        >
                            Reset
                        </button>
                    </div>
                </div>
            </div>

            {/* Users Table */}
            <div className="bg-white rounded-3xl shadow-sm ring-1 ring-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-100">
                        <thead className="bg-gray-50/50">
                            <tr>
                                <th scope="col" className="px-6 py-5 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">User Profile</th>
                                <th scope="col" className="px-6 py-5 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Access Role</th>
                                <th scope="col" className="hidden lg:table-cell px-6 py-5 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Assigned Tenant</th>
                                <th scope="col" className="px-6 py-5 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest">Current Status</th>
                                <th scope="col" className="hidden xl:table-cell px-6 py-5 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Registration</th>
                                <th scope="col" className="px-6 py-5 text-right text-[10px] font-black text-gray-400 uppercase tracking-widest">Management</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50 bg-white">
                            {loading ? (
                                Array.from({ length: 5 }).map((_, i) => (
                                    <tr key={i} className="animate-pulse">
                                        <td colSpan="6" className="px-6 py-8"><div className="h-4 bg-gray-100 rounded-full w-full"></div></td>
                                    </tr>
                                ))
                            ) : users.length === 0 ? (
                                <tr>
                                    <td colSpan="6" className="px-6 py-12 text-center">
                                        <div className="flex flex-col items-center">
                                            <div className="bg-gray-50 p-4 rounded-full mb-4">
                                                <Users size={32} className="text-gray-300" />
                                            </div>
                                            <p className="text-gray-400 font-bold">No matching users found.</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                users.map(user => (
                                    <tr key={user.id} className="hover:bg-gray-50/50 transition-all duration-200 group">
                                        <td className="px-6 py-5 whitespace-nowrap">
                                            <div className="flex items-center gap-4">
                                                <div className="h-10 w-10 rounded-xl bg-primary-50 text-primary-600 flex items-center justify-center font-black text-sm uppercase">
                                                    {user.name ? user.name.substring(0, 2) : user.email.substring(0, 2)}
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="text-sm font-bold text-gray-900">{user.name || 'No Name'}</span>
                                                    <span className="text-xs text-gray-500 font-medium">{user.email}</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-5 whitespace-nowrap">
                                            <span className={clsx("inline-flex items-center px-2.5 py-1 rounded-lg text-[10px] font-black tracking-tight uppercase shadow-sm", getRoleBadgeStyle(user.role))}>
                                                {user.role}
                                            </span>
                                        </td>
                                        <td className="hidden lg:table-cell px-6 py-5 whitespace-nowrap">
                                            <div className="flex items-center gap-2">
                                                <div className="h-2 w-2 rounded-full bg-primary-400"></div>
                                                <span className="text-sm font-bold text-gray-600">{user.tenant?.name || 'Platform'}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-5 whitespace-nowrap">
                                            <span className={clsx("inline-flex items-center px-2.5 py-1 rounded-lg text-[10px] font-black tracking-tight uppercase shadow-sm", getStatusBadgeStyle(user.status))}>
                                                {user.status}
                                            </span>
                                        </td>
                                        <td className="hidden xl:table-cell px-6 py-5 whitespace-nowrap text-center">
                                            <span className="text-xs font-mono font-bold text-gray-400">
                                                {new Date(user.createdAt).toLocaleDateString()}
                                            </span>
                                        </td>
                                        <td className="px-6 py-5 whitespace-nowrap text-right">
                                            <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button
                                                    onClick={() => handleImpersonate(user.id, user.name || user.email)}
                                                    className="p-2 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-xl transition-all"
                                                    title="Impersonate"
                                                >
                                                    <Eye size={18} />
                                                </button>
                                                <button
                                                    onClick={() => handleStatusToggle(user.id, user.status)}
                                                    className={clsx(
                                                        "p-2 rounded-xl transition-all",
                                                        user.status === 'ACTIVE' ? "text-gray-400 hover:text-amber-600 hover:bg-amber-50" : "text-gray-400 hover:text-emerald-600 hover:bg-emerald-50"
                                                    )}
                                                    title={user.status === 'ACTIVE' ? "Suspend" : "Activate"}
                                                >
                                                    {user.status === 'ACTIVE' ? <UserMinus size={18} /> : <UserCheck size={18} />}
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(user.id, user.name || user.email)}
                                                    disabled={user.role === 'SUPER_ADMIN'}
                                                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all disabled:opacity-20"
                                                    title="Delete"
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* New Pagination Component */}
                <div className="px-6">
                    <Pagination
                        pagination={pagination}
                        onPageChange={handlePageChange}
                    />
                </div>
            </div>
        </div>
    );
};

export default AllUsersPage;
