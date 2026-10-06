import api from './api';

export const subscriptionService = {
    // ------------------------------------------------------------------------
    // 1. EXISTING BACKEND API: GET /api/plans (Status: 200 OK)
    // ------------------------------------------------------------------------
    getPlans: async () => {
        try {
            const res = await api.get('/plans');
            if (Array.isArray(res.data) && res.data.length > 0) {
                return res.data;
            }
            if (res.data?.data && Array.isArray(res.data.data) && res.data.data.length > 0) {
                return res.data.data;
            }
        } catch (e) {
            console.warn('GET /plans endpoint fallback:', e);
        }
        return [
            {
                plan_id: 'tier_1_starter',
                name: 'Tier 1 Starter Plan',
                amount: 39.99,
                currency: 'usd',
                validity_months: 1,
                tfns: 1,
                dids: 0,
                free_mins: 500,
                extensions: 5
            },
            {
                plan_id: 'tier_2_pro',
                name: 'Tier 2 Pro Business Plan',
                amount: 79.99,
                currency: 'usd',
                validity_months: 1,
                tfns: 3,
                dids: 2,
                free_mins: 1500,
                extensions: 20
            },
            {
                plan_id: 'tier_3_enterprise',
                name: 'Tier 3 Enterprise Global Plan',
                amount: 149.99,
                currency: 'usd',
                validity_months: 1,
                tfns: 10,
                dids: 5,
                free_mins: 5000,
                extensions: 100
            }
        ];
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
