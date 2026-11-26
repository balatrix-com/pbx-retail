import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import { Building2, Users, Shield, Eye, Ban, CheckCircle, AlertTriangle, ChevronRight, Briefcase, Wallet, CreditCard, Trash2, Key, Search, RefreshCw, UserCheck, ShieldCheck, Mail, ArrowRight } from 'lucide-react';
import ActivityModal from '../../components/admin/ActivityModal';
import Pagination from '../../components/common/Pagination';
import { clsx } from 'clsx';

const SuperAdminUsers = () => {
    const { user, isSuperAdmin, impersonateUser } = useAuth();
    const [tenants, setTenants] = useState([]);
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [usersLoading, setUsersLoading] = useState(false);
    const [selectedTenant, setSelectedTenant] = useState(null);
    const [tenantSearch, setTenantSearch] = useState('');
    
    // Pagination for Tenants
    const [tenantPagination, setTenantPagination] = useState({
        page: 1,
        limit: 20,
        total: 0,
        totalPages: 1
    });

    // UI State
    const [expandedAdmin, setExpandedAdmin] = useState(null);
    const [selectedUserForActivity, setSelectedUserForActivity] = useState(null);
    const [showWalletModal, setShowWalletModal] = useState(false);
    const [walletForm, setWalletForm] = useState({ amount: '', type: 'CREDIT', description: 'Manual Adjustment' });


    useEffect(() => {
        if (isSuperAdmin) {
            fetchTenants();
        }
    }, [isSuperAdmin, tenantPagination.page, tenantSearch]);

    const fetchTenants = async () => {
        try {
            setLoading(true);
            const params = new URLSearchParams({
                page: tenantPagination.page.toString(),
                limit: tenantPagination.limit.toString(),
                ...(tenantSearch && { search: tenantSearch })
            });
            const response = await api.get(`/tenants?${params}`);
            setTenants(response.data.data || []);
            setTenantPagination(prev => ({
                ...prev,
                total: response.data.pagination?.total || 0,
                totalPages: response.data.pagination?.totalPages || 1
            }));
        } catch (error) {
            console.error('Failed to fetch tenants:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchUsersForTenant = async (tenantId) => {
        try {
            setUsersLoading(true);
            const response = await api.get(`/users?tenantId=${tenantId}&limit=100`);
            setUsers(response.data.data || response.data);
            setSelectedTenant(tenantId);
            setExpandedAdmin(null);
        } catch (error) {
            console.error('Failed to fetch users:', error);
        } finally {
            setUsersLoading(false);
        }
    };

    const handleWalletUpdate = async (e) => {
        e.preventDefault();
        if (!selectedTenant) return;
        try {
            await api.post('/wallet/internal-adjust', {
                targetTenantId: selectedTenant,
                amount: Number(walletForm.amount),
                type: walletForm.type,
                description: walletForm.description
            });
            alert('Wallet updated successfully');
            setShowWalletModal(false);
            setWalletForm({ amount: '', type: 'CREDIT', description: 'Manual Adjustment' });
        } catch (error) {
            console.error('Wallet update failed:', error);
            alert('Failed to update wallet');
        }
    };

    const handleSuspendUser = async (userId, currentStatus) => {
        const newStatus = currentStatus === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
        if (!window.confirm(`Are you sure you want to ${newStatus === 'SUSPENDED' ? 'suspend' : 'activate'} this user?`)) return;

        try {
            await api.patch(`/users/${userId}/status`, { status: newStatus });
            fetchUsersForTenant(selectedTenant);
        } catch (error) {
            console.error('Failed to update status:', error);
        }
    };

    const handleDeleteUser = async (userId) => {
        if (!window.confirm('⚠️ PERMANENT DELETE: This action cannot be undone.')) return;
        try {
            await api.delete(`/users/${userId}`);
            fetchUsersForTenant(selectedTenant);
        } catch (error) {
            console.error('Failed to delete user:', error);
        }
    };

    const handleDeleteTenant = async (tenantId) => {
        if (!window.confirm('⚠️ CRITICAL: Delete TENANT and ALL DATA?')) return;
        try {
            await api.delete(`/tenants/${tenantId}`);
            fetchTenants();
            if (selectedTenant === tenantId) {
                setSelectedTenant(null);
                setUsers([]);
            }
        } catch (error) {
            console.error('Failed to delete tenant:', error);
        }
    };

    const handleImpersonate = async (userId) => {
        if (!window.confirm('Open impersonation session?')) return;
        try {
            const response = await api.post(`/users/impersonate/${userId}`);
            const { ticket } = response.data;
            window.open(`/impersonate?ticket=${encodeURIComponent(ticket)}`, '_blank');
        } catch (error) {
            console.error('Impersonation error:', error);
        }
    };

    const handleResetPassword = async (userId, userEmail) => {
        const newPassword = window.prompt(`New password for ${userEmail}:`);
        if (!newPassword || newPassword.trim().length < 6) return;
        try {
            await api.patch(`/users/${userId}/reset-password`, { password: newPassword });
            alert('Password reset successfully.');
        } catch (error) {
            console.error('Reset failed:', error);
        }
    };

    if (!isSuperAdmin) return <div className="p-8 font-bold text-red-500">Access Denied</div>;

    const admins = users.filter(u => u.role === 'ADMIN' || u.role === 'SUPER_ADMIN');
    const supportUsers = users.filter(u => u.role === 'SUPPORT');

    return (
        <div className="w-full pb-16 space-y-7 animate-in fade-in duration-300 max-w-7xl mx-auto">
            {/* Header Banner */}
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-teal-700 via-teal-600 to-emerald-600 p-8 text-white shadow-xl shadow-teal-900/15">
                <div className="absolute top-0 right-0 -mt-10 -mr-10 w-80 h-80 rounded-full bg-white/10 blur-2xl pointer-events-none" />
                <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                    <div className="space-y-1.5 max-w-2xl">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 backdrop-blur-md text-xs font-semibold tracking-wide border border-white/20">
                            <ShieldCheck size={14} className="text-teal-200" />
                            <span>Identity Directory & Access Control</span>
                        </div>
                        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                            User Management & Directory
                        </h1>
                        <p className="text-teal-100 text-xs sm:text-sm font-medium">
                            Global authority over all client organizations, tenant administrators, support operators, and staff credentials.
                        </p>
                    </div>

                    <div className="flex items-center gap-3">
                        <button
                            onClick={fetchTenants}
                            disabled={loading}
                            className="inline-flex items-center gap-2 rounded-2xl bg-white/15 hover:bg-white/25 border border-white/20 px-4 py-2.5 text-xs font-bold text-white transition-all shadow-sm active:scale-95 cursor-pointer disabled:opacity-50"
                        >
                            <RefreshCw size={14} className={`text-teal-200 ${loading ? 'animate-spin' : ''}`} />
                            <span>Refresh</span>
                        </button>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                {/* Left Panel: Tenant Explorer Sidebar (4 cols) */}
                <div className="lg:col-span-4 flex flex-col rounded-3xl bg-white dark:bg-[#0c0e17] border border-slate-200/80 dark:border-white/10 shadow-sm overflow-hidden backdrop-blur-sm">
                    {/* Sidebar Header & Search */}
                    <div className="p-4 sm:p-5 space-y-3 border-b border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-white/[0.01]">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Building2 size={16} className="text-teal-600 dark:text-teal-400" />
                                <h2 className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-wider font-mono">
                                    Tenant Directory
                                </h2>
                            </div>
                            <span className="text-[10px] font-mono font-bold text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-white/5 px-2 py-0.5 rounded-full border border-slate-200/60 dark:border-white/5">
                                {tenantPagination.total || tenants.length} accounts
                            </span>
                        </div>
                        <div className="relative">
                            <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-slate-400" />
                            <input 
                                type="text" 
                                placeholder="Search organization by name or ID..."
                                value={tenantSearch}
                                onChange={(e) => { setTenantSearch(e.target.value); setTenantPagination(p => ({ ...p, page: 1 })); }}
                                className="w-full pl-9 pr-3.5 py-2 bg-white dark:bg-[#121420] border border-slate-200 dark:border-white/10 rounded-xl text-xs font-semibold text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500 transition-all shadow-2xs"
                            />
                        </div>
                    </div>

                    {/* Tenant List */}
                    <div className="max-h-[560px] overflow-y-auto p-3 space-y-1.5 custom-scrollbar">
                        {/* Platform Users Option */}
                        <button
                            onClick={() => fetchUsersForTenant('null')}
                            className={clsx(
                                "w-full flex items-center justify-between p-3 rounded-2xl transition-all group cursor-pointer text-left border",
                                selectedTenant === 'null' 
                                    ? "bg-gradient-to-r from-teal-600 to-teal-500 text-white border-teal-500 shadow-md shadow-teal-600/20" 
                                    : "bg-slate-50/60 dark:bg-white/[0.02] border-slate-200/60 dark:border-white/5 hover:border-teal-500/40 hover:bg-white dark:hover:bg-white/[0.05] text-slate-700 dark:text-slate-300"
                            )}
                        >
                            <div className="flex items-center gap-3 min-w-0 pr-2">
                                <div className={clsx(
                                    "w-9 h-9 rounded-xl flex items-center justify-center shrink-0 text-xs font-black shadow-xs",
                                    selectedTenant === 'null' ? "bg-white/20 text-white" : "bg-teal-50 dark:bg-teal-500/10 text-teal-700 dark:text-teal-300 border border-teal-100 dark:border-teal-500/20"
                                )}>
                                    <Shield size={16} />
                                </div>
                                <div className="min-w-0">
                                    <p className="text-xs font-bold uppercase tracking-tight truncate font-display">Platform Core</p>
                                    <p className={clsx("text-[10px] font-medium truncate font-sans", selectedTenant === 'null' ? "text-teal-100" : "text-slate-400")}>
                                        Global Super Admins
                                    </p>
                                </div>
                            </div>
                            <ArrowRight size={14} className={clsx("transition-transform shrink-0", selectedTenant === 'null' ? "translate-x-0" : "-translate-x-1 opacity-0 group-hover:opacity-100 group-hover:translate-x-0")} />
                        </button>

                        <div className="pt-2 pb-1 px-2">
                            <span className="text-[10px] font-mono uppercase tracking-wider font-extrabold text-slate-400 dark:text-slate-500">
                                Client Organizations
                            </span>
                        </div>

                        {loading ? (
                            Array.from({ length: 6 }).map((_, i) => (
                                <div key={i} className="h-12 bg-slate-100/70 dark:bg-white/5 animate-pulse rounded-2xl mb-1.5" />
                            ))
                        ) : tenants.length === 0 ? (
                            <p className="py-10 text-center text-xs font-medium text-slate-400 italic">No tenants matching search</p>
                        ) : (
                            tenants.map(t => {
                                const isSelected = selectedTenant === t.id;
                                return (
                                    <button
                                        key={t.id}
                                        onClick={() => fetchUsersForTenant(t.id)}
                                        className={clsx(
                                            "w-full flex items-center justify-between p-3 rounded-2xl transition-all group mb-1 cursor-pointer text-left border",
                                            isSelected 
                                                ? "bg-gradient-to-r from-teal-600 to-teal-500 text-white border-teal-500 shadow-md shadow-teal-600/20" 
                                                : "bg-slate-50/50 dark:bg-white/[0.02] border-slate-200/60 dark:border-white/5 hover:border-teal-500/40 hover:bg-white dark:hover:bg-white/[0.05] text-slate-700 dark:text-slate-300"
                                        )}
                                    >
                                        <div className="flex items-center gap-3 min-w-0 pr-2">
                                            <div className={clsx(
                                                "w-9 h-9 rounded-xl flex items-center justify-center shrink-0 font-mono font-bold text-xs shadow-xs",
                                                isSelected ? "bg-white/20 text-white" : "bg-slate-100 dark:bg-white/[0.04] text-slate-700 dark:text-slate-300 border border-slate-200/80 dark:border-white/10"
                                            )}>
                                                {t.name ? t.name.substring(0, 2).toUpperCase() : 'TN'}
                                            </div>
                                            <div className="overflow-hidden min-w-0">
                                                <p className="text-xs font-bold truncate font-display">{t.name}</p>
                                                <p className={clsx("text-[10px] font-mono truncate uppercase tracking-wider", isSelected ? "text-teal-100" : "text-slate-400 dark:text-slate-500")}>
                                                    {t.customerCode || t.id}
                                                </p>
                                            </div>
                                        </div>
                                        <ArrowRight size={14} className={clsx("transition-transform shrink-0", isSelected ? "translate-x-0" : "-translate-x-1 opacity-0 group-hover:opacity-100 group-hover:translate-x-0")} />
                                    </button>
                                );
                            })
                        )}
                    </div>

                    {/* Tenant Pagination */}
                    {tenantPagination.totalPages > 1 && (
                        <div className="p-3 border-t border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-white/[0.01] flex items-center justify-between">
                            <button 
                                disabled={tenantPagination.page === 1}
                                onClick={() => setTenantPagination(p => ({ ...p, page: p.page - 1 }))}
                                className="p-1.5 rounded-xl bg-white dark:bg-[#121420] shadow-2xs text-slate-400 disabled:opacity-20 hover:bg-slate-100 dark:hover:bg-white/10 transition-all border border-slate-200 dark:border-white/10 cursor-pointer"
                            >
                                <ChevronRight size={14} className="rotate-180" />
                            </button>
                            <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-widest">{tenantPagination.page} / {tenantPagination.totalPages}</span>
                            <button 
                                disabled={tenantPagination.page === tenantPagination.totalPages}
                                onClick={() => setTenantPagination(p => ({ ...p, page: p.page + 1 }))}
                                className="p-1.5 rounded-xl bg-white dark:bg-[#121420] shadow-2xs text-slate-400 disabled:opacity-20 hover:bg-slate-100 dark:hover:bg-white/10 transition-all border border-slate-200 dark:border-white/10 cursor-pointer"
                            >
                                <ChevronRight size={14} />
                            </button>
                        </div>
                    )}
                </div>

                {/* Right Panel: Content (8 cols) */}
                <div className="lg:col-span-8 space-y-6">
                    {!selectedTenant ? (
                        <div className="bg-white dark:bg-[#0c0e17] rounded-3xl border border-slate-200/80 dark:border-white/10 p-16 flex flex-col items-center justify-center text-center shadow-xs">
                            <div className="w-16 h-16 bg-teal-50 dark:bg-teal-500/10 text-teal-600 dark:text-teal-400 rounded-3xl border border-teal-100 dark:border-teal-500/20 flex items-center justify-center mb-4 shadow-sm">
                                <Building2 size={32} />
                            </div>
                            <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight font-display mb-1.5">Select a Tenant</h3>
                            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm font-sans">
                                Select an organization from the directory on the left to inspect its credentials, audit sessions, adjust wallet float, or impersonate administrators.
                            </p>
                        </div>
                    ) : usersLoading ? (
                        <div className="bg-white dark:bg-[#0c0e17] rounded-3xl border border-slate-200/80 dark:border-white/10 p-16 flex flex-col items-center justify-center shadow-xs">
                            <RefreshCw className="h-7 w-7 text-teal-600 animate-spin mb-3" />
                            <p className="text-slate-400 font-bold uppercase tracking-widest text-[11px] font-mono">Synchronizing Access...</p>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {/* Tenant Hero Banner */}
                            <div className="bg-white dark:bg-[#0c0e17] p-6 rounded-3xl border border-slate-200/80 dark:border-white/10 shadow-xs relative overflow-hidden group">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2.5 flex-wrap">
                                            <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight font-display">
                                                {selectedTenant === 'null' ? 'Platform Authority' : (tenants.find(t => t.id === selectedTenant)?.name || 'Tenant')}
                                            </h2>
                                            {selectedTenant !== 'null' && (
                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold font-mono uppercase tracking-wider bg-slate-100 dark:bg-white/[0.04] text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-white/10">
                                                    {tenants.find(t => t.id === selectedTenant)?.customerCode || selectedTenant}
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-1 font-sans">
                                            {selectedTenant === 'null' ? 'Managing global security, super admin credentials, and system-wide privileges.' : `Direct oversight of organization, administrators, and associated staff accounts.`}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0">
                                        {selectedTenant !== 'null' && (
                                            <button
                                                onClick={() => setShowWalletModal(true)}
                                                className="inline-flex items-center gap-1.5 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/20 px-3.5 py-2 rounded-xl font-bold text-xs shadow-xs hover:bg-emerald-100 dark:hover:bg-emerald-500/20 transition-all active:scale-95 cursor-pointer"
                                            >
                                                <Wallet size={15} />
                                                Wallet Adjust
                                            </button>
                                        )}
                                        {selectedTenant !== 'null' && (
                                            <button
                                                onClick={() => handleDeleteTenant(selectedTenant)}
                                                className="p-2 bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-500/20 rounded-xl hover:bg-rose-100 dark:hover:bg-rose-500/20 transition-all active:scale-95 cursor-pointer"
                                                title="Delete Tenant"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Grouped User Cards */}
                            <div className="space-y-6">
                                {/* Admins Group */}
                                {admins.length > 0 && (
                                    <section className="space-y-3">
                                        <div className="flex items-center gap-2 px-1">
                                            <Shield size={16} className="text-teal-600 dark:text-teal-400" />
                                            <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider font-mono">
                                                Administrators ({admins.length})
                                            </h3>
                                        </div>
                                        <div className="grid grid-cols-1 gap-3.5">
                                            {admins.map(admin => (
                                                <AdminCard
                                                    key={admin.id}
                                                    admin={admin}
                                                    supportUsers={supportUsers.filter(s => s.adminId === admin.id)}
                                                    expanded={expandedAdmin === admin.id}
                                                    onToggle={() => setExpandedAdmin(expandedAdmin === admin.id ? null : admin.id)}
                                                    onSuspend={handleSuspendUser}
                                                    onImpersonate={handleImpersonate}
                                                    onViewActivity={() => setSelectedUserForActivity(admin)}
                                                    onDelete={handleDeleteUser}
                                                    onResetPassword={handleResetPassword}
                                                />
                                            ))}
                                        </div>
                                    </section>
                                )}

                                {/* Support/Staff Group */}
                                {supportUsers.filter(u => !u.adminId).length > 0 && (
                                    <section className="space-y-3">
                                        <div className="flex items-center gap-2 px-1 pt-2">
                                            <Users size={16} className="text-slate-400" />
                                            <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider font-mono">
                                                Staff & Support ({supportUsers.filter(u => !u.adminId).length})
                                            </h3>
                                        </div>
                                        <div className="grid grid-cols-1 gap-3">
                                            {supportUsers.filter(u => !u.adminId).map(staff => (
                                                <UserCard
                                                    key={staff.id}
                                                    user={staff}
                                                    onSuspend={handleSuspendUser}
                                                    onViewActivity={() => setSelectedUserForActivity(staff)}
                                                    onDelete={handleDeleteUser}
                                                    onResetPassword={handleResetPassword}
                                                />
                                            ))}
                                        </div>
                                    </section>
                                )}

                                {users.length === 0 && !usersLoading && (
                                    <div className="flex flex-col items-center justify-center py-16 bg-white dark:bg-[#0c0e17] rounded-3xl border border-slate-200/80 dark:border-white/10 text-center shadow-xs">
                                        <Users size={36} className="text-slate-300 dark:text-slate-600 mb-3" />
                                        <p className="text-slate-500 dark:text-slate-400 font-bold uppercase tracking-widest text-xs font-mono">No users provisioned for this tenant</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Modals */}
            {selectedUserForActivity && (
                <ActivityModal
                    userId={selectedUserForActivity.id}
                    email={selectedUserForActivity.email}
                    onClose={() => setSelectedUserForActivity(null)}
                />
            )}

            {/* Redesigned Wallet Update Modal */}
            {showWalletModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-md transition-opacity" onClick={() => setShowWalletModal(false)} />
                    <div className="relative bg-white dark:bg-[#0c0e17] rounded-3xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-200/80 dark:border-white/10 ring-1 ring-black/5 animate-in zoom-in-95 duration-200">
                        <div className="p-7">
                            <div className="flex items-center gap-3.5 mb-6 pb-4 border-b border-slate-100 dark:border-white/5">
                                <div className="bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 p-3 rounded-2xl border border-emerald-100 dark:border-emerald-500/20 shadow-xs">
                                    <Wallet className="h-6 w-6" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-black text-slate-900 dark:text-white tracking-tight font-display">Wallet Adjustment</h3>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 font-sans">Credit or debit tenant operational float</p>
                                </div>
                            </div>
                            <form onSubmit={handleWalletUpdate} className="space-y-4">
                                <div>
                                    <label className="text-[10px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-widest block mb-1.5 font-mono">Amount (USD)</label>
                                    <div className="relative">
                                        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-mono font-bold text-sm">$</span>
                                        <input
                                            type="number" step="0.01"
                                            value={walletForm.amount}
                                            onChange={e => setWalletForm({ ...walletForm, amount: e.target.value })}
                                            required
                                            className="w-full pl-8 pr-4 py-3 bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 rounded-2xl focus:ring-2 focus:ring-emerald-500 font-mono font-black text-lg text-slate-900 dark:text-white"
                                            placeholder="0.00"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="text-[10px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-widest block mb-1.5 font-mono">Transaction Type</label>
                                    <select
                                        className="w-full px-4 py-2.5 bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 rounded-2xl focus:ring-2 focus:ring-emerald-500 font-bold text-xs sm:text-sm text-slate-900 dark:text-white cursor-pointer"
                                        value={walletForm.type}
                                        onChange={e => setWalletForm({ ...walletForm, type: e.target.value })}
                                    >
                                        <option value="CREDIT">Credit (Deposit to Account)</option>
                                        <option value="DEBIT">Debit (Charge Account)</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="text-[10px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-widest block mb-1.5 font-mono">Internal Audit Memo</label>
                                    <input
                                        className="w-full px-4 py-2.5 bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 rounded-2xl focus:ring-2 focus:ring-emerald-500 font-medium text-xs sm:text-sm text-slate-900 dark:text-white"
                                        value={walletForm.description}
                                        onChange={e => setWalletForm({ ...walletForm, description: e.target.value })}
                                        placeholder="e.g. Manual float seed, promo credit"
                                    />
                                </div>
                                <div className="flex gap-2.5 pt-3">
                                    <button
                                        type="button"
                                        onClick={() => setShowWalletModal(false)}
                                        className="flex-1 py-2.5 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300 rounded-xl font-bold text-xs transition-all cursor-pointer"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        className="flex-[2] py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-xs shadow-md shadow-emerald-600/25 active:scale-95 transition-all cursor-pointer"
                                    >
                                        Update Balance
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
};

const AdminCard = ({ admin, supportUsers, expanded, onToggle, onSuspend, onImpersonate, onViewActivity, onDelete, onResetPassword }) => {
    return (
        <div className={clsx(
            "rounded-3xl border transition-all duration-200 overflow-hidden shadow-xs",
            expanded 
                ? "bg-white dark:bg-[#0c0e17] border-teal-500/60 dark:border-teal-500/50 ring-2 ring-teal-500/15" 
                : "bg-white dark:bg-[#0c0e17] border-slate-200/80 dark:border-white/10 hover:border-slate-300 dark:hover:border-white/20"
        )}>
            {/* Admin Header Row */}
            <div 
                className={clsx(
                    "flex flex-col sm:flex-row sm:items-center justify-between p-5 cursor-pointer gap-4 transition-colors select-none",
                    expanded ? "bg-teal-50/40 dark:bg-teal-950/20" : "hover:bg-slate-50/60 dark:hover:bg-white/[0.02]"
                )}
                onClick={onToggle}
            >
                <div className="flex items-center gap-4 min-w-0 flex-1">
                    <div className="w-12 h-12 rounded-2xl bg-teal-50 dark:bg-teal-500/10 text-teal-700 dark:text-teal-300 border border-teal-200/80 dark:border-teal-500/20 flex items-center justify-center font-display font-black text-sm shrink-0 shadow-xs">
                        {admin.name ? admin.name.substring(0, 2).toUpperCase() : <Shield size={18} />}
                    </div>
                    <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap mb-0.5">
                            <span className="text-sm sm:text-base font-black text-slate-900 dark:text-white font-display truncate">
                                {admin.name || admin.email}
                            </span>
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider font-mono bg-teal-50 dark:bg-teal-500/10 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-500/20">
                                {admin.role}
                            </span>
                            <StatusBadge status={admin.status} />
                        </div>
                        <div className="flex items-center gap-3 flex-wrap text-xs text-slate-500 dark:text-slate-400 font-sans">
                            <span className="flex items-center gap-1.5 truncate">
                                <Mail size={13} className="text-slate-400 shrink-0" />
                                {admin.email}
                            </span>
                            <span className="inline-flex items-center gap-1 font-bold font-mono text-[11px] text-teal-600 dark:text-teal-400 bg-teal-50/60 dark:bg-teal-500/10 px-2 py-0.5 rounded-full border border-teal-100 dark:border-teal-500/20">
                                <Users size={12} /> {supportUsers.length} Staff Accounts
                            </span>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                    <span className="text-xs font-bold text-slate-400 dark:text-slate-500 hidden sm:inline font-mono">
                        {expanded ? 'Hide Details' : 'Manage'}
                    </span>
                    <div className={clsx(
                        "w-7 h-7 rounded-xl flex items-center justify-center transition-all bg-slate-100 dark:bg-white/[0.04] text-slate-400",
                        expanded && "rotate-90 bg-teal-600 text-white dark:bg-teal-500"
                    )}>
                        <ChevronRight size={15} />
                    </div>
                </div>
            </div>

            {/* Quick Action Pill Bar */}
            <div className={clsx(
                "px-5 py-3 border-t border-slate-100 dark:border-white/5 flex flex-wrap items-center gap-2",
                expanded ? "bg-white dark:bg-[#0c0e17]" : "bg-slate-50/50 dark:bg-white/[0.01]"
            )}>
                <button
                    onClick={(e) => { e.stopPropagation(); onImpersonate(admin.id); }}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold shadow-xs active:scale-95 transition-all cursor-pointer"
                >
                    <Eye size={13} /> Impersonate
                </button>
                <button
                    onClick={(e) => { e.stopPropagation(); onSuspend(admin.id, admin.status); }}
                    className={clsx(
                        "inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold border transition-all active:scale-95 cursor-pointer",
                        admin.status === 'ACTIVE' 
                            ? "bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-500/20 hover:bg-amber-100" 
                            : "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20 hover:bg-emerald-100"
                    )}
                >
                    {admin.status === 'ACTIVE' ? <Ban size={13} /> : <CheckCircle size={13} />}
                    {admin.status === 'ACTIVE' ? 'Suspend' : 'Activate'}
                </button>
                <button
                    onClick={(e) => { e.stopPropagation(); onResetPassword(admin.id, admin.email); }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-[#121420] text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-white/5 text-xs font-bold transition-all active:scale-95 cursor-pointer shadow-2xs"
                >
                    <Key size={13} /> Reset
                </button>
                <button
                    onClick={(e) => { e.stopPropagation(); onViewActivity(); }}
                    className="p-1.5 bg-white dark:bg-[#121420] text-slate-400 hover:text-teal-600 dark:hover:text-teal-400 border border-slate-200 dark:border-white/10 rounded-xl transition-all active:scale-95 cursor-pointer shadow-2xs"
                    title="Audit Activity Logs"
                >
                    <RefreshCw size={14} />
                </button>
                <div className="flex-grow" />
                <button
                    onClick={(e) => { e.stopPropagation(); onDelete(admin.id); }}
                    disabled={admin.role === 'SUPER_ADMIN'}
                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10 border border-transparent hover:border-rose-200 rounded-xl transition-all active:scale-95 disabled:opacity-20 cursor-pointer"
                    title="Delete User Permanently"
                >
                    <Trash2 size={15} />
                </button>
            </div>

            {/* Managed Staff Accordion */}
            {expanded && (
                <div className="p-5 border-t border-slate-100 dark:border-white/5 bg-slate-50/70 dark:bg-[#07090f] space-y-3">
                    <div className="flex items-center justify-between pb-1">
                        <h4 className="text-[11px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider font-mono">
                            Managed Staff Team Members ({supportUsers.length})
                        </h4>
                        <span className="text-[11px] text-slate-400">Directly reports to this administrator</span>
                    </div>
                    {supportUsers.length === 0 ? (
                        <div className="p-6 text-center rounded-2xl border border-dashed border-slate-200 dark:border-white/10 bg-white/50 dark:bg-white/[0.01]">
                            <p className="text-xs text-slate-400 font-medium italic">No staff or operator accounts currently report to this administrator.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 gap-2.5">
                            {supportUsers.map(support => (
                                <UserCard
                                    key={support.id}
                                    user={support}
                                    onSuspend={onSuspend}
                                    onViewActivity={onViewActivity}
                                    onDelete={onDelete}
                                    onResetPassword={onResetPassword}
                                />
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

const UserCard = ({ user, onSuspend, onViewActivity, onDelete, onResetPassword }) => {
    return (
        <div className="bg-white dark:bg-[#0c0e17] rounded-2xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border border-slate-200/70 dark:border-white/5 shadow-2xs group hover:border-teal-500/30 transition-all">
            <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-white/[0.04] text-slate-700 dark:text-slate-300 border border-slate-200/80 dark:border-white/10 flex items-center justify-center font-display font-black text-xs shrink-0 group-hover:bg-teal-600 group-hover:text-white transition-all shadow-xs">
                    {user.name ? user.name.substring(0, 2).toUpperCase() : user.email.substring(0, 2).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap mb-0.5">
                        <p className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate font-display">
                            {user.name || user.email}
                        </p>
                        <span className="inline-flex items-center px-1.5 py-0.2 rounded-md text-[9px] font-extrabold uppercase tracking-wider font-mono bg-slate-100 dark:bg-white/[0.04] text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-white/10">
                            {user.role}
                        </span>
                        <StatusBadge status={user.status} />
                    </div>
                    <p className="text-[11px] text-slate-400 dark:text-slate-500 truncate font-sans">{user.email}</p>
                </div>
            </div>
            
            <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
                <button
                    onClick={() => onSuspend(user.id, user.status)}
                    className={clsx(
                        "p-1.5 rounded-lg border transition-all cursor-pointer",
                        user.status === 'ACTIVE' 
                            ? "border-transparent text-slate-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-500/10" 
                            : "border-emerald-200 dark:border-emerald-500/20 text-emerald-600 bg-emerald-50 dark:bg-emerald-500/10"
                    )}
                    title={user.status === 'ACTIVE' ? 'Suspend Account' : 'Activate Account'}
                >
                    {user.status === 'ACTIVE' ? <Ban size={14} /> : <CheckCircle size={14} />}
                </button>
                <button
                    onClick={() => onResetPassword(user.id, user.email)}
                    className="p-1.5 text-slate-400 hover:text-teal-600 dark:hover:text-teal-400 hover:bg-teal-50 dark:hover:bg-teal-500/10 rounded-lg transition-all cursor-pointer"
                    title="Reset Password"
                >
                    <Key size={14} />
                </button>
                <button
                    onClick={() => onViewActivity()}
                    className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/5 rounded-lg transition-all cursor-pointer"
                    title="Audit Activity"
                >
                    <RefreshCw size={14} />
                </button>
                <button
                    onClick={() => onDelete(user.id)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-lg transition-all cursor-pointer"
                    title="Delete Account"
                >
                    <Trash2 size={14} />
                </button>
            </div>
        </div>
    );
};

const StatusBadge = ({ status }) => {
    const isAct = status === 'ACTIVE';
    const isInv = status === 'INVITED';
    return (
        <span className={clsx(
            "inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider font-mono border",
            isAct 
                ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20" 
                : isInv 
                    ? "bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-500/20" 
                    : "bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-500/20"
        )}>
            {status}
        </span>
    );
};

export default SuperAdminUsers;
