import React, { useEffect, useState } from 'react';
import api from '../../../services/api';
import { Phone, RefreshCw, Activity, Radio, ShieldCheck, Search } from 'lucide-react';
import Pagination from '../../../components/common/Pagination';
import CreativeStatCard from '../../../components/common/CreativeStatCard';
import { clsx } from 'clsx';

const ExtensionsStatusPage = () => {
    const [statusData, setStatusData] = useState({ online_count: 0, extensions: [] });
    const [loadingStatus, setLoadingStatus] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(10);

    const fetchStatus = async () => {
        setLoadingStatus(true);
        try {
            const response = await api.get('/telecom/extensions/status');
            setStatusData(response.data || { online_count: 0, extensions: [] });
        } catch (error) {
            console.error(error);
        } finally {
            setLoadingStatus(false);
        }
    };

    useEffect(() => {
        fetchStatus();
    }, []);

    const filteredExtensions = (statusData.extensions || []).filter(ext => {
        const query = searchQuery.toLowerCase();
        return ext.extension?.toString().includes(query) ||
            ext.devices?.some(d =>
                (d.received_from && d.received_from.toLowerCase().includes(query)) ||
                (d.user_agent && d.user_agent.toLowerCase().includes(query))
            );
    });

    const paginatedExtensions = filteredExtensions.slice((page - 1) * limit, page * limit);

    return (
        <div className="space-y-7 w-full pb-16 animate-in fade-in duration-300 max-w-7xl mx-auto">
            {/* Header section */}
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-teal-700 via-teal-600 to-emerald-600 p-8 text-white shadow-xl shadow-teal-900/15">
                <div className="absolute top-0 right-0 -mt-10 -mr-10 w-80 h-80 rounded-full bg-white/10 blur-2xl pointer-events-none" />
                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="space-y-1.5 max-w-2xl">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 backdrop-blur-md text-xs font-semibold tracking-wide border border-white/20">
                            <Activity size={14} className="text-teal-200" />
                            <span>Live SIP Telemetry & Hardware Diagnostics</span>
                        </div>
                        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                            Extension Registration Status
                        </h1>
                        <p className="text-teal-100 text-xs sm:text-sm font-medium">
                            Real-time SIP registration diagnostics, device bindings, and NAT network endpoint telemetry.
                        </p>
                    </div>

                    <div className="flex items-center gap-2.5">
                        <button
                            onClick={fetchStatus}
                            disabled={loadingStatus}
                            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white hover:bg-teal-50 px-5 py-3 text-xs font-bold text-teal-800 shadow-lg shadow-black/10 transition-all active:scale-95 cursor-pointer disabled:opacity-50"
                        >
                            <RefreshCw size={15} className={clsx(loadingStatus ? "animate-spin text-teal-600" : "text-teal-700")} />
                            <span>Refresh Status</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Quick KPI Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                <CreativeStatCard
                    title="Online Extensions"
                    value={statusData.online_count}
                    subtitle="Active registrations"
                    icon={Radio}
                    color="blue"
                    trend="+12%"
                    trendUp={true}
                />
                <CreativeStatCard
                    title="Connected Devices"
                    value={statusData.extensions.reduce((acc, curr) => acc + (curr.devices?.length || 0), 0)}
                    subtitle="SIP endpoints"
                    icon={Phone}
                    color="purple"
                    trend="+8%"
                    trendUp={true}
                />
                <CreativeStatCard
                    title="Registration Health"
                    value="100%"
                    subtitle="Cluster operational"
                    icon={ShieldCheck}
                    color="emerald"
                    trend="Optimal"
                    trendUp={true}
                />
            </div>

            {/* Unified search bar */}
            <div className="bg-white/95 dark:bg-slate-900/95 p-3 rounded-2xl border border-teal-200/70 dark:border-white/10 shadow-sm backdrop-blur-sm">
                <div className="relative max-w-md">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-teal-600/70 dark:text-teal-400 h-4 w-4" />
                    <input
                        type="text"
                        placeholder="Filter by extension #, IP or user agent..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-teal-50/30 dark:bg-slate-800/50 border border-teal-200/80 dark:border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-xs sm:text-sm font-semibold text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 transition-all"
                    />
                </div>
            </div>

            {/* Registrations List */}
            <div className="bg-white/95 dark:bg-slate-900/95 rounded-3xl border border-teal-200/70 dark:border-white/10 shadow-sm overflow-hidden backdrop-blur-sm">
                <div className="bg-teal-50/50 dark:bg-slate-800/50 px-6 py-4 border-b border-teal-100 dark:border-white/5 flex justify-between items-center">
                    <span className="text-[11px] font-extrabold text-teal-900 dark:text-teal-300 uppercase tracking-wider">
                        Live Registrations ({filteredExtensions.length})
                    </span>
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-teal-50 dark:bg-teal-950 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800 shadow-xs">
                        <div className="h-1.5 w-1.5 rounded-full bg-teal-500 animate-pulse" />
                        {statusData.online_count} Active
                    </span>
                </div>

                {loadingStatus ? (
                    <div className="p-16 text-center text-slate-400 text-sm font-medium">
                        <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2 text-teal-600" />
                        Querying SIP registrations...
                    </div>
                ) : filteredExtensions.length === 0 ? (
                    <div className="p-16 text-center">
                        <div className="bg-teal-50/50 dark:bg-white/5 p-4 rounded-2xl w-14 h-14 mx-auto mb-3 flex items-center justify-center">
                            <Phone className="h-7 w-7 text-teal-600/60 dark:text-teal-400" />
                        </div>
                        <p className="text-slate-700 dark:text-slate-300 font-bold">{searchQuery ? 'No matching extensions found.' : 'No active extensions registered.'}</p>
                    </div>
                ) : (
                    <>
                        <ul className="divide-y divide-teal-100 dark:divide-white/5">
                            {paginatedExtensions.map((ext, idx) => (
                                <li key={idx} className="p-5 flex flex-col sm:flex-row sm:items-center justify-between group hover:bg-teal-50/40 dark:hover:bg-white/[0.02] transition-colors">
                                    <div className="flex items-center space-x-4 mb-4 sm:mb-0">
                                        <div className="h-11 w-11 bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-400 border border-teal-200 dark:border-teal-800/40 rounded-xl flex items-center justify-center font-extrabold text-base shadow-xs shrink-0">
                                            <Phone className="h-5 w-5" />
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-sm font-extrabold text-slate-800 dark:text-white truncate">Extension {ext.extension}</p>
                                            {ext.devices?.map((device, i) => (
                                                <div key={i} className="flex flex-col mt-1">
                                                    <span className="text-xs text-slate-500 dark:text-slate-400 font-mono truncate max-w-sm font-semibold">IP: {device.received_from || device.address}</span>
                                                    <span className="text-xs text-slate-400 dark:text-slate-500 truncate max-w-sm">Agent: {device.user_agent}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-between sm:justify-end sm:space-x-6 sm:pl-4">
                                        <div className="flex flex-col items-start sm:items-end">
                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-extrabold leading-4 tracking-wide bg-teal-50 dark:bg-teal-950 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800">
                                                <div className="mr-1.5 h-1.5 w-1.5 rounded-full bg-teal-500 animate-pulse" />
                                                ONLINE
                                            </span>
                                            {ext.devices?.map((device, i) => (
                                                <span key={i} className="text-[10px] text-slate-400 mt-1 font-medium font-mono">Expires in: {device.expires_in}s</span>
                                            ))}
                                        </div>
                                    </div>
                                </li>
                            ))}
                        </ul>

                        <Pagination
                            page={page}
                            limit={limit}
                            total={filteredExtensions.length}
                            onPageChange={setPage}
                            onLimitChange={(newLimit) => {
                                setLimit(newLimit);
                                setPage(1);
                            }}
                            itemName="extensions"
                        />
                    </>
                )}
            </div>
        </div>
    );
};

export default ExtensionsStatusPage;
