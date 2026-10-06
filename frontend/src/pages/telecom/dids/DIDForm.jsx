import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Save } from 'lucide-react';
import api from '../../../services/api';

const DIDForm = () => {
    const navigate = useNavigate();
    const { id } = useParams();
    const isEditMode = Boolean(id);

    const [formData, setFormData] = useState({
        didNumber: '',
        routeType: 'extension',
        routeDestinationId: '',
        forwardNumber: '',
    });

    const [extensions, setExtensions] = useState([]);
    const [ringGroups, setRingGroups] = useState([]);
    const [ivrs, setIVRs] = useState([]);
    const [didForwards, setDidForwards] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        loadDropdownData();
        if (isEditMode) {
            loadDID();
        }
    }, [id]);

    const loadDropdownData = async () => {
        try {
            const [extRes, rgRes, ivrRes, fwdRes] = await Promise.all([
                api.get('/telecom/extensions').catch(err => {
                    console.error('Failed to load extensions:', err);
                    return { data: [] };
                }),
                api.get('/telecom/ring-groups').catch(err => {
                    console.error('Failed to load ring groups:', err);
                    return { data: [] };
                }),
                api.get('/telecom/ivrs').catch(err => {
                    console.error('Failed to load ivrs:', err);
                    return { data: [] };
                }),
                api.get('/telecom/did-forwards').catch(err => {
                    console.error('Failed to load did-forwards:', err);
                    return { data: [] };
                }),
            ]);
            setExtensions(extRes.data || []);
            setRingGroups(rgRes.data || []);
            setIVRs(ivrRes.data || []);
            setDidForwards(fwdRes.data || []);
        } catch (err) {
            console.error('Error loading dropdown data:', err);
        }
    };

    const loadDID = async () => {
        try {
            setLoading(true);
            const response = await api.get(`/telecom/dids/${id}`);
            setFormData({
                didNumber: response.data.number,
                routeType: response.data.routeType || 'extension',
                routeDestinationId: response.data.routeTargetId || '',
                forwardNumber: response.data.forwardNumber || '',
            });
        } catch (err) {
            setError('Failed to load phone number');
            console.error('Error loading DID:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        // Validation
        if (!formData.didNumber.trim()) {
            setError('Phone number is required');
            return;
        }

        if (formData.routeType === 'forward' && !formData.forwardNumber.trim()) {
            setError('Forward number is required for forward routing');
            return;
        }

        if (formData.routeType !== 'forward' && !formData.routeDestinationId) {
            setError('Please select a destination');
            return;
        }

        try {
            setLoading(true);
            if (isEditMode) {
                await api.put(`/telecom/dids/${id}`, formData);
            } else {
                await api.post('/telecom/dids', formData);
            }
            navigate('/telecom/dids');
        } catch (err) {
            console.error('Error saving DID:', err);
            const res = err.response?.data;
            let msg = 'Failed to save phone number';
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

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value,
            // Reset destination when route type changes
            ...(name === 'routeType' && { routeDestinationId: '', forwardNumber: '' })
        }));
    };

    const renderDestinationField = () => {
        if (formData.routeType === 'forward') {
            return (
                <div>
                    <label htmlFor="forwardNumber" className="block text-sm font-bold text-gray-700 mb-2">Forward To Number <span className="text-red-500">*</span></label>
                    <input
                        type="tel"
                        id="forwardNumber"
                        name="forwardNumber"
                        value={formData.forwardNumber}
                        onChange={handleInputChange}
                        placeholder="+1234567890"
                        required
                        className="block w-full rounded-xl border-0 py-2.5 px-3 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-primary-600 sm:text-sm font-medium bg-gray-50/50 hover:bg-white transition-colors font-mono"
                    />
                </div>
            );
        }

        let options = [];
        let placeholder = 'Select destination';

        if (formData.routeType === 'extension') {
            options = extensions;
            placeholder = 'Select an extension';
        } else if (formData.routeType === 'ring_group') {
            options = ringGroups;
            placeholder = 'Select a ring group';
        } else if (formData.routeType === 'ivr') {
            options = ivrs;
            placeholder = 'Select an IVR';
        } else if (formData.routeType === 'did_forward') {
            options = didForwards;
            placeholder = 'Select a DID Forward';
        }

        return (
            <div>
                <label htmlFor="routeDestinationId" className="block text-sm font-bold text-gray-700 mb-2">Route To <span className="text-red-500">*</span></label>
                <select
                    id="routeDestinationId"
                    name="routeDestinationId"
                    value={formData.routeDestinationId}
                    onChange={handleInputChange}
                    required
                    className="block w-full rounded-xl border-0 py-2.5 px-3 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-primary-600 sm:text-sm font-medium bg-gray-50/50 hover:bg-white transition-colors"
                >
                    <option value="">{placeholder}</option>
                    {options.map((option) => (
                        <option key={option.id} value={option.id}>
                            {option.name || option.extensionNumber || option.id}
                        </option>
                    ))}
                </select>
            </div>
        );
    };

    if (loading && isEditMode) {
        return (
            <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
            </div>
        );
    }

    return (
        <div className="max-w-2xl mx-auto pb-12 p-6">
            <button
                onClick={() => navigate('/telecom/dids')}
                className="flex items-center gap-2 text-sm font-bold text-gray-500 hover:text-gray-900 mb-6 transition-colors focus:outline-none"
            >
                <ArrowLeft size={20} />
                Back to Phone Numbers
            </button>

            <div className="bg-white rounded-2xl shadow-sm ring-1 ring-gray-200 overflow-hidden">
                <div className="px-6 py-5 border-b border-gray-100 bg-gray-50/50">
                    <h1 className="text-2xl font-bold text-gray-900">{isEditMode ? 'Edit Phone Number' : 'Add Phone Number'}</h1>
                    <p className="text-sm font-medium text-gray-500 mt-1">Configure DID routing</p>
                </div>

                {error && (
                    <div className="mx-6 mt-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl flex justify-between items-center">
                        <span className="font-medium text-sm">{error}</span>
                        <button onClick={() => setError('')} className="text-red-500 hover:text-red-700 font-bold focus:outline-none">×</button>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    <div>
                        <label htmlFor="didNumber" className="block text-sm font-bold text-gray-700 mb-2">Phone Number (DID) <span className="text-red-500">*</span></label>
                        <input
                            type="tel"
                            id="didNumber"
                            name="didNumber"
                            value={formData.didNumber}
                            onChange={handleInputChange}
                            placeholder="+18005551234"
                            disabled={isEditMode}
                            required
                            className="block w-full rounded-xl border-0 py-2.5 px-3 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-primary-600 sm:text-sm font-medium bg-gray-50/50 hover:bg-white transition-colors font-mono disabled:opacity-60 disabled:bg-gray-100"
                        />
                        {isEditMode && (
                            <p className="mt-1.5 text-xs font-medium text-gray-500">Phone number cannot be changed</p>
                        )}
                    </div>

                    <div>
                        <label htmlFor="routeType" className="block text-sm font-bold text-gray-700 mb-2">Route Type <span className="text-red-500">*</span></label>
                        <select
                            id="routeType"
                            name="routeType"
                            value={formData.routeType}
                            onChange={handleInputChange}
                            required
                            className="block w-full rounded-xl border-0 py-2.5 px-3 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-primary-600 sm:text-sm font-medium bg-gray-50/50 hover:bg-white transition-colors"
                        >
                            <option value="extension">Extension</option>
                            <option value="ring_group">Ring Group</option>
                            <option value="ivr">IVR Menu</option>
                            <option value="did_forward">DID Forward Entity</option>
                            <option value="forward">Simple Forward (Legacy)</option>
                        </select>
                    </div>

                    {renderDestinationField()}

                    <div className="pt-6 border-t border-gray-100 flex justify-end gap-3 mt-8">
                        <button
                            type="button"
                            onClick={() => navigate('/telecom/dids')}
                            disabled={loading}
                            className="rounded-xl bg-white px-5 py-2.5 text-sm font-bold text-gray-700 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 hover:ring-gray-400 transition-all focus:outline-none disabled:opacity-50"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="inline-flex justify-center items-center rounded-xl bg-primary-600 px-5 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-primary-700 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading && <div className="w-4 h-4 rounded-full border-2 border-white/20 border-t-white animate-spin mr-2" />}
                            {loading ? 'Saving...' : isEditMode ? 'Update Routing' : 'Create Phone Number'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default DIDForm;
