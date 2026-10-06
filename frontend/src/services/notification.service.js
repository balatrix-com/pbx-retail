import api from './api';

export const notificationService = {
    getNotifications: async (limit = 50) => {
        const response = await api.get('/notifications', { params: { limit } });
        return response.data;
    },

    markAsRead: async (id) => {
        const response = await api.patch(`/notifications/${id}/read`);
        return response.data;
    },

    markAllAsRead: async () => {
        const response = await api.patch('/notifications/read-all');
        return response.data;
    }
};
