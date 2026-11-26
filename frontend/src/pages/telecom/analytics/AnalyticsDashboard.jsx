import React, { useState, useEffect, useCallback } from 'react';
import {
    LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
    Tooltip, Legend, ResponsiveContainer, AreaChart, Area
} from 'recharts';
import {
    Phone, CheckCircle2, Clock, RefreshCw, ArrowDownRight, ArrowUpRight,
    PhoneOff, Calendar, Zap, TrendingUp, BarChart3, Activity,
    ChevronRight, MoreHorizontal, Globe, Target, AlertCircle
} from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { analyticsService } from '../../../services/analytics.service';

const formatDuration = (seconds) => {
    if (!seconds) return '0s';
    const mins = Math.floor(seconds / 60);
    const secs = Math.round(seconds % 60);
    return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
};

const formatNumber = (num) => new Intl.NumberFormat().format(num || 0);

const AnalyticsDashboard = () => {
    const { user } = useAuth();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState(null);
    const [range, setRange] = useState('today');

    const customerId = user?.tenant?.customerCode || user?.tenant?.code || user?.tenantId;
    const hasTenant = !!customerId;

    const fetchData = useCallback(async (isRefresh = false) => {
        if (!hasTenant) {
            setLoading(false);
            return;
        }

        try {
            isRefresh ? setRefreshing(true) : setLoading(true);
            setError(null);

            const result = await analyticsService.getDashboard(range);
            if (!result || Object.keys(result).length === 0) {
                throw new Error('No data received from service');
            }
            setData(result);
        } catch (err) {
            console.error('Failed to fetch analytics:', err);
            setError(err.response?.data?.message || err.message || 'The analytics service is currently unreachable.');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [range, hasTenant]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const processedDailyTrend = data?.daily_trend?.reduce((acc, curr) => {
        const existing = acc.find(item => item.date === curr.bucket_day);
        if (existing) {
            existing[curr.direction] = curr.total_calls;
        } else {
            acc.push({
                date: curr.bucket_day,
                [curr.direction]: curr.total_calls
            });
        }
        return acc;
    }, []) || [];

    const processedHourly = data?.hour_of_day_distribution?.reduce((acc, curr) => {
        const existing = acc.find(item => item.hour === curr.hour_of_day);
        if (existing) {
            existing[curr.direction] = (existing[curr.direction] || 0) + curr.total_calls;
        } else {
            acc.push({
                hour: curr.hour_of_day,
                [curr.direction]: curr.total_calls
            });
        }
        return acc;
    }, []) || [];

    processedHourly.sort((a, b) => a.hour - b.hour);

    return (
        <div className="w-full pb-12 space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-800/40 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0 shadow-xs">
                        <BarChart3 className="h-6 w-6" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2.5">
                            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-gray-900 dark:text-white">
                                Analytics
                            </h1>
                            {customerId && (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/40">
                                    {customerId}
                                </span>
                            )}
                        </div>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                            Real-time operational pulse, traffic patterns, and call performance.
                        </p>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-2.5">
                    {/* Date Range Selector */}
                    <div className="bg-white dark:bg-[#0c0d12] p-1 rounded-xl border border-gray-200/80 dark:border-white/10 shadow-xs flex items-center gap-1">
                        {[
                            { id: 'today', label: 'Today' },
                            { id: 'last_7_days', label: '7 Days' },
                            { id: 'last_30_days', label: '30 Days' }
                        ].map((r) => (
                            <button
                                key={r.id}
                                onClick={() => setRange(r.id)}
                                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${range === r.id
                                    ? 'bg-slate-900 text-white dark:bg-white dark:text-black shadow-xs'
                                    : 'text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white'
                                    }`}
                            >
                                {r.label}
                            </button>
                        ))}
                    </div>

                    {/* Refresh Button */}
                    <button
                        onClick={() => fetchData(true)}
                        disabled={refreshing}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 text-sm font-semibold rounded-xl bg-white dark:bg-[#0c0d12] text-gray-700 dark:text-slate-200 border border-gray-200/80 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-white/[0.04] transition-all shadow-xs active:scale-95"
                        title="Refresh"
                    >
                        <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
                        <span className="hidden sm:inline">Refresh</span>
                    </button>
                </div>
            </div>

            {/* Error Notification if backend analytics service is down */}
            {error && (
                <div className="platform-panel-dark rounded-2xl p-4 border border-amber-200 dark:border-amber-800/50 bg-amber-50/50 dark:bg-amber-950/30 text-amber-900 dark:text-amber-200 shadow-xs flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                        <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                        <div>
                            <p className="text-sm font-bold">Analytics Engine Offline or Unreachable</p>
                            <p className="text-xs text-amber-800 dark:text-amber-300 mt-0.5">
                                {error}. The internal analytics service at ANALYTICS_ENGINE_URL is currently unreachable.
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={() => fetchData(true)}
                        className="px-3 py-1.5 rounded-lg text-xs font-bold bg-amber-600 text-white hover:bg-amber-700 transition shadow-xs shrink-0"
                    >
                        Retry
                    </button>
                </div>
            )}

            {!hasTenant ? (
                <div className="py-20 text-center">
                    <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/40 text-amber-600 dark:text-amber-400 mx-auto flex items-center justify-center mb-3">
                        <AlertCircle className="w-6 h-6" />
                    </div>
                    <h3 className="text-base font-bold text-gray-900 dark:text-white">Tenant Context Required</h3>
                    <p className="text-sm text-gray-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
                        This user account is not linked to an active tenant. Analytics are only available for registered tenant admins.
                    </p>
                </div>
            ) : loading && !data ? (
                <div className="py-24 text-center">
                    <RefreshCw className="w-10 h-10 animate-spin text-indigo-600 dark:text-indigo-400 mx-auto mb-3" />
                    <p className="text-base font-bold text-gray-900 dark:text-white">Syncing Intelligence...</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Aggregating real-time call performance</p>
                </div>
            ) : (
                <>
                    {/* KPI Section */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <KPICard
                            title="Gross Volume"
                            value={formatNumber(data?.kpi_cards?.total_calls)}
                            icon={Phone}
                            trend="+12.5%"
                            isUp={true}
                            subtitle="Total call requests processed"
                        />
                        <KPICard
                            title="Conversion"
                            value={formatNumber(data?.kpi_cards?.answered_calls)}
                            icon={CheckCircle2}
                            trend="89.2%"
                            isUp={true}
                            subtitle="Answer rate performance"
                        />
                        <KPICard
                            title="Drop-off"
                            value={formatNumber(data?.kpi_cards?.missed_calls)}
                            icon={PhoneOff}
                            trend="10.8%"
                            isUp={false}
                            subtitle="Missed/Rejected volume"
                        />
                        <KPICard
                            title="Talk Time"
                            value={formatDuration(data?.kpi_cards?.avg_duration_sec)}
                            icon={Clock}
                            trend="-2.4s"
                            isUp={false}
                            subtitle="Average session duration"
                        />
                    </div>

                    {/* Main Content Grid */}
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                        {/* Large Chart Area */}
                        <div className="lg:col-span-8 space-y-6">
                            {/* Velocity Chart */}
                            <div className="bg-white dark:bg-[#0c0d12] rounded-2xl p-5 sm:p-6 border border-gray-200/80 dark:border-white/10 shadow-xs relative overflow-hidden group">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                                    <div>
                                        <h3 className="text-lg font-bold text-gray-900 dark:text-white tracking-tight">Traffic Velocity</h3>
                                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Call distribution over time</p>
                                    </div>
                                    <div className="flex items-center gap-3 bg-gray-50 dark:bg-black/20 p-1.5 rounded-xl border border-gray-200/80 dark:border-white/10">
                                        <LegendBadge color="#4f46e5" label="Inbound" />
                                        <LegendBadge color="#10b981" label="Outbound" />
                                    </div>
                                </div>

                                <div className="h-[320px] sm:h-[380px] w-full">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <AreaChart data={processedDailyTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                            <defs>
                                                <linearGradient id="colorIn" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.2} />
                                                    <stop offset="95%" stopColor="#4f46e5" stopOpacity={0} />
                                                </linearGradient>
                                                <linearGradient id="colorOut" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                                                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                                </linearGradient>
                                            </defs>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" className="text-gray-100 dark:text-white/[0.04]" />
                                            <XAxis
                                                dataKey="date"
                                                axisLine={false}
                                                tickLine={false}
                                                tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 700 }}
                                                dy={10}
                                                tickFormatter={(str) => {
                                                    const d = new Date(str);
                                                    return isNaN(d.getTime()) ? str : d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
                                                }}
                                            />
                                            <YAxis
                                                axisLine={false}
                                                tickLine={false}
                                                tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 700 }}
                                            />
                                            <Tooltip content={<CustomTooltip />} />
                                            <Area
                                                type="monotone"
                                                dataKey="inbound"
                                                stroke="#4f46e5"
                                                strokeWidth={3}
                                                fillOpacity={1}
                                                fill="url(#colorIn)"
                                                animationDuration={1500}
                                            />
                                            <Area
                                                type="monotone"
                                                dataKey="outbound"
                                                stroke="#10b981"
                                                strokeWidth={3}
                                                fillOpacity={1}
                                                fill="url(#colorOut)"
                                                animationDuration={1500}
                                            />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>

                            {/* Hourly Density */}
                            <div className="bg-white dark:bg-[#0c0d12] rounded-2xl p-5 sm:p-6 border border-gray-200/80 dark:border-white/10 shadow-xs">
                                <div className="mb-6">
                                    <h3 className="text-lg font-bold text-gray-900 dark:text-white tracking-tight">Hourly Density</h3>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Peak performance windows</p>
                                </div>
                                <div className="h-[240px] w-full">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={processedHourly} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" className="text-gray-100 dark:text-white/[0.04]" />
                                            <XAxis
                                                dataKey="hour"
                                                axisLine={false}
                                                tickLine={false}
                                                tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 700 }}
                                                tickFormatter={(h) => h === 0 ? '12A' : h === 12 ? '12P' : h < 12 ? `${h}A` : `${h - 12}P`}
                                                dy={10}
                                            />
                                            <YAxis
                                                axisLine={false}
                                                tickLine={false}
                                                tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 700 }}
                                            />
                                            <Tooltip content={<CustomTooltip />} />
                                            <Bar
                                                dataKey="inbound"
                                                fill="#4f46e5"
                                                radius={[4, 4, 0, 0]}
                                                barSize={16}
                                                stackId="a"
                                            />
                                            <Bar
                                                dataKey="outbound"
                                                fill="#10b981"
                                                radius={[4, 4, 0, 0]}
                                                barSize={16}
                                                stackId="a"
                                            />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        </div>

                        {/* Sidebar Column */}
                        <div className="lg:col-span-4 space-y-6">
                            {/* Top DIDs Performance */}
                            <div className="bg-white dark:bg-[#0c0d12] rounded-2xl p-5 sm:p-6 border border-gray-200/80 dark:border-white/10 shadow-xs flex flex-col">
                                <div className="flex items-center justify-between mb-5">
                                    <div>
                                        <h3 className="text-lg font-bold text-gray-900 dark:text-white tracking-tight">Channels</h3>
                                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Top Performing DIDs</p>
                                    </div>
                                    <div className="h-9 w-9 bg-gray-50 dark:bg-white/[0.04] border border-gray-200 dark:border-white/10 rounded-xl flex items-center justify-center text-gray-500 dark:text-gray-400">
                                        <Target className="h-4 w-4" />
                                    </div>
                                </div>

                                <div className="flex-1 space-y-4">
                                    {(data?.top_inbound_dids && data.top_inbound_dids.length > 0) ? (
                                        data.top_inbound_dids.map((did, idx) => (
                                            <div key={idx} className="group relative">
                                                <div className="flex items-center justify-between mb-2">
                                                    <div className="flex items-center gap-2.5">
                                                        <div className="h-8 w-8 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-800/40 rounded-lg flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                                                            <Globe className="h-4 w-4" />
                                                        </div>
                                                        <div>
                                                            <p className="text-xs font-mono font-bold text-gray-900 dark:text-white">{did.did_value}</p>
                                                            <p className="text-[10px] text-gray-400">Inbound Traffic</p>
                                                        </div>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="text-sm font-extrabold text-gray-900 dark:text-white tabular-nums">{did.inbound_calls}</p>
                                                        <p className="text-[10px] text-gray-400">Requests</p>
                                                    </div>
                                                </div>
                                                <div className="w-full h-1.5 bg-gray-100 dark:bg-white/10 rounded-full overflow-hidden">
                                                    <div
                                                        className="h-full bg-gradient-to-r from-indigo-600 to-emerald-400 rounded-full transition-all duration-1000 ease-out"
                                                        style={{ width: `${(did.inbound_calls / Math.max(data.top_inbound_dids[0]?.inbound_calls || 1, 1)) * 100}%` }}
                                                    />
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="py-10 text-center text-xs text-gray-400">
                                            No high-volume DIDs recorded yet.
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

const KPICard = ({ title, value, icon: Icon, trend, isUp, subtitle }) => {
    return (
        <div className="platform-panel-dark rounded-2xl p-4 sm:p-5 flex flex-col justify-between border border-gray-200/80 dark:border-white/10 shadow-xs hover:border-gray-300 dark:hover:border-white/20 transition-all duration-200">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5 text-gray-500 dark:text-gray-400 text-xs sm:text-sm font-medium">
                    <div className="h-8 w-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-800/40 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                        {Icon && <Icon className="h-4 w-4" />}
                    </div>
                    <span>{title}</span>
                </div>
                {trend && (
                    <div className={`flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold ${isUp ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400' : 'bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400'}`}>
                        {isUp ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                        {trend}
                    </div>
                )}
            </div>

            <div className="mt-4">
                <p className="text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight tabular-nums">{value}</p>
                {subtitle && <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{subtitle}</p>}
            </div>
        </div>
    );
};

const LegendBadge = ({ color, label }) => (
    <div className="flex items-center gap-1.5 px-2.5 py-1 bg-white dark:bg-[#151720] rounded-lg shadow-xs border border-gray-200 dark:border-white/10">
        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
        <span className="text-[10px] font-bold text-gray-700 dark:text-slate-300 uppercase tracking-wider">{label}</span>
    </div>
);

const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;

    const displayLabel = typeof label === 'number'
        ? (label === 0 ? '12:00 AM' : label === 12 ? '12:00 PM' : label < 12 ? `${label}:00 AM` : `${label - 12}:00 PM`)
        : new Date(label).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });

    return (
        <div className="bg-slate-900/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-xl p-4 min-w-[180px]">
            <p className="font-bold text-white text-xs mb-3 border-b border-white/10 pb-2">{displayLabel}</p>
            <div className="space-y-2">
                {payload.map((entry, i) => (
                    <div key={i} className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-2">
                            <span className="h-2 w-2 rounded-full" style={{ background: entry.color }} />
                            <span className="text-xs text-slate-400 capitalize">{entry.name}</span>
                        </div>
                        <span className="font-bold text-white text-sm tabular-nums">{entry.value}</span>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default AnalyticsDashboard;
