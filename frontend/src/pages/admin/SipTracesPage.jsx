import { useEffect, useState } from 'react';
import {
    RefreshCw,
    Search,
    ShieldAlert,
    ArrowDownLeft,
    ArrowUpRight,
    ExternalLink,
    Calendar,
    User
} from 'lucide-react';
import api from '../../services/api';
import SipTraceDetail from './SipTraceDetail';

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
    const [rows, setRows] = useState([]);
    const [hasMore, setHasMore] = useState(false);
    const [selected, setSelected] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const endpoint = tenantMode ? '/tenant/sip-traces' : '/sip-traces';

    const load = async (nextPage = page) => {
        setLoading(true);
        setError('');
        try {
            const params = tenantMode
                ? { search: search.trim(), page: nextPage, limit: 25 }
                : {
                    from: new Date(from).toISOString(),
                    to: new Date(to).toISOString(),
                    customerId: customerId.trim(),
                    search: search.trim(),
                    page: nextPage,
                    limit: 25
                };
            const result = await api.get(endpoint, { params });
            setRows(result.data.data || []);
            setHasMore(Boolean(result.data.hasMore));
            setPage(nextPage);
        } catch (err) {
            setError(err.response?.data?.message || 'Unable to load SIP traces.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        load(1);
    }, []); // Initial bounded history query only.

    const time = (value) => (value ? new Date(value).toLocaleString() : '—');

    return (
        <div className="max-w-7xl mx-auto p-4 sm:p-6 space-y-5 animate-in fade-in duration-200">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-slate-900 tracking-tight">SIP traces</h1>
                <p className="text-sm text-slate-600 mt-1">
                    {tenantMode
                        ? 'Your latest 100 completed calls. When a newer call arrives, the oldest drops out of this view.'
                        : 'Super Admin diagnostics · Call history appears after FreeSWITCH sends its CDR.'}{' '}
                    Raw SIP is fetched from Homer on demand.
                </p>
            </div>

            {/* Warning Banner */}
            <div className="rounded-2xl border border-amber-200/80 bg-amber-50/70 p-4 text-xs font-semibold text-amber-950 flex items-start gap-3 shadow-2xs">
                <ShieldAlert className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
                <p className="leading-relaxed">
                    SIP signaling contains sensitive data. Authentication headers are redacted; Homer retention or packet loss may leave a trace incomplete.
                </p>
            </div>

            {/* Search and Filters Card */}
            <form
                onSubmit={(event) => {
                    event.preventDefault();
                    load(1);
                }}
                className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-4"
            >
                {!tenantMode && (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pb-4 border-b border-slate-100">
                        <div>
                            <label className="block text-[11px] font-black uppercase tracking-wider text-slate-500 mb-1.5 flex items-center gap-1.5">
                                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                                From
                            </label>
                            <input
                                aria-label="From"
                                type="datetime-local"
                                required
                                value={from}
                                onChange={(e) => setFrom(e.target.value)}
                                className="w-full px-3 py-2 bg-slate-50/50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition-all"
                            />
                        </div>
                        <div>
                            <label className="block text-[11px] font-black uppercase tracking-wider text-slate-500 mb-1.5 flex items-center gap-1.5">
                                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                                To
                            </label>
                            <input
                                aria-label="To"
                                type="datetime-local"
                                required
                                value={to}
                                onChange={(e) => setTo(e.target.value)}
                                className="w-full px-3 py-2 bg-slate-50/50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition-all"
                            />
                        </div>
                        <div>
                            <label className="block text-[11px] font-black uppercase tracking-wider text-slate-500 mb-1.5 flex items-center gap-1.5">
                                <User className="w-3.5 h-3.5 text-slate-400" />
                                Customer ID
                            </label>
                            <input
                                value={customerId}
                                onChange={(e) => setCustomerId(e.target.value)}
                                placeholder="e.g. U1001"
                                className="w-full px-3 py-2 bg-slate-50/50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 font-mono transition-all"
                            />
                        </div>
                    </div>
                )}

                <div>
                    <label className="block text-[11px] uppercase font-black text-slate-500 mb-1.5">
                        Number / Call-ID
                    </label>
                    <div className="flex gap-2">
                        <div className="relative flex-1">
                            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                            <input
                                type="text"
                                placeholder="Search number or session UUID..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="w-full pl-10 pr-3 py-2 text-xs text-slate-900 font-bold placeholder-slate-400 bg-slate-50/50 border border-slate-200 rounded-xl focus:outline-none focus:border-blue-600 focus:bg-white focus:ring-2 focus:ring-blue-600/20 transition-all font-mono"
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={loading}
                            className="px-5 py-2 bg-[#1e40af] hover:bg-[#1e3a8a] text-white rounded-xl text-xs font-black shadow-xs inline-flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50 shrink-0"
                        >
                            <Search className="w-3.5 h-3.5" />
                            <span>Search</span>
                        </button>
                    </div>
                </div>
            </form>

            {error && (
                <div role="alert" className="rounded-xl border border-red-200 bg-red-50 text-red-800 p-4 text-xs font-bold">
                    {error}
                </div>
            )}

            {/* Calls Table Container */}
            <section className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
                <div className="px-6 py-4 flex items-center justify-between border-b border-slate-100 bg-white">
                    <div className="flex items-center gap-2.5">
                        <h3 className="text-base font-black text-slate-900 tracking-tight">Calls</h3>
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-100">
                            {rows.length} records
                        </span>
                    </div>

                    <button
                        aria-label="Refresh traces"
                        title="Refresh traces"
                        onClick={() => load(page)}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
                    >
                        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-blue-600' : ''}`} />
                    </button>
                </div>

                {loading ? (
                    <div className="py-16 text-center text-slate-500 text-xs font-medium flex flex-col items-center justify-center gap-2">
                        <RefreshCw className="w-5 h-5 animate-spin text-blue-600" />
                        <span>Loading calls…</span>
                    </div>
                ) : !rows.length ? (
                    <div className="py-16 text-center text-slate-500 text-xs font-medium">
                        No call events match this time window.
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full text-left text-xs whitespace-nowrap">
                            <thead className="bg-slate-50/80 text-slate-400 uppercase tracking-wider font-black text-[11px] border-b border-slate-100">
                                <tr>
                                    <th className="py-3.5 px-6">Started</th>
                                    <th className="py-3.5 px-4">Customer</th>
                                    <th className="py-3.5 px-4">Direction</th>
                                    <th className="py-3.5 px-6">Caller → Callee</th>
                                    <th className="py-3.5 px-4">CDR Status</th>
                                    <th className="py-3.5 px-6 text-right">Trace</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {rows.map((row) => {
                                    const isOutbound = String(row.direction).toUpperCase() === 'OUTBOUND';
                                    const isCompleted = String(row.cdr_export_status).toUpperCase() === 'COMPLETED';
                                    const isFailed = String(row.cdr_export_status).toUpperCase().includes('FAIL');

                                    return (
                                        <tr
                                            key={row.session_uuid || row.call_id || Math.random()}
                                            className={`hover:bg-slate-50/60 transition-colors ${
                                                isOutbound ? 'border-l-4 border-l-emerald-500' : 'border-l-4 border-l-blue-500'
                                            }`}
                                        >
                                            {/* Started */}
                                            <td className="py-3.5 px-6">
                                                <div className="font-semibold text-slate-900 text-xs">
                                                    {time(row.started_at || row.first_leg_received_at)}
                                                </div>
                                                <div
                                                    className="text-[10px] font-mono text-slate-400 tracking-tight mt-0.5 max-w-[220px] truncate"
                                                    title={row.session_uuid || row.call_id}
                                                >
                                                    {row.session_uuid || row.call_id || '—'}
                                                </div>
                                            </td>

                                            {/* Customer */}
                                            <td className="py-3.5 px-4 font-mono font-bold text-slate-700">
                                                {row.customer_id ? (
                                                    <span className="bg-slate-100/80 px-2 py-0.5 rounded border border-slate-200/60 text-xs">
                                                        {row.customer_id}
                                                    </span>
                                                ) : (
                                                    <span className="text-slate-400">—</span>
                                                )}
                                            </td>

                                            {/* Direction */}
                                            <td className="py-3.5 px-4">
                                                {isOutbound ? (
                                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                                                        <ArrowUpRight className="w-3 h-3" />
                                                        OUTBOUND
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200/60">
                                                        <ArrowDownLeft className="w-3 h-3" />
                                                        INBOUND
                                                    </span>
                                                )}
                                            </td>

                                            {/* Caller -> Callee */}
                                            <td className="py-3.5 px-6 font-mono font-bold text-xs text-slate-900">
                                                <span>{row.caller_number || '—'}</span>
                                                <span className="text-slate-400 mx-2">→</span>
                                                <span className="text-blue-700">{row.destination_number || '—'}</span>
                                            </td>

                                            {/* CDR Status */}
                                            <td className="py-3.5 px-4">
                                                {isCompleted ? (
                                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                                                        COMPLETED
                                                    </span>
                                                ) : isFailed ? (
                                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-red-50 text-red-700 border border-red-200/60">
                                                        {row.cdr_export_status || 'FAILED'}
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-slate-100 text-slate-700 border border-slate-200/60">
                                                        {row.cdr_export_status || 'UNKNOWN'}
                                                    </span>
                                                )}
                                            </td>

                                            {/* Trace */}
                                            <td className="py-3.5 px-6 text-right">
                                                {row.traceAvailable ? (
                                                    <button
                                                        onClick={() => setSelected(row)}
                                                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300 shadow-2xs transition active:scale-95 cursor-pointer"
                                                    >
                                                        <span>Open trace</span>
                                                        <ExternalLink className="w-3 h-3 text-slate-400" />
                                                    </button>
                                                ) : (
                                                    <span className="text-xs text-slate-400 font-medium">No Call-ID</span>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Pagination Footer */}
                <div className="px-6 py-3.5 flex items-center justify-between border-t border-slate-100 bg-slate-50/50">
                    <span className="text-xs font-bold text-slate-500">Page {page}</span>
                    <div className="flex items-center gap-2">
                        <button
                            disabled={page <= 1 || loading}
                            onClick={() => load(page - 1)}
                            className="px-3 py-1.5 rounded-lg text-xs font-bold bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 disabled:opacity-40 shadow-2xs transition cursor-pointer"
                        >
                            Previous
                        </button>
                        <button
                            disabled={!hasMore || loading}
                            onClick={() => load(page + 1)}
                            className="px-3 py-1.5 rounded-lg text-xs font-bold bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 disabled:opacity-40 shadow-2xs transition cursor-pointer"
                        >
                            Next
                        </button>
                    </div>
                </div>
            </section>

            {selected && <SipTraceDetail row={selected} endpoint={endpoint} onClose={() => setSelected(null)} />}
        </div>
    );
}
