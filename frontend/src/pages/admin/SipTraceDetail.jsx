import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Activity, ArrowRight, Braces, Clock3, FileJson, RadioTower, RefreshCw, X } from 'lucide-react';
import api from '../../services/api';
import './SipTraceDetail.css';

const displayTime = (value) => value ? new Date(value).toLocaleString() : '—';
const preciseTime = (value) => value ? new Date(value).toLocaleTimeString(undefined, {
    hour: '2-digit', minute: '2-digit', second: '2-digit', fractionalSecondDigits: 3,
}) : '—';

function methodKind(message) {
    const code = message.responseCode ?? (/^[1-6]\d\d$/.test(message.method) ? Number(message.method) : null);
    if (code >= 400) return 'error';
    if (code !== null) return 'response';
    return ['BYE', 'CANCEL'].includes(message.method) ? 'terminate' : 'request';
}

function MethodBadge({ message }) {
    return <span className={`pbx-sip-method pbx-sip-method--${methodKind(message)}`}>
        {message.method}{message.hasSdp && <small>SDP</small>}
    </span>;
}

function SipLadder({ participants, messages, selected, onSelect, markerPrefix }) {
    const left = 112;
    const column = 210;
    const top = 88;
    const rowHeight = 58;
    const width = Math.max(760, left + Math.max(participants.length - 1, 1) * column + 130);
    const height = top + messages.length * rowHeight + 30;
    const markers = { request: `${markerPrefix}-request`, terminate: `${markerPrefix}-terminate`, response: `${markerPrefix}-response`, error: `${markerPrefix}-error` };

    return <div className="pbx-sip-ladder-scroll" aria-label="SIP signaling ladder">
        <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} role="group" aria-label={`${messages.length} SIP messages between ${participants.length} endpoints`}>
            <defs>
                <marker id={markers.request} markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="#7c3aed" /></marker>
                <marker id={markers.terminate} markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="#b45309" /></marker>
                <marker id={markers.response} markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="#0891b2" /></marker>
                <marker id={markers.error} markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="#e11d48" /></marker>
            </defs>
            {participants.map((participant, index) => {
                const x = left + index * column;
                return <g key={`${participant}-${index}`}>
                    <text x={x} y="24" textAnchor="middle" className="pbx-sip-ladder-party">{participant}</text>
                    <text x={x} y="43" textAnchor="middle" className="pbx-sip-ladder-party-sub">endpoint {index + 1}</text>
                    <line x1={x} y1="55" x2={x} y2={height - 10} className="pbx-sip-ladder-life" />
                </g>;
            })}
            {messages.map((message, index) => {
                const source = Math.max(0, message.fromIndex);
                const target = Math.max(0, message.toIndex);
                const x1 = left + source * column;
                const x2 = left + target * column + (source === target ? 52 : 0);
                const y = top + index * rowHeight;
                const kind = methodKind(message);
                const labelX = (x1 + x2) / 2;
                return <g key={`${message.id}-${index}`} className={`pbx-sip-ladder-message pbx-sip-ladder-message--${kind}${selected === message ? ' is-selected' : ''}`}
                    role="button" tabIndex={0} aria-label={`${(message.elapsedMs / 1000).toFixed(3)} seconds: ${message.method} from ${message.src} to ${message.dst}`}
                    onClick={() => onSelect(message)} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onSelect(message); } }}>
                    <rect x="2" y={y - 25} width={width - 4} height="50" rx="5" className="pbx-sip-ladder-hit" />
                    <text x="9" y={y - 5} className="pbx-sip-ladder-time">{(message.elapsedMs / 1000).toFixed(3)}s</text>
                    <line x1={x1} y1={y} x2={x2} y2={y} className="pbx-sip-ladder-arrow" markerEnd={`url(#${markers[kind]})`} />
                    <text x={labelX} y={y - 8} textAnchor="middle" className="pbx-sip-ladder-method">{message.method}{message.hasSdp ? ' (SDP)' : ''}</text>
                    <text x={labelX} y={y + 17} textAnchor="middle" className="pbx-sip-ladder-cseq">{message.cseqMethod ? `CSeq ${message.cseqMethod}` : message.callId}</text>
                </g>;
            })}
        </svg>
    </div>;
}

function RawMessage({ message, raw, loading, error, retry }) {
    return <aside className="pbx-sip-raw-panel">
        <div className="pbx-sip-raw-heading"><span><Braces size={17} /> Redacted SIP message</span>{message && <MethodBadge message={message} />}</div>
        {message ? <>
            <dl className="pbx-sip-raw-meta">
                <div><dt>Source</dt><dd>{message.src}</dd></div>
                <div><dt>Destination</dt><dd>{message.dst}</dd></div>
                <div><dt>Call-ID</dt><dd>{message.callId}</dd></div>
                <div><dt>Captured</dt><dd>{displayTime(message.timestamp)}</dd></div>
            </dl>
            {loading ? <p className="pbx-sip-detail-notice">Loading selected packet…</p>
                : error ? <div className="pbx-sip-detail-notice" role="alert"><p>{error}</p><button type="button" onClick={retry}>Retry</button></div>
                    : raw ? <pre>{raw.raw || 'Capture did not include a raw payload.'}</pre>
                        : <p className="pbx-sip-detail-notice">{message.rawAvailable ? 'Select a message to load its redacted SIP body.' : 'This capture does not contain a raw SIP body.'}</p>}
        </> : <p className="pbx-sip-detail-notice">Select an arrow or a message to inspect its redacted SIP headers and SDP.</p>}
    </aside>;
}

export default function SipTraceDetail({ row, endpoint, onClose }) {
    const [flow, setFlow] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [tab, setTab] = useState('trace');
    const [selectedMessage, setSelectedMessage] = useState(null);
    const [raw, setRaw] = useState(null);
    const [rawLoading, setRawLoading] = useState(false);
    const [rawError, setRawError] = useState('');
    const rawRequest = useRef(0);
    const closeButton = useRef(null);
    const dialog = useRef(null);
    const markerPrefix = useId().replace(/:/g, '');

    const load = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            const result = await api.get(`${endpoint}/${encodeURIComponent(row.session_uuid)}`);
            setFlow(result.data);
        } catch (err) {
            setError(err.response?.data?.message || 'Unable to fetch this trace from Homer.');
        } finally { setLoading(false); }
    }, [endpoint, row.session_uuid]);

    useEffect(() => { load(); }, [load]);
    useEffect(() => {
        const previousFocus = document.activeElement;
        closeButton.current?.focus();
        const onKeyDown = (event) => {
            if (event.key === 'Escape') { onClose(); return; }
            if (event.key !== 'Tab') return;
            const focusable = [...dialog.current.querySelectorAll('button:not([disabled]), [tabindex="0"]')];
            if (!focusable.length) return;
            const first = focusable[0];
            const last = focusable[focusable.length - 1];
            if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
            else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
        };
        window.addEventListener('keydown', onKeyDown);
        return () => { window.removeEventListener('keydown', onKeyDown); previousFocus?.focus?.(); };
    }, [onClose]);

    const selectMessage = async (message) => {
        const requestId = ++rawRequest.current;
        setSelectedMessage(message);
        setRaw(null);
        setRawError('');
        if (!message.rawAvailable) { setRawLoading(false); return; }
        setRawLoading(true);
        try {
            const result = await api.get(`${endpoint}/${encodeURIComponent(row.session_uuid)}/messages/${encodeURIComponent(message.id)}`);
            if (rawRequest.current === requestId) setRaw(result.data);
        } catch (err) {
            if (rawRequest.current === requestId) setRawError(err.response?.data?.message || 'Unable to load this SIP message.');
        } finally {
            if (rawRequest.current === requestId) setRawLoading(false);
        }
    };

    const messages = flow?.messages || [];
    const participants = flow?.participants || [];
    const span = messages.length > 1 ? (messages[messages.length - 1].elapsedMs / 1000).toFixed(3) : '0.000';

    return createPortal(<div ref={dialog} className="pbx-sip-detail-layer" role="dialog" aria-modal="true" aria-label={`SIP trace ${row.session_uuid}`}>
        <div className="pbx-sip-detail-shell">
            <header className="pbx-sip-detail-header">
                <div><p>MERGED CALL DETAIL</p><h2>SIP signaling trace</h2><span>{row.session_uuid}</span></div>
                <button ref={closeButton} type="button" onClick={onClose} aria-label="Close SIP trace"><X size={20} /></button>
            </header>
            {loading ? <p className="pbx-sip-detail-status">Loading merged call flow…</p>
                : error ? <div className="pbx-sip-detail-status" role="alert"><p>{error}</p><button type="button" onClick={load}><RefreshCw size={16} /> Retry</button></div>
                    : flow && <>
                        <div className="pbx-sip-summary">
                            <div><Clock3 size={21} /><span>Signaling span<strong>{span}s</strong></span></div>
                            <div><ArrowRight size={21} /><span>Parties<strong>{row.caller_number || '—'} → {row.destination_number || '—'}</strong></span></div>
                            <div><Activity size={21} /><span>Messages<strong>{messages.length}</strong></span></div>
                            <div><RadioTower size={21} /><span>Endpoints<strong>{participants.length}</strong></span></div>
                        </div>
                        <div className="pbx-sip-tabs" role="tablist" aria-label="SIP trace views">
                            <button type="button" role="tab" aria-selected={tab === 'trace'} onClick={() => setTab('trace')}><RadioTower size={17} /> SIP Trace</button>
                            <button type="button" role="tab" aria-selected={tab === 'raw'} onClick={() => setTab('raw')}><FileJson size={17} /> Raw Data</button>
                        </div>
                        <div className="pbx-sip-detail-body" role="tabpanel">
                            {!messages.length ? <p className="pbx-sip-detail-status">No SIP packets were found for this call’s recorded Call-IDs. Check Homer capture, correlation, and retention.</p>
                                : tab === 'trace' ? <div className="pbx-sip-inspector">
                                    <SipLadder participants={participants} messages={messages} selected={selectedMessage} onSelect={selectMessage} markerPrefix={markerPrefix} />
                                    <RawMessage message={selectedMessage} raw={raw} loading={rawLoading} error={rawError} retry={() => selectMessage(selectedMessage)} />
                                </div> : <div className="pbx-sip-raw-layout">
                                    <div className="pbx-sip-message-list" aria-label="SIP messages">{messages.map((message, index) => <button key={`${message.id}-${index}`} type="button" className={selectedMessage === message ? 'is-selected' : ''} onClick={() => selectMessage(message)}>
                                        <MethodBadge message={message} /><time>{preciseTime(message.timestamp)}</time><small>{message.src} → {message.dst}</small>
                                    </button>)}</div>
                                    <RawMessage message={selectedMessage} raw={raw} loading={rawLoading} error={rawError} retry={() => selectMessage(selectedMessage)} />
                                </div>}
                        </div>
                    </>}
        </div>
    </div>, document.body);
}
