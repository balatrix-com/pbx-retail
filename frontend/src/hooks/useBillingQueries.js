import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { walletService } from '../services/wallet.service';
import { usageService } from '../services/usage.service';
import { useAuth } from '../context/AuthContext';

export const useWalletQuery = () => {
    const { user } = useAuth();
    return useQuery({
        queryKey: ['wallet', user?.tenantId],
        queryFn: () => walletService.getWallet(user?.tenantId),
        enabled: !!user?.tenantId,
        refetchInterval: 30000, // Background refresh every 30s
    });
};

export const useSubscriptionQuery = () => {
    const { user } = useAuth();
    return useQuery({
        queryKey: ['subscription', user?.tenantId],
        queryFn: () => walletService.getSubscription(),
        enabled: !!user?.tenantId,
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
        queryClient.invalidateQueries({ queryKey: ['subscription', tenantId] });
        queryClient.invalidateQueries({ queryKey: ['cards', tenantId] });
        queryClient.invalidateQueries({ queryKey: ['usageSummary', tenantId] });
        queryClient.invalidateQueries({ queryKey: ['serviceState', tenantId] });
    }, [queryClient, user?.tenantId]);

    return { refreshWallet };
};
