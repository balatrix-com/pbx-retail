import React from 'react';
import { AlertCircle, Lock } from 'lucide-react';
import './ReadOnlyBanner.css';

const ReadOnlyBanner = ({ message }) => {
    return (
        <div className="read-only-banner">
            <div className="banner-content">
                <Lock className="banner-icon" size={20} />
                <span className="banner-text">
                    {message || 'You have read-only access to this section'}
                </span>
            </div>
        </div>
    );
};

export default ReadOnlyBanner;
