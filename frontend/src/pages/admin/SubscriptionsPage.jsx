import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useSubscriptionQuery } from '../../hooks/useBillingQueries';
import { CreditCard, RefreshCw } from 'lucide-react';
import TenantSubscriptionsView from '../../components/subscription/TenantSubscriptionsView';

const SubscriptionsPage = () => {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const { refetch: refetchSubscription } = useSubscriptionQuery();

    const handleRefreshAll = () => {
        queryClient.invalidateQueries({ queryKey: ['subscription'] });
        queryClient.invalidateQueries({ queryKey: ['wallet'] });
        refetchSubscription();
    };

    return (
        <div className="p-4 sm:p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-300">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-gray-900 dark:text-white flex items-center gap-2.5">
                        <CreditCard className="h-8 w-8 text-primary-600" />
                        Subscriptions Management
                    </h1>
                    <p className="text-gray-500 dark:text-slate-400 mt-1 font-medium text-sm md:text-base">
                        View and manage active tenant subscriptions and recurring services
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={handleRefreshAll}
                        className="inline-flex items-center gap-2 rounded-xl bg-white dark:bg-slate-900 px-4 py-2.5 text-sm font-bold text-gray-700 dark:text-slate-200 shadow-xs ring-1 ring-inset ring-gray-300 dark:ring-slate-700 hover:bg-gray-50 dark:hover:bg-slate-800 transition-all"
                    >
                        <RefreshCw size={16} />
                        Refresh Overview
                    </button>
                </div>
            </div>

            {/* Subscriptions View */}
            <TenantSubscriptionsView 
                onBrowseCatalog={() => navigate('/super-admin/packages')}
                onBrowsePlans={() => navigate('/super-admin/plans')}
            />
        </div>
    );
};

export default SubscriptionsPage;

