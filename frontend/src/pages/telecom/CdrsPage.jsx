import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
    Download,
    Search,
    Filter,
    DollarSign,
    PhoneOff,
    ArrowDownRight,
    ArrowUpRight,
    History,
    Calendar,
    Play,
    Pause,
    Loader2,
    Users,
    Wallet,
    Info,
    Clock,
    PhoneCall,
    Mic,
    CheckCircle2,
    XCircle,
    FileSpreadsheet,
    Building2,
    TrendingUp
} from 'lucide-react';
import { format, subDays, startOfDay, endOfDay, startOfMonth } from 'date-fns';
import { telecomService } from '../../services/telecom.service';
import api from '../../services/api';
import { useWalletQuery, useSubscriptionQuery } from '../../hooks/useBillingQueries';
import CreativeStatCard from '../../components/common/CreativeStatCard';
import { useBillingIntelligence } from '../../hooks/useBillingIntelligence';
import React, { useState, useEffect, useCallback } from 'react';
import { Download, Search, Filter, DollarSign, PhoneOff, ArrowDownRight, ArrowUpRight, History, Calendar, Play, Pause, Loader2, Users, Info } from 'lucide-react';
import { format, subDays, startOfDay, endOfDay, startOfMonth } from 'date-fns';
import { telecomService } from '../../services/telecom.service';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import Pagination from '../../components/common/Pagination';
import clsx from 'clsx';


const PlaybackButton = ({ uuid, cdr }) => {
    const [status, setStatus] = useState('idle'); // 'idle' | 'loading' | 'playing' | 'none'
    const [audioUrl, setAudioUrl] = useState(null);
    const [downloading, setDownloading] = useState(false);
    const audioRef = React.useRef(null);

    // Strictly check if has_recording / hasRecording in the CDR payload is true
    const hasRecording = Boolean(
        cdr?.hasRecording === true ||
        cdr?.has_recording === true ||
        cdr?.has_recording === 'true' ||
        cdr?.has_recording === 1
    );

    if (!hasRecording || status === 'none') {
        return <span className="text-gray-300 font-medium">-</span>;
    }

    const handlePlay = async () => {
        if (status === 'playing') {
            audioRef.current?.pause();
            setStatus('idle');
            return;
        }
        if (audioUrl) {
            audioRef.current?.play();
            setStatus('playing');
            return;
        }

        setStatus('loading');
        try {
            const blob = await telecomService.playRecording(uuid);
            const url = URL.createObjectURL(blob);
            setAudioUrl(url);
            setStatus('playing');
        } catch (e) {
            setStatus('none');
        }
    };

    const handleDownload = async () => {
        if (downloading) return;
        setDownloading(true);
        try {
            let downloadUrl = audioUrl;
            if (!downloadUrl) {
                const blob = await telecomService.playRecording(uuid);
                downloadUrl = URL.createObjectURL(blob);
                setAudioUrl(downloadUrl);
            }
            const link = document.createElement('a');
            link.href = downloadUrl;
            link.setAttribute('download', `recording_${uuid}.mp3`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } catch (e) {
            console.error('Failed to download recording:', e);
            setStatus('none');
        } finally {
            setDownloading(false);
        }
    };

    useEffect(() => {
        if (audioUrl && audioRef.current && status === 'playing') {
            audioRef.current.play();
        }
    }, [audioUrl, status]);

    return (
        <div className="flex items-center gap-2">
            <button
                onClick={handlePlay}
                disabled={status === 'loading'}
                title="Play / Pause Recording"
                className="w-8 h-8 rounded-lg bg-indigo-50/80 text-indigo-600 hover:bg-indigo-100/90 active:scale-95 transition-all flex items-center justify-center disabled:opacity-50"
            >
                {status === 'loading' ? (
                    <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
                ) : status === 'playing' ? (
                    <Pause className="w-4 h-4 text-indigo-600 fill-indigo-600" />
                ) : (
                    <Play className="w-4 h-4 text-indigo-600 ml-0.5" />
                )}
            </button>
            <button
                onClick={handleDownload}
                disabled={downloading}
                title="Download Recording"
                className="w-8 h-8 rounded-lg bg-emerald-50/80 text-emerald-600 hover:bg-emerald-100/90 active:scale-95 transition-all flex items-center justify-center disabled:opacity-50"
            >
                {downloading ? (
                    <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />
                ) : (
                    <Download className="w-4 h-4 text-emerald-600" />
                )}
            </button>
            {audioUrl && (
                <audio
                    ref={audioRef}
                    src={audioUrl}
                    onEnded={() => setStatus('idle')}
                    onPause={() => setStatus('idle')}
                    className="hidden"
                />
            )}
        </div>
    );
};

const CdrsPage = () => {
    const { user } = useAuth();
    const isSuperAdmin = user?.role === 'SUPER_ADMIN';

    const [cdrs, setCdrs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [dateRange, setDateRange] = useState({
        start: format(subDays(new Date(), 30), 'yyyy-MM-dd'),
        end: format(new Date(), 'yyyy-MM-dd')
    });
    const [preset, setPreset] = useState('30days');
    const [currentPage, setCurrentPage] = useState(1);
    const [totalRecords, setTotalRecords] = useState(0);
    const [pageSize, setPageSize] = useState(50);

    // Super Admin Customer Filter
    const [tenantList, setTenantList] = useState([]);
    const [selectedCustomer, setSelectedCustomer] = useState('ALL');


    useEffect(() => {
        if (isSuperAdmin) {
            api.get('/tenants?limit=100')
                .then(res => setTenantList(res.data?.data || []))
                .catch(err => console.error('Failed to fetch tenants for CDR filter:', err));
        }
    }, [isSuperAdmin]);

    const fetchCDRs = useCallback(async (page = 1) => {
        setLoading(true);
        try {
            const offset = (page - 1) * pageSize;
            const result = await telecomService.getCDRs({
                startDate: dateRange.start ? `${dateRange.start} 00:00:00` : undefined,
                endDate: dateRange.end ? `${dateRange.end} 23:59:59` : undefined,
                search: searchTerm || undefined,
                customerId: (isSuperAdmin && selectedCustomer !== 'ALL') ? selectedCustomer : undefined,
                limit: pageSize,
                offset: offset
            });

            const rawList = Array.isArray(result) ? result : (result?.data || []);
            const mapped = rawList.map((cdr, idx) => ({
                id: offset + idx,
                uuid: cdr.call_uuid || cdr.uuid || cdr.id || idx,
                timestamp: cdr.created_at || cdr.timestamp || new Date().toISOString(),
                from: cdr.caller || cdr.from || '-',
                to: cdr.callee || cdr.to || '-',
                direction: (cdr.call_type || cdr.direction || 'OUTBOUND').toUpperCase(),
                duration: cdr.duration_sec ?? cdr.duration ?? 0,
                billsec: cdr.billsec ?? 0,
                cost: cdr.bill_amount ?? cdr.cost ?? 0,
                callCost: cdr.call_cost ?? cdr.call_charge ?? cdr.bill_amount ?? cdr.cost ?? 0,
                recordingCost: cdr.recording_cost ?? cdr.recording_charge ?? 0,
                totalCost: cdr.total_cost ?? cdr.total_amount ?? ((Number(cdr.call_cost ?? cdr.call_charge ?? cdr.bill_amount ?? cdr.cost ?? 0)) + (Number(cdr.recording_cost ?? cdr.recording_charge ?? 0))),
                status: cdr.status || 'answered',
                destType: cdr.dest_type || cdr.destType,
                destValue: cdr.dest_value || cdr.destValue,
                has_recording: cdr.has_recording,
                hasRecording: Boolean(cdr.has_recording === true || cdr.has_recording === 'true' || cdr.has_recording === 1 || cdr.hasRecording === true)
            }));

            setCdrs(mapped);
            setTotalRecords(Array.isArray(result) ? result.length : (result?.total || mapped.length));
            setCurrentPage(page);
        } catch (err) {
            console.error('Failed to fetch CDRs:', err);
        } finally {
            setLoading(false);
        }
    }, [dateRange, searchTerm, selectedCustomer, isSuperAdmin, pageSize]);

    useEffect(() => {
        fetchCDRs(1);
    }, [fetchCDRs]);

    const handlePresetChange = (key) => {
        setPreset(key);
        const today = new Date();
        let start = today;
        let end = today;

        switch (key) {
            case 'today':
                start = today;
                break;
            case 'yesterday':
                start = subDays(today, 1);
                end = start;
                break;
            case '7days':
                start = subDays(today, 6);
                break;
            case '30days':
                start = subDays(today, 29);
                break;
            case 'month':
                start = startOfMonth(today);
                break;
            default:
                return;
        }

        setDateRange({
            start: format(start, 'yyyy-MM-dd'),
            end: format(end, 'yyyy-MM-dd')
        });
    };

    const handleExportCSV = async () => {
        if (totalRecords === 0) return;

        try {
            const result = await telecomService.getCDRs({
                startDate: dateRange.start ? `${dateRange.start} 00:00:00` : undefined,
                endDate: dateRange.end ? `${dateRange.end} 23:59:59` : undefined,
                search: searchTerm || undefined,
                customerId: (isSuperAdmin && selectedCustomer !== 'ALL') ? selectedCustomer : undefined,
                limit: 'all'
            });

            const allCdrs = Array.isArray(result) ? result : (result?.data || []);
            const headers = ['Date', 'From', 'To', 'Direction', 'Duration (sec)', 'Billsec (sec)', 'Cost ($)', 'Status', 'Dest Type', 'Dest Value'];
            const rows = allCdrs.map(c => [
                format(new Date(c.created_at || c.timestamp || new Date()), 'yyyy-MM-dd HH:mm:ss'),
                c.caller || c.from || '-',
                c.callee || c.to || '-',
                (c.call_type || c.direction || 'OUTBOUND').toUpperCase(),
                c.duration_sec ?? c.duration ?? 0,
                c.billsec ?? 0,
                c.bill_amount || c.cost || '0.00',
                c.status || 'answered',
                c.dest_type || c.destType || '-',
                c.dest_value || c.destValue || '-'
            ]);

            const csvContent = [
                headers.join(','),
                ...rows.map(r => r.join(','))
            ].join('\n');

            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            link.setAttribute('download', `call_records_${dateRange.start}_to_${dateRange.end}.csv`);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } catch (err) {
            console.error('Export failed:', err);
        }
    };

    const filteredCdrs = cdrs.filter(cdr =>
        (cdr.from || '').includes(searchTerm) ||
        (cdr.to || '').includes(searchTerm)
    );

    const totalPages = Math.ceil(totalRecords / pageSize);

    // Compute key quick stats from the loaded CDR records
    const cdrStats = useMemo(() => {
        let totalBillsec = 0;
        let totalSpend = 0;
        let answeredCount = 0;
        let recordedCount = 0;

        cdrs.forEach(c => {
            totalBillsec += (c.billsec || 0);
            totalSpend += (Number(c.totalCost) || 0);
            if (['answered', 'completed'].includes((c.status || '').toLowerCase())) {
                answeredCount++;
            }
            if (c.hasRecording) {
                recordedCount++;
            }
        });

        const totalMinutes = Math.round(totalBillsec / 60);
        const asr = cdrs.length > 0 ? Math.round((answeredCount / cdrs.length) * 100) : 0;

        return {
            totalMinutes,
            totalSpend: totalSpend.toFixed(2),
            asr,
            recordedCount
        };
    }, [cdrs]);

    return (
        <div className="space-y-7 w-full pb-16 animate-in fade-in duration-300 max-w-7xl mx-auto">
            {/* Header section */}
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-teal-700 via-teal-600 to-emerald-600 p-8 text-white shadow-xl shadow-teal-900/15">
                <div className="absolute top-0 right-0 -mt-10 -mr-10 w-80 h-80 rounded-full bg-white/10 blur-2xl pointer-events-none" />
                <div className="relative z-10 flex flex-col xl:flex-row xl:items-center xl:justify-between gap-6">
                    <div className="space-y-1.5 max-w-2xl">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 backdrop-blur-md text-xs font-semibold tracking-wide border border-white/20">
                            <History size={14} className="text-teal-200" />
                            <span>Voice Call Logs & Audio Archival</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                                Call Detail Records (CDRs)
                            </h1>
                            <span className="inline-flex items-center rounded-full bg-white/20 px-3 py-0.5 text-xs font-black text-white border border-white/30 backdrop-blur-sm">
                                {totalRecords.toLocaleString()} Records
                            </span>
                        </div>
                        <p className="text-teal-100 text-xs sm:text-sm font-medium">
                            {isSuperAdmin
                                ? 'Comprehensive cross-tenant carrier billing, destination routing, and voice trace logs.'
                                : 'Detailed call logs, minute billing breakdown, and downloadable audio recordings.'}
                        </p>
                    </div>

                    {/* Free Minutes / Balance Widget & Export Action */}
                    <div className="flex flex-wrap items-center gap-3">
                        {intelligence.usage.totalMins > 0 && !isSuperAdmin && (
                            <div className="bg-white/15 backdrop-blur-md px-4 py-2.5 rounded-2xl shadow-sm border border-white/25 flex items-center gap-3.5">
                                <div className="bg-white/20 p-2 rounded-xl">
                                    <Wallet className="h-4 w-4 text-white" />
                                </div>
                                <div>
                                    <div className="text-[10px] font-extrabold text-teal-100 uppercase tracking-wider leading-none mb-1">Free Package Minutes</div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm font-bold text-white leading-none">
                                            {intelligence.usage.usedMins} <span className="text-[11px] text-teal-100 font-medium">/ {intelligence.usage.totalMins}m</span>
                                        </span>
                                        <div className="w-16 bg-white/20 h-1.5 rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-emerald-300 transition-all duration-1000"
                                                style={{ width: `${intelligence.usage.usedPercent}%` }}
                                            ></div>
                                        </div>
                                    </div>
                                </div>
                                <div className="ml-1 pl-3 border-l border-white/20">
                                    <div className="text-[10px] font-extrabold text-teal-100 uppercase tracking-wider leading-none mb-1">Float</div>
                                    <span className="text-sm font-mono font-bold text-white leading-none">${Number(wallet?.balance || 0).toFixed(2)}</span>
                                </div>
                            </div>
                        )}

                        {/* Quick Date Presets */}
                        <div className="inline-flex items-center p-1 rounded-2xl bg-white/15 border border-white/25 shadow-sm backdrop-blur-md">
                            {['today', '7days', '30days', 'month'].map((p) => (
                                <button
                                    key={p}
                                    onClick={() => handlePresetChange(p)}
                                    className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all ${preset === p
                                        ? 'bg-white text-teal-800 shadow-sm'
                                        : 'text-teal-100 hover:text-white'
                                        }`}
                                >
                                    {p === 'today' ? 'Today' : p === '7days' ? '7 Days' : p === '30days' ? '30 Days' : 'This Month'}
                                </button>
                            ))}
                        </div>

                        {/* Export Button */}
                        <button
                            onClick={handleExportCSV}
                            disabled={totalRecords === 0}
                            className="inline-flex items-center gap-2 bg-white hover:bg-teal-50 text-teal-800 px-4 py-2.5 rounded-2xl text-xs font-bold shadow-lg shadow-black/10 active:scale-95 transition-all disabled:opacity-50 cursor-pointer"
                        >
                            <Download size={14} className="text-teal-700" />
                            <span>Export CSV</span>
                        </button>
                <div className="flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-2 bg-white rounded-xl shadow-sm ring-1 ring-gray-200 p-1">
                        {['today', '7days', '30days', 'month'].map((p) => (
                            <button
                                key={p}
                                onClick={() => handlePresetChange(p)}
                                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${preset === p
                                    ? 'bg-primary-600 text-white shadow-sm'
                                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}
                            >
                                {p.charAt(0).toUpperCase() + p.slice(1).replace('days', ' Days')}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Quick KPI Overview Stat Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <CreativeStatCard
                    title="Filtered Volume"
                    value={totalRecords.toLocaleString()}
                    subtitle="Calls in selected interval"
                    icon={PhoneCall}
                    color="blue"
                    trend="+12%"
                    trendUp={true}
                />
                <CreativeStatCard
                    title="Billed Duration"
                    value={`${cdrStats.totalMinutes.toLocaleString()}m`}
                    subtitle="Accumulated billable talk time"
                    icon={Clock}
                    color="purple"
                    trend="+8%"
                    trendUp={true}
                />
                <CreativeStatCard
                    title="Answer Rate (ASR)"
                    value={`${cdrStats.asr}%`}
                    subtitle="Connection success ratio"
                    icon={TrendingUp}
                    color="emerald"
                    trend="+5%"
                    trendUp={true}
                />
                <CreativeStatCard
                    title="Interval Charges"
                    value={`$${cdrStats.totalSpend}`}
                    subtitle="Carrier fees & recording cost"
                    icon={DollarSign}
                    color="teal"
                    trend="+10%"
                    trendUp={true}
                />
            </div>

            {/* Filter Bar */}
            <div className="bg-white dark:bg-[#0c0d12] rounded-2xl border border-gray-200/80 dark:border-white/10 shadow-xs p-5">
                <div className={`grid grid-cols-1 md:grid-cols-2 ${isSuperAdmin ? 'lg:grid-cols-5' : 'lg:grid-cols-4'} gap-4`}>
                    {isSuperAdmin && (
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider ml-1">Tenant Organization</label>
                            <div className="relative">
                                <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                <select
                                    className="w-full bg-gray-50/80 dark:bg-white/[0.03] border border-gray-200/80 dark:border-white/10 rounded-xl py-2 pl-9 pr-3 text-xs font-bold text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-2xs"
                                    value={selectedCustomer}
                                    onChange={e => setSelectedCustomer(e.target.value)}
                                >
                                    <option value="ALL">🌐 All Tenants</option>
                                    {tenantList.map(t => (
                                        <option key={t.id} value={t.customerCode || t.subBillingCustomerId || t.id}>
                                            {t.name} ({t.customerCode || t.id})
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    )}
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider ml-1">Phone Number Search</label>
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Caller or dialed number..."
                                className="w-full bg-gray-50/80 dark:bg-white/[0.03] border border-gray-200/80 dark:border-white/10 rounded-xl py-2 pl-9 pr-3 text-xs font-medium text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-2xs"
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider ml-1">Start Date</label>
                        <div className="relative">
                            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <input
                                type="date"
                                className="w-full bg-gray-50/80 dark:bg-white/[0.03] border border-gray-200/80 dark:border-white/10 rounded-xl py-2 pl-9 pr-3 text-xs font-medium text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-2xs"
                                value={dateRange.start}
                                onChange={e => {
                                    setDateRange(prev => ({ ...prev, start: e.target.value }));
                                    setPreset('custom');
                                }}
                            />
                        </div>
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider ml-1">End Date</label>
                        <div className="relative">
                            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <input
                                type="date"
                                className="w-full bg-gray-50/80 dark:bg-white/[0.03] border border-gray-200/80 dark:border-white/10 rounded-xl py-2 pl-9 pr-3 text-xs font-medium text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-2xs"
                                value={dateRange.end}
                                onChange={e => {
                                    setDateRange(prev => ({ ...prev, end: e.target.value }));
                                    setPreset('custom');
                                }}
                            />
                        </div>
                    </div>
                    <div className="flex items-end">
                        <button
                            onClick={() => fetchCDRs(1)}
                            className="w-full bg-primary-600 text-white font-bold py-2 rounded-xl shadow-md shadow-primary-600/20 hover:bg-primary-700 transition-all flex items-center justify-center gap-1.5 text-xs active:scale-95 cursor-pointer"
                        >
                            <Filter className="h-3.5 w-3.5" />
                            Apply Query
                        </button>
                    </div>
                </div>
            </div>

            {/* Table Section */}
            <div className="bg-white dark:bg-[#0c0d12] rounded-2xl border border-gray-200/80 dark:border-white/10 shadow-xs overflow-hidden">
                <div className="p-4 sm:p-5 border-b border-gray-100 dark:border-white/5 bg-gray-50/50 dark:bg-white/[0.02] flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-800/30 flex items-center justify-center shrink-0">
                            <PhoneCall size={18} />
                        </div>
                        <div>
                            <h2 className="text-base font-extrabold text-gray-900 dark:text-white flex items-center gap-2">
                                Call Records Log
                                <span className="text-[11px] font-bold text-indigo-700 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 px-2 py-0.5 rounded-lg border border-indigo-200/50 dark:border-indigo-800/40">
                                    {cdrs.length} on page
                                </span>
                            </h2>
                            <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">Accurate per-second billing breakdowns and audio playback</p>
                        </div>
                    </div>
                </div>

                {loading ? (
                    <div className="flex flex-col items-center justify-center py-24">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mb-3"></div>
                        <p className="text-gray-400 text-xs font-semibold tracking-tight">Syncing call records...</p>
                    </div>
                ) : filteredCdrs.length === 0 ? (
                    <div className="text-center py-20">
                        <div className="mx-auto h-14 w-14 bg-gray-50 dark:bg-white/5 rounded-2xl flex items-center justify-center mb-3">
                            <History className="h-7 w-7 text-gray-400" />
                        </div>
                        <h3 className="text-base font-bold text-gray-900 dark:text-white">No calls found in this interval</h3>
                        <p className="text-gray-500 dark:text-gray-400 mt-1 font-medium text-xs max-w-xs mx-auto">Try broadening your search keywords or adjusting the date range filters.</p>
                    </div>
                ) : (
                    <>
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-100 dark:divide-white/5">
                                <thead className="bg-gray-50/75 dark:bg-white/[0.02]">
                                    <tr>
                                        <th scope="col" className="py-3.5 pl-4 md:pl-6 pr-3 text-left text-[11px] font-extrabold uppercase tracking-wider text-gray-500 dark:text-gray-400">Timestamp</th>
                                        <th scope="col" className="px-3 py-3.5 text-left text-[11px] font-extrabold uppercase tracking-wider text-gray-500 dark:text-gray-400">Caller (Src)</th>
                                        <th scope="col" className="px-3 py-3.5 text-left text-[11px] font-extrabold uppercase tracking-wider text-gray-500 dark:text-gray-400">Recipient (Dst)</th>
                                        <th scope="col" className="hidden lg:table-cell px-3 py-3.5 text-left text-[11px] font-extrabold uppercase tracking-wider text-gray-500 dark:text-gray-400">Destination</th>
                                        <th scope="col" className="hidden sm:table-cell px-3 py-3.5 text-left text-[11px] font-extrabold uppercase tracking-wider text-gray-500 dark:text-gray-400">Direction</th>
                                        <th scope="col" className="px-3 py-3.5 text-left text-[11px] font-extrabold uppercase tracking-wider text-gray-500 dark:text-gray-400">Duration</th>
                                        <th scope="col" className="px-3 py-3.5 text-left text-[11px] font-extrabold uppercase tracking-wider text-gray-500 dark:text-gray-400">Billed Time</th>
                                        <th scope="col" className="px-3 py-3.5 text-left text-[11px] font-extrabold uppercase tracking-wider text-gray-500 dark:text-gray-400">Call Cost</th>
                                        <th scope="col" className="px-3 py-3.5 text-left text-[11px] font-extrabold uppercase tracking-wider text-gray-500 dark:text-gray-400">Recording</th>
                                        <th scope="col" className="hidden md:table-cell px-3 py-3.5 text-left text-[11px] font-extrabold uppercase tracking-wider text-gray-500 dark:text-gray-400">Total Billed</th>
                                        <th scope="col" className="px-3 py-3.5 text-left text-[11px] font-extrabold uppercase tracking-wider text-gray-500 dark:text-gray-400">Status</th>
                                        {!isSuperAdmin && (
                                            <th scope="col" className="px-3 py-3.5 text-left text-[11px] font-extrabold uppercase tracking-wider text-gray-500 dark:text-gray-400">Recording</th>
                                        )}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-white/5 bg-transparent">
                                    {filteredCdrs.map((cdr) => (
                                        <tr key={cdr.id} className="hover:bg-gray-50/60 dark:hover:bg-white/[0.02] transition-colors group">
                                            <td className="whitespace-nowrap py-3.5 pl-4 md:pl-6 pr-3">
                                                <div className="text-xs font-bold text-gray-900 dark:text-white">{format(new Date(cdr.timestamp), 'MMM d, yyyy')}</div>
                                                <div className="text-[10px] font-mono font-semibold text-gray-400">{format(new Date(cdr.timestamp), 'HH:mm:ss')}</div>
                                            </td>
                                            <td className="whitespace-nowrap px-3 py-3.5 text-xs font-bold text-gray-900 dark:text-white font-mono">{cdr.from}</td>
                                            <td className="whitespace-nowrap px-3 py-3.5 text-xs font-bold text-gray-900 dark:text-white font-mono">{cdr.to}</td>
                                            <td className="hidden lg:table-cell whitespace-nowrap px-3 py-3.5 text-xs font-bold text-gray-700 dark:text-gray-300">
                                                <div>{cdr.destValue || '-'}</div>
                                                <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-tight">{cdr.destType || '-'}</div>
                                            </td>
                                            <td className="hidden sm:table-cell whitespace-nowrap px-3 py-3.5 text-xs">
                                                <span className={`inline-flex items-center gap-1.5 rounded-lg px-2 py-0.5 text-[10px] font-bold tracking-tight ${cdr.direction === 'INBOUND'
                                                    ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-400 ring-1 ring-inset ring-indigo-600/20'
                                                    : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 ring-1 ring-inset ring-emerald-600/20'
                                                    }`}>
                                                    {cdr.direction === 'INBOUND' ? <ArrowDownRight className="w-3 h-3" /> : <ArrowUpRight className="w-3 h-3" />}
                                                    {cdr.direction}
                                                </span>
                                            </td>
                                            <td className="whitespace-nowrap px-3 py-3.5 text-xs font-medium text-gray-600 dark:text-gray-300 font-mono">
                                                {Math.floor(cdr.duration / 60)}m {cdr.duration % 60}s
                                            </td>
                                            <td className="whitespace-nowrap px-3 py-3.5 text-xs font-bold text-gray-700 dark:text-gray-200 font-mono">
                                                {Math.floor(cdr.billsec / 60)}m {cdr.billsec % 60}s
                                            </td>
                                            <td className="whitespace-nowrap px-3 py-3.5 text-xs font-bold text-gray-600 dark:text-gray-300 font-mono">
                                                ${Number(cdr.callCost).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
                                            </td>
                                            <td className="whitespace-nowrap px-3 py-3.5 text-xs font-bold text-gray-600 dark:text-gray-300 font-mono">
                                                ${Number(cdr.recordingCost).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
                                            </td>
                                            <td className="hidden md:table-cell whitespace-nowrap px-3 py-3.5 text-xs font-black text-gray-900 dark:text-white font-mono">
                                                ${Number(cdr.totalCost).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
                                            </td>
                                            <td className="whitespace-nowrap px-3 py-3.5">
                                                <div className="flex items-center gap-1.5">
                                                    <div className={`h-2 w-2 rounded-full ${['answered', 'completed'].includes((cdr.status || '').toLowerCase())
                                                        ? 'bg-emerald-500 shadow-2xs'
                                                        : 'bg-rose-500'
                                                        }`}></div>
                                                    <span className="text-xs font-bold text-gray-600 dark:text-gray-300 capitalize">{cdr.status}</span>
                                                </div>
                                            </td>
                                            {!isSuperAdmin && (
                                                <td className="whitespace-nowrap px-3 py-3.5">
                                                    <PlaybackButton uuid={cdr.uuid} cdr={cdr} />
                                                </td>
                                            )}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination Footer */}
                        <Pagination
                            page={currentPage}
                            limit={pageSize}
                            total={totalRecords}
                            totalPages={totalPages}
                            onPageChange={(p) => fetchCDRs(p)}
                            onLimitChange={(size) => { setPageSize(size); fetchCDRs(1); }}
                            itemName="call records"
                        />
                    </>
                )}
            </div>
        </div>
    );
};

export default CdrsPage;
