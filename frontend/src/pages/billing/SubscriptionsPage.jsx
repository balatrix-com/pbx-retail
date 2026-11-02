import React, { useEffect, useState } from 'react';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { subscriptionService } from '../../services/subscription.service';

const date = value => value ? new Date(value).toLocaleString() : '—';
const money = s => `${Number(s.renewal_price || 0).toFixed(2)} ${String(s.currency_snapshot || '').toUpperCase()}`;
const inputClass = 'w-full border rounded-lg p-2 bg-white dark:bg-slate-800';
const buttonClass = 'border rounded-lg px-3 py-2 disabled:opacity-50 disabled:cursor-not-allowed';

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
  const [quote,setQuote] = useState(null);
  const [quoting,setQuoting] = useState(false);
  useEffect(()=>{
    setQuote(null);
    if(!activation?.plan_id)return;
    let cancelled=false;setQuoting(true);
    const timer=setTimeout(()=>api.post('/subscriptions/quote',{tenantId,plan_id:activation.plan_id,duration_unit:activation.duration_unit,duration_count:activation.duration_count})
      .then(r=>{if(!cancelled)setQuote(r.data);}).catch(e=>{if(!cancelled)setError(e.response?.data?.message || 'Could not calculate activation price');})
      .finally(()=>{if(!cancelled)setQuoting(false);}),300);
    return ()=>{cancelled=true;clearTimeout(timer);};
  },[activation?.plan_id,activation?.duration_unit,activation?.duration_count,tenantId]);
  useEffect(() => {
    subscriptionService.getPlans().then(setPlans).catch(() => {});
    if (superAdmin) api.get('/tenants', { params: { limit: 1000, status: 'ALL' } }).then(r => setTenants(r.data?.data || r.data?.items || r.data || [])).catch(e => setError(e.response?.data?.message || 'Could not load tenants'));
  }, [superAdmin]);
  async function load() {
    if (!tenantId) { setSubscriptions([]); return; }
    setLoading(true); setError('');
    try {
      const [r, w] = await Promise.all([api.get('/subscriptions', { params: { tenantId } }), superAdmin ? Promise.resolve(null) : api.get('/wallet').catch(() => null)]);
      setSubscriptions(r.data); setWallet(w?.data || null);
      setSelected(current => r.data.find(s => s.id === current?.id) || null);
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
  const active = subscriptions.filter(s => ['active','grace'].includes(s.status));
  const summary = resource => ({ total: active.reduce((n,s) => n + Number(s.entitlement_snapshot[resource] || 0),0), used: active.reduce((n,s) => n + Number(s.usage[resource] || 0),0) });
  const numbers = summary('numbers'), monitoring = summary('monitoring_extensions');
  const currentPlan = plans.find(p => p.plan_id === activation?.plan_id);
  const customerArchived = tenants.some(t => t.id === tenantId && (t.status === 'ARCHIVED' || t.archiveJob));
  return <div className="p-6 space-y-6 text-gray-900 dark:text-slate-100">
    <header className="flex flex-wrap justify-between gap-4"><div><h1 className="text-2xl font-bold">Subscriptions</h1><p className="text-gray-500">Manage base and capacity plans, renewals, and the assets each subscription owns.</p></div>
      <button className={buttonClass} disabled={!tenantId || busy || customerArchived} onClick={() => { setOperationKey(crypto.randomUUID()); setActivation({ plan_id: '', duration_unit: 'months', duration_count: 1, auto_renew: false, payment_mode: 'wallet' }); }}>Activate a plan</button></header>
    {customerArchived && <p className="p-3 rounded-lg bg-gray-100 dark:bg-slate-800">This customer is archiving or archived. Subscription and financial history are retained; new activation is disabled.</p>}
    {superAdmin && <label className="block max-w-lg">Tenant<select className={inputClass} value={tenantId} onChange={e => setTenantId(e.target.value)}><option value="">Select tenant</option>{Array.isArray(tenants) && tenants.map(t => <option key={t.id} value={t.id}>{t.name} ({t.customerCode})</option>)}</select></label>}
    {error && <div role="alert" className="rounded-lg border border-red-300 bg-red-50 text-red-800 p-4">{error}<button className="ml-4 underline" onClick={load}>Refresh</button></div>}
    <div className="grid sm:grid-cols-3 gap-4">{[['Base subscription', active.find(s => s.subscription_type === 'base')?.status || 'No active base'], ['Numbers', `${numbers.used} / ${numbers.total} assigned`], ['Monitoring extensions', `${monitoring.used} / ${monitoring.total} assigned`]].map(([label,value]) => <div key={label} className="border rounded-xl p-4"><p className="text-gray-500">{label}</p><p className="text-lg font-semibold">{value}</p></div>)}</div>
    <p className="text-sm text-gray-500">Frozen assets remain reserved. Renew their subscription or move them to an active subscription with available capacity. {wallet && `Wallet balance: ${Number(wallet.balance || 0).toFixed(2)}`}</p>
    {loading ? <p role="status">Loading subscriptions…</p> : <div className="overflow-x-auto border rounded-xl"><table className="w-full text-sm"><thead><tr className="text-left border-b">{['Plan / type','Status','Period / renewal price','Assigned / entitlement','Auto-renew','Actions'].map(h => <th className="p-3" key={h}>{h}</th>)}</tr></thead><tbody>
      {subscriptions.map(s => <tr key={s.id} className="border-b"><td className="p-3">{s.plan_name}<p className="text-gray-500">{s.subscription_type}</p></td><td className="p-3">{s.status}{s.grace_ends_at && <p>Grace ends {date(s.grace_ends_at)}</p>}</td><td className="p-3">{date(s.start_date)} → {date(s.end_date)}<p>{s.duration_count} {s.duration_unit} · {money(s)}</p></td><td className="p-3">{[['numbers','Numbers'],['extensions','Extensions'],['monitoring_extensions','Monitoring']].map(([key,label]) => <p key={key}>{label}: {s.usage[key] || 0} / {s.entitlement_snapshot[key] || 0}</p>)}<p>Frozen assets: {s.usage.frozen}</p></td><td className="p-3"><label><input type="checkbox" checked={s.auto_renew} disabled={busy || !['active','grace','frozen'].includes(s.status)} onChange={e => execute(`/subscriptions/${s.id}/auto-renew`, { auto_renew: e.target.checked }, 'patch')} /> {s.auto_renew ? 'On' : 'Off'}</label></td><td className="p-3 space-x-2"><button className={buttonClass} onClick={() => details(s)}>Details</button><button className={buttonClass} disabled={busy || ['expired','cancelled'].includes(s.status)} onClick={() => { setOperationKey(crypto.randomUUID()); setRenewing(s); }}>{s.status === 'pending_activation' ? 'Pay & activate' : 'Renew'}</button>{superAdmin && ['active','grace'].includes(s.status) && <button className={buttonClass} disabled={busy} onClick={() => window.confirm('Freeze only the assets owned by this subscription?') && execute(`/subscriptions/${s.id}/freeze`, {})}>Freeze</button>}{superAdmin && !['expired','cancelled'].includes(s.status) && <button className={buttonClass} disabled={busy} onClick={() => window.confirm('Cancel immediately and freeze the owned assets?') && execute(`/subscriptions/${s.id}/cancel`, {})}>Cancel</button>}{superAdmin && ['frozen','cancelled'].includes(s.status) && <button className={buttonClass} disabled={busy} onClick={() => window.confirm('Release assets after retention? This cannot be renewed afterwards.') && execute(`/subscriptions/${s.id}/release`, {})}>Release</button>}</td></tr>)}
      {!subscriptions.length && <tr><td colSpan="6" className="p-6 text-center">{tenantId ? 'No subscriptions. Activate a base plan first.' : 'Select a tenant to view subscriptions.'}</td></tr>}
    </tbody></table></div>}
    {selected && <section className="border rounded-xl p-5 space-y-4"><div className="flex justify-between"><h2 className="text-lg font-bold">{selected.plan_name} — assets & history</h2><button onClick={() => setSelected(null)}>Close</button></div><p>Frozen since: {date(selected.frozen_at)}. Automatic release is disabled by default.</p>
      <ul className="space-y-2">{selected.assets.map(a => <li key={`${a.type}:${a.id}`} className="flex justify-between border-b pb-2"><span>{a.type}: {a.value} · {a.status}</span><button className={buttonClass} disabled={busy || !['active','frozen','suspended'].includes(a.status)} onClick={() => { setMoving(a); setTarget(''); }}>Move to another subscription</button></li>)}</ul>{!selected.assets.length && <p>No assets assigned.</p>}
      <h3 className="font-semibold">Audit history</h3><ul>{history.map(h => <li key={h.id} className="text-sm">{date(h.created_at)} — {h.event} ({h.actor_id}) {h.metadata?.charged !== undefined && `— charged ${h.metadata.charged}`}</li>)}</ul>
    </section>}
    {(activation || renewing || moving) && <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"><section role="dialog" aria-modal="true" aria-labelledby="subscription-dialog-title" className="bg-white dark:bg-slate-900 rounded-xl p-6 w-full max-w-lg max-h-[90vh] overflow-auto space-y-4"><h2 id="subscription-dialog-title" className="text-xl font-bold">{activation ? 'Activate subscription' : renewing ? 'Confirm renewal' : 'Move asset'}</h2>
      {error && <p role="alert" className="text-red-600">{error}</p>}
      {activation && <form className="space-y-4" onSubmit={async e => { e.preventDefault(); if (await execute('/subscriptions/activate', { ...activation, operation_key: operationKey })) setActivation(null); }}>
        <label className="block">Plan<select className={inputClass} required value={activation.plan_id} onChange={e => { const p = plans.find(p => p.plan_id === e.target.value); setActivation({ ...activation, plan_id: e.target.value, duration_unit: p?.duration_unit || 'months', duration_count: p?.duration_count || p?.validity_months || 1 }); }}><option value="">Choose a plan</option>{plans.map(p => <option key={p.plan_id || p.id} value={p.plan_id}>{p.name} — {p.plan_category || 'base'} — {p.amount} {p.currency}</option>)}</select></label>
        <div className="grid grid-cols-2 gap-3"><label>Duration<input className={inputClass} type="number" min="1" max="3660" required value={activation.duration_count} onChange={e => setActivation({ ...activation, duration_count: Number(e.target.value) })} /></label><label>Unit<select className={inputClass} value={activation.duration_unit} onChange={e => setActivation({ ...activation, duration_unit: e.target.value })}><option value="days">Days</option><option value="months">Calendar months</option></select></label></div>
        <label className="block">Payment<select className={inputClass} value={activation.payment_mode} onChange={e => setActivation({ ...activation, payment_mode: e.target.value })}><option value="wallet">Charge wallet / available credit</option><option value="pending">Pending activation — no service until paid</option>{superAdmin && <option value="credit_override">Approved credit override</option>}</select></label>
        <label className="block"><input type="checkbox" checked={activation.auto_renew} onChange={e => setActivation({ ...activation, auto_renew: e.target.checked })} /> Enable automatic renewal</label>
        <p className="text-sm">{currentPlan && `Catalog price: ${currentPlan.amount} ${currentPlan.currency} per ${currentPlan.duration_count || currentPlan.validity_months || 1} ${currentPlan.duration_unit || 'months'}. `}Custom duration is prorated by the server. Activation starts after successful payment.</p>
        {quote && <p className="font-semibold">Initial charge: {Number(quote.initial_charge).toFixed(2)} {quote.currency} (includes {quote.setup_fee} setup). Renewal: {quote.renewal_price} {quote.currency}. End: {date(quote.end_date)}.</p>}
        <button className={buttonClass} disabled={busy || quoting || !quote}>{busy ? 'Processing…' : quoting ? 'Calculating price…' : 'Confirm activation'}</button>
      </form>}
      {renewing && <><p>{renewing.plan_name}: {money(renewing)} for {renewing.duration_count} {renewing.duration_unit}. {renewing.status === 'pending_activation' && 'The pending invoice also includes any setup fee.'}</p><p>Payment uses wallet balance and available approved credit. An early renewal extends the current end date; an expired subscription starts a new paid period today.</p><button className={buttonClass} disabled={busy} onClick={async () => { if (await execute(`/subscriptions/${renewing.id}/renew`, { operation_key: operationKey })) setRenewing(null); }}>{busy ? 'Processing…' : 'Confirm payment'}</button></>}
      {moving && <><p>{moving.type}: {moving.value}. Customer ownership and routing configuration are preserved.</p><label className="block">Destination<select className={inputClass} value={target} onChange={e => setTarget(e.target.value)}><option value="">Choose active subscription</option>{active.filter(s => s.id !== moving.subscription_id).map(s => { const r = moving.type === 'monitoring' ? 'monitoring_extensions' : moving.type === 'extension' ? 'extensions' : 'numbers'; const left = Number(s.entitlement_snapshot[r] || 0) - Number(s.usage[r] || 0); return <option disabled={left <= 0} key={s.id} value={s.id}>{s.plan_name} ({s.subscription_id}) — {left} available</option>; })}</select></label><button className={buttonClass} disabled={busy || !target} onClick={async () => { if (await execute('/subscriptions/assets/reassign', { type: moving.type, asset_id: moving.id, target_subscription_id: target })) setMoving(null); }}>Confirm move</button></>}
      <button className={buttonClass} disabled={busy} onClick={() => { setActivation(null); setRenewing(null); setMoving(null); setError(''); }}>Close</button>
    </section></div>}
  </div>;
}
