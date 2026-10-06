import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { telecomService } from '../../../services/telecom.service';
import { PhoneForwarded, Trash2, Edit, Plus, ShieldAlert } from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';

function DIDForwardsPage() {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [forwards, setForwards] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');

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

    if (loading) {
        return (
            <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
            </div>
        );
    }

    return (
        <div className="p-6 max-w-7xl mx-auto pb-12">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                <div>
                    <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-gray-900">DID Forwards</h1>
                    <p className="text-sm text-gray-500 mt-1 font-medium">Manage external call forwarding destinations</p>
                </div>
                <button
                    disabled={isLimitReached}
                    onClick={() => !isLimitReached && navigate('/telecom/did-forwards/new')}
                    className={`w-full sm:w-auto inline-flex items-center justify-center rounded-xl px-5 py-2.5 text-sm font-bold shadow-sm transition-all focus:outline-none ${
                        isLimitReached
                            ? 'bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200'
                            : 'bg-primary-600 text-white hover:bg-primary-700 active:scale-[0.98]'
                    }`}
                >
                    <Plus size={20} className="mr-1" />
                    Create Forward
                </button>
            </div>

            {isLimitReached && (
                <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 font-medium shadow-sm flex items-center gap-2">
                    <ShieldAlert className="h-5.5 w-5.5 text-amber-500 shrink-0" />
                    <span>You have reached your limit of {didForwardLimit} DID Forwards. Please contact your super administrator to upgrade your plan.</span>
                </div>
            )}

            {error && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg">
                    {error}
                </div>
            )}

            <div className="mb-6">
                <input
                    type="text"
                    placeholder="Search forwards..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full max-w-md px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredForwards.length === 0 ? (
                    <div className="col-span-full text-center py-16 bg-white rounded-2xl border border-dashed border-gray-300 shadow-sm">
                        <PhoneForwarded className="mx-auto h-12 w-12 text-gray-300 mb-4" />
                        <h3 className="text-lg font-bold text-gray-900">No forwards found</h3>
                        <p className="text-gray-500 mt-1 font-medium">
                            {searchTerm ? 'Try adjusting your search terms' : 'Create your first DID forward to get started'}
                        </p>
                    </div>
                ) : (
                    filteredForwards.map((forward) => (
                        <div key={forward.id} className="bg-white rounded-2xl shadow-sm ring-1 ring-gray-200 overflow-hidden hover:shadow-md transition-shadow flex flex-col group">

                            <div className="px-6 py-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-orange-50 ring-1 ring-inset ring-orange-100/50 flex items-center justify-center text-orange-600 shadow-sm shrink-0">
                                        <PhoneForwarded className="h-5 w-5" />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-bold tracking-tight text-gray-900">{forward.name}</h3>
                                        <p className="text-xs font-medium text-gray-500">ID: {forward.sequenceId}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-4 px-6 py-5 flex-1">
                                <div className="flex justify-between items-center text-sm">
                                    <span className="font-medium text-gray-500">Destination:</span>
                                    <span className="font-bold font-mono text-gray-900">{forward.destinationNumber}</span>
                                </div>
                                <div className="flex justify-between items-center text-sm">
                                    <span className="font-medium text-gray-500">Created:</span>
                                    <span className="font-bold text-gray-900">{new Date(forward.createdAt).toLocaleDateString()}</span>
                                </div>
                            </div>

                            <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex gap-3">
                                <button
                                    onClick={() => navigate(`/telecom/did-forwards/${forward.id}/edit`)}
                                    className="flex-1 inline-flex justify-center items-center gap-2 rounded-xl bg-white px-3 py-2 text-sm font-bold text-gray-700 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 hover:ring-gray-400 transition-all focus:outline-none"
                                >
                                    <Edit className="h-4 w-4" />
                                    Edit
                                </button>
                                <button
                                    onClick={() => handleDelete(forward.id, forward.name)}
                                    className="flex-1 inline-flex justify-center items-center gap-2 rounded-xl bg-white px-3 py-2 text-sm font-bold text-red-600 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-red-50 hover:ring-red-200 hover:text-red-700 transition-all focus:outline-none"
                                >
                                    <Trash2 className="h-4 w-4" />
                                    Delete
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}

export default DIDForwardsPage;
