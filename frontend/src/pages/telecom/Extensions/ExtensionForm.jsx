import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Loader2, ArrowLeft, Settings as SettingsIcon, PhoneForwarded, Hash, Key } from 'lucide-react';
import api from '../../../services/api';
import { telecomService } from '../../../services/telecom.service';
function ExtensionForm() {
    const navigate = useNavigate();
    const { id } = useParams();
    const isEditMode = Boolean(id);

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [sipCredentials, setSipCredentials] = useState(null); // Only on creation

    const [formData, setFormData] = useState({
        extensionNumber: '',
        name: '',
        forwardAllEnabled: false,
        forwardAllType: 'external',
        forwardAllDestination: '',
        forwardNoAnswerEnabled: false,
        forwardNoAnswerType: 'external',
        forwardNoAnswerDestination: '',
        forwardNoAnswerTimeout: 20,
        outboundCallerIdNumber: '',
        sipPassword: '',
    });
    const [dids, setDids] = useState([]);
    const [allExtensions, setAllExtensions] = useState([]);

    useEffect(() => {
        if (isEditMode) {
            fetchExtension();
        }
        fetchDids();
        fetchAllExtensions();
    }, [id]);

    const fetchAllExtensions = async () => {
        try {
            const response = await api.get('/telecom/extensions');
            setAllExtensions(response.data);
        } catch (err) {
            console.error('Failed to fetch extensions:', err);
        }
    };

    const fetchDids = async () => {
        try {
            const data = await telecomService.getDIDs();
            setDids(data);
        } catch (err) {
            console.error('Failed to fetch DIDs:', err);
        }
    };

    const fetchExtension = async () => {
        try {
            setLoading(true);
            const response = await api.get(`/telecom/extensions/${id}`);
            setFormData(response.data);
            setError(null);
        } catch (err) {
            console.error('Failed to fetch extension:', err);
            setError(err.response?.data?.message || 'Failed to load extension');
        } finally {
            setLoading(false);
        }
    };

    const handleInputChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => {
            const newData = {
                ...prev,
                [name]: type === 'checkbox' ? checked : value
            };

            // Mutual Exclusivity for Forwarding Rules
            if (name === 'forwardAllEnabled' && checked) {
                newData.forwardNoAnswerEnabled = false;
            } else if (name === 'forwardNoAnswerEnabled' && checked) {
                newData.forwardAllEnabled = false;
            }

            return newData;
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            if (isEditMode) {
                const { extensionNumber, ...updateData } = formData;
                await api.put(`/telecom/extensions/${id}`, updateData);
                navigate('/telecom/extensions');
            } else {
                const response = await api.post('/telecom/extensions', formData);

                // Save SIP credentials to show user
                if (response.data.sipPasswordPlaintext) {
                    setSipCredentials({
                        username: response.data.sipUsername,
                        password: response.data.sipPasswordPlaintext,
                        realm: response.data.sipAuthRealm,
                    });
                } else {
                    navigate('/telecom/extensions');
                }
            }
        } catch (err) {
            console.error('Failed to save extension:', err);
            const errorMessage = err.response?.data?.message;
            if (Array.isArray(errorMessage)) {
                setError(errorMessage.join(', '));
            } else if (typeof errorMessage === 'string') {
                setError(errorMessage);
            } else {
                setError('Failed to save extension. Please check your input.');
            }
        } finally {
            setLoading(false);
        }
    };

    // Show SIP credentials modal after creation
    if (sipCredentials) {
        return (
            <div className="max-w-2xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
                <div className="bg-green-50 border border-green-200 rounded-2xl p-8 shadow-sm flex flex-col items-center text-center">
                    <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100 mb-6">
                        <Key className="h-8 w-8 text-green-600" aria-hidden="true" />
                    </div>
                    <h2 className="text-2xl font-bold text-green-900 mb-2">Extension Created Successfully!</h2>

                    <div className="rounded-xl bg-amber-50 border border-amber-200 p-4 mb-8 max-w-lg w-full">
                        <div className="flex">
                            <div className="flex-shrink-0">
                                <span className="text-amber-600 text-lg font-bold">⚠️</span>
                            </div>
                            <div className="ml-3">
                                <h3 className="text-sm font-bold text-amber-800">Important</h3>
                                <div className="mt-1 text-sm text-amber-700 font-medium">
                                    <p>Save these SIP credentials now. They will not be shown again!</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-xl shadow-sm ring-1 ring-inset ring-gray-200 p-6 w-full max-w-lg mb-8 text-left space-y-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">SIP Username</label>
                            <code className="block w-full rounded-lg bg-gray-50 px-3 py-2 font-mono text-sm font-bold text-gray-900 ring-1 ring-inset ring-gray-200 select-all">{sipCredentials.username}</code>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">SIP Password</label>
                            <code className="block w-full rounded-lg bg-gray-50 px-3 py-2 font-mono text-sm font-bold text-indigo-600 ring-1 ring-inset ring-gray-200 select-all">{sipCredentials.password}</code>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">SIP Server</label>
                            <code className="block w-full rounded-lg bg-gray-50 px-3 py-2 font-mono text-sm font-medium text-gray-900 ring-1 ring-inset ring-gray-200 select-all">{sipCredentials.realm}</code>
                        </div>
                    </div>

                    <button
                        onClick={() => navigate('/telecom/extensions')}
                        className="inline-flex w-full max-w-xs items-center justify-center rounded-xl bg-green-600 px-5 py-3 text-sm font-bold text-white shadow-sm hover:bg-green-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-600 transition-all active:scale-[0.98]"
                    >
                        I have saved these credentials
                    </button>
                </div>
            </div>
        );
    }

    if (loading && isEditMode) {
        return (
            <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
            </div>
        );
    }

    return (
        <div className="space-y-6 max-w-5xl mx-auto pb-12">
            <div className="flex items-center space-x-4 mb-2">
                <button
                    onClick={() => navigate('/telecom/extensions')}
                    className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors focus:outline-none"
                    aria-label="Back to Extensions"
                >
                    <ArrowLeft className="h-5 w-5" />
                </button>
                <div>
                    <h1 className="text-3xl font-extrabold tracking-tight text-gray-900">
                        {isEditMode ? 'Edit Extension' : 'Create Extension'}
                    </h1>
                    <p className="text-gray-500 mt-1 font-medium">Configure SIP account details and routing rules.</p>
                </div>
            </div>

            {error && (
                <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-600 font-medium">
                    {error}
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-8">
                {/* Basic Info */}
                <div className="bg-white shadow-sm ring-1 ring-gray-100 sm:rounded-2xl overflow-hidden">
                    <div className="px-6 py-5 border-b border-gray-100 bg-gray-50/50 flex items-center space-x-2">
                        <SettingsIcon className="h-4 w-4 text-gray-400" />
                        <h3 className="text-sm font-bold text-gray-900 uppercase tracking-widest">Basic Information</h3>
                    </div>

                    <div className="p-6 space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label htmlFor="extensionNumber" className="block text-sm font-bold text-gray-700 mb-2">
                                    Extension Number <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    id="extensionNumber"
                                    name="extensionNumber"
                                    value={formData.extensionNumber}
                                    onChange={handleInputChange}
                                    required
                                    disabled={isEditMode}
                                    placeholder="e.g. 1001 or u1001"
                                    pattern="[a-zA-Z0-9]{3,10}"
                                    title="3-10 alphanumeric characters"
                                    className="block w-full rounded-xl border-0 py-2.5 px-3 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-primary-600 sm:text-sm sm:leading-6 font-medium bg-gray-50/50 hover:bg-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                />
                                <p className="mt-2 text-xs text-gray-500 font-medium">3-10 alphanumeric characters (e.g., 1001, u1001)</p>
                            </div>

                            <div>
                                <label htmlFor="name" className="block text-sm font-bold text-gray-700 mb-2">
                                    Name <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    id="name"
                                    name="name"
                                    value={formData.name}
                                    onChange={handleInputChange}
                                    required
                                    placeholder="e.g. John Doe, Sales Desk"
                                    className="block w-full rounded-xl border-0 py-2.5 px-3 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-primary-600 sm:text-sm sm:leading-6 font-medium bg-gray-50/50 hover:bg-white transition-colors"
                                />
                            </div>
                        </div>

                        <div>
                            <label htmlFor="sipPassword" className="block text-sm font-bold text-gray-700 mb-2">
                                SIP Password
                            </label>
                            <input
                                type="text"
                                id="sipPassword"
                                name="sipPassword"
                                value={formData.sipPassword || ''}
                                onChange={handleInputChange}
                                placeholder={isEditMode ? "Enter new password to change" : "Auto-generated if left empty"}
                                className="block w-full max-w-md rounded-xl border-0 py-2.5 px-3 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-primary-600 sm:text-sm sm:leading-6 font-medium bg-gray-50/50 hover:bg-white transition-colors font-mono"
                            />
                            <p className="mt-2 text-xs text-gray-500 font-medium">Password for device registration. {isEditMode ? 'Update to change.' : 'Leave empty to auto-generate.'}</p>
                        </div>
                    </div>
                </div>

                {/* Forwarding Rules */}
                <div className="bg-white shadow-sm ring-1 ring-gray-100 sm:rounded-2xl overflow-hidden">
                    <div className="px-6 py-5 border-b border-gray-100 bg-gray-50/50 flex items-center space-x-2">
                        <PhoneForwarded className="h-4 w-4 text-gray-400" />
                        <h3 className="text-sm font-bold text-gray-900 uppercase tracking-widest">Call Forwarding Rules</h3>
                    </div>

                    <div className="p-6 space-y-8 divide-y divide-gray-100">

                        {/* Forward All */}
                        <div className="pb-8">
                            <div className="flex items-start mb-4">
                                <div className="flex h-6 items-center">
                                    <input
                                        type="checkbox"
                                        id="forwardAllEnabled"
                                        name="forwardAllEnabled"
                                        checked={formData.forwardAllEnabled}
                                        onChange={handleInputChange}
                                        className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-600 cursor-pointer"
                                    />
                                </div>
                                <div className="ml-3 text-sm leading-6">
                                    <label htmlFor="forwardAllEnabled" className="font-bold text-gray-900 cursor-pointer">Enable Forward All</label>
                                    <p className="text-gray-500 font-medium text-xs mt-0.5">Immediately forward all incoming calls without ringing this extension.</p>
                                </div>
                            </div>

                            {formData.forwardAllEnabled && (
                                <div className="ml-7 grid grid-cols-1 md:grid-cols-2 gap-6 bg-gray-50/50 p-4 rounded-xl ring-1 ring-gray-200 mt-4">
                                    <div>
                                        <label htmlFor="forwardAllType" className="block text-sm font-bold text-gray-700 mb-2">Forward To</label>
                                        <select
                                            id="forwardAllType"
                                            name="forwardAllType"
                                            value={formData.forwardAllType}
                                            onChange={handleInputChange}
                                            className="block w-full rounded-xl border-0 py-2.5 px-3 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-primary-600 sm:text-sm sm:leading-6 font-medium bg-white cursor-pointer"
                                        >
                                            <option value="external">External Number</option>
                                            <option value="extension">Another Extension</option>
                                        </select>
                                    </div>

                                    <div>
                                        <label htmlFor="forwardAllDestination" className="block text-sm font-bold text-gray-700 mb-2">Destination</label>
                                        {formData.forwardAllType === 'extension' ? (
                                            <select
                                                id="forwardAllDestination"
                                                name="forwardAllDestination"
                                                value={formData.forwardAllDestination}
                                                onChange={handleInputChange}
                                                className="block w-full rounded-xl border-0 py-2.5 px-3 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-primary-600 sm:text-sm sm:leading-6 font-medium bg-white"
                                            >
                                                <option value="">Select Extension...</option>
                                                {allExtensions
                                                    .filter(ext => ext.extensionNumber !== formData.extensionNumber)
                                                    .map(ext => (
                                                        <option key={ext.id} value={ext.extensionNumber}>
                                                            {ext.extensionNumber} - {ext.name}
                                                        </option>
                                                    ))}
                                            </select>
                                        ) : (
                                            <input
                                                type="text"
                                                id="forwardAllDestination"
                                                name="forwardAllDestination"
                                                value={formData.forwardAllDestination}
                                                onChange={handleInputChange}
                                                placeholder="e.g. 18005551234"
                                                className="block w-full rounded-xl border-0 py-2.5 px-3 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-primary-600 sm:text-sm sm:leading-6 font-medium bg-white"
                                            />
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Forward No Answer */}
                        <div className="pt-8">
                            <div className="flex items-start mb-4">
                                <div className="flex h-6 items-center">
                                    <input
                                        type="checkbox"
                                        id="forwardNoAnswerEnabled"
                                        name="forwardNoAnswerEnabled"
                                        checked={formData.forwardNoAnswerEnabled}
                                        onChange={handleInputChange}
                                        className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-600 cursor-pointer"
                                    />
                                </div>
                                <div className="ml-3 text-sm leading-6">
                                    <label htmlFor="forwardNoAnswerEnabled" className="font-bold text-gray-900 cursor-pointer">Enable Forward on No Answer</label>
                                    <p className="text-gray-500 font-medium text-xs mt-0.5">Forward calls if this extension is not answered within the timeout period.</p>
                                </div>
                            </div>

                            {formData.forwardNoAnswerEnabled && (
                                <div className="ml-7 grid grid-cols-1 md:grid-cols-3 gap-6 bg-gray-50/50 p-4 rounded-xl ring-1 ring-gray-200 mt-4">
                                    <div>
                                        <label htmlFor="forwardNoAnswerType" className="block text-sm font-bold text-gray-700 mb-2">Forward To</label>
                                        <select
                                            id="forwardNoAnswerType"
                                            name="forwardNoAnswerType"
                                            value={formData.forwardNoAnswerType}
                                            onChange={handleInputChange}
                                            className="block w-full rounded-xl border-0 py-2.5 px-3 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-primary-600 sm:text-sm sm:leading-6 font-medium bg-white cursor-pointer"
                                        >
                                            <option value="external">External Number</option>
                                            <option value="extension">Another Extension</option>
                                        </select>
                                    </div>

                                    <div>
                                        <label htmlFor="forwardNoAnswerDestination" className="block text-sm font-bold text-gray-700 mb-2">Destination</label>
                                        {formData.forwardNoAnswerType === 'extension' ? (
                                            <select
                                                id="forwardNoAnswerDestination"
                                                name="forwardNoAnswerDestination"
                                                value={formData.forwardNoAnswerDestination}
                                                onChange={handleInputChange}
                                                className="block w-full rounded-xl border-0 py-2.5 px-3 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-primary-600 sm:text-sm sm:leading-6 font-medium bg-white"
                                            >
                                                <option value="">Select Extension...</option>
                                                {allExtensions
                                                    .filter(ext => ext.extensionNumber !== formData.extensionNumber)
                                                    .map(ext => (
                                                        <option key={ext.id} value={ext.extensionNumber}>
                                                            {ext.extensionNumber} - {ext.name}
                                                        </option>
                                                    ))}
                                            </select>
                                        ) : (
                                            <input
                                                type="text"
                                                id="forwardNoAnswerDestination"
                                                name="forwardNoAnswerDestination"
                                                value={formData.forwardNoAnswerDestination}
                                                onChange={handleInputChange}
                                                placeholder="e.g. 18005551234"
                                                className="block w-full rounded-xl border-0 py-2.5 px-3 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-primary-600 sm:text-sm sm:leading-6 font-medium bg-white"
                                            />
                                        )}
                                    </div>

                                    <div>
                                        <label htmlFor="forwardNoAnswerTimeout" className="block text-sm font-bold text-gray-700 mb-2">Timeout (seconds)</label>
                                        <input
                                            type="number"
                                            id="forwardNoAnswerTimeout"
                                            name="forwardNoAnswerTimeout"
                                            value={formData.forwardNoAnswerTimeout}
                                            onChange={handleInputChange}
                                            min="10"
                                            max="120"
                                            className="block w-full rounded-xl border-0 py-2.5 px-3 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-primary-600 sm:text-sm sm:leading-6 font-medium bg-white"
                                        />
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Outbound Caller ID */}
                <div className="bg-white shadow-sm ring-1 ring-gray-100 sm:rounded-2xl overflow-hidden">
                    <div className="px-6 py-5 border-b border-gray-100 bg-gray-50/50 flex items-center space-x-2">
                        <Hash className="h-4 w-4 text-gray-400" />
                        <h3 className="text-sm font-bold text-gray-900 uppercase tracking-widest">Outbound Settings</h3>
                    </div>

                    <div className="p-6">
                        <div className="max-w-md">
                            <label htmlFor="outboundCallerIdNumber" className="block text-sm font-bold text-gray-700 mb-2">Outbound Caller ID</label>
                            <select
                                id="outboundCallerIdNumber"
                                name="outboundCallerIdNumber"
                                value={formData.outboundCallerIdNumber}
                                onChange={handleInputChange}
                                className="block w-full rounded-xl border-0 py-2.5 px-3 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-primary-600 sm:text-sm sm:leading-6 font-medium bg-gray-50/50 hover:bg-white transition-colors cursor-pointer"
                            >
                                <option value="">Default (System Caller ID)</option>
                                {dids.map(did => (
                                    <option key={did.id} value={did.number}>
                                        {did.number} {did.friendlyName ? `(${did.friendlyName})` : ''}
                                    </option>
                                ))}
                            </select>
                            <p className="mt-2 text-xs text-gray-500 font-medium">Phone number to display when making outbound calls.</p>
                        </div>
                    </div>
                </div>

                {/* Form Actions */}
                <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                    <button
                        type="button"
                        onClick={() => navigate('/telecom/extensions')}
                        className="rounded-xl bg-white px-5 py-2.5 text-sm font-bold text-gray-700 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 hover:ring-gray-400 transition-all focus:outline-none focus:ring-2 focus:ring-primary-500"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={loading}
                        className="inline-flex justify-center items-center rounded-xl border border-transparent bg-primary-600 px-5 py-2.5 text-sm font-bold text-white shadow-sm hover:shadow-md hover:bg-primary-700 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100"
                    >
                        {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                        {loading ? 'Saving...' : (isEditMode ? 'Update Extension' : 'Create Extension')}
                    </button>
                </div>
            </form>
        </div>
    );
}

export default ExtensionForm;
