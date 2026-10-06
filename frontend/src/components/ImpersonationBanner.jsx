import React from 'react';
import { useAuth } from '../context/AuthContext';
import { User as UserIcon, LogOut } from 'lucide-react';
import './ImpersonationBanner.css';

const ImpersonationBanner = () => {
    const { user } = useAuth();
    const isImpersonating = localStorage.getItem('impersonating') === 'true';

    const handleExitImpersonation = () => {
        // Restore original token
        const originalToken = localStorage.getItem('originalToken');

        if (originalToken) {
            // Restore tokens
            localStorage.setItem('accessToken', originalToken);

            // Clear impersonation flags
            localStorage.removeItem('originalToken');
            localStorage.removeItem('impersonating');

            // Reload page to restore original session
            window.location.href = '/platform';
        } else {
            alert('Could not restore original session. Please log out and log back in.');
        }
    };

    if (!isImpersonating) {
        return null;
    }

    return (
        <div className="impersonation-banner">
            <div className="banner-content">
                <div className="banner-icon">
                    <UserIcon size={20} />
                </div>
                <div className="banner-text">
                    <strong>🎭 Impersonation Active:</strong>
                    {' '}Viewing as{' '}
                    <span className="impersonated-name">
                        {user?.name || user?.email || 'User'}
                    </span>
                </div>
                <button className="exit-btn" onClick={handleExitImpersonation}>
                    <LogOut size={16} />
                    Exit Impersonation
                </button>
            </div>
        </div>
    );
};

export default ImpersonationBanner;
