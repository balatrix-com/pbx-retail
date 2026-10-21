import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { walletService } from '../services/wallet.service';
import { usageService } from '../services/usage.service';
import { useAuth } from '../context/AuthContext';

export const useWalletQuery = (options = {}) => {
    const { user } = useAuth();
    return useQuery({
        queryKey: ['wallet', user?.tenantId],
        queryFn: () => walletService.getBalance(user?.tenantId),
        enabled: !!user?.tenantId,
        staleTime: Infinity, // Only fetch on mount, never auto-refetch on timer or navigation
        refetchOnWindowFocus: false,
        ...options,
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

export const useSubscriptionQuery = (options = {}) => {
    const { user } = useAuth();
    return useQuery({
        queryKey: ['subscription', user?.tenantId],
        queryFn: () => walletService.getSubscription(),
        enabled: !!user?.tenantId,
        staleTime: Infinity,
        refetchOnWindowFocus: false,
        ...options,
    });
};

export const useCardsQuery = (options = {}) => {
    const { user } = useAuth();
    return useQuery({
        queryKey: ['cards', user?.tenantId],
        queryFn: () => walletService.listCards(),
        enabled: !!user?.tenantId,
        staleTime: Infinity,
        refetchOnWindowFocus: false,
        ...options,
    });
};

export const useUsageSummaryQuery = (options = {}) => {
    const { user } = useAuth();
    return useQuery({
        queryKey: ['usageSummary', user?.tenantId],
        queryFn: () => usageService.getUsageSummary().catch(() => ({ totalMinutes: 0, totalCost: 0 })),
        enabled: !!user?.tenantId,
        staleTime: Infinity,
        refetchOnWindowFocus: false,
        ...options,
    });
};

export const useServiceStateQuery = (options = {}) => {
    const { user } = useAuth();
    return useQuery({
        queryKey: ['serviceState', user?.tenantId],
        queryFn: () => usageService.getServiceState().catch(() => 'SERVICE_ACTIVE'),
        enabled: !!user?.tenantId,
        staleTime: Infinity,
        refetchOnWindowFocus: false,
        ...options,
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
    }, [queryClient, user?.tenantId]);

    return { refreshWallet };
};
