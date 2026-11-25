import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Plus, Edit2, Trash2, Key, Users, Radio, PhoneCall, RefreshCw, ShieldCheck } from 'lucide-react';
import api from '../../../services/api';
import { useAuth } from '../../../context/AuthContext';
import MonitoringExtensionModal from '../../../components/admin/MonitoringExtensionModal';
import Pagination from '../../../components/common/Pagination';
import CreativeStatCard from '../../../components/common/CreativeStatCard';
import { clsx } from 'clsx';

function ExtensionsPage() {
    const navigate = useNavigate();
    const [extensions, setExtensions] = useState([]);
    const [monitoringUsers, setMonitoringUsers] = useState([]);
    const [monitoringSeats, setMonitoringSeats] = useState({ users: [], used: 0, limit: 0, remaining: 0 });
    const [savingMonitoring, setSavingMonitoring] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(10);
    const [mPage, setMPage] = useState(1);
    const [mLimit, setMLimit] = useState(10);

    // Monitoring Edit State
    const [showMonitoringModal, setShowMonitoringModal] = useState(false);
    const [selectedMonitoringUser, setSelectedMonitoringUser] = useState(null);

    const { role, user: currentUser, refreshUser } = useAuth();
    const canManageExtensions = role === 'SUPER_ADMIN';
    const canManageMonitoring = role === 'ADMIN';
    const hasEligibleMonitoringUser = monitoringSeats.users.some(user => !user.monitoringEnabled);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);
            let monitoringLoadError = null;
            const extRes = await api.get('/telecom/extensions');
            setExtensions(extRes.data);

            if (canManageMonitoring) {
                try {
                    const seatsRes = await api.get('/users/monitoring/seats');
                    const users = seatsRes.data.users || [];
                    setMonitoringSeats(seatsRes.data);
                    const monitoring = users.filter(u => u.monitoringEnabled && u.monitoringExtension);
                    setMonitoringUsers(monitoring);
                } catch (userErr) {
                    console.error('Failed to fetch users for monitoring', userErr);
                    setMonitoringUsers([]);
                    monitoringLoadError = 'Failed to load monitoring seats. Refresh to try again.';
                }
            } else {
                setMonitoringUsers([]);
            }

            setError(monitoringLoadError);
        } catch (err) {
            console.error('Failed to fetch data:', err);
            setError(err.response?.data?.message || 'Failed to load data');
        } finally {
            setLoading(false);
        }
    };

    const handleEditMonitoring = (user) => {
        setSelectedMonitoringUser(user);
        setShowMonitoringModal(true);
    };

    const handleUpdateMonitoring = async ({ monitoringExtension, monitoringSecret, name, userId: selectedUserId, subscriptionId }) => {
        const userId = selectedUserId;
        if (!userId) return;
        try {
            setSavingMonitoring(true);
            if (selectedMonitoringUser && selectedMonitoringUser.id !== userId) {
                await api.post('/users/monitoring/reassign', {
                    fromUserId: selectedMonitoringUser.id, toUserId: userId,
                    monitoringExtension, ...(monitoringSecret ? { monitoringSecret } : {}), name,
                });
            } else {
                await api.patch(`/users/${userId}/permissions`, {
                    monitoringEnabled: true, monitoringExtension, subscriptionId,
                    ...(monitoringSecret ? { monitoringSecret } : {}), name,
                });
            }
            setShowMonitoringModal(false);
            setSelectedMonitoringUser(null);
            if (userId === currentUser?.id) await refreshUser();
            fetchData(); // Refresh
        } catch (err) {
            console.error("Failed to update monitoring user", err);
            alert("Failed to update: " + (err.response?.data?.message || err.message));
        } finally {
            setSavingMonitoring(false);
        }
    };

    const handleDisableMonitoring = async (user) => {
        if (!window.confirm(`Are you sure you want to disable monitoring for ${user.name || user.email}?`)) {
            return;
        }

        try {
            await api.patch(`/users/${user.id}/permissions`, {
                monitoringEnabled: false,
                monitoringExtension: null,
                monitoringSecret: null
            });
            if (user.id === currentUser?.id) await refreshUser();
            fetchData();
        } catch (err) {
            console.error('Failed to disable monitoring:', err);
            alert(err.response?.data?.message || 'Failed to disable monitoring');
        }
    };

    const handleDelete = async (id, extensionNumber) => {
        if (!window.confirm(`Are you sure you want to delete extension ${extensionNumber}?`)) {
            return;
        }

        try {
            await api.delete(`/telecom/extensions/${id}`);
            setExtensions(extensions.filter(ext => ext.id !== id));
        } catch (err) {
            console.error('Failed to delete extension:', err);
            alert(err.response?.data?.message || 'Failed to delete extension');
        }
    };

    const filteredExtensions = extensions.filter(ext =>
        ext.extensionNumber.includes(searchTerm) ||
        ext.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const paginatedExtensions = filteredExtensions.slice((page - 1) * limit, page * limit);
    const paginatedMonitoringUsers = monitoringUsers.slice((mPage - 1) * mLimit, mPage * mLimit);

    if (loading) {
        return (
            <div className="flex justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
            </div>
        );
    }

    return (
        <div className="w-full pb-16 space-y-7 animate-in fade-in duration-300 max-w-7xl mx-auto">
            {/* Header Banner */}
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-teal-700 via-teal-600 to-emerald-600 p-8 text-white shadow-xl shadow-teal-900/15">
                <div className="absolute top-0 right-0 -mt-10 -mr-10 w-80 h-80 rounded-full bg-white/10 blur-2xl pointer-events-none" />
                <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                    <div className="space-y-1.5 max-w-2xl">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 backdrop-blur-md text-xs font-semibold tracking-wide border border-white/20">
                            <Radio size={14} className="text-teal-200 animate-pulse" />
                            <span>PBX Endpoints & Seat Allocation</span>
                        </div>
                        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                            Extensions
                        </h1>
                        <p className="text-teal-100 text-xs sm:text-sm font-medium">
                            Manage phone system extensions, call forwarding, agent assignment, and monitoring seats.
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                        <button
                            onClick={fetchData}
                            className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 text-xs font-bold rounded-2xl bg-white/15 hover:bg-white/25 text-white backdrop-blur-md border border-white/20 transition-all active:scale-95 cursor-pointer"
                        >
                            <RefreshCw size={14} className={clsx(loading && "animate-spin")} />
                            <span>Refresh</span>
                        </button>
                        {canManageExtensions && (
                            <button
                                onClick={() => navigate('/telecom/extensions/new')}
                                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white hover:bg-teal-50 px-5 py-2.5 text-xs font-bold text-teal-800 shadow-lg shadow-black/10 transition-all active:scale-95 cursor-pointer"
                            >
                                <Plus className="h-4 w-4 text-teal-700" />
                                <span>Create Extension</span>
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Quick KPI Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <CreativeStatCard
                    title="Total Extensions"
                    value={extensions.length}
                    subtitle="Configured lines"
                    icon={Radio}
                    color="blue"
                    trend="+12%"
                    trendUp={true}
                />
                <CreativeStatCard
                    title="Call Forwarding"
                    value={extensions.filter(e => e.forwardAllEnabled || e.forwardNoAnswerEnabled).length}
                    subtitle="Active rules"
                    icon={PhoneCall}
                    color="purple"
                    trend="+8%"
                    trendUp={true}
                />
                <CreativeStatCard
                    title="Ring Group Exts"
                    value={extensions.filter(e => e.ringGroupMembers?.length > 0).length}
                    subtitle="Linked to groups"
                    icon={Users}
                    color="teal"
                    trend="+10%"
                    trendUp={true}
                />
                <CreativeStatCard
                    title="Monitoring Seats"
                    value={`${monitoringSeats.used} / ${monitoringSeats.limit}`}
                    subtitle="Assigned / Limit"
                    icon={ShieldCheck}
                    color="emerald"
                    trend={monitoringSeats.remaining > 0 ? `${monitoringSeats.remaining} left` : 'Full'}
                    trendUp={monitoringSeats.remaining > 0}
                />
            </div>

            {canManageMonitoring && (
                <div className="flex flex-col gap-3 rounded-xl border border-indigo-200 bg-indigo-50 p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <p className="font-bold text-indigo-900">Monitoring Extensions: {monitoringSeats.used} / {monitoringSeats.limit}</p>
                        <p className="text-sm text-indigo-800">{monitoringSeats.planLimit || 0} base-plan seats + {monitoringSeats.addonUnits || 0} capacity-plan seats.</p>
                        {!monitoringSeats.hasActivePlan && <p className="text-sm text-indigo-800">An active plan is required before assigning seats.</p>}
                        {monitoringSeats.remaining > 0 && !hasEligibleMonitoringUser && (
                            <p className="mt-1 text-sm text-indigo-900">
                                {monitoringSeats.pendingStaffInvites > 0
                                    ? 'A seat is available. A staff invitation is pending; assign the seat after they accept it.'
                                    : 'A seat is available, but every active Admin or Support user already has one. Invite another staff member, then assign the seat after they accept.'}
                            </p>
                        )}
                    </div>
                    {monitoringSeats.remaining > 0 && !hasEligibleMonitoringUser ? (
                        <button type="button" onClick={() => navigate('/users')}
                            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 text-sm font-semibold text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500">
                            <Plus className="h-4 w-4" /> {monitoringSeats.pendingStaffInvites > 0 ? 'View Staff Invitations' : 'Invite Staff to Use Seat'}
                        </button>
                    ) : (
                        <button type="button" onClick={() => { setSelectedMonitoringUser(null); setShowMonitoringModal(true); }}
                            disabled={!monitoringSeats.remaining}
                            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 text-sm font-semibold text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:cursor-not-allowed disabled:opacity-50">
                            <Plus className="h-4 w-4" /> Add Monitoring Extension
                        </button>
                    )}
                </div>
            )}

            {error && (
                <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-600 font-medium shadow-sm mx-4 sm:mx-0">
                    {error}
                </div>
            )}

            {/* Unified search bar */}
            <div className="bg-white dark:bg-[#0c0d12] p-3 rounded-2xl border border-gray-200/80 dark:border-white/10 shadow-xs">
                <div className="relative max-w-md">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 h-4 w-4" />
                    <input
                        type="text"
                        placeholder="Search extension # or name..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-gray-50/80 dark:bg-white/[0.03] border border-gray-200/80 dark:border-white/10 rounded-xl pl-10 pr-4 py-2 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 transition-all font-medium"
                    />
                </div>
            </div>

            <div className="bg-white dark:bg-[#0c0d12] rounded-2xl border border-gray-200/80 dark:border-white/10 shadow-xs overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-100 dark:divide-white/5">
                        <thead className="bg-gray-50/75 dark:bg-white/[0.02]">
                            <tr>
                                <th className="px-6 py-4 text-left text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Extension #</th>
                                <th className="px-6 py-4 text-left text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Name</th>
                                <th className="hidden lg:table-cell px-6 py-4 text-left text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">SIP Username</th>
                                <th className="hidden md:table-cell px-6 py-4 text-left text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Forwarding</th>
                                <th className="hidden sm:table-cell px-6 py-4 text-left text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Groups</th>
                                <th className="px-6 py-4 text-right text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-white/5 bg-transparent">
                            {filteredExtensions.length === 0 ? (
                                <tr>
                                    <td colSpan="6" className="px-6 py-16 text-center">
                                        <div className="flex flex-col items-center">
                                            <div className="bg-gray-50 dark:bg-white/5 p-4 rounded-2xl mb-3 border border-gray-100 dark:border-white/5">
                                                <Radio size={32} className="text-gray-400 dark:text-gray-500" />
                                            </div>
                                            <p className="text-gray-600 dark:text-gray-300 font-bold">{searchTerm ? 'No matching extensions found' : 'No extensions yet.'}</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                paginatedExtensions.map((ext) => (
                                    <tr key={ext.id} className="hover:bg-gray-50/60 dark:hover:bg-white/[0.02] transition-colors group">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold text-primary-700 bg-primary-50 dark:bg-primary-950/40 dark:text-primary-400 ring-1 ring-inset ring-primary-100/50 dark:ring-primary-800/40 font-mono">
                                                {ext.extensionNumber}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900 dark:text-white truncate max-w-[140px] md:max-w-none">{ext.name}</td>
                                        <td className="hidden lg:table-cell px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-500 dark:text-gray-400 font-medium select-all">
                                            {ext.sipUsername}
                                        </td>
                                        <td className="hidden md:table-cell px-6 py-4 whitespace-nowrap text-sm">
                                            <div className="flex flex-col gap-1 items-start">
                                                {ext.forwardAllEnabled ? (
                                                    <span className="inline-flex items-center px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase tracking-wider bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-600/20">All</span>
                                                ) : ext.forwardNoAnswerEnabled ? (
                                                    <span className="inline-flex items-center px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase tracking-wider bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-600/20">No Answer</span>
                                                ) : (
                                                    <span className="text-[10px] font-bold text-gray-400 uppercase">Off</span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="hidden sm:table-cell px-6 py-4 whitespace-nowrap text-sm">
                                            {ext.ringGroupMembers && ext.ringGroupMembers.length > 0 ? (
                                                <span className="inline-flex items-center px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase tracking-wider bg-teal-50 text-teal-700 ring-1 ring-inset ring-teal-600/20">
                                                    {ext.ringGroupMembers.length} groups
                                                </span>
                                            ) : (
                                                <span className="text-[10px] font-bold text-gray-400 uppercase">None</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium">
                                            <div className="flex items-center justify-end space-x-1.5 opacity-80 group-hover:opacity-100 transition-opacity">
                                                <button
                                                    className="p-1.5 text-gray-400 hover:text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-950/40 rounded-xl transition-all"
                                                    onClick={() => navigate(`/telecom/extensions/${ext.id}/edit`)}
                                                    title="Edit Extension"
                                                >
                                                    <Edit2 className="h-4 w-4" />
                                                </button>
                                                {canManageExtensions && (
                                                    <button
                                                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-xl transition-all"
                                                        onClick={() => handleDelete(ext.id, ext.extensionNumber)}
                                                        title="Delete Extension"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
                <Pagination
                    page={page}
                    limit={limit}
                    total={filteredExtensions.length}
                    onPageChange={setPage}
                    onLimitChange={(l) => { setLimit(l); setPage(1); }}
                    itemName="extensions"
                />
            </div>

            {/* Monitoring Extensions Section */}
            {monitoringUsers.length > 0 && (
                <div className="space-y-4 pt-4">
                    <div className="flex items-center space-x-3">
                        <div className="h-10 w-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-800/40 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0">
                            <Users className="h-5 w-5" />
                        </div>
                        <div>
                            <h2 className="text-xl font-extrabold text-gray-900 dark:text-white tracking-tight">Monitoring Extensions</h2>
                            <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Extensions assigned to users for real-time call monitoring.</p>
                        </div>
                    </div>

                    <div className="bg-white dark:bg-[#0c0d12] rounded-2xl border border-gray-200/80 dark:border-white/10 shadow-xs overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-100 dark:divide-white/5">
                                <thead className="bg-gray-50/75 dark:bg-white/[0.02]">
                                    <tr>
                                        <th className="px-6 py-4 text-left text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Extension #</th>
                                        <th className="px-6 py-4 text-left text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">User Name</th>
                                        <th className="px-6 py-4 text-left text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">User Email</th>
                                        <th className="px-6 py-4 text-left text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">SIP Password</th>
                                        <th className="px-6 py-4 text-right text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-white/5 bg-transparent">
                                    {paginatedMonitoringUsers.map((user) => (
                                        <tr key={user.id} className="hover:bg-gray-50/60 dark:hover:bg-white/[0.02] transition-colors group">
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold text-indigo-700 bg-indigo-50 dark:bg-indigo-950/40 dark:text-indigo-400 ring-1 ring-inset ring-indigo-100/50 dark:ring-indigo-800/40 font-mono">
                                                    {user.monitoringExtension}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900 dark:text-white">{user.name || 'Unnamed'}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-500 dark:text-gray-400">{user.email}</td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="inline-flex items-center text-xs font-mono font-medium text-gray-500 bg-gray-50/80 dark:bg-white/5 px-2.5 py-1 rounded-lg border border-gray-100 dark:border-white/5">
                                                    <Key className="h-3 w-3 mr-1 text-gray-400" />
                                                    Configured
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium">
                                                <div className="flex items-center justify-end space-x-1.5 opacity-80 group-hover:opacity-100 transition-opacity">
                                                    <button
                                                        className="p-1.5 text-gray-400 hover:text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-950/40 rounded-xl transition-all"
                                                        onClick={() => handleEditMonitoring(user)}
                                                    >
                                                        <Edit2 className="h-4 w-4" />
                                                    </button>
                                                    {canManageMonitoring && (
                                                        <button
                                                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-xl transition-all"
                                                            onClick={() => handleDisableMonitoring(user)}
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <Pagination
                            page={mPage}
                            limit={mLimit}
                            total={monitoringUsers.length}
                            onPageChange={setMPage}
                            onLimitChange={(l) => { setMLimit(l); setMPage(1); }}
                            itemName="monitoring extensions"
                        />
                    </div>
                </div>
            )}

            {showMonitoringModal && (
                <MonitoringExtensionModal
                    onClose={() => {
                        setShowMonitoringModal(false);
                        setSelectedMonitoringUser(null);
                    }}
                    onSubmit={handleUpdateMonitoring}
                    loading={savingMonitoring}
                    users={monitoringSeats.users.filter(user => !user.monitoringEnabled || user.id === selectedMonitoringUser?.id)}
                    customerCode={monitoringSeats.customerCode || ''}
                    subscriptions={monitoringSeats.subscriptions || []}
                    initialUserId={selectedMonitoringUser?.id || ''}
                    initialExtension={selectedMonitoringUser?.monitoringExtension || ''}
                    initialName={selectedMonitoringUser?.name || ''}
                    isEditing={!!selectedMonitoringUser}
                />
            )}
        </div>
    );
}

export default ExtensionsPage;
