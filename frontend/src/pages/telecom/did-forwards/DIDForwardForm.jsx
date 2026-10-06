import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { telecomService } from '../../../services/telecom.service';
import { ArrowLeft, Save } from 'lucide-react';

function DIDForwardForm() {
    const navigate = useNavigate();
    const { id } = useParams();
    const isEditMode = !!id;

    const [formData, setFormData] = useState({
        name: '',
        destinationNumber: ''
    });
    const [loading, setLoading] = useState(false);
    const [initialLoading, setInitialLoading] = useState(isEditMode);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (isEditMode) {
            fetchForward();
        }
    }, [id]);

    const fetchForward = async () => {
        try {
            const data = await telecomService.getDIDForwards(); // This fetches all, ideally we should have getOne but service handles it
            // Wait, service helper `getDIDForwards` fetches ALL. 
            // We need a specific one. I'll filter from the list or add getOne to service.
            // For now, let's just find from the list as the list endpoint is implemented.
            // Wait, backend controller HAS findOne. Frontend service does NOT expose it yet.
            // I should update service or just find in list. Finding in list is inefficient but works for small lists.
            // Let's rely on finding from full list for now to save a service change, or just add `getDIDForward` to service?
            // Service change is cleaner.

            // Re-checking telecom.service.js, I only added getDIDForwards (all).
            // I'll just fetch all and find.
            const all = await telecomService.getDIDForwards();
            const found = all.find(f => f.id === id);
            if (found) {
                setFormData({
                    name: found.name,
                    destinationNumber: found.destinationNumber
                });
            } else {
                setError('DID Forward not found');
            }
        } catch (err) {
            console.error('Failed to fetch DID forward:', err);
            setError('Failed to load DID forward details');
        } finally {
            setInitialLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!formData.name.trim() || !formData.destinationNumber.trim()) {
            setError('Please fill in all required fields');
            return;
        }

        try {
            setLoading(true);
            setError(null);

            if (isEditMode) {
                await telecomService.updateDIDForward(id, formData);
            } else {
                await telecomService.createDIDForward(formData);
            }

            navigate('/telecom/did-forwards');
        } catch (err) {
            console.error('Failed to save DID forward:', err);
            const res = err.response?.data;
            let msg = 'Failed to save DID forward';

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

    if (initialLoading) {
        return (
            <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
            </div>
        );
    }

    return (
        <div className="max-w-2xl mx-auto pb-12 p-6">
            <button
                onClick={() => navigate('/telecom/did-forwards')}
                className="flex items-center gap-2 text-sm font-bold text-gray-500 hover:text-gray-900 mb-6 transition-colors focus:outline-none"
            >
                <ArrowLeft size={20} />
                Back to DID Forwards
            </button>

            <div className="bg-white rounded-2xl shadow-sm ring-1 ring-gray-200 overflow-hidden">
                <div className="px-6 py-5 border-b border-gray-100 bg-gray-50/50">
                    <h1 className="text-2xl font-bold text-gray-900">
                        {isEditMode ? 'Edit DID Forward' : 'Create DID Forward'}
                    </h1>
                    <p className="text-sm font-medium text-gray-500 mt-1">
                        Configure an external number destination that can be used by DIDs.
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    {error && (
                        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl flex justify-between items-center text-sm font-medium">
                            {error}
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">
                            Friendly Name <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            placeholder="e.g. CEO Mobile"
                            className="block w-full rounded-xl border-0 py-2.5 px-3 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-primary-600 sm:text-sm font-medium bg-gray-50/50 hover:bg-white transition-colors"
                            required
                        />
                        <p className="mt-1.5 text-xs font-medium text-gray-500">A name to identify this forward in the dashboard.</p>
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">
                            Destination Number <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="tel"
                            value={formData.destinationNumber}
                            onChange={(e) => setFormData({ ...formData, destinationNumber: e.target.value })}
                            placeholder="e.g. +15551234567"
                            className="block w-full rounded-xl border-0 py-2.5 px-3 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-primary-600 sm:text-sm font-medium bg-gray-50/50 hover:bg-white transition-colors font-mono"
                            required
                        />
                        <p className="mt-1.5 text-xs font-medium text-gray-500">The external phone number receiving the call (E.164 format recommended).</p>
                    </div>

                    <div className="pt-6 border-t border-gray-100 flex justify-end gap-3 mt-8">
                        <button
                            type="button"
                            onClick={() => navigate('/telecom/did-forwards')}
                            disabled={loading}
                            className="rounded-xl bg-white px-5 py-2.5 text-sm font-bold text-gray-700 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 hover:ring-gray-400 transition-all focus:outline-none disabled:opacity-50"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="inline-flex justify-center items-center rounded-xl border border-transparent bg-primary-600 px-5 py-2.5 text-sm font-bold text-white shadow-sm hover:shadow-md hover:bg-primary-700 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading && <div className="w-4 h-4 rounded-full border-2 border-white/20 border-t-white animate-spin mr-2" />}
                            <Save size={16} className={loading ? 'hidden' : 'mr-2'} />
                            {loading ? 'Saving...' : 'Save Forward'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default DIDForwardForm;
