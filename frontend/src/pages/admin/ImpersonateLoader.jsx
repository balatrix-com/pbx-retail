import React, { useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';

const ImpersonateLoader = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const { refreshUser, setUser } = useAuth();
    const exchangeRef = useRef(null);

    useEffect(() => {
        const ticket = searchParams.get('ticket');
        window.history.replaceState({}, '', '/impersonate');
        if (!ticket) {
            navigate('/login', { replace: true });
            return;
        }
        let active = true;
        if (!exchangeRef.current) {
            exchangeRef.current = api.post('/auth/exchange-impersonate-ticket', { ticket });
        }

        exchangeRef.current.then(async ({ data }) => {
            if (!active) return;
            sessionStorage.setItem('accessToken', data.accessToken);
            sessionStorage.setItem('refreshToken', data.refreshToken);

            let fallbackUser = null;
            // Pre-decode JWT so role and tenantId are immediately available
            try {
                const base64Url = data.accessToken.split('.')[1];
                const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
                const decoded = JSON.parse(window.atob(base64));
                if (decoded && (decoded.sub || decoded.id)) {
                    fallbackUser = {
                        id: decoded.sub || decoded.id,
                        email: decoded.email || '',
                        name: decoded.name || decoded.email || 'Tenant Admin',
                        role: decoded.role || 'ADMIN',
                        tenantId: decoded.tenantId,
                        tenant: decoded.tenantId ? { id: decoded.tenantId } : null,
                        isImpersonating: true,
                        impersonation: {
                            originalRole: 'SUPER_ADMIN',
                            startedAt: new Date().toISOString()
                        }
                    };
                    sessionStorage.setItem('user', JSON.stringify(fallbackUser));
                }
            } catch (err) {
                console.error('Failed to pre-decode impersonation token:', err);
            }

            // Set user in state immediately and navigate without stalling
            if (fallbackUser) {
                setUser(fallbackUser);
            }

            // Fire refresh in background to hydrate full state without blocking navigation
            refreshUser().catch((err) => {
                console.warn('Background refreshUser after impersonate:', err);
            });

            if (active) {
                window.location.replace('/dashboard');
            }
        }).catch((err) => {
            console.error('Impersonation ticket exchange failed:', err);
            if (active) navigate('/login', { replace: true });
        });

        return () => { active = false; };
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
