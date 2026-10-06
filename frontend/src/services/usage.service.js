import api from './api';

export const usageService = {
    getUsageSummary: async () => {
        const response = await api.get('/usage/summary');
        return response.data;
    },

    getServiceState: async () => {
        const response = await api.get('/service-state');
        return response.data;
    },

    reportUsage: async (minutes) => {
        const response = await api.post('/usage/report', { minutes });
        return response.data;
    }
};
