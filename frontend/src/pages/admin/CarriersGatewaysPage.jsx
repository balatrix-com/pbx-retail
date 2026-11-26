import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { Plus, Trash, Edit, Server, ChevronDown, ChevronUp, Shield } from 'lucide-react';
import Pagination from '../../components/common/Pagination';
import CreativeStatCard from '../../components/common/CreativeStatCard';

const IPV4_PATTERN = /^(?:(?:25[0-5]|2[0-4]\d|1?\d?\d)\.){3}(?:25[0-5]|2[0-4]\d|1?\d?\d)$/;
const HOSTNAME_PATTERN = /^(?=.{1,253}$)(?:(?!-)[a-zA-Z0-9-]{1,63}(?<!-)\.)+(?!-)[a-zA-Z0-9-]{1,63}(?<!-)$/;

const CarriersGatewaysPage = () => {
    const { isAdmin } = useAuth();
    const { addToast } = useToast();

    const [activeTab, setActiveTab] = useState('outbound'); // 'outbound' or 'inbound'
    const [carriers, setCarriers] = useState([]);
    const [inboundEntries, setInboundEntries] = useState([]);
    const [inboundPage, setInboundPage] = useState(1);
    const [inboundLimit, setInboundLimit] = useState(10);
    const [loading, setLoading] = useState(true);
    const [expandedCarrier, setExpandedCarrier] = useState(null);
    const [inboundNormalization, setInboundNormalization] = useState('AUTO_10DIGIT');

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
        name: '', sipHost: '', sipPort: 5060, transport: 'udp', prefix: '', stripPlus: false, callerIdMode: 'extension', callerIdNumber: '', isActive: true, priority: 100
    });

    // Form states - Inbound ACL
    const [inboundForm, setInboundForm] = useState({
        ipAddress: '', port: 5060, tag: ''
    });

    useEffect(() => {
        if (isAdmin) {
            fetchData();
        }
    }, [isAdmin, activeTab]);

    const fetchData = async () => {
        setLoading(true);
        try {
            if (activeTab === 'outbound') {
                await fetchCarriers();
            } else {
                await Promise.all([fetchInboundWhitelist(), fetchInboundNormalization()]);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const fetchCarriers = async () => {
        try {
            const { data } = await api.get('/tenant/carriers');
            setCarriers(data || []);
        } catch (error) {
            addToast('error', 'Failed to load carriers');
        }
    };

    const fetchInboundWhitelist = async () => {
        try {
            const { data } = await api.get('/tenant/inbound-whitelist');
            setInboundEntries(data || []);
        } catch (error) {
            addToast('error', 'Failed to load inbound whitelist');
        }
    };

    const fetchInboundNormalization = async () => {
        try {
            const { data } = await api.get('/tenant/settings/inbound-normalization');
            setInboundNormalization(data?.inboundNormalization || 'AUTO_10DIGIT');
        } catch (error) {
            addToast('error', 'Failed to load inbound normalization');
        }
    };

    const saveInboundNormalization = async (value) => {
        try {
            await api.put('/tenant/settings/inbound-normalization', { inboundNormalization: value });
            setInboundNormalization(value);
            addToast('success', 'Inbound normalization updated');
        } catch (error) {
            addToast('error', error.response?.data?.message || 'Failed to update normalization');
        }
    };

    // Carrier functions
    const handleSaveCarrier = async () => {
        try {
            if (editingCarrier) {
                await api.put(`/tenant/carriers/${editingCarrier.id}`, { name: carrierName });
                addToast('success', 'Carrier updated');
            } else {
                await api.post('/tenant/carriers', { name: carrierName });
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
            await api.delete(`/tenant/carriers/${id}`);
            addToast('success', 'Carrier deleted');
            fetchCarriers();
        } catch (error) {
            addToast('error', 'Failed to delete carrier');
        }
    };

    // Endpoint functions
    const handleSaveEndpoint = async () => {
        const host = endpointForm.sipHost.trim();
        if (!IPV4_PATTERN.test(host) && !HOSTNAME_PATTERN.test(host)) {
            addToast('error', 'SIP host must be a valid IPv4 address or hostname');
            return;
        }
        try {
            const payload = { ...endpointForm, sipHost: host };
            if (editingEndpoint) {
                await api.put(`/tenant/carriers/${selectedCarrierId}/endpoints/${editingEndpoint.id}`, payload);
                addToast('success', 'Endpoint updated');
            } else {
                await api.post(`/tenant/carriers/${selectedCarrierId}/endpoints`, payload);
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
            await api.delete(`/tenant/carriers/${carrierId}/endpoints/${endpointId}`);
            addToast('success', 'Endpoint deleted');
            fetchCarriers();
        } catch (error) {
            addToast('error', 'Failed to delete endpoint');
        }
    };

    // Inbound ACL functions
    const handleSaveInbound = async () => {
        const ipAddress = inboundForm.ipAddress.trim();
        if (!IPV4_PATTERN.test(ipAddress)) {
            addToast('error', 'Inbound carrier address must be a valid IPv4 address');
            return;
        }
        try {
            const payload = { ...inboundForm, ipAddress };
            if (editingInbound) {
                await api.put(`/tenant/inbound-whitelist/${editingInbound.id}`, payload);
                addToast('success', 'Inbound whitelist entry updated');
            } else {
                await api.post('/tenant/inbound-whitelist', payload);
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
            await api.delete(`/tenant/inbound-whitelist/${id}`);
            addToast('success', 'Inbound entry deleted');
            fetchInboundWhitelist();
        } catch (error) {
            addToast('error', 'Failed to delete inbound entry');
        }
    };

    if (!isAdmin) return <div className="p-8 text-red-500 font-bold">Access Denied</div>;

    const totalEndpoints = carriers.reduce((acc, c) => acc + (c.endpoints?.length || 0), 0);

    return (
        <div className="w-full pb-16 space-y-7 animate-in fade-in duration-300 max-w-7xl mx-auto">
            {/* Header Banner */}
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-teal-700 via-teal-600 to-emerald-600 p-8 text-white shadow-xl shadow-teal-900/15">
                <div className="absolute top-0 right-0 -mt-10 -mr-10 w-80 h-80 rounded-full bg-white/10 blur-2xl pointer-events-none" />
                <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                    <div className="space-y-1.5 max-w-2xl">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 backdrop-blur-md text-xs font-semibold tracking-wide border border-white/20">
                            <Server size={14} className="text-teal-200 animate-pulse" />
                            <span>Carrier Interconnect & Gateways</span>
                        </div>
                        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                            Trunks & Carrier Gateways
                        </h1>
                        <p className="text-teal-100 text-xs sm:text-sm font-medium">
                            Configure your organization's outbound SIP trunks, inbound carrier ACL whitelists, and DID normalization rules.
                        </p>
                    </div>
                    {activeTab === 'outbound' ? (
                        <button
                            onClick={() => { setEditingCarrier(null); setCarrierName(''); setShowCarrierModal(true); }}
                            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white hover:bg-teal-50 px-5 py-3 text-xs font-bold text-teal-800 shadow-lg shadow-black/10 transition-all active:scale-95 cursor-pointer w-full sm:w-auto"
                        >
                            <Plus size={16} className="text-teal-700" />
                            <span>Add Carrier</span>
                        </button>
                    ) : (
                        <button
                            onClick={() => { setEditingInbound(null); setInboundForm({ ipAddress: '', port: 5060, tag: '' }); setShowInboundModal(true); }}
                            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white hover:bg-teal-50 px-5 py-3 text-xs font-bold text-teal-800 shadow-lg shadow-black/10 transition-all active:scale-95 cursor-pointer w-full sm:w-auto"
                        >
                            <Plus size={16} className="text-teal-700" />
                            <span>Add Inbound IP</span>
                        </button>
                    )}
                </div>
            </div>

            {/* Quick KPI Stat Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                <CreativeStatCard
                    title="Outbound Carriers"
                    value={loading ? '—' : carriers.length}
                    subtitle="Active outbound routing carriers"
                    icon={Server}
                    color="blue"
                    badgeText="Active"
                    trend="+12%"
                    trendUp={true}
                />
                <CreativeStatCard
                    title="Configured Endpoints"
                    value={loading ? '—' : totalEndpoints}
                    subtitle="SIP gateways across all carriers"
                    icon={Shield}
                    color="emerald"
                    badgeText="SIP Nodes"
                    trend="+8%"
                    trendUp={true}
                />
                <CreativeStatCard
                    title="Inbound Whitelist"
                    value={loading ? '—' : inboundEntries.length}
                    subtitle="Authorized upstream carrier IPs"
                    icon={Shield}
                    color="purple"
                    badgeText="ACL"
                    trend="+5%"
                    trendUp={true}
                />
            </div>

            {/* Navigation Tabs */}
            <div className="flex bg-teal-50/70 dark:bg-slate-800/60 p-1.5 rounded-2xl w-fit border border-teal-200/60 dark:border-white/10 gap-1.5">
                <button
                    onClick={() => setActiveTab('outbound')}
                    className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs transition-all cursor-pointer ${
                        activeTab === 'outbound'
                            ? 'bg-teal-600 text-white shadow-sm'
                            : 'text-slate-600 dark:text-slate-300 hover:text-teal-700 dark:hover:text-white'
                    }`}
                >
                    <Server size={14} /> Outbound Trunks
                </button>
                <button
                    onClick={() => setActiveTab('inbound')}
                    className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs transition-all cursor-pointer ${
                        activeTab === 'inbound'
                            ? 'bg-teal-600 text-white shadow-sm'
                            : 'text-slate-600 dark:text-slate-300 hover:text-teal-700 dark:hover:text-white'
                    }`}
                >
                    <Shield size={14} /> Inbound Whitelist & ACL
                </button>
            </div>

            {loading ? (
                <div className="p-12 flex justify-center items-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                    <span className="ml-3 text-xs sm:text-sm font-semibold text-gray-600 dark:text-gray-300">Loading data...</span>
                </div>
            ) : activeTab === 'outbound' ? (
                /* OUTBOUND TAB CONTENT */
                <div className="space-y-4">
                    <div className="flex justify-between items-center">
                        <h2 className="text-base sm:text-lg font-bold text-gray-800 dark:text-white">Tenant-Specific Outbound Carriers</h2>
                        <button
                            onClick={() => { setEditingCarrier(null); setCarrierName(''); setShowCarrierModal(true); }}
                            className="inline-flex items-center gap-1.5 rounded-xl bg-primary-600 hover:bg-primary-700 text-white px-3.5 py-2 text-xs font-bold shadow-xs transition-all active:scale-95 cursor-pointer"
                        >
                            <Plus size={15} /> Add Carrier
                        </button>
                    </div>

                    {carriers.length === 0 ? (
                        <div className="platform-panel-dark rounded-2xl border border-dashed border-gray-300 dark:border-white/10 p-12 text-center text-gray-500 dark:text-gray-400 text-sm">
                            No outbound carriers configured yet. Add a carrier to get started.
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {carriers.map(carrier => (
                                <div key={carrier.id} className="platform-panel-dark rounded-2xl border border-gray-200/80 dark:border-white/10 shadow-xs overflow-hidden transition-all">
                                    <div className="p-4 sm:p-5 flex items-center justify-between bg-gray-50/75 dark:bg-[#12131a] border-b border-gray-100 dark:border-white/5">
                                        <div className="flex items-center gap-3">
                                            <button onClick={() => setExpandedCarrier(expandedCarrier === carrier.id ? null : carrier.id)} className="cursor-pointer">
                                                {expandedCarrier === carrier.id ? <ChevronUp size={18} className="text-gray-600 dark:text-gray-300" /> : <ChevronDown size={18} className="text-gray-600 dark:text-gray-300" />}
                                            </button>
                                            <span className="font-bold text-base text-gray-900 dark:text-white">{carrier.name}</span>
                                            <span className="text-[11px] font-bold text-gray-500 dark:text-gray-400 bg-gray-200 dark:bg-white/10 px-2 py-0.5 rounded-lg">
                                                {carrier.endpoints.length} endpoints
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => {
                                                    setSelectedCarrierId(carrier.id);
                                                    setEditingEndpoint(null);
                                                    setEndpointForm({ name: '', sipHost: '', sipPort: 5060, transport: 'udp', prefix: '', stripPlus: false, callerIdMode: 'extension', callerIdNumber: '', isActive: true, priority: 100 });
                                                    setShowEndpointModal(true);
                                                }}
                                                className="text-xs text-primary-600 dark:text-primary-400 hover:underline flex items-center gap-1 font-bold cursor-pointer"
                                            >
                                                <Server size={14} /> Add Endpoint
                                            </button>
                                            <button
                                                onClick={() => { setEditingCarrier(carrier); setCarrierName(carrier.name); setShowCarrierModal(true); }}
                                                className="p-1.5 text-gray-500 hover:text-primary-600 dark:hover:text-primary-400 ml-2 transition cursor-pointer"
                                            >
                                                <Edit size={15} />
                                            </button>
                                            <button
                                                onClick={() => handleDeleteCarrier(carrier.id)}
                                                className="p-1.5 text-gray-500 hover:text-red-600 dark:hover:text-red-400 transition cursor-pointer"
                                            >
                                                <Trash size={15} />
                                            </button>
                                        </div>
                                    </div>

                                    {expandedCarrier === carrier.id && (
                                        <div className="p-4 sm:p-5 overflow-x-auto">
                                            {carrier.endpoints.length === 0 ? (
                                                <p className="text-gray-500 dark:text-gray-400 text-xs italic">No endpoints configured for this carrier.</p>
                                            ) : (
                                                <table className="w-full text-xs">
                                                    <thead>
                                                        <tr className="text-left text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-white/5 uppercase text-[10px] font-extrabold tracking-wider">
                                                            <th className="pb-2.5">Name</th>
                                                            <th className="pb-2.5">Host:Port</th>
                                                            <th className="pb-2.5">Transport</th>
                                                            <th className="pb-2.5">Status</th>
                                                            <th className="pb-2.5 text-right">Actions</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                                                        {carrier.endpoints.map(ep => (
                                                            <tr key={ep.id} className="hover:bg-gray-50/50 dark:hover:bg-white/[0.02]">
                                                                <td className="py-3 font-bold text-gray-900 dark:text-white">
                                                                    <div className="flex items-center gap-2">
                                                                        <span>{ep.name}</span>
                                                                        <span className="bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider">
                                                                            Priority {ep.priority}
                                                                        </span>
                                                                    </div>
                                                                </td>
                                                                <td className="py-3 font-mono text-gray-600 dark:text-gray-300">{ep.sipHost}:{ep.sipPort}</td>
                                                                <td className="py-3 uppercase text-gray-600 dark:text-gray-300 font-bold">{ep.transport}</td>
                                                                <td className="py-3">
                                                                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase ${ep.isActive ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400' : 'bg-gray-100 dark:bg-white/5 text-gray-700 dark:text-gray-300'}`}>
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
                                                                        className="text-primary-600 dark:text-primary-400 hover:underline mr-3 font-bold cursor-pointer"
                                                                    >
                                                                        Edit
                                                                    </button>
                                                                    <button onClick={() => handleDeleteEndpoint(carrier.id, ep.id)} className="text-red-600 dark:text-red-400 hover:underline font-bold cursor-pointer">
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
                <div className="space-y-4">
                    <div className="flex justify-between items-center">
                        <div>
                            <h2 className="text-base sm:text-lg font-bold text-gray-800 dark:text-white">Inbound Trunks & ACL</h2>
                            <p className="text-xs text-gray-500 dark:text-gray-400">Add source IPs for your carriers and choose how their inbound DIDs are normalized.</p>
                        </div>
                        <button
                            onClick={() => { setEditingInbound(null); setInboundForm({ ipAddress: '', port: 5060, tag: '' }); setShowInboundModal(true); }}
                            className="inline-flex items-center gap-1.5 rounded-xl bg-primary-600 hover:bg-primary-700 text-white px-3.5 py-2 text-xs font-bold shadow-xs transition-all active:scale-95 cursor-pointer"
                        >
                            <Plus size={15} /> Add IP Address
                        </button>
                    </div>

                    <div className="platform-panel-dark rounded-2xl border border-gray-200/80 dark:border-white/10 shadow-xs p-4 sm:p-5">
                        <label className="block text-xs font-bold text-gray-800 dark:text-white uppercase tracking-wider mb-2">Inbound DID Normalization</label>
                        <select
                            className="w-full max-w-xl rounded-xl border border-gray-200 dark:border-white/10 bg-gray-50/50 dark:bg-[#12131a] p-2 text-xs font-semibold text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 outline-none"
                            value={inboundNormalization}
                            onChange={(event) => saveInboundNormalization(event.target.value)}
                        >
                            <option value="AUTO_10DIGIT">Normalize to 10 digits (strip +1/1) — Recommended</option>
                            <option value="STRIP_PLUS">Strip leading +</option>
                            <option value="NONE">Pass verbatim (no normalization)</option>
                        </select>
                    </div>

                    {inboundEntries.length === 0 ? (
                        <div className="platform-panel-dark rounded-2xl border border-dashed border-gray-300 dark:border-white/10 p-12 text-center text-gray-500 dark:text-gray-400 text-sm">
                            No inbound whitelisted IP addresses configured. Click 'Add IP Address' to configure.
                        </div>
                    ) : (
                        <div className="bg-white dark:bg-[#0c0d12] rounded-2xl border border-gray-200/80 dark:border-white/10 shadow-xs overflow-hidden">
                            <table className="w-full text-xs">
                                <thead>
                                    <tr className="text-left text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-white/5 bg-gray-50/75 dark:bg-[#12131a] uppercase text-[10px] font-extrabold tracking-wider">
                                        <th className="p-3.5">Label / Tag</th>
                                        <th className="p-3.5">IP Address</th>
                                        <th className="p-3.5">Port</th>
                                        <th className="p-3.5">Created At</th>
                                        <th className="p-3.5 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                                    {inboundEntries.slice((inboundPage - 1) * inboundLimit, inboundPage * inboundLimit).map(entry => (
                                        <tr key={entry.id} className="hover:bg-gray-50/50 dark:hover:bg-white/[0.02] transition">
                                            <td className="p-3.5 font-bold text-gray-900 dark:text-white">{entry.tag}</td>
                                            <td className="p-3.5 font-mono text-gray-700 dark:text-gray-300">{entry.ipAddress}</td>
                                            <td className="p-3.5 text-gray-600 dark:text-gray-400 font-mono">{entry.port}</td>
                                            <td className="p-3.5 text-gray-500 dark:text-gray-400">{new Date(entry.createdAt).toLocaleString()}</td>
                                            <td className="p-3.5 text-right">
                                                <button
                                                    onClick={() => {
                                                        setEditingInbound(entry);
                                                        setInboundForm({ ipAddress: entry.ipAddress, port: entry.port, tag: entry.tag });
                                                        setShowInboundModal(true);
                                                    }}
                                                    className="text-primary-600 dark:text-primary-400 hover:underline mr-4 font-bold cursor-pointer"
                                                >
                                                    Edit
                                                </button>
                                                <button onClick={() => handleDeleteInbound(entry.id)} className="text-red-600 dark:text-red-400 hover:underline font-bold cursor-pointer">
                                                    Delete
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>

                            <Pagination
                                page={inboundPage}
                                limit={inboundLimit}
                                total={inboundEntries.length}
                                onPageChange={setInboundPage}
                                onLimitChange={(newLimit) => {
                                    setInboundLimit(newLimit);
                                    setInboundPage(1);
                                }}
                                itemName="whitelist IPs"
                            />
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
                            <div>
                                <label className="block text-sm font-medium mb-1 text-gray-700">Priority</label>
                                <input type="number" min="1" max="10000" className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-100 outline-none" value={endpointForm.priority} onChange={e => setEndpointForm({ ...endpointForm, priority: parseInt(e.target.value) || 100 })} />
                                <p className="text-xs text-gray-500 mt-1">Lower numbers are selected first.</p>
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
