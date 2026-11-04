import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { walletService } from '../services/wallet.service';
import { usageService } from '../services/usage.service';
import { subscriptionService } from '../services/subscription.service';
import { useAuth } from '../context/AuthContext';

export const useWalletQuery = (targetTenantId) => {
    const { user } = useAuth();
    const effectiveTenantId = targetTenantId || user?.tenantId;
    return useQuery({
        queryKey: ['wallet', effectiveTenantId],
        queryFn: () => walletService.getWallet(effectiveTenantId),
        enabled: !!effectiveTenantId,
        refetchInterval: 30000,
    });
};

export const useWalletTransactionsQuery = (options = {}) => {
    const { user } = useAuth();
    return useQuery({
        queryKey: ['wallet-transactions', user?.tenantId],
        queryFn: () => walletService.getTransactions(user?.tenantId),
        enabled: !!user?.tenantId,
        staleTime: Infinity,
        refetchOnWindowFocus: false,
        ...options,
    });
};

export const useSubscriptionQuery = (targetTenantId, params) => {
    const { user } = useAuth();
    const effectiveTenantId = targetTenantId || user?.tenantId;
    return useQuery({
        queryKey: ['subscription', effectiveTenantId, params || {}],
        queryFn: () => subscriptionService.getSubscription(effectiveTenantId),
        enabled: !!effectiveTenantId,
    });
};

export const useCardsQuery = () => {
    const { user } = useAuth();
    return useQuery({
        queryKey: ['cards', user?.tenantId],
        queryFn: () => walletService.listCards(),
        enabled: !!user?.tenantId,
    });
};

export const useUsageSummaryQuery = () => {
    const { user } = useAuth();
    return useQuery({
        queryKey: ['usageSummary', user?.tenantId],
        queryFn: () => usageService.getUsageSummary().catch(() => ({ totalMinutes: 0, totalCost: 0 })),
        enabled: !!user?.tenantId,
    });
};

export const useServiceStateQuery = () => {
    const { user } = useAuth();
    return useQuery({
        queryKey: ['serviceState', user?.tenantId],
        queryFn: () => usageService.getServiceState().catch(() => 'SERVICE_ACTIVE'),
        enabled: !!user?.tenantId,
    });
};

export const useWalletActions = () => {
    const queryClient = useQueryClient();
    const { user } = useAuth();

    const refreshWallet = useCallback(() => {
        const tenantId = user?.tenantId;
        queryClient.invalidateQueries({ queryKey: ['wallet', tenantId] });
        queryClient.invalidateQueries({ queryKey: ['wallet-transactions', tenantId] });
        queryClient.invalidateQueries({ queryKey: ['subscription', tenantId] });
        queryClient.invalidateQueries({ queryKey: ['cards', tenantId] });
        queryClient.invalidateQueries({ queryKey: ['usageSummary', tenantId] });
        queryClient.invalidateQueries({ queryKey: ['serviceState', tenantId] });
    }, [queryClient, user?.tenantId]);

    return { refreshWallet };
};
