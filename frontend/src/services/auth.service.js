import api from './api';

const TOKEN_KEY = 'accessToken';
const REFRESH_KEY = 'refreshToken';
const USER_KEY = 'user';

export const authService = {
    login: async (email, password) => {
        const response = await api.post('/auth/login', { email, password });
        const { accessToken, refreshToken, user } = response.data;

        localStorage.setItem(TOKEN_KEY, accessToken);
        localStorage.setItem(REFRESH_KEY, refreshToken);
        localStorage.setItem(USER_KEY, JSON.stringify(user));

        return { user, accessToken };
    },

    signup: async (email, password, companyName) => {
        const response = await api.post('/auth/signup', {
            email,
            password,
            companyName,
            name: email.split('@')[0]
        });
        const { accessToken, refreshToken, user } = response.data;

        localStorage.setItem(TOKEN_KEY, accessToken);
        localStorage.setItem(REFRESH_KEY, refreshToken);
        localStorage.setItem(USER_KEY, JSON.stringify(user));

        return { user, accessToken };
    },

    logout: async () => {
        try {
            await api.post('/auth/logout');
        } catch (e) {
            console.error(e);
        } finally {
            // If in session storage mode (impersonation), only clear that
            if (sessionStorage.getItem(TOKEN_KEY)) {
                sessionStorage.clear();
            } else {
                localStorage.removeItem(TOKEN_KEY);
                localStorage.removeItem(REFRESH_KEY);
                localStorage.removeItem(USER_KEY);
            }
            window.location.href = '/login';
        }
    },

    getCurrentUser: () => {
        const userStr = sessionStorage.getItem(USER_KEY) || localStorage.getItem(USER_KEY);
        return userStr ? JSON.parse(userStr) : null;
    },

    isAuthenticated: () => {
        return !!(sessionStorage.getItem(TOKEN_KEY) || localStorage.getItem(TOKEN_KEY));
    },

    // Verify session with backend
    me: async () => {
        const response = await api.get('/auth/me');
        return response.data;
    },

    updateProfile: async (data) => {
        const response = await api.patch('/auth/me', data);
        const { user } = response.data; // Assuming backend returns user object directly or nested?
        // Backend returns user object directly (minus password)
        const updatedUser = response.data;

        // Update local storage if current user
        const currentUser = JSON.parse(localStorage.getItem(USER_KEY) || '{}');
        if (currentUser && currentUser.id === updatedUser.id) {
            localStorage.setItem(USER_KEY, JSON.stringify(updatedUser));
        }

        return updatedUser;
    },

    impersonate: async (userId) => {
        const response = await api.post(`/users/impersonate/${userId}`);
        return response.data;
    },

    endImpersonation: async () => {
        const response = await api.post('/auth/end-impersonation');
        return response.data;
    }
};
