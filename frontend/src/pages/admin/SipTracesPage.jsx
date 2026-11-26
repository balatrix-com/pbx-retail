import { useEffect, useState } from 'react';
import { RefreshCw, Search, ShieldAlert, Radio, Activity, Calendar, ArrowRight, Zap, Filter, PhoneIncoming, PhoneOutgoing } from 'lucide-react';
import api from '../../services/api';
import SipTraceDetail from './SipTraceDetail';
import Pagination from '../../components/common/Pagination';
import CreativeStatCard from '../../components/common/CreativeStatCard';

const localInput = (date) => {
    const offset = date.getTimezoneOffset() * 60000;
    return new Date(date.getTime() - offset).toISOString().slice(0, 16);
};

export default function SipTracesPage({ tenantMode = false }) {
    const [from, setFrom] = useState(() => localInput(new Date(Date.now() - 86400000)));
    const [to, setTo] = useState(() => localInput(new Date()));
    const [customerId, setCustomerId] = useState('');
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(25);
    const [rows, setRows] = useState([]);
    const [hasMore, setHasMore] = useState(false);
    const [selected, setSelected] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const endpoint = tenantMode ? '/tenant/sip-traces' : '/sip-traces';

    const load = async (nextPage = page, nextLimit = limit) => {
        setLoading(true);
        setError('');
        try {
            const params = tenantMode
                ? { search: search.trim(), page: nextPage, limit: nextLimit }
                : { from: new Date(from).toISOString(), to: new Date(to).toISOString(),
                    customerId: customerId.trim(), search: search.trim(), page: nextPage, limit: nextLimit };
            const result = await api.get(endpoint, { params });
            setRows(result.data.data || []);
            setHasMore(result.data.hasMore);
            setPage(nextPage);
            setLimit(nextLimit);
        } catch (err) {
            setError(err.response?.data?.message || 'Unable to load SIP traces.');
        } finally { setLoading(false); }
    };

    useEffect(() => { load(1); }, []); // Initial bounded history query only.

    const time = (value) => value ? new Date(value).toLocaleString() : '—';

    return (
        <div className="w-full pb-16 space-y-7 animate-in fade-in duration-300 max-w-7xl mx-auto">
            {/* Header Banner */}
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-teal-700 via-teal-600 to-emerald-600 p-8 text-white shadow-xl shadow-teal-900/15">
                <div className="absolute top-0 right-0 -mt-10 -mr-10 w-80 h-80 rounded-full bg-white/10 blur-2xl pointer-events-none" />
                <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                    <div className="space-y-1.5 max-w-2xl">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 backdrop-blur-md text-xs font-semibold tracking-wide border border-white/20">
                            <Radio size={14} className="text-teal-200 animate-pulse" />
                            <span>Signaling Diagnostics & Packet Captures</span>
                        </div>
                        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                            SIP Traces & Diagnostics
                        </h1>
                        <p className="text-teal-100 text-xs sm:text-sm font-medium">
                            {tenantMode
                                ? 'Real-time inspection of your latest completed calls with full signaling ladder diagrams and packet correlation.'
                                : 'Super Admin deep diagnostics · Correlate FreeSWITCH CDRs with Homer packet captures and call flow ladders.'}
                        </p>
                    </div>
                    <button
                        onClick={() => load(page)}
                        disabled={loading}
                        className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white hover:bg-teal-50 px-5 py-3 text-xs font-bold text-teal-800 shadow-lg shadow-black/10 transition-all active:scale-95 disabled:opacity-50 cursor-pointer w-full sm:w-auto"
                    >
                        <RefreshCw size={15} className={`text-teal-700 ${loading ? 'animate-spin' : ''}`} />
                        <span>Refresh Traces</span>
                    </button>
                </div>
            </div>

            {/* Quick KPI Stat Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                <CreativeStatCard
                    title="Traces Captured"
                    value={loading ? '—' : rows.length}
                    subtitle="Completed call legs in current window"
                    icon={Activity}
                    color="blue"
                    badgeText={`Page ${page}`}
                    trend="+12%"
                    trendUp={true}
                />
                <CreativeStatCard
                    title="Capture Scope"
                    value={tenantMode ? 'Last 100 Calls' : `${from.split('T')[0]} → ${to.split('T')[0]}`}
                    subtitle={tenantMode ? 'Recent account activity' : 'Bounded packet capture window'}
                    icon={Calendar}
                    color="teal"
                    badgeText={tenantMode ? 'Sliding Window' : 'Time Filter'}
                    trend="+8%"
                    trendUp={true}
                />
                <CreativeStatCard
                    title="Signaling Protection"
                    value="Headers Redacted"
                    subtitle="Passwords & Digest nonces masked"
                    icon={ShieldAlert}
                    color="emerald"
                    badgeText="Active"
                    trend="Secure"
                    trendUp={true}
                />
            </div>

            {/* Filter Search Form */}
            <form onSubmit={(event) => { event.preventDefault(); load(1); }} className="rounded-3xl p-6 bg-white/95 dark:bg-slate-900/95 border border-teal-200/70 dark:border-white/10 shadow-sm grid gap-4 md:grid-cols-5 items-end backdrop-blur-sm">
                {!tenantMode && (
                    <>
                        <div>
                            <label className="text-[11px] font-extrabold text-teal-900 dark:text-teal-300 uppercase tracking-wider block mb-1.5">From</label>
                            <input
                                aria-label="From"
                                type="datetime-local"
                                required
                                value={from}
                                onChange={e => setFrom(e.target.value)}
                                className="w-full rounded-2xl border border-teal-200/80 dark:border-white/10 bg-teal-50/30 dark:bg-slate-800/60 px-3.5 py-2.5 text-xs font-medium text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500/50"
                            />
                        </div>
                        <div>
                            <label className="text-[11px] font-extrabold text-teal-900 dark:text-teal-300 uppercase tracking-wider block mb-1.5">To</label>
                            <input
                                aria-label="To"
                                type="datetime-local"
                                required
                                value={to}
                                onChange={e => setTo(e.target.value)}
                                className="w-full rounded-2xl border border-teal-200/80 dark:border-white/10 bg-teal-50/30 dark:bg-slate-800/60 px-3.5 py-2.5 text-xs font-medium text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500/50"
                            />
                        </div>
                        <div>
                            <label className="text-[11px] font-extrabold text-teal-900 dark:text-teal-300 uppercase tracking-wider block mb-1.5">Customer ID</label>
                            <input
                                value={customerId}
                                onChange={e => setCustomerId(e.target.value)}
                                placeholder="e.g. U1001"
                                className="w-full rounded-2xl border border-teal-200/80 dark:border-white/10 bg-teal-50/30 dark:bg-slate-800/60 px-3.5 py-2.5 text-xs font-medium text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/50"
                            />
                        </div>
                    </>
                )}
                <div className={tenantMode ? "md:col-span-4" : ""}>
                    <label className="text-[11px] font-extrabold text-teal-900 dark:text-teal-300 uppercase tracking-wider block mb-1.5">Number / Call-ID</label>
                    <input
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder="Search by caller, callee, or UUID..."
                        className="w-full rounded-2xl border border-teal-200/80 dark:border-white/10 bg-teal-50/30 dark:bg-slate-800/60 px-3.5 py-2.5 text-xs font-medium text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/50"
                    />
                </div>
                <button
                    type="submit"
                    disabled={loading}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl bg-teal-600 hover:bg-teal-700 px-5 py-2.5 text-xs font-bold text-white shadow-md shadow-teal-600/20 transition-all active:scale-95 disabled:opacity-50 cursor-pointer h-[42px]"
                >
                    <Search className="w-4 h-4" />
                    Query Traces
                </button>
            </form>

            {error && (
                <div role="alert" className="rounded-3xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/40 text-rose-800 dark:text-rose-300 p-5 text-xs font-medium shadow-sm">
                    {error}
                </div>
            )}

            {/* Traces Table Section */}
            <section className="rounded-3xl bg-white/95 dark:bg-slate-900/95 border border-teal-200/70 dark:border-white/10 shadow-sm overflow-hidden backdrop-blur-sm">
                <div className="p-5 sm:p-6 border-b border-teal-100 dark:border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-teal-50/30 dark:bg-white/[0.02]">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-2xl bg-teal-50 dark:bg-teal-950/50 text-teal-600 dark:text-teal-400 border border-teal-200/60 dark:border-teal-800/30 flex items-center justify-center shrink-0">
                            <Radio size={20} />
                        </div>
                        <div>
                            <h2 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                                Call Signaling Events
                                <span className="text-[11px] font-bold text-teal-700 dark:text-teal-300 bg-teal-50 dark:bg-teal-950/50 px-2.5 py-0.5 rounded-full border border-teal-200/60 dark:border-teal-800/40">
                                    {rows.length} on page
                                </span>
                            </h2>
                            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Correlated Homer & Kamailio packet capture flows</p>
                        </div>
                    </div>
                </div>

                {loading ? (
                    <div className="p-20 text-center text-sm font-medium text-slate-500 dark:text-slate-400 flex flex-col items-center justify-center gap-3">
                        <RefreshCw className="w-8 h-8 animate-spin text-teal-600" />
                        <span>Loading SIP signaling captures...</span>
                    </div>
                ) : !rows.length ? (
                    <div className="p-20 text-center text-sm font-medium text-slate-500 dark:text-slate-400">
                        <div className="h-14 w-14 rounded-3xl bg-teal-50 dark:bg-white/5 text-teal-500 flex items-center justify-center mx-auto mb-3">
                            <Radio size={28} />
                        </div>
                        <p className="font-bold text-base text-slate-900 dark:text-white">No call events found</p>
                        <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">Try expanding your query time range or clearing the customer ID or search filters.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-teal-100/60 dark:divide-white/5">
                            <thead className="bg-teal-50/50 dark:bg-slate-800/50">
                                <tr>
                                    <th className="px-6 py-4 text-left text-[11px] font-extrabold text-teal-900 dark:text-teal-300 uppercase tracking-wider">Started</th>
                                    <th className="px-6 py-4 text-left text-[11px] font-extrabold text-teal-900 dark:text-teal-300 uppercase tracking-wider">Tenant</th>
                                    <th className="px-6 py-4 text-center text-[11px] font-extrabold text-teal-900 dark:text-teal-300 uppercase tracking-wider">Direction</th>
                                    <th className="px-6 py-4 text-left text-[11px] font-extrabold text-teal-900 dark:text-teal-300 uppercase tracking-wider">Caller → Callee</th>
                                    <th className="px-6 py-4 text-center text-[11px] font-extrabold text-teal-900 dark:text-teal-300 uppercase tracking-wider">CDR Export</th>
                                    <th className="px-6 py-4 text-right text-[11px] font-extrabold text-teal-900 dark:text-teal-300 uppercase tracking-wider">Trace Details</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-teal-100/40 dark:divide-white/5">
                                {rows.map(row => (
                                    <tr key={row.session_uuid} className="hover:bg-teal-50/40 dark:hover:bg-white/[0.02] transition-colors">
                                        <td className="px-6 py-4 whitespace-nowrap text-xs font-mono text-slate-600 dark:text-slate-300">
                                            {time(row.started_at || row.first_leg_received_at)}
                                        </td>
                                        <td className="px-6 py-4 text-xs font-bold text-slate-900 dark:text-white font-mono">
                                            {row.customer_id ? (
                                                <span className="inline-flex items-center px-2 py-0.5 rounded-lg text-[11px] font-bold bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-300 border border-teal-200/50 dark:border-teal-800/40">
                                                    {row.customer_id}
                                                </span>
                                            ) : '—'}
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                                row.direction === 'inbound'
                                                    ? 'bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300 ring-1 ring-sky-500/20'
                                                    : 'bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-300 ring-1 ring-teal-500/20'
                                            }`}>
                                                {row.direction === 'inbound' ? <PhoneIncoming size={11} /> : <PhoneOutgoing size={11} />}
                                                {row.direction || '—'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-xs font-bold text-slate-900 dark:text-white font-mono">
                                            <span className="text-slate-700 dark:text-slate-200">{row.caller_number || '—'}</span>
                                            <span className="text-teal-500 font-sans mx-2">→</span>
                                            <span className="text-teal-700 dark:text-teal-300">{row.destination_number || '—'}</span>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span className={`inline-flex items-center px-2 py-0.5 rounded-lg text-[10px] font-mono font-bold uppercase border ${
                                                row.cdr_export_status === 'COMPLETED'
                                                    ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200/60 dark:border-emerald-800/40'
                                                    : 'bg-teal-50/50 dark:bg-white/5 text-slate-700 dark:text-slate-300 border-teal-200/50 dark:border-white/10'
                                            }`}>
                                                {row.cdr_export_status || 'PENDING'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <button
                                                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border border-teal-200 dark:border-teal-800/40 bg-teal-50/60 dark:bg-teal-950/40 text-xs font-bold text-teal-700 dark:text-teal-300 hover:bg-teal-600 hover:text-white dark:hover:bg-teal-600 dark:hover:text-white disabled:opacity-40 disabled:hover:bg-teal-50/60 disabled:hover:text-teal-700 transition-all shadow-xs cursor-pointer"
                                                disabled={!row.traceAvailable}
                                                onClick={() => setSelected(row)}
                                            >
                                                {row.traceAvailable ? (
                                                    <>Inspect Ladder <ArrowRight size={13} /></>
                                                ) : (
                                                    'No Call-ID'
                                                )}
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                <div className="p-4 border-t border-teal-100/70 dark:border-white/5">
                    <Pagination
                        page={page}
                        limit={limit}
                        total={hasMore ? page * limit + 1 : (page - 1) * limit + rows.length}
                        totalPages={hasMore ? page + 1 : page}
                        onPageChange={(p) => load(p, limit)}
                        onLimitChange={(l) => { setLimit(l); load(1, l); }}
                        itemName="SIP traces"
                    />
                </div>
            </section>

            {selected && <SipTraceDetail row={selected} endpoint={endpoint} onClose={() => setSelected(null)} />}
        </div>
    );
}
