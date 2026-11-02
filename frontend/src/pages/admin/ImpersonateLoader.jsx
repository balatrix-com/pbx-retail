import React, { useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';

const ImpersonateLoader = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const { refreshUser } = useAuth(); // We might need to refresh context user from storage
    const exchangeRef = useRef(null);

    useEffect(() => {
        const ticket = searchParams.get('ticket');
        window.history.replaceState({}, '', '/impersonate');
        if (!ticket) {
            navigate('/login', { replace: true });
            return;
        }
        let active = true;
        if (!exchangeRef.current) exchangeRef.current = api.post('/auth/exchange-impersonate-ticket', { ticket });
        exchangeRef.current.then(async ({ data }) => {
            if (!active) return;
            sessionStorage.setItem('accessToken', data.accessToken);
            sessionStorage.setItem('refreshToken', data.refreshToken);
            await refreshUser();
            if (active) navigate('/dashboard', { replace: true });
        }).catch(() => {
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
