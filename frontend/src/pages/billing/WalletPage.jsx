import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { walletService } from '../../services/wallet.service';
import { useBillingIntelligence } from '../../hooks/useBillingIntelligence';
import { useWalletQuery, useSubscriptionQuery, useCardsQuery, useWalletActions } from '../../hooks/useBillingQueries';
import { Wallet, ArrowDown, ArrowUp, CreditCard, RotateCw, TrendingDown, Clock, AlertTriangle, CheckCircle, RefreshCw, DollarSign } from 'lucide-react';
import ReadOnlyBanner from '../../components/ReadOnlyBanner';

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
    const { data: subscription, isLoading: subLoading } = useSubscriptionQuery();
    const { data: cards = [], isLoading: cardsLoading } = useCardsQuery();
    const { refreshWallet } = useWalletActions();

    const intelligence = useBillingIntelligence(wallet, subscription);

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
        <div className="p-4 sm:p-8 max-w-7xl mx-auto space-y-8">
            {isSupport && (
                <ReadOnlyBanner message="You have read-only access to wallet information" />
            )}
            <header className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
                <div>
                    <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-gray-900 dark:text-white">Wallet</h1>
                    <p className="text-gray-500 dark:text-slate-400 mt-1 font-medium text-sm md:text-base">Manage your account balance and payment methods</p>
                </div>
                <div className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-center">
                    {!isAdmin && (
                        <>
                            <button
                                onClick={() => navigate('/subscriptions')}
                                className="inline-flex items-center justify-center gap-2 rounded-xl bg-white dark:bg-slate-900 px-4 py-2.5 text-sm font-bold text-gray-700 dark:text-slate-200 shadow-sm ring-1 ring-inset ring-gray-300 dark:ring-slate-700 hover:bg-gray-50 dark:hover:bg-slate-800 transition-all focus:outline-none w-full sm:w-auto"
                            >
                                <CreditCard size={18} className="text-indigo-500" />
                                Subscriptions & Add-ons
                            </button>
                            <button
                                onClick={() => navigate('/wallet/cards')}
                                className="inline-flex items-center justify-center gap-2 rounded-xl bg-white dark:bg-slate-900 px-4 py-2.5 text-sm font-bold text-gray-700 dark:text-slate-200 shadow-sm ring-1 ring-inset ring-gray-300 dark:ring-slate-700 hover:bg-gray-50 dark:hover:bg-slate-800 transition-all focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed w-full sm:w-auto"
                                disabled={isReadOnly}
                                title={isReadOnly ? "Restricted for Support users" : ""}
                            >
                                <CreditCard size={18} className="text-gray-500 dark:text-slate-400" />
                                Manage Cards
                            </button>
                            <div className="flex items-center gap-2 w-full sm:w-auto">
                                <div className="relative flex-1 sm:flex-initial">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-slate-400 font-bold">$</span>
                                    <input
                                        type="number"
                                        value={rechargeAmount}
                                        onChange={(e) => setRechargeAmount(e.target.value)}
                                        min="1"
                                        step="1"
                                        className="w-full sm:w-24 pl-7 pr-3 py-2.5 rounded-xl border border-gray-200 dark:border-slate-700 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm font-bold text-gray-900 dark:text-white bg-white dark:bg-slate-900"
                                        placeholder="50.00"
                                    />
                                </div>
                                <button
                                    onClick={() => handleAddFunds(rechargeAmount)}
                                    disabled={addingFunds || isReadOnly || !rechargeAmount || rechargeAmount <= 0}
                                    title={isReadOnly ? "Restricted for Support users" : ""}
                                    className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 rounded-xl bg-primary-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-primary-700 transition-all focus:outline-none focus:ring-2 focus:ring-primary-600 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                                >
                                    {addingFunds ? <RotateCw size={18} className="animate-spin" /> : <RotateCw size={18} />}
                                    Add Funds
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
                            <div className="h-1 w-1 bg-purple-400 dark:bg-purple-500 rounded-full"></div>
                            <span>{intelligence.usage.usedMins} / {intelligence.usage.totalMins} Mins Used</span>
                        </div>
                        <div className="mt-2 w-full bg-purple-100/60 dark:bg-purple-900/50 rounded-full h-1 overflow-hidden">
                            <div
                                className="h-full bg-purple-600 dark:bg-purple-400 transition-all duration-1000"
                                style={{ width: `${intelligence.usage.usedPercent}%` }}
                            ></div>
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
                                <dt className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Current Balance</dt>
                            </div>
                            <button
                                onClick={() => { refreshWallet(); fetchPaymentDetails(); }}
                                disabled={walletRefreshing}
                                className={`p-1 rounded-md hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors text-gray-400 dark:text-slate-400 hover:text-primary-600 dark:hover:text-primary-400 ${walletRefreshing ? 'animate-spin' : ''}`}
                                title="Refresh balance"
                            >
                                <RefreshCw size={14} />
                            </button>
                        </div>
                        <div className="flex flex-col mt-2">
                            <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                                ${Number(wallet?.balance || 0).toFixed(2)}
                            </span>
                            {wallet?.creditLimit !== undefined && (
                                <span className="inline-flex items-center gap-1.5 text-xs font-bold text-gray-500 dark:text-slate-400 mt-1.5">
                                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-primary-500"></span>
                                    Credit Limit: ${Number(wallet.creditLimit).toFixed(2)}
                                </span>
                            )}
                        </div>
                    </div>
                    <div className={`px-6 py-3 border-t border-gray-100 dark:border-white/[0.08] relative z-10 ${wallet?.autoRecharge?.enabled ? 'bg-green-50/50 dark:bg-emerald-950/40' : 'bg-red-50/50 dark:bg-red-950/40'}`}>
                        <div className="flex items-center justify-between">
                            <span className={`text-[11px] font-bold uppercase tracking-wider ${wallet?.autoRecharge?.enabled ? 'text-green-700 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                                Auto-recharge: {wallet?.autoRecharge?.enabled ? 'ON' : 'OFF'}
                            </span>
                            {!wallet?.autoRecharge?.enabled ? (
                                <AlertTriangle className="h-4 w-4 text-red-500 dark:text-red-400" />
                            ) : (
                                <CheckCircle className="h-4 w-4 text-green-600 dark:text-emerald-400" />
                            )}
                        </div>
                    </div>
                </div>

                {/* Burn Rate Card */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden relative group hover:shadow-md transition-all duration-300">
                    <div className="p-5 relative z-10">
                        <div className="flex items-center gap-2.5 mb-2">
                            <div className="p-1.5 rounded-lg text-blue-500 bg-blue-50 dark:bg-blue-950/60 dark:text-blue-400 ring-1 ring-blue-500/10 dark:ring-blue-400/20 flex items-center justify-center">
                                <TrendingDown className="h-4 w-4 stroke-[2.2]" />
                            </div>
                            <dt className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Daily Burn Rate</dt>
                        </div>
                        <dd className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight mt-2 flex items-baseline">
                            ~${intelligence.financial.burnRate.toFixed(2)} <span className="text-sm font-sans font-medium text-gray-500 dark:text-slate-400 ml-1">/ day</span>
                        </dd>
                    </div>
                    <div className="bg-gray-50/50 dark:bg-slate-900/40 px-6 py-3 border-t border-gray-100 dark:border-white/[0.08] relative z-10">
                        <div className="text-[11px] font-bold uppercase text-gray-500 dark:text-slate-400 tracking-wider">
                            Based on last 7 days of activity
                        </div>
                    </div>
                </div>

                {/* Runway Card */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden relative group hover:shadow-md transition-all duration-300">
                    <div className="p-5 relative z-10">
                        <div className="flex items-center gap-2.5 mb-2">
                            <div className="p-1.5 rounded-lg text-blue-500 bg-blue-50 dark:bg-blue-950/60 dark:text-blue-400 ring-1 ring-blue-500/10 dark:ring-blue-400/20 flex items-center justify-center">
                                <Clock className="h-4 w-4 stroke-[2.2]" />
                            </div>
                            <dt className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Estimated Runway</dt>
                        </div>
                        <dd className={`text-2xl sm:text-3xl font-extrabold tracking-tight mt-2 ${intelligence.financial.runwayDays < 7 ? 'text-red-600 dark:text-red-400' : 'text-slate-900 dark:text-white'}`}>
                            {intelligence.financial.runwayDays > 365 ? '> 1 Year' : `~${intelligence.financial.runwayDays} Days`}
                        </dd>
                    </div>
                    <div className={`px-6 py-3 border-t border-gray-100 dark:border-white/[0.08] relative z-10 ${intelligence.financial.runwayDays < 7 ? 'bg-red-50/50 dark:bg-red-950/40' : 'bg-gray-50/50 dark:bg-slate-900/40'}`}>
                        <div className={`text-[11px] font-bold uppercase tracking-wider ${intelligence.financial.runwayDays < 7 ? 'text-red-600 dark:text-red-400' : 'text-gray-500 dark:text-slate-400'}`}>
                            {intelligence.financial.runwayDays < 7 ? 'Top-up required immediately' : 'Funds are sufficient'}
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Left Column: Cards & Stripe Payments */}
                <div className="space-y-6">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm ring-1 ring-gray-200 dark:ring-slate-800 overflow-hidden">
                        <div className="px-6 py-5 border-b border-gray-100 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-900/50 flex justify-between items-center">
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                <CreditCard className="text-gray-400 dark:text-slate-400" size={20} /> Saved Cards
                            </h3>
                            {subscription?.next_billing && (
                                <div className="text-[11px] font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider bg-white dark:bg-slate-800 px-2 py-1 rounded-lg ring-1 ring-gray-200 dark:ring-slate-700">
                                    Next Billing: {new Date(subscription.next_billing).toLocaleDateString()}
                                </div>
                            )}
                        </div>
                        <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {cards.length === 0 ? (
                                <div className="col-span-2 py-8 text-center bg-gray-50 dark:bg-slate-900/40 rounded-xl border border-dashed border-gray-200 dark:border-slate-800">
                                    <CreditCard className="mx-auto h-8 w-8 text-gray-300 dark:text-slate-600 mb-2" />
                                    <p className="text-sm font-medium text-gray-500 dark:text-slate-400">No saved payment methods</p>
                                </div>
                            ) : (
                                cards.map(card => (
                                    <div key={card.id} className="relative flex items-center gap-4 p-4 rounded-xl border border-gray-100 dark:border-slate-800 bg-white dark:bg-slate-900 ring-1 ring-gray-100 dark:ring-slate-800 hover:ring-primary-500 transition-all group">
                                        <div className="bg-gray-50 dark:bg-slate-800 p-2 rounded-lg">
                                            <CreditCard size={20} className="text-gray-600 dark:text-slate-300" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <p className="text-sm font-bold text-gray-900 dark:text-white capitalize">{card.brand}</p>
                                                {card.is_default && (
                                                    <span className="inline-flex items-center rounded-md bg-green-50 dark:bg-emerald-950/60 px-1.5 py-0.5 text-[10px] font-bold text-green-700 dark:text-emerald-400 ring-1 ring-inset ring-green-600/20 dark:ring-emerald-500/30">DEFAULT</span>
                                                )}
                                            </div>
                                            <p className="text-xs font-medium text-gray-500 dark:text-slate-400 mt-1">•••• {card.last4} • Exp {card.exp_month}/{card.exp_year}</p>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    {/* Stripe Payment History */}
                    <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm ring-1 ring-gray-200 dark:ring-slate-800 overflow-hidden">
                        <div className="px-6 py-5 border-b border-gray-100 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-900/50 flex justify-between items-center">
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                <DollarSign className="text-emerald-500 h-5 w-5" /> Stripe Payment History
                            </h3>
                            <button
                                onClick={fetchPaymentDetails}
                                disabled={paymentDetailsLoading}
                                className={`p-1 rounded-md hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors text-gray-400 dark:text-slate-400 hover:text-primary-600 dark:hover:text-primary-400 ${paymentDetailsLoading ? 'animate-spin' : ''}`}
                                title="Refresh payment history"
                            >
                                <RefreshCw size={14} />
                            </button>
                        </div>
                        <div className="p-0 max-h-[400px] overflow-y-auto">
                            <ul role="list" className="divide-y divide-gray-100 dark:divide-slate-800">
                                {paymentDetailsLoading ? (
                                    <li className="p-8 text-center text-gray-500 dark:text-slate-400 font-medium flex items-center justify-center gap-2">
                                        <RotateCw size={16} className="animate-spin text-primary-600" />
                                        Loading payments...
                                    </li>
                                ) : (!paymentDetails || paymentDetails.length === 0) ? (
                                    <li className="p-8 text-center text-gray-500 dark:text-slate-400 font-medium">No payment records found.</li>
                                ) : (
                                    paymentDetails.map((payment) => (
                                        <li key={payment.payment_id} className="p-4 sm:px-6 hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors">
                                            <div className="flex items-center space-x-4">
                                                <div className="flex-shrink-0">
                                                    <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-emerald-50 dark:bg-emerald-950/60 ring-1 ring-inset ring-emerald-600/20 dark:ring-emerald-500/30">
                                                        <DollarSign className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                                                    </span>
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <p className="truncate text-sm font-bold text-gray-900 dark:text-white">{payment.description || 'Wallet Top-up'}</p>
                                                    <p className="truncate text-xs font-mono text-gray-500 dark:text-slate-400 mt-0.5">
                                                        {payment.payment_id}
                                                    </p>
                                                </div>
                                                <div>
                                                    <span className="inline-flex items-center rounded-md px-2.5 py-1 text-sm font-mono font-bold uppercase tracking-wider ring-1 ring-inset bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 ring-emerald-600/20 dark:ring-emerald-500/30">
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
                    <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm ring-1 ring-gray-200 dark:ring-slate-800 overflow-hidden">
                        <div className="px-6 py-5 border-b border-gray-100 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-900/50">
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                <Clock className="text-gray-400 dark:text-slate-400" size={20} /> Transaction History
                            </h3>
                        </div>
                        <div className="p-0 max-h-[400px] overflow-y-auto">
                            <ul role="list" className="divide-y divide-gray-100 dark:divide-slate-800">
                                {(!wallet?.transactions || wallet.transactions.length === 0) && (
                                    <li className="p-8 text-center text-gray-500 dark:text-slate-400 font-medium">No transactions found.</li>
                                )}
                                {(wallet?.transactions || []).map((tx) => (
                                    <li key={tx.id} className="p-4 sm:px-6 hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors">
                                        <div className="flex items-center space-x-4">
                                            <div className="flex-shrink-0">
                                                {(tx.type === 'DEPOSIT' || tx.type === 'CREDIT') ? (
                                                    <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-green-50 dark:bg-emerald-950/60 ring-1 ring-inset ring-green-600/20 dark:ring-emerald-500/30">
                                                        <ArrowDown className="h-5 w-5 text-green-600 dark:text-emerald-400" />
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-gray-50 dark:bg-slate-800 ring-1 ring-inset ring-gray-500/10 dark:ring-slate-700">
                                                        <ArrowUp className="h-5 w-5 text-gray-500 dark:text-slate-400" />
                                                    </span>
                                                )}
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <p className="truncate text-sm font-bold text-gray-900 dark:text-white">{tx.description}</p>
                                                <p className="truncate text-xs font-medium text-gray-500 dark:text-slate-400 mt-0.5">
                                                    {new Date(tx.date || tx.createdAt).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}
                                                </p>
                                            </div>
                                            <div>
                                                <span className={`inline-flex items-center rounded-md px-2.5 py-1 text-sm font-mono font-bold uppercase tracking-wider ring-1 ring-inset ${(tx.type === 'DEPOSIT' || tx.type === 'CREDIT') ? 'bg-green-50 dark:bg-emerald-950/60 text-green-700 dark:text-emerald-400 ring-green-600/20 dark:ring-emerald-500/30' : 'bg-gray-50 dark:bg-slate-800 text-gray-700 dark:text-slate-300 ring-gray-500/10 dark:ring-slate-700'}`}>
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
