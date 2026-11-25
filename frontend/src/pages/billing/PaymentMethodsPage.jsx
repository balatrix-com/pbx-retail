import React, { useEffect, useState } from 'react';
import { billingService } from '../../services/billing.service';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { CreditCard, Trash2, Plus, Star, Loader2, ShieldCheck, CheckCircle2 } from 'lucide-react';

const PaymentMethodsPage = () => {
    const { user } = useAuth();
    const { addToast } = useToast();
    const [paymentMethods, setPaymentMethods] = useState([]);
    const [loading, setLoading] = useState(true);
    const [processingCardId, setProcessingCardId] = useState(null);

    useEffect(() => {
        loadCards();
    }, []);

    const loadCards = async () => {
        try {
            const data = await billingService.listPaymentMethods();
            setPaymentMethods(data || []);
        } catch (e) {
            console.error(e);
            addToast('error', 'Failed to load payment methods');
        } finally {
            setLoading(false);
        }
    };

    const handleAddCard = async () => {
        try {
            const { url } = await billingService.createCheckoutSession();
            // Redirect to Stripe Checkout
            window.location.href = url;
        } catch (e) {
            console.error(e);
            addToast('error', 'Failed to initiate checkout');
        }
    };

    const handleSetDefault = async (cardId) => {
        setProcessingCardId(cardId);
        try {
            await billingService.setDefaultCard(cardId);
            await loadCards();
            addToast('success', 'Default card updated');
        } catch (e) {
            console.error(e);
            addToast('error', 'Failed to set default card');
        } finally {
            setProcessingCardId(null);
        }
    };

    const defaultCard = paymentMethods.find(c => c.isDefault);

    return (
        <div className="w-full pb-12 space-y-6">
            {/* Header Section */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-800/40 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0 shadow-xs">
                        <CreditCard className="h-6 w-6" />
                    </div>
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-gray-900 dark:text-white">
                            Payment Methods
                        </h1>
                        <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">
                            Manage your saved credit and debit cards for auto-recharge and recurring subscriptions.
                        </p>
                    </div>
                </div>
                <button
                    onClick={handleAddCard}
                    disabled={user?.role === 'SUPPORT'}
                    title={user?.role === 'SUPPORT' ? "Restricted for Support users" : ""}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary-600 hover:bg-primary-700 px-4 py-2.5 text-xs font-bold text-white shadow-xs transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed w-full sm:w-auto cursor-pointer"
                >
                    <Plus className="h-4 w-4" />
                    Add New Card
                </button>
            </div>

            {/* Quick KPI Stat Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="platform-panel-dark rounded-2xl p-4 sm:p-5 flex flex-col justify-between shadow-xs">
                    <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-xs sm:text-sm font-medium">
                        <CreditCard className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
                        <span>Saved Cards</span>
                    </div>
                    <div className="mt-3 text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                        {loading ? '—' : paymentMethods.length}
                    </div>
                    <p className="mt-2 text-xs text-slate-500 dark:text-slate-400 font-medium">
                        Stored payment tokens on Stripe
                    </p>
                </div>

                <div className="platform-panel-dark rounded-2xl p-4 sm:p-5 flex flex-col justify-between shadow-xs">
                    <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-xs sm:text-sm font-medium">
                        <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                        <span>Default Method</span>
                    </div>
                    <div className="mt-3 text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white tracking-tight truncate">
                        {loading ? '—' : defaultCard ? `${defaultCard.brand?.toUpperCase()} •••• ${defaultCard.last4}` : 'None Set'}
                    </div>
                    <p className="mt-2 text-xs text-slate-500 dark:text-slate-400 font-medium">
                        Primary card used for recurring charges
                    </p>
                </div>

                <div className="platform-panel-dark rounded-2xl p-4 sm:p-5 flex flex-col justify-between shadow-xs">
                    <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-xs sm:text-sm font-medium">
                        <ShieldCheck className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                        <span>Security</span>
                    </div>
                    <div className="mt-3 text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                        PCI-DSS Compliant
                    </div>
                    <p className="mt-2 text-xs text-slate-500 dark:text-slate-400 font-medium">
                        End-to-end encrypted via Stripe vault
                    </p>
                </div>
            </div>

            {loading ? (
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                    {[1, 2].map((i) => (
                        <div key={i} className="platform-panel-dark rounded-2xl p-6 border border-gray-200/80 dark:border-white/10 animate-pulse space-y-4">
                            <div className="h-8 w-12 bg-gray-200 dark:bg-white/10 rounded-lg"></div>
                            <div className="h-4 bg-gray-200 dark:bg-white/10 rounded w-2/3"></div>
                            <div className="h-4 bg-gray-200 dark:bg-white/10 rounded w-1/3"></div>
                        </div>
                    ))}
                </div>
            ) : paymentMethods.length === 0 ? (
                <div className="platform-panel-dark rounded-2xl p-12 text-center border border-gray-200/80 dark:border-white/10 flex flex-col items-center justify-center">
                    <div className="h-16 w-16 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-4">
                        <CreditCard className="h-8 w-8 stroke-[1.5]" />
                    </div>
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">No payment methods found</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 max-w-sm mt-1 mb-6">
                        You haven't attached any credit or debit cards yet. Add a card to enable automatic subscription renewals.
                    </p>
                    <button
                        onClick={handleAddCard}
                        disabled={user?.role === 'SUPPORT'}
                        className="inline-flex items-center gap-2 rounded-xl bg-primary-600 hover:bg-primary-700 px-4 py-2.5 text-xs font-bold text-white shadow-xs transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
                    >
                        <Plus className="h-4 w-4" />
                        Add First Card
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                    {paymentMethods.map((card) => (
                        <div
                            key={card.id}
                            className="platform-panel-dark relative flex flex-col justify-between rounded-2xl border border-gray-200/80 dark:border-white/10 p-6 shadow-xs hover:border-gray-300 dark:hover:border-white/20 transition-all group"
                        >
                            <div>
                                <div className="flex items-center justify-between">
                                    <div className="h-10 w-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                                        <CreditCard className="h-5 w-5" />
                                    </div>
                                    {card.isDefault ? (
                                        <span className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 px-2.5 py-1 text-[11px] font-bold text-emerald-700 dark:text-emerald-400 ring-1 ring-inset ring-emerald-600/20">
                                            <CheckCircle2 className="h-3 w-3" /> Default Card
                                        </span>
                                    ) : null}
                                </div>
                                <div className="mt-5">
                                    <p className="text-lg font-mono font-bold text-gray-900 dark:text-white tracking-wider">
                                        •••• •••• •••• {card.last4}
                                    </p>
                                    {card.expMonth && card.expYear && (
                                        <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mt-1">
                                            Expires {card.expMonth.toString().padStart(2, '0')}/{card.expYear}
                                        </p>
                                    )}
                                </div>
                                <div className="mt-3">
                                    <span className="inline-block px-2 py-0.5 rounded-md bg-gray-100 dark:bg-white/5 text-[11px] font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300">
                                        {card.brand}
                                    </span>
                                </div>
                            </div>

                            <div className="mt-6 flex items-center justify-end pt-4 border-t border-gray-100 dark:border-white/10">
                                {!card.isDefault && user?.role !== 'SUPPORT' ? (
                                    <button
                                        onClick={() => handleSetDefault(card.id)}
                                        disabled={processingCardId === card.id}
                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#12131a] text-xs font-bold text-primary-600 dark:text-primary-400 hover:bg-gray-50 dark:hover:bg-white/5 shadow-2xs transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
                                    >
                                        {processingCardId === card.id ? (
                                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                        ) : (
                                            <Star className="h-3.5 w-3.5" />
                                        )}
                                        Set as Default
                                    </button>
                                ) : (
                                    <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                                        <CheckCircle2 className="h-3.5 w-3.5" /> Active Billing Method
                                    </span>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default PaymentMethodsPage;
