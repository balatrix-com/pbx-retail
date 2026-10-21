import { useEffect, useState } from 'react';
import { ArrowLeft, RefreshCw, Search, ShieldAlert } from 'lucide-react';
import api from '../../services/api';

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
    const [flow, setFlow] = useState(null);
    const [raw, setRaw] = useState(null);
    const [loading, setLoading] = useState(false);
    const [flowLoading, setFlowLoading] = useState(false);
    const [error, setError] = useState('');
    const endpoint = tenantMode ? '/tenant/sip-traces' : '/sip-traces';

    const load = async (nextPage = page) => {
        setLoading(true);
        setError('');
        try {
            const params = tenantMode
                ? { search: search.trim(), page: nextPage, limit: 25 }
                : { from: new Date(from).toISOString(), to: new Date(to).toISOString(),
                    customerId: customerId.trim(), search: search.trim(), page: nextPage, limit: 25 };
            const result = await api.get(endpoint, { params });
            setRows(result.data.data);
            setHasMore(result.data.hasMore);
            setPage(nextPage);
        } catch (err) {
            setError(err.response?.data?.message || 'Unable to load SIP traces.');
        } finally { setLoading(false); }
    };

    useEffect(() => { load(1); }, []); // Initial bounded history query only.

    const open = async (row) => {
        setSelected(row);
        setFlow(null);
        setRaw(null);
        setFlowLoading(true);
        setError('');
        try {
            const result = await api.get(`${endpoint}/${encodeURIComponent(row.session_uuid)}`);
            setFlow(result.data);
        } catch (err) {
            setError(err.response?.data?.message || 'Unable to fetch this trace from Homer.');
        } finally { setFlowLoading(false); }
    };

    const showRaw = async (message) => {
        setRaw({ loading: true });
        try {
            const result = await api.get(`${endpoint}/${encodeURIComponent(selected.session_uuid)}/messages/${encodeURIComponent(message.id)}`);
            setRaw(result.data);
        } catch (err) {
            setRaw({ error: err.response?.data?.message || 'Unable to load this message.' });
        }
    };

    const time = (value) => value ? new Date(value).toLocaleString() : '—';

    return <div className="max-w-7xl mx-auto p-4 sm:p-6 space-y-5">
        <div>
            <h1 className="text-2xl font-bold text-slate-900">SIP traces</h1>
            <p className="text-sm text-slate-600 mt-1">{tenantMode
                ? 'Your latest 100 completed calls. When a newer call arrives, the oldest drops out of this view.'
                : 'Super Admin diagnostics · Call history appears after FreeSWITCH sends its CDR.'} Raw SIP is fetched from Homer on demand.</p>
        </div>
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 flex gap-2">
            <ShieldAlert className="w-5 h-5 shrink-0" /> SIP signaling contains sensitive data. Authentication headers are redacted; Homer retention or packet loss may leave a trace incomplete.
        </div>
        <form onSubmit={(event) => { event.preventDefault(); load(1); }} className="bg-white border border-slate-200 rounded-xl p-4 grid gap-3 md:grid-cols-5 items-end">
            {!tenantMode && <><label className="text-sm font-medium text-slate-700">From<input aria-label="From" type="datetime-local" required value={from} onChange={e => setFrom(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 p-2" /></label>
            <label className="text-sm font-medium text-slate-700">To<input aria-label="To" type="datetime-local" required value={to} onChange={e => setTo(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 p-2" /></label>
            <label className="text-sm font-medium text-slate-700">Customer ID<input value={customerId} onChange={e => setCustomerId(e.target.value)} placeholder="U1001" className="mt-1 w-full rounded-lg border border-slate-300 p-2" /></label></>}
            <label className="text-sm font-medium text-slate-700">Number / Call-ID<input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search" className="mt-1 w-full rounded-lg border border-slate-300 p-2" /></label>
            <button type="submit" disabled={loading} className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg px-4 py-2 flex items-center justify-center gap-2 disabled:opacity-50"><Search className="w-4 h-4" />Search</button>
        </form>
        {error && <div role="alert" className="rounded-lg bg-red-50 text-red-800 p-3">{error}</div>}
        {selected ? <section className="bg-white border border-slate-200 rounded-xl p-4 space-y-4">
            <button onClick={() => { setSelected(null); setFlow(null); setRaw(null); }} className="text-indigo-700 hover:underline flex items-center gap-2"><ArrowLeft className="w-4 h-4" />Back to calls</button>
            <div><h2 className="text-lg font-semibold">{selected.caller_number || 'Unknown'} → {selected.destination_number || 'Unknown'}</h2><p className="text-sm text-slate-600">{selected.customer_id || 'Unassigned'} · {selected.direction || 'Unknown'} · {selected.session_uuid}</p></div>
            {flowLoading ? <p>Loading Homer messages…</p> : flow && <>
                {!flow.messages.length && <p className="text-amber-800 bg-amber-50 rounded-lg p-3">No SIP packets found for the recorded Call-IDs. Check Homer capture, correlation and retention.</p>}
                {!!flow.messages.length && <div className="overflow-x-auto"><table className="min-w-full text-sm"><thead><tr className="border-b text-left text-slate-600"><th className="p-2">Time</th><th className="p-2">Leg / Call-ID</th><th className="p-2">From</th><th className="p-2">SIP</th><th className="p-2">To</th><th className="p-2">Message</th></tr></thead><tbody>{flow.messages.map((message, index) => <tr key={`${message.id}-${index}`} className="border-b hover:bg-slate-50"><td className="p-2 whitespace-nowrap">{time(message.timestamp)}</td><td className="p-2 font-mono text-xs max-w-32 truncate" title={message.callId}>{message.callId}</td><td className="p-2 font-mono text-xs">{message.src}</td><td className="p-2 font-semibold">→ {message.method} →</td><td className="p-2 font-mono text-xs">{message.dst}</td><td className="p-2"><button onClick={() => showRaw(message)} disabled={!message.rawAvailable} className="text-indigo-700 hover:underline disabled:text-slate-400">View raw</button></td></tr>)}</tbody></table></div>}
            </>}
            {raw && <div className="border border-slate-200 rounded-lg p-3 bg-slate-50"><h3 className="font-semibold mb-2">Redacted SIP message</h3>{raw.loading ? 'Loading…' : raw.error ? <p role="alert" className="text-red-700">{raw.error}</p> : <pre className="text-xs overflow-auto whitespace-pre-wrap break-all max-h-96">{raw.raw}</pre>}</div>}
        </section> : <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="p-4 flex justify-between items-center"><h2 className="font-semibold">Calls</h2><button aria-label="Refresh traces" title="Refresh" onClick={() => load(page)} className="p-2 text-slate-600 hover:text-indigo-700"><RefreshCw className="w-4 h-4" /></button></div>
            {loading ? <p className="p-5 text-slate-600">Loading calls…</p> : !rows.length ? <p className="p-5 text-slate-600">No call events match this time window.</p> : <div className="overflow-x-auto"><table className="min-w-full text-sm"><thead className="bg-slate-50 text-left text-slate-600"><tr><th className="p-3">Started</th><th className="p-3">Customer</th><th className="p-3">Direction</th><th className="p-3">Caller → Callee</th><th className="p-3">CDR</th><th className="p-3">Trace</th></tr></thead><tbody>{rows.map(row => <tr key={row.session_uuid} className="border-t"><td className="p-3 whitespace-nowrap">{time(row.started_at || row.first_leg_received_at)}</td><td className="p-3">{row.customer_id || '—'}</td><td className="p-3">{row.direction || '—'}</td><td className="p-3">{row.caller_number || '—'} → {row.destination_number || '—'}</td><td className="p-3">{row.cdr_export_status}</td><td className="p-3"><button className="text-indigo-700 hover:underline disabled:text-slate-400" disabled={!row.traceAvailable} onClick={() => open(row)}>{row.traceAvailable ? 'Open trace' : 'No Call-ID'}</button></td></tr>)}</tbody></table></div>}
            <div className="p-3 flex justify-end items-center gap-3 border-t"><button disabled={page <= 1 || loading} onClick={() => load(page - 1)} className="text-indigo-700 disabled:text-slate-400">Previous</button><span>Page {page}</span><button disabled={!hasMore || loading} onClick={() => load(page + 1)} className="text-indigo-700 disabled:text-slate-400">Next</button></div>
        </section>}
    </div>;
}
