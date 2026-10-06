import React, { useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useBranding } from '../context/BrandingContext';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, LogOut } from 'lucide-react';
import './BlockedScreen.css';

const BlockedScreen = () => {
    const { enforcement, logout } = useAuth();
    const { branding } = useBranding();
    const navigate = useNavigate();

    useEffect(() => {
        // If somehow user is not blocked, redirect to dashboard
        if (!enforcement?.isBlocked) {
            navigate('/dashboard');
        }
    }, [enforcement, navigate]);

    const getBlockMessage = (reason) => {
        const messages = {
            USER_SUSPENDED: {
                title: 'Account Suspended',
                description: 'Your account has been suspended. Please contact your administrator for more information.',
                icon: '🚫'
            },
            ADMIN_SUSPENDED: {
                title: 'Administrator Account Suspended',
                description: 'Your administrator\'s account has been suspended. You cannot access the system until their account is restored.',
                icon: '⚠️'
            },
            TENANT_SUSPENDED: {
                title: 'Organization Suspended',
                description: 'Your organization\'s service has been suspended. Please contact support for assistance.',
                icon: '🏢'

            },
            USER_NOT_ACTIVATED: {
                title: 'Account Not Activated',
                description: 'Please check your email and accept your invitation to activate your account.',
                icon: '✉️'
            }
        };

        return messages[reason] || {
            title: 'Access Blocked',
            description: 'Your access to the system has been blocked. Please contact support.',
            icon: '🔒'
        };
    };

    const blockInfo = getBlockMessage(enforcement?.blockReason);

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    return (
        <div className="blocked-screen">
            <div className="blocked-container">
                <div className="blocked-icon">
                    <AlertTriangle size={64} />
                </div>
                <div className="blocked-emoji">{blockInfo.icon}</div>
                <h1 className="blocked-title">{blockInfo.title}</h1>
                <p className="blocked-description">{blockInfo.description}</p>

                {enforcement?.blockReason === 'ADMIN_SUSPENDED' && (
                    <div className="blocked-info">
                        <p>
                            As a Support user, your access is tied to your administrator's account status.
                            Once your administrator's account is restored, you will regain access.
                        </p>
                    </div>
                )}

                <button className="blocked-logout-btn" onClick={handleLogout}>
                    <LogOut size={20} />
                    Return to Login
                </button>

                <div className="blocked-footer">
                    <p>Need help? Contact support at {branding.supportEmail || 'support@telecom-platform.com'}</p>
                </div>
            </div>
        </div>
    );
};

export default BlockedScreen;
