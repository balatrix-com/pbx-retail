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
    Mic,
    Activity,
    CreditCard
} from 'lucide-react';
import { telecomService } from '../../services/telecom.service';
import CreativeStatCard from '../../components/common/CreativeStatCard';

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
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div>
            </div>
        );
    }

    return (
        <div className="w-full pb-16 space-y-7 animate-in fade-in duration-300 max-w-7xl mx-auto">
            {/* Header Banner */}
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-teal-700 via-teal-600 to-emerald-600 p-8 text-white shadow-xl shadow-teal-900/15">
                <div className="absolute top-0 right-0 -mt-10 -mr-10 w-80 h-80 rounded-full bg-white/10 blur-2xl pointer-events-none" />
                <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                    <div className="space-y-1.5 max-w-2xl">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 backdrop-blur-md text-xs font-semibold tracking-wide border border-white/20">
                            <Activity size={14} className="text-teal-200 animate-pulse" />
                            <span>Tenant Infrastructure Operations</span>
                        </div>
                        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                            Welcome back, {user?.name?.split(' ')[0] || 'Admin'}
                        </h1>
                        <p className="text-teal-100 text-xs sm:text-sm font-medium">
                            Command your telecom infrastructure with precision. Here is your unified tenant telemetry and billing overview.
                        </p>
                    </div>
                    {user?.role !== 'SUPPORT' && (
                        <Link
                            to="/wallet"
                            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white hover:bg-teal-50 px-5 py-3 text-xs font-bold text-teal-800 shadow-lg shadow-black/10 transition-all active:scale-95 cursor-pointer w-full sm:w-auto"
                        >
                            <Wallet size={16} className="text-teal-700" />
                            <span>Add Funds</span>
                        </Link>
                    )}
                </div>
            </div>

            {/* Elevated KPI Cards - Creative Stat Blocks */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                <CreativeStatCard
                    title="System Health"
                    value={intelligence.health.status === 'SAFE' ? 'Operational' : 'Attention'}
                    subtitle={intelligence.financial.runwayDays > 900 ? 'Stable service runway' : `~${intelligence.financial.runwayDays} days runway remaining`}
                    icon={ShieldCheck}
                    color="blue"
                    badgeText={intelligence.health.status}
                    trend="+99.9%"
                    trendUp={true}
                />

                <CreativeStatCard
                    title="Available Balance"
                    value={`$${Number(wallet?.balance || 0).toFixed(2)}`}
                    subtitle={`Burn: ~$${intelligence.financial.burnRate.toFixed(2)}/day`}
                    icon={Wallet}
                    color="emerald"
                    trend="+10%"
                    trendUp={true}
                    actionButton={
                        <button
                            onClick={() => refreshWallet()}
                            disabled={refreshing}
                            className={`p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-emerald-300 transition-colors ${refreshing ? 'animate-spin' : ''}`}
                            title="Refresh balance"
                        >
                            <RefreshCw className="h-3.5 w-3.5" />
                        </button>
                    }
                />

                <CreativeStatCard
                    title="Bundle Minutes"
                    value={`${intelligence.usage.usedMins} / ${intelligence.usage.totalMins}`}
                    subtitle={`${intelligence.usage.totalMins - intelligence.usage.usedMins} minutes remaining`}
                    icon={Phone}
                    color="purple"
                    badgeText={`${intelligence.usage.usedPercent.toFixed(0)}%`}
                    trend={`+${intelligence.usage.usedPercent.toFixed(0)}%`}
                    trendUp={intelligence.usage.usedPercent < 80}
                />

                <CreativeStatCard
                    title="Call Recording"
                    value={recordingAllowed ? (recordingEnabled ? 'Active' : 'Disabled') : 'Restricted'}
                    subtitle={recordingAllowed ? 'Automatic call leg recording' : 'Not included in active plan'}
                    icon={Mic}
                    color="teal"
                    badgeText={recordingEnabled ? 'LIVE' : 'STANDBY'}
                    actionButton={
                        recordingAllowed && (
                            <button
                                onClick={handleToggleRecording}
                                disabled={toggling}
                                className={`relative inline-flex h-5 w-10 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${recordingEnabled ? 'bg-teal-500' : 'bg-slate-700'} ${toggling ? 'opacity-50 cursor-not-allowed' : ''}`}
                            >
                                <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${recordingEnabled ? 'translate-x-5' : 'translate-x-0'}`} />
                            </button>
                        )
                    }
                />
            </div>

            {/* Recent Transactions Section */}
            <div className="rounded-3xl bg-white/95 dark:bg-slate-900/95 border border-teal-200/70 dark:border-white/10 shadow-sm overflow-hidden backdrop-blur-sm">
                <div className="p-5 sm:p-6 border-b border-teal-100 dark:border-white/5 flex items-center justify-between bg-teal-50/30 dark:bg-white/[0.02]">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-2xl bg-teal-50 dark:bg-teal-950/50 text-teal-600 dark:text-teal-400 border border-teal-200/60 dark:border-teal-800/30 flex items-center justify-center shrink-0">
                            <CreditCard size={20} />
                        </div>
                        <div>
                            <h3 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white">Recent Transactions</h3>
                            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Real-time ledger events and billing mutations</p>
                        </div>
                    </div>
                    <Link to="/wallet" className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-teal-200 dark:border-teal-800/40 bg-teal-50/60 dark:bg-teal-950/40 text-xs font-bold text-teal-700 dark:text-teal-300 hover:bg-teal-600 hover:text-white dark:hover:bg-teal-600 dark:hover:text-white transition-all shadow-xs">
                        View Wallet <ArrowRight size={13} />
                    </Link>
                </div>
                <div className="px-6">
                    <ul className="divide-y divide-teal-100/40 dark:divide-white/5">
                        {(transactions || wallet?.transactions || []).slice(0, 5).map((tx) => (
                            <li key={tx.id} className="py-4 hover:bg-teal-50/30 dark:hover:bg-white/[0.02] -mx-6 px-6 transition-colors group cursor-default">
                                <div className="flex items-center space-x-4">
                                    <div className="flex-shrink-0">
                                        <div className={`h-10 w-10 rounded-2xl flex items-center justify-center ${
                                            tx.type === 'DEPOSIT' ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200/50' : 'bg-teal-50 dark:bg-slate-800 text-teal-700 dark:text-teal-400 border border-teal-200/40'
                                        }`}>
                                            {tx.type === 'DEPOSIT' ? <ArrowUpRight className="h-5 w-5" /> : <Wallet className="h-4 w-4" />}
                                        </div>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-bold text-slate-900 dark:text-white truncate group-hover:text-teal-600 transition-colors">
                                            {tx.description}
                                        </p>
                                        <p className="text-xs font-medium text-slate-400 truncate mt-0.5">
                                            {new Date(tx.date).toLocaleDateString(undefined, {
                                                year: 'numeric',
                                                month: 'short',
                                                day: 'numeric'
                                            })}
                                        </p>
                                    </div>
                                    <div className={`text-base font-extrabold ${tx.type === 'DEPOSIT' ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-800 dark:text-white'}`}>
                                        {tx.type === 'DEPOSIT' ? '+' : '-'}${Number(tx.amount).toFixed(2)}
                                    </div>
                                </div>
                            </li>
                        ))}
                        {(transactions || wallet?.transactions || []).length === 0 && (
                            <li className="py-12 text-center text-sm font-medium text-slate-400">
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
