import React, { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import telecomService from '../../services/telecom.service';
import api from '../../services/api';
import { Phone, Mic, Volume2, Shield, Activity, RotateCw, Globe, Building2, ChevronDown } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

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

    if (loading) return (
        <div className="max-w-7xl mx-auto pb-12">
            <div className="animate-pulse flex space-x-4">
                <div className="flex-1 space-y-6 py-1">
                    <div className="h-8 bg-gray-200 rounded w-1/4"></div>
                    <div className="h-32 bg-gray-200 rounded-2xl w-full"></div>
                </div>
            </div>
        </div>
    );

    return (
        <div className="max-w-7xl mx-auto pb-12 space-y-6">
            {/* Header Section */}
            <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4 mb-2">
                <div className="px-4 sm:px-0">
                    <h1 className="text-2xl md:text-3xl font-black tracking-tight text-gray-900 flex items-center gap-3">
                        <Activity className={`h-7 w-7 md:h-8 md:w-8 ${isConnected ? 'text-emerald-500 animate-pulse' : 'text-gray-400'}`} />
                        {isSuperAdmin ? 'Super Admin Live Call Monitoring' : 'Live Call Monitoring'}
                        <span className="ml-2 inline-flex items-center rounded-full bg-emerald-50 px-3 py-1 text-xs font-extrabold text-emerald-700 ring-1 ring-inset ring-emerald-600/20 font-mono">
                            {calls.length} Active Calls
                        </span>
                    </h1>
                    <p className="text-gray-500 mt-1 font-medium text-sm md:text-base">
                        {isSuperAdmin ? 'Real-time call monitoring across all platform tenants' : 'Monitor and manage active calls in real-time'}
                    </p>
                </div>

                {/* Control Panel Box */}
                <div className="bg-white rounded-2xl shadow-sm ring-1 ring-indigo-200/60 p-3 px-4 flex flex-wrap items-center gap-3 md:gap-4 mx-4 sm:mx-0 shadow-indigo-500/5">
                    {isSuperAdmin && (
                        <div className="relative bg-slate-50 border border-slate-200/80 shadow-xs rounded-xl flex items-center px-3 py-1.5 gap-2 hover:border-slate-300 transition-all">
                            <Building2 className="h-4 w-4 text-slate-500 shrink-0" />
                            <select
                                value={selectedTenantId}
                                onChange={(e) => setSelectedTenantId(e.target.value)}
                                className="bg-transparent text-xs font-bold text-gray-800 pr-5 py-0.5 focus:outline-none cursor-pointer border-none ring-0 appearance-none font-sans"
                                style={{ WebkitAppearance: 'none', MozAppearance: 'none' }}
                            >
                                <option value="all">🌐 All Tenants</option>
                                {tenants.map((t) => (
                                    <option key={t.id} value={t.id}>
                                        🏢 {t.name}
                                    </option>
                                ))}
                            </select>
                            <ChevronDown className="h-3.5 w-3.5 text-slate-400 pointer-events-none -ml-4" />
                        </div>
                    )}

                    <div className="flex items-center space-x-2 md:space-x-3 border-r border-gray-200 pr-3 md:pr-4">
                        <div className={`h-2.5 w-2.5 rounded-full ${isConnected ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)] animate-pulse' : 'bg-red-500'}`}></div>
                        <span className="text-[10px] md:text-xs font-extrabold text-gray-700 font-mono uppercase tracking-wider">
                            {isConnected ? 'CONNECTED' : 'DISCONNECTED'}
                        </span>
                        <button
                            onClick={sendPing}
                            className="ml-1 inline-flex items-center justify-center rounded-lg bg-gray-100 hover:bg-gray-200 px-2.5 py-1 text-[10px] font-extrabold text-gray-700 transition-colors uppercase tracking-wider cursor-pointer"
                            title="Test Latency"
                        >
                            PING
                        </button>
                    </div>

                    {!adminExtension ? (
                        <div className="text-[10px] md:text-xs font-bold text-amber-600 bg-amber-50 px-2.5 py-1 rounded-xl ring-1 ring-inset ring-amber-600/20">
                            ⚠️ No Extension
                        </div>
                    ) : (
                        <div className="text-[10px] md:text-xs font-bold text-gray-500 flex items-center gap-1.5">
                            Admin Ext: <span className="inline-flex items-center rounded-md bg-slate-900 px-2 py-0.5 text-[10px] md:text-xs font-mono font-bold text-white shadow-xs">{adminExtension}</span>
                        </div>
                    )}
                </div>
            </div>

            {!adminExtension && (
                <div className="bg-amber-50 text-amber-700 p-4 rounded-xl border border-amber-200 shadow-sm text-sm flex items-center gap-3">
                    <span className="text-2xl">⚠️</span>
                    <div>
                        <strong className="block text-amber-900 mb-0.5">Configuration Required</strong>
                        You need a monitoring extension assigned to your account to use the barge, listen, and coach features.
                    </div>
                </div>
            )}

            {bargeStatus && (
                <div className="bg-blue-50 text-blue-700 p-4 rounded-xl border border-blue-200 shadow-sm text-sm font-bold flex items-center gap-3 animate-pulse">
                    <Volume2 className="h-5 w-5 text-blue-500" />
                    {bargeStatus}
                </div>
            )}

            {/* Active Calls Section */}
            <div className="bg-white rounded-2xl shadow-sm ring-1 ring-gray-200/80 overflow-hidden flex flex-col">
                <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
                    <h2 className="text-sm font-extrabold text-gray-800 tracking-tight uppercase">Active Call Streams</h2>
                    <button
                        onClick={loadActiveCalls}
                        disabled={refreshing}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-white px-3 py-1.5 text-xs font-bold text-gray-700 shadow-xs ring-1 ring-inset ring-gray-300 hover:bg-gray-50 transition-all focus:outline-none disabled:opacity-50 cursor-pointer"
                    >
                        <RotateCw className={`h-3.5 w-3.5 text-blue-600 ${refreshing ? 'animate-spin' : ''}`} />
                        Refresh
                    </button>
                </div>
                <div className="p-6 bg-gray-50/30 flex-1 min-h-[420px] flex flex-col justify-center">
                    {calls.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20 text-center">
                            <div className="h-16 w-16 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mb-4 ring-8 ring-blue-50/50">
                                <Activity className="h-9 w-9 stroke-[2] animate-pulse" />
                            </div>
                            <h3 className="font-extrabold text-xl text-gray-700 tracking-tight mb-1">
                                Listening for active call streams across tenants...
                            </h3>
                            <p className="text-sm font-medium text-gray-400 max-w-md">
                                Calls will automatically appear here in real-time when initiated.
                            </p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
                            {calls.map(call => (
                                <div key={call.uuid} className="bg-white rounded-2xl shadow-sm ring-1 ring-gray-200 overflow-hidden hover:shadow-md hover:ring-gray-300 transition-all group flex flex-col">
                                    <div className="p-5 flex-1">
                                        <div className="flex items-center justify-between mb-4 pb-4 border-b border-gray-100">
                                            <div className={`px-2.5 py-1 rounded-md text-[10px] font-extrabold uppercase tracking-widest ring-1 ring-inset ${call.status === 'answered' ? 'bg-green-50 text-green-700 ring-green-600/20' :
                                                call.status === 'ringing' ? 'bg-amber-50 text-amber-700 ring-amber-600/20 animate-pulse' :
                                                    call.status === 'ended' ? 'bg-red-50 text-red-700 ring-red-600/20' :
                                                        'bg-blue-50 text-blue-700 ring-blue-600/20'
                                                }`}>
                                                {call.status}
                                            </div>
                                            <div className="text-sm font-mono font-bold text-gray-900 flex items-center bg-gray-50 px-2 py-1 rounded-md ring-1 ring-inset ring-gray-200">
                                                {call.status === 'answered' && <span className="mr-2 h-2 w-2 rounded-full bg-green-500 shadow-[0_0_5px_rgba(34,197,94,0.6)] animate-pulse"></span>}
                                                {formatDuration(getLiveDuration(call))}
                                            </div>
                                        </div>

                                        <div className="space-y-3 mb-2 text-sm font-mono">
                                            {isSuperAdmin && call.tenantId && (
                                                <div className="flex justify-between items-center bg-gray-50/50 p-2 rounded-xl ring-1 ring-inset ring-gray-100">
                                                    <span className="text-gray-400 uppercase text-xs font-bold tracking-widest">Tenant</span>
                                                    <span className="font-bold text-gray-900 truncate max-w-[150px] text-right" title={call.tenantId}>
                                                        {call.tenantId}
                                                    </span>
                                                </div>
                                            )}
                                            <div className="flex justify-between items-center bg-gray-50/50 p-2 rounded-xl ring-1 ring-inset ring-gray-100">
                                                <span className="text-gray-400 uppercase text-xs font-bold tracking-widest">Src</span>
                                                <span className="font-bold text-gray-900">{call.caller}</span>
                                            </div>
                                            <div className="flex justify-between items-center bg-gray-50/50 p-2 rounded-xl ring-1 ring-inset ring-gray-100">
                                                <span className="text-gray-400 uppercase text-xs font-bold tracking-widest">Dst</span>
                                                <span className="font-bold text-gray-900 truncate max-w-[150px] text-right" title={`${call.destValue} (${call.destType})`}>
                                                    {call.destValue}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="px-5 py-4 bg-gray-50 border-t border-gray-100 flex gap-2">
                                        <button
                                            onClick={() => handleBarge(call, 'listen')}
                                            className="flex-1 inline-flex justify-center items-center gap-1.5 rounded-xl bg-white px-2 py-2 text-xs font-bold text-gray-700 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 transition-all focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                                            title="Listen (Silent)"
                                            disabled={!adminExtension}
                                        >
                                            <Volume2 className="h-3.5 w-3.5 text-blue-500" />
                                            Listen
                                        </button>
                                        {!isSuperAdmin && (
                                            <>
                                                <button
                                                    onClick={() => handleBarge(call, 'whisper')}
                                                    className="flex-1 inline-flex justify-center items-center gap-1.5 rounded-xl bg-white px-2 py-2 text-xs font-bold text-gray-700 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 transition-all focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                                                    title="Whisper (Coach)"
                                                    disabled={!adminExtension}
                                                >
                                                    <Mic className="h-3.5 w-3.5 text-amber-500" />
                                                    Coach
                                                </button>
                                                <button
                                                    onClick={() => handleBarge(call, 'barge')}
                                                    className="flex-1 inline-flex justify-center items-center gap-1.5 rounded-xl bg-white px-2 py-2 text-xs font-bold text-red-600 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-red-50 transition-all focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                                                    title="Barge (Join)"
                                                    disabled={!adminExtension}
                                                >
                                                    <Shield className="h-3.5 w-3.5" />
                                                    Join
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
