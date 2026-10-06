import React, { useState, useEffect, useCallback } from 'react';
import {
    LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
    Tooltip, Legend, ResponsiveContainer, AreaChart, Area
} from 'recharts';
import {
    Phone, CheckCircle2, Clock, RefreshCw, ArrowDownRight, ArrowUpRight,
    PhoneOff, Calendar, Zap, TrendingUp, BarChart3, Activity,
    ChevronRight, MoreHorizontal, Globe, Target
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

    const customerId = user?.tenant?.customerCode;
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
            setError(err.response?.data?.message || err.message || 'The analytics service is currently unreachable. Please contact support if the issue persists.');
            setData(null);
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

    if (!hasTenant) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[600px] space-y-6">
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl text-amber-700 text-sm font-black uppercase tracking-widest">
                    Tenant Context Required
                </div>
                <div className="text-center">
                    <p className="text-xl font-black text-gray-900 tracking-tight uppercase">No Data to Display</p>
                    <p className="text-sm font-medium text-gray-400 mt-1 uppercase tracking-widest text-center max-w-xs">
                        This user account is not linked to an active tenant. Analytics are only available for tenant admins.
                    </p>
                </div>
            </div>
        );
    }

    if (loading && !data) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[600px] space-y-6">
                <div className="relative">
                    <div className="h-20 w-20 rounded-full border-4 border-gray-100 border-t-indigo-600 animate-spin"></div>
                    <Activity className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-8 w-8 text-indigo-600 animate-pulse" />
                </div>
                <div className="text-center">
                    <p className="text-xl font-black text-gray-900 tracking-tight uppercase">Syncing Intelligence</p>
                    <p className="text-sm font-medium text-gray-400 mt-1 uppercase tracking-widest">Aggregating global call data...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-[1600px] mx-auto p-6 lg:p-10 space-y-10 bg-transparent min-h-screen font-sans animate-in fade-in duration-700">
            
            {/* Minimal Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                    <div className="flex items-center gap-3 mb-2">
                        <div className="h-8 w-1 bg-indigo-600 rounded-full" />
                        <h2 className="text-sm font-black text-indigo-600 uppercase tracking-[0.3em]">Operational Pulse</h2>
                    </div>
                    <h1 className="text-4xl font-black text-slate-900 tracking-tight flex items-center gap-4">
                        Analytics <span className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded-2xl text-2xl font-black">{customerId}</span>
                    </h1>
                </div>

                <div className="flex items-center gap-3">
                    <div className="bg-white p-1.5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-1">
                        {['today', 'last_7_days', 'last_30_days'].map((r) => (
                            <button
                                key={r}
                                onClick={() => setRange(r)}
                                className={`px-5 py-2 rounded-xl text-[11px] font-black uppercase tracking-wider transition-all ${
                                    range === r 
                                    ? 'bg-slate-900 text-white shadow-md' 
                                    : 'text-slate-500 hover:bg-slate-50'
                                }`}
                            >
                                {r.replace(/_/g, ' ')}
                            </button>
                        ))}
                    </div>
                    <button
                        onClick={() => fetchData(true)}
                        disabled={refreshing}
                        className="h-11 w-11 flex items-center justify-center bg-white border border-slate-200 rounded-2xl shadow-sm hover:border-indigo-300 hover:text-indigo-600 transition-all active:scale-95 disabled:opacity-50 group"
                    >
                        <RefreshCw className={`h-5 w-5 ${refreshing ? 'animate-spin' : 'group-hover:rotate-180 transition-transform duration-500'}`} />
                    </button>
                </div>
            </div>

            {/* KPI Section */}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
                <KPICard
                    title="Gross Volume"
                    value={formatNumber(data?.kpi_cards?.total_calls)}
                    icon={Phone}
                    trend="+12.5%"
                    isUp={true}
                    color="indigo"
                    subtitle="Total call requests processed"
                />
                <KPICard
                    title="Conversion"
                    value={formatNumber(data?.kpi_cards?.answered_calls)}
                    icon={CheckCircle2}
                    trend="89.2%"
                    isUp={true}
                    color="emerald"
                    subtitle="Answer rate performance"
                />
                <KPICard
                    title="Drop-off"
                    value={formatNumber(data?.kpi_cards?.missed_calls)}
                    icon={PhoneOff}
                    trend="10.8%"
                    isUp={false}
                    color="rose"
                    subtitle="Missed/Rejected volume"
                />
                <KPICard
                    title="Talk Time"
                    value={formatDuration(data?.kpi_cards?.avg_duration_sec)}
                    icon={Clock}
                    trend="-2.4s"
                    isUp={false}
                    color="amber"
                    subtitle="Average session duration"
                />
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                
                {/* Large Chart Area */}
                <div className="lg:col-span-8 space-y-8">
                    
                    {/* Velocity Chart */}
                    <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-slate-200/60 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
                            <TrendingUp className="h-48 w-48" />
                        </div>
                        
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10 relative z-10">
                            <div>
                                <h3 className="text-2xl font-black text-slate-900 tracking-tight">Traffic Velocity</h3>
                                <p className="text-xs font-black text-slate-400 mt-1 uppercase tracking-[0.2em]">Call distribution over time</p>
                            </div>
                            <div className="flex items-center gap-4 bg-slate-50 p-2 rounded-2xl border border-slate-100">
                                <LegendBadge color="#4f46e5" label="Inbound" />
                                <LegendBadge color="#10b981" label="Outbound" />
                            </div>
                        </div>

                        <div className="h-[450px] w-full relative z-10">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={processedDailyTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="colorIn" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.1}/>
                                            <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                                        </linearGradient>
                                        <linearGradient id="colorOut" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.1}/>
                                            <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
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
                                        stroke="#4f46e5" 
                                        strokeWidth={4}
                                        fillOpacity={1} 
                                        fill="url(#colorIn)" 
                                        animationDuration={1500}
                                        activeDot={{ r: 8, strokeWidth: 0, fill: '#4f46e5' }}
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
                    <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-slate-200/60">
                        <div className="mb-10">
                            <h3 className="text-2xl font-black text-slate-900 tracking-tight">Hourly Density</h3>
                            <p className="text-xs font-black text-slate-400 mt-1 uppercase tracking-[0.2em]">Peak performance windows</p>
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
                                        tickFormatter={(h) => h === 0 ? '12A' : h === 12 ? '12P' : h < 12 ? `${h}A` : `${h-12}P`}
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
                                        fill="#4f46e5" 
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
                <div className="lg:col-span-4 space-y-8">
                    
                    {/* Top DID Performance */}
                    <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-slate-200/60 flex flex-col h-full">
                        <div className="flex items-center justify-between mb-10">
                            <div>
                                <h3 className="text-2xl font-black text-slate-900 tracking-tight">Channels</h3>
                                <p className="text-xs font-black text-slate-400 mt-1 uppercase tracking-[0.2em]">Top Performing DIDs</p>
                            </div>
                            <div className="h-10 w-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400">
                                <Target className="h-5 w-5" />
                            </div>
                        </div>

                        <div className="flex-1 space-y-8">
                            {data?.top_inbound_dids?.map((did, idx) => (
                                <div key={idx} className="group relative">
                                    <div className="flex items-center justify-between mb-3">
                                        <div className="flex items-center gap-4">
                                            <div className="h-10 w-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-all duration-300 shadow-sm">
                                                <Globe className="h-5 w-5" />
                                            </div>
                                            <div>
                                                <p className="text-sm font-black text-slate-900 group-hover:text-indigo-600 transition-colors">{did.did_value}</p>
                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">DID Active</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-lg font-black text-slate-900 tabular-nums">{did.inbound_calls}</p>
                                            <p className="text-[10px] font-black text-slate-400 uppercase">Calls</p>
                                        </div>
                                    </div>
                                    <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden shadow-inner">
                                        <div 
                                            className="h-full bg-gradient-to-r from-indigo-500 to-emerald-400 rounded-full transition-all duration-1000 ease-out" 
                                            style={{ width: `${(did.inbound_calls / data.top_inbound_dids[0].inbound_calls) * 100}%` }}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>

                        <button className="mt-10 w-full py-4 bg-slate-900 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] text-white hover:bg-indigo-600 transition-all flex items-center justify-center gap-2 group">
                            Comprehensive Channel Audit
                            <ChevronRight className="h-3 w-3 group-hover:translate-x-1 transition-transform" />
                        </button>
                    </div>

                    {/* Quality Insights Placeholder */}
                    <div className="bg-indigo-600 rounded-[2.5rem] p-8 shadow-xl shadow-indigo-200 text-white relative overflow-hidden">
                        <div className="absolute -right-6 -bottom-6 opacity-10">
                            <Zap className="h-40 w-40" />
                        </div>
                        <div className="relative z-10">
                            <h4 className="text-xl font-black tracking-tight mb-2 uppercase">Service Quality</h4>
                            <p className="text-indigo-100 text-sm font-medium leading-relaxed mb-6">
                                Your average latency is <span className="text-white font-black underline underline-offset-4 decoration-indigo-300">24ms</span> across global endpoints.
                            </p>
                            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest bg-white/10 w-fit px-3 py-1.5 rounded-lg border border-white/10 backdrop-blur-sm">
                                <Activity className="h-3 w-3 text-emerald-400" />
                                Optimal Connectivity
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
        ? (label === 0 ? '12:00 AM' : label === 12 ? '12:00 PM' : label < 12 ? `${label}:00 AM` : `${label-12}:00 PM`)
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

export default AnalyticsDashboard;
