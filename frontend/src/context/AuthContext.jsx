import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { authService } from '../services/auth.service';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    // Check if user is blocked and force logout
    const checkEnforcement = (userData) => {
        if (userData?.enforcement?.isBlocked) {
            const reason = userData.enforcement.blockReason;
            console.warn(`User blocked: ${reason}`);

            // Force logout for blocked users
            authService.logout();
            setUser(null);

            // Store block reason for display on login page
            localStorage.setItem('blockReason', reason);

            return true; // User is blocked
        }
        return false; // User is not blocked
    };

    useEffect(() => {
        // Check for existing session
        const initAuth = async () => {
            try {
                if (authService.isAuthenticated()) {
                    try {
                        const userData = await authService.me();

                        // Check enforcement before setting user
                        if (!checkEnforcement(userData)) {
                            setUser(userData);
                            localStorage.setItem('user', JSON.stringify(userData));
                        }
                    } catch (e) {
                        // If 401, api interceptor handles logic (refresh or logout)
                        setUser(null);
                    }
                }
            } catch (error) {
                console.error("Auth init error", error);
                authService.logout();
            } finally {
                setLoading(false);
            }
        };
        initAuth();
    }, []);

    const login = async (email, password) => {
        try {
            const { user: userData } = await authService.login(email, password);

            // Fetch full user data with enforcement
            const fullUserData = await authService.me();

            // Check enforcement
            if (checkEnforcement(fullUserData)) {
                throw new Error(fullUserData.enforcement.blockReason || 'Account is blocked');
            }

            setUser(fullUserData);
            return fullUserData;
        } catch (error) {
            throw error;
        }
    };

    const signup = async (email, password, companyName) => {
        try {
            const result = await authService.signup(email, password, companyName);

            // Fetch full user data with enforcement
            const fullUserData = await authService.me();

            setUser(fullUserData);
            return result;
        } catch (error) {
            throw error;
        }
    };

    const verifyOtp = async (email, otp) => {
        try {
            const { user: userData } = await authService.verifyOtp(email, otp);

            // Fetch full user data with enforcement
            const fullUserData = await authService.me();

            setUser(fullUserData);
            return fullUserData;
        } catch (error) {
            throw error;
        }
    };

    const logout = () => {
        authService.logout();
        setUser(null);
        localStorage.removeItem('blockReason');
        localStorage.removeItem('originalToken'); // Clean up impersonation
    };

    const impersonateUser = async (userId) => {
        try {
            const currentToken = localStorage.getItem('accessToken');
            const data = await authService.impersonate(userId);

            // Store original session
            localStorage.setItem('originalToken', currentToken);

            // Set new session
            localStorage.setItem('accessToken', data.accessToken);
            if (data.refreshToken) {
                localStorage.setItem('refreshToken', data.refreshToken);
            }
            localStorage.setItem('user', JSON.stringify(data.user));

            setUser({ ...data.user, isImpersonating: true });

            // Force reload or just settle state? 
            // We set user directly, which is enough usually.
            // But we might want to refresh full enforcement check?
            // User data from impersonate endpoint should be complete.
            return data.user;
        } catch (error) {
            console.error('Impersonation failed:', error);
            throw error;
        }
    };

    const exitImpersonation = async () => {
        // If in tab-isolated mode (sessionStorage), we just close the tab or redirect to dashboard (which redirects to login if no local token)
        if (sessionStorage.getItem('accessToken')) {
            try {
                sessionStorage.clear();
                window.close(); // Try to close tab
                // If script can't close tab (if not opened by script), redirect to safe page or show message
                window.location.href = '/dashboard';
                return;
            } catch (ignore) { }
        }

        try {
            // 1. Call backend to log audit and get fresh tokens for original user
            const data = await authService.endImpersonation();

            // 2. Set new session
            localStorage.setItem('accessToken', data.accessToken);
            if (data.refreshToken) {
                localStorage.setItem('refreshToken', data.refreshToken);
            }
            localStorage.setItem('user', JSON.stringify(data.user));

            // 3. Clean up
            localStorage.removeItem('originalToken');

            // 4. Update state directly
            setUser(data.user);

        } catch (error) {
            console.error('Exit impersonation API failed, attempting local restore:', error);

            // Fallback: Restore locally stored token
            const originalToken = localStorage.getItem('originalToken');
            if (!originalToken) {
                console.error('No original session to restore');
                logout();
                return;
            }

            localStorage.setItem('accessToken', originalToken);
            localStorage.removeItem('originalToken');

            // Verify if the restored token is valid
            const userData = await refreshUser();
            if (!userData) {
                logout();
            }
        }
    };

    const refreshUser = async () => {
        try {
            const userData = await authService.me();

            // Check enforcement
            if (checkEnforcement(userData)) {
                return null;
            }

            setUser(userData);
            return userData;
        } catch (error) {
            console.error('Failed to refresh user', error);
            return null;
        }
    };

    const value = useMemo(() => ({
        user,
        loading,
        login,
        signup,
        verifyOtp,
        logout,
        refreshUser,
        isAuthenticated: !!user,
        // Expose user properties for easy access
        role: user?.role,
        status: user?.status,
        tenant: user?.tenant,
        enforcement: user?.enforcement,
        impersonation: user?.impersonation,
        // Helper flags
        isBlocked: user?.enforcement?.isBlocked || false,
        isSuperAdmin: user?.role === 'SUPER_ADMIN',
        isAdmin: user?.role === 'ADMIN',
        isSupport: user?.role === 'SUPPORT',

        isImpersonating: !!(user?.impersonation || sessionStorage.getItem('accessToken') || localStorage.getItem('originalToken')),
        impersonateUser,
        exitImpersonation
    }), [user, loading]);

    return (
        <AuthContext.Provider value={value}>
            {!loading && children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
