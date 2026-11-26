import React, { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import telecomService from '../../services/telecom.service';
import api from '../../services/api';
import {
    Phone,
    PhoneCall,
    PhoneIncoming,
    PhoneOutgoing,
    PhoneForwarded,
    Mic,
    Volume2,
    Shield,
    Activity,
    RotateCw,
    Globe,
    Building2,
    ChevronDown,
    Radio,
    Clock,
    User,
    Wifi,
    WifiOff,
    CheckCircle2,
    AlertTriangle,
    SlidersHorizontal,
    Search
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import clsx from 'clsx';
import CreativeStatCard from '../../components/common/CreativeStatCard';

const MonitoringPage = () => {
    const { user } = useAuth();
    const [calls, setCalls] = useState([]);
    const [tenants, setTenants] = useState([]);
    const [selectedTenantId, setSelectedTenantId] = useState('all');
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [socket, setSocket] = useState(null);
    const [isConnected, setIsConnected] = useState(false);
    const [bargeStatus, setBargeStatus] = useState('');
    const [currentTime, setCurrentTime] = useState(Date.now());
    const [searchFilter, setSearchFilter] = useState('');
    const [statusFilter, setStatusFilter] = useState('ALL');

    const isSuperAdmin = user?.role === 'SUPER_ADMIN';
    const targetTenantId = isSuperAdmin ? selectedTenantId : user?.tenantId;
    const adminExtension = user?.monitoringExtension || user?.extension;

    // 1-second timer ticker for live call durations
    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentTime(Date.now());
        }, 1000);
        return () => clearInterval(timer);
    }, []);

    // Fetch tenant list for Super Admin dropdown filter
    useEffect(() => {
        if (isSuperAdmin) {
            api.get('/tenants?limit=100')
                .then(res => {
                    const tenantList = res.data?.data || (Array.isArray(res.data) ? res.data : []);
                    setTenants(tenantList);
                })
                .catch(err => console.error('Failed to load tenants for selector:', err));
        }
    }, [isSuperAdmin]);

    // Connect socket once on mount
    useEffect(() => {
        const token = sessionStorage.getItem('accessToken') || localStorage.getItem('accessToken');

        if (!token) {
            console.error('No access token found for monitoring socket');
            return;
        }

        const baseUrl = (import.meta.env.VITE_API_URL || 'http://localhost:3000').replace(/\/api\/?$/, '');
        const socketUrl = `${baseUrl.replace(/\/$/, '')}/monitor`;
        const socketPath = '/api/socket.io';

        const newSocket = io(socketUrl, {
            path: socketPath,
            transports: ['websocket', 'polling'],
            auth: {
                token: token
            },
            reconnection: true,
            reconnectionAttempts: 5
        });

        newSocket.on('connect_error', (err) => {
            console.error('Socket Connection Error:', err.message);
        });

        newSocket.on('connect', () => {
            console.log('Monitor Socket Connected');
            setIsConnected(true);
        });

        newSocket.on('disconnect', (reason) => {
            console.log('Monitor Socket Disconnected:', reason);
            setIsConnected(false);
        });

        newSocket.on('room_joined', (data) => {
            console.log('Successfully joined room:', data);
        });

        newSocket.on('error', (err) => {
            console.error('Socket Error:', err);
        });

        newSocket.on('call_update', (callData) => {
            console.log('Received call_update:', callData);
            handleCallUpdate(callData);
        });

        newSocket.on('pong', (data) => {
            console.log('Pong received:', data);
            alert(`Pong! Server time: ${new Date(data.time).toLocaleTimeString()}`);
        });

        setSocket(newSocket);

        return () => {
            newSocket.disconnect();
        };
    }, []);

    // Smooth tenant switching without socket reconnect: join new room & refresh calls
    useEffect(() => {
        if (!targetTenantId) return;

        if (socket && isConnected) {
            console.log('Switching to room:', targetTenantId);
            socket.emit('join_room', targetTenantId);
        }

        loadActiveCalls();
    }, [targetTenantId, socket, isConnected]);

    const sendPing = () => {
        if (socket) {
            console.log('Sending ping...');
            socket.emit('ping');
        }
    };

    const loadActiveCalls = async () => {
        setRefreshing(true);
        try {
            const res = await telecomService.getActiveCalls(targetTenantId);
            setCalls(res.data.calls || []);
        } catch (err) {
            console.error('Failed to load active calls', err);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const handleCallUpdate = (callData) => {
        setCalls(prevCalls => {
            const index = prevCalls.findIndex(c => c.uuid === callData.uuid);
            let status = callData.status || callData.call_status;

            if (status === 'connected') status = 'answered';

            if (['hangup', 'failed', 'busy', 'no_answer', 'declined'].includes(status)) {
                if (index === -1) return prevCalls;

                const updated = [...prevCalls];
                updated[index] = { ...updated[index], ...callData, status: 'ended', originalStatus: status };

                setTimeout(() => {
                    setCalls(current => current.filter(c => c.uuid !== callData.uuid));
                }, 5000);

                return updated;
            }

            if (index >= 0) {
                const updated = [...prevCalls];
                updated[index] = {
                    ...updated[index],
                    ...callData,
                    status
                };
                return updated;
            } else {
                return [{ ...callData, status }, ...prevCalls];
            }
        });
    };

    const handleBarge = async (call, mode) => {
        if (!adminExtension) {
            alert('Admin extension is required to barge. Please configure your extension.');
            return;
        }

        setBargeStatus(`Initiating ${mode}...`);
        try {
            await telecomService.bargeCall({
                uuid_in: call.uuid,
                uuid_out: call.bUuid || call.uuid,
                adminExtension,
                mode
            });
            setBargeStatus(`${mode} initiated! Your phone should ring.`);
            setTimeout(() => setBargeStatus(''), 5000);
        } catch (err) {
            console.error('Barge failed', err);
            setBargeStatus(`Failed: ${err.response?.data?.message || err.message}`);
        }
    };

    const formatDuration = (seconds) => {
        if (!seconds) return '00:00';
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    const getLiveDuration = (call) => {
        // If call has ended, show the final recorded duration
        if (call.status === 'ended' && call.duration) {
            return call.duration;
        }

        // Measure from answerTime if answered, otherwise from startTime if ringing
        const baseTime = call.status === 'answered' ? (call.answerTime || call.startTime) : call.startTime;
        if (!baseTime) return call.duration || 0;

        let startMs = 0;
        if (typeof baseTime === 'number') {
            startMs = baseTime > 1e11 ? baseTime : baseTime * 1000;
        } else if (typeof baseTime === 'string') {
            const num = parseInt(baseTime, 10);
            if (!isNaN(num)) {
                startMs = num > 1e11 ? num : num * 1000;
            } else {
                startMs = new Date(baseTime).getTime();
            }
        } else if (baseTime instanceof Date) {
            startMs = baseTime.getTime();
        }

        if (!startMs || isNaN(startMs)) return call.duration || 0;
        return Math.max(0, Math.floor((currentTime - startMs) / 1000));
    };

    // Derived stats
    const activeCallsCount = calls.filter(c => c.status === 'answered').length;
    const ringingCallsCount = calls.filter(c => c.status === 'ringing').length;
    const endedCallsCount = calls.filter(c => c.status === 'ended').length;

    // Filter calls based on search and status
    const filteredCalls = calls.filter(call => {
        const matchesStatus = statusFilter === 'ALL' ||
            (statusFilter === 'ANSWERED' && call.status === 'answered') ||
            (statusFilter === 'RINGING' && call.status === 'ringing') ||
            (statusFilter === 'ENDED' && call.status === 'ended');

        if (!matchesStatus) return false;

        if (!searchFilter.trim()) return true;

        const q = searchFilter.toLowerCase();
        return (
            call.caller?.toLowerCase().includes(q) ||
            call.destValue?.toLowerCase().includes(q) ||
            call.tenantId?.toLowerCase().includes(q) ||
            call.uuid?.toLowerCase().includes(q)
        );
    });

    if (loading) return (
        <div className="w-full pb-12">
            <div className="animate-pulse space-y-6">
                <div className="h-10 bg-gray-200 dark:bg-white/5 rounded-2xl w-1/4"></div>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                    <div className="h-28 bg-gray-200 dark:bg-white/5 rounded-2xl"></div>
                    <div className="h-28 bg-gray-200 dark:bg-white/5 rounded-2xl"></div>
                    <div className="h-28 bg-gray-200 dark:bg-white/5 rounded-2xl"></div>
                    <div className="h-28 bg-gray-200 dark:bg-white/5 rounded-2xl"></div>
                </div>
                <div className="h-96 bg-gray-200 dark:bg-white/5 rounded-2xl"></div>
            </div>
        </div>
    );

    return (
        <div className="w-full pb-16 space-y-7 animate-in fade-in duration-300 max-w-7xl mx-auto">
            {/* Header Section */}
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-teal-700 via-teal-600 to-emerald-600 p-8 text-white shadow-xl shadow-teal-900/15">
                <div className="absolute top-0 right-0 -mt-10 -mr-10 w-80 h-80 rounded-full bg-white/10 blur-2xl pointer-events-none" />
                <div className="relative z-10 flex flex-col xl:flex-row xl:items-center xl:justify-between gap-6">
                    <div className="space-y-1.5 max-w-2xl">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 backdrop-blur-md text-xs font-semibold tracking-wide border border-white/20">
                            <Activity size={14} className="text-teal-200" />
                            <span>Real-Time FreeSWITCH Stream Surveillance</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                                {isSuperAdmin ? 'Platform Live Call Surveillance' : 'Live Call Monitoring'}
                            </h1>
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-0.5 text-xs font-black text-white border border-white/30 backdrop-blur-sm">
                                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse"></span>
                                {calls.length} Live Streams
                            </span>
                        </div>
                        <p className="text-teal-100 text-xs sm:text-sm font-medium">
                            {isSuperAdmin
                                ? 'Real-time call stream surveillance, SIP diagnostic signaling, and bridge state inspection across all clusters.'
                                : 'Real-time call oversight, silent listening, whisper coaching, and barge operations.'}
                        </p>
                    </div>

                    {/* Status Ticker & Extension Card */}
                    <div className="bg-white/15 backdrop-blur-md rounded-2xl border border-white/25 p-2 px-3.5 flex flex-wrap items-center gap-3 shadow-sm">
                        {/* Super Admin Tenant Selector */}
                        {isSuperAdmin && (
                            <div className="relative bg-white/15 border border-white/20 rounded-xl flex items-center px-3 py-1.5 gap-2">
                                <Building2 className="h-4 w-4 text-teal-200 shrink-0" />
                                <select
                                    value={selectedTenantId}
                                    onChange={(e) => setSelectedTenantId(e.target.value)}
                                    className="bg-transparent text-xs font-bold text-white pr-5 py-0.5 focus:outline-none cursor-pointer border-none ring-0 appearance-none font-sans"
                                >
                                    <option value="all" className="text-slate-900">🌐 All Tenants</option>
                                    {tenants.map((t) => (
                                        <option key={t.id} value={t.id} className="text-slate-900">
                                            🏢 {t.name}
                                        </option>
                                    ))}
                                </select>
                                <ChevronDown className="h-3.5 w-3.5 text-teal-200 pointer-events-none -ml-4" />
                            </div>
                        )}

                        {/* Socket connection indicator */}
                        <div className="flex items-center space-x-2 border-r border-white/20 pr-3">
                            <div className={`h-2.5 w-2.5 rounded-full ${isConnected ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)] animate-pulse' : 'bg-rose-400'}`}></div>
                            <span className="text-[11px] font-extrabold text-white font-mono tracking-wide">
                                {isConnected ? 'STREAM ONLINE' : 'STREAM OFFLINE'}
                            </span>
                            <button
                                onClick={sendPing}
                                className="inline-flex items-center justify-center rounded-lg bg-white/20 hover:bg-white/30 px-2 py-0.5 text-[10px] font-black text-white transition-colors uppercase tracking-wider cursor-pointer"
                                title="Ping WebSocket"
                            >
                                PING
                            </button>
                        </div>

                        {/* Admin Extension Indicator */}
                        {!adminExtension ? (
                            <div className="text-[10px] font-bold text-amber-200 bg-amber-500/30 px-2.5 py-1 rounded-xl border border-amber-300/30">
                                ⚠️ No Monitoring Ext
                            </div>
                        ) : (
                            <div className="text-xs font-medium text-teal-100 flex items-center gap-1.5">
                                Ext: <span className="inline-flex items-center rounded-lg bg-white/20 px-2.5 py-0.5 text-xs font-mono font-bold text-white">{adminExtension}</span>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Quick KPI Live Diagnostic Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <CreativeStatCard
                    title="Active Connected"
                    value={activeCallsCount}
                    subtitle="Two-way audio bridges established"
                    icon={PhoneCall}
                    color="blue"
                    badgeText="in speech"
                    trend="+12%"
                    trendUp={true}
                />
                <CreativeStatCard
                    title="Ringing / Setup"
                    value={ringingCallsCount}
                    subtitle="SIP 180 Ringing & gateway hunting"
                    icon={Activity}
                    color="amber"
                    badgeText="alerting"
                    trend="+8%"
                    trendUp={true}
                />
                <CreativeStatCard
                    title="Total Streams"
                    value={calls.length}
                    subtitle="Concurrent telemetry channels"
                    icon={Radio}
                    color="purple"
                    trend="+5%"
                    trendUp={true}
                />
                <CreativeStatCard
                    title="Barge Capability"
                    value={adminExtension ? "Enabled" : "Not Ready"}
                    subtitle="Silent Listen • Whisper • Join"
                    icon={Shield}
                    color="emerald"
                    trend={adminExtension ? "Ready" : "Disabled"}
                    trendUp={Boolean(adminExtension)}
                />
            </div>

            {/* Warning when no admin extension */}
            {!adminExtension && (
                <div className="bg-amber-50/70 dark:bg-amber-950/30 text-amber-800 dark:text-amber-300 p-4 rounded-2xl border border-amber-200/80 dark:border-amber-900/40 shadow-xs text-xs sm:text-sm flex items-start sm:items-center gap-3">
                    <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5 sm:mt-0" />
                    <div className="flex-1">
                        <strong className="font-bold text-amber-900 dark:text-amber-200 mr-1.5">Extension Configuration Needed:</strong>
                        To silently listen, whisper coach, or barge into active calls, your account must have an active monitoring extension assigned in User Management.
                    </div>
                </div>
            )}

            {/* Barge Status Notification */}
            {bargeStatus && (
                <div className="bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300 p-4 rounded-2xl border border-blue-200 dark:border-blue-900/40 shadow-xs text-sm font-bold flex items-center gap-3 animate-pulse">
                    <Volume2 className="h-5 w-5 text-blue-500" />
                    {bargeStatus}
                </div>
            )}

            {/* Active Calls Table Card */}
            <div className="bg-white dark:bg-[#0c0d12] rounded-2xl border border-gray-200/80 dark:border-white/10 shadow-xs overflow-hidden flex flex-col">
                {/* Card Header & Filter Bar */}
                <div className="p-4 sm:p-5 border-b border-gray-100 dark:border-white/5 bg-gray-50/50 dark:bg-white/[0.02] flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-800/30 flex items-center justify-center shrink-0">
                            <Activity size={18} />
                        </div>
                        <div>
                            <h2 className="text-base font-extrabold text-gray-900 dark:text-white flex items-center gap-2">
                                Live Audio Streams
                                <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-lg border border-emerald-200/50 dark:border-emerald-800/40">
                                    {filteredCalls.length}
                                </span>
                            </h2>
                            <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">Real-time WebSocket telemetry for inbound & outbound call legs</p>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2.5">
                        {/* Search Filter */}
                        <div className="relative w-full sm:w-56">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-3.5 w-3.5" />
                            <input
                                type="text"
                                placeholder="Filter caller, callee or ID..."
                                value={searchFilter}
                                onChange={(e) => setSearchFilter(e.target.value)}
                                className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-gray-200/80 dark:border-white/10 bg-white dark:bg-[#12131a] text-xs font-medium text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all shadow-2xs"
                            />
                        </div>

                        {/* Status Filter Segment */}
                        <div className="flex items-center p-1 rounded-xl bg-slate-100 dark:bg-white/[0.04] border border-slate-200/80 dark:border-white/10 shadow-inner">
                            {['ALL', 'ANSWERED', 'RINGING'].map((s) => (
                                <button
                                    key={s}
                                    onClick={() => setStatusFilter(s)}
                                    className={clsx(
                                        "px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer",
                                        statusFilter === s
                                            ? "bg-white dark:bg-[#181924] text-emerald-700 dark:text-emerald-400 shadow-xs border border-black/[0.04] dark:border-white/10"
                                            : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white"
                                    )}
                                >
                                    {s}
                                </button>
                            ))}
                        </div>

                        {/* Refresh Button */}
                        <button
                            onClick={loadActiveCalls}
                            disabled={refreshing}
                            className="inline-flex items-center gap-1.5 rounded-xl bg-white dark:bg-[#181924] px-3 py-1.5 text-xs font-bold text-gray-700 dark:text-gray-200 shadow-2xs border border-gray-200/80 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-white/5 transition-all focus:outline-none disabled:opacity-50 cursor-pointer"
                        >
                            <RotateCw className={`h-3.5 w-3.5 text-emerald-600 ${refreshing ? 'animate-spin' : ''}`} />
                            Refresh
                        </button>
                    </div>
                </div>

                {/* Content Area */}
                <div className="p-6 bg-transparent flex-1 min-h-[380px] flex flex-col justify-center">
                    {filteredCalls.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20 text-center">
                            <div className="h-16 w-16 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-4 border border-emerald-100 dark:border-emerald-800/30 shadow-2xs">
                                <Radio className="h-8 w-8 stroke-[2] animate-pulse" />
                            </div>
                            <h3 className="font-extrabold text-base text-gray-900 dark:text-white tracking-tight mb-1">
                                {searchFilter || statusFilter !== 'ALL'
                                    ? 'No call streams match your filter'
                                    : 'Awaiting active call streams across tenant clusters...'}
                            </h3>
                            <p className="text-xs font-medium text-gray-400 max-w-md">
                                {searchFilter || statusFilter !== 'ALL'
                                    ? 'Try resetting the search keywords or status filter above.'
                                    : 'Live calls will automatically populate in real time via Kamailio and FreeSWITCH WebSocket telemetry.'}
                            </p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
                            {filteredCalls.map(call => (
                                <div key={call.uuid} className="platform-panel-dark rounded-2xl border border-gray-200/80 dark:border-white/10 shadow-xs overflow-hidden hover:border-emerald-500/30 transition-all group flex flex-col justify-between">
                                    <div className="p-5 flex-1">
                                        {/* Call Status & Live Timer */}
                                        <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-100 dark:border-white/5">
                                            <div className="flex items-center gap-2">
                                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-extrabold uppercase tracking-widest ring-1 ring-inset ${call.status === 'answered' ? 'bg-green-50 text-green-700 ring-green-600/20' :
                                                    call.status === 'ringing' ? 'bg-amber-50 text-amber-700 ring-amber-600/20 animate-pulse' :
                                                        call.status === 'ended' ? 'bg-red-50 text-red-700 ring-red-600/20' :
                                                            'bg-blue-50 text-blue-700 ring-blue-600/20'
                                                    }`}>
                                                    <span className={`h-1.5 w-1.5 rounded-full ${call.status === 'answered' ? 'bg-green-500 animate-pulse' : call.status === 'ringing' ? 'bg-amber-500' : 'bg-gray-400'}`}></span>
                                                    {call.status}
                                                </span>
                                                {call.direction && (
                                                    <span className="text-[10px] font-mono font-bold text-gray-400 uppercase bg-gray-100 dark:bg-white/5 px-2 py-0.5 rounded-md">
                                                        {call.direction}
                                                    </span>
                                                )}
                                            </div>

                                            <div className="text-xs font-mono font-bold text-gray-900 dark:text-white flex items-center bg-gray-50/80 dark:bg-white/5 px-2.5 py-1 rounded-lg border border-gray-100 dark:border-white/5">
                                                <Clock className="w-3.5 h-3.5 text-gray-400 mr-1.5" />
                                                {formatDuration(getLiveDuration(call))}
                                            </div>
                                        </div>

                                        {/* Caller / Callee Flow Visualizer */}
                                        <div className="bg-gray-50/70 dark:bg-white/[0.02] p-3.5 rounded-xl border border-gray-100 dark:border-white/5 mb-3">
                                            <div className="flex items-center justify-between text-xs">
                                                <div className="flex flex-col">
                                                    <span className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider mb-0.5">Caller (Src)</span>
                                                    <span className="font-mono font-bold text-gray-900 dark:text-white text-sm">{call.caller}</span>
                                                </div>
                                                <div className="h-6 px-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold text-xs border border-emerald-200/50 dark:border-emerald-800/40">
                                                    ➔
                                                </div>
                                                <div className="flex flex-col items-end">
                                                    <span className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider mb-0.5">Callee (Dst)</span>
                                                    <span className="font-mono font-bold text-gray-900 dark:text-white text-sm">{call.destValue || call.callee}</span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Details Grid */}
                                        <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                                            {isSuperAdmin && call.tenantId && (
                                                <div className="col-span-2 flex justify-between items-center bg-gray-50/50 dark:bg-white/[0.02] px-3 py-2 rounded-lg border border-gray-100 dark:border-white/5">
                                                    <span className="text-gray-400 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5">
                                                        <Building2 size={12} /> Tenant ID
                                                    </span>
                                                    <span className="font-bold text-gray-900 dark:text-white truncate max-w-[200px]" title={call.tenantId}>
                                                        {call.tenantId}
                                                    </span>
                                                </div>
                                            )}

                                            <div className="flex justify-between items-center bg-gray-50/50 dark:bg-white/[0.02] px-3 py-2 rounded-lg border border-gray-100 dark:border-white/5">
                                                <span className="text-gray-400 text-[10px] font-bold uppercase tracking-wider">Destination</span>
                                                <span className="font-bold text-gray-700 dark:text-gray-300 capitalize">{call.destType || 'DID'}</span>
                                            </div>

                                            <div className="flex justify-between items-center bg-gray-50/50 dark:bg-white/[0.02] px-3 py-2 rounded-lg border border-gray-100 dark:border-white/5">
                                                <span className="text-gray-400 text-[10px] font-bold uppercase tracking-wider">Call UUID</span>
                                                <span className="font-mono text-[11px] text-gray-500 dark:text-gray-400 truncate max-w-[90px]" title={call.uuid}>
                                                    {call.uuid?.substring(0, 8)}...
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Action Barge Bar */}
                                    <div className="px-5 py-3 bg-gray-50/50 dark:bg-white/[0.02] border-t border-gray-100 dark:border-white/5 flex gap-2">
                                        <button
                                            onClick={() => handleBarge(call, 'listen')}
                                            className="flex-1 inline-flex justify-center items-center gap-1.5 rounded-xl bg-white dark:bg-[#181924] px-2.5 py-2 text-xs font-bold text-gray-700 dark:text-gray-200 shadow-2xs border border-gray-200/80 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-white/5 hover:text-blue-600 dark:hover:text-blue-400 transition-all focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                                            title="Listen silently without participants hearing"
                                            disabled={!adminExtension}
                                        >
                                            <Volume2 className="h-3.5 w-3.5 text-blue-500" />
                                            Silent Listen
                                        </button>
                                        {!isSuperAdmin && (
                                            <>
                                                <button
                                                    onClick={() => handleBarge(call, 'whisper')}
                                                    className="flex-1 inline-flex justify-center items-center gap-1.5 rounded-xl bg-white dark:bg-[#181924] px-2.5 py-2 text-xs font-bold text-gray-700 dark:text-gray-200 shadow-2xs border border-gray-200/80 dark:border-white/10 hover:bg-gray-50 dark:hover:bg-white/5 hover:text-amber-600 dark:hover:text-amber-400 transition-all focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                                                    title="Whisper coach the agent without caller hearing"
                                                    disabled={!adminExtension}
                                                >
                                                    <Mic className="h-3.5 w-3.5 text-amber-500" />
                                                    Whisper Coach
                                                </button>
                                                <button
                                                    onClick={() => handleBarge(call, 'barge')}
                                                    className="flex-1 inline-flex justify-center items-center gap-1.5 rounded-xl bg-white dark:bg-[#181924] px-2.5 py-2 text-xs font-bold text-red-600 dark:text-red-400 shadow-2xs border border-gray-200/80 dark:border-white/10 hover:bg-red-50 dark:hover:bg-red-950/20 transition-all focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                                                    title="Barge directly into conversation (conference)"
                                                    disabled={!adminExtension}
                                                >
                                                    <Shield className="h-3.5 w-3.5" />
                                                    Join Barge
                                                </button>
                                            </>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default MonitoringPage;
