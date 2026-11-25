import React, { useEffect, useState } from 'react';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { subscriptionService } from '../../services/subscription.service';
import { CreditCard, Plus, RefreshCw, Shield, AlertTriangle, Layers, Phone, Radio, Users } from 'lucide-react';
import CreativeStatCard from '../../components/common/CreativeStatCard';

const date = value => value ? new Date(value).toLocaleString() : '—';
const money = s => `${Number(s.renewal_price || 0).toFixed(2)} ${String(s.currency_snapshot || '').toUpperCase()}`;
const inputClass = 'w-full rounded-xl border border-gray-200 dark:border-white/10 p-2.5 bg-gray-50/50 dark:bg-[#12131a] text-xs sm:text-sm font-medium text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500';
const buttonClass = 'inline-flex items-center justify-center gap-1.5 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#0c0d12] px-3 py-1.5 text-xs font-bold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-white/5 transition-all shadow-2xs active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer';

export default function SubscriptionsPage() {
  const { user } = useAuth();
  const { addToast } = useToast();
  const superAdmin = user?.role === 'SUPER_ADMIN';
  const [tenants, setTenants] = useState([]);
  const [tenantId, setTenantId] = useState(superAdmin ? new URLSearchParams(window.location.search).get('tenantId') || '' : user?.tenantId || '');
  const [subscriptions, setSubscriptions] = useState([]);
  const [plans, setPlans] = useState([]);
  const [selected, setSelected] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [activation, setActivation] = useState(null);
  const [renewing, setRenewing] = useState(null);
  const [moving, setMoving] = useState(null);
  const [target, setTarget] = useState('');
  const [wallet, setWallet] = useState(null);
  const [operationKey, setOperationKey] = useState('');
  const [quote, setQuote] = useState(null);
  const [quoting, setQuoting] = useState(false);

  useEffect(() => {
    setQuote(null);
    if (!activation?.plan_id) return;
    let cancelled = false; setQuoting(true);
    const timer = setTimeout(() => api.post('/subscriptions/quote', { tenantId, plan_id: activation.plan_id, duration_unit: activation.duration_unit, duration_count: activation.duration_count })
      .then(r => { if (!cancelled) setQuote(r.data); }).catch(e => { if (!cancelled) setError(e.response?.data?.message || 'Could not calculate activation price'); })
      .finally(() => { if (!cancelled) setQuoting(false); }), 300);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [activation?.plan_id, activation?.duration_unit, activation?.duration_count, tenantId]);

  useEffect(() => {
    subscriptionService.getPlans().then(setPlans).catch(() => {});
    if (superAdmin) api.get('/tenants', { params: { limit: 1000, status: 'ALL' } }).then(r => setTenants(r.data?.data || r.data?.items || r.data || [])).catch(e => setError(e.response?.data?.message || 'Could not load tenants'));
  }, [superAdmin]);

  async function load() {
    if (!tenantId) { setSubscriptions([]); return; }
    setLoading(true); setError('');
    try {
      const [r, w] = await Promise.all([api.get('/subscriptions', { params: { tenantId } }), superAdmin ? Promise.resolve(null) : api.get('/wallet').catch(() => null)]);
      setSubscriptions(r.data || []); setWallet(w?.data || null);
      setSelected(current => r.data?.find(s => s.id === current?.id) || null);
    } catch (e) { setError(e.response?.data?.message || 'Could not load subscriptions'); }
    finally { setLoading(false); }
  }

  useEffect(() => { setSelected(null); setHistory([]); load(); }, [tenantId]);

  async function execute(path, body, method = 'post') {
    setBusy(true); setError('');
    try { await api[method](path, { ...body, tenantId }); await load(); addToast('success', 'Subscription updated'); return true; }
    catch (e) { setError(e.response?.data?.message || 'Operation failed. You can retry safely.'); return false; }
    finally { setBusy(false); }
  }

  async function details(s) {
    setSelected(s); setHistory([]);
    try { const r = await api.get(`/subscriptions/${s.id}/history`, { params: { tenantId } }); setHistory(r.data); }
    catch (e) { setError(e.response?.data?.message || 'Could not load history'); }
  }

  const active = subscriptions.filter(s => ['active', 'grace'].includes(s.status));
  const summary = resource => ({ total: active.reduce((n, s) => n + Number(s.entitlement_snapshot[resource] || 0), 0), used: active.reduce((n, s) => n + Number(s.usage[resource] || 0), 0) });
  const numbers = summary('numbers'), monitoring = summary('monitoring_extensions');
  const currentPlan = plans.find(p => p.plan_id === activation?.plan_id);
  const customerArchived = tenants.some(t => t.id === tenantId && (t.status === 'ARCHIVED' || t.archiveJob));

  return (
    <div className="w-full pb-16 space-y-7 animate-in fade-in duration-300 max-w-7xl mx-auto">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-teal-700 via-teal-600 to-emerald-600 p-8 text-white shadow-xl shadow-teal-900/15">
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-80 h-80 rounded-full bg-white/10 blur-2xl pointer-events-none" />
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
          <div className="space-y-1.5 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 backdrop-blur-md text-xs font-semibold tracking-wide border border-white/20">
              <Layers size={14} className="text-teal-200" />
              <span>Quota & Provisioning Management</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Tenant Subscriptions & Quota
            </h1>
            <p className="text-teal-100 text-xs sm:text-sm font-medium">
              Manage base plans, capacity addons, duration renewals, and operational telecommunication allotments.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={load}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white/15 hover:bg-white/25 backdrop-blur-md border border-white/20 px-4 py-2.5 text-xs font-bold text-white transition-all shadow-sm active:scale-95 cursor-pointer"
            >
              <RefreshCw size={14} className={`text-teal-200 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
            <button
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white hover:bg-teal-50 px-5 py-2.5 text-xs font-bold text-teal-800 shadow-lg shadow-black/10 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer w-full sm:w-auto"
              disabled={!tenantId || busy || customerArchived}
              onClick={() => { setOperationKey(crypto.randomUUID()); setActivation({ plan_id: '', duration_unit: 'months', duration_count: 1, auto_renew: false, payment_mode: 'wallet' }); }}
            >
              <Plus size={16} className="text-teal-700" />
              <span>Activate a Plan</span>
            </button>
          </div>
        </div>
      </div>

      {customerArchived && (
        <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/40 text-xs font-semibold text-amber-800 dark:text-amber-300">
          This organization is archived. Subscription and financial records are retained; new activation is suspended.
        </div>
      )}

      {superAdmin && (
        <div className="bg-white/95 dark:bg-slate-900/95 p-4 rounded-3xl border border-teal-200/70 dark:border-white/10 shadow-sm backdrop-blur-sm">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <label className="text-xs font-extrabold text-teal-900 dark:text-teal-300 uppercase tracking-wider shrink-0">Selected Tenant Organization:</label>
            <select
              className="w-full sm:max-w-md rounded-xl border border-teal-200/80 dark:border-white/10 bg-teal-50/40 dark:bg-slate-800/50 p-2.5 text-xs font-bold text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500 cursor-pointer"
              value={tenantId}
              onChange={e => setTenantId(e.target.value)}
            >
              <option value="">Select Tenant Organization</option>
              {Array.isArray(tenants) && tenants.map(t => <option key={t.id} value={t.id}>{t.name} ({t.customerCode || t.id})</option>)}
            </select>
          </div>
        </div>
      )}

      {error && (
        <div role="alert" className="rounded-2xl border border-rose-200 dark:border-rose-800/40 bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 p-4 text-xs font-medium flex items-center justify-between">
          <span>{error}</span>
          <button className="font-bold underline cursor-pointer" onClick={load}>Refresh</button>
        </div>
      )}

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <CreativeStatCard
          title="Base Subscription"
          value={active.find(s => s.subscription_type === 'base')?.plan_name || 'No Active Base'}
          subtitle={`Status: ${active.find(s => s.subscription_type === 'base')?.status || 'Inactive'}`}
          icon={Layers}
          color="blue"
          trend="+12%"
          trendUp={true}
        />
        <CreativeStatCard
          title="Allocated Numbers"
          value={`${numbers.used} / ${numbers.total}`}
          subtitle="Phone numbers actively assigned"
          icon={Phone}
          color="purple"
          trend="+8%"
          trendUp={true}
        />
        <CreativeStatCard
          title="Monitoring Seats"
          value={`${monitoring.used} / ${monitoring.total}`}
          subtitle={wallet ? `Tenant float: $${Number(wallet.balance || 0).toFixed(2)}` : 'Live surveillance quota'}
          icon={Radio}
          color="emerald"
          trend="+10%"
          trendUp={true}
        />
      </div>

      {/* Subscriptions Table */}
      <div className="bg-white/95 dark:bg-slate-900/95 rounded-3xl border border-teal-200/70 dark:border-white/10 shadow-sm overflow-hidden backdrop-blur-sm">
        <div className="p-4 sm:p-5 border-b border-gray-100 dark:border-white/5 flex justify-between items-center bg-gray-50/40 dark:bg-white/[0.01]">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-800/40 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
              <Layers className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-gray-900 dark:text-white">Active Subscriptions</h2>
              <p className="text-[11px] text-gray-500 dark:text-gray-400 font-medium">Assigned plans and recurring entitlement licenses</p>
            </div>
          </div>
          <span className="text-xs font-bold text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-white/5 px-2.5 py-1 rounded-lg border border-gray-200/50 dark:border-white/5">
            {subscriptions.length} {subscriptions.length === 1 ? 'Subscription' : 'Subscriptions'}
          </span>
        </div>

        {loading ? (
          <div className="p-12 text-center text-sm font-medium text-gray-500 dark:text-gray-400">Loading subscriptions…</div>
        ) : !subscriptions.length ? (
          <div className="p-12 text-center text-sm font-medium text-gray-500 dark:text-gray-400">
            {tenantId ? 'No subscriptions found. Activate a base plan first.' : 'Select an organization above to view its subscriptions.'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left border-b border-gray-100 dark:border-white/5 bg-gray-50/75 dark:bg-[#12131a] uppercase text-[10px] font-extrabold tracking-wider text-gray-500 dark:text-gray-400">
                  <th className="p-4">Plan / Type</th>
                  <th className="p-4">Status</th>
                  <th className="p-4">Period & Renewal</th>
                  <th className="p-4">Assigned Quotas</th>
                  <th className="p-4 text-center">Auto-Renew</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                {subscriptions.map(s => (
                  <tr key={s.id} className="hover:bg-gray-50/50 dark:hover:bg-white/[0.02] transition">
                    <td className="p-4">
                      <p className="font-bold text-gray-900 dark:text-white text-xs sm:text-sm">{s.plan_name}</p>
                      <span className="inline-block mt-0.5 text-[10px] font-mono uppercase font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 px-1.5 py-0.5 rounded border border-indigo-100 dark:border-indigo-900/40">
                        {s.subscription_type}
                      </span>
                    </td>
                    <td className="p-4">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-[10px] font-bold uppercase ${
                        s.status === 'active' ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 ring-1 ring-emerald-500/20' :
                        s.status === 'grace' ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 ring-1 ring-amber-500/20' :
                        'bg-gray-100 dark:bg-white/5 text-gray-700 dark:text-gray-300'
                      }`}>
                        {s.status}
                      </span>
                      {s.grace_ends_at && <p className="text-[10px] font-medium text-amber-600 dark:text-amber-400 mt-1">Grace ends {date(s.grace_ends_at)}</p>}
                    </td>
                    <td className="p-4">
                      <p className="font-mono font-medium text-gray-700 dark:text-gray-300 text-[11px]">{date(s.start_date)} → {date(s.end_date)}</p>
                      <p className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 mt-0.5">{s.duration_count} {s.duration_unit} · <span className="font-bold text-gray-800 dark:text-gray-200">{money(s)}</span></p>
                    </td>
                    <td className="p-4">
                      <div className="flex flex-col gap-1 text-[11px] text-gray-600 dark:text-gray-300">
                        {[['numbers','Numbers'],['extensions','Extensions'],['monitoring_extensions','Monitoring']].map(([key, label]) => (
                          <div key={key} className="flex items-center gap-1.5">
                            <span className="text-gray-400 font-medium">{label}:</span>
                            <span className="font-bold text-gray-900 dark:text-white">{s.usage[key] || 0}</span>
                            <span className="text-gray-400">/ {s.entitlement_snapshot[key] || 0}</span>
                          </div>
                        ))}
                      </div>
                    </td>
                    <td className="p-4 text-center">
                      <label className="inline-flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={s.auto_renew}
                          disabled={busy || !['active', 'grace', 'frozen'].includes(s.status)}
                          onChange={e => execute(`/subscriptions/${s.id}/auto-renew`, { auto_renew: e.target.checked }, 'patch')}
                          className="rounded text-primary-600 focus:ring-primary-500 cursor-pointer"
                        />
                        <span className={`text-[11px] font-bold ${s.auto_renew ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-500 dark:text-gray-400'}`}>
                          {s.auto_renew ? 'Active' : 'Off'}
                        </span>
                      </label>
                    </td>
                    <td className="p-4 text-right">
                      <div className="inline-flex items-center justify-end gap-1.5 flex-wrap">
                        <button className={buttonClass} onClick={() => details(s)}>Details</button>
                        <button className={buttonClass} disabled={busy || ['expired', 'cancelled'].includes(s.status)} onClick={() => { setOperationKey(crypto.randomUUID()); setRenewing(s); }}>
                          {s.status === 'pending_activation' ? 'Pay & activate' : 'Renew'}
                        </button>
                        {superAdmin && ['active', 'grace'].includes(s.status) && (
                          <button className={buttonClass} disabled={busy} onClick={() => window.confirm('Freeze only the assets owned by this subscription?') && execute(`/subscriptions/${s.id}/freeze`, {})}>
                            Freeze
                          </button>
                        )}
                        {superAdmin && !['expired', 'cancelled'].includes(s.status) && (
                          <button className={buttonClass} disabled={busy} onClick={() => window.confirm('Cancel immediately and freeze the owned assets?') && execute(`/subscriptions/${s.id}/cancel`, {})}>
                            Cancel
                          </button>
                        )}
                        {superAdmin && ['frozen', 'cancelled'].includes(s.status) && (
                          <button className={buttonClass} disabled={busy} onClick={() => window.confirm('Release assets after retention? This cannot be renewed afterwards.') && execute(`/subscriptions/${s.id}/release`, {})}>
                            Release
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {selected && (
        <section className="platform-panel-dark rounded-2xl border border-gray-200/80 dark:border-white/10 shadow-xs p-6 space-y-4">
          <div className="flex justify-between items-center border-b border-gray-100 dark:border-white/5 pb-3">
            <h2 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white">{selected.plan_name} — Assets & Audit History</h2>
            <button onClick={() => setSelected(null)} className={buttonClass}>Close</button>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400">Frozen since: {date(selected.frozen_at)}. Automatic release is disabled by default.</p>
          <ul className="space-y-2">
            {selected.assets.map(a => (
              <li key={`${a.type}:${a.id}`} className="flex justify-between items-center border-b border-gray-100 dark:border-white/5 pb-2 text-xs">
                <span className="text-gray-900 dark:text-white"><strong>{a.type}:</strong> {a.value} · <span className="uppercase text-[10px] text-gray-500">{a.status}</span></span>
                <button className={buttonClass} disabled={busy || !['active', 'frozen', 'suspended'].includes(a.status)} onClick={() => { setMoving(a); setTarget(''); }}>
                  Move to another subscription
                </button>
              </li>
            ))}
          </ul>
          {!selected.assets.length && <p className="text-xs text-gray-400 italic">No assets assigned to this subscription.</p>}
          <h3 className="font-bold text-xs uppercase tracking-wider text-gray-500 pt-3">Audit Events</h3>
          <ul className="space-y-1 text-xs">
            {history.map(h => (
              <li key={h.id} className="text-gray-600 dark:text-gray-300">
                <span className="font-mono text-gray-400">{date(h.created_at)}</span> — <strong>{h.event}</strong> ({h.actor_id}) {h.metadata?.charged !== undefined && `— charged $${h.metadata.charged}`}
              </li>
            ))}
          </ul>
        </section>
      )}

      {(activation || renewing || moving) && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 dark:bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <section role="dialog" aria-modal="true" aria-labelledby="subscription-dialog-title" className="bg-white dark:bg-[#0c0e17] rounded-3xl border border-slate-200/80 dark:border-white/10 shadow-2xl p-0 w-full max-w-lg max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-100 dark:border-white/5 bg-gradient-to-r from-teal-500/10 via-emerald-500/5 to-transparent flex items-center justify-between">
              <div>
                <h2 id="subscription-dialog-title" className="text-xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                  {activation ? 'Activate Subscription' : renewing ? 'Confirm Renewal' : 'Move Asset'}
                </h2>
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-0.5">
                  {activation ? 'Choose tier, period, and billing authorization' : renewing ? 'Re-authorize and renew subscription tier' : 'Reassign asset to target active subscription'}
                </p>
              </div>
              <button 
                onClick={() => { setActivation(null); setRenewing(null); setMoving(null); setError(''); }}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/10 p-2 rounded-xl transition-all cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4 overflow-y-auto max-h-[75vh]">
              {error && (
                <div role="alert" className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/40 text-xs font-bold text-rose-700 dark:text-rose-400">
                  {error}
                </div>
              )}

              {activation && (
                <form className="space-y-4" onSubmit={async e => { e.preventDefault(); if (await execute('/subscriptions/activate', { ...activation, operation_key: operationKey })) setActivation(null); }}>
                  <div className="p-4 rounded-2xl bg-slate-50/80 dark:bg-white/[0.02] border border-slate-200/70 dark:border-white/5 space-y-3.5">
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                      Plan Selection *
                      <select 
                        className="w-full mt-1.5 px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#121520] text-xs sm:text-sm font-semibold text-slate-900 dark:text-white focus:ring-2 focus:ring-teal-500 focus:outline-none transition-all shadow-2xs" 
                        required 
                        value={activation.plan_id} 
                        onChange={e => { const p = plans.find(p => p.plan_id === e.target.value); setActivation({ ...activation, plan_id: e.target.value, duration_unit: p?.duration_unit || 'months', duration_count: p?.duration_count || p?.validity_months || 1 }); }}
                      >
                        <option value="">Choose a plan</option>
                        {plans.map(p => <option key={p.plan_id || p.id} value={p.plan_id}>{p.name} — {p.plan_category || 'base'} — {p.amount} {p.currency}</option>)}
                      </select>
                    </label>

                    <div className="grid grid-cols-2 gap-3">
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                        Duration *
                        <input 
                          className="w-full mt-1.5 px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#121520] font-mono text-xs sm:text-sm font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-teal-500 focus:outline-none transition-all shadow-2xs" 
                          type="number" 
                          min="1" 
                          max="3660" 
                          required 
                          value={activation.duration_count} 
                          onChange={e => setActivation({ ...activation, duration_count: Number(e.target.value) })} 
                        />
                      </label>
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                        Unit
                        <select 
                          className="w-full mt-1.5 px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#121520] text-xs sm:text-sm font-semibold text-slate-900 dark:text-white focus:ring-2 focus:ring-teal-500 focus:outline-none transition-all shadow-2xs" 
                          value={activation.duration_unit} 
                          onChange={e => setActivation({ ...activation, duration_unit: e.target.value })}
                        >
                          <option value="days">Days</option>
                          <option value="months">Calendar months</option>
                        </select>
                      </label>
                    </div>

                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                      Payment Mode
                      <select 
                        className="w-full mt-1.5 px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#121520] text-xs sm:text-sm font-semibold text-slate-900 dark:text-white focus:ring-2 focus:ring-teal-500 focus:outline-none transition-all shadow-2xs" 
                        value={activation.payment_mode} 
                        onChange={e => setActivation({ ...activation, payment_mode: e.target.value })}
                      >
                        <option value="wallet">Charge wallet / available credit</option>
                        <option value="pending">Pending activation — no service until paid</option>
                        {superAdmin && <option value="credit_override">Approved credit override</option>}
                      </select>
                    </label>

                    <label className="flex items-center gap-2.5 text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer pt-1">
                      <input 
                        type="checkbox" 
                        checked={activation.auto_renew} 
                        onChange={e => setActivation({ ...activation, auto_renew: e.target.checked })} 
                        className="rounded h-4 w-4 text-teal-600 focus:ring-teal-500 border-slate-300 dark:border-white/20" 
                      />
                      <span>Enable automatic renewal</span>
                    </label>
                  </div>

                  <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                    {currentPlan && `Catalog price: ${currentPlan.amount} ${currentPlan.currency} per ${currentPlan.duration_count || currentPlan.validity_months || 1} ${currentPlan.duration_unit || 'months'}. `}
                    Custom duration is prorated by the server.
                  </p>

                  {quote && (
                    <div className="p-3 rounded-xl bg-teal-50 dark:bg-teal-950/30 border border-teal-200 dark:border-teal-800/40 text-xs font-mono font-bold text-teal-700 dark:text-teal-300">
                      Initial charge: ${Number(quote.initial_charge).toFixed(2)} {quote.currency} (includes ${quote.setup_fee} setup). Renewal: ${quote.renewal_price} {quote.currency}. End: {date(quote.end_date)}.
                    </div>
                  )}

                  <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-white/5">
                    <button 
                      type="button" 
                      className="px-5 py-2.5 rounded-xl bg-white dark:bg-white/5 text-xs font-bold text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-white/10 transition-all cursor-pointer" 
                      onClick={() => { setActivation(null); setError(''); }}
                    >
                      Cancel
                    </button>
                    <button 
                      type="submit" 
                      className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-xs font-bold text-white shadow-lg shadow-teal-900/20 active:scale-95 transition-all disabled:opacity-50 cursor-pointer" 
                      disabled={busy || quoting || !quote}
                    >
                      {busy ? 'Processing…' : quoting ? 'Calculating price…' : 'Confirm Activation'}
                    </button>
                  </div>
                </form>
              )}

              {renewing && (
                <div className="space-y-4 text-xs">
                  <div className="p-4 rounded-2xl bg-slate-50/80 dark:bg-white/[0.02] border border-slate-200/70 dark:border-white/5 space-y-2">
                    <p className="text-slate-700 dark:text-slate-300 font-bold">{renewing.plan_name}: {money(renewing)} for {renewing.duration_count} {renewing.duration_unit}. {renewing.status === 'pending_activation' && 'The pending invoice also includes any setup fee.'}</p>
                    <p className="text-slate-500 font-medium">Payment uses wallet balance and available approved credit.</p>
                  </div>
                  <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-white/5">
                    <button 
                      type="button" 
                      className="px-5 py-2.5 rounded-xl bg-white dark:bg-white/5 text-xs font-bold text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-white/10 transition-all cursor-pointer" 
                      onClick={() => { setRenewing(null); setError(''); }}
                    >
                      Cancel
                    </button>
                    <button 
                      className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-xs font-bold text-white shadow-lg shadow-teal-900/20 active:scale-95 transition-all disabled:opacity-50 cursor-pointer" 
                      disabled={busy} 
                      onClick={async () => { if (await execute(`/subscriptions/${renewing.id}/renew`, { operation_key: operationKey })) setRenewing(null); }}
                    >
                      {busy ? 'Processing…' : 'Confirm Payment'}
                    </button>
                  </div>
                </div>
              )}

              {moving && (
                <div className="space-y-4 text-xs">
                  <div className="p-4 rounded-2xl bg-slate-50/80 dark:bg-white/[0.02] border border-slate-200/70 dark:border-white/5 space-y-3">
                    <p className="text-slate-700 dark:text-slate-300 font-bold">{moving.type}: {moving.value}. Customer ownership and routing configuration are preserved.</p>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                      Destination Subscription
                      <select 
                        className="w-full mt-1.5 px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#121520] text-xs sm:text-sm font-semibold text-slate-900 dark:text-white focus:ring-2 focus:ring-teal-500 focus:outline-none transition-all shadow-2xs" 
                        value={target} 
                        onChange={e => setTarget(e.target.value)}
                      >
                        <option value="">Choose active subscription</option>
                        {active.filter(s => s.id !== moving.subscription_id).map(s => {
                          const r = moving.type === 'monitoring' ? 'monitoring_extensions' : moving.type === 'extension' ? 'extensions' : 'numbers';
                          const left = Number(s.entitlement_snapshot[r] || 0) - Number(s.usage[r] || 0);
                          return <option disabled={left <= 0} key={s.id} value={s.id}>{s.plan_name} ({s.subscription_id}) — {left} available</option>;
                        })}
                      </select>
                    </label>
                  </div>
                  <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-white/5">
                    <button 
                      type="button" 
                      className="px-5 py-2.5 rounded-xl bg-white dark:bg-white/5 text-xs font-bold text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-white/10 transition-all cursor-pointer" 
                      onClick={() => { setMoving(null); setError(''); }}
                    >
                      Cancel
                    </button>
                    <button 
                      className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-xs font-bold text-white shadow-lg shadow-teal-900/20 active:scale-95 transition-all disabled:opacity-50 cursor-pointer" 
                      disabled={busy || !target} 
                      onClick={async () => { if (await execute('/subscriptions/assets/reassign', { type: moving.type, asset_id: moving.id, target_subscription_id: target })) setMoving(null); }}
                    >
                      Confirm Move
                    </button>
                  </div>
                </div>
              )}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
