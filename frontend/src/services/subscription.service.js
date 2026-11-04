import api from './api';

export const subscriptionService = {
    // ------------------------------------------------------------------------
    // Plans Catalog
    // ------------------------------------------------------------------------
    getPlans: async () => {
        try {
            const res = await api.get('/plans');
            if (Array.isArray(res.data)) {
                return res.data;
            }
            if (res.data?.data && Array.isArray(res.data.data)) {
                return res.data.data;
            }
            return [];
        } catch (e) {
            console.error('GET /plans endpoint failed:', e);
            throw e;
        }
    },

    createPlan: async (payload) => {
        const res = await api.post('/plans', payload);
        return res.data;
    },

    deletePlan: async (planId) => {
        const res = await api.delete(`/plans/${planId}`);
        return res.data;
    },

    getRateCards: async () => {
        try {
            const res = await api.get('/admin/rec-rate-cards');
            const list = res.data?.data || (Array.isArray(res.data) ? res.data : []);
            return list;
        } catch (err) {
            console.error('Failed to fetch rate cards:', err);
            return [];
        }
    },

    // ------------------------------------------------------------------------
    // Authoritative PBX Subscriptions API (/api/subscriptions)
    // ------------------------------------------------------------------------
    getSubscriptions: async (tenantId) => {
        const res = await api.get('/subscriptions', {
            params: tenantId ? { tenantId } : {}
        });
        return res.data;
    },

    getAllSubscriptions: async () => {
        const res = await api.get('/subscriptions', {
            params: { tenantId: 'all' }
        });
        return res.data;
    },

    // Backward compatibility alias for useSubscriptionQuery
    getSubscription: async (tenantId) => {
        if (tenantId === 'all') {
            return subscriptionService.getAllSubscriptions();
        }
        return subscriptionService.getSubscriptions(tenantId);
    },

    getQuote: async (payload) => {
        const res = await api.post('/subscriptions/quote', payload);
        return res.data;
    },

    activateSubscription: async (payload) => {
        const res = await api.post('/subscriptions/activate', payload);
        return res.data;
    },

    renewSubscription: async (id, payload) => {
        const res = await api.post(`/subscriptions/${id}/renew`, payload);
        return res.data;
    },

    toggleAutoRenew: async (id, auto_renew, tenantId) => {
        const res = await api.patch(`/subscriptions/${id}/auto-renew`, {
            auto_renew,
            ...(tenantId ? { tenantId } : {})
        });
        return res.data;
    },

    reassignAsset: async (payload) => {
        const res = await api.post('/subscriptions/assets/reassign', payload);
        return res.data;
    },

    transitionSubscription: async (id, transition, tenantId) => {
        const res = await api.post(`/subscriptions/${id}/${transition}`, {
            ...(tenantId ? { tenantId } : {})
        });
        return res.data;
    },

    getSubscriptionHistory: async (id, tenantId) => {
        const res = await api.get(`/subscriptions/${id}/history`, {
            params: tenantId ? { tenantId } : {}
        });
        return res.data;
    },

    // ------------------------------------------------------------------------
    // Add-ons Catalog & Operations
    // ------------------------------------------------------------------------
    getCatalog: async () => {
        const res = await api.get('/addons/catalog');
        return res.data;
    },

    getAddonQuote: async (tenantId, addonId, quantity = 1) => {
        const res = await api.post('/addons/quote', {
            tenantId,
            addonId,
            quantity
        });
        return res.data;
    },

    purchaseAddon: async (tenantId, addonId, quantity = 1) => {
        const res = await api.post('/addons/purchase', {
            tenantId,
            addonId,
            quantity
        });
        return res.data;
    },

    // Compatibility plan switch
    switchPlan: async (customerId, newPlanId) => {
        const res = await api.post('/subscriptions/activate', {
            tenantId: customerId,
            plan_id: newPlanId,
            payment_mode: 'wallet'
        });
        return res.data;
    }
};
