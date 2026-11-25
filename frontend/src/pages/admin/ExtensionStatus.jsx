import React, { useEffect, useState } from 'react';
import api from '../../services/api';
import { Phone, Search, RefreshCw, Radio } from 'lucide-react';
import Pagination from '../../components/common/Pagination';
import CreativeStatCard from '../../components/common/CreativeStatCard';

const ExtensionStatus = () => {
    const [statusData, setStatusData] = useState({ online_count: 0, extensions: [] });
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(10);

    const fetchStatus = async () => {
        setLoading(true);
        try {
            const response = await api.get('/admin/extensions/status');
            setStatusData(response.data || { online_count: 0, extensions: [] });
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchStatus();
    }, []);

    const filteredExtensions = (statusData.extensions || []).filter(ext => 
        ext.extension?.toLowerCase().includes(searchQuery.toLowerCase()) || 
        ext.customerCode?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const paginatedExtensions = filteredExtensions.slice((page - 1) * limit, page * limit);

    return (
        <div className="w-full pb-16 space-y-7 animate-in fade-in duration-300 max-w-7xl mx-auto">
            {/* Header Banner */}
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-teal-700 via-teal-600 to-emerald-600 p-8 text-white shadow-xl shadow-teal-900/15">
                <div className="absolute top-0 right-0 -mt-10 -mr-10 w-80 h-80 rounded-full bg-white/10 blur-2xl pointer-events-none" />
                <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
                    <div className="space-y-1.5 max-w-2xl">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 backdrop-blur-md text-xs font-semibold tracking-wide border border-white/20">
                            <Radio size={14} className="text-teal-200" />
                            <span>SIP Telemetry & Endpoint Registration</span>
                        </div>
                        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                            Global Extension Registration Status
                        </h1>
                        <p className="text-teal-100 text-xs sm:text-sm font-medium">
                            Real-time view of active SIP endpoints, softphone registrations, and device bindings across all platform organizations.
                        </p>
                    </div>

                    <div className="flex items-center gap-3">
                        <button 
                            onClick={fetchStatus} 
                            disabled={loading}
                            className="inline-flex justify-center items-center gap-2 rounded-2xl bg-white hover:bg-teal-50 px-5 py-3 text-xs font-bold text-teal-800 shadow-lg shadow-black/10 transition-all active:scale-95 cursor-pointer w-full sm:w-auto disabled:opacity-50"
                            title="Refresh Status"
                        >
                            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin text-teal-600' : 'text-teal-700'}`} />
                            <span>Refresh Endpoints</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Quick KPI Stat Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                <CreativeStatCard
                    title="Live Registrations"
                    value={loading ? '—' : statusData.online_count}
                    subtitle="Active endpoints across platform"
                    icon={Phone}
                    color="blue"
                    trend="+12%"
                    trendUp={true}
                />
                <CreativeStatCard
                    title="Filtered Devices"
                    value={loading ? '—' : filteredExtensions.length}
                    subtitle="Matches currently listed below"
                    icon={Search}
                    color="purple"
                    trend="+8%"
                    trendUp={true}
                />
                <CreativeStatCard
                    title="Signaling Protocol"
                    value="Kamailio Registrar"
                    subtitle="Distributed Redis contact binding"
                    icon={Radio}
                    color="emerald"
                    trend="Connected"
                    trendUp={true}
                />
            </div>

            {/* Filter Search Toolbar */}
            <div className="bg-white/95 dark:bg-slate-900/95 p-3 rounded-2xl border border-teal-200/70 dark:border-white/10 shadow-sm backdrop-blur-sm">
                <div className="relative w-full">
                    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5">
                        <Search className="h-4 w-4 text-teal-600/70 dark:text-teal-400" />
                    </div>
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="block w-full rounded-xl border border-teal-200/80 dark:border-white/10 bg-teal-50/30 dark:bg-slate-800/50 py-2.5 pl-10 pr-4 text-xs sm:text-sm font-semibold text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all"
                        placeholder="Search by extension number, customer code, or device..."
                    />
                </div>
            </div>

            <div className="rounded-3xl bg-white/95 dark:bg-slate-900/95 border border-teal-200/70 dark:border-white/10 shadow-sm overflow-hidden backdrop-blur-sm">
                <div className="bg-teal-50/50 dark:bg-slate-800/50 px-6 py-4 border-b border-teal-100 dark:border-white/5 flex justify-between items-center">
                    <span className="text-[11px] font-extrabold text-teal-900 dark:text-teal-300 uppercase tracking-widest">
                        Live Registrations Table
                    </span>
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-teal-50 dark:bg-teal-950 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800 shadow-xs">
                        <span className="w-1.5 h-1.5 rounded-full bg-teal-500 animate-pulse mr-1.5" />
                        {statusData.online_count} Online Total
                    </span>
                </div>
                
                {loading ? (
                    <div className="p-16 text-center text-slate-400 text-sm font-medium">Loading global registration status...</div>
                ) : filteredExtensions.length === 0 ? (
                    <div className="p-16 text-center text-slate-400 text-sm font-medium">No active extensions found matching your search.</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-teal-100 dark:divide-white/5">
                            <thead className="bg-teal-50/30 dark:bg-slate-800/30">
                                <tr>
                                    <th scope="col" className="px-6 py-3.5 text-left text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">Tenant / Customer</th>
                                    <th scope="col" className="px-6 py-3.5 text-left text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">Extension</th>
                                    <th scope="col" className="px-6 py-3.5 text-left text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">Device / IP</th>
                                    <th scope="col" className="px-6 py-3.5 text-left text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-teal-100 dark:divide-white/5">
                                {paginatedExtensions.map((ext, idx) => (
                                    <tr key={idx} className="hover:bg-teal-50/40 dark:hover:bg-white/[0.02] transition-colors group">
                                        <td className="whitespace-nowrap px-6 py-4">
                                            <span className="inline-flex items-center px-2.5 py-1 rounded-xl text-xs font-bold bg-teal-50 dark:bg-teal-950/40 text-teal-800 dark:text-teal-300 border border-teal-200 dark:border-teal-800/40 font-mono">
                                                {ext.customerCode}
                                            </span>
                                        </td>
                                        <td className="whitespace-nowrap px-6 py-4">
                                            <div className="flex items-center space-x-3">
                                                <div className="h-8 w-8 bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-400 border border-teal-200 dark:border-teal-800/40 rounded-xl flex items-center justify-center shadow-xs">
                                                    <Phone className="h-4 w-4" />
                                                </div>
                                                <div className="font-bold text-slate-800 dark:text-white text-sm font-mono">
                                                    {ext.extension}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            {ext.devices?.map((device, i) => (
                                                <div key={i} className="flex flex-col">
                                                    <span className="text-xs sm:text-sm font-semibold text-slate-800 dark:text-white">{device.user_agent || 'Unknown Device'}</span>
                                                    <span className="text-[11px] text-slate-400 font-mono mt-0.5">{device.received_from || device.address}</span>
                                                </div>
                                            ))}
                                        </td>
                                        <td className="whitespace-nowrap px-6 py-4">
                                            <div className="flex flex-col items-start">
                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase leading-4 tracking-wide bg-teal-50 dark:bg-teal-950 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800">
                                                    <div className="mr-1.5 h-1.5 w-1.5 rounded-full bg-teal-500 animate-pulse" />
                                                    ONLINE
                                                </span>
                                                {ext.devices?.map((device, i) => (
                                                    <span key={i} className="text-[10px] text-slate-400 mt-1 font-medium font-mono">
                                                        Expires: {device.expires_in}s
                                                    </span>
                                                ))}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Pagination */}
                <Pagination
                    page={page}
                    limit={limit}
                    total={filteredExtensions.length}
                    onPageChange={setPage}
                    onLimitChange={(l) => { setLimit(l); setPage(1); }}
                    itemName="extensions"
                />
            </div>
        </div>
    );
};

export default ExtensionStatus;
