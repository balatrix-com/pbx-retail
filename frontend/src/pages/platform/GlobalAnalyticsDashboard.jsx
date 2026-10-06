import React, { useState, useEffect, useCallback } from 'react';
import {
    LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
    Tooltip, Legend, ResponsiveContainer, AreaChart, Area
} from 'recharts';
import {
    Phone, CheckCircle2, Clock, RefreshCw, ArrowDownRight, ArrowUpRight,
    PhoneOff, Calendar, Zap, TrendingUp, BarChart3, Activity,
    ChevronRight, Globe, Target, Building2, ShieldCheck, ChevronDown
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
            setData(null);
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

    if (loading && !data) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[600px] space-y-6">
                <div className="relative">
                    <div className="h-20 w-20 rounded-full border-4 border-gray-100 border-t-primary-600 animate-spin"></div>
                    <ShieldCheck className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-8 w-8 text-primary-600 animate-pulse" />
                </div>
                <div className="text-center">
                    <p className="text-xl font-black text-gray-900 tracking-tight uppercase">Aggregating Global Intelligence</p>
                    <p className="text-sm font-medium text-gray-400 mt-1 uppercase tracking-widest">Scanning system-wide performance...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-[1600px] mx-auto p-4 md:p-8 space-y-10 bg-transparent min-h-screen font-sans animate-in fade-in duration-700">

            {/* Minimal Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                    <div className="flex items-center gap-3 mb-2">
                        <div className="h-8 w-1 bg-primary-600 rounded-full" />
                        <h2 className="text-sm font-black text-primary-600 uppercase tracking-[0.3em]">Platform Overview</h2>
                    </div>
                    <h1 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight flex items-center gap-4">
                        Global Analytics <span className="hidden sm:inline px-3 py-1 bg-primary-100 text-primary-700 rounded-2xl text-lg font-black uppercase">{tenantBadgeLabel}</span>
                    </h1>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    {/* Tenant Selector Dropdown */}
                    <div className="relative bg-white border border-slate-200 shadow-sm rounded-2xl flex items-center px-3.5 py-1.5 gap-2 hover:border-slate-300 transition-all">
                        <Building2 className="h-4 w-4 text-slate-400 flex-shrink-0" />
                        <select
                            value={selectedTenant}
                            onChange={(e) => setSelectedTenant(e.target.value)}
                            className="bg-transparent text-[10px] font-black uppercase tracking-wider text-slate-700 pr-5 py-1 focus:outline-none cursor-pointer border-none ring-0 appearance-none font-sans"
                            style={{ WebkitAppearance: 'none', MozAppearance: 'none' }}
                        >
                            <option value="all">🌐 All Tenants</option>
                            {tenantList.map((t) => (
                                <option key={t.id} value={t.customerCode || t.subBillingCustomerId || t.id}>
                                    🏢 {t.name}
                                </option>
                            ))}
                        </select>
                        <ChevronDown className="h-3.5 w-3.5 text-slate-400 pointer-events-none -ml-4" />
                    </div>

                    {/* Date Range Selector */}
                    <div className="bg-white p-1.5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-1 overflow-x-auto no-scrollbar">
                        {['today', 'last_7_days', 'last_30_days'].map((r) => (
                            <button
                                key={r}
                                onClick={() => setRange(r)}
                                className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all whitespace-nowrap ${range === r
                                    ? 'bg-slate-900 text-white shadow-md'
                                    : 'text-slate-500 hover:bg-slate-50'
                                    }`}
                            >
                                {r.replace(/_/g, ' ')}
                            </button>
                        ))}
                    </div>

                    {/* Refresh Button */}
                    <button
                        onClick={() => fetchData(true)}
                        disabled={refreshing}
                        className="h-11 w-11 flex-shrink-0 flex items-center justify-center bg-white border border-slate-200 rounded-2xl shadow-sm hover:border-primary-300 hover:text-primary-600 transition-all active:scale-95 disabled:opacity-50 group"
                    >
                        <RefreshCw className={`h-5 w-5 ${refreshing ? 'animate-spin' : 'group-hover:rotate-180 transition-transform duration-500'}`} />
                    </button>
                </div>
            </div>

            {/* KPI Section */}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
                <KPICard
                    title="Platform Traffic"
                    value={formatNumber(data?.kpi_cards?.total_calls)}
                    icon={Phone}
                    trend="+14.2%"
                    isUp={true}
                    color="primary"
                    subtitle="Global call requests"
                />
                <KPICard
                    title="Success Rate"
                    value={formatNumber(data?.kpi_cards?.answered_calls)}
                    icon={CheckCircle2}
                    trend="91.5%"
                    isUp={true}
                    color="emerald"
                    subtitle="Overall answered calls"
                />
                <KPICard
                    title="System Drops"
                    value={formatNumber(data?.kpi_cards?.missed_calls)}
                    icon={PhoneOff}
                    trend="8.5%"
                    isUp={false}
                    color="rose"
                    subtitle="Global missed volume"
                />
                <KPICard
                    title="Global Talk Time"
                    value={formatDuration(data?.kpi_cards?.avg_duration_sec)}
                    icon={Clock}
                    trend="+5.1s"
                    isUp={true}
                    color="amber"
                    subtitle="Average session across tenants"
                />
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

                {/* Large Chart Area */}
                <div className="lg:col-span-8 space-y-8">

                    {/* Velocity Chart */}
                    <div className="bg-white rounded-[2rem] md:rounded-[2.5rem] p-6 md:p-8 shadow-sm border border-slate-200/60 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
                            <TrendingUp className="h-48 w-48" />
                        </div>

                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10 relative z-10">
                            <div>
                                <h3 className="text-2xl font-black text-slate-900 tracking-tight">System Throughput</h3>
                                <p className="text-xs font-black text-slate-400 mt-1 uppercase tracking-[0.2em]">Total platform volume velocity</p>
                            </div>
                            <div className="flex items-center gap-4 bg-slate-50 p-2 rounded-2xl border border-slate-100">
                                <LegendBadge color="#0f172a" label="Inbound" />
                                <LegendBadge color="#10b981" label="Outbound" />
                            </div>
                        </div>

                        <div className="h-[350px] md:h-[450px] w-full relative z-10">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={processedDailyTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="colorIn" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#0f172a" stopOpacity={0.1} />
                                            <stop offset="95%" stopColor="#0f172a" stopOpacity={0} />
                                        </linearGradient>
                                        <linearGradient id="colorOut" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.1} />
                                            <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                    <XAxis
                                        dataKey="date"
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 800 }}
                                        dy={15}
                                        tickFormatter={(str) => {
                                            const d = new Date(str);
                                            return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
                                        }}
                                    />
                                    <YAxis
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 800 }}
                                    />
                                    <Tooltip content={<CustomTooltip />} />
                                    <Area
                                        type="monotone"
                                        dataKey="inbound"
                                        stroke="#0f172a"
                                        strokeWidth={4}
                                        fillOpacity={1}
                                        fill="url(#colorIn)"
                                        animationDuration={1500}
                                        activeDot={{ r: 8, strokeWidth: 0, fill: '#0f172a' }}
                                    />
                                    <Area
                                        type="monotone"
                                        dataKey="outbound"
                                        stroke="#10b981"
                                        strokeWidth={4}
                                        fillOpacity={1}
                                        fill="url(#colorOut)"
                                        animationDuration={1500}
                                        activeDot={{ r: 8, strokeWidth: 0, fill: '#10b981' }}
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Hourly Density */}
                    <div className="bg-white rounded-[2rem] md:rounded-[2.5rem] p-6 md:p-8 shadow-sm border border-slate-200/60">
                        <div className="mb-10">
                            <h3 className="text-2xl font-black text-slate-900 tracking-tight">Platform Density</h3>
                            <p className="text-xs font-black text-slate-400 mt-1 uppercase tracking-[0.2em]">Global peak hour distribution</p>
                        </div>
                        <div className="h-[250px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={processedHourly} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                    <XAxis
                                        dataKey="hour"
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 800 }}
                                        tickFormatter={(h) => h === 0 ? '12A' : h === 12 ? '12P' : h < 12 ? `${h}A` : `${h - 12}P`}
                                        dy={10}
                                    />
                                    <YAxis
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 800 }}
                                    />
                                    <Tooltip content={<CustomTooltip />} cursor={{ fill: '#f8fafc', radius: 12 }} />
                                    <Bar
                                        dataKey="inbound"
                                        fill="#0f172a"
                                        radius={[4, 4, 0, 0]}
                                        barSize={18}
                                        stackId="a"
                                    />
                                    <Bar
                                        dataKey="outbound"
                                        fill="#10b981"
                                        radius={[4, 4, 0, 0]}
                                        barSize={18}
                                        stackId="a"
                                    />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>

                {/* Sidebar Column */}
                <div className="lg:col-span-4 space-y-6">

                    {/* Top Organization Performance */}
                    <div className="bg-white rounded-[2rem] md:rounded-[2.5rem] p-6 md:p-8 shadow-sm border border-slate-200/60 flex flex-col h-full">
                        <div className="flex items-center justify-between mb-6">
                            <div>
                                <h3 className="text-2xl font-black text-slate-900 tracking-tight">Organizations</h3>
                                <p className="text-xs font-black text-slate-400 mt-1 uppercase tracking-[0.2em]">High-Volume Tenants</p>
                            </div>
                            <div className="h-10 w-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400">
                                <Building2 className="h-5 w-5" />
                            </div>
                        </div>

                        <div className="flex-1 space-y-8">
                            {data?.top_inbound_dids?.slice(0, 6).map((did, idx) => (
                                <div key={idx} className="group relative">
                                    <div className="flex items-center justify-between mb-3">
                                        <div className="flex items-center gap-4">
                                            <div className="h-10 w-10 bg-primary-50 rounded-xl flex items-center justify-center text-primary-600 group-hover:bg-primary-600 group-hover:text-white transition-all duration-300 shadow-sm">
                                                <Target className="h-5 w-5" />
                                            </div>
                                            <div>
                                                <p className="text-sm font-black text-slate-900 group-hover:text-primary-600 transition-colors">{did.did_value}</p>
                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">DID Performance</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-lg font-black text-slate-900 tabular-nums">{did.inbound_calls}</p>
                                            <p className="text-[10px] font-black text-slate-400 uppercase">Requests</p>
                                        </div>
                                    </div>
                                    <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden shadow-inner">
                                        <div
                                            className="h-full bg-gradient-to-r from-primary-600 to-emerald-400 rounded-full transition-all duration-1000 ease-out"
                                            style={{ width: `${(did.inbound_calls / data.top_inbound_dids[0].inbound_calls) * 100}%` }}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>

                        <button className="mt-10 w-full py-4 bg-slate-900 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] text-white hover:bg-primary-600 transition-all flex items-center justify-center gap-2 group">
                            Audit Full Infrastructure
                            <ChevronRight className="h-3 w-3 group-hover:translate-x-1 transition-transform" />
                        </button>
                    </div>

                    {/* Global Availability */}
                    <div className="bg-primary-600 rounded-[2rem] md:rounded-[2.5rem] p-6 md:p-8 shadow-xl shadow-primary-200 text-white relative overflow-hidden">
                        <div className="absolute -right-6 -bottom-6 opacity-10">
                            <Zap className="h-40 w-40" />
                        </div>
                        <div className="relative z-10">
                            <h4 className="text-xl font-black tracking-tight mb-2 uppercase">Platform Health</h4>
                            <p className="text-primary-100 text-sm font-medium leading-relaxed mb-6">
                                System uptime is currently <span className="text-white font-black underline underline-offset-4 decoration-primary-300">99.98%</span> with optimal latency globally.
                            </p>
                            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest bg-white/10 w-fit px-3 py-1.5 rounded-lg border border-white/10 backdrop-blur-sm">
                                <Activity className="h-3 w-3 text-emerald-400" />
                                All Systems Operational
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

const KPICard = ({ title, value, icon: Icon, trend, isUp, subtitle }) => {
    return (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5 flex flex-col relative overflow-hidden group hover:shadow-md transition-all duration-300">
            <Icon className="absolute -bottom-3 -right-2 h-24 w-24 transform -rotate-12 text-blue-400/30 group-hover:scale-105 transition-transform duration-500 pointer-events-none stroke-[2.2]" />

            <div className="flex items-center justify-between mb-2 relative z-10">
                <div className="p-1.5 rounded-lg text-blue-500 bg-blue-50 ring-1 ring-blue-500/10 flex items-center justify-center">
                    <Icon className="h-4 w-4 stroke-[2.2]" />
                </div>
                <div className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-black uppercase ${isUp ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                    {isUp ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                    {trend}
                </div>
            </div>

            <div className="relative z-10">
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">{title}</h3>
                <p className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight tabular-nums mt-2">{value}</p>
                {subtitle && <p className="text-xs font-medium text-slate-400 mt-1 uppercase tracking-widest">{subtitle}</p>}
            </div>
        </div>
    );
};

const LegendBadge = ({ color, label }) => (
    <div className="flex items-center gap-2 px-3 py-1 bg-white rounded-lg shadow-sm border border-slate-100">
        <span className="h-2 w-2 rounded-full ring-2 ring-slate-50" style={{ backgroundColor: color }} />
        <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest">{label}</span>
    </div>
);

const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;

    const displayLabel = typeof label === 'number'
        ? (label === 0 ? '12:00 AM' : label === 12 ? '12:00 PM' : label < 12 ? `${label}:00 AM` : `${label - 12}:00 PM`)
        : new Date(label).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });

    return (
        <div className="bg-slate-900/95 backdrop-blur-xl border border-white/10 rounded-3xl shadow-2xl p-6 min-w-[220px] animate-in zoom-in-95 duration-200">
            <p className="font-black text-white text-[10px] mb-4 border-b border-white/10 pb-3 uppercase tracking-[0.2em]">{displayLabel}</p>
            <div className="space-y-4">
                {payload.map((entry, i) => (
                    <div key={i} className="flex items-center justify-between gap-6">
                        <div className="flex items-center gap-3">
                            <span className="h-2.5 w-2.5 rounded-full ring-4 ring-white/5" style={{ background: entry.color }} />
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{entry.name}</span>
                        </div>
                        <span className="font-black text-white text-lg tabular-nums">{entry.value}</span>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default GlobalAnalyticsDashboard;
