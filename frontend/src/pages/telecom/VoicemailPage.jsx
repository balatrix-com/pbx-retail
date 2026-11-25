import { useEffect, useState } from 'react';
import { Download, Mail, Trash2 } from 'lucide-react';
import api from '../../services/api';
import { Link } from 'react-router-dom';

const base = '/telecom/voicemail';

export default function VoicemailPage() {
  const [capabilities, setCapabilities] = useState(null);
  const [boxes, setBoxes] = useState([]);
  const [messages, setMessages] = useState([]);
  const [boxId, setBoxId] = useState('');
  const [page, setPage] = useState(1);
  const [totalMessages, setTotalMessages] = useState(0);
  const [audioUrl, setAudioUrl] = useState('');
  const [playingId, setPlayingId] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [library, setLibrary] = useState([]);

  const refresh = async () => {
    const cap = (await api.get(`${base}/capabilities`)).data;
    setCapabilities(cap);
    if (!cap.enabled) return;
    const [boxRes, messageRes, libraryRes] = await Promise.all([
      api.get(`${base}/boxes`), api.get(`${base}/messages`, { params: { ...(boxId ? { boxId } : {}), page } }),
      api.get('/telecom/audio/list'),
    ]);
    setBoxes(boxRes.data || []);
    setMessages(messageRes.data?.items || []);
    setTotalMessages(messageRes.data?.total || 0);
    setLibrary(libraryRes.data?.files || []);
  };

  useEffect(() => {
    refresh().catch(e => setError(e.response?.data?.message || 'Could not load voicemail'));
    const timer = window.setInterval(() => refresh().catch(() => setCapabilities(current => current ? { ...current, enabled: false } : current)), 30000);
    return () => window.clearInterval(timer);
  }, [boxId, page]);
  useEffect(() => () => { if (audioUrl) URL.revokeObjectURL(audioUrl); }, [audioUrl]);

  const action = async (fn) => {
    setBusy(true); setError('');
    try { await fn(); await refresh(); } catch (e) { setError(e.response?.data?.message || e.message); }
    finally { setBusy(false); }
  };

  const play = async (id) => {
    setError('');
    try {
      const response = await api.get(`${base}/messages/${id}/audio`, { responseType: 'blob' });
      setAudioUrl(URL.createObjectURL(response.data)); setPlayingId(id);
      await api.patch(`${base}/messages/${id}/read`, { read: true });
      setMessages(current => current.map(m => m.id === id ? { ...m, readAt: new Date().toISOString() } : m));
    } catch (e) { setError(e.response?.data?.message || 'Could not play message'); }
  };

  const previewGreeting = async (id) => {
    try {
      const response = await api.get(`${base}/boxes/${id}/greeting`, { responseType: 'blob' });
      setAudioUrl(URL.createObjectURL(response.data)); setPlayingId(`greeting-${id}`);
    } catch (e) { setError(e.response?.data?.message || 'Could not play greeting'); }
  };

  const download = async (id) => {
    try {
      const response = await api.get(`${base}/messages/${id}/download`, { responseType: 'blob' });
      const url = URL.createObjectURL(response.data);
      const link = document.createElement('a'); link.href = url; link.download = `voicemail-${id}.wav`; link.click();
      URL.revokeObjectURL(url);
    } catch (e) { setError(e.response?.data?.message || 'Could not download message'); }
  };

  if (!capabilities) return <div className="p-8">Loading voicemail…</div>;
  if (!capabilities.enabled) return <div className="p-8">Voicemail is unavailable for this tenant.</div>;

  return <div className="p-6 md:p-8 space-y-6 max-w-6xl mx-auto">
    <div><h1 className="text-3xl font-bold text-slate-900 flex items-center gap-2"><Mail /> Voicemail</h1>
      <p className="text-slate-600">Manage mailboxes, choose greetings from your Audio Library, and listen to messages.</p></div>
    {error && <div role="alert" className="rounded border border-red-300 bg-red-50 p-3 text-red-800">{error}</div>}
    <section className="bg-white rounded-xl border p-5 space-y-4">
      <h2 className="text-xl font-semibold">Mailboxes ({boxes.length})</h2>
      <p className="text-sm text-slate-600">The company mailbox is on by default. Extension mailboxes start off; enable them from each extension’s settings. Each mailbox keeps its latest 20 messages.</p>
      <p className="text-sm text-slate-600">Upload a greeting once in <Link to="/telecom/audio" className="text-indigo-700 underline">Audio Library</Link>, then select it for any mailbox. Selecting a file saves a copy of its first 60 seconds; later library changes do not change that greeting.</p>
      <div className="divide-y">{boxes.map(box => <div key={box.id} className="py-3 flex flex-wrap items-center gap-3 justify-between">
        <div><strong>{box.name}</strong> <span className={box.enabled ? 'text-green-700' : 'text-slate-500'}>· {box.enabled ? 'On' : 'Off'}</span> {box.extension && <span className="text-slate-500">· Extension {box.extension.extensionNumber}</span>}
          <p className="text-xs text-slate-500">{box.noAnswerSeconds}s no-answer timeout</p>
          <p className={box.greetingPath ? 'text-sm font-medium text-green-700' : 'text-sm text-slate-600'} aria-live="polite">
            Greeting set: {box.greetingPath ? (box.greetingAudioName || 'Custom greeting (preview it or select its Audio Library source again to show the name)') : 'System default'}
          </p></div>
        <div className="flex flex-wrap gap-2">
          <label className="text-xs">Greeting from Audio Library<select className="block border rounded p-2 max-w-64" value={box.greetingPath && library.some(file => file.id === box.greetingAudioFileId) ? box.greetingAudioFileId : ''} disabled={busy || !library.length}
            onChange={e => { const audioFileId = e.target.value; if (audioFileId) action(() => api.put(`${base}/boxes/${box.id}/greeting/library`, { audioFileId })); }}>
            <option value="">{library.length ? (box.greetingPath ? 'Choose a different greeting…' : 'Choose greeting…') : 'Upload audio in Audio Library first'}</option>
            {library.map(file => <option key={file.id} value={file.id}>{file.name || file.originalName}</option>)}
          </select></label>
          <label className="text-xs">No-answer seconds<input type="number" min="10" max="120" defaultValue={box.noAnswerSeconds} key={`${box.id}-${box.noAnswerSeconds}`}
            className="block border rounded p-2 w-24" disabled={busy} onBlur={e => { const value = Number(e.target.value); if (value !== box.noAnswerSeconds) action(() => api.patch(`${base}/boxes/${box.id}`, { noAnswerSeconds: value })); }} /></label>
          <label className="text-xs">Email notifications<input type="email" defaultValue={box.notifyEmail || ''} key={`${box.id}-${box.notifyEmail || ''}`}
            placeholder="name@example.com" className="block border rounded p-2" disabled={busy}
            onBlur={e => { if (e.target.value !== (box.notifyEmail || '')) action(() => api.patch(`${base}/boxes/${box.id}`, { notifyEmail: e.target.value || null, notifyByEmail: !!e.target.value })); }} /></label>
        </div>
        <div className="flex items-center gap-2">
          <button className="border rounded px-3 py-2" disabled={busy} onClick={() => action(() => api.patch(`${base}/boxes/${box.id}`, { enabled: !box.enabled }))}>
            Turn {box.enabled ? 'off' : 'on'}
          </button>
          {box.greetingPath && <button className="border rounded px-3 py-2" disabled={busy} onClick={() => action(() => api.delete(`${base}/boxes/${box.id}/greeting`))}>Use default</button>}
          {box.greetingPath && <button className="border rounded px-3 py-2" onClick={() => previewGreeting(box.id)}>Preview</button>}
        </div>
      </div>)}</div>
    </section>
    <section className="bg-white rounded-xl border p-5 space-y-4">
      <div className="flex flex-wrap justify-between gap-2"><h2 className="text-xl font-semibold">Inbox</h2><select className="border rounded p-2" value={boxId} onChange={e => { setBoxId(e.target.value); setPage(1); }}><option value="">All mailboxes</option>{boxes.map(box => <option key={box.id} value={box.id}>{box.name}</option>)}</select></div>
      {!messages.length && <p className="text-slate-500">No voicemail messages yet.</p>}
      <div className="divide-y">{messages.map(message => <div key={message.id} className="py-3 flex flex-wrap items-center gap-3 justify-between">
        <div><strong>{message.callerId || 'Unknown caller'}</strong> <span className="text-slate-500">→ {message.box.name}</span>
          <p className="text-sm text-slate-500">{new Date(message.createdAt).toLocaleString()} · {Math.round((message.durationMs || 0) / 1000)}s · {message.readAt ? 'Read' : 'Unread'}</p></div>
        <div className="flex items-center gap-2">
          <button className="border rounded px-3 py-2" onClick={() => play(message.id)}>Listen</button>
          <button className="border rounded px-3 py-2" title="Download WAV" onClick={() => download(message.id)}><Download size={16} /></button>
          <button className="border rounded px-3 py-2" onClick={() => action(() => api.patch(`${base}/messages/${message.id}/read`, { read: !message.readAt }))}>{message.readAt ? 'Mark unread' : 'Mark read'}</button>
          <button className="border rounded px-3 py-2 text-red-700" title="Delete message" onClick={() => { if (window.confirm('Delete this voicemail?')) action(() => api.delete(`${base}/messages/${message.id}`)); }}><Trash2 size={16} /></button>
        </div>
      </div>)}</div>
      {totalMessages > 25 && <div className="flex justify-end items-center gap-3 text-sm">
        <button className="border rounded px-3 py-1 disabled:opacity-50" disabled={page === 1} onClick={() => setPage(p => p - 1)}>Previous</button>
        <span>Page {page} of {Math.ceil(totalMessages / 25)}</span>
        <button className="border rounded px-3 py-1 disabled:opacity-50" disabled={page * 25 >= totalMessages} onClick={() => setPage(p => p + 1)}>Next</button>
      </div>}
      {playingId && audioUrl && <audio controls autoPlay src={audioUrl} className="w-full" />}
    </section>
  </div>;
}
