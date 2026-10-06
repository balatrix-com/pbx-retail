import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Plus, Edit2, Trash2, Clock, Volume2, ShieldAlert, GitMerge, Eye, X } from 'lucide-react';
import api from '../../../services/api';
import { useAuth } from '../../../context/AuthContext';
import VisualIVRFlow from '../../../components/telecom/VisualIVRFlow';

function IVRsPage() {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [ivrs, setIVRs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [viewingIvr, setViewingIvr] = useState(null);

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

    if (loading) {
        return (
            <div className="flex justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6 max-w-7xl mx-auto pb-12 px-4 sm:px-0">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-gray-900">IVR Menus</h1>
                    <p className="text-gray-500 mt-1 font-medium text-sm md:text-base">Design interactive voice response routing trees.</p>
                </div>
                <button
                    onClick={() => !isLimitReached && navigate('/telecom/ivrs/new')}
                    disabled={isLimitReached}
                    className={`w-full sm:w-auto inline-flex items-center justify-center rounded-xl px-5 py-2.5 text-sm font-bold shadow-sm transition-all ${
                        isLimitReached
                            ? 'bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200'
                            : 'bg-primary-600 text-white hover:bg-primary-700 active:scale-[0.98]'
                    }`}
                >
                    <Plus className="h-4 w-4 mr-2" />
                    Create IVR
                </button>
            </div>

            {isLimitReached && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 font-medium shadow-sm flex items-center gap-2">
                    <ShieldAlert className="h-5.5 w-5.5 text-amber-500 shrink-0" />
                    <span>You have reached your limit of {ivrLimit} IVR menus. Please contact your super administrator to upgrade your plan.</span>
                </div>
            )}

            {error && (
                <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-600 font-medium shadow-sm">
                    {error}
                </div>
            )}

            <div className="relative w-full sm:max-w-md">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                    <Search className="h-5 w-5 text-gray-400" />
                </div>
                <input
                    type="text"
                    placeholder="Search IVRs by name..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="block w-full rounded-xl border-0 py-2.5 pl-10 pr-3 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-primary-600 sm:text-sm font-medium bg-white transition-all"
                />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
                {filteredIVRs.length === 0 ? (
                    <div className="col-span-full bg-white rounded-2xl p-12 text-center text-sm font-medium text-gray-500 italic shadow-sm ring-1 ring-gray-100">
                        {searchTerm ? 'No matching IVRs found' : 'No IVRs yet. Create your first one!'}
                    </div>
                ) : (
                    filteredIVRs.map((ivr) => {
                        const menuCount = ivr.menu ? Object.keys(ivr.menu).length : 0;
                        return (
                            <div key={ivr.id} className="bg-white shadow-sm ring-1 ring-gray-100 rounded-2xl flex flex-col hover:shadow-md transition-shadow">
                                <div className="px-6 py-5 border-b border-gray-50 flex justify-between items-start bg-gray-50/30 rounded-t-2xl">
                                    <h3 className="text-lg font-extrabold text-gray-900 truncate pr-4">{ivr.name}</h3>
                                    <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold text-blue-700 bg-blue-50 ring-1 ring-inset ring-blue-100/50 shadow-sm shrink-0">
                                        {menuCount} {menuCount === 1 ? 'option' : 'options'}
                                    </span>
                                </div>

                                <div className="p-6 flex-1 space-y-4">
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="text-gray-500 font-medium flex items-center gap-1.5"><Clock className="w-4 h-4" /> Timeout</span>
                                        <span className="font-mono font-bold text-gray-900 px-2 py-0.5 bg-gray-50 rounded ring-1 ring-gray-100">{(ivr.timeoutMs / 1000).toFixed(1)}s</span>
                                    </div>
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="text-gray-500 font-medium flex items-center gap-1.5"><ShieldAlert className="w-4 h-4" /> Max Failures</span>
                                        <span className="font-mono font-bold text-gray-900 px-2 py-0.5 bg-gray-50 rounded ring-1 ring-gray-100">{ivr.maxAttempts}</span>
                                    </div>
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="text-gray-500 font-medium flex items-center gap-1.5"><Volume2 className="w-4 h-4" /> Audio</span>
                                        {ivr.greetingAudioPath ? (
                                            <span className="text-emerald-700 bg-emerald-50 ring-1 ring-emerald-200/50 px-2 py-0.5 rounded text-xs font-bold shadow-sm">Uploaded</span>
                                        ) : (
                                            <span className="text-gray-500 bg-gray-100 ring-1 ring-gray-200 px-2 py-0.5 rounded text-xs font-medium">None</span>
                                        )}
                                    </div>

                                    {menuCount > 0 && (
                                        <div className="mt-4 bg-gray-50/80 rounded-xl p-4 ring-1 ring-gray-100/80">
                                            <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                                                <GitMerge className="w-3.5 h-3.5" /> Menu Preview
                                            </div>
                                            <div className="space-y-2">
                                                {Object.entries(ivr.menu).slice(0, 4).map(([digit, action]) => (
                                                    <div key={digit} className="flex items-center text-sm font-medium">
                                                        <span className="w-6 h-6 flex items-center justify-center bg-white shadow-sm ring-1 ring-gray-200 rounded text-xs font-bold text-gray-700 mr-2 shrink-0">{digit}</span>
                                                        <span className="text-gray-600 truncate text-xs flex-1">→ {action.type}</span>
                                                    </div>
                                                ))}
                                                {menuCount > 4 && (
                                                    <div className="text-xs font-bold text-gray-400 text-center pt-1">+ {menuCount - 4} more</div>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <div className="flex items-center justify-end gap-2 px-6 py-4 bg-gray-50/50 border-t border-gray-100 rounded-b-2xl">
                                    <button
                                        onClick={() => setViewingIvr(ivr)}
                                        className="inline-flex items-center justify-center rounded-lg px-3 py-1.5 text-sm font-bold text-gray-700 hover:text-emerald-600 hover:bg-emerald-50 transition-colors focus:outline-none ring-1 ring-transparent hover:ring-emerald-100"
                                    >
                                        <Eye className="h-4 w-4 mr-1.5" /> View
                                    </button>
                                    <button
                                        onClick={() => navigate(`/telecom/ivrs/${ivr.id}/edit`)}
                                        className="inline-flex items-center justify-center rounded-lg px-3 py-1.5 text-sm font-bold text-gray-700 hover:text-primary-600 hover:bg-primary-50 transition-colors focus:outline-none ring-1 ring-transparent hover:ring-primary-100"
                                    >
                                        <Edit2 className="h-4 w-4 mr-1.5" /> Edit
                                    </button>
                                    <button
                                        onClick={() => handleDelete(ivr.id, ivr.name)}
                                        className="inline-flex items-center justify-center rounded-lg px-3 py-1.5 text-sm font-bold text-gray-500 hover:text-red-700 hover:bg-red-50 transition-colors focus:outline-none ring-1 ring-transparent hover:ring-red-100"
                                    >
                                        <Trash2 className="h-4 w-4 mr-1.5" /> Delete
                                    </button>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>

            {viewingIvr && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-gray-900/60 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl h-[85vh] flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50/80">
                            <h2 className="text-lg font-extrabold text-gray-900 flex items-center gap-2">
                                <GitMerge className="w-5 h-5 text-primary-500" />
                                {viewingIvr.name} Flowchart
                            </h2>
                            <button
                                onClick={() => setViewingIvr(null)}
                                className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-200 rounded-lg transition-colors focus:outline-none"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="flex-1 p-2 bg-gray-50/30">
                            <VisualIVRFlow ivrName={viewingIvr.name} menu={viewingIvr.menu} />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default IVRsPage;
