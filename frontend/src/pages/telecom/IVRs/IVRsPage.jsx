import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Plus, Edit2, Trash2, Clock, Volume2, ShieldAlert, GitMerge, Eye, X, RefreshCw } from 'lucide-react';
import api from '../../../services/api';
import { useAuth } from '../../../context/AuthContext';
import VisualIVRFlow from '../../../components/telecom/VisualIVRFlow';
import Pagination from '../../../components/common/Pagination';
import CreativeStatCard from '../../../components/common/CreativeStatCard';
import { clsx } from 'clsx';

function IVRsPage() {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [ivrs, setIVRs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [viewingIvr, setViewingIvr] = useState(null);
    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(10);

    const ivrLimit = user?.tenant?.tenantFeatures?.ivrLimit ?? 10;
    const isLimitReached = ivrs.length >= ivrLimit;

    useEffect(() => {
        fetchIVRs();
    }, []);

    const fetchIVRs = async () => {
        try {
            setLoading(true);
            const response = await api.get('/telecom/ivrs');
            setIVRs(response.data);
            setError(null);
        } catch (err) {
            console.error('Failed to fetch IVRs:', err);
            setError(err.response?.data?.message || 'Failed to load IVRs');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id, name) => {
        if (!window.confirm(`Are you sure you want to delete IVR "${name}"?`)) {
            return;
        }

        try {
            await api.delete(`/telecom/ivrs/${id}`);
            setIVRs(ivrs.filter(ivr => ivr.id !== id));
        } catch (err) {
            console.error('Failed to delete IVR:', err);
            alert(err.response?.data?.message || 'Failed to delete IVR');
        }
    };

    const filteredIVRs = ivrs.filter(ivr =>
        ivr.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const paginatedIVRs = filteredIVRs.slice((page - 1) * limit, page * limit);

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
                            <GitMerge size={14} className="text-teal-200 animate-pulse" />
                            <span>Interactive Voice Response Trees</span>
                        </div>
                        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                            IVR Menus
                        </h1>
                        <p className="text-teal-100 text-xs sm:text-sm font-medium">
                            Design interactive voice response routing trees, multi-level DTMF prompts, and auto-attendant menus.
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                        <button
                            onClick={fetchIVRs}
                            className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 text-xs font-bold rounded-2xl bg-white/15 hover:bg-white/25 text-white backdrop-blur-md border border-white/20 transition-all active:scale-95 cursor-pointer"
                        >
                            <RefreshCw size={14} className={clsx(loading && "animate-spin")} />
                            <span>Refresh</span>
                        </button>
                        <button
                            onClick={() => !isLimitReached && navigate('/telecom/ivrs/new')}
                            disabled={isLimitReached}
                            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white hover:bg-teal-50 px-5 py-2.5 text-xs font-bold text-teal-800 shadow-lg shadow-black/10 transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
                        >
                            <Plus size={16} className="text-teal-700" />
                            <span>Create IVR</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Quick KPI Stat Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <CreativeStatCard
                    title="Total IVRs"
                    value={ivrs.length}
                    subtitle="Active trees"
                    icon={GitMerge}
                    color="blue"
                    trend="+12%"
                    trendUp={true}
                />
                <CreativeStatCard
                    title="With Greetings"
                    value={ivrs.filter(i => i.greetingAudioPath).length}
                    subtitle="Custom audio prompt"
                    icon={Volume2}
                    color="purple"
                    trend="+8%"
                    trendUp={true}
                />
                <CreativeStatCard
                    title="Avg Timeout"
                    value={`${(ivrs.reduce((a, b) => a + (b.timeoutMs || 5000), 0) / (ivrs.length || 1) / 1000).toFixed(1)}s`}
                    subtitle="Response interval"
                    icon={Clock}
                    color="teal"
                    trend="+5%"
                    trendUp={true}
                />
                <CreativeStatCard
                    title="Plan Limit"
                    value={ivrLimit}
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
                        placeholder="Search IVRs by name..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-gray-50/80 dark:bg-white/[0.03] border border-gray-200/80 dark:border-white/10 rounded-xl pl-10 pr-4 py-2 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 transition-all font-medium"
                    />
                </div>
            </div>

            {filteredIVRs.length === 0 ? (
                <div className="text-center py-16 bg-white dark:bg-[#0c0d12] rounded-2xl border border-dashed border-gray-200 dark:border-white/10 shadow-xs">
                    <div className="bg-gray-50 dark:bg-white/5 p-4 rounded-2xl w-14 h-14 mx-auto mb-3 flex items-center justify-center">
                        <GitMerge className="h-7 w-7 text-gray-400 dark:text-gray-500" />
                    </div>
                    <h3 className="text-base font-bold text-gray-900 dark:text-white">No IVR menus found</h3>
                    <p className="text-gray-500 dark:text-gray-400 mt-1 font-medium text-sm">
                        {searchTerm ? 'Try adjusting your search terms' : 'Create your first IVR menu to start building auto-attendants'}
                    </p>
                </div>
            ) : (
                <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                        {paginatedIVRs.map((ivr) => {
                            const menuCount = ivr.menu ? Object.keys(ivr.menu).length : 0;
                            return (
                                <div key={ivr.id} className="platform-panel-dark rounded-2xl border border-gray-200/80 dark:border-white/10 shadow-xs overflow-hidden hover:border-purple-500/30 transition-all flex flex-col justify-between group">
                                    <div>
                                        <div className="px-5 py-4 border-b border-gray-100 dark:border-white/5 flex justify-between items-center bg-gray-50/50 dark:bg-white/[0.02]">
                                            <div className="flex items-center gap-2.5">
                                                <div className="h-8 w-8 rounded-lg bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                                                    <GitMerge size={16} />
                                                </div>
                                                <h3 className="text-base font-bold text-gray-900 dark:text-white tracking-tight truncate max-w-[150px]">{ivr.name}</h3>
                                            </div>
                                            <span className="inline-flex items-center px-2 py-0.5 rounded-lg text-[10px] font-bold text-blue-700 bg-blue-50 dark:bg-blue-950/40 dark:text-blue-400 ring-1 ring-inset ring-blue-100/50 dark:ring-blue-800/40 shrink-0">
                                                {menuCount} {menuCount === 1 ? 'option' : 'options'}
                                            </span>
                                        </div>

                                        <div className="p-5 flex-1 space-y-3">
                                            <div className="flex items-center justify-between text-xs">
                                                <span className="text-gray-500 dark:text-gray-400 font-semibold flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> Timeout</span>
                                                <span className="font-mono font-bold text-gray-900 dark:text-white px-2 py-0.5 bg-gray-50 dark:bg-white/5 rounded-lg">{(ivr.timeoutMs / 1000).toFixed(1)}s</span>
                                            </div>
                                            <div className="flex items-center justify-between text-xs">
                                                <span className="text-gray-500 dark:text-gray-400 font-semibold flex items-center gap-1.5"><ShieldAlert className="w-3.5 h-3.5" /> Max Failures</span>
                                                <span className="font-mono font-bold text-gray-900 dark:text-white px-2 py-0.5 bg-gray-50 dark:bg-white/5 rounded-lg">{ivr.maxAttempts}</span>
                                            </div>
                                            <div className="flex items-center justify-between text-xs">
                                                <span className="text-gray-500 dark:text-gray-400 font-semibold flex items-center gap-1.5"><Volume2 className="w-3.5 h-3.5" /> Audio Prompt</span>
                                                {ivr.greetingAudioPath ? (
                                                    <span className="text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 dark:text-emerald-400 ring-1 ring-emerald-200/50 dark:ring-emerald-800/40 px-2 py-0.5 rounded-lg text-[10px] font-bold shadow-xs">Uploaded</span>
                                                ) : (
                                                    <span className="text-gray-400 dark:text-gray-500 text-xs">None</span>
                                                )}
                                            </div>

                                            {menuCount > 0 && (
                                                <div className="mt-3 bg-gray-50/70 dark:bg-white/[0.02] rounded-xl p-3 border border-gray-100 dark:border-white/5">
                                                    <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                                                        <GitMerge className="w-3 h-3" /> Menu Preview
                                                    </div>
                                                    <div className="space-y-1.5">
                                                        {Object.entries(ivr.menu).slice(0, 3).map(([digit, action]) => (
                                                            <div key={digit} className="flex items-center text-xs font-medium">
                                                                <span className="w-5 h-5 flex items-center justify-center bg-white dark:bg-[#181924] shadow-xs border border-gray-200/80 dark:border-white/10 rounded-md text-[11px] font-black text-gray-700 dark:text-gray-300 mr-2 shrink-0">{digit}</span>
                                                                <span className="text-gray-600 dark:text-gray-400 truncate text-xs flex-1">→ {action.type}</span>
                                                            </div>
                                                        ))}
                                                        {menuCount > 3 && (
                                                            <div className="text-[10px] font-bold text-gray-400 text-center pt-1">+ {menuCount - 3} more options</div>
                                                        )}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="px-5 py-3 bg-gray-50/50 dark:bg-white/[0.02] border-t border-gray-100 dark:border-white/5 flex gap-2">
                                        <button
                                            onClick={() => setViewingIvr(ivr)}
                                            className="flex-1 inline-flex justify-center items-center gap-1.5 rounded-xl bg-white dark:bg-[#181924] px-2.5 py-2 text-xs font-bold text-emerald-600 dark:text-emerald-400 shadow-xs border border-gray-200/80 dark:border-white/10 hover:bg-emerald-50 dark:hover:bg-emerald-950/20 transition-all"
                                        >
                                            <Eye className="h-3.5 w-3.5" /> Flow
                                        </button>
                                        <button
                                            onClick={() => navigate(`/telecom/ivrs/${ivr.id}/edit`)}
                                            className="flex-1 inline-flex justify-center items-center gap-1.5 rounded-xl bg-white dark:bg-[#181924] px-2.5 py-2 text-xs font-bold text-gray-700 dark:text-gray-200 shadow-xs border border-gray-200/80 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-white/5 transition-all"
                                        >
                                            <Edit2 className="h-3.5 w-3.5" /> Edit
                                        </button>
                                        <button
                                            onClick={() => handleDelete(ivr.id, ivr.name)}
                                            className="flex-1 inline-flex justify-center items-center gap-1.5 rounded-xl bg-white dark:bg-[#181924] px-2.5 py-2 text-xs font-bold text-red-600 dark:text-red-400 shadow-xs border border-gray-200/80 dark:border-white/10 hover:bg-red-50 dark:hover:bg-red-950/20 transition-all"
                                        >
                                            <Trash2 className="h-3.5 w-3.5" /> Delete
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    <div className="bg-white dark:bg-[#0e0f17] rounded-2xl border border-gray-200/80 dark:border-white/10 shadow-xs overflow-hidden">
                        <Pagination
                            page={page}
                            limit={limit}
                            total={filteredIVRs.length}
                            onPageChange={setPage}
                            onLimitChange={(newLimit) => {
                                setLimit(newLimit);
                                setPage(1);
                            }}
                            itemName="IVR menus"
                        />
                    </div>
                </div>
            )}

            {viewingIvr && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-gray-900/60 backdrop-blur-sm">
                    <div className="bg-white dark:bg-[#0e0f17] rounded-3xl shadow-2xl w-full max-w-5xl h-[85vh] flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200 border border-gray-200/80 dark:border-white/10">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-white/5 bg-gray-50/80 dark:bg-white/[0.02]">
                            <h2 className="text-lg font-extrabold text-gray-900 dark:text-white flex items-center gap-2">
                                <GitMerge className="w-5 h-5 text-primary-500" />
                                {viewingIvr.name} Flowchart
                            </h2>
                            <button
                                onClick={() => setViewingIvr(null)}
                                className="p-2 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-200/60 dark:hover:bg-white/5 rounded-xl transition-colors focus:outline-none"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="flex-1 p-2 bg-gray-50/30 dark:bg-black/20">
                            <VisualIVRFlow ivrName={viewingIvr.name} menu={viewingIvr.menu} />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default IVRsPage;
