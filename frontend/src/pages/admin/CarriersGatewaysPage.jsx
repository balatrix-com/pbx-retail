import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { Plus, Trash, Edit, Server, ChevronDown, ChevronUp, Shield } from 'lucide-react';

const CarriersGatewaysPage = () => {
    const { isSuperAdmin } = useAuth();
    const { addToast } = useToast();

    const [activeTab, setActiveTab] = useState('outbound'); // 'outbound' or 'inbound'
    const [carriers, setCarriers] = useState([]);
    const [inboundEntries, setInboundEntries] = useState([]);
    const [loading, setLoading] = useState(true);
    const [expandedCarrier, setExpandedCarrier] = useState(null);

    // Modal states - Carrier / Endpoint
    const [showCarrierModal, setShowCarrierModal] = useState(false);
    const [showEndpointModal, setShowEndpointModal] = useState(false);
    const [editingCarrier, setEditingCarrier] = useState(null);
    const [editingEndpoint, setEditingEndpoint] = useState(null);
    const [selectedCarrierId, setSelectedCarrierId] = useState(null);

    // Modal states - Inbound ACL
    const [showInboundModal, setShowInboundModal] = useState(false);
    const [editingInbound, setEditingInbound] = useState(null);

    // Form states - Carrier / Endpoint
    const [carrierName, setCarrierName] = useState('');
    const [endpointForm, setEndpointForm] = useState({
        name: '', sipHost: '', sipPort: 5060, transport: 'udp', prefix: '', stripPlus: false, callerIdMode: 'extension', callerIdNumber: '', isActive: true, isSystemDefault: false
    });

    // Form states - Inbound ACL
    const [inboundForm, setInboundForm] = useState({
        ipAddress: '', port: 5060, tag: ''
    });

    useEffect(() => {
        if (isSuperAdmin) {
            fetchData();
        }
    }, [isSuperAdmin, activeTab]);

    const fetchData = async () => {
        setLoading(true);
        try {
            if (activeTab === 'outbound') {
                await fetchCarriers();
            } else {
                await fetchInboundWhitelist();
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const fetchCarriers = async () => {
        try {
            const { data } = await api.get('/carriers');
            setCarriers(data || []);
        } catch (error) {
            addToast('error', 'Failed to load carriers');
        }
    };

    const fetchInboundWhitelist = async () => {
        try {
            const { data } = await api.get('/inbound-whitelist');
            setInboundEntries(data || []);
        } catch (error) {
            addToast('error', 'Failed to load inbound whitelist');
        }
    };

    // Carrier functions
    const handleSaveCarrier = async () => {
        try {
            if (editingCarrier) {
                await api.put(`/carriers/${editingCarrier.id}`, { name: carrierName });
                addToast('success', 'Carrier updated');
            } else {
                await api.post('/carriers', { name: carrierName });
                addToast('success', 'Carrier created');
            }
            setShowCarrierModal(false);
            fetchCarriers();
        } catch (error) {
            addToast('error', error.response?.data?.message || 'Failed to save carrier');
        }
    };

    const handleDeleteCarrier = async (id) => {
        if (!window.confirm('Delete this carrier? This will also delete all endpoints.')) return;
        try {
            await api.delete(`/carriers/${id}`);
            addToast('success', 'Carrier deleted');
            fetchCarriers();
        } catch (error) {
            addToast('error', 'Failed to delete carrier');
        }
    };

    // Endpoint functions
    const handleSaveEndpoint = async () => {
        try {
            if (editingEndpoint) {
                await api.put(`/carriers/${selectedCarrierId}/endpoints/${editingEndpoint.id}`, endpointForm);
                addToast('success', 'Endpoint updated');
            } else {
                await api.post(`/carriers/${selectedCarrierId}/endpoints`, endpointForm);
                addToast('success', 'Endpoint created');
            }
            setShowEndpointModal(false);
            fetchCarriers();
        } catch (error) {
            addToast('error', error.response?.data?.message || 'Failed to save endpoint');
        }
    };

    const handleDeleteEndpoint = async (carrierId, endpointId) => {
        if (!window.confirm('Delete this endpoint?')) return;
        try {
            await api.delete(`/carriers/${carrierId}/endpoints/${endpointId}`);
            addToast('success', 'Endpoint deleted');
            fetchCarriers();
        } catch (error) {
            addToast('error', 'Failed to delete endpoint');
        }
    };

    // Inbound ACL functions
    const handleSaveInbound = async () => {
        try {
            if (editingInbound) {
                await api.put(`/inbound-whitelist/${editingInbound.id}`, inboundForm);
                addToast('success', 'Inbound whitelist entry updated');
            } else {
                await api.post('/inbound-whitelist', inboundForm);
                addToast('success', 'Inbound whitelist entry created');
            }
            setShowInboundModal(false);
            fetchInboundWhitelist();
        } catch (error) {
            addToast('error', error.response?.data?.message || 'Failed to save inbound entry');
        }
    };

    const handleDeleteInbound = async (id) => {
        if (!window.confirm('Delete this inbound whitelist entry? This will instantly remove permission from Kamailio.')) return;
        try {
            await api.delete(`/inbound-whitelist/${id}`);
            addToast('success', 'Inbound entry deleted');
            fetchInboundWhitelist();
        } catch (error) {
            addToast('error', 'Failed to delete inbound entry');
        }
    };

    if (!isSuperAdmin) return <div className="p-8 text-red-500 font-bold">Access Denied</div>;

    return (
        <div className="p-8">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Carrier Gateways & ACL</h1>
                    <p className="text-sm text-gray-500 mt-1">Configure outbound trunk routing destinations and inbound IP signaling whitelist.</p>
                </div>
            </div>

            {/* Navigation Tabs */}
            <div className="flex bg-slate-100/80 p-1.5 rounded-2xl w-fit border border-slate-200/60 mb-6 gap-1">
                <button
                    onClick={() => setActiveTab('outbound')}
                    className={`py-2.5 px-5 font-extrabold text-sm rounded-xl transition-all duration-200 flex items-center gap-2 ${activeTab === 'outbound'
                            ? 'bg-white text-indigo-900 shadow-sm border border-indigo-200/80 ring-1 ring-indigo-500/10'
                            : 'text-slate-500 hover:text-slate-900'
                        }`}
                >
                    <Server size={18} />
                    Outbound Gateways
                </button>
                <button
                    onClick={() => setActiveTab('inbound')}
                    className={`py-2.5 px-5 font-extrabold text-sm rounded-xl transition-all duration-200 flex items-center gap-2 ${activeTab === 'inbound'
                            ? 'bg-white text-indigo-900 shadow-sm border border-indigo-200/80 ring-1 ring-indigo-500/10'
                            : 'text-slate-500 hover:text-slate-900'
                        }`}
                >
                    <Shield size={18} />
                    Inbound ACL (IP Whitelist)
                </button>
            </div>

            {loading ? (
                <div className="p-8 flex justify-center items-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    <span className="ml-3 text-gray-600">Loading data...</span>
                </div>
            ) : activeTab === 'outbound' ? (
                /* OUTBOUND TAB CONTENT */
                <div>
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-lg font-semibold text-gray-800">Tenant-Specific Outbound Carriers</h2>
                        <button
                            onClick={() => { setEditingCarrier(null); setCarrierName(''); setShowCarrierModal(true); }}
                            className="bg-blue-600 text-white px-4 py-2 rounded flex items-center gap-2 hover:bg-blue-700 shadow-sm transition"
                        >
                            <Plus size={16} /> Add Carrier
                        </button>
                    </div>

                    {carriers.length === 0 ? (
                        <div className="bg-gray-50 border border-dashed rounded-lg p-12 text-center text-gray-500">
                            No outbound carriers configured yet. Add a carrier to get started.
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {carriers.map(carrier => (
                                <div key={carrier.id} className={`bg-white border rounded-lg shadow-sm overflow-hidden transition ${expandedCarrier === carrier.id ? 'card-active' : 'hover:shadow card-hover'}`}>
                                    <div className="p-4 flex items-center justify-between bg-gray-50 border-b">
                                        <div className="flex items-center gap-3">
                                            <button onClick={() => setExpandedCarrier(expandedCarrier === carrier.id ? null : carrier.id)}>
                                                {expandedCarrier === carrier.id ? <ChevronUp size={20} className="text-gray-600" /> : <ChevronDown size={20} className="text-gray-600" />}
                                            </button>
                                            <span className="font-semibold text-lg text-gray-900">{carrier.name}</span>
                                            <span className="text-sm text-gray-500 bg-gray-200 px-2 py-0.5 rounded-full">
                                                {carrier.endpoints.length} endpoints
                                            </span>
                                        </div>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => {
                                                    setSelectedCarrierId(carrier.id);
                                                    setEditingEndpoint(null);
                                                    setEndpointForm({ name: '', sipHost: '', sipPort: 5060, transport: 'udp', prefix: '', stripPlus: false, callerIdMode: 'extension', callerIdNumber: '', isActive: true, isSystemDefault: false });
                                                    setShowEndpointModal(true);
                                                }}
                                                className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1 font-medium hover:underline"
                                            >
                                                <Server size={14} /> Add Endpoint
                                            </button>
                                            <button
                                                onClick={() => { setEditingCarrier(carrier); setCarrierName(carrier.name); setShowCarrierModal(true); }}
                                                className="text-gray-600 hover:text-blue-600 ml-3 transition"
                                            >
                                                <Edit size={16} />
                                            </button>
                                            <button
                                                onClick={() => handleDeleteCarrier(carrier.id)}
                                                className="text-gray-600 hover:text-red-600 transition"
                                            >
                                                <Trash size={16} />
                                            </button>
                                        </div>
                                    </div>

                                    {expandedCarrier === carrier.id && (
                                        <div className="p-4 overflow-x-auto">
                                            {carrier.endpoints.length === 0 ? (
                                                <p className="text-gray-500 text-sm italic">No endpoints configured for this carrier.</p>
                                            ) : (
                                                <table className="w-full text-sm">
                                                    <thead>
                                                        <tr className="text-left text-gray-500 border-b">
                                                            <th className="pb-2">Name</th>
                                                            <th className="pb-2">Host:Port</th>
                                                            <th className="pb-2">Transport</th>
                                                            <th className="pb-2">Status</th>
                                                            <th className="pb-2 text-right">Actions</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {carrier.endpoints.map(ep => (
                                                            <tr key={ep.id} className="border-b last:border-0 hover:bg-gray-50">
                                                                <td className="py-3 font-medium text-gray-900">
                                                                    <div className="flex items-center gap-2">
                                                                        <span>{ep.name}</span>
                                                                        {ep.isSystemDefault && (
                                                                            <span className="bg-blue-100 text-blue-800 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                                                                                System Default
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                </td>
                                                                <td className="py-3 text-gray-600">{ep.sipHost}:{ep.sipPort}</td>
                                                                <td className="py-3 uppercase text-gray-600">{ep.transport}</td>
                                                                <td className="py-3">
                                                                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${ep.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                                                                        {ep.isActive ? 'Active' : 'Disabled'}
                                                                    </span>
                                                                </td>
                                                                <td className="py-3 text-right">
                                                                    <button
                                                                        onClick={() => {
                                                                            setSelectedCarrierId(carrier.id);
                                                                            setEditingEndpoint(ep);
                                                                            setEndpointForm({ ...ep });
                                                                            setShowEndpointModal(true);
                                                                        }}
                                                                        className="text-blue-600 hover:underline mr-3 font-medium"
                                                                    >
                                                                        Edit
                                                                    </button>
                                                                    <button onClick={() => handleDeleteEndpoint(carrier.id, ep.id)} className="text-red-600 hover:underline font-medium">
                                                                        Delete
                                                                    </button>
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            )}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            ) : (
                /* INBOUND TAB CONTENT */
                <div>
                    <div className="flex justify-between items-center mb-4">
                        <div>
                            <h2 className="text-lg font-semibold text-gray-800">Global Inbound Whitelist</h2>
                            <p className="text-sm text-gray-500">Add trusted carrier source IP addresses to allow inbound SIP traffic.</p>
                        </div>
                        <button
                            onClick={() => { setEditingInbound(null); setInboundForm({ ipAddress: '', port: 5060, tag: '' }); setShowInboundModal(true); }}
                            className="bg-blue-600 text-white px-4 py-2 rounded flex items-center gap-2 hover:bg-blue-700 shadow-sm transition"
                        >
                            <Plus size={16} /> Add IP Address
                        </button>
                    </div>

                    {inboundEntries.length === 0 ? (
                        <div className="bg-gray-50 border border-dashed rounded-lg p-12 text-center text-gray-500">
                            No inbound whitelisted IP addresses configured. Click 'Add IP Address' to configure.
                        </div>
                    ) : (
                        <div className="bg-white border rounded-lg shadow-sm overflow-hidden">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="text-left text-gray-500 border-b bg-gray-50">
                                        <th className="p-3">Label / Tag</th>
                                        <th className="p-3">IP Address</th>
                                        <th className="p-3">Port</th>
                                        <th className="p-3">Created At</th>
                                        <th className="p-3 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {inboundEntries.map(entry => (
                                        <tr key={entry.id} className="border-b last:border-0 hover:bg-gray-50 transition">
                                            <td className="p-3 font-semibold text-gray-900">{entry.tag}</td>
                                            <td className="p-3 font-mono text-gray-700">{entry.ipAddress}</td>
                                            <td className="p-3 text-gray-600">{entry.port}</td>
                                            <td className="p-3 text-gray-500">{new Date(entry.createdAt).toLocaleString()}</td>
                                            <td className="p-3 text-right">
                                                <button
                                                    onClick={() => {
                                                        setEditingInbound(entry);
                                                        setInboundForm({ ipAddress: entry.ipAddress, port: entry.port, tag: entry.tag });
                                                        setShowInboundModal(true);
                                                    }}
                                                    className="text-blue-600 hover:underline mr-4 font-medium"
                                                >
                                                    Edit
                                                </button>
                                                <button onClick={() => handleDeleteInbound(entry.id)} className="text-red-600 hover:underline font-medium">
                                                    Delete
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}

            {/* Carrier Modal */}
            {showCarrierModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white p-6 rounded-lg w-96 shadow-xl transform scale-100 transition-all animate-fadeIn">
                        <h2 className="text-xl font-bold mb-4 text-gray-900">{editingCarrier ? 'Edit Carrier' : 'New Carrier'}</h2>
                        <div className="mb-4">
                            <label className="block text-sm font-medium mb-1 text-gray-700">Carrier Name</label>
                            <input
                                type="text"
                                placeholder="Carrier Name (e.g. Telnyx)"
                                className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-100 outline-none"
                                value={carrierName}
                                onChange={(e) => setCarrierName(e.target.value)}
                            />
                        </div>
                        <div className="flex justify-end gap-2">
                            <button onClick={() => setShowCarrierModal(false)} className="px-4 py-2 border rounded text-gray-700 hover:bg-gray-50 transition">Cancel</button>
                            <button onClick={handleSaveCarrier} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition">Save</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Endpoint Modal */}
            {showEndpointModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white p-6 rounded-lg w-[500px] max-h-[90vh] overflow-y-auto shadow-xl animate-fadeIn">
                        <h2 className="text-xl font-bold mb-4 text-gray-900">{editingEndpoint ? 'Edit Endpoint' : 'New Endpoint'}</h2>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-1 text-gray-700">Name</label>
                                <input type="text" className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-100 outline-none" value={endpointForm.name} onChange={e => setEndpointForm({ ...endpointForm, name: e.target.value })} />
                            </div>
                            <div className="flex gap-4">
                                <div className="flex-1">
                                    <label className="block text-sm font-medium mb-1 text-gray-700">SIP Host / IP</label>
                                    <input type="text" className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-100 outline-none" value={endpointForm.sipHost} onChange={e => setEndpointForm({ ...endpointForm, sipHost: e.target.value })} />
                                </div>
                                <div className="w-24">
                                    <label className="block text-sm font-medium mb-1 text-gray-700">Port</label>
                                    <input type="number" className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-100 outline-none" value={endpointForm.sipPort} onChange={e => setEndpointForm({ ...endpointForm, sipPort: parseInt(e.target.value) })} />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1 text-gray-700">Transport</label>
                                <select className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-100 outline-none" value={endpointForm.transport} onChange={e => setEndpointForm({ ...endpointForm, transport: e.target.value })}>
                                    <option value="udp">UDP</option>
                                    <option value="tcp">TCP</option>
                                    <option value="tls">TLS</option>
                                </select>
                            </div>
                            <div className="flex gap-4">
                                <div className="flex-1">
                                    <label className="block text-sm font-medium mb-1 text-gray-700">Dial Prefix (Optional)</label>
                                    <input type="text" className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-100 outline-none" value={endpointForm.prefix} onChange={e => setEndpointForm({ ...endpointForm, prefix: e.target.value })} />
                                </div>
                                <div className="flex items-center mt-6">
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input type="checkbox" checked={endpointForm.stripPlus} onChange={e => setEndpointForm({ ...endpointForm, stripPlus: e.target.checked })} />
                                        <span className="text-sm font-medium text-gray-700">Strip Leading +</span>
                                    </label>
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1 text-gray-700">Caller ID Mode</label>
                                <select className="w-full border p-2 rounded mb-2 focus:ring-2 focus:ring-blue-100 outline-none" value={endpointForm.callerIdMode} onChange={e => setEndpointForm({ ...endpointForm, callerIdMode: e.target.value })}>
                                    <option value="extension">Use Extension Caller ID</option>
                                    <option value="override">Override (Force Number)</option>
                                </select>
                                {endpointForm.callerIdMode === 'override' && (
                                    <input type="text" placeholder="Caller ID Number" className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-100 outline-none" value={endpointForm.callerIdNumber || ''} onChange={e => setEndpointForm({ ...endpointForm, callerIdNumber: e.target.value })} />
                                )}
                            </div>
                            <div className="space-y-2">
                                <div>
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input type="checkbox" checked={endpointForm.isActive} onChange={e => setEndpointForm({ ...endpointForm, isActive: e.target.checked })} />
                                        <span className="text-sm font-medium text-gray-700">Active (Enable outbound routing)</span>
                                    </label>
                                </div>
                                <div>
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input type="checkbox" checked={endpointForm.isSystemDefault || false} onChange={e => setEndpointForm({ ...endpointForm, isSystemDefault: e.target.checked })} />
                                        <span className="text-sm font-medium text-gray-700">Set as System Default Outbound Gateway</span>
                                    </label>
                                </div>
                            </div>
                        </div>
                        <div className="flex justify-end gap-2 mt-6">
                            <button onClick={() => setShowEndpointModal(false)} className="px-4 py-2 border rounded text-gray-700 hover:bg-gray-50 transition">Cancel</button>
                            <button onClick={handleSaveEndpoint} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition">Save</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Inbound ACL Modal */}
            {showInboundModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white p-6 rounded-lg w-[400px] shadow-xl animate-fadeIn">
                        <h2 className="text-xl font-bold mb-4 text-gray-900">{editingInbound ? 'Edit Whitelisted IP' : 'Whitelist Inbound IP'}</h2>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-1 text-gray-700">Label / Tag</label>
                                <input
                                    type="text"
                                    placeholder="e.g. Telnyx US East Gateway"
                                    className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-100 outline-none"
                                    value={inboundForm.tag}
                                    onChange={e => setInboundForm({ ...inboundForm, tag: e.target.value })}
                                />
                            </div>
                            <div className="flex gap-4">
                                <div className="flex-1">
                                    <label className="block text-sm font-medium mb-1 text-gray-700">IP Address</label>
                                    <input
                                        type="text"
                                        placeholder="e.g. 192.168.1.100"
                                        className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-100 outline-none"
                                        value={inboundForm.ipAddress}
                                        onChange={e => setInboundForm({ ...inboundForm, ipAddress: e.target.value })}
                                    />
                                </div>
                                <div className="w-28">
                                    <label className="block text-sm font-medium mb-1 text-gray-700">Port</label>
                                    <input
                                        type="number"
                                        className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-100 outline-none"
                                        value={inboundForm.port}
                                        onChange={e => setInboundForm({ ...inboundForm, port: parseInt(e.target.value) || 0 })}
                                    />
                                </div>
                            </div>
                        </div>
                        <div className="flex justify-end gap-2 mt-6">
                            <button onClick={() => setShowInboundModal(false)} className="px-4 py-2 border rounded text-gray-700 hover:bg-gray-50 transition">Cancel</button>
                            <button onClick={handleSaveInbound} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition">Save</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CarriersGatewaysPage;
