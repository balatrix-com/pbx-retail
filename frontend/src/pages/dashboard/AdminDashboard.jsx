import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { walletService } from '../../services/wallet.service';
import { usageService } from '../../services/usage.service';
import { useBillingIntelligence } from '../../hooks/useBillingIntelligence';
import { useWalletQuery, useSubscriptionQuery, useUsageSummaryQuery, useServiceStateQuery, useWalletActions } from '../../hooks/useBillingQueries';
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
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">

                {/* Billing Health Card */}
                <div className="rounded-2xl bg-white p-5 shadow-sm border border-slate-100 hover:shadow-md transition-all relative overflow-hidden group">
                    <ShieldCheck className="absolute -bottom-3 -right-2 h-24 w-24 transform -rotate-12 text-blue-400/30 group-hover:scale-105 transition-transform duration-500 pointer-events-none stroke-[2.2]" />
                    <div className="relative z-10 flex items-center justify-between">
                        <div className="p-1.5 rounded-lg text-blue-500 bg-blue-50 ring-1 ring-blue-500/10 flex items-center justify-center">
                            <ShieldCheck className="h-4 w-4 stroke-[2.2]" />
                        </div>
                        <span className={`text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full border ${intelligence.health.status === 'SAFE' ? 'text-green-700 bg-green-50 border-green-200' :
                            intelligence.health.status === 'WARNING' ? 'text-yellow-700 bg-yellow-50 border-yellow-200' : 'text-red-700 bg-red-50 border-red-200'
                            }`}>
                            {intelligence.health.status}
                        </span>
                    </div>
                    <div className="relative z-10 mt-4">
                        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">System Health</h3>
                        <p className="mt-2 text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                            {intelligence.health.status === 'SAFE' ? 'Operational' : 'Action Needed'}
                        </p>
                        {intelligence.financial.runwayDays < 30 && (
                            <p className="mt-2 flex items-center text-sm font-medium text-red-600 bg-red-50 inline-flex px-2 py-1 rounded-md">
                                <AlertTriangle className="mr-1.5 h-4 w-4" />
                                {intelligence.financial.runwayDays > 900 ? 'Stable runway' : `~${intelligence.financial.runwayDays} days runway left`}
                            </p>
                        )}
                    </div>
                </div>

                {/* Wallet Balance Card */}
                <div className="rounded-2xl bg-white p-5 shadow-sm border border-slate-100 hover:shadow-md transition-all relative overflow-hidden group">
                    <Wallet className="absolute -bottom-3 -right-2 h-24 w-24 transform -rotate-12 text-blue-400/30 group-hover:scale-105 transition-transform duration-500 pointer-events-none stroke-[2.2]" />
                    <div className="relative z-10 flex items-center justify-between">
                        <div className="p-1.5 rounded-lg text-blue-500 bg-blue-50 ring-1 ring-blue-500/10 flex items-center justify-center">
                            <Wallet className="h-4 w-4 stroke-[2.2]" />
                        </div>
                    </div>
                    <div className="relative z-10 mt-4">
                        <div className="flex items-center justify-between">
                            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Available Balance</h3>
                            <button
                                onClick={() => refreshWallet()}
                                disabled={refreshing}
                                className={`p-1.5 rounded-lg hover:bg-gray-100 transition-colors text-gray-400 hover:text-primary-600 ${refreshing ? 'animate-spin' : ''}`}
                                title="Refresh balance"
                            >
                                <RefreshCw className="h-4 w-4" />
                            </button>
                        </div>
                        <div className="mt-2 flex flex-col">
                            <span className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
                                ${Number(wallet?.balance || 0).toFixed(2)}
                            </span>
                            {wallet?.creditLimit !== undefined && (
                                <span className="inline-flex items-center gap-1.5 text-xs font-bold text-gray-500 mt-2">
                                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-primary-500"></span>
                                    Credit Limit: ${Number(wallet.creditLimit).toFixed(2)}
                                </span>
                            )}
                        </div>
                        <p className="mt-2 text-sm font-medium text-gray-500 flex items-center">
                            <TrendingUp className="mr-1.5 h-4 w-4 text-green-500" />
                            Burn: ~${intelligence.financial.burnRate.toFixed(2)}/day
                        </p>
                    </div>
                </div>

                {/* Total Usage Card */}
                <div className="rounded-2xl bg-white p-5 shadow-sm border border-slate-100 hover:shadow-md transition-all relative overflow-hidden group">
                    <Phone className="absolute -bottom-3 -right-2 h-24 w-24 transform -rotate-12 text-blue-400/30 group-hover:scale-105 transition-transform duration-500 pointer-events-none stroke-[2.2]" />
                    <div className="relative z-10 flex items-center justify-between">
                        <div className="p-1.5 rounded-lg text-blue-500 bg-blue-50 ring-1 ring-blue-500/10 flex items-center justify-center">
                            <Phone className="h-4 w-4 stroke-[2.2]" />
                        </div>
                    </div>
                    <div className="relative z-10 mt-4">
                        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Free Minutes Usage</h3>
                        <p className="mt-2 flex items-baseline gap-x-2">
                            <span className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
                                {intelligence.usage.usedMins}
                            </span>
                            <span className="text-sm font-bold text-gray-400 uppercase">/ {intelligence.usage.totalMins} min</span>
                        </p>
                        <div className="mt-3 w-full bg-gray-100 rounded-full h-2 overflow-hidden shadow-inner">
                            <div
                                className={`h-full transition-all duration-1000 ${intelligence.usage.usedPercent > 90 ? 'bg-red-500' : intelligence.usage.usedPercent > 75 ? 'bg-amber-500' : 'bg-primary-600'}`}
                                style={{ width: `${intelligence.usage.usedPercent}%` }}
                            ></div>
                        </div>
                        <p className="mt-2 text-[10px] font-extrabold text-gray-400 uppercase tracking-widest flex justify-between">
                            <span>{intelligence.usage.usedPercent.toFixed(1)}% Consumed</span>
                            <span>{intelligence.usage.totalMins - intelligence.usage.usedMins} mins left</span>
                        </p>
                    </div>
                </div>

                {/* Tenant Settings Card */}
                {recordingAllowed && (
                    <div className="rounded-2xl bg-white p-5 shadow-sm border border-slate-100 hover:shadow-md transition-all relative overflow-hidden group">
                        <Mic className="absolute -bottom-3 -right-2 h-24 w-24 transform -rotate-12 text-blue-400/30 group-hover:scale-105 transition-transform duration-500 pointer-events-none stroke-[2.2]" />
                        <div className="relative z-10 flex items-center justify-between">
                            <div className="p-1.5 rounded-lg text-blue-500 bg-blue-50 ring-1 ring-blue-500/10 flex items-center justify-center">
                                <Mic className="h-4 w-4 stroke-[2.2]" />
                            </div>
                            <button
                                onClick={handleToggleRecording}
                                disabled={toggling}
                                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary-600 focus:ring-offset-2 ${recordingEnabled ? 'bg-primary-600' : 'bg-gray-200'} ${toggling ? 'opacity-50 cursor-not-allowed' : ''}`}
                            >
                                <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${recordingEnabled ? 'translate-x-5' : 'translate-x-0'}`} />
                            </button>
                        </div>
                        <div className="relative z-10 mt-4">
                            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Global Settings</h3>
                            <div className="mt-1">
                                <p className="text-sm font-extrabold text-gray-900">Call Recording</p>
                                <p className="text-xs text-gray-500 mt-1">Record all inbound and outbound calls</p>
                            </div>
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
                        {(wallet?.transactions || []).slice(0, 5).map((tx) => (
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
                        {(wallet?.transactions || []).length === 0 && (
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
