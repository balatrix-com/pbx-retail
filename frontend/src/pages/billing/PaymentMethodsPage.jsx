import React, { useEffect, useState } from 'react';
import { billingService } from '../../services/billing.service';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { CreditCard, Trash2, Plus, Star, Loader2 } from 'lucide-react';

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
            setPaymentMethods(data);
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

    return (
        <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-8">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-gray-900">Payment Methods</h1>
                    <p className="text-gray-500 mt-1 font-medium text-sm md:text-base">Manage your saved credit and debit cards</p>
                </div>
                <button
                    onClick={handleAddCard}
                    disabled={user.role === 'SUPPORT'}
                    title={user.role === 'SUPPORT' ? "Restricted for Support users" : ""}
                    className="inline-flex items-center justify-center rounded-xl bg-primary-600 px-5 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed w-full sm:w-auto transition-all">
                    <Plus className="mr-2 h-4 w-4" />
                    Add New Card
                </button>
            </div>

            {loading ? <div>Loading...</div> : (
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                    {paymentMethods.length === 0 && <p className="text-gray-500">No cards attached.</p>}
                    {paymentMethods.map((card) => (
                        <div key={card.id} className="relative flex flex-col justify-between rounded-xl border border-gray-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md">
                            <div>
                                <div className="flex items-center justify-between">
                                    <CreditCard className="h-8 w-8 text-gray-400" />
                                    {card.isDefault && (
                                        <span className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800">
                                            Default
                                        </span>
                                    )}
                                </div>
                                <div className="mt-4">
                                    <p className="text-sm font-medium text-gray-900">**** **** **** {card.last4}</p>
                                    {card.expMonth && card.expYear && (
                                        <p className="text-sm text-gray-500">Expires {card.expMonth}/{card.expYear}</p>
                                    )}
                                </div>
                                <div className="mt-2">
                                    <p className="text-sm font-semibold text-gray-900 capitalize">{card.brand}</p>
                                </div>
                            </div>
                            <div className="mt-6 flex items-center justify-end space-x-3 border-t border-gray-100 pt-4">
                                {!card.isDefault && user.role !== 'SUPPORT' && (
                                    <button
                                        onClick={() => handleSetDefault(card.id)}
                                        disabled={processingCardId === card.id}
                                        className="text-xs font-medium text-primary-600 hover:text-primary-500 disabled:opacity-50 flex items-center gap-1">
                                        {processingCardId === card.id ? (
                                            <Loader2 className="h-3 w-3 animate-spin" />
                                        ) : null}
                                        Set Default
                                    </button>
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
