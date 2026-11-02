import api from './api';

export const telecomService = {
    // Unified Phone Numbers
    getPhoneNumbers: async (params) => {
        const response = await api.get('/telecom/phone-numbers', { params });
        return response.data;
    },
    getNumberQuota: async () => (await api.get('/telecom/phone-numbers/quota')).data,
    addNumber: async (type, number, subscriptionId) => (await api.post(type === 'DID' ? '/telecom/dids' : '/telecom/tfns',
        type === 'DID' ? { didNumber: number, subscriptionId } : { tfnNumber: number, subscriptionId })).data,
    removeNumber: async (type, id) => (await api.delete(`/telecom/${type === 'DID' ? 'dids' : 'tfns'}/${id}`)).data,
    getPhoneNumber: async (id) => {
        const response = await api.get(`/telecom/phone-numbers/${id}`);
        return response.data;
    },
    updatePhoneNumber: async (id, data) => {
        const response = await api.put(`/telecom/phone-numbers/${id}`, data);
        return response.data;
    },

    // TFNs
    searchTfns: async (query) => {
        const response = await api.get('/telecom/tfns/search', { params: { prefix: query } });
        return response.data;
    },

    getMyTfns: async () => {
        const response = await api.get('/telecom/tfns/mine');
        return response.data;
    },

    // DIDs
    getDIDs: async () => {
        const response = await api.get('/telecom/dids');
        return response.data;
    },
    // Extensions
    listExtensions: async () => {
        const response = await api.get('/telecom/extensions');
        return response.data;
    },

    createExtension: async () => {
        const response = await api.post('/telecom/extensions', {});
        return response.data;
    },

    getExtensionStatus: async (tenantId) => {
        const response = await api.get('/telecom/extensions/status', { params: { tenantId } });
        return response.data;
    },

    // Usage/CDRs (Using UsageService endpoints)
    getUsageSummary: async () => {
        const response = await api.get('/usage/summary');
        return response.data;
    },

    reportUsage: async (minutes) => {
        const response = await api.post('/usage/report', { minutes });
        return response.data;
    },

    getCDRs: async (params = {}) => {
        const response = await api.get('/usage/cdrs', { params });
        return response.data;
    },

    // Call Recording
    getRecordingStatus: async () => {
        const response = await api.get('/telecom/recording/status');
        return response.data;
    },

    toggleRecording: async (enabled) => {
        const response = await api.post('/telecom/recording/toggle', { enabled });
        return response.data;
    },

    playRecording: async (callUuid) => {
        const response = await api.get(`/telecom/recordings/${callUuid}/play`, { responseType: 'blob' });
        return response.data;
    },

    // Routing
    getRoutingOptions: async () => {
        const response = await api.get('/telecom/routing-options');
        return response.data;
    },

    updateTFNRouting: async (id, data) => {
        const response = await api.post(`/telecom/tfns/${id}/routing`, data);
        return response.data;
    },

    // Audio
    uploadAudio: async (file) => {
        const formData = new FormData();
        formData.append('file', file);
        const response = await api.post('/telecom/audio/upload', formData, {
            headers: {
                'Content-Type': 'multipart/form-data'
            }
        });
        return response.data;
    },

    listAudioFiles: async () => {
        const response = await api.get('/telecom/audio/list');
        return response.data.files;
    },

    deleteAudio: async (id) => {
        const response = await api.delete(`/telecom/audio/${id}`);
        return response.data;
    },

    // DID Forwards
    getDIDForwards: async () => {
        const response = await api.get('/telecom/did-forwards');
        return response.data;
    },

    createDIDForward: async (data) => {
        const response = await api.post('/telecom/did-forwards', data);
        return response.data;
    },

    updateDIDForward: async (id, data) => {
        const response = await api.patch(`/telecom/did-forwards/${id}`, data);
        return response.data;
    },

    deleteDIDForward: async (id) => {
        const response = await api.delete(`/telecom/did-forwards/${id}`);
        return response.data;
    },

    // Monitor
    getActiveCalls: async (tenantId) => {
        const response = await api.get(`/monitor/active-calls?tenantId=${tenantId}`);
        return response;
    },
    bargeCall: async (data) => {
        const response = await api.post('/monitor/barge', data);
        return response.data;
    },

    // Analytics (real-time)
    getLiveAnalytics: async () => {
        const response = await api.get('/telecom/analytics/live');
        return response.data;
    },

};

export default telecomService;
