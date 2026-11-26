import { useEffect, useState } from 'react';
import { Download, Mail, Trash2, Headphones, Play, Pause, RefreshCw, Volume2, Bell, CheckCircle2, AlertCircle } from 'lucide-react';
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
  const [loading, setLoading] = useState(true);
  const [library, setLibrary] = useState([]);

  const refresh = async () => {
    try {
      const capRes = await api.get(`${base}/capabilities`);
      const cap = capRes.data || { enabled: true };
      setCapabilities(cap);
      
      const [boxRes, messageRes, libraryRes] = await Promise.allSettled([
        api.get(`${base}/boxes`),
        api.get(`${base}/messages`, { params: { ...(boxId ? { boxId } : {}), page } }),
        api.get('/telecom/audio/list'),
      ]);
      
      if (boxRes.status === 'fulfilled') setBoxes(boxRes.value.data || []);
      if (messageRes.status === 'fulfilled') {
        setMessages(messageRes.value.data?.items || []);
        setTotalMessages(messageRes.value.data?.total || 0);
      }
      if (libraryRes.status === 'fulfilled') setLibrary(libraryRes.value.data?.files || []);
    } catch (e) {
      setError(e.response?.data?.message || 'Could not load voicemail details');
      // If error occurs, still allow capabilities fallback so page does not hang on loading
      setCapabilities(prev => prev || { enabled: true, boxLimit: 10, messageLimit: 20 });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
    const timer = window.setInterval(() => {
      refresh().catch(() => {});
    }, 30000);
    return () => window.clearInterval(timer);
  }, [boxId, page]);

  useEffect(() => () => { if (audioUrl) URL.revokeObjectURL(audioUrl); }, [audioUrl]);

  const action = async (fn) => {
    setBusy(true); 
    setError('');
    try { 
      await fn(); 
      await refresh(); 
    } catch (e) { 
      setError(e.response?.data?.message || e.message); 
    } finally { 
      setBusy(false); 
    }
  };

  const play = async (id) => {
    setError('');
    try {
      if (playingId === id) {
        setPlayingId('');
        return;
      }
      const response = await api.get(`${base}/messages/${id}/audio`, { responseType: 'blob' });
      setAudioUrl(URL.createObjectURL(response.data)); 
      setPlayingId(id);
      await api.patch(`${base}/messages/${id}/read`, { read: true });
      setMessages(current => current.map(m => m.id === id ? { ...m, readAt: new Date().toISOString() } : m));
    } catch (e) { 
      setError(e.response?.data?.message || 'Could not play message'); 
    }
  };

  const previewGreeting = async (id) => {
    try {
      const response = await api.get(`${base}/boxes/${id}/greeting`, { responseType: 'blob' });
      setAudioUrl(URL.createObjectURL(response.data)); 
      setPlayingId(`greeting-${id}`);
    } catch (e) { 
      setError(e.response?.data?.message || 'Could not play greeting'); 
    }
  };

  const download = async (id) => {
    try {
      const response = await api.get(`${base}/messages/${id}/download`, { responseType: 'blob' });
      const url = URL.createObjectURL(response.data);
      const link = document.createElement('a'); 
      link.href = url; 
      link.download = `voicemail-${id}.wav`; 
      link.click();
      URL.revokeObjectURL(url);
    } catch (e) { 
      setError(e.response?.data?.message || 'Could not download message'); 
    }
  };

  if (loading && !capabilities) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] p-8 text-center animate-in fade-in">
        <RefreshCw className="h-8 w-8 text-teal-600 animate-spin mb-3" />
        <p className="text-sm font-bold text-slate-700 dark:text-slate-300">Loading voicemail console…</p>
      </div>
    );
  }

  if (capabilities && !capabilities.enabled) {
    return (
      <div className="max-w-4xl mx-auto p-8 animate-in fade-in">
        <div className="rounded-3xl border border-amber-200/80 dark:border-amber-900/40 bg-amber-50/70 dark:bg-amber-950/20 p-8 text-center space-y-3">
          <div className="h-12 w-12 rounded-2xl bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 mx-auto flex items-center justify-center">
            <AlertCircle size={24} />
          </div>
          <h2 className="text-xl font-extrabold text-slate-900 dark:text-white">Voicemail Feature Inactive</h2>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 max-w-lg mx-auto">
            Voicemail service is currently not enabled for this organization. Please contact your platform administrator or upgrade your subscription package.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full pb-16 space-y-7 animate-in fade-in duration-300 max-w-7xl mx-auto">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-teal-700 via-teal-600 to-emerald-600 p-8 text-white shadow-xl shadow-teal-900/15">
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-80 h-80 rounded-full bg-white/10 blur-2xl pointer-events-none" />
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
          <div className="space-y-1.5 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 backdrop-blur-md text-xs font-semibold tracking-wide border border-white/20">
              <Headphones size={14} className="text-teal-200" />
              <span>FreeSWITCH Voicemail Telephony</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Voicemail & Mailboxes
            </h1>
            <p className="text-teal-100 text-xs sm:text-sm font-medium">
              Manage organization mailboxes, configure custom audio greetings from your Audio Library, and listen to recordings.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button 
              onClick={() => refresh()} 
              disabled={busy}
              className="inline-flex justify-center items-center gap-2 rounded-2xl bg-white hover:bg-teal-50 px-5 py-3 text-xs font-bold text-teal-800 shadow-lg shadow-black/10 transition-all active:scale-95 cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${busy ? 'animate-spin text-teal-600' : 'text-teal-700'}`} />
              <span>Refresh Mailboxes</span>
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div role="alert" className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/40 text-xs font-bold text-rose-700 dark:text-rose-400">
          {error}
        </div>
      )}

      {/* Mailboxes Section */}
      <section className="bg-white dark:bg-[#0c0e17] rounded-3xl border border-slate-200/80 dark:border-white/10 shadow-xs p-6 sm:p-7 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-white/5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-teal-50 dark:bg-teal-950/40 text-teal-600 dark:text-teal-400 border border-teal-100 dark:border-teal-800/30">
              <Mail className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                Active Mailboxes
                <span className="text-[11px] font-bold text-teal-700 dark:text-teal-300 bg-teal-50 dark:bg-teal-950/40 px-2 py-0.5 rounded-lg border border-teal-200/50 dark:border-teal-800/40 font-mono">
                  {boxes.length}
                </span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Company and extension voicemail endpoints</p>
            </div>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
            Upload custom greetings in the <Link to="/telecom/audio" className="text-teal-600 dark:text-teal-400 font-bold hover:underline">Audio Library</Link>.
          </p>
        </div>

        {boxes.length === 0 ? (
          <div className="text-center py-12">
            <Mail className="h-10 w-10 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
            <p className="text-sm font-bold text-slate-700 dark:text-slate-300">No mailboxes initialized</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Mailboxes will automatically generate with your company lines and extensions.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {boxes.map(box => (
              <div key={box.id} className="p-5 rounded-2xl bg-slate-50/70 dark:bg-white/[0.02] border border-slate-200/70 dark:border-white/5 flex flex-col lg:flex-row lg:items-center justify-between gap-5 transition-all">
                <div className="space-y-1.5 min-w-[240px]">
                  <div className="flex items-center gap-2.5">
                    <strong className="text-sm font-extrabold text-slate-900 dark:text-white">{box.name}</strong>
                    <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full border ${box.enabled ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/40' : 'bg-slate-100 text-slate-500 border-slate-200 dark:bg-white/5 dark:text-slate-400 dark:border-white/10'}`}>
                      {box.enabled ? 'Enabled' : 'Disabled'}
                    </span>
                    {box.extension && (
                      <span className="text-xs font-mono font-bold text-slate-500 dark:text-slate-400 bg-white dark:bg-white/5 px-2 py-0.5 rounded-lg border border-slate-200 dark:border-white/10">
                        Ext {box.extension.extensionNumber}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                    {box.noAnswerSeconds}s no-answer timeout
                  </p>
                  <p className="text-xs font-medium text-slate-600 dark:text-slate-300">
                    Greeting: <span className={box.greetingPath ? 'text-teal-600 dark:text-teal-400 font-bold' : 'text-slate-400'}>
                      {box.greetingPath ? (box.greetingAudioName || 'Custom Greeting') : 'System Default'}
                    </span>
                  </p>
                </div>

                {/* Configurations */}
                <div className="flex flex-wrap items-center gap-3">
                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Greeting Audio</label>
                    <select 
                      className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#121520] text-xs font-semibold text-slate-900 dark:text-white focus:ring-2 focus:ring-teal-500 outline-none max-w-[200px]" 
                      value={box.greetingPath && library.some(file => file.id === box.greetingAudioFileId) ? box.greetingAudioFileId : ''} 
                      disabled={busy || !library.length}
                      onChange={e => { const audioFileId = e.target.value; if (audioFileId) action(() => api.put(`${base}/boxes/${box.id}/greeting/library`, { audioFileId })); }}
                    >
                      <option value="">{library.length ? (box.greetingPath ? 'Change greeting…' : 'Choose greeting…') : 'No audio files'}</option>
                      {library.map(file => <option key={file.id} value={file.id}>{file.name || file.originalName}</option>)}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Timeout (s)</label>
                    <input 
                      type="number" 
                      min="10" 
                      max="120" 
                      defaultValue={box.noAnswerSeconds} 
                      key={`${box.id}-${box.noAnswerSeconds}`}
                      className="w-20 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#121520] font-mono text-xs font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-teal-500 outline-none" 
                      disabled={busy} 
                      onBlur={e => { const value = Number(e.target.value); if (value !== box.noAnswerSeconds) action(() => api.patch(`${base}/boxes/${box.id}`, { noAnswerSeconds: value })); }} 
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Email Alerts</label>
                    <input 
                      type="email" 
                      defaultValue={box.notifyEmail || ''} 
                      key={`${box.id}-${box.notifyEmail || ''}`}
                      placeholder="alerts@company.com" 
                      className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#121520] text-xs font-medium text-slate-900 dark:text-white focus:ring-2 focus:ring-teal-500 outline-none w-44" 
                      disabled={busy}
                      onBlur={e => { if (e.target.value !== (box.notifyEmail || '')) action(() => api.patch(`${base}/boxes/${box.id}`, { notifyEmail: e.target.value || null, notifyByEmail: !!e.target.value })); }} 
                    />
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 pt-2 lg:pt-0">
                  <button 
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border ${box.enabled ? 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/30 dark:text-rose-300 dark:border-rose-900/40 hover:bg-rose-100' : 'bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-950/30 dark:text-teal-300 dark:border-teal-900/40 hover:bg-teal-100'}`} 
                    disabled={busy} 
                    onClick={() => action(() => api.patch(`${base}/boxes/${box.id}`, { enabled: !box.enabled }))}
                  >
                    {box.enabled ? 'Disable' : 'Enable'}
                  </button>

                  {box.greetingPath && (
                    <button 
                      className="px-3 py-1.5 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 hover:bg-slate-50 transition-all cursor-pointer" 
                      disabled={busy} 
                      onClick={() => action(() => api.delete(`${base}/boxes/${box.id}/greeting`))}
                    >
                      Reset
                    </button>
                  )}

                  {box.greetingPath && (
                    <button 
                      className="px-3 py-1.5 rounded-xl text-xs font-bold text-teal-700 dark:text-teal-300 bg-teal-50 dark:bg-teal-950/40 border border-teal-200/80 dark:border-teal-800/40 hover:bg-teal-100 transition-all cursor-pointer" 
                      onClick={() => previewGreeting(box.id)}
                    >
                      Preview
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Messages Inbox Section */}
      <section className="bg-white dark:bg-[#0c0e17] rounded-3xl border border-slate-200/80 dark:border-white/10 shadow-xs p-6 sm:p-7 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-white/5">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-teal-50 dark:bg-teal-950/40 text-teal-600 dark:text-teal-400 border border-teal-100 dark:border-teal-800/30">
              <Volume2 className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                Voicemail Inbox
                <span className="text-[11px] font-bold text-teal-700 dark:text-teal-300 bg-teal-50 dark:bg-teal-950/40 px-2 py-0.5 rounded-lg border border-teal-200/50 dark:border-teal-800/40 font-mono">
                  {totalMessages}
                </span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Caller recordings and audio transcripts</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <select 
              className="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#121520] text-xs font-semibold text-slate-900 dark:text-white focus:ring-2 focus:ring-teal-500 outline-none" 
              value={boxId} 
              onChange={e => { setBoxId(e.target.value); setPage(1); }}
            >
              <option value="">All Mailboxes</option>
              {boxes.map(box => <option key={box.id} value={box.id}>{box.name}</option>)}
            </select>
          </div>
        </div>

        {messages.length === 0 ? (
          <div className="text-center py-12">
            <Headphones className="h-10 w-10 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
            <p className="text-sm font-bold text-slate-700 dark:text-slate-300">No voicemail messages</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Inbound callers leaving recordings will appear here automatically.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-white/5">
            {messages.map(message => (
              <div key={message.id} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <strong className="text-sm font-bold text-slate-900 dark:text-white font-mono">{message.callerId || 'Unknown caller'}</strong>
                    <span className="text-xs text-slate-400">→</span>
                    <span className="text-xs font-bold text-teal-600 dark:text-teal-400">{message.box?.name}</span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${message.readAt ? 'bg-slate-100 dark:bg-white/5 text-slate-500' : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 font-extrabold'}`}>
                      {message.readAt ? 'Read' : 'New'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                    {new Date(message.createdAt).toLocaleString()} · {Math.round((message.durationMs || 0) / 1000)}s
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button 
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-300 text-xs font-bold hover:bg-teal-100 transition-all cursor-pointer border border-teal-200/60 dark:border-teal-800/40" 
                    onClick={() => play(message.id)}
                  >
                    {playingId === message.id ? <Pause size={14} /> : <Play size={14} />}
                    <span>{playingId === message.id ? 'Pause' : 'Listen'}</span>
                  </button>

                  <button 
                    className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10 transition-all cursor-pointer" 
                    title="Download WAV" 
                    onClick={() => download(message.id)}
                  >
                    <Download size={15} />
                  </button>

                  <button 
                    className="px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-white/5 transition-all cursor-pointer" 
                    onClick={() => action(() => api.patch(`${base}/messages/${message.id}/read`, { read: !message.readAt }))}
                  >
                    {message.readAt ? 'Mark Unread' : 'Mark Read'}
                  </button>

                  <button 
                    className="p-2 rounded-xl text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-all cursor-pointer" 
                    title="Delete message" 
                    onClick={() => { if (window.confirm('Delete this voicemail?')) action(() => api.delete(`${base}/messages/${message.id}`)); }}
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {totalMessages > 25 && (
          <div className="flex justify-end items-center gap-3 text-xs pt-3 border-t border-slate-100 dark:border-white/5">
            <button className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-white/10 disabled:opacity-40 font-bold" disabled={page === 1} onClick={() => setPage(p => p - 1)}>Previous</button>
            <span className="font-mono text-slate-500">Page {page} of {Math.ceil(totalMessages / 25)}</span>
            <button className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-white/10 disabled:opacity-40 font-bold" disabled={page * 25 >= totalMessages} onClick={() => setPage(p => p + 1)}>Next</button>
          </div>
        )}

        {playingId && audioUrl && (
          <div className="p-4 rounded-2xl bg-teal-50/70 dark:bg-teal-950/30 border border-teal-200/80 dark:border-teal-800/40 space-y-2 mt-4 animate-in fade-in">
            <div className="flex items-center justify-between text-xs font-bold text-teal-800 dark:text-teal-200">
              <span className="flex items-center gap-1.5"><Volume2 size={15} /> Now Playing</span>
              <button onClick={() => { setPlayingId(''); setAudioUrl(''); }} className="text-slate-400 hover:text-slate-600 text-xs">Close Player</button>
            </div>
            <audio controls autoPlay src={audioUrl} className="w-full h-9 rounded-lg" />
          </div>
        )}
      </section>
    </div>
  );
}
