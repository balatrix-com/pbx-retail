import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { walletService } from '../../services/wallet.service';
import { useBillingIntelligence } from '../../hooks/useBillingIntelligence';
import { useWalletQuery, useWalletTransactionsQuery, useSubscriptionQuery, useCardsQuery, useWalletActions } from '../../hooks/useBillingQueries';
import { Wallet, ArrowDown, ArrowUp, CreditCard, RotateCw, TrendingDown, Clock, AlertTriangle, CheckCircle, RefreshCw, DollarSign } from 'lucide-react';
import ReadOnlyBanner from '../../components/ReadOnlyBanner';
import CreativeStatCard from '../../components/common/CreativeStatCard';

const WalletPage = () => {
    const { user, isSupport } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [addingFunds, setAddingFunds] = useState(false);
    const [rechargeAmount, setRechargeAmount] = useState('50');
    const [paymentDetails, setPaymentDetails] = useState([]);
    const [paymentDetailsLoading, setPaymentDetailsLoading] = useState(true);

    // Queries
    const { data: wallet, isLoading: walletLoading, isFetching: walletRefreshing } = useWalletQuery();
    const { data: transactions = [] } = useWalletTransactionsQuery();
    const { data: subscription, isLoading: subLoading } = useSubscriptionQuery();
    const { data: cards = [], isLoading: cardsLoading } = useCardsQuery();
    const { refreshWallet } = useWalletActions();

    const intelligence = useBillingIntelligence({ ...wallet, transactions }, subscription);

    const { addToast } = useToast();

    const fetchPaymentDetails = useCallback(async () => {
        try {
            setPaymentDetailsLoading(true);
            const data = await walletService.getPaymentDetails();
            setPaymentDetails(data || []);
        } catch (e) {
            console.error('Failed to fetch payment details:', e);
        } finally {
            setPaymentDetailsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchPaymentDetails();
    }, [fetchPaymentDetails]);

    useEffect(() => {
        const queryParams = new URLSearchParams(location.search);
        if (queryParams.get('success')) {
            addToast('success', 'Payment successful! Your wallet will be updated shortly.');
            // Clear query parameters using navigate so React Router is aware
            navigate(window.location.pathname, { replace: true });
            refreshWallet();
            fetchPaymentDetails();
        } else if (queryParams.get('canceled')) {
            addToast('warning', 'Payment was cancelled.');
            navigate(window.location.pathname, { replace: true });
        }
    }, [location.search, addToast, refreshWallet, navigate, fetchPaymentDetails]);

    const handleAddFunds = useCallback(async (amount) => {
        const numericAmount = parseFloat(amount);
        if (isNaN(numericAmount) || numericAmount <= 0) {
            addToast('error', 'Please enter a valid amount');
            return;
        }

        setAddingFunds(true);
        try {
            const data = await walletService.topup(numericAmount);
            if (data?.checkoutUrl) {
                window.location.href = data.checkoutUrl;
            } else {
                addToast('error', 'Failed to initiate payment: No checkout URL');
            }
        } catch (e) {
            console.error(e);
            addToast('error', 'Failed to add funds');
        } finally {
            setAddingFunds(false);
        }
    }, [addToast]);

    const loading = walletLoading || subLoading || cardsLoading;
    const refreshing = walletRefreshing;

    if (loading) return (
        <div className="flex flex-col items-center justify-center p-16">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mb-4"></div>
            <p className="text-gray-500 font-medium">Loading wallet details...</p>
        </div>
    );

    const isReadOnly = isSupport;
    const isAdmin = user?.role === 'ADMIN' || user?.role === 'admin';

    return (
        <div className="w-full pb-16 space-y-7 animate-in fade-in duration-300 max-w-7xl mx-auto">
            {isSupport && (
                <ReadOnlyBanner message="You have read-only access to wallet information" />
            )}
            {/* Header Banner */}
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-teal-700 via-teal-600 to-emerald-600 p-8 text-white shadow-xl shadow-teal-900/15">
                <div className="absolute top-0 right-0 -mt-10 -mr-10 w-80 h-80 rounded-full bg-white/10 blur-2xl pointer-events-none" />
                <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                    <div className="space-y-1.5 max-w-2xl">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 backdrop-blur-md text-xs font-semibold tracking-wide border border-white/20">
                            <Wallet size={14} className="text-teal-200 animate-pulse" />
                            <span>Billing Ledger & Prepaid Funds</span>
                        </div>
                        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                            Wallet & Prepaid Balance
                        </h1>
                        <p className="text-teal-100 text-xs sm:text-sm font-medium">
                            Manage your real-time telecom balance, payment cards, auto-recharge thresholds, and ledger history.
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2.5">
                        {!isAdmin && (
                            <>
                                <button
                                    onClick={() => navigate('/subscriptions')}
                                    className="inline-flex items-center justify-center gap-1.5 rounded-2xl bg-white/15 hover:bg-white/25 text-white backdrop-blur-md border border-white/20 px-4 py-2.5 text-xs font-bold transition-all cursor-pointer"
                                >
                                    <CreditCard size={15} />
                                    <span>Subscriptions</span>
                                </button>
                                <button
                                    onClick={() => navigate('/wallet/cards')}
                                    className="inline-flex items-center justify-center gap-1.5 rounded-2xl bg-white/15 hover:bg-white/25 text-white backdrop-blur-md border border-white/20 px-4 py-2.5 text-xs font-bold transition-all disabled:opacity-50 cursor-pointer"
                                    disabled={isReadOnly}
                                    title={isReadOnly ? "Restricted for Support users" : ""}
                                >
                                    <CreditCard size={15} />
                                    <span>Manage Cards</span>
                                </button>
                                <div className="flex items-center gap-2">
                                    <div className="relative">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/70 font-bold text-xs">$</span>
                                        <input
                                            type="number"
                                            value={rechargeAmount}
                                            onChange={(e) => setRechargeAmount(e.target.value)}
                                            min="1"
                                            step="1"
                                            className="w-20 pl-6 pr-2 py-2 rounded-2xl border border-white/20 text-xs font-bold text-white bg-white/15 backdrop-blur-md focus:outline-none"
                                            placeholder="50"
                                        />
                                    </div>
                                    <button
                                        onClick={() => handleAddFunds(rechargeAmount)}
                                        disabled={addingFunds || isReadOnly || !rechargeAmount || rechargeAmount <= 0}
                                        title={isReadOnly ? "Restricted for Support users" : ""}
                                        className="inline-flex items-center justify-center gap-1.5 rounded-2xl bg-white hover:bg-teal-50 px-5 py-2.5 text-xs font-bold text-teal-800 shadow-lg shadow-black/10 transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
                                    >
                                        <RotateCw size={15} className={addingFunds ? "animate-spin text-teal-700" : "text-teal-700"} />
                                        <span>Add Funds</span>
                                    </button>
                            </div>
                        </>
                    )}
                </div>
            </header>

            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
                {/* Subscription Card */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden relative group hover:shadow-md transition-all duration-300">
                    <div className="p-5 relative z-10">
                        <div className="flex items-center gap-2.5 mb-2">
                            <div className="p-1.5 rounded-lg text-blue-500 bg-blue-50 dark:bg-blue-950/60 dark:text-blue-400 ring-1 ring-blue-500/10 dark:ring-blue-400/20 flex items-center justify-center">
                                <RefreshCw className="h-4 w-4 stroke-[2.2]" />
                            </div>
                            <dt className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Active Plan</dt>
                        </div>
                        <dd className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight mt-2 truncate">
                            {subscription?.plan_name || 'No Active Plan'}
                        </dd>
                    </div>
                    <div className="bg-purple-50/50 dark:bg-purple-950/40 px-6 py-3 border-t border-purple-100 dark:border-purple-900/40 relative z-10">
                        <div className="flex justify-between items-center text-[11px] font-bold uppercase tracking-wider text-purple-700 dark:text-purple-300">
                            <span>{subscription?.limits?.extensions || 0} Extensions</span>
                        </div>
                    </div>
                </div>

                {/* Balance Card */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden relative group hover:shadow-md transition-all duration-300">
                    <div className="p-5 relative z-10">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2.5 mb-2">
                                <div className="p-1.5 rounded-lg text-blue-500 bg-blue-50 dark:bg-blue-950/60 dark:text-blue-400 ring-1 ring-blue-500/10 dark:ring-blue-400/20 flex items-center justify-center">
                                    <Wallet className="h-4 w-4 stroke-[2.2]" />
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>

            {/* Top KPI Cards */}
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
                <CreativeStatCard
                    title="Active Plan"
                    value={subscription?.plan_name || 'No Active Plan'}
                    subtitle={`${subscription?.limits?.extensions || 0} Exts • ${intelligence.usage.usedMins}/${intelligence.usage.totalMins} Mins`}
                    icon={RefreshCw}
                    color="blue"
                    trend="+12%"
                    trendUp={true}
                />
                <CreativeStatCard
                    title="Wallet Float"
                    value={`$${Number(wallet?.balance || 0).toFixed(2)}`}
                    subtitle={`Credit Limit: $${Number(wallet?.creditLimit || 0).toFixed(2)}`}
                    icon={Wallet}
                    color="emerald"
                    trend={wallet?.autoRecharge?.enabled ? "Auto: ON" : "Auto: OFF"}
                    trendUp={Boolean(wallet?.autoRecharge?.enabled)}
                />
                <CreativeStatCard
                    title="Daily Burn Rate"
                    value={`~$${intelligence.financial.burnRate.toFixed(2)}/d`}
                    subtitle="Based on last 7 days activity"
                    icon={TrendingDown}
                    color="purple"
                    trend="+8%"
                    trendUp={true}
                />
                <CreativeStatCard
                    title="Estimated Runway"
                    value={intelligence.financial.runwayDays > 365 ? '> 1 Year' : `~${intelligence.financial.runwayDays} Days`}
                    subtitle={intelligence.financial.runwayDays < 7 ? 'Top-up required soon' : 'Funds are sufficient'}
                    icon={Clock}
                    color={intelligence.financial.runwayDays < 7 ? "amber" : "teal"}
                    trend={intelligence.financial.runwayDays < 7 ? "Low" : "Sufficient"}
                    trendUp={intelligence.financial.runwayDays >= 7}
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Left Column: Cards & Stripe Payments */}
                <div className="space-y-6">
                    <div className="bg-white dark:bg-[#0c0d12] rounded-2xl border border-gray-200/80 dark:border-white/10 shadow-xs overflow-hidden">
                        <div className="px-6 py-4 border-b border-gray-100 dark:border-white/5 bg-gray-50/75 dark:bg-white/[0.02] flex justify-between items-center">
                            <h3 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                <CreditCard className="text-gray-400" size={17} /> Saved Cards
                            </h3>
                            {subscription?.next_billing && (
                                <div className="text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider bg-white dark:bg-white/5 px-2 py-0.5 rounded-lg border border-gray-200/80 dark:border-white/10">
                                    Next Billing: {new Date(subscription.next_billing).toLocaleDateString()}
                                </div>
                            )}
                        </div>
                        <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {cards.length === 0 ? (
                                <div className="col-span-2 py-10 text-center">
                                    <CreditCard className="mx-auto h-8 w-8 text-gray-300 dark:text-gray-600 mb-2" />
                                    <p className="text-xs font-medium text-gray-400">No saved payment methods</p>
                                </div>
                            ) : (
                                cards.map(card => (
                                    <div key={card.id} className="relative flex items-center gap-3.5 p-3.5 rounded-xl border border-gray-200/80 dark:border-white/10 bg-gray-50/50 dark:bg-white/[0.02] hover:border-primary-500/40 transition-all group">
                                        <div className="bg-white dark:bg-white/5 p-2 rounded-lg border border-gray-200/80 dark:border-white/10">
                                            <CreditCard size={18} className="text-gray-600 dark:text-gray-300" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <p className="text-xs font-bold text-gray-900 dark:text-white capitalize">{card.brand}</p>
                                                {card.is_default && (
                                                    <span className="inline-flex items-center rounded-md bg-green-50 text-green-700 ring-1 ring-inset ring-green-600/20 px-1.5 py-0.5 text-[9px] font-bold">DEFAULT</span>
                                                )}
                                            </div>
                                            <p className="text-[11px] font-medium text-gray-400 mt-0.5">•••• {card.last4} • Exp {card.exp_month}/{card.exp_year}</p>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    {/* Stripe Payment History */}
                    <div className="bg-white dark:bg-[#0c0d12] rounded-2xl border border-gray-200/80 dark:border-white/10 shadow-xs overflow-hidden">
                        <div className="px-6 py-4 border-b border-gray-100 dark:border-white/5 bg-gray-50/75 dark:bg-white/[0.02] flex justify-between items-center">
                            <h3 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                <DollarSign className="text-emerald-500 h-4 w-4" /> Stripe Payment History
                            </h3>
                            <button
                                onClick={fetchPaymentDetails}
                                disabled={paymentDetailsLoading}
                                className={`p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-white/5 transition-colors text-gray-400 hover:text-primary-600 ${paymentDetailsLoading ? 'animate-spin' : ''}`}
                                title="Refresh payment history"
                            >
                                <RefreshCw size={14} />
                            </button>
                        </div>
                        <div className="p-0 max-h-[380px] overflow-y-auto">
                            <ul role="list" className="divide-y divide-gray-100 dark:divide-white/5">
                                {paymentDetailsLoading ? (
                                    <li className="p-8 text-center text-gray-400 font-medium flex items-center justify-center gap-2 text-xs">
                                        <RotateCw size={15} className="animate-spin text-primary-600" />
                                        Loading payments...
                                    </li>
                                ) : (!paymentDetails || paymentDetails.length === 0) ? (
                                    <li className="p-8 text-center text-gray-400 text-xs font-medium">No payment records found.</li>
                                ) : (
                                    paymentDetails.map((payment) => (
                                        <li key={payment.payment_id} className="p-3.5 sm:px-6 hover:bg-gray-50/60 dark:hover:bg-white/[0.02] transition-colors">
                                            <div className="flex items-center space-x-3.5">
                                                <div className="flex-shrink-0">
                                                    <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 ring-1 ring-inset ring-emerald-600/20">
                                                        <DollarSign className="h-4 w-4" />
                                                    </span>
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <p className="truncate text-xs font-bold text-gray-900 dark:text-white">{payment.description || 'Wallet Top-up'}</p>
                                                    <p className="truncate text-[10px] font-mono text-gray-400 mt-0.5">
                                                        {payment.payment_id}
                                                    </p>
                                                </div>
                                                <div>
                                                    <span className="inline-flex items-center rounded-lg px-2 py-0.5 text-xs font-mono font-bold bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-600/20">
                                                        +${Number(payment.amount).toFixed(2)}
                                                    </span>
                                                </div>
                                            </div>
                                        </li>
                                    ))
                                )}
                            </ul>
                        </div>
                    </div>
                </div>

                {/* Right Column: Transaction History */}
                <div className="space-y-6">
                    <div className="bg-white dark:bg-[#0c0d12] rounded-2xl border border-gray-200/80 dark:border-white/10 shadow-xs overflow-hidden">
                        <div className="px-6 py-4 border-b border-gray-100 dark:border-white/5 bg-gray-50/75 dark:bg-white/[0.02]">
                            <h3 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                <Clock className="text-gray-400" size={17} /> Transaction History
                            </h3>
                        </div>
                        <div className="p-0 max-h-[380px] overflow-y-auto">
                            <ul role="list" className="divide-y divide-gray-100 dark:divide-white/5">
                                {(!transactions || transactions.length === 0) && (
                                    <li className="p-8 text-center text-gray-400 text-xs font-medium">No transactions found.</li>
                                )}
                                {(transactions || []).map((tx) => (
                                    <li key={tx.id} className="p-3.5 sm:px-6 hover:bg-gray-50/60 dark:hover:bg-white/[0.02] transition-colors">
                                        <div className="flex items-center space-x-3.5">
                                            <div className="flex-shrink-0">
                                                {(tx.type === 'DEPOSIT' || tx.type === 'CREDIT') ? (
                                                    <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-green-50 text-green-600 ring-1 ring-inset ring-green-600/20">
                                                        <ArrowDown className="h-4 w-4" />
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-gray-50 dark:bg-white/5 text-gray-500 ring-1 ring-inset ring-gray-200 dark:ring-white/10">
                                                        <ArrowUp className="h-4 w-4" />
                                                    </span>
                                                )}
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <p className="truncate text-xs font-bold text-gray-900 dark:text-white">{tx.description}</p>
                                                <p className="truncate text-[10px] font-medium text-gray-400 mt-0.5">
                                                    {new Date(tx.date || tx.createdAt).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}
                                                </p>
                                            </div>
                                            <div>
                                                <span className={`inline-flex items-center rounded-lg px-2 py-0.5 text-xs font-mono font-bold ${(tx.type === 'DEPOSIT' || tx.type === 'CREDIT') ? 'bg-green-50 text-green-700 ring-1 ring-inset ring-green-600/20' : 'bg-gray-100 dark:bg-white/5 text-gray-700 dark:text-gray-300'}`}>
                                                    {(tx.type === 'DEPOSIT' || tx.type === 'CREDIT') ? '+' : '-'}${Number(tx.amount).toFixed(2)}
                                                </span>
                                            </div>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default WalletPage;
