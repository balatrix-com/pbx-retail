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
    Hash
} from 'lucide-react';
import RoutingModal from '../../components/telecom/RoutingModal';

const PhoneNumbersPage = () => {
    const { user } = useAuth();
    const { addToast } = useToast();

    const [numbers, setNumbers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [walletBalance, setWalletBalance] = useState(0);

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
            const [numbersData, walletData] = await Promise.all([
                telecomService.getPhoneNumbers(),
                user?.tenantId ? walletService.getWallet(user.tenantId).catch(() => ({ balance: 0 })) : Promise.resolve({ balance: 0 })
            ]);

            setNumbers(Array.isArray(numbersData) ? numbersData : []);
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
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400">
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
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-800/40">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
                {label}{detail}
            </span>
        );
    };

    return (
        <div className="min-h-full space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-extrabold tracking-tight text-gray-900 dark:text-white">
                        Phone Numbers
                    </h1>
                    <p className="text-slate-600 dark:text-slate-400 mt-1.5 font-medium">
                        Unified management for Local DIDs and Toll-Free numbers with inbound routing rules.
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    <span className="text-sm text-gray-700 dark:text-slate-300 font-mono bg-white dark:bg-[#0d0e13] border border-gray-200 dark:border-white/[0.08] px-3.5 py-2 rounded-lg shadow-sm">
                        Available Balance:
                        <span className="font-bold text-indigo-600 dark:text-indigo-400 ml-2">
                            ${Number(walletBalance).toFixed(2)}
                        </span>
                    </span>

                    <button
                        onClick={() => loadData(true)}
                        disabled={refreshing}
                        className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-semibold rounded-lg bg-white dark:bg-slate-800 text-gray-700 dark:text-slate-200 border border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700 transition shadow-sm"
                        title="Refresh numbers"
                    >
                        <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                        <span className="hidden sm:inline">Refresh</span>
                    </button>
                </div>
            </div>

            {/* Quick Stat Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div className="bg-white dark:bg-[#0d0e13] border border-gray-200/80 dark:border-white/[0.08] rounded-xl p-4 shadow-sm">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-slate-400">Total Numbers</span>
                        <div className="p-2 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400">
                            <Layers className="w-4 h-4" />
                        </div>
                    </div>
                    <div className="text-2xl font-bold text-gray-900 dark:text-white mt-2">{summary.total}</div>
                </div>

                <div className="bg-white dark:bg-[#0d0e13] border border-gray-200/80 dark:border-white/[0.08] rounded-xl p-4 shadow-sm">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-slate-400">Local (DID)</span>
                        <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400">
                            <Hash className="w-4 h-4" />
                        </div>
                    </div>
                    <div className="text-2xl font-bold text-gray-900 dark:text-white mt-2">{summary.localDids}</div>
                </div>

                <div className="bg-white dark:bg-[#0d0e13] border border-gray-200/80 dark:border-white/[0.08] rounded-xl p-4 shadow-sm">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-slate-400">Toll-Free (TFN)</span>
                        <div className="p-2 rounded-lg bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400">
                            <PhoneCall className="w-4 h-4" />
                        </div>
                    </div>
                    <div className="text-2xl font-bold text-gray-900 dark:text-white mt-2">{summary.tollFree}</div>
                </div>

                <div className="bg-white dark:bg-[#0d0e13] border border-gray-200/80 dark:border-white/[0.08] rounded-xl p-4 shadow-sm">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-slate-400">Active Numbers</span>
                        <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400">
                            <CheckCircle2 className="w-4 h-4" />
                        </div>
                    </div>
                    <div className="text-2xl font-bold text-gray-900 dark:text-white mt-2">{summary.active}</div>
                </div>
            </div>

            {/* Filter and Search Bar */}
            <div className="bg-white dark:bg-[#0d0e13] border border-gray-200/80 dark:border-white/[0.08] rounded-xl p-4 shadow-sm flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between">
                <div className="relative flex-1">
                    <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Search by number or route..."
                        className="w-full pl-10 pr-4 py-2 text-sm rounded-lg bg-gray-50 dark:bg-[#151720] border border-gray-200 dark:border-white/[0.08] text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    {/* Type Filter */}
                    <div className="inline-flex rounded-lg border border-gray-200 dark:border-white/[0.08] p-0.5 bg-gray-50 dark:bg-[#151720]">
                        <button
                            type="button"
                            onClick={() => setTypeFilter('ALL')}
                            className={`px-3 py-1.5 text-xs font-bold rounded-md transition ${typeFilter === 'ALL'
                                ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-xs'
                                : 'text-gray-600 dark:text-slate-400 hover:text-gray-900'
                                }`}
                        >
                            All Types
                        </button>
                        <button
                            type="button"
                            onClick={() => setTypeFilter('DID')}
                            className={`px-3 py-1.5 text-xs font-bold rounded-md transition ${typeFilter === 'DID'
                                ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-xs'
                                : 'text-gray-600 dark:text-slate-400 hover:text-gray-900'
                                }`}
                        >
                            Local (DID)
                        </button>
                        <button
                            type="button"
                            onClick={() => setTypeFilter('TFN')}
                            className={`px-3 py-1.5 text-xs font-bold rounded-md transition ${typeFilter === 'TFN'
                                ? 'bg-white dark:bg-slate-800 text-purple-600 dark:text-purple-400 shadow-xs'
                                : 'text-gray-600 dark:text-slate-400 hover:text-gray-900'
                                }`}
                        >
                            Toll-Free (TFN)
                        </button>
                    </div>

                    {/* Status Filter */}
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="text-xs font-semibold py-2 px-3 rounded-lg border border-gray-200 dark:border-white/[0.08] bg-white dark:bg-[#151720] text-gray-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                    >
                        <option value="ALL">All Statuses</option>
                        <option value="ACTIVE">Active</option>
                        <option value="INACTIVE">Inactive</option>
                    </select>
                </div>
            </div>

            {/* Table */}
            <div className="bg-white dark:bg-[#0d0e13] border border-gray-200/80 dark:border-white/[0.08] rounded-xl shadow-sm overflow-hidden">
                {loading ? (
                    <div className="py-20 text-center">
                        <RefreshCw className="w-8 h-8 animate-spin text-indigo-600 dark:text-indigo-400 mx-auto mb-3" />
                        <p className="text-sm font-medium text-gray-500 dark:text-slate-400">Loading phone numbers...</p>
                    </div>
                ) : filteredNumbers.length === 0 ? (
                    <div className="py-16 text-center px-4">
                        <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-slate-800/80 text-gray-400 mx-auto flex items-center justify-center mb-3">
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
                                <tr className="border-b border-gray-200/80 dark:border-white/[0.06] bg-gray-50/70 dark:bg-black/20 text-xs font-extrabold uppercase tracking-wider text-gray-500 dark:text-slate-400">
                                    <th className="py-3.5 px-6">Phone Number</th>
                                    <th className="py-3.5 px-6">Type</th>
                                    <th className="py-3.5 px-6">Status</th>
                                    <th className="py-3.5 px-6">Monthly Cost</th>
                                    <th className="py-3.5 px-6">Inbound Routing</th>
                                    <th className="py-3.5 px-6 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-white/[0.04] text-sm">
                                {filteredNumbers.map((item) => {
                                    const isDid = item.type === 'DID';
                                    const isActive = item.status?.toUpperCase() === 'ACTIVE';

                                    return (
                                        <tr
                                            key={item.id}
                                            className="hover:bg-gray-50/60 dark:hover:bg-white/[0.02] transition"
                                        >
                                            {/* Phone Number */}
                                            <td className="py-4 px-6">
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${isDid
                                                        ? 'bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400'
                                                        : 'bg-purple-50 text-purple-600 dark:bg-purple-950/40 dark:text-purple-400'
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
                                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300 border border-blue-200 dark:border-blue-800/40">
                                                        <Hash className="w-3 h-3" />
                                                        Local
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold bg-purple-50 text-purple-700 dark:bg-purple-950/50 dark:text-purple-300 border border-purple-200 dark:border-purple-800/40">
                                                        <PhoneCall className="w-3 h-3" />
                                                        Toll-Free
                                                    </span>
                                                )}
                                            </td>

                                            {/* Status Badge */}
                                            <td className="py-4 px-6">
                                                {isActive ? (
                                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800/40">
                                                        <CheckCircle2 className="w-3 h-3" />
                                                        Active
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300">
                                                        <XCircle className="w-3 h-3" />
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
                                                <button
                                                    type="button"
                                                    onClick={() => handleOpenRouting(item)}
                                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 dark:bg-indigo-950/50 dark:hover:bg-indigo-900/60 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/50 transition"
                                                >
                                                    <SlidersHorizontal className="w-3.5 h-3.5" />
                                                    Configure
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
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
        </div>
    );
};

export default PhoneNumbersPage;
