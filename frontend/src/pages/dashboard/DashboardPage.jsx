import React from 'react';
import { useAuth } from '../../context/AuthContext';
import AdminDashboard from './AdminDashboard';
import SuperAdminDashboard from './SuperAdminDashboard';
import SupportDashboard from './SupportDashboard';

const DashboardPage = () => {
    const { user } = useAuth();

    if (user?.role === 'SUPER_ADMIN') return <SuperAdminDashboard />;
    
    // Global Support users see the platform dashboard, 
    // but Tenant Support users see the tenant-specific dashboard.
    if (user?.role === 'SUPPORT' && !user?.tenantId) return <SupportDashboard />;

    return <AdminDashboard />;
};

export default DashboardPage;
