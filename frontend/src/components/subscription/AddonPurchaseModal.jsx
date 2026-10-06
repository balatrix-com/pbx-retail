import React, { useState } from 'react';
import { Dialog } from '@headlessui/react';
import { X, CheckCircle2, AlertTriangle, Loader2, Wallet, Calendar, DollarSign, Package, ShieldAlert } from 'lucide-react';
import { subscriptionService } from '../../services/subscription.service';
import { useToast } from '../../context/ToastContext';

const AddonPurchaseModal = ({ isOpen, onClose, quote, customerId, onSuccess }) => {
    const { addToast } = useToast();
    const [purchasing, setPurchasing] = useState(false);
    const [purchaseError, setPurchaseError] = useState(null);

    if (!quote) return null;

    const handleConfirm = async () => {
        setPurchasing(true);
        setPurchaseError(null);
        try {
            const res = await subscriptionService.purchaseAddon(
                customerId || quote.customer_id || 'U1001',
                quote.addon_id,
                quote.quantity
            );
            addToast('success', res?.message || 'Add-on purchased successfully!');
            if (onSuccess) {
                onSuccess();
            }
            onClose();
        } catch (err) {
            console.error('Purchase error:', err);
            const msg = err.response?.data?.message || err.normalized?.message || 'Failed to purchase add-on';
            setPurchaseError(msg);
            addToast('error', msg);
        } finally {
            setPurchasing(false);
        }
    };

    const purchasingPower = quote.available_purchasing_power !== undefined 
        ? quote.available_purchasing_power 
        : (quote.current_balance || 0);

    return (
        <Dialog open={isOpen} onClose={onClose} className="relative z-50">
            {/* Backdrop */}
            <div className="fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity" aria-hidden="true" />

            <div className="fixed inset-0 flex items-center justify-center p-4">
                <Dialog.Panel className="mx-auto max-w-lg w-full rounded-2xl bg-white dark:bg-slate-900 p-6 shadow-2xl ring-1 ring-gray-900/10 dark:ring-slate-800 transition-all">
                    
                    {/* Header */}
                    <div className="flex justify-between items-center pb-4 border-b border-gray-100 dark:border-slate-800">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
                                <Package className="h-5 w-5 stroke-[2.2]" />
                            </div>
                            <div>
                                <Dialog.Title className="text-lg font-extrabold text-gray-900 dark:text-white tracking-tight">
                                    Confirm Add-on Purchase
                                </Dialog.Title>
                                <p className="text-xs font-medium text-gray-500 dark:text-slate-400">
                                    Review proration charges before adding to subscription
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="text-gray-400 hover:text-gray-600 dark:hover:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800 p-1.5 rounded-lg transition-colors focus:outline-none"
                        >
                            <X className="h-5 w-5" />
                        </button>
                    </div>

                    {/* Content Details */}
                    <div className="py-5 space-y-4">
                        
                        {/* Selected Addon Info Box */}
                        <div className="p-4 rounded-xl bg-gray-50 dark:bg-slate-800/60 border border-gray-100 dark:border-slate-800 flex justify-between items-center">
                            <div>
                                <div className="flex items-center gap-2 flex-wrap">
                                    <h4 className="text-sm font-bold text-gray-900 dark:text-white">
                                        {quote.name || quote.addon_name}
                                    </h4>
                                    {quote.units_count > 1 && (
                                        <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800">
                                            {quote.units_count} Units / Pack
                                        </span>
                                    )}
                                </div>
                                <p className="text-xs font-medium text-gray-500 dark:text-slate-400 mt-0.5">
                                    Quantity: <span className="font-bold text-gray-700 dark:text-slate-300">{quote.quantity}</span>
                                    {quote.units_count > 1 && (
                                        <span className="text-gray-400 dark:text-slate-500 ml-1.5 font-normal">
                                            ({quote.quantity * quote.units_count} total units provisioned)
                                        </span>
                                    )}
                                </p>
                            </div>
                            <div className="text-right">
                                <span className="text-xs text-gray-400 dark:text-slate-500 block">Unit Price</span>
                                <span className="text-sm font-bold font-mono text-gray-900 dark:text-white">
                                    ${Number(quote.unit_price).toFixed(2)}/mo
                                </span>
                            </div>
                        </div>

                        {/* Financial Metrics Grid */}
                        <div className="grid grid-cols-2 gap-3">
                            {/* Remaining Cycle Days */}
                            <div className="p-3.5 rounded-xl border border-gray-100 dark:border-slate-800 bg-white dark:bg-slate-800/40">
                                <div className="flex items-center gap-1.5 text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                                    <Calendar className="h-3.5 w-3.5 text-indigo-500" />
                                    Remaining Cycle Days
                                </div>
                                <div className="text-xl font-extrabold text-gray-900 dark:text-white font-mono">
                                    {quote.remaining_days} <span className="text-xs font-sans text-gray-500 dark:text-slate-400 font-normal">/ {quote.total_cycle_days || 30} days</span>
                                </div>
                            </div>

                            {/* Prorated Charge Due */}
                            <div className="p-3.5 rounded-xl border border-indigo-100 dark:border-indigo-900/40 bg-indigo-50/40 dark:bg-indigo-950/30">
                                <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider mb-1">
                                    <DollarSign className="h-3.5 w-3.5 text-indigo-500" />
                                    Prorated Charge Due
                                </div>
                                <div className="text-xl font-extrabold text-indigo-700 dark:text-indigo-300 font-mono">
                                    ${Number(quote.prorated_charge_due).toFixed(2)}
                                </div>
                            </div>
                        </div>

                        {/* Available Purchasing Power */}
                        <div className="flex justify-between items-center p-3.5 rounded-xl border border-gray-100 dark:border-slate-800 bg-white dark:bg-slate-900">
                            <div className="flex items-center gap-2">
                                <Wallet className="h-4 w-4 text-emerald-500" />
                                <span className="text-xs font-bold text-gray-700 dark:text-slate-300">Available Purchasing Power:</span>
                            </div>
                            <span className="text-sm font-bold font-mono text-emerald-600 dark:text-emerald-400">
                                ${Number(purchasingPower).toFixed(2)}
                            </span>
                        </div>

                        {/* Step D: Insufficient Funds Alert */}
                        {!quote.sufficient_funds && (
                            <div className="p-3.5 rounded-xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900/50 flex items-start gap-2.5">
                                <ShieldAlert className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                                <div className="text-xs text-red-700 dark:text-red-300 font-bold leading-relaxed">
                                    Insufficient wallet balance. Please add funds.
                                </div>
                            </div>
                        )}

                        {purchaseError && (
                            <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/50 text-xs font-bold text-red-600 dark:text-red-400">
                                {purchaseError}
                            </div>
                        )}

                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100 dark:border-slate-800">
                        <button
                            type="button"
                            onClick={onClose}
                            className="rounded-xl bg-white dark:bg-slate-800 px-4 py-2.5 text-sm font-bold text-gray-700 dark:text-slate-300 shadow-sm ring-1 ring-inset ring-gray-300 dark:ring-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700 transition-all focus:outline-none"
                        >
                            Cancel
                        </button>

                        {/* Step D & E: Confirm Purchase Button */}
                        <button
                            type="button"
                            onClick={handleConfirm}
                            disabled={!quote.sufficient_funds || purchasing}
                            className="inline-flex justify-center items-center gap-2 rounded-xl bg-primary-600 px-5 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-primary-700 transition-all focus:outline-none focus:ring-2 focus:ring-primary-500 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100"
                        >
                            {purchasing ? (
                                <>
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    Purchasing...
                                </>
                            ) : (
                                <>
                                    <CheckCircle2 className="h-4 w-4" />
                                    Confirm Purchase
                                </>
                            )}
                        </button>
                    </div>

                </Dialog.Panel>
            </div>
        </Dialog>
    );
};

export default AddonPurchaseModal;
