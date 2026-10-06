import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Loader2 } from 'lucide-react';

const ProtectedRoute = ({ children, allowedRoles }) => {
    const { user, loading, isAuthenticated } = useAuth();
    const location = useLocation();

    if (loading) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-gray-50">
                <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
            </div>
        );
    }

    if (!isAuthenticated) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    if (user?.forcePasswordChange) {
        return <Navigate to="/auth/change-password" replace />;
    }

    if (allowedRoles && !allowedRoles.includes(user.role)) {
        // If user is logged in but doesn't have permission, redirect to their home or 403
        // For now, redirect to dashboard which should handle their role, or show 403
        // Let's forward to dashboard which is safe for all authenticated users
        return <Navigate to="/dashboard" replace />;
    }

    return children;
};

export default ProtectedRoute;
