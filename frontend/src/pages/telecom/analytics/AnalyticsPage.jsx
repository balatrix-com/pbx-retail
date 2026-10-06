import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
    LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
    Tooltip, Legend, ResponsiveContainer, AreaChart, Area
} from 'recharts';
import {
    Phone, CheckCircle2, XCircle, Clock, TrendingUp, Activity,
    Wifi, WifiOff, RefreshCw, ArrowDownRight, ArrowUpRight,
    PhoneCall, PhoneOff, Zap
} from 'lucide-react';
import api from '../../../services/api';
import useAnalyticsSocket from '../../../hooks/useAnalyticsSocket';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const formatDuration = (seconds) => {
    if (!seconds) return '0m 0s';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
};

const formatNumber = (num) => new Intl.NumberFormat().format(num || 0);

const timeAgo = (ts) => {
    if (!ts) return '—';
    const diff = Math.floor((Date.now() - ts) / 1000);
    if (diff < 5) return 'just now';
    if (diff < 60) return `${diff}s ago`;
    return `${Math.floor(diff / 60)}m ago`;
};

// Custom Recharts tooltip
const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
        <div className="bg-white border border-gray-200 rounded-xl shadow-lg p-3 text-sm">
            <p className="font-bold text-gray-700 mb-1">{label}</p>
            {payload.map((entry, i) => (
                <div key={i} className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full" style={{ background: entry.color }} />
                    <span className="text-gray-500">{entry.name}:</span>
                    <span className="font-bold text-gray-900">{formatNumber(entry.value)}</span>
                </div>
            ))}
        </div>
    );
};

// ---------------------------------------------------------------------------
// Live stat badge — used in the "Live Activity" bar
// ---------------------------------------------------------------------------
const LiveStatBadge = ({ icon: Icon, label, value, color, pulse }) => (
    <div className="flex items-center gap-3 px-5 py-3">
        <div className={`p-2 rounded-xl ${color.bg}`}>
            <Icon className={`h-4 w-4 ${color.text}`} />
        </div>
        <div>
            <div className="flex items-center gap-1.5">
                <span className={`text-xl font-extrabold tabular-nums ${color.text}`}>{value ?? '—'}</span>
                {pulse && (
                    <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
                    </span>
                )}
            </div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">{label}</p>
        </div>
    </div>
);

// ---------------------------------------------------------------------------
// KPI Summary Card
// ---------------------------------------------------------------------------
const KpiCard = ({ icon: Icon, label, value, sub, bgIcon: BgIcon }) => (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5 flex flex-col relative overflow-hidden group hover:shadow-md transition-all duration-300">
        {BgIcon && <BgIcon className="absolute -bottom-3 -right-2 h-24 w-24 transform -rotate-12 text-blue-400/30 group-hover:scale-105 transition-transform duration-500 pointer-events-none stroke-[2.2]" />}
        <div className="relative z-10">
            <div className="flex items-center gap-2.5 mb-2">
                <div className="p-1.5 rounded-lg text-blue-500 bg-blue-50 ring-1 ring-blue-500/10 flex items-center justify-center">
                    <Icon className="h-4 w-4 stroke-[2.2]" />
                </div>
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">{label}</h3>
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-2 tracking-tight">{value}</div>
            {sub && <p className="text-xs font-medium text-slate-400 mt-1 tracking-wide">{sub}</p>}
        </div>
    </div>
);

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------
const AnalyticsPage = () => {
    const [summary, setSummary] = useState(null);
    const [dailyData, setDailyData] = useState([]);
    const [didData, setDIDData] = useState([]);
    const [hourlyData, setHourlyData] = useState([]);
    const [costData, setCostData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState('');
    const [dateRange, setDateRange] = useState('30');
    const [lastUpdated, setLastUpdated] = useState(null);
    const [tick, setTick] = useState(0); // forces "last updated" string to re-render

    // WebSocket live stats
    const { liveStats, isConnected } = useAnalyticsSocket();

    // Tick every 5s so "X ago" refreshes
    useEffect(() => {
        const t = setInterval(() => setTick(v => v + 1), 5000);
        return () => clearInterval(t);
    }, []);

    // ---------------------------------------------------------------------------
    // Data fetching
    // ---------------------------------------------------------------------------
    const fetchAnalyticsData = useCallback(async (isRefresh = false) => {
        try {
            isRefresh ? setRefreshing(true) : setLoading(true);
            setError('');

            const [summaryRes, dailyRes, didRes, hourlyRes, costsRes] = await Promise.all([
                api.get('/telecom/analytics/summary'),
                api.get(`/telecom/analytics/daily?days=${dateRange}`),
                api.get('/telecom/analytics/calls-by-did'),
                api.get('/telecom/analytics/hourly'),
                api.get('/telecom/analytics/costs'),
            ]);

            setSummary(summaryRes.data);
            setDailyData(dailyRes.data);
            setDIDData(didRes.data);
            setHourlyData(hourlyRes.data);
            setCostData(costsRes.data);
            setLastUpdated(Date.now());
        } catch (err) {
            setError('Failed to load analytics data. Check your connection and try again.');
            console.error('Analytics fetch error:', err);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [dateRange]);

    useEffect(() => {
        fetchAnalyticsData();
    }, [fetchAnalyticsData]);

    // ---------------------------------------------------------------------------
    // Skeleton loader
    // ---------------------------------------------------------------------------
    if (loading) {
        return (
            <div className="max-w-7xl mx-auto pb-12 space-y-6 animate-pulse">
                <div className="h-8 bg-gray-200 rounded-xl w-1/3" />
                <div className="h-24 bg-gray-200 rounded-2xl w-full" />
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    {[...Array(4)].map((_, i) => <div key={i} className="h-36 bg-gray-200 rounded-2xl" />)}
                </div>
                <div className="h-72 bg-gray-200 rounded-2xl" />
                <div className="grid grid-cols-2 gap-4">
                    <div className="h-72 bg-gray-200 rounded-2xl" />
                    <div className="h-72 bg-gray-200 rounded-2xl" />
                </div>
            </div>
        );
    }

    // ---------------------------------------------------------------------------
    // Render
    // ---------------------------------------------------------------------------
    return (
        <div className="max-w-7xl mx-auto pb-12 space-y-6">

            {/* ── Header ── */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-extrabold tracking-tight text-gray-900 flex items-center gap-3">
                        <TrendingUp className="h-7 w-7 text-primary-600" />
                        Analytics Dashboard
                    </h1>
                    <p className="text-gray-400 mt-1 text-sm font-medium">
                        Real-time call metrics and usage for your account
                        {lastUpdated && (
                            <span className="ml-2 text-gray-300">· updated {timeAgo(lastUpdated)}</span>
                        )}
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    {/* Date range */}
                    <select
                        value={dateRange}
                        onChange={(e) => setDateRange(e.target.value)}
                        className="block rounded-xl border-0 py-2.5 px-3 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-primary-600 sm:text-sm font-medium bg-white transition-all cursor-pointer"
                    >
                        <option value="7">Last 7 Days</option>
                        <option value="30">Last 30 Days</option>
                        <option value="60">Last 60 Days</option>
                        <option value="90">Last 90 Days</option>
                    </select>

                    {/* Refresh */}
                    <button
                        onClick={() => fetchAnalyticsData(true)}
                        disabled={refreshing}
                        className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-bold text-gray-700 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 transition-all disabled:opacity-50"
                    >
                        <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin text-primary-600' : 'text-gray-400'}`} />
                        Refresh
                    </button>
                </div>
            </div>

            {/* ── Error ── */}
            {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-5 py-4 rounded-xl flex justify-between items-center text-sm font-medium">
                    <span>{error}</span>
                    <button onClick={() => setError('')} className="text-red-400 hover:text-red-700 font-bold ml-4">✕</button>
                </div>
            )}

            {/* ── Live Activity Bar ── */}
            <div className={`rounded-2xl border overflow-hidden transition-all ${isConnected
                ? 'bg-gradient-to-r from-gray-900 to-gray-800 border-gray-700 shadow-xl'
                : 'bg-white border-gray-200 shadow-sm'
                }`}>
                <div className="px-6 py-3 border-b border-white/10 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                        <Zap className={`h-4 w-4 ${isConnected ? 'text-yellow-400' : 'text-gray-400'}`} />
                        <span className={`text-xs font-extrabold uppercase tracking-widest ${isConnected ? 'text-gray-300' : 'text-gray-500'}`}>
                            Live Activity
                        </span>
                        {isConnected ? (
                            <span className="flex items-center gap-1.5 rounded-full bg-green-500/10 ring-1 ring-green-500/30 px-2.5 py-0.5 text-[10px] font-bold text-green-400 uppercase tracking-wider">
                                <span className="relative flex h-1.5 w-1.5">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-green-500" />
                                </span>
                                Connected
                            </span>
                        ) : (
                            <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-[10px] font-bold text-gray-400 uppercase tracking-wider ring-1 ring-gray-200">
                                Polling mode
                            </span>
                        )}
                    </div>
                    {liveStats && (
                        <span className={`text-[10px] font-bold uppercase tracking-wider ${isConnected ? 'text-gray-500' : 'text-gray-400'}`}>
                            Snapshot {timeAgo(liveStats.timestamp)}
                        </span>
                    )}
                </div>

                <div className={`flex flex-wrap divide-x ${isConnected ? 'divide-white/10' : 'divide-gray-100'}`}>
                    <LiveStatBadge
                        icon={Activity}
                        label="Active Calls"
                        value={liveStats?.activeCalls ?? 0}
                        color={isConnected
                            ? { bg: 'bg-blue-500/10', text: 'text-blue-400' }
                            : { bg: 'bg-blue-50', text: 'text-blue-600' }}
                        pulse={isConnected && (liveStats?.activeCalls ?? 0) > 0}
                    />
                    <LiveStatBadge
                        icon={PhoneCall}
                        label="Ringing"
                        value={liveStats?.ringing ?? 0}
                        color={isConnected
                            ? { bg: 'bg-amber-500/10', text: 'text-amber-400' }
                            : { bg: 'bg-amber-50', text: 'text-amber-600' }}
                        pulse={false}
                    />
                    <LiveStatBadge
                        icon={CheckCircle2}
                        label="Answered"
                        value={liveStats?.answered ?? 0}
                        color={isConnected
                            ? { bg: 'bg-green-500/10', text: 'text-green-400' }
                            : { bg: 'bg-green-50', text: 'text-green-600' }}
                        pulse={false}
                    />
                    <LiveStatBadge
                        icon={ArrowDownRight}
                        label="Inbound"
                        value={liveStats?.inbound ?? 0}
                        color={isConnected
                            ? { bg: 'bg-indigo-500/10', text: 'text-indigo-400' }
                            : { bg: 'bg-indigo-50', text: 'text-indigo-600' }}
                        pulse={false}
                    />
                    <LiveStatBadge
                        icon={ArrowUpRight}
                        label="Outbound"
                        value={liveStats?.outbound ?? 0}
                        color={isConnected
                            ? { bg: 'bg-purple-500/10', text: 'text-purple-400' }
                            : { bg: 'bg-purple-50', text: 'text-purple-600' }}
                        pulse={false}
                    />
                    {!isConnected && (
                        <div className="flex items-center gap-2 px-5 py-3 text-xs font-medium text-gray-400">
                            <WifiOff className="h-3.5 w-3.5" />
                            Real-time requires monitoring add-on
                        </div>
                    )}
                </div>
            </div>

            {/* ── KPI Summary Cards ── */}
            {summary && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <KpiCard
                        icon={Phone}
                        bgIcon={Phone}
                        label="Total Calls"
                        value={formatNumber(summary.totalCalls)}
                        sub={`${dateRange}-day window`}
                    />
                    <KpiCard
                        icon={CheckCircle2}
                        bgIcon={CheckCircle2}
                        label="Answered"
                        value={formatNumber(summary.answeredCalls)}
                        sub={`${summary.answerRate}% answer rate`}
                    />
                    <KpiCard
                        icon={PhoneOff}
                        bgIcon={PhoneOff}
                        label="Missed"
                        value={formatNumber(summary.missedCalls)}
                        sub={`${summary.totalCalls > 0 ? ((summary.missedCalls / summary.totalCalls) * 100).toFixed(1) : 0}% miss rate`}
                    />
                    <KpiCard
                        icon={Clock}
                        bgIcon={Clock}
                        label="Avg Duration"
                        value={formatDuration(summary.averageDuration)}
                        sub="per answered call"
                    />
                </div>
            )}

            {/* ── Daily Call Volume — Full Width ── */}
            <div className="bg-white rounded-2xl shadow-sm ring-1 ring-gray-200 p-6">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h3 className="text-base font-extrabold text-gray-900">Daily Call Volume</h3>
                        <p className="text-xs font-medium text-gray-400 mt-0.5">Inbound vs outbound over {dateRange} days</p>
                    </div>
                    <div className="flex items-center gap-3 text-xs font-bold">
                        <span className="flex items-center gap-1.5 text-blue-600">
                            <span className="h-2.5 w-2.5 rounded-full bg-blue-500 inline-block" /> Inbound
                        </span>
                        <span className="flex items-center gap-1.5 text-emerald-600">
                            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 inline-block" /> Outbound
                        </span>
                    </div>
                </div>
                {dailyData.length === 0 ? (
                    <div className="h-64 flex flex-col items-center justify-center text-gray-300">
                        <TrendingUp className="h-12 w-12 mb-3 stroke-[1.5]" />
                        <p className="text-sm font-bold">No call data for this period</p>
                    </div>
                ) : (
                    <ResponsiveContainer width="100%" height={280}>
                        <AreaChart data={dailyData} margin={{ top: 5, right: 5, left: -10, bottom: 0 }}>
                            <defs>
                                <linearGradient id="inboundGrad" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.15} />
                                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                </linearGradient>
                                <linearGradient id="outboundGrad" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.15} />
                                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F3F4F6" />
                            <XAxis
                                dataKey="date"
                                axisLine={false}
                                tickLine={false}
                                tick={{ fill: '#9CA3AF', fontSize: 11 }}
                                dy={8}
                                tickFormatter={(v) => {
                                    const d = new Date(v);
                                    return `${d.getMonth() + 1}/${d.getDate()}`;
                                }}
                                interval={Math.max(0, Math.floor(dailyData.length / 8) - 1)}
                            />
                            <YAxis axisLine={false} tickLine={false} tick={{ fill: '#9CA3AF', fontSize: 11 }} dx={-4} />
                            <Tooltip content={<CustomTooltip />} />
                            <Area type="monotone" dataKey="inbound" stroke="#3b82f6" strokeWidth={2.5} fill="url(#inboundGrad)" name="Inbound" dot={false} activeDot={{ r: 5 }} />
                            <Area type="monotone" dataKey="outbound" stroke="#10b981" strokeWidth={2.5} fill="url(#outboundGrad)" name="Outbound" dot={false} activeDot={{ r: 5 }} />
                        </AreaChart>
                    </ResponsiveContainer>
                )}
            </div>

            {/* ── Calls by DID + Hourly Distribution ── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                {/* Calls by DID */}
                <div className="bg-white rounded-2xl shadow-sm ring-1 ring-gray-200 p-6">
                    <div className="mb-6">
                        <h3 className="text-base font-extrabold text-gray-900">Calls by Phone Number</h3>
                        <p className="text-xs font-medium text-gray-400 mt-0.5">Top DIDs by inbound volume</p>
                    </div>
                    {didData.length === 0 ? (
                        <div className="h-64 flex flex-col items-center justify-center text-gray-300">
                            <Phone className="h-12 w-12 mb-3 stroke-[1.5]" />
                            <p className="text-sm font-bold">No DID data available</p>
                        </div>
                    ) : (
                        <ResponsiveContainer width="100%" height={260}>
                            <BarChart data={didData} layout="vertical" margin={{ top: 0, right: 20, left: 10, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#F3F4F6" />
                                <XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: '#9CA3AF', fontSize: 11 }} />
                                <YAxis
                                    dataKey="didNumber"
                                    type="category"
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: '#6B7280', fontSize: 11 }}
                                    width={110}
                                    tickFormatter={(v) => v.length > 14 ? `…${v.slice(-12)}` : v}
                                />
                                <Tooltip content={<CustomTooltip />} cursor={{ fill: '#F9FAFB' }} />
                                <Bar dataKey="callCount" name="Calls" fill="#3b82f6" radius={[0, 4, 4, 0]} maxBarSize={20} />
                            </BarChart>
                        </ResponsiveContainer>
                    )}
                </div>

                {/* Hourly Distribution */}
                <div className="bg-white rounded-2xl shadow-sm ring-1 ring-gray-200 p-6">
                    <div className="mb-6">
                        <h3 className="text-base font-extrabold text-gray-900">Hourly Call Distribution</h3>
                        <p className="text-xs font-medium text-gray-400 mt-0.5">24-hour volume pattern (all time)</p>
                    </div>
                    {hourlyData.length === 0 ? (
                        <div className="h-64 flex flex-col items-center justify-center text-gray-300">
                            <Clock className="h-12 w-12 mb-3 stroke-[1.5]" />
                            <p className="text-sm font-bold">No hourly data available</p>
                        </div>
                    ) : (
                        <ResponsiveContainer width="100%" height={260}>
                            <BarChart data={hourlyData} margin={{ top: 0, right: 5, left: -10, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F3F4F6" />
                                <XAxis
                                    dataKey="hour"
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: '#9CA3AF', fontSize: 11 }}
                                    dy={8}
                                    tickFormatter={(h) => {
                                        if (h === 0) return '12a';
                                        if (h === 12) return '12p';
                                        return h < 12 ? `${h}a` : `${h - 12}p`;
                                    }}
                                    interval={2}
                                />
                                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#9CA3AF', fontSize: 11 }} dx={-4} />
                                <Tooltip content={<CustomTooltip />} cursor={{ fill: '#F9FAFB' }} />
                                <Bar dataKey="calls" name="Calls" fill="#8b5cf6" radius={[3, 3, 0, 0]} maxBarSize={28} />
                            </BarChart>
                        </ResponsiveContainer>
                    )}
                </div>
            </div>

            {/* ── Cost Breakdown Table ── */}
            {costData && (
                <div className="bg-white rounded-2xl shadow-sm ring-1 ring-gray-200 overflow-hidden">
                    <div className="px-6 py-5 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
                        <div>
                            <h3 className="text-base font-extrabold text-gray-900">Cost Breakdown</h3>
                            <p className="text-xs font-medium text-gray-400 mt-0.5">Charges from wallet usage records</p>
                        </div>
                        <div className="inline-flex items-center rounded-xl bg-green-50 px-4 py-2 text-sm font-bold text-green-700 ring-1 ring-inset ring-green-600/20">
                            Total: ${costData.totalCost}
                        </div>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-100">
                            <thead className="bg-white">
                                <tr>
                                    <th className="py-3.5 pl-6 pr-3 text-left text-[10px] font-extrabold uppercase tracking-widest text-gray-400">Category</th>
                                    <th className="px-3 py-3.5 text-left text-[10px] font-extrabold uppercase tracking-widest text-gray-400">Usage</th>
                                    <th className="px-3 py-3.5 text-right text-[10px] font-extrabold uppercase tracking-widest text-gray-400">Amount</th>
                                    <th className="px-3 py-3.5 pr-6 text-right text-[10px] font-extrabold uppercase tracking-widest text-gray-400">% of Total</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50 bg-white">
                                {costData.breakdown.map((item, i) => (
                                    <tr key={i} className="hover:bg-gray-50/60 transition-colors">
                                        <td className="whitespace-nowrap py-4 pl-6 pr-3 text-sm font-bold text-gray-900">{item.category}</td>
                                        <td className="whitespace-nowrap px-3 py-4 text-sm font-mono text-gray-500">
                                            {item.category.includes('Inbound') && `${formatNumber(costData.minutes?.inbound)} min`}
                                            {item.category.includes('Outbound') && `${formatNumber(costData.minutes?.outbound)} min`}
                                            {item.category.includes('DID') && '—'}
                                        </td>
                                        <td className="whitespace-nowrap px-3 py-4 text-sm font-mono font-bold text-gray-900 text-right">${item.amount}</td>
                                        <td className="whitespace-nowrap px-3 py-4 pr-6 text-sm font-mono text-gray-400 text-right">{item.percentage}</td>
                                    </tr>
                                ))}
                            </tbody>
                            <tfoot className="bg-gray-50/50 border-t-2 border-gray-200">
                                <tr>
                                    <td className="whitespace-nowrap py-4 pl-6 pr-3 text-sm font-extrabold text-gray-900">Total</td>
                                    <td className="whitespace-nowrap px-3 py-4 text-sm font-mono font-bold text-gray-700">{formatNumber(costData.minutes?.total)} min</td>
                                    <td className="whitespace-nowrap px-3 py-4 text-sm font-mono font-extrabold text-green-700 text-right">${costData.totalCost}</td>
                                    <td className="whitespace-nowrap px-3 py-4 pr-6 text-sm font-mono text-gray-700 text-right font-bold">100%</td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AnalyticsPage;
