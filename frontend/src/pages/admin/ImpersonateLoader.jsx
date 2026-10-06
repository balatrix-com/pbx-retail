import React, { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const ImpersonateLoader = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const { refreshUser } = useAuth(); // We might need to refresh context user from storage

    useEffect(() => {
        const accessToken = searchParams.get('token');
        const refreshToken = searchParams.get('refresh');

        if (accessToken) {
            // Set session storage for tab isolation
            sessionStorage.setItem('accessToken', accessToken);
            if (refreshToken) {
                sessionStorage.setItem('refreshToken', refreshToken);
            }
            // Clear local storage in this tab context to ensure session storage takes precedence? 
            // No, local storage is shared. We kept it. API interceptor prioritizes session storage.

            // However, we need to ensure AuthContext picks up the new user.
            // AuthContext reads from storage on init. 
            // Since this is a fresh tab load (implied by window.open), AuthProvider will mount.
            // But AuthProvider uses authService.me() which uses api.js.
            // api.js uses interceptor.

            // We just need to ensure the token is in sessionStorage BEFORE AuthProvider tries to use it?
            // Actually, AuthProvider is already mounted if this is a route in App.jsx.
            // So we need to trigger a refresh.

            // Wait a tick to ensure storage is set
            setTimeout(async () => {
                await refreshUser();
                navigate('/dashboard', { replace: true });
            }, 100);
        } else {
            navigate('/login');
        }
    }, [searchParams, navigate, refreshUser]);

    return (
        <div className="flex items-center justify-center min-h-screen bg-gray-50">
            <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
                <h2 className="text-xl font-semibold text-gray-900">Initializing Session...</h2>
                <p className="text-gray-500">Please wait while we log you in.</p>
            </div>
        </div>
    );
};

export default ImpersonateLoader;
