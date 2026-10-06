import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const api = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json',
    },
    timeout: 120000, // 120 second timeout for long provisioning
});

// Retry configuration
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second base delay

// Helper to check if error is retryable
const isRetryableError = (error) => {
    const method = error.config?.method?.toLowerCase();
    const isIdempotent = ['get', 'put', 'delete', 'head', 'options'].includes(method);

    if (!error.response) {
        // Network errors are retryable
        return true;
    }

    // Only retry 5xx server errors on idempotent methods
    if (error.response.status >= 500) {
        return isIdempotent;
    }

    // Always retry 429 rate limit with backoff
    return error.response.status === 429;
};

// Helper to normalize error messages
const normalizeError = (error) => {
    if (!error.response) {
        return {
            message: 'Network error. Please check your connection.',
            status: 0,
            isNetworkError: true
        };
    }

    const { status, data } = error.response;

    // Extract message from various backend response formats
    let message = 'An error occurred';
    if (typeof data === 'string') {
        message = data;
    } else if (data?.message) {
        message = data.message;
    } else if (data?.error) {
        message = data.error;
    }

    return {
        message,
        status,
        data,
        isNetworkError: false
    };
};

// Retry logic with exponential backoff
const retryRequest = async (config, retryCount = 0) => {
    try {
        return await api(config);
    } catch (error) {
        if (retryCount >= MAX_RETRIES || !isRetryableError(error)) {
            throw error;
        }

        // Exponential backoff: 1s, 2s, 4s
        const delay = RETRY_DELAY * Math.pow(2, retryCount);
        await new Promise(resolve => setTimeout(resolve, delay));

        console.log(`Retrying request (${retryCount + 1}/${MAX_RETRIES})...`);
        return retryRequest(config, retryCount + 1);
    }
};

api.interceptors.request.use(
    (config) => {
        // Check sessionStorage first for tab-specific session (impersonation)
        const token = sessionStorage.getItem('accessToken') || localStorage.getItem('accessToken');
        if (token && !config.headers.Authorization) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        // Add retry metadata
        config.metadata = { startTime: new Date() };
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

api.interceptors.response.use(
    (response) => {
        // Log successful requests in development
        if (import.meta.env.DEV && response.config.metadata) {
            const duration = new Date() - response.config.metadata.startTime;
            console.log(`✓ ${response.config.method.toUpperCase()} ${response.config.url} (${duration}ms)`);
        }
        return response;
    },
    async (error) => {
        const originalRequest = error.config;

        // Handle 401 Unauthorized - try to refresh token
        if (error.response?.status === 401 && !originalRequest._retry && !originalRequest.url.includes('/auth/refresh') && !originalRequest.url.includes('/auth/login')) {
            originalRequest._retry = true;

            try {

                // Check if we are using sessionStorage (Impersonation)
                const isSessionStorage = !!sessionStorage.getItem('accessToken');
                const refreshToken = isSessionStorage
                    ? sessionStorage.getItem('refreshToken')
                    : localStorage.getItem('refreshToken');

                if (!refreshToken) {
                    throw new Error('No refresh token');
                }

                const response = await axios.post(`${API_URL}/auth/refresh`, {}, {
                    headers: { Authorization: `Bearer ${refreshToken}` }
                });

                const { accessToken, refreshToken: newRefreshToken } = response.data;

                if (isSessionStorage) {
                    sessionStorage.setItem('accessToken', accessToken);
                    if (newRefreshToken) sessionStorage.setItem('refreshToken', newRefreshToken);
                } else {
                    localStorage.setItem('accessToken', accessToken);
                    if (newRefreshToken) localStorage.setItem('refreshToken', newRefreshToken);
                }

                originalRequest.headers.Authorization = `Bearer ${accessToken}`;
                return api(originalRequest);

            } catch (refreshError) {
                console.error("Session expired", refreshError);
                // Clear both to be safe or just the active one?
                // If in session storage, clear that.
                if (sessionStorage.getItem('accessToken')) {
                    sessionStorage.clear();
                } else {
                    localStorage.removeItem('accessToken');
                    localStorage.removeItem('refreshToken');
                    localStorage.removeItem('user');
                }
                window.location.href = '/login';
                return Promise.reject(refreshError);
            }
        }

        // Retry logic for retryable errors
        if (!originalRequest._retry && isRetryableError(error)) {
            originalRequest._retry = true;
            try {
                return await retryRequest(originalRequest);
            } catch (retryError) {
                // Normalize error before rejecting
                const normalizedError = normalizeError(retryError);
                retryError.normalized = normalizedError;
                return Promise.reject(retryError);
            }
        }

        // Normalize error for non-retryable errors
        const normalizedError = normalizeError(error);
        error.normalized = normalizedError;

        // Log errors in development
        if (import.meta.env.DEV) {
            console.error(`✗ ${error.config?.method?.toUpperCase()} ${error.config?.url}`, normalizedError);
        }

        return Promise.reject(error);
    }
);

export default api;
