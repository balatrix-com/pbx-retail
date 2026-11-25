import api from './api';

export const walletService = {
    getBalance: async () => {
        const response = await api.get('/wallet');
        return response.data;
    },

    getTransactions: async () => {
        const response = await api.get('/wallet/transactions');
        return response.data;
    },

    getWallet: async () => {
        const [wallet, transactions] = await Promise.all([
            api.get('/wallet'),
            api.get('/wallet/transactions')
        ]);
        return { ...wallet.data, transactions: transactions.data };
    },

    getSubscription: async (tenantId, params = {}) => {
        const response = await api.get('/wallet/subscription', {
            params: {
                ...(tenantId ? { tenantId } : {}),
                ...params
            }
        });
        return response.data;
    },

    getAllSubscriptions: async (params = {}) => {
        const response = await api.get('/wallet/subscription', {
            params: {
                tenantId: 'all',
                ...params
            }
        });
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
