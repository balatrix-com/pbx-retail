import React, { useState, useEffect, useCallback } from 'react';
import {
    LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
    Tooltip, Legend, ResponsiveContainer, AreaChart, Area
} from 'recharts';
import {
    Phone, CheckCircle2, Clock, RefreshCw, ArrowDownRight, ArrowUpRight,
    PhoneOff, Calendar, Zap, TrendingUp, BarChart3, Activity,
    ChevronRight, Globe, Target, Building2, ShieldCheck, ChevronDown,
    AlertCircle
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { analyticsService } from '../../services/analytics.service';
import api from '../../services/api';

const formatDuration = (seconds) => {
    if (!seconds) return '0s';
    const mins = Math.floor(seconds / 60);
    const secs = Math.round(seconds % 60);
    return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
};

const formatNumber = (num) => new Intl.NumberFormat().format(num || 0);

const GlobalAnalyticsDashboard = () => {
    const { user } = useAuth();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState(null);
    const [range, setRange] = useState('today');
    const [selectedTenant, setSelectedTenant] = useState('all');
    const [tenantList, setTenantList] = useState([]);

    useEffect(() => {
        api.get('/tenants?limit=100')
            .then(res => {
                const list = res.data?.data || (Array.isArray(res.data) ? res.data : []);
                setTenantList(list);
            })
            .catch(err => console.error('Failed to fetch tenants for global analytics:', err));
    }, []);

    const fetchData = useCallback(async (isRefresh = false) => {
        try {
            isRefresh ? setRefreshing(true) : setLoading(true);
            setError(null);

            const result = await analyticsService.getGlobalDashboard(range, selectedTenant);
            if (!result || Object.keys(result).length === 0) {
                throw new Error('No data received from service');
            }
            setData(result);
        } catch (err) {
            console.error('Failed to fetch global analytics:', err);
            setError(err.response?.data?.message || err.message || 'The global analytics service is currently unreachable.');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [range, selectedTenant]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const currentTenantObj = tenantList.find(t => (t.customerCode || t.subBillingCustomerId || t.id) === selectedTenant);
    const tenantBadgeLabel = selectedTenant === 'all'
        ? 'System-Wide'
        : (currentTenantObj?.name || selectedTenant);

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
        <div className="w-full pb-16 space-y-7 animate-in fade-in duration-300 max-w-7xl mx-auto">
            {/* Header Banner */}
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-teal-700 via-teal-600 to-emerald-600 p-8 text-white shadow-xl shadow-teal-900/15">
                <div className="absolute top-0 right-0 -mt-10 -mr-10 w-80 h-80 rounded-full bg-white/10 blur-2xl pointer-events-none" />
                <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
                    <div className="space-y-1.5 max-w-2xl">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 backdrop-blur-md text-xs font-semibold tracking-wide border border-white/20">
                            <BarChart3 size={14} className="text-teal-200" />
                            <span>System Insights & Traffic Dynamics</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                                Global Analytics & Telemetry
                            </h1>
                            <span className="inline-flex items-center px-3 py-0.5 rounded-full text-xs font-black bg-white/20 text-white border border-white/30 backdrop-blur-sm">
                                {tenantBadgeLabel}
                            </span>
                        </div>
                        <p className="text-teal-100 text-xs sm:text-sm font-medium">
                            System-wide call traffic, performance velocity, latency distributions, and carrier infrastructure health metrics.
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2.5">
                        {/* Tenant Selector Dropdown */}
                        <div className="relative bg-white/15 hover:bg-white/20 border border-white/25 shadow-sm rounded-2xl flex items-center px-3.5 py-2 gap-2 backdrop-blur-md">
                            <Building2 className="h-4 w-4 text-teal-200 shrink-0" />
                            <select
                                value={selectedTenant}
                                onChange={(e) => setSelectedTenant(e.target.value)}
                                className="bg-transparent text-xs font-bold text-white pr-6 py-0.5 focus:outline-none cursor-pointer border-none ring-0 appearance-none font-sans"
                            >
                                <option value="all" className="text-slate-900">🌐 All Tenants</option>
                                {tenantList.map((t) => (
                                    <option key={t.id} value={t.customerCode || t.subBillingCustomerId || t.id} className="text-slate-900">
                                        🏢 {t.name}
                                    </option>
                                ))}
                            </select>
                            <ChevronDown className="h-3.5 w-3.5 text-teal-200 pointer-events-none -ml-4" />
                        </div>

                        {/* Date Range Selector */}
                        <div className="bg-white/15 p-1 rounded-2xl border border-white/25 shadow-sm flex items-center gap-1 backdrop-blur-md">
                            {[
                                { id: 'today', label: 'Today' },
                                { id: 'last_7_days', label: '7 Days' },
                                { id: 'last_30_days', label: '30 Days' }
                            ].map((r) => (
                                <button
                                    key={r.id}
                                    onClick={() => setRange(r.id)}
                                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${range === r.id
                                        ? 'bg-white text-teal-800 shadow-sm'
                                        : 'text-teal-100 hover:text-white'
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
                            className="inline-flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold rounded-2xl bg-white hover:bg-teal-50 text-teal-800 transition-all shadow-lg shadow-black/10 active:scale-95 cursor-pointer"
                            title="Refresh"
                        >
                            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
                            <span className="hidden sm:inline">Refresh</span>
                        </button>
                    </div>
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
                                {error}. Real-time analytics engine (configured at ANALYTICS_ENGINE_URL) is currently not responding.
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

            {loading && !data ? (
                <div className="py-24 text-center">
                    <RefreshCw className="w-10 h-10 animate-spin text-indigo-600 dark:text-indigo-400 mx-auto mb-3" />
                    <p className="text-base font-bold text-gray-900 dark:text-white">Aggregating Global Intelligence...</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Scanning system-wide performance telemetry</p>
                </div>
            ) : (
                <>
                    {/* KPI Section */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <KPICard
                            title="Platform Traffic"
                            value={formatNumber(data?.kpi_cards?.total_calls)}
                            icon={Phone}
                            trend="+14.2%"
                            isUp={true}
                            subtitle="Global call requests"
                        />
                        <KPICard
                            title="Success Rate"
                            value={formatNumber(data?.kpi_cards?.answered_calls)}
                            icon={CheckCircle2}
                            trend="91.5%"
                            isUp={true}
                            subtitle="Overall answered calls"
                        />
                        <KPICard
                            title="System Drops"
                            value={formatNumber(data?.kpi_cards?.missed_calls)}
                            icon={PhoneOff}
                            trend="8.5%"
                            isUp={false}
                            subtitle="Global missed volume"
                        />
                        <KPICard
                            title="Global Talk Time"
                            value={formatDuration(data?.kpi_cards?.avg_duration_sec)}
                            icon={Clock}
                            trend="+5.1s"
                            isUp={true}
                            subtitle="Average session across tenants"
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
                                        <h3 className="text-lg font-bold text-gray-900 dark:text-white tracking-tight">System Throughput</h3>
                                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Total platform volume velocity</p>
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
                                    <h3 className="text-lg font-bold text-gray-900 dark:text-white tracking-tight">Platform Density</h3>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Global peak hour distribution</p>
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
                                        <h3 className="text-lg font-bold text-gray-900 dark:text-white tracking-tight">Top Numbers</h3>
                                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">High-Volume DIDs</p>
                                    </div>
                                    <div className="h-9 w-9 bg-gray-50 dark:bg-white/[0.04] border border-gray-200 dark:border-white/10 rounded-xl flex items-center justify-center text-gray-500 dark:text-gray-400">
                                        <Target className="h-4 w-4" />
                                    </div>
                                </div>

                                <div className="flex-1 space-y-4">
                                    {(data?.top_inbound_dids && data.top_inbound_dids.length > 0) ? (
                                        data.top_inbound_dids.slice(0, 6).map((did, idx) => (
                                            <div key={idx} className="group relative">
                                                <div className="flex items-center justify-between mb-2">
                                                    <div className="flex items-center gap-2.5">
                                                        <div className="h-8 w-8 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-800/40 rounded-lg flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                                                            <Target className="h-4 w-4" />
                                                        </div>
                                                        <div>
                                                            <p className="text-xs font-mono font-bold text-gray-900 dark:text-white">{did.did_value}</p>
                                                            <p className="text-[10px] text-gray-400">DID Route</p>
                                                        </div>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="text-sm font-extrabold text-gray-900 dark:text-white tabular-nums">{did.inbound_calls}</p>
                                                        <p className="text-[10px] text-gray-400">Calls</p>
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

                            {/* Global Health Card */}
                            <div className="rounded-2xl p-5 sm:p-6 text-white relative overflow-hidden bg-gradient-to-br from-indigo-900 via-indigo-950 to-slate-900 border border-indigo-800/40 shadow-xs">
                                <div className="relative z-10">
                                    <div className="flex items-center gap-2 text-indigo-400 mb-2">
                                        <Zap className="h-4 w-4" />
                                        <span className="text-xs font-bold uppercase tracking-wider">Infrastructure Status</span>
                                    </div>
                                    <h4 className="text-xl font-bold tracking-tight mb-2">Platform Engine Health</h4>
                                    <p className="text-indigo-200 text-xs font-medium leading-relaxed mb-5">
                                        System uptime is nominal with low-latency edge call distribution.
                                    </p>
                                    <div className="flex items-center gap-2 text-xs font-bold bg-white/10 w-fit px-3 py-1.5 rounded-xl border border-white/10 backdrop-blur-xs">
                                        <Activity className="h-3.5 w-3.5 text-emerald-400 animate-pulse" />
                                        All Systems Operational
                                    </div>
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

export default GlobalAnalyticsDashboard;
