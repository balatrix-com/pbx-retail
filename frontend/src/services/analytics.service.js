import api from './api';

export const analyticsService = {
    getDashboard: async (range = 'today') => {
        // We now call our own backend which proxies the request to the analytics service.
        // This avoids Mixed Content (HTTP vs HTTPS) and CORS issues by keeping all 
        // frontend requests on the same origin and protocol.
        const response = await api.get('/telecom/analytics/dashboard', {
            params: {
                range: range
            }
        });
        return response.data;
    },
    getGlobalDashboard: async (range = 'today', customerId = 'all') => {
        const params = { range };
        if (customerId && customerId !== 'all') {
            params.customer_id = customerId;
        }
        const response = await api.get('/telecom/analytics/global/dashboard', {
            params
        });
        return response.data;
    }
};

export default analyticsService;
