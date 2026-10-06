import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import { Building2, Users, Shield, Eye, Ban, CheckCircle, AlertTriangle, ChevronRight, Briefcase, Wallet, CreditCard, Trash2, Key, Search, RefreshCw, UserCheck, ShieldCheck, Mail, ArrowRight } from 'lucide-react';
import ActivityModal from '../../components/admin/ActivityModal';
import MonitoringExtensionModal from '../../components/admin/MonitoringExtensionModal';
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

    // Monitoring State
    const [showMonitoringModal, setShowMonitoringModal] = useState(false);
    const [monitoringTarget, setMonitoringTarget] = useState(null);

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
            const { accessToken, refreshToken } = response.data;
            window.open(`/impersonate?token=${accessToken}&refresh=${refreshToken}`, '_blank');
        } catch (error) {
            console.error('Impersonation error:', error);
        }
    };

    const handleToggleMonitoring = async (userId, currentValue) => {
        if (!currentValue) {
            setMonitoringTarget(userId);
            setShowMonitoringModal(true);
        } else {
            try {
                await api.patch(`/users/${userId}/permissions`, { monitoringEnabled: false });
                if (selectedTenant) fetchUsersForTenant(selectedTenant);
            } catch (error) {
                console.error('Failed to disable monitoring:', error);
            }
        }
    };

    const handleEnableMonitoring = async ({ monitoringExtension, monitoringSecret }) => {
        if (!monitoringTarget) return;
        try {
            await api.patch(`/users/${monitoringTarget}/permissions`, {
                monitoringEnabled: true,
                monitoringExtension,
                monitoringSecret
            });
            setShowMonitoringModal(false);
            setMonitoringTarget(null);
            if (selectedTenant) fetchUsersForTenant(selectedTenant);
        } catch (error) {
            console.error('Failed to enable monitoring:', error);
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
        <div className="max-w-[1600px] mx-auto h-[calc(100vh-120px)] flex flex-col gap-6 px-4 sm:px-6 lg:px-8">
            <header className="flex-shrink-0">
                <h1 className="text-3xl font-black tracking-tight text-gray-900 flex items-center gap-3">
                    <div className="bg-primary-600 p-2 rounded-2xl shadow-lg shadow-primary-600/20">
                        <ShieldCheck className="text-white h-7 w-7" />
                    </div>
                    Super Admin Control
                </h1>
                <p className="mt-2 text-gray-500 font-medium text-sm">Global authority over all tenants, system administrators, and staff.</p>
            </header>

            <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-4 gap-8">
                {/* Left Panel: Tenant Explorer */}
                <div className="lg:col-span-1 flex flex-col min-h-0 bg-white rounded-[2.5rem] shadow-sm ring-1 ring-gray-200 overflow-hidden">
                    <div className="p-6 space-y-4 border-b border-gray-50">
                        <h2 className="text-sm font-black text-gray-400 uppercase tracking-widest px-1">Tenants</h2>
                        <div className="relative">
                            <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                            <input 
                                type="text" 
                                placeholder="Search..."
                                value={tenantSearch}
                                onChange={(e) => { setTenantSearch(e.target.value); setTenantPagination(p => ({ ...p, page: 1 })); }}
                                className="w-full pl-9 pr-4 py-2 bg-gray-50 border-0 rounded-xl text-xs font-bold focus:ring-2 focus:ring-primary-500 transition-all"
                            />
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 space-y-1 custom-scrollbar">
                        {/* Platform Users Option */}
                        <button
                            onClick={() => fetchUsersForTenant('null')}
                            className={clsx(
                                "w-full flex items-center justify-between p-3 rounded-xl transition-all group",
                                selectedTenant === 'null' 
                                    ? "bg-primary-600 text-white shadow-lg shadow-primary-600/20" 
                                    : "hover:bg-gray-50 text-gray-700"
                            )}
                        >
                            <div className="text-left">
                                <p className="text-xs font-black uppercase tracking-tight">Platform</p>
                                <p className={clsx("text-[10px] font-bold", selectedTenant === 'null' ? "text-primary-100" : "text-gray-400")}>Global Admins</p>
                            </div>
                            <ArrowRight size={14} className={clsx("transition-transform", selectedTenant === 'null' ? "translate-x-0" : "-translate-x-2 opacity-0 group-hover:opacity-100 group-hover:translate-x-0")} />
                        </button>

                        {loading ? (
                            Array.from({ length: 8 }).map((_, i) => (
                                <div key={i} className="h-12 bg-gray-50 animate-pulse rounded-xl mb-1"></div>
                            ))
                        ) : tenants.length === 0 ? (
                            <p className="py-8 text-center text-[10px] font-bold text-gray-400 uppercase italic">No tenants</p>
                        ) : (
                            tenants.map(t => (
                                <button
                                    key={t.id}
                                    onClick={() => fetchUsersForTenant(t.id)}
                                    className={clsx(
                                        "w-full flex items-center justify-between p-3 rounded-xl transition-all group mb-1",
                                        selectedTenant === t.id 
                                            ? "bg-primary-600 text-white shadow-lg shadow-primary-600/20" 
                                            : "hover:bg-gray-50 text-gray-700"
                                    )}
                                >
                                    <div className="text-left overflow-hidden pr-2">
                                        <p className="text-xs font-black truncate">{t.name}</p>
                                        <p className={clsx("text-[10px] font-bold truncate uppercase", selectedTenant === t.id ? "text-primary-100" : "text-gray-400")}>{t.id}</p>
                                    </div>
                                    <ArrowRight size={14} className={clsx("transition-transform flex-shrink-0", selectedTenant === t.id ? "translate-x-0" : "-translate-x-2 opacity-0 group-hover:opacity-100 group-hover:translate-x-0")} />
                                </button>
                            ))
                        )}
                    </div>

                    {/* Tenant Pagination */}
                    {tenantPagination.totalPages > 1 && (
                        <div className="p-4 border-t border-gray-50 bg-gray-50/50 flex items-center justify-between">
                            <button 
                                disabled={tenantPagination.page === 1}
                                onClick={() => setTenantPagination(p => ({ ...p, page: p.page - 1 }))}
                                className="p-2 rounded-lg bg-white shadow-sm text-gray-400 disabled:opacity-20 hover:bg-gray-100 transition-all border border-gray-100"
                            >
                                <ChevronRight size={16} className="rotate-180" />
                            </button>
                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{tenantPagination.page} / {tenantPagination.totalPages}</span>
                            <button 
                                disabled={tenantPagination.page === tenantPagination.totalPages}
                                onClick={() => setTenantPagination(p => ({ ...p, page: p.page + 1 }))}
                                className="p-2 rounded-lg bg-white shadow-sm text-gray-400 disabled:opacity-20 hover:bg-gray-100 transition-all border border-gray-100"
                            >
                                <ChevronRight size={16} />
                            </button>
                        </div>
                    )}
                </div>

                {/* Right Panel: Content */}
                <div className="lg:col-span-3 min-h-0 flex flex-col">
                    <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar rounded-[2.5rem]">
                        {!selectedTenant ? (
                            <div className="h-full flex flex-col items-center justify-center bg-white rounded-[2.5rem] shadow-sm ring-1 ring-gray-100 text-center px-8">
                                <div className="h-20 w-20 bg-primary-50 rounded-[2rem] flex items-center justify-center mb-6">
                                    <Building2 size={40} className="text-primary-600" />
                                </div>
                                <h3 className="text-2xl font-black text-gray-900 tracking-tight mb-2">No Selection</h3>
                                <p className="text-gray-500 font-medium max-w-sm">Select a tenant from the explorer to manage its organizational structure and users.</p>
                            </div>
                        ) : usersLoading ? (
                            <div className="h-full flex flex-col items-center justify-center bg-white rounded-[2.5rem] shadow-sm ring-1 ring-gray-100">
                                <RefreshCw className="h-8 w-8 text-primary-600 animate-spin mb-4" />
                                <p className="text-gray-400 font-bold uppercase tracking-widest text-xs">Synchronizing Access...</p>
                            </div>
                        ) : (
                            <div className="space-y-8 pb-12">
                                {/* Tenant Banner */}
                                <div className="bg-white p-8 rounded-[2.5rem] shadow-sm ring-1 ring-gray-200 relative overflow-hidden group">
                                    <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
                                        <Building2 size={120} />
                                    </div>
                                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
                                        <div className="flex-1">
                                            <h2 className="text-2xl font-black text-gray-900 tracking-tight">
                                                {selectedTenant === 'null' ? 'Platform Authority' : (tenants.find(t => t.id === selectedTenant)?.name || 'Tenant')}
                                            </h2>
                                            <p className="text-sm text-gray-500 font-medium mt-1">
                                                {selectedTenant === 'null' ? 'Managing global security and system-wide privileges.' : `Direct oversight of organization and associated staff accounts.`}
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            {selectedTenant !== 'null' && (
                                                <button
                                                    onClick={() => setShowWalletModal(true)}
                                                    className="flex items-center gap-2 bg-emerald-50 text-emerald-700 px-5 py-3 rounded-2xl font-black text-sm shadow-sm ring-1 ring-emerald-600/10 hover:bg-emerald-100 transition-all active:scale-95"
                                                >
                                                    <Wallet size={18} />
                                                    Wallet Update
                                                </button>
                                            )}
                                            {selectedTenant !== 'null' && (
                                                <button
                                                    onClick={() => handleDeleteTenant(selectedTenant)}
                                                    className="p-3 bg-red-50 text-red-600 rounded-2xl hover:bg-red-100 transition-all active:scale-95"
                                                    title="Destroy Tenant"
                                                >
                                                    <Trash2 size={20} />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Grouped User Cards */}
                                <div className="space-y-8">
                                    {/* Admins Group */}
                                    {admins.length > 0 && (
                                        <section className="space-y-4">
                                            <div className="flex items-center gap-3 px-2">
                                                <Shield size={18} className="text-primary-600" />
                                                <h3 className="text-sm font-black text-gray-400 uppercase tracking-widest">Administrators ({admins.length})</h3>
                                            </div>
                                            <div className="grid grid-cols-1 gap-4">
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
                                                        onToggleMonitoring={handleToggleMonitoring}
                                                        onResetPassword={handleResetPassword}
                                                    />
                                                ))}
                                            </div>
                                        </section>
                                    )}

                                    {/* Support/Sales Group */}
                                    {supportUsers.filter(u => !u.adminId).length > 0 && (
                                        <section className="space-y-4">
                                            <div className="flex items-center gap-3 px-2 pt-4">
                                                <Users size={18} className="text-gray-400" />
                                                <h3 className="text-sm font-black text-gray-400 uppercase tracking-widest">Staff & Support ({supportUsers.filter(u => !u.adminId).length})</h3>
                                            </div>
                                            <div className="grid grid-cols-1 gap-4">
                                                {supportUsers.filter(u => !u.adminId).map(staff => (
                                                    <UserCard
                                                        key={staff.id}
                                                        user={staff}
                                                        onSuspend={handleSuspendUser}
                                                        onViewActivity={() => setSelectedUserForActivity(staff)}
                                                        onDelete={handleDeleteUser}
                                                        onToggleMonitoring={handleToggleMonitoring}
                                                        onResetPassword={handleResetPassword}
                                                    />
                                                ))}
                                            </div>
                                        </section>
                                    )}

                                    {users.length === 0 && !usersLoading && (
                                         <div className="flex flex-col items-center justify-center py-20 bg-white rounded-[2.5rem] shadow-sm ring-1 ring-gray-100 text-center">
                                            <Users size={40} className="text-gray-300 mb-4" />
                                            <p className="text-gray-400 font-bold uppercase tracking-widest text-xs">No users found for this tenant</p>
                                         </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
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

            {showWalletModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm transition-opacity" onClick={() => setShowWalletModal(false)}></div>
                    <div className="relative bg-white rounded-[2.5rem] shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="p-10">
                            <div className="flex items-center gap-4 mb-8">
                                <div className="bg-emerald-50 p-3 rounded-2xl">
                                    <Wallet className="text-emerald-600 h-6 w-6" />
                                </div>
                                <h3 className="text-2xl font-black text-gray-900 tracking-tight">Wallet Update</h3>
                            </div>
                            <form onSubmit={handleWalletUpdate} className="space-y-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Amount (USD)</label>
                                    <input
                                        type="number" step="0.01"
                                        value={walletForm.amount}
                                        onChange={e => setWalletForm({ ...walletForm, amount: e.target.value })}
                                        required
                                        className="w-full px-6 py-4 bg-gray-50 border-0 rounded-2xl focus:ring-2 focus:ring-emerald-500 font-black text-xl"
                                        placeholder="0.00"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Transaction Type</label>
                                    <select
                                        className="w-full px-6 py-4 bg-gray-50 border-0 rounded-2xl focus:ring-2 focus:ring-emerald-500 font-bold"
                                        value={walletForm.type}
                                        onChange={e => setWalletForm({ ...walletForm, type: e.target.value })}
                                    >
                                        <option value="CREDIT">Credit (Add Balance)</option>
                                        <option value="DEBIT">Debit (Deduct Balance)</option>
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Memo</label>
                                    <input
                                        className="w-full px-6 py-4 bg-gray-50 border-0 rounded-2xl focus:ring-2 focus:ring-emerald-500 font-bold"
                                        value={walletForm.description}
                                        onChange={e => setWalletForm({ ...walletForm, description: e.target.value })}
                                    />
                                </div>
                                <div className="flex gap-3 pt-4">
                                    <button
                                        type="button"
                                        onClick={() => setShowWalletModal(false)}
                                        className="flex-1 py-4 bg-gray-100 text-gray-500 rounded-2xl font-black text-sm active:scale-95 transition-all"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        className="flex-[2] py-4 bg-emerald-600 text-white rounded-2xl font-black text-sm shadow-xl shadow-emerald-600/20 active:scale-95 transition-all"
                                    >
                                        Update Balance
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {showMonitoringModal && (
                <MonitoringExtensionModal
                    onClose={() => {
                        setShowMonitoringModal(false);
                        setMonitoringTarget(null);
                    }}
                    onSubmit={handleEnableMonitoring}
                    tenantId={selectedTenant}
                />
            )}
        </div>
    );
};

const AdminCard = ({ admin, supportUsers, expanded, onToggle, onSuspend, onImpersonate, onViewActivity, onDelete, onToggleMonitoring, onResetPassword }) => {
    return (
        <div className={clsx(
            "bg-white rounded-3xl shadow-sm ring-1 transition-all duration-300 overflow-hidden",
            expanded ? "ring-primary-600 shadow-xl shadow-primary-600/5 card-active" : "ring-gray-200 hover:ring-primary-300 card-hover"
        )}>
            <div 
                className={clsx(
                    "flex flex-col md:flex-row items-start md:items-center justify-between p-6 cursor-pointer gap-4",
                    expanded ? "bg-primary-50/30" : "hover:bg-gray-50/50"
                )}
                onClick={onToggle}
            >
                <div className="flex items-center gap-5 w-full">
                    <div className="h-14 w-14 flex-shrink-0 bg-primary-100 rounded-2xl flex items-center justify-center font-black text-primary-700 text-lg shadow-sm ring-1 ring-primary-200">
                        {admin.name ? admin.name.substring(0, 2).toUpperCase() : <ShieldCheck size={24} />}
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-lg font-black text-gray-900 truncate">
                                {admin.name || admin.email}
                            </span>
                            <span className="inline-flex items-center px-2 py-0.5 rounded-lg bg-primary-100 text-primary-700 text-[10px] font-black uppercase tracking-widest shadow-sm">
                                {admin.role}
                            </span>
                        </div>
                        <div className="flex items-center gap-4 mt-1">
                            <span className="text-sm font-medium text-gray-400 flex items-center gap-1.5">
                                <Mail size={14} /> {admin.email}
                            </span>
                            <span className="text-sm font-bold text-primary-600 flex items-center gap-1.5">
                                <Users size={14} /> {supportUsers.length} Staff
                            </span>
                        </div>
                    </div>
                    <ChevronRight size={24} className={clsx("text-gray-300 transition-transform hidden md:block", expanded && "rotate-90 text-primary-600")} />
                </div>
            </div>

            <div className={clsx(
                "px-6 py-4 border-t border-gray-100 flex flex-wrap gap-2 transition-all",
                expanded ? "bg-white" : "bg-gray-50/30"
            )}>
                <button
                    onClick={(e) => { e.stopPropagation(); onImpersonate(admin.id); }}
                    className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 rounded-xl bg-primary-600 px-4 py-2 text-xs font-black text-white shadow-lg shadow-primary-600/10 hover:bg-primary-700 transition-all active:scale-95"
                >
                    <Eye size={14} /> Impersonate
                </button>
                <button
                    onClick={(e) => { e.stopPropagation(); onSuspend(admin.id, admin.status); }}
                    className={clsx(
                        "flex-1 sm:flex-none inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2 text-xs font-black ring-1 transition-all active:scale-95",
                        admin.status === 'ACTIVE' ? "bg-white text-amber-600 ring-amber-200 hover:bg-amber-50" : "bg-emerald-50 text-emerald-700 ring-emerald-200"
                    )}
                >
                    {admin.status === 'ACTIVE' ? <Ban size={14} /> : <CheckCircle size={14} />}
                    {admin.status === 'ACTIVE' ? 'Suspend' : 'Activate'}
                </button>
                <button
                    onClick={(e) => { e.stopPropagation(); onResetPassword(admin.id, admin.email); }}
                    className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 rounded-xl bg-white px-4 py-2 text-xs font-black text-gray-600 ring-1 ring-gray-200 hover:bg-gray-50 transition-all active:scale-95"
                >
                    <Key size={14} /> Reset
                </button>
                <button
                    onClick={(e) => { e.stopPropagation(); onViewActivity(); }}
                    className="p-2 bg-white text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl ring-1 ring-gray-200 transition-all active:scale-95"
                    title="Audit Activity"
                >
                    <RefreshCw size={16} />
                </button>
                <div className="flex-grow"></div>
                <button
                    onClick={(e) => { e.stopPropagation(); onDelete(admin.id); }}
                    disabled={admin.role === 'SUPER_ADMIN'}
                    className="p-2 bg-white text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl ring-1 ring-gray-200 transition-all active:scale-95 disabled:opacity-20"
                    title="Destroy User"
                >
                    <Trash2 size={16} />
                </button>
            </div>

            {expanded && supportUsers.length > 0 && (
                <div className="p-6 border-t border-primary-50 bg-white space-y-4">
                    <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Managed Staff</h4>
                    <div className="grid grid-cols-1 gap-3">
                        {supportUsers.map(support => (
                            <UserCard
                                key={support.id}
                                user={support}
                                onSuspend={onSuspend}
                                onViewActivity={onViewActivity}
                                onDelete={onDelete}
                                onToggleMonitoring={onToggleMonitoring}
                                onResetPassword={onResetPassword}
                            />
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

const UserCard = ({ user, onSuspend, onViewActivity, onDelete, onToggleMonitoring, onResetPassword }) => {
    return (
        <div className="bg-gray-50/50 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4 ring-1 ring-gray-100 group transition-all hover:bg-white hover:ring-primary-200 hover:shadow-sm">
            <div className="flex items-center gap-4 w-full">
                <div className="h-10 w-10 flex-shrink-0 bg-white rounded-xl flex items-center justify-center font-black text-gray-500 text-xs shadow-sm ring-1 ring-gray-100 group-hover:bg-primary-600 group-hover:text-white transition-all">
                    {user.name ? user.name.substring(0, 2).toUpperCase() : user.email.substring(0, 2).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-gray-900 truncate">{user.name || user.email}</p>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-tight">{user.role}</p>
                </div>
                <div className="flex items-center gap-3">
                    <StatusBadge status={user.status} />
                    <label className="flex items-center gap-2 cursor-pointer group/toggle">
                        <div 
                            onClick={(e) => { e.stopPropagation(); onToggleMonitoring(user.id, user.monitoringEnabled); }}
                            className={clsx("relative inline-flex h-4 w-8 rounded-full transition-colors", user.monitoringEnabled ? "bg-primary-600" : "bg-gray-300")}
                        >
                            <span className={clsx("inline-block h-3 w-3 transform rounded-full bg-white transition-transform duration-200 mt-0.5 ml-0.5", user.monitoringEnabled ? "translate-x-4" : "translate-x-0")} />
                        </div>
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest hidden sm:block">Monitor</span>
                    </label>
                </div>
            </div>
            
            <div className="flex items-center gap-2 w-full sm:w-auto justify-end border-t sm:border-t-0 border-gray-100 pt-3 sm:pt-0">
                <button
                    onClick={() => onSuspend(user.id, user.status)}
                    className={clsx(
                        "p-2 rounded-xl transition-all",
                        user.status === 'ACTIVE' ? "text-gray-400 hover:text-amber-600 hover:bg-amber-50" : "text-gray-400 hover:text-emerald-600 hover:bg-emerald-50"
                    )}
                >
                    {user.status === 'ACTIVE' ? <Ban size={16} /> : <CheckCircle size={16} />}
                </button>
                <button
                    onClick={() => onResetPassword(user.id, user.email)}
                    className="p-2 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-xl transition-all"
                >
                    <Key size={16} />
                </button>
                <button
                    onClick={() => onDelete(user.id)}
                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                >
                    <Trash2 size={16} />
                </button>
            </div>
        </div>
    );
};

const StatusBadge = ({ status }) => {
    const styles = {
        ACTIVE: 'bg-emerald-50 text-emerald-700 ring-emerald-600/10',
        INVITED: 'bg-blue-50 text-blue-700 ring-blue-600/10',
        SUSPENDED: 'bg-red-50 text-red-700 ring-red-600/10'
    };
    return (
        <span className={clsx("inline-flex items-center px-2 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-tight shadow-sm ring-1", styles[status] || 'bg-gray-50 text-gray-600 ring-gray-200')}>
            {status}
        </span>
    );
};

export default SuperAdminUsers;
