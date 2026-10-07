import api from './api';

export const subscriptionService = {
    // ------------------------------------------------------------------------
    // 1. EXISTING BACKEND API: GET /api/plans (Status: 200 OK)
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

    // ------------------------------------------------------------------------
    // 2. EXISTING BACKEND API: GET /api/wallet/subscription (Status: 200 OK)
    // ------------------------------------------------------------------------
    getSubscription: async (tenantId) => {
        try {
            const res = await api.get('/wallet/subscription', {
                params: {
                    tenantId
                }
            });

            return res.data;
        } catch (e) {
            console.warn('GET /wallet/subscription endpoint error:', e);
            return null;
        }
    },

    // ------------------------------------------------------------------------
    // 3. ADD-ONS CATALOG (Connected to Backend API)
    // ------------------------------------------------------------------------
    getCatalog: async () => {
        const res = await api.get('/addons/catalog');
        return res.data;
    },

    // ------------------------------------------------------------------------
    // 4. ADD-ON QUOTE CALCULATION (Connected to Backend API)
    // ------------------------------------------------------------------------
    getQuote: async (tenantId, addonId, quantity = 1) => {
        const res = await api.post('/addons/quote', {
            tenantId,
            addonId,
            quantity
        });
        return res.data;
    },

    // ------------------------------------------------------------------------
    // 5. ADD-ON PURCHASE (Connected to Backend API)
    // ------------------------------------------------------------------------
    purchaseAddon: async (tenantId, addonId, quantity = 1) => {
        const res = await api.post('/addons/purchase', {
            tenantId,
            addonId,
            quantity
        });
        return res.data;
    },

    // ------------------------------------------------------------------------
    // 6. PLAN SWITCH (Real backend API: POST /api/wallet/subscription)
    // ------------------------------------------------------------------------
    switchPlan: async (customerId, newPlanId, immediate = true) => {
        const res = await api.post('/wallet/subscription', {
            targetTenantId: customerId,
            planId: newPlanId,
            immediate
        });
        return res.data;
    }
};
