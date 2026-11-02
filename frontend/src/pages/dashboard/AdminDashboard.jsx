import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { walletService } from '../../services/wallet.service';
import { usageService } from '../../services/usage.service';
import { useBillingIntelligence } from '../../hooks/useBillingIntelligence';
import { useWalletQuery, useWalletTransactionsQuery, useSubscriptionQuery, useUsageSummaryQuery, useServiceStateQuery, useWalletActions } from '../../hooks/useBillingQueries';
import {
    Wallet,
    Phone,
    ArrowUpRight,
    AlertTriangle,
    CheckCircle,
    AlertOctagon,
    TrendingUp,
    ShieldCheck,
    ArrowRight,
    RefreshCw,
    Settings,
    Lock,
    Mic
} from 'lucide-react';
import { telecomService } from '../../services/telecom.service';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

const AdminDashboard = () => {
    const { user } = useAuth();

    // Queries
    const { data: wallet, isLoading: walletLoading, isFetching: refreshing } = useWalletQuery();
    const { data: transactions = [] } = useWalletTransactionsQuery();
    const { data: subscription, isLoading: subLoading } = useSubscriptionQuery();
    const { data: usageSummary, isLoading: usageLoading } = useUsageSummaryQuery();
    const { data: serviceState, isLoading: stateLoading } = useServiceStateQuery();
    const { refreshWallet } = useWalletActions();

    const [recordingEnabled, setRecordingEnabled] = useState(false);
    const [recordingAllowed, setRecordingAllowed] = useState(false);
    const [toggling, setToggling] = useState(false);

    useEffect(() => {
        telecomService.getRecordingStatus()
            .then(res => {
                setRecordingEnabled(res.enabled);
                setRecordingAllowed(res.allowed);
            })
            .catch(e => console.error(e));
    }, []);

    const handleToggleRecording = async () => {
        if (!recordingAllowed) return;
        setToggling(true);
        try {
            const res = await telecomService.toggleRecording(!recordingEnabled);
            setRecordingEnabled(res.enabled);
        } catch (e) {
            console.error('Failed to toggle recording', e);
        } finally {
            setToggling(false);
        }
    };

    const intelligence = useBillingIntelligence(wallet, subscription);

    const loading = walletLoading || usageLoading || stateLoading || subLoading;

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
            </div>
        );
    }

    // Enforcement state mapping
    const enforcementConfig = {
        'SERVICE_ACTIVE': {
            show: false,
        },
        'WALLET_ZERO': {
            show: true,
            color: 'yellow',
            icon: AlertTriangle,
            title: 'Low Balance',
            message: 'Your balance is $0. Please add funds to keep your service active.',
            action: { text: 'Add Funds', link: '/wallet' }
        },
        'WALLET_NEGATIVE': {
            show: true,
            color: 'red',
            icon: AlertOctagon,
            title: 'Action Required',
            message: 'Your balance is negative. Service is restricted. Please recharge now to restore calls.',
            action: { text: 'Fix Now', link: '/wallet' }
        },
    };

    const enforcement = enforcementConfig[serviceState] || enforcementConfig['SERVICE_ACTIVE'];

    return (
        <div className="space-y-8 font-sans pb-12 animate-in fade-in slide-in-from-bottom-4 duration-500">

            {/* Premium Hero Section */}
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary-900 to-primary-800 px-8 py-12 shadow-2xl sm:px-12 lg:px-16">
                <div className="absolute inset-0 bg-[url('/svg logo/logo-main.svg')] opacity-5 bg-no-repeat bg-center bg-cover mix-blend-overlay"></div>
                <div className="relative z-10 md:flex md:items-center md:justify-between">
                    <div>
                        <h1 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl mb-2">
                            Welcome back, {user?.name?.split(' ')[0] || 'Admin'}
                        </h1>
                        <p className="text-lg text-primary-100 max-w-2xl font-medium">
                            Command your telecom infrastructure with precision. Here is your system snapshot for today.
                        </p>
                    </div>
                    {user?.role !== 'SUPPORT' && (
                        <div className="mt-6 md:mt-0 flex shrink-0">
                            <Link
                                to="/wallet"
                                className="inline-flex items-center rounded-xl bg-white px-6 py-3 text-sm font-bold text-primary-900 shadow-sm hover:bg-gray-50 transition-all hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-primary-900"
                            >
                                <Wallet className="mr-2 h-5 w-5 text-primary-600" aria-hidden="true" />
                                Add Funds
                            </Link>
                        </div>
                    )}
                </div>
            </div>

            {/* Enforcement Banner */}
            {enforcement.show && (
                <div className={`rounded-2xl p-6 border-l-4 shadow-sm ${enforcement.color === 'red'
                    ? 'bg-red-50 border-red-500'
                    : 'bg-yellow-50 border-yellow-400'
                    }`}>
                    <div className="flex items-start">
                        <div className="flex-shrink-0">
                            <enforcement.icon className={`h-6 w-6 mt-0.5 ${enforcement.color === 'red' ? 'text-red-600' : 'text-yellow-600'
                                }`} aria-hidden="true" />
                        </div>
                        <div className="ml-4 flex-1">
                            <h3 className={`text-sm font-bold uppercase tracking-wider ${enforcement.color === 'red' ? 'text-red-800' : 'text-yellow-800'
                                }`}>
                                {enforcement.title}
                            </h3>
                            <div className={`mt-2 text-base font-medium ${enforcement.color === 'red' ? 'text-red-700' : 'text-yellow-700'
                                }`}>
                                <p>{enforcement.message}</p>
                            </div>
                            {enforcement.action && (
                                <div className="mt-5">
                                    <Link
                                        to={enforcement.action.link}
                                        className={`inline-flex items-center rounded-lg px-4 py-2 text-sm font-bold text-white shadow-sm transition-colors ${enforcement.color === 'red'
                                            ? 'bg-red-600 hover:bg-red-700'
                                            : 'bg-yellow-600 hover:bg-yellow-700'
                                            }`}
                                    >
                                        {enforcement.action.text}
                                        <ArrowRight className="ml-2 h-4 w-4" />
                                    </Link>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* General Health Intelligence Alert */}
            {intelligence.health.status !== 'SAFE' && !enforcement.show && (
                <div className={`rounded-2xl p-6 border-l-4 shadow-sm ${intelligence.health.status === 'CRITICAL' ? 'bg-red-50 border-red-500' : 'bg-yellow-50 border-yellow-400'
                    }`}>
                    <div className="flex items-start">
                        <div className="flex-shrink-0">
                            <AlertTriangle className={`h-6 w-6 mt-0.5 ${intelligence.health.status === 'CRITICAL' ? 'text-red-600' : 'text-yellow-600'
                                }`} aria-hidden="true" />
                        </div>
                        <div className="ml-4">
                            <h3 className={`text-sm font-bold uppercase tracking-wider ${intelligence.health.status === 'CRITICAL' ? 'text-red-800' : 'text-yellow-800'
                                }`}>
                                Account Attention Needed
                            </h3>
                            <div className={`mt-2 text-base font-medium ${intelligence.health.status === 'CRITICAL' ? 'text-red-700' : 'text-yellow-700'
                                }`}>
                                <ul className="list-disc pl-5 space-y-1">
                                    {intelligence.health.alerts.map((alert, idx) => (
                                        <li key={idx}>
                                            {alert}
                                            {alert.includes('Wallet') && user?.role !== 'SUPPORT' && (
                                                <Link to="/wallet" className="ml-2 font-bold underline hover:opacity-80 transition-opacity">
                                                    Resolve
                                                </Link>
                                            )}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Elevated KPI Cards */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">

                {/* Billing Health Card */}
                <div className="platform-panel-dark rounded-2xl p-4 sm:p-5 flex flex-col justify-between">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-xs sm:text-sm font-medium">
                            <ShieldCheck className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                            <span>System Health</span>
                        </div>
                        <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${intelligence.health.status === 'SAFE' ? 'text-green-700 bg-green-50 border-green-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800/40' :
                            intelligence.health.status === 'WARNING' ? 'text-yellow-700 bg-yellow-50 border-yellow-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800/40' : 'text-red-700 bg-red-50 border-red-200 dark:bg-red-950/40 dark:text-red-400 dark:border-red-800/40'
                            }`}>
                            {intelligence.health.status}
                        </span>
                    </div>
                    <div className="mt-3">
                        <div className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                            {intelligence.health.status === 'SAFE' ? 'Operational' : 'Action Needed'}
                        </div>
                        {intelligence.financial.runwayDays < 30 && (
                            <p className="mt-2 flex items-center text-xs font-medium text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40 inline-flex px-2 py-1 rounded-md">
                                <AlertTriangle className="mr-1.5 h-3.5 w-3.5" />
                                {intelligence.financial.runwayDays > 900 ? 'Stable runway' : `~${intelligence.financial.runwayDays} days runway left`}
                            </p>
                        )}
                    </div>
                </div>

                {/* Wallet Balance Card */}
                <div className="platform-panel-dark rounded-2xl p-4 sm:p-5 flex flex-col justify-between">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-xs sm:text-sm font-medium">
                            <Wallet className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                            <span>Available Balance</span>
                        </div>
                        <button
                            onClick={() => refreshWallet()}
                            disabled={refreshing}
                            className={`p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 ${refreshing ? 'animate-spin' : ''}`}
                            title="Refresh balance"
                        >
                            <RefreshCw className="h-3.5 w-3.5" />
                        </button>
                    </div>
                    <div className="mt-3">
                        <div className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                            ${Number(wallet?.balance || 0).toFixed(2)}
                        </div>
                        {wallet?.creditLimit !== undefined && (
                            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-slate-400 mt-1">
                                Credit Limit: ${Number(wallet.creditLimit).toFixed(2)}
                            </span>
                        )}
                        <p className="mt-2 text-xs font-medium text-slate-500 dark:text-slate-400 flex items-center">
                            <TrendingUp className="mr-1.5 h-3.5 w-3.5 text-emerald-500" />
                            Burn: ~${intelligence.financial.burnRate.toFixed(2)}/day
                        </p>
                    </div>
                </div>

                {/* Total Usage Card */}
                <div className="platform-panel-dark rounded-2xl p-4 sm:p-5 flex flex-col justify-between">
                    <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-xs sm:text-sm font-medium">
                        <Phone className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                        <span>Free Minutes Usage</span>
                    </div>
                    <div className="mt-3">
                        <p className="flex items-baseline gap-x-2">
                            <span className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                                {intelligence.usage.usedMins}
                            </span>
                            <span className="text-xs font-semibold text-slate-400 dark:text-slate-500">/ {intelligence.usage.totalMins} min</span>
                        </p>
                        <div className="mt-3 w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2 overflow-hidden">
                            <div
                                className={`h-full transition-all duration-1000 ${intelligence.usage.usedPercent > 90 ? 'bg-red-500' : intelligence.usage.usedPercent > 75 ? 'bg-amber-500' : 'bg-blue-600 dark:bg-blue-500'}`}
                                style={{ width: `${intelligence.usage.usedPercent}%` }}
                            ></div>
                        </div>
                        <p className="mt-2 text-[10px] font-bold text-slate-400 dark:text-slate-500 flex justify-between">
                            <span>{intelligence.usage.usedPercent.toFixed(1)}% Consumed</span>
                            <span>{intelligence.usage.totalMins - intelligence.usage.usedMins} mins left</span>
                        </p>
                    </div>
                </div>

                {/* Tenant Settings Card */}
                {recordingAllowed && (
                    <div className="platform-panel-dark rounded-2xl p-4 sm:p-5 flex flex-col justify-between">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-xs sm:text-sm font-medium">
                                <Mic className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                                <span>Global Settings</span>
                            </div>
                            <button
                                onClick={handleToggleRecording}
                                disabled={toggling}
                                className={`relative inline-flex h-5 w-10 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${recordingEnabled ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-700'} ${toggling ? 'opacity-50 cursor-not-allowed' : ''}`}
                            >
                                <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${recordingEnabled ? 'translate-x-5' : 'translate-x-0'}`} />
                            </button>
                        </div>
                        <div className="mt-3">
                            <p className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">Call Recording</p>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Record all inbound and outbound calls</p>
                        </div>
                    </div>
                )}

            </div>

            {/* Recent Transactions Table */}
            <div className="mt-8 rounded-2xl bg-white shadow-sm ring-1 ring-gray-100 overflow-hidden">
                <div className="border-b border-gray-100 bg-gray-50/50 px-6 py-5 flex items-center justify-between">
                    <h3 className="text-base font-extrabold text-gray-900 tracking-tight">Recent Transactions</h3>
                    <Link to="/wallet" className="text-sm font-bold text-primary-600 hover:text-primary-700 transition-colors flex items-center">
                        View all <ArrowRight className="ml-1 h-4 w-4" />
                    </Link>
                </div>
                <div className="px-6">
                    <ul className="divide-y divide-gray-100">
                        {(transactions || wallet?.transactions || []).slice(0, 5).map((tx) => (
                            <li key={tx.id} className="py-5 hover:bg-gray-50/50 -mx-6 px-6 transition-colors group cursor-default">
                                <div className="flex items-center space-x-4">
                                    <div className="flex-shrink-0">
                                        <div className={`h-10 w-10 rounded-full flex items-center justify-center ${tx.type === 'DEPOSIT' ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-500'
                                            }`}>
                                            {tx.type === 'DEPOSIT' ? <ArrowUpRight className="h-5 w-5" /> : <Wallet className="h-4 w-4" />}
                                        </div>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-bold text-gray-900 truncate group-hover:text-primary-600 transition-colors">
                                            {tx.description}
                                        </p>
                                        <p className="text-sm font-medium text-gray-500 truncate mt-0.5">
                                            {new Date(tx.date).toLocaleDateString(undefined, {
                                                year: 'numeric',
                                                month: 'short',
                                                day: 'numeric'
                                            })}
                                        </p>
                                    </div>
                                    <div className={`text-base font-extrabold ${tx.type === 'DEPOSIT' ? 'text-green-600' : 'text-gray-900'
                                        }`}>
                                        {tx.type === 'DEPOSIT' ? '+' : '-'}${Number(tx.amount).toFixed(2)}
                                    </div>
                                </div>
                            </li>
                        ))}
                        {(transactions || wallet?.transactions || []).length === 0 && (
                            <li className="py-8 text-center text-sm font-medium text-gray-500">
                                No recent transactions found.
                            </li>
                        )}
                    </ul>
                </div>
            </div>
        </div>
    );
};

export default AdminDashboard;
