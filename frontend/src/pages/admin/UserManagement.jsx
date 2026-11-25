import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import api from '../../services/api';
import { clsx } from 'clsx';
import { Users, Shield, UserPlus, Activity, Trash2, CheckCircle2, Ban, Eye, X, ShieldCheck, Mail, Calendar, Link as LinkIcon, RotateCw, Copy, Check } from 'lucide-react';
import ActivityModal from '../../components/admin/ActivityModal';
import Pagination from '../../components/common/Pagination';
import CreativeStatCard from '../../components/common/CreativeStatCard';

const UserManagement = () => {
    const { user, isSuperAdmin, isAdmin } = useAuth();
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showInviteModal, setShowInviteModal] = useState(false);
    const [selectedUser, setSelectedUser] = useState(null);
    const [showActivityModal, setShowActivityModal] = useState(false);
    const [pagination, setPagination] = useState({
        page: 1,
        limit: 10,
        total: 0,
        totalPages: 1
    });

    useEffect(() => {
        fetchUsers();
    }, [pagination.page, pagination.limit]);

    const fetchUsers = async () => {
        try {
            setLoading(true);
            const response = await api.get(`/users?page=${pagination.page}&limit=${pagination.limit}`);
            setUsers(response.data.data || []);
            setPagination(prev => ({
                ...prev,
                total: response.data.pagination?.total || 0,
                totalPages: response.data.pagination?.totalPages || 1
            }));
        } catch (error) {
            console.error('Failed to fetch users:', error);
        } finally {
            setLoading(false);
        }
    };

    const handlePageChange = (newPage) => {
        setPagination(prev => ({ ...prev, page: newPage }));
    };

    const handleInviteUser = async (email, name) => {
        try {
            const response = await api.post('/users/support/invite', { email, name });
            fetchUsers();
            return response.data;
        } catch (error) {
            console.error('Failed to invite user:', error);
            throw error;
        }
    };

    const handleUpdateStatus = async (userId, newStatus) => {
        const targetUser = users.find(u => u.id === userId);

        if (userId === user.id) {
            alert('You cannot modify your own account');
            return;
        }

        try {
            if (newStatus === 'DELETED') {
                await api.delete(`/users/${userId}`);
            } else {
                const action = newStatus === 'SUSPENDED' ? 'suspend' : 'activate';
                if (!window.confirm(`Are you sure you want to ${action} ${targetUser.email}?`)) {
                    return;
                }
                await api.patch(`/users/${userId}/status`, { status: newStatus });
            }
            fetchUsers();
        } catch (error) {
            console.error('Failed to update status:', error);
            alert('Failed to update user status');
        }
    };

    const handleViewActivity = async (user) => {
        setSelectedUser(user);
        setShowActivityModal(true);
    };

    if (!isAdmin && !isSuperAdmin) {
        return <div className="p-8 font-bold text-red-500">Access Denied</div>;
    }

    return (
        <div className="w-full pb-16 space-y-7 animate-in fade-in duration-300 max-w-7xl mx-auto">
            {/* Header section */}
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-teal-700 via-teal-600 to-emerald-600 p-8 text-white shadow-xl shadow-teal-900/15">
                <div className="absolute top-0 right-0 -mt-10 -mr-10 w-80 h-80 rounded-full bg-white/10 blur-2xl pointer-events-none" />
                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="space-y-1.5 max-w-2xl">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 backdrop-blur-md text-xs font-semibold tracking-wide border border-white/20">
                            <ShieldCheck size={14} className="text-teal-200" />
                            <span>Staff Governance & RBAC Controls</span>
                        </div>
                        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                            Staff & User Management
                        </h1>
                        <p className="text-teal-100 text-xs sm:text-sm font-medium">
                            Control organizational access, send invitations, assign roles, and monitor administrative operations.
                        </p>
                    </div>

                    <div className="flex items-center gap-3">
                        <button
                            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white hover:bg-teal-50 px-5 py-3 text-xs font-bold text-teal-800 shadow-lg shadow-black/10 transition-all active:scale-95 cursor-pointer"
                            onClick={() => setShowInviteModal(true)}
                        >
                            <UserPlus size={16} className="text-teal-700" />
                            <span>Invite Staff</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Quick Stats Summary */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <CreativeStatCard
                    title="Admins"
                    value={users.filter(u => u.role === 'ADMIN').length}
                    subtitle="System administrators"
                    icon={Shield}
                    color="blue"
                    trend="+12%"
                    trendUp={true}
                />
                <CreativeStatCard
                    title="Support Team"
                    value={users.filter(u => u.role === 'SUPPORT').length}
                    subtitle="Support staff"
                    icon={Users}
                    color="purple"
                    trend="+8%"
                    trendUp={true}
                />
                <CreativeStatCard
                    title="Active Now"
                    value={users.filter(u => u.status === 'ACTIVE').length}
                    subtitle="Active accounts"
                    icon={UserPlus}
                    color="emerald"
                    trend="+5%"
                    trendUp={true}
                />
                <CreativeStatCard
                    title="Suspended"
                    value={users.filter(u => u.status === 'SUSPENDED').length}
                    subtitle="Restricted members"
                    icon={Ban}
                    color="rose"
                    trend="None"
                    trendUp={false}
                />
            </div>

            {/* Users Table */}
            <div className="bg-white/95 dark:bg-slate-900/95 rounded-3xl border border-teal-200/70 dark:border-white/10 shadow-sm overflow-hidden backdrop-blur-sm">
                <div className="p-4 sm:p-5 border-b border-gray-100 dark:border-white/5 flex items-center justify-between bg-gray-50/40 dark:bg-white/[0.01]">
                    <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-lg bg-primary-50 dark:bg-primary-950/40 border border-primary-100 dark:border-primary-800/40 flex items-center justify-center text-primary-600 dark:text-primary-400">
                            <Users className="h-4 w-4" />
                        </div>
                        <div>
                            <h2 className="text-sm sm:text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                Team Members & Administrators
                                <span className="text-xs font-bold text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-white/5 px-2 py-0.5 rounded-lg border border-gray-200/50 dark:border-white/5">{pagination.total || users.length}</span>
                            </h2>
                            <p className="text-[11px] text-gray-500 dark:text-gray-400 font-medium">Internal user permissions and access control</p>
                        </div>
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-100 dark:divide-white/5">
                        <thead className="bg-gray-50/75 dark:bg-[#12131a]">
                            <tr>
                                <th scope="col" className="px-6 py-4 text-left text-[10px] font-extrabold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Team Member</th>
                                <th scope="col" className="px-6 py-4 text-left text-[10px] font-extrabold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Current Status</th>
                                <th scope="col" className="hidden lg:table-cell px-6 py-4 text-left text-[10px] font-extrabold text-gray-500 dark:text-gray-400 uppercase tracking-wider">System Role</th>
                                <th scope="col" className="px-6 py-4 text-right text-[10px] font-extrabold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Control</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-white/5 bg-transparent">
                            {loading ? (
                                Array.from({ length: 5 }).map((_, i) => (
                                    <tr key={i} className="animate-pulse">
                                        <td colSpan="4" className="px-6 py-6"><div className="h-4 bg-gray-100 dark:bg-white/5 rounded-full w-full"></div></td>
                                    </tr>
                                ))
                            ) : users.length === 0 ? (
                                <tr>
                                    <td colSpan="4" className="px-6 py-16 text-center">
                                        <div className="flex flex-col items-center">
                                            <div className="bg-gray-50 dark:bg-white/5 p-4 rounded-2xl mb-3 border border-gray-100 dark:border-white/5">
                                                <Users size={32} className="text-gray-400 dark:text-gray-500" />
                                            </div>
                                            <p className="text-gray-600 dark:text-gray-300 font-bold">No team members found.</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                users.map(u => (
                                    <UserRow
                                        key={u.id}
                                        user={u}
                                        currentUserId={user.id}
                                        onUpdateStatus={handleUpdateStatus}
                                        onViewActivity={handleViewActivity}
                                        onRefresh={fetchUsers}
                                    />
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                <Pagination
                    pagination={pagination}
                    onPageChange={handlePageChange}
                    onLimitChange={(newLimit) => setPagination(prev => ({ ...prev, limit: newLimit, page: 1 }))}
                    itemName="users"
                />
            </div>

            {showInviteModal && (
                <InviteModal
                    onClose={() => setShowInviteModal(false)}
                    onInvite={handleInviteUser}
                />
            )}

            {showActivityModal && selectedUser && (
                <ActivityModal
                    userId={selectedUser.id}
                    email={selectedUser.email}
                    onClose={() => {
                        setShowActivityModal(false);
                        setSelectedUser(null);
                    }}
                />
            )}

        </div>
    );
};

const UserRow = ({ user, currentUserId, onUpdateStatus, onViewActivity, onRefresh }) => {
    const isSelf = user.id === currentUserId;
    const { addToast } = useToast();
    const [copied, setCopied] = useState(false);
    const [resending, setResending] = useState(false);

    const getStatusStyles = (status) => {
        const styles = {
            ACTIVE: 'bg-emerald-50 text-emerald-700 ring-emerald-600/10',
            INVITED: 'bg-blue-50 text-blue-700 ring-blue-600/10',
            SUSPENDED: 'bg-red-50 text-red-700 ring-red-600/10',
            DELETED: 'bg-gray-50 text-gray-700 ring-gray-600/10'
        };
        return styles[status] || 'bg-gray-50 text-gray-700';
    };

    const handleCopyInviteLink = async (e) => {
        if (e) e.stopPropagation();
        try {
            let token = user.inviteToken;
            if (!token) {
                const res = await api.get(`/users/${user.id}/invite-link`);
                token = res.data?.inviteToken;
            }
            if (!token) {
                addToast('error', 'No active invite token found for this user.');
                return;
            }
            const inviteLink = `${window.location.origin}/invite/accept?token=${token}`;
            await navigator.clipboard.writeText(inviteLink);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
            addToast('success', 'Invite link copied to clipboard!');
        } catch (err) {
            const msg = err?.response?.data?.message || 'Failed to copy invite link';
            addToast('error', msg);
        }
    };

    const handleResendInvite = async (e) => {
        if (e) e.stopPropagation();
        if (resending) return;
        try {
            setResending(true);
            await api.post(`/users/${user.id}/invite/resend`);
            addToast('success', `Invitation resent to ${user.email}!`);
            if (onRefresh) onRefresh();
        } catch (err) {
            const msg = err?.response?.data?.message || 'Failed to resend invite';
            addToast('error', msg);
        } finally {
            setResending(false);
        }
    };

    return (
        <tr className={clsx(
            "hover:bg-gray-50/50 dark:hover:bg-white/[0.02] transition-colors group cursor-pointer",
            isSelf && "bg-primary-50/20 dark:bg-primary-950/20"
        )}>
            <td className="px-6 py-4 whitespace-nowrap">
                <div className="flex items-center gap-3.5">
                    <div className="h-10 w-10 rounded-xl bg-gray-100 dark:bg-white/5 border border-gray-200/50 dark:border-white/5 flex items-center justify-center font-bold text-xs text-gray-700 dark:text-gray-300 uppercase group-hover:bg-primary-600 group-hover:text-white transition-all shadow-2xs">
                        {user.name ? user.name.substring(0, 2) : user.email.substring(0, 2)}
                    </div>
                    <div className="flex flex-col">
                        <span className="text-xs sm:text-sm font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
                            {user.email}
                            {isSelf && <span className="text-[10px] bg-primary-50 dark:bg-primary-950/50 text-primary-600 dark:text-primary-400 border border-primary-200/60 dark:border-primary-800/40 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">You</span>}
                        </span>
                        <span className="text-[11px] text-gray-400 dark:text-gray-500 font-medium">{user.name || '—'}</span>
                    </div>
                </div>
            </td>
            <td className="px-6 py-4 whitespace-nowrap">
                <div className="flex items-center gap-2">
                    <span className={clsx(
                        "inline-flex items-center px-2.5 py-1 rounded-md text-[10px] font-bold uppercase ring-1",
                        getStatusStyles(user.status)
                    )}>
                        {user.status}
                    </span>
                    {user.status === 'INVITED' && (
                        <button
                            type="button"
                            onClick={handleCopyInviteLink}
                            className={clsx(
                                "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer shadow-2xs ring-1",
                                copied
                                    ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 ring-emerald-600/20"
                                    : "bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 hover:bg-blue-100 ring-blue-600/20 active:scale-95"
                            )}
                            title="Copy Invitation Link"
                        >
                            {copied ? <Check size={11} className="stroke-[2.5]" /> : <LinkIcon size={11} className="stroke-[2.5]" />}
                            <span>{copied ? 'Copied!' : 'Invite Link'}</span>
                        </button>
                    )}
                </div>
            </td>
            <td className="hidden lg:table-cell px-6 py-4 whitespace-nowrap">
                <span className="text-xs font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wider flex items-center gap-2">
                    <Shield size={14} className="text-gray-400" />
                    {user.role}
                </span>
            </td>
            <td className="px-6 py-4 whitespace-nowrap text-right">
                <div className="flex items-center justify-end gap-1.5 opacity-90 group-hover:opacity-100 transition-all">
                    {user.status === 'INVITED' && (
                        <>
                            <button
                                type="button"
                                className={clsx(
                                    "p-1.5 rounded-lg transition-all cursor-pointer",
                                    copied ? "text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40" : "text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40"
                                )}
                                onClick={handleCopyInviteLink}
                                title={copied ? "Copied!" : "Copy Invite Link"}
                            >
                                {copied ? <Check size={16} /> : <LinkIcon size={16} />}
                            </button>
                            <button
                                type="button"
                                className={clsx(
                                    "p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 rounded-lg transition-all cursor-pointer",
                                    resending && "opacity-50 cursor-not-allowed"
                                )}
                                onClick={handleResendInvite}
                                disabled={resending}
                                title="Resend Invite Email"
                            >
                                <RotateCw size={16} className={resending ? "animate-spin" : ""} />
                            </button>
                        </>
                    )}

                    <button
                        className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded-lg transition-all cursor-pointer"
                        onClick={() => onViewActivity(user)}
                        title="Audit Logs"
                    >
                        <Activity size={16} />
                    </button>

                    {user.status === 'ACTIVE' ? (
                        <button
                            className="p-1.5 text-gray-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/40 rounded-lg transition-all disabled:opacity-20 cursor-pointer"
                            onClick={() => onUpdateStatus(user.id, 'SUSPENDED')}
                            disabled={isSelf}
                            title="Suspend"
                        >
                            <Ban size={16} />
                        </button>
                    ) : user.status === 'SUSPENDED' ? (
                        <button
                            className="p-1.5 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 rounded-lg transition-all disabled:opacity-20 cursor-pointer"
                            onClick={() => onUpdateStatus(user.id, 'ACTIVE')}
                            disabled={isSelf}
                            title="Re-activate"
                        >
                            <CheckCircle2 size={16} />
                        </button>
                    ) : null}

                    <button
                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg transition-all disabled:opacity-20 cursor-pointer"
                        onClick={() => {
                            if (window.confirm(`Are you sure you want to delete ${user.email}? This action cannot be undone.`)) {
                                onUpdateStatus(user.id, 'DELETED');
                            }
                        }}
                        disabled={isSelf}
                        title="Permanently Delete"
                    >
                        <Trash2 size={16} />
                    </button>
                </div>
            </td>
        </tr>
    );
};

const InviteModal = ({ onClose, onInvite }) => {
    const { addToast } = useToast();
    const [email, setEmail] = useState('');
    const [name, setName] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [inviteLink, setInviteLink] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const data = await onInvite(email, name);
            const link = `${window.location.origin}/invite/accept?token=${data.inviteToken}`;
            setInviteLink(link);
        } catch (err) {
            const msg = err?.response?.data?.message || err.message || 'Failed to send invite';
            setError(Array.isArray(msg) ? msg.join(', ') : msg);
        } finally {
            setLoading(false);
        }
    };

    const copyToClipboard = (e) => {
        if (e) e.preventDefault();
        navigator.clipboard.writeText(inviteLink).then(() => {
            addToast('success', 'Invite link copied to clipboard!');
        });
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm transition-opacity" onClick={onClose}></div>
            <div className="relative bg-white rounded-[2.5rem] shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200 ring-1 ring-white/20">
                <header className="px-10 py-8 border-b border-gray-50 flex items-center justify-between bg-white">
                    <div className="flex items-center gap-4">
                        <div className="bg-primary-50 p-3 rounded-2xl">
                            <Mail className="text-primary-600 h-6 w-6" />
                        </div>
                        <h3 className="text-2xl font-black text-gray-900 tracking-tight">{inviteLink ? 'Invite Sent' : 'Team Invite'}</h3>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-xl transition-all">
                        <X size={24} className="text-gray-400" />
                    </button>
                </header>

                <div className="p-10 bg-white">
                    {inviteLink ? (
                        <div className="space-y-8">
                            <div className="bg-emerald-50 border border-emerald-100 p-6 rounded-3xl">
                                <p className="text-sm text-emerald-800 font-bold leading-relaxed text-center">
                                    Invitation generated successfully.<br />Copy the link below to share.
                                </p>
                            </div>
                            <div className="flex flex-col gap-3">
                                <div className="p-4 bg-gray-50 rounded-2xl ring-1 ring-gray-100 break-all text-xs font-mono font-bold text-gray-500">
                                    {inviteLink}
                                </div>
                                <button
                                    onClick={copyToClipboard}
                                    className="w-full py-4 bg-gray-900 text-white text-sm font-black uppercase tracking-widest rounded-2xl shadow-xl shadow-gray-900/20 active:scale-95 transition-all"
                                >
                                    Copy Link and Share it to your Sub-Ordinate.
                                </button>
                            </div>
                            <button
                                onClick={onClose}
                                className="w-full py-4 bg-primary-600 text-white rounded-2xl font-black text-sm shadow-xl shadow-primary-600/20 active:scale-95 transition-all"
                            >
                                Done
                            </button>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Email Address</label>
                                <div className="relative">
                                    <Mail className="absolute left-4 top-4 h-5 w-5 text-gray-300" />
                                    <input
                                        type="email"
                                        value={email}
                                        onChange={e => setEmail(e.target.value)}
                                        required
                                        className="w-full pl-12 pr-4 py-4 bg-gray-50 border-0 rounded-2xl focus:ring-2 focus:ring-primary-600 font-bold transition-all"
                                        placeholder="user@domain.com"
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Full Name</label>
                                <div className="relative">
                                    <Users className="absolute left-4 top-4 h-5 w-5 text-gray-300" />
                                    <input
                                        type="text"
                                        value={name}
                                        onChange={e => setName(e.target.value)}
                                        className="w-full pl-12 pr-4 py-4 bg-gray-50 border-0 rounded-2xl focus:ring-2 focus:ring-primary-600 font-bold transition-all"
                                        placeholder="Full Name"
                                    />
                                </div>
                            </div>
                            {error && (
                                <div className="p-4 bg-red-50 border border-red-100 rounded-2xl flex items-center gap-3 text-red-600 text-xs font-bold">
                                    <Ban size={16} /> {error}
                                </div>
                            )}
                            <div className="flex flex-col gap-3 pt-4">
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full py-4 bg-primary-600 text-white rounded-2xl font-black text-sm shadow-xl shadow-primary-600/20 active:scale-95 transition-all flex items-center justify-center gap-2"
                                >
                                    {loading ? 'Processing...' : 'Send Invitation'}
                                    {!loading && <UserPlus size={18} />}
                                </button>
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className="w-full py-4 bg-white text-gray-400 rounded-2xl font-bold text-sm border border-gray-100 hover:bg-gray-50 transition-all"
                                >
                                    Cancel
                                </button>
                            </div>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
};

export default UserManagement;
