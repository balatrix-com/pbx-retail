import React, { useState, useEffect, useMemo } from 'react';
import { telecomService } from '../../services/telecom.service';
import { walletService } from '../../services/wallet.service';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import {
    Phone,
    Search,
    RefreshCw,
    SlidersHorizontal,
    PhoneCall,
    CheckCircle2,
    XCircle,
    ArrowUpRight,
    Layers,
    DollarSign,
    Hash,
    Plus,
    Trash2
} from 'lucide-react';
import RoutingModal from '../../components/telecom/RoutingModal';
import Pagination from '../../components/common/Pagination';
import CreativeStatCard from '../../components/common/CreativeStatCard';

const PhoneNumbersPage = () => {
    const { user } = useAuth();
    const { addToast } = useToast();

    const [numbers, setNumbers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [walletBalance, setWalletBalance] = useState(0);
    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(10);
    const [quota, setQuota] = useState(null);
    const [adding, setAdding] = useState(false);
    const [addType, setAddType] = useState('DID');
    const [newNumber, setNewNumber] = useState('');
    const [subscriptionId, setSubscriptionId] = useState('');
    const [savingNumber, setSavingNumber] = useState(false);
    const [numberError, setNumberError] = useState('');
    const isAdmin = user?.role === 'ADMIN';

    // Filters & Search
    const [searchTerm, setSearchTerm] = useState('');
    const [typeFilter, setTypeFilter] = useState('ALL'); // ALL, DID, TFN
    const [statusFilter, setStatusFilter] = useState('ALL'); // ALL, ACTIVE, INACTIVE

    // Routing Modal State
    const [routingModalOpen, setRoutingModalOpen] = useState(false);
    const [selectedNumber, setSelectedNumber] = useState(null);

    const formatPhoneNumber = (numberString) => {
        if (!numberString) return '';
        const cleaned = ('' + numberString).replace(/\D/g, '');

        if (cleaned.length === 11 && cleaned.startsWith('1')) {
            const match = cleaned.match(/^1(\d{3})(\d{3})(\d{4})$/);
            if (match) return `+1 (${match[1]}) ${match[2]}-${match[3]}`;
        }

        if (cleaned.length === 10) {
            const match = cleaned.match(/^(\d{3})(\d{3})(\d{4})$/);
            if (match) return `(${match[1]}) ${match[2]}-${match[3]}`;
        }

        return numberString;
    };

    const loadData = async (isManualRefresh = false) => {
        if (isManualRefresh) setRefreshing(true);
        else setLoading(true);

        try {
            const [numbersData, walletData, quotaData] = await Promise.all([
                telecomService.getPhoneNumbers(),
                user?.tenantId ? walletService.getBalance(user.tenantId).catch(() => ({ balance: 0 })) : Promise.resolve({ balance: 0 }),
                isAdmin ? telecomService.getNumberQuota() : Promise.resolve(null),
            ]);

            setNumbers(Array.isArray(numbersData) ? numbersData : []);
            setQuota(quotaData);
            if (walletData && walletData.balance !== undefined) {
                setWalletBalance(walletData.balance);
            }
        } catch (err) {
            console.error('Failed to load phone numbers:', err);
            addToast('error', 'Failed to load phone numbers');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        loadData();
    }, [user?.tenantId]);

    const handleOpenRouting = (num) => {
        setSelectedNumber(num);
        setRoutingModalOpen(true);
    };

    const handleRoutingSaved = (updatedNum) => {
        setNumbers(prev =>
            prev.map(item => item.id === updatedNum.id ? { ...item, ...updatedNum } : item)
        );
    };

    const handleAddNumber = async (event) => {
        event.preventDefault();
        setNumberError('');
        setSavingNumber(true);
        try {
            await telecomService.addNumber(addType, newNumber.trim(), subscriptionId || undefined);
            setAdding(false);
            setNewNumber('');
            addToast('success', `${addType} added`);
            await loadData(true);
        } catch (err) {
            setNumberError(err.response?.data?.message || 'Could not add this number');
        } finally {
            setSavingNumber(false);
        }
    };

    const handleRemoveNumber = async (item) => {
        if (!window.confirm(`Remove ${item.number} from your numbers?`)) return;
        try {
            await telecomService.removeNumber(item.type, item.id);
            addToast('success', 'Number removed');
            await loadData(true);
        } catch (err) {
            addToast('error', err.response?.data?.message || 'Could not remove this number');
        }
    };

    // Filtered data
    const filteredNumbers = useMemo(() => {
        return numbers.filter(item => {
            const matchesSearch =
                !searchTerm ||
                item.number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (item.routeType && item.routeType.toLowerCase().includes(searchTerm.toLowerCase())) ||
                (item.forwardNumber && item.forwardNumber.toLowerCase().includes(searchTerm.toLowerCase()));

            const matchesType =
                typeFilter === 'ALL' || item.type === typeFilter;

            const matchesStatus =
                statusFilter === 'ALL' ||
                (statusFilter === 'ACTIVE' && item.status?.toUpperCase() === 'ACTIVE') ||
                (statusFilter === 'INACTIVE' && item.status?.toUpperCase() !== 'ACTIVE');

            return matchesSearch && matchesType && matchesStatus;
        });
    }, [numbers, searchTerm, typeFilter, statusFilter]);

    // Paginated numbers
    const paginatedNumbers = useMemo(() => {
        return filteredNumbers.slice((page - 1) * limit, page * limit);
    }, [filteredNumbers, page, limit]);

    // Summary counts
    const summary = useMemo(() => {
        const total = numbers.length;
        const localDids = numbers.filter(n => n.type === 'DID').length;
        const tollFree = numbers.filter(n => n.type === 'TFN').length;
        const active = numbers.filter(n => n.status?.toUpperCase() === 'ACTIVE').length;
        return { total, localDids, tollFree, active };
    }, [numbers]);

    const getRouteBadge = (item) => {
        if (!item.routeType) {
            return (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400">
                    Not configured
                </span>
            );
        }

        const labels = {
            extension: 'Extension',
            ring_group: 'Ring Group',
            ivr: 'IVR Menu',
            schedule: 'Schedule',
            did_forward: 'External Forward',
            forward: 'Forward'
        };

        const label = labels[item.routeType] || item.routeType;
        const detail = item.forwardNumber ? ` (${item.forwardNumber})` : '';

        return (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-800/40">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse"></span>
                {label}{detail}
            </span>
        );
    };

    return (
        <div className="w-full pb-16 space-y-7 animate-in fade-in duration-300 max-w-7xl mx-auto">
            {/* Header Banner */}
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-teal-700 via-teal-600 to-emerald-600 p-8 text-white shadow-xl shadow-teal-900/15">
                <div className="absolute top-0 right-0 -mt-10 -mr-10 w-80 h-80 rounded-full bg-white/10 blur-2xl pointer-events-none" />
                <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                    <div className="space-y-1.5 max-w-2xl">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 backdrop-blur-md text-xs font-semibold tracking-wide border border-white/20">
                            <Phone size={14} className="text-teal-200 animate-pulse" />
                            <span>Inbound Routing & Inventory</span>
                        </div>
                        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                            Phone Numbers
                        </h1>
                        <p className="text-teal-100 text-xs sm:text-sm font-medium">
                            Unified management for Local DIDs and Toll-Free numbers with inbound routing rules.
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                        <span className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-white/15 backdrop-blur-md text-xs font-mono font-bold text-white border border-white/20">
                            <span>Balance:</span>
                            <span className="text-teal-200 font-extrabold">
                                ${Number(walletBalance).toFixed(2)}
                            </span>
                        </span>

                        {isAdmin && (
                            <button
                                type="button"
                                onClick={() => { setNumberError(''); setAdding(true); }}
                                disabled={!quota?.remaining}
                                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white hover:bg-teal-50 px-5 py-2.5 text-xs font-bold text-teal-800 shadow-lg shadow-black/10 transition-all active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
                            >
                                <Plus className="h-4 w-4 text-teal-700" /> Add Number
                            </button>
                        )}

                        <button
                            onClick={() => loadData(true)}
                            disabled={refreshing}
                            className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 text-xs font-bold rounded-2xl bg-white/15 hover:bg-white/25 text-white backdrop-blur-md border border-white/20 transition-all active:scale-95 cursor-pointer"
                            title="Refresh numbers"
                        >
                            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                            <span>Refresh</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Quick KPI Stat Cards - Creative Stat Blocks */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                <CreativeStatCard
                    title="Total Numbers"
                    value={loading ? '—' : summary.total}
                    subtitle="Provisioned active lines"
                    icon={Hash}
                    color="blue"
                    badgeText="POOL"
                    trend="+12%"
                    trendUp={true}
                />

                <CreativeStatCard
                    title="Local DIDs"
                    value={loading ? '—' : summary.localDids}
                    subtitle="Geographic inbound routes"
                    icon={Layers}
                    color="purple"
                    badgeText="DID"
                    trend="+8%"
                    trendUp={true}
                />

                <CreativeStatCard
                    title="Toll-Free Numbers"
                    value={loading ? '—' : summary.tollFree}
                    subtitle="8xx inbound customer channels"
                    icon={PhoneCall}
                    color="emerald"
                    badgeText="TFN"
                    trend="+10%"
                    trendUp={true}
                />

                <CreativeStatCard
                    title="Active Routing"
                    value={loading ? '—' : summary.active}
                    subtitle="Connected to live destinations"
                    icon={CheckCircle2}
                    color="teal"
                    badgeText="LIVE"
                    trend={`${summary.total ? Math.round((summary.active / summary.total) * 100) : 100}%`}
                    trendUp={true}
                />
            </div>

            {isAdmin && quota && (
                <div className="platform-panel-dark rounded-2xl p-4 border border-indigo-200 dark:border-indigo-800/50 bg-indigo-50/50 dark:bg-indigo-950/30 text-sm text-indigo-900 dark:text-indigo-200 shadow-xs flex items-center justify-between flex-wrap gap-2">
                    <div>
                        <strong>Plan numbers: {quota.used} / {quota.limit}</strong>
                        <span className="ml-2 text-xs opacity-90">DIDs and Toll-Free numbers share this allowance.</span>
                    </div>
                    {!quota.hasActivePlan && (
                        <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
                            An active plan is required to add numbers.
                        </span>
                    )}
                </div>
            )}

            {/* Quick Stat Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="platform-panel-dark rounded-2xl p-4 sm:p-5 flex flex-col justify-between border border-gray-200/80 dark:border-white/10 shadow-xs hover:border-gray-300 dark:hover:border-white/20 transition-all duration-200">
                    <div className="flex items-center gap-2.5 text-gray-500 dark:text-gray-400 text-xs sm:text-sm font-medium">
                        <div className="h-8 w-8 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-800/40 flex items-center justify-center text-blue-600 dark:text-blue-400">
                            <Layers className="h-4 w-4" />
                        </div>
                        <span>Total Numbers</span>
                    </div>
                    <div className="mt-4 text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight">{summary.total}</div>
                </div>

                <div className="platform-panel-dark rounded-2xl p-4 sm:p-5 flex flex-col justify-between border border-gray-200/80 dark:border-white/10 shadow-xs hover:border-gray-300 dark:hover:border-white/20 transition-all duration-200">
                    <div className="flex items-center gap-2.5 text-gray-500 dark:text-gray-400 text-xs sm:text-sm font-medium">
                        <div className="h-8 w-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-800/40 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                            <Hash className="h-4 w-4" />
                        </div>
                        <span>Local (DID)</span>
                    </div>
                    <div className="mt-4 text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight">{summary.localDids}</div>
                </div>

                <div className="platform-panel-dark rounded-2xl p-4 sm:p-5 flex flex-col justify-between border border-gray-200/80 dark:border-white/10 shadow-xs hover:border-gray-300 dark:hover:border-white/20 transition-all duration-200">
                    <div className="flex items-center gap-2.5 text-gray-500 dark:text-gray-400 text-xs sm:text-sm font-medium">
                        <div className="h-8 w-8 rounded-xl bg-purple-50 dark:bg-purple-950/40 border border-purple-100 dark:border-purple-800/40 flex items-center justify-center text-purple-600 dark:text-purple-400">
                            <PhoneCall className="h-4 w-4" />
                        </div>
                        <span>Toll-Free (TFN)</span>
                    </div>
                    <div className="mt-4 text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight">{summary.tollFree}</div>
                </div>

                <div className="platform-panel-dark rounded-2xl p-4 sm:p-5 flex flex-col justify-between border border-gray-200/80 dark:border-white/10 shadow-xs hover:border-gray-300 dark:hover:border-white/20 transition-all duration-200">
                    <div className="flex items-center gap-2.5 text-gray-500 dark:text-gray-400 text-xs sm:text-sm font-medium">
                        <div className="h-8 w-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-800/40 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                            <CheckCircle2 className="h-4 w-4" />
                        </div>
                        <span>Active Numbers</span>
                    </div>
                    <div className="mt-4 text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight">{summary.active}</div>
                </div>
            </div>

            {/* Filter and Search Bar */}
            <div className="bg-white dark:bg-[#0c0d12] p-3 rounded-2xl border border-gray-200/80 dark:border-white/10 shadow-xs flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
                <div className="relative flex-1">
                    <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Search by number or route..."
                        className="w-full pl-10 pr-4 py-2 text-sm rounded-xl bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                </div>

                <div className="flex flex-wrap items-center gap-2.5">
                    {/* Type Filter */}
                    <div className="inline-flex rounded-xl border border-gray-200 dark:border-white/10 p-1 bg-gray-100 dark:bg-black/30">
                        <button
                            type="button"
                            onClick={() => setTypeFilter('ALL')}
                            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${typeFilter === 'ALL'
                                ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-xs'
                                : 'text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white'
                                }`}
                        >
                            All Types
                        </button>
                        <button
                            type="button"
                            onClick={() => setTypeFilter('DID')}
                            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${typeFilter === 'DID'
                                ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-xs'
                                : 'text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white'
                                }`}
                        >
                            Local (DID)
                        </button>
                        <button
                            type="button"
                            onClick={() => setTypeFilter('TFN')}
                            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${typeFilter === 'TFN'
                                ? 'bg-white dark:bg-slate-800 text-purple-600 dark:text-purple-400 shadow-xs'
                                : 'text-gray-600 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white'
                                }`}
                        >
                            Toll-Free (TFN)
                        </button>
                    </div>

                    {/* Status Filter */}
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="text-xs font-semibold py-2 px-3 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#0c0d12] text-gray-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer shadow-xs"
                    >
                        <option value="ALL">All Statuses</option>
                        <option value="ACTIVE">Active</option>
                        <option value="INACTIVE">Inactive</option>
                    </select>
                </div>
            </div>

            {/* Table */}
            <div className="bg-white dark:bg-[#0c0d12] rounded-2xl border border-gray-200/80 dark:border-white/10 shadow-xs overflow-hidden">
                {loading ? (
                    <div className="py-20 text-center">
                        <RefreshCw className="w-8 h-8 animate-spin text-indigo-600 dark:text-indigo-400 mx-auto mb-3" />
                        <p className="text-sm font-medium text-gray-500 dark:text-slate-400">Loading phone numbers...</p>
                    </div>
                ) : filteredNumbers.length === 0 ? (
                    <div className="py-16 text-center px-4">
                        <div className="w-12 h-12 rounded-2xl bg-gray-100 dark:bg-white/[0.04] text-gray-400 mx-auto flex items-center justify-center mb-3">
                            <Phone className="w-6 h-6" />
                        </div>
                        <h3 className="text-base font-bold text-gray-900 dark:text-white">No phone numbers found</h3>
                        <p className="text-sm text-gray-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
                            {searchTerm || typeFilter !== 'ALL' || statusFilter !== 'ALL'
                                ? 'Try clearing your search query or adjusting your filters.'
                                : 'You do not have any phone numbers assigned yet.'}
                        </p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-gray-200/80 dark:border-white/10 bg-gray-50/70 dark:bg-black/20 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                                    <th className="py-3.5 px-6">Phone Number</th>
                                    <th className="py-3.5 px-6">Type</th>
                                    <th className="py-3.5 px-6">Status</th>
                                    <th className="py-3.5 px-6">Monthly Cost</th>
                                    <th className="py-3.5 px-6">Inbound Routing</th>
                                    <th className="py-3.5 px-6 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-white/[0.04] text-sm">
                                {paginatedNumbers.map((item) => {
                                    const isDid = item.type === 'DID';
                                    const isActive = item.status?.toUpperCase() === 'ACTIVE';

                                    return (
                                        <tr
                                            key={item.id}
                                            className="hover:bg-gray-50/60 dark:hover:bg-white/[0.02] transition-colors"
                                        >
                                            {/* Phone Number */}
                                            <td className="py-4 px-6">
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${isDid
                                                        ? 'bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400 border border-blue-100 dark:border-blue-800/40'
                                                        : 'bg-purple-50 text-purple-600 dark:bg-purple-950/40 dark:text-purple-400 border border-purple-100 dark:border-purple-800/40'
                                                        }`}>
                                                        <Phone className="w-4 h-4" />
                                                    </div>
                                                    <div>
                                                        <span className="font-mono font-bold text-gray-900 dark:text-white block">
                                                            {formatPhoneNumber(item.number)}
                                                        </span>
                                                        <span className="text-xs text-gray-400 font-mono">
                                                            {item.number}
                                                        </span>
                                                    </div>
                                                </div>
                                            </td>

                                            {/* Type Badge */}
                                            <td className="py-4 px-6">
                                                {isDid ? (
                                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300 border border-blue-200 dark:border-blue-800/40">
                                                        <Hash className="w-3 h-3" />
                                                        Local
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-purple-50 text-purple-700 dark:bg-purple-950/50 dark:text-purple-300 border border-purple-200 dark:border-purple-800/40">
                                                        <PhoneCall className="w-3 h-3" />
                                                        Toll-Free
                                                    </span>
                                                )}
                                            </td>

                                            {/* Status Badge */}
                                            <td className="py-4 px-6">
                                                {isActive ? (
                                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800/40">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                                                        Active
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-gray-400"></span>
                                                        {item.status || 'Inactive'}
                                                    </span>
                                                )}
                                            </td>

                                            {/* Monthly Cost */}
                                            <td className="py-4 px-6">
                                                <span className="font-semibold text-gray-900 dark:text-white font-mono">
                                                    ${Number(item.monthlyFee || 0).toFixed(2)}
                                                </span>
                                                <span className="text-xs text-gray-400 font-normal ml-1">/mo</span>
                                            </td>

                                            {/* Inbound Routing */}
                                            <td className="py-4 px-6">
                                                {getRouteBadge(item)}
                                            </td>

                                            {/* Actions */}
                                            <td className="py-4 px-6 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    {isAdmin && (
                                                        <button
                                                            type="button"
                                                            onClick={() => handleOpenRouting(item)}
                                                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 dark:bg-indigo-950/50 dark:hover:bg-indigo-900/60 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/50 transition-all active:scale-95 shadow-xs"
                                                        >
                                                            <SlidersHorizontal className="w-3.5 h-3.5" />
                                                            Configure
                                                        </button>
                                                    )}
                                                    {isAdmin && (
                                                        <button
                                                            type="button"
                                                            onClick={() => handleRemoveNumber(item)}
                                                            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-bold rounded-xl text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/40 transition-all active:scale-95"
                                                            aria-label={`Remove ${item.number}`}
                                                        >
                                                            <Trash2 className="h-3.5 w-3.5" /> Remove
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Pagination */}
                <Pagination
                    page={page}
                    limit={limit}
                    total={filteredNumbers.length}
                    onPageChange={setPage}
                    onLimitChange={(l) => { setLimit(l); setPage(1); }}
                    itemName="phone numbers"
                />
            </div>

            {/* Routing Modal */}
            <RoutingModal
                isOpen={routingModalOpen}
                onClose={() => {
                    setRoutingModalOpen(false);
                    setSelectedNumber(null);
                }}
                phoneNumber={selectedNumber}
                onSave={handleRoutingSaved}
            />

            {adding && (
                <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 backdrop-blur-xs p-4" role="dialog" aria-modal="true" aria-label="Add phone number">
                    <form onSubmit={handleAddNumber} className="w-full max-w-md space-y-4 rounded-2xl bg-white dark:bg-[#0c0d12] border border-gray-200 dark:border-white/10 p-6 shadow-2xl">
                        <div className="flex items-center gap-3 pb-2 border-b border-gray-100 dark:border-white/10">
                            <div className="h-10 w-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-800/40 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                                <Plus className="h-5 w-5" />
                            </div>
                            <div>
                                <h2 className="text-lg font-bold text-gray-900 dark:text-white">Add Phone Number</h2>
                                <p className="text-xs text-gray-500 dark:text-slate-400">{quota?.remaining} of {quota?.limit} plan slots available.</p>
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1" htmlFor="number-type">Number Type</label>
                            <select
                                id="number-type"
                                value={addType}
                                onChange={event => setAddType(event.target.value)}
                                className="w-full rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-black/20 p-2.5 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            >
                                <option value="DID">Local / DID</option>
                                <option value="TFN">Toll-Free / TFN</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1" htmlFor="number-subscription">Owning Subscription</label>
                            <select
                                id="number-subscription"
                                value={subscriptionId}
                                onChange={event => setSubscriptionId(event.target.value)}
                                required
                                className="w-full rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-black/20 p-2.5 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            >
                                <option value="">Select a subscription</option>
                                {quota?.subscriptions?.map(s => (
                                    <option disabled={s.usage.numbers >= s.entitlement_snapshot.numbers} value={s.id} key={s.id}>
                                        {s.plan_name} ({s.subscription_id}) — {Math.max(0, s.entitlement_snapshot.numbers - s.usage.numbers)} available
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1" htmlFor="new-number">Phone Number (E.164 format)</label>
                            <input
                                id="new-number"
                                type="tel"
                                required
                                value={newNumber}
                                onChange={event => setNewNumber(event.target.value)}
                                placeholder="+15551234567"
                                className="w-full rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-black/20 p-2.5 text-sm font-mono text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                        </div>

                        {numberError && (
                            <p role="alert" className="text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30 p-2.5 rounded-xl border border-red-200 dark:border-red-800/40">
                                {numberError}
                            </p>
                        )}

                        <div className="flex justify-end gap-2.5 pt-2">
                            <button
                                type="button"
                                onClick={() => setAdding(false)}
                                disabled={savingNumber}
                                className="rounded-xl px-4 py-2 text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/[0.04] transition-all"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={savingNumber}
                                className="rounded-xl bg-indigo-600 hover:bg-indigo-700 px-5 py-2 text-sm font-semibold text-white shadow-xs transition-all active:scale-95 disabled:opacity-50"
                            >
                                {savingNumber ? 'Adding…' : 'Add Number'}
                            </button>
                        </div>
                    </form>
                </div>
            )}
        </div>
    );
};

export default PhoneNumbersPage;
