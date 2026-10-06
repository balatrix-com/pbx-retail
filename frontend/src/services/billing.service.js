import api from './api';

export const billingService = {
    createCheckoutSession: async () => {
        const response = await api.post('/billing/create-checkout');
        return response.data;
    },

    listPaymentMethods: async () => {
        const response = await api.get('/billing/payment-methods');
        return response.data;
    },

    setDefaultCard: async (paymentMethodId) => {
        const response = await api.post('/billing/set-default-card', { paymentMethodId });
        return response.data;
    },

    getInvoices: async () => {
        const response = await api.get('/billing/invoices');
        return response.data;
    }
};
