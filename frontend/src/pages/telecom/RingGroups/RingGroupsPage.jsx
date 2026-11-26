import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, Plus, Search, ShieldAlert, Users, Layers, Zap, Clock, RefreshCw } from 'lucide-react';
import api from '../../../services/api';
import { useAuth } from '../../../context/AuthContext';
import Pagination from '../../../components/common/Pagination';
import CreativeStatCard from '../../../components/common/CreativeStatCard';
import { clsx } from 'clsx';

function RingGroupsPage() {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [ringGroups, setRingGroups] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(10);

    const ringGroupLimit = user?.tenant?.tenantFeatures?.ringGroupLimit ?? 10;
    const isLimitReached = ringGroups.length >= ringGroupLimit;

    useEffect(() => {
        fetchRingGroups();
    }, []);

    const fetchRingGroups = async () => {
        try {
            setLoading(true);
            const response = await api.get('/telecom/ring-groups');
            setRingGroups(Array.isArray(response.data) ? response.data : []);
            setError(null);
        } catch (err) {
            console.error('Failed to fetch ring groups:', err);
            setError(err.response?.data?.message || 'Failed to load ring groups');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id, name) => {
        if (!window.confirm(`Are you sure you want to delete ring group "${name}"?`)) {
            return;
        }

        try {
            await api.delete(`/telecom/ring-groups/${id}`);
            setRingGroups(ringGroups.filter(rg => rg.id !== id));
        } catch (err) {
            console.error('Failed to delete ring group:', err);
            alert(err.response?.data?.message || 'Failed to delete ring group');
        }
    };

    const filteredRingGroups = ringGroups.filter(rg =>
        rg.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const paginatedRingGroups = filteredRingGroups.slice((page - 1) * limit, page * limit);

    const getStrategyBadge = (strategy) => {
        const badges = {
            simultaneous: { label: 'Simultaneous', class: 'bg-green-50 text-green-700 ring-1 ring-inset ring-green-200/50' },
            sequential: { label: 'Sequential', class: 'bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-200/50' },
            cascade: { label: 'Cascade', class: 'bg-indigo-50 text-indigo-700 ring-1 ring-inset ring-indigo-200/50' },
        };
        return badges[strategy] || { label: strategy, class: 'bg-gray-50 text-gray-700 ring-1 ring-inset ring-gray-200/50' };
    };

    if (loading) {
        return (
            <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
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
                            <Users size={14} className="text-teal-200 animate-pulse" />
                            <span>Hunt Groups & Distribution</span>
                        </div>
                        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                            Ring Groups
                        </h1>
                        <p className="text-teal-100 text-xs sm:text-sm font-medium">
                            Group extensions together for simultaneous, sequential, or tiered hunt routing strategies.
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                        <button
                            onClick={fetchRingGroups}
                            className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 text-xs font-bold rounded-2xl bg-white/15 hover:bg-white/25 text-white backdrop-blur-md border border-white/20 transition-all active:scale-95 cursor-pointer"
                        >
                            <RefreshCw size={14} className={clsx(loading && "animate-spin")} />
                            <span>Refresh</span>
                        </button>
                        <button
                            disabled={isLimitReached}
                            onClick={() => !isLimitReached && navigate('/telecom/ring-groups/new')}
                            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white hover:bg-teal-50 px-5 py-2.5 text-xs font-bold text-teal-800 shadow-lg shadow-black/10 transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
                        >
                            <Plus size={16} className="text-teal-700" />
                            <span>Create Ring Group</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Quick KPI Stat Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <CreativeStatCard
                    title="Total Groups"
                    value={ringGroups.length}
                    subtitle="Active groups"
                    icon={Users}
                    color="blue"
                    trend="+12%"
                    trendUp={true}
                />
                <CreativeStatCard
                    title="Simultaneous"
                    value={ringGroups.filter(r => r.strategy === 'simultaneous').length}
                    subtitle="Blast ring"
                    icon={Zap}
                    color="emerald"
                    trend="+8%"
                    trendUp={true}
                />
                <CreativeStatCard
                    title="Sequential"
                    value={ringGroups.filter(r => r.strategy === 'sequential' || r.strategy === 'cascade').length}
                    subtitle="Tiered hunting"
                    icon={Layers}
                    color="purple"
                    trend="+5%"
                    trendUp={true}
                />
                <CreativeStatCard
                    title="Plan Limit"
                    value={ringGroupLimit}
                    subtitle="Maximum allowed"
                    icon={ShieldAlert}
                    color="amber"
                    trend={isLimitReached ? "Cap reached" : "Available"}
                    trendUp={!isLimitReached}
                />
            </div>

            {/* Unified search bar */}
            <div className="bg-white dark:bg-[#0c0d12] p-3 rounded-2xl border border-gray-200/80 dark:border-white/10 shadow-xs">
                <div className="relative max-w-md">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 h-4 w-4" />
                    <input
                        type="text"
                        placeholder="Search ring groups..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-gray-50/80 dark:bg-white/[0.03] border border-gray-200/80 dark:border-white/10 rounded-xl pl-10 pr-4 py-2 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 transition-all font-medium"
                    />
                </div>
            </div>

            {filteredRingGroups.length === 0 ? (
                <div className="text-center py-16 bg-white dark:bg-[#0c0d12] rounded-2xl border border-dashed border-gray-200 dark:border-white/10 shadow-xs">
                    <div className="bg-gray-50 dark:bg-white/5 p-4 rounded-2xl w-14 h-14 mx-auto mb-3 flex items-center justify-center">
                        <Users className="h-7 w-7 text-gray-400 dark:text-gray-500" />
                    </div>
                    <h3 className="text-base font-bold text-gray-900 dark:text-white">No ring groups found</h3>
                    <p className="text-gray-500 dark:text-gray-400 mt-1 font-medium text-sm">
                        {searchTerm ? 'Try adjusting your search terms' : 'Create your first ring group to get started'}
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {paginatedRingGroups.map((rg) => {
                        const strategyBadge = getStrategyBadge(rg.strategy);
                        return (
                            <div key={rg.id} className="platform-panel-dark rounded-2xl border border-gray-200/80 dark:border-white/10 shadow-xs overflow-hidden hover:border-teal-500/30 transition-all flex flex-col justify-between group">
                                <div>
                                    <div className="bg-gray-50/50 dark:bg-white/[0.02] px-5 py-4 border-b border-gray-100 dark:border-white/5 flex justify-between items-center">
                                        <div className="flex items-center gap-2.5">
                                            <div className="h-8 w-8 rounded-lg bg-teal-50 dark:bg-teal-950/40 text-teal-600 dark:text-teal-400 flex items-center justify-center">
                                                <Users size={16} />
                                            </div>
                                            <h3 className="text-base font-bold text-gray-900 dark:text-white tracking-tight">{rg.name}</h3>
                                        </div>
                                        <span className={`inline-flex items-center px-2 py-0.5 rounded-lg text-[10px] font-bold uppercase tracking-wider ${strategyBadge.class}`}>
                                            {strategyBadge.label}
                                        </span>
                                    </div>

                                    <div className="p-5 flex-1 space-y-3">
                                        <div className="flex justify-between items-center text-xs">
                                            <span className="font-semibold text-gray-500 dark:text-gray-400">Total Members:</span>
                                            <span className="font-bold text-gray-900 dark:text-white">{rg.members?.length || 0} agents</span>
                                        </div>
                                        <div className="flex justify-between items-center text-xs">
                                            <span className="font-semibold text-gray-500 dark:text-gray-400">Ring Timeout:</span>
                                            <span className="font-bold text-gray-900 dark:text-white font-mono">{rg.ringTimeout}s</span>
                                        </div>
                                        {rg.noAnswerAction && (
                                            <div className="flex justify-between items-center text-xs">
                                                <span className="font-semibold text-gray-500 dark:text-gray-400">No Answer Fallback:</span>
                                                <span className="font-semibold text-gray-700 dark:text-gray-300 capitalize">{rg.noAnswerAction}</span>
                                            </div>
                                        )}

                                        {rg.members && rg.members.length > 0 && (
                                            <div className="pt-2 border-t border-gray-100 dark:border-white/5">
                                                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1.5">Extensions</span>
                                                <div className="flex flex-wrap gap-1.5">
                                                    {rg.members.slice(0, 4).map((member) => (
                                                        <span key={member.id} className="inline-flex items-center px-2 py-0.5 rounded-lg text-xs font-bold text-primary-700 bg-primary-50 dark:bg-primary-950/40 dark:text-primary-400 ring-1 ring-inset ring-primary-100/50 dark:ring-primary-800/40 font-mono">
                                                            {member.extension?.extensionNumber}
                                                        </span>
                                                    ))}
                                                    {rg.members.length > 4 && (
                                                        <span className="inline-flex items-center px-2 py-0.5 rounded-lg text-xs font-bold text-gray-500 bg-gray-50 dark:bg-white/5">
                                                            +{rg.members.length - 4} more
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="px-5 py-3 bg-gray-50/50 dark:bg-white/[0.02] border-t border-gray-100 dark:border-white/5 flex gap-2">
                                    <button
                                        className="flex-1 inline-flex justify-center items-center gap-1.5 rounded-xl bg-white dark:bg-[#181924] px-3 py-2 text-xs font-bold text-gray-700 dark:text-gray-200 shadow-xs border border-gray-200/80 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-white/5 transition-all"
                                        onClick={() => navigate(`/telecom/ring-groups/${rg.id}/edit`)}
                                    >
                                        Edit
                                    </button>
                                    <button
                                        className="flex-1 inline-flex justify-center items-center gap-1.5 rounded-xl bg-white dark:bg-[#181924] px-3 py-2 text-xs font-bold text-red-600 dark:text-red-400 shadow-xs border border-gray-200/80 dark:border-white/10 hover:bg-red-50 dark:hover:bg-red-950/20 transition-all"
                                        onClick={() => handleDelete(rg.id, rg.name)}
                                    >
                                        Delete
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Pagination */}
            <div className="bg-white dark:bg-[#0c0d12] rounded-2xl border border-gray-200/80 dark:border-white/10 shadow-xs overflow-hidden">
                <Pagination
                    page={page}
                    limit={limit}
                    total={filteredRingGroups.length}
                    onPageChange={setPage}
                    onLimitChange={(l) => { setLimit(l); setPage(1); }}
                    itemName="ring groups"
                />
            </div>
        </div>
    );
}

export default RingGroupsPage;
