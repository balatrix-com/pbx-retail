import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, Plus, Search, ShieldAlert } from 'lucide-react';
import api from '../../../services/api';
import { useAuth } from '../../../context/AuthContext';

function RingGroupsPage() {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [ringGroups, setRingGroups] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');

    const ringGroupLimit = user?.tenant?.tenantFeatures?.ringGroupLimit ?? 10;
    const isLimitReached = ringGroups.length >= ringGroupLimit;

    useEffect(() => {
        fetchRingGroups();
    }, []);

    const fetchRingGroups = async () => {
        try {
            setLoading(true);
            const response = await api.get('/telecom/ring-groups');
            console.log('Ring Groups response:', response.data);
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
        <div className="space-y-6 max-w-7xl mx-auto pb-12 px-4 sm:px-0">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-gray-900">Ring Groups</h1>
                    <p className="text-gray-500 mt-1.5 font-medium text-sm md:text-base">Group extensions together for simultaneous or tiered routing.</p>
                </div>
                <button
                    disabled={isLimitReached}
                    onClick={() => !isLimitReached && navigate('/telecom/ring-groups/new')}
                    className={`inline-flex justify-center items-center rounded-xl px-5 py-2.5 text-sm font-bold shadow-sm transition-all focus:outline-none w-full sm:w-auto ${
                        isLimitReached
                            ? 'bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200'
                            : 'bg-primary-600 text-white hover:bg-primary-700 active:scale-[0.98]'
                    }`}
                >
                    <Plus className="h-5 w-5 mr-1" /> Create Ring Group
                </button>
            </div>

            {isLimitReached && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 font-medium shadow-sm flex items-center gap-2">
                    <ShieldAlert className="h-5.5 w-5.5 text-amber-500 shrink-0" />
                    <span>You have reached your limit of {ringGroupLimit} Ring Groups. Please contact your super administrator to upgrade your plan.</span>
                </div>
            )}

            {error && (
                <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-600 font-medium">
                    {error}
                </div>
            )}

            <div className="relative w-full sm:max-w-md">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                    <Search className="h-5 w-5 text-gray-400" />
                </div>
                <input
                    type="text"
                    placeholder="Search ring groups..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="block w-full rounded-xl border-0 py-2.5 pl-10 pr-3 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-primary-600 sm:text-sm sm:leading-6 font-medium bg-white"
                />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredRingGroups.length === 0 ? (
                    <div className="col-span-full py-12 text-center">
                        <p className="text-gray-500 font-medium">
                            {searchTerm ? 'No matching ring groups found.' : 'No ring groups yet. Create your first one!'}
                        </p>
                    </div>
                ) : (
                    filteredRingGroups.map((rg) => {
                        const strategyBadge = getStrategyBadge(rg.strategy);
                        return (
                            <div key={rg.id} className="rounded-2xl bg-white shadow-sm ring-1 ring-gray-100 flex flex-col overflow-hidden hover:shadow-md transition-shadow">
                                <div className="bg-gray-50/50 px-6 py-4 border-b border-gray-100 flex justify-between items-start">
                                    <h3 className="text-lg font-extrabold text-gray-900 tracking-tight leading-tight">{rg.name}</h3>
                                    <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider shadow-sm ml-2 shrink-0 ${strategyBadge.class}`}>
                                        {strategyBadge.label}
                                    </span>
                                </div>

                                <div className="p-6 flex-1 flex flex-col space-y-4">
                                    <div className="flex justify-between items-center border-b border-gray-50 pb-3">
                                        <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">Members</span>
                                        <span className="text-sm font-bold text-gray-900">{rg.members?.length || 0}</span>
                                    </div>
                                    <div className="flex justify-between items-center border-b border-gray-50 pb-3">
                                        <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">Ring Timeout</span>
                                        <span className="text-sm font-bold text-gray-900">{rg.ringTimeout}s</span>
                                    </div>
                                    {rg.noAnswerAction && (
                                        <div className="flex justify-between items-center border-b border-gray-50 pb-3">
                                            <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">No Answer</span>
                                            <span className="text-sm font-bold text-gray-900 capitalize">{rg.noAnswerAction}</span>
                                        </div>
                                    )}

                                    {rg.members && rg.members.length > 0 && (
                                        <div className="pt-2">
                                            <div className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Extensions</div>
                                            <div className="flex flex-wrap gap-2">
                                                {rg.members.slice(0, 3).map((member) => (
                                                    <span key={member.id} className="inline-flex items-center px-2.5 py-1 rounded-md text-sm font-bold text-primary-700 bg-primary-50 ring-1 ring-inset ring-primary-100/50 shadow-sm font-mono">
                                                        {member.extension.extensionNumber}
                                                    </span>
                                                ))}
                                                {rg.members.length > 3 && (
                                                    <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold text-gray-500 bg-gray-50 ring-1 ring-inset ring-gray-200/50 shadow-sm">
                                                        +{rg.members.length - 3} more
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <div className="px-6 py-4 bg-gray-50 flex border-t border-gray-100 gap-3">
                                    <button
                                        className="flex-1 rounded-xl bg-white px-3 py-2 text-sm font-bold text-gray-700 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 transition-colors"
                                        onClick={() => navigate(`/telecom/ring-groups/${rg.id}/edit`)}
                                    >
                                        Edit
                                    </button>
                                    <button
                                        className="flex-1 rounded-xl bg-white px-3 py-2 text-sm font-bold text-red-600 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-red-50 hover:ring-red-200 hover:text-red-700 transition-colors"
                                        onClick={() => handleDelete(rg.id, rg.name)}
                                    >
                                        Delete
                                    </button>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
}

export default RingGroupsPage;
