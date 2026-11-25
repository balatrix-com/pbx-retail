import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { telecomService } from '../../../services/telecom.service';
import { PhoneForwarded, Trash2, Edit, Plus, ShieldAlert } from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import Pagination from '../../../components/common/Pagination';
import CreativeStatCard from '../../../components/common/CreativeStatCard';

function DIDForwardsPage() {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [forwards, setForwards] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(10);

    const didForwardLimit = user?.tenant?.tenantFeatures?.didForwardLimit ?? 10;
    const isLimitReached = forwards.length >= didForwardLimit;

    useEffect(() => {
        fetchForwards();
    }, []);

    const fetchForwards = async () => {
        try {
            setLoading(true);
            const data = await telecomService.getDIDForwards();
            setForwards(Array.isArray(data) ? data : []);
            setError(null);
        } catch (err) {
            console.error('Failed to fetch DID forwards:', err);
            const res = err.response?.data;
            let msg = 'Failed to load DID forwards';

            if (res) {
                if (typeof res === 'string') msg = res;
                else if (res.message) {
                    if (Array.isArray(res.message)) msg = res.message.join(', ');
                    else if (typeof res.message === 'object') msg = JSON.stringify(res.message);
                    else msg = res.message;
                }
                else if (res.error) msg = res.error;
            }

            setError(msg);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id, name) => {
        if (!window.confirm(`Are you sure you want to delete forward "${name}"?`)) {
            return;
        }

        try {
            await telecomService.deleteDIDForward(id);
            setForwards(forwards.filter(f => f.id !== id));
        } catch (err) {
            console.error('Failed to delete DID forward:', err);
            alert(err.response?.data?.message || 'Failed to delete DID forward');
        }
    };

    const filteredForwards = forwards.filter(f =>
        f.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        f.destinationNumber.includes(searchTerm)
    );

    const paginatedForwards = filteredForwards.slice((page - 1) * limit, page * limit);

    if (loading) {
        return (
            <div className="flex justify-center items-center h-64">
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
                            <PhoneForwarded size={14} className="text-teal-200 animate-pulse" />
                            <span>External PSTN Forwarding</span>
                        </div>
                        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                            DID Forwards
                        </h1>
                        <p className="text-teal-100 text-xs sm:text-sm font-medium">
                            Manage external telephone forwarding, off-net mobile dispatch, and PSTN destination endpoints.
                        </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                        <button
                            disabled={isLimitReached}
                            onClick={() => !isLimitReached && navigate('/telecom/did-forwards/new')}
                            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white hover:bg-teal-50 px-5 py-2.5 text-xs font-bold text-teal-800 shadow-lg shadow-black/10 transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
                        >
                            <Plus size={16} className="text-teal-700" />
                            <span>Create Forward</span>
                        </button>
                    </div>
                </div>
            </div>

            {isLimitReached && (
                <div className="rounded-3xl border border-amber-200 dark:border-amber-900/40 bg-amber-50 dark:bg-amber-950/30 p-5 text-sm text-amber-800 dark:text-amber-300 font-medium shadow-sm flex items-center gap-3">
                    <ShieldAlert className="h-5 w-5 text-amber-500 shrink-0" />
                    <span>You have reached your limit of {didForwardLimit} DID Forwards. Please contact your administrator to upgrade your plan allowance.</span>
                </div>
            )}

            {error && (
                <div className="p-5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/40 text-rose-800 dark:text-rose-300 rounded-3xl text-xs font-medium shadow-sm">
                    {error}
                </div>
            )}

            {/* Quick KPI Stat Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                <CreativeStatCard
                    title="Active Forwards"
                    value={forwards.length}
                    subtitle="Configured destinations"
                    icon={PhoneForwarded}
                    color="blue"
                    trend="+12%"
                    trendUp={true}
                />
                <CreativeStatCard
                    title="Plan Limit"
                    value={didForwardLimit}
                    subtitle="Allowed max forwards"
                    icon={ShieldAlert}
                    color="amber"
                    trend={isLimitReached ? "Cap reached" : "Available"}
                    trendUp={!isLimitReached}
                />
                <CreativeStatCard
                    title="Available Capacity"
                    value={Math.max(0, didForwardLimit - forwards.length)}
                    subtitle="Slots ready to provision"
                    icon={Plus}
                    color="emerald"
                    trend={Math.max(0, didForwardLimit - forwards.length) > 0 ? "Slots left" : "Full"}
                    trendUp={Math.max(0, didForwardLimit - forwards.length) > 0}
                />
            </div>

            {/* Unified search bar */}
            <div className="bg-white dark:bg-[#0c0d12] p-3 rounded-2xl border border-gray-200/80 dark:border-white/10 shadow-xs">
                <div className="relative max-w-md">
                    <input
                        type="text"
                        placeholder="Search forwards by name or destination..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-gray-50/80 dark:bg-white/[0.03] border border-gray-200/80 dark:border-white/10 rounded-xl px-4 py-2 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 transition-all font-medium"
                    />
                </div>
            </div>

            {filteredForwards.length === 0 ? (
                <div className="text-center py-16 bg-white dark:bg-[#0c0d12] rounded-2xl border border-dashed border-gray-200 dark:border-white/10 shadow-xs">
                    <div className="bg-orange-50 dark:bg-orange-950/40 p-4 rounded-2xl w-14 h-14 mx-auto mb-3 flex items-center justify-center">
                        <PhoneForwarded className="h-7 w-7 text-orange-600 dark:text-orange-400" />
                    </div>
                    <h3 className="text-base font-bold text-gray-900 dark:text-white">No forwards found</h3>
                    <p className="text-gray-500 dark:text-gray-400 mt-1 font-medium text-sm">
                        {searchTerm ? 'Try adjusting your search terms' : 'Create your first DID forward to get started'}
                    </p>
                </div>
            ) : (
                <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {paginatedForwards.map((forward) => (
                        <div key={forward.id} className="platform-panel-dark rounded-2xl border border-gray-200/80 dark:border-white/10 shadow-xs overflow-hidden hover:border-orange-500/30 transition-all flex flex-col justify-between group">
                            <div>
                                <div className="px-5 py-4 border-b border-gray-100 dark:border-white/5 flex justify-between items-center bg-gray-50/50 dark:bg-white/[0.02]">
                                    <div className="flex items-center gap-3">
                                        <div className="w-9 h-9 rounded-xl bg-orange-50 dark:bg-orange-950/40 border border-orange-100 dark:border-orange-800/30 flex items-center justify-center text-orange-600 dark:text-orange-400 shrink-0">
                                            <PhoneForwarded className="h-4 w-4" />
                                        </div>
                                        <div>
                                            <h3 className="text-base font-bold tracking-tight text-gray-900 dark:text-white">{forward.name}</h3>
                                            <p className="text-xs font-mono text-gray-500 dark:text-gray-400">ID: {forward.sequenceId}</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-3 px-5 py-4">
                                    <div className="flex justify-between items-center text-xs">
                                        <span className="font-semibold text-gray-500 dark:text-gray-400">Destination:</span>
                                        <span className="font-bold font-mono text-gray-900 dark:text-white">{forward.destinationNumber}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-xs">
                                        <span className="font-semibold text-gray-500 dark:text-gray-400">Created:</span>
                                        <span className="font-semibold text-gray-700 dark:text-gray-300">{new Date(forward.createdAt).toLocaleDateString()}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="px-5 py-3 bg-gray-50/50 dark:bg-white/[0.02] border-t border-gray-100 dark:border-white/5 flex gap-2">
                                <button
                                    onClick={() => navigate(`/telecom/did-forwards/${forward.id}/edit`)}
                                    className="flex-1 inline-flex justify-center items-center gap-1.5 rounded-xl bg-white dark:bg-[#181924] px-3 py-2 text-xs font-bold text-gray-700 dark:text-gray-200 shadow-xs border border-gray-200/80 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-white/5 transition-all"
                                >
                                    <Edit className="h-3.5 w-3.5 text-gray-500" />
                                    Edit
                                </button>
                                <button
                                    onClick={() => handleDelete(forward.id, forward.name)}
                                    className="flex-1 inline-flex justify-center items-center gap-1.5 rounded-xl bg-white dark:bg-[#181924] px-3 py-2 text-xs font-bold text-red-600 dark:text-red-400 shadow-xs border border-gray-200/80 dark:border-white/10 hover:bg-red-50 dark:hover:bg-red-950/20 transition-all"
                                >
                                    <Trash2 className="h-3.5 w-3.5" />
                                    Delete
                                </button>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="bg-white dark:bg-[#0e0f17] rounded-2xl border border-gray-200/80 dark:border-white/10 shadow-xs overflow-hidden">
                    <Pagination
                        page={page}
                        limit={limit}
                        total={filteredForwards.length}
                        onPageChange={setPage}
                        onLimitChange={(newLimit) => {
                            setLimit(newLimit);
                            setPage(1);
                        }}
                        itemName="DID forwards"
                    />
                </div>
            </div>
            )}
        </div>
    );
}

export default DIDForwardsPage;
