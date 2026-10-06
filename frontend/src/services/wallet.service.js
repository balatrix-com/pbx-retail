import api from './api';

export const walletService = {
    getWallet: async () => {
        const [wallet, transactions] = await Promise.all([
            api.get('/wallet'),
            api.get('/wallet/transactions')
        ]);
        return { ...wallet.data, transactions: transactions.data };
    },

    getSubscription: async () => {
        const response = await api.get('/wallet/subscription');
        return response.data;
    },

    listCards: async () => {
        const response = await api.get('/wallet/cards');
        return response.data;
    },

    topup: async (amount) => {
        const response = await api.post('/wallet/topup', { amount: Number(amount) });
        return response.data;
    },

    setAutoRecharge: async (enabled, threshold, amount) => {
        const response = await api.post('/wallet/auto-recharge', { enabled, threshold, amount });
        return response.data;
    },

    getPaymentDetails: async () => {
        const response = await api.get('/wallet/payment-details');
        return response.data;
    }
};
